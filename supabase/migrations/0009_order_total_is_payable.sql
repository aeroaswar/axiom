-- An order's total is what the client pays: goods + delivery + PPN.
--
-- accept_quote wrote orders.total_idr = sub + del before it computed PPN, while the invoice it issues
-- in the same transaction carried sub + del + ppn_amt. So one order had two "totals" 11 % apart, and
-- every surface that read the order — the Console order sheet's Total, the pipeline's receivables,
-- the events() bell — showed ops a figure below the invoice the client must pay.
--
-- PPN is now computed before the order is written and folded into its total, from the same ppn_amt
-- the invoice uses, so orders.total_idr = invoices.total_idr by construction. Every reader then shows
-- the payable figure with no change at the call site. Revenue and margin are unaffected: they sum
-- order_items, not the order total. Client lifetime value, the one reader that means revenue, is
-- pinned to subtotal + delivery in the application.
--
-- Quotes are untouched on purpose: a quote is pre-invoice and its document states that PPN is
-- applied at invoicing.
--
-- The function below is 0004's accept_quote verbatim except for those two moves. It is the latest
-- definition: 0008_workflow_logic restates axiom.events() but not accept_quote.

create or replace function axiom.accept_quote(qid uuid) returns uuid
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare q public.quotes; oid uuid; iid uuid; r record; d record;
        sub bigint := 0; del bigint := 0; ppn numeric; ppn_amt bigint; sites jsonb; terms int; bank jsonb;
begin
  select * into q from public.quotes where id = qid for update;
  if not (axiom.is_staff() or axiom.member_of(q.account_id)) then raise insufficient_privilege; end if;
  if axiom.quote_state(q) <> 'sent' then raise exception 'only a sent, unexpired quote can be accepted (quote is %)', axiom.quote_state(q) using errcode = 'check_violation'; end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'address', address, 'zone', zone)), '[]')
    into sites from public.account_sites where account_id = q.account_id;

  insert into public.orders (account_id, quote_id, state, sites_snapshot, accepted_by)
  values (q.account_id, qid, 'awaiting_payment', sites, auth.uid()) returning id into oid;

  for r in select qi.*, s.name as site_name, c.unit_supplier_cost_idr, c.unit_pen_cost_idr
           from public.quote_items qi left join public.account_sites s on s.id = qi.site_id
           left join public.quote_item_costs c on c.quote_item_id = qi.id where qi.quote_id = qid loop
    insert into public.order_items (order_id, variant_id, site_id, site_name, qty, unit_price_idr)
    values (oid, r.variant_id, r.site_id, r.site_name, r.qty, r.unit_price_idr) returning id into iid;
    insert into public.order_item_costs (order_item_id, unit_supplier_cost_idr, unit_pen_cost_idr)
    values (iid, coalesce(r.unit_supplier_cost_idr, 0), coalesce(r.unit_pen_cost_idr, 0));
    sub := sub + r.unit_price_idr * r.qty;
  end loop;

  for d in select * from axiom.delivery_for_lines((select jsonb_agg(jsonb_build_object('site_id', site_id, 'qty', qty)) from public.order_items where order_id = oid), q.account_id) loop
    del := del + coalesce(d.charge_idr, 0);
  end loop;

  -- PPN is known here, so the order carries what the client pays — the same ppn_amt the invoice
  -- below uses, which makes orders.total_idr equal invoices.total_idr by construction.
  ppn := coalesce((axiom.setting('ppn_rate') #>> '{}')::numeric, 0);
  terms := coalesce((axiom.setting('payment_terms_days') #>> '{}')::int, 7);
  bank := axiom.setting('bank');
  ppn_amt := round((sub + case when coalesce((axiom.setting('delivery_in_dpp') #>> '{}')::boolean, true) then del else 0 end) * ppn / 100);
  update public.orders set subtotal_idr = sub, delivery_idr = del, total_idr = sub + del + ppn_amt where id = oid;
  perform axiom.enter_fn('quote', qid);
  update public.quotes set state = 'accepted', accepted_at = now(), order_id = oid where id = qid;
  perform axiom.leave_fn();
  perform axiom.log_quote(qid, 'sent', 'accepted');
  perform axiom.log_order(oid, 'accepted', 'awaiting_payment');

  insert into public.invoices (order_id, kind, issued_at, due_at, terms_days, ppn_rate, subtotal_idr, delivery_idr, ppn_idr, total_idr, bank_details)
  values (oid, 'invoice', now(), now() + make_interval(days => terms), terms, ppn, sub, del, ppn_amt, sub + del + ppn_amt, bank)
  returning id into iid;
  perform axiom.enter_fn('invoice', iid);
  insert into public.invoice_items (invoice_id, description, spec, qty, unit_price_idr, is_peptide, sort)
  select iid, p.name, v.dose || case when oi.site_name is not null then ' · ' || oi.site_name else '' end, oi.qty, oi.unit_price_idr, p.kind = 'peptide', row_number() over (order by oi.id)
  from public.order_items oi join public.product_variants v on v.id = oi.variant_id join public.products p on p.id = v.product_id
  where oi.order_id = oid;
  perform axiom.leave_fn();
  perform axiom.log_invoice(iid, 'issued');
  return oid;
end $$;

-- Existing orders: bring each total to its live invoice. On a fresh database this runs before any
-- order exists and changes nothing; it is here for any database that already holds orders.
update public.orders o
   set total_idr = o.subtotal_idr + o.delivery_idr + i.ppn_idr
  from (select distinct on (order_id) order_id, ppn_idr
          from public.invoices
         where kind = 'invoice' and voided_at is null
         order by order_id, issued_at desc) i
 where i.order_id = o.id
   and o.total_idr <> o.subtotal_idr + o.delivery_idr + i.ppn_idr;
