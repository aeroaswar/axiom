-- AXIOM platform — schema
-- One catalogue (product_variants), three surfaces. Every table gets RLS with an explicit
-- policy in 0002_rls.sql. Money is bigint rupiah everywhere. Stock is a ledger.

create extension if not exists pgcrypto;

create schema if not exists axiom;

-- ---------------------------------------------------------------- enums
create type public.user_role      as enum ('client','clinic','ops','owner');
create type public.account_type   as enum ('individual','clinic','institution');
create type public.product_kind   as enum ('peptide','device','apparel');
create type public.ack_kind       as enum ('age_18','qualified_researcher');
create type public.move_reason    as enum ('intake','sale','adjust','return','loss','expiry');
create type public.quote_state    as enum ('requested','draft','sent','accepted','lost');
create type public.order_state    as enum ('awaiting_payment','packing','dispatched','delivered','cancelled');
create type public.invoice_kind   as enum ('invoice','credit_note');
create type public.invoice_event  as enum ('issued','sent','transfer_reported','paid','voided');
create type public.delivery_zone  as enum ('jabodetabek','jawa','luar_jawa','other');
create type public.lead_stage     as enum ('new','contacted','acknowledged','quoted','won','lost');

-- ---------------------------------------------------------------- identity
create table public.accounts (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  type                public.account_type not null default 'individual',
  account_manager_id  uuid,
  whatsapp            text,
  email               text,
  agreed_cadence_days int,
  notes               text,
  created_at          timestamptz not null default now()
);

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  account_id  uuid references public.accounts(id) on delete set null,
  role        public.user_role not null default 'client',
  full_name   text not null default '',
  locale      text not null default 'id',
  whatsapp    text,
  created_at  timestamptz not null default now()
);
alter table public.accounts
  add constraint accounts_manager_fk foreign key (account_manager_id) references public.profiles(id) on delete set null;

create table public.account_members (
  account_id  uuid not null references public.accounts(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  is_primary  boolean not null default false,
  primary key (account_id, profile_id)
);

create table public.account_sites (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references public.accounts(id) on delete cascade,
  name        text not null,
  address     text,
  zone        public.delivery_zone not null default 'jabodetabek',
  is_default  boolean not null default false,
  sort        int not null default 0
);
create index on public.account_sites(account_id);

create table public.acknowledgements (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  account_id      uuid references public.accounts(id) on delete cascade,
  kind            public.ack_kind not null,
  version         text not null,
  acknowledged_at timestamptz not null default now(),
  ip              inet,
  user_agent      text
);
create index on public.acknowledgements(account_id, kind, acknowledged_at desc);

-- ---------------------------------------------------------------- catalogue
create table public.pathways (
  id          smallint primary key,
  no          text not null unique,               -- '01'..'11'
  slug        text not null unique,
  kind        public.product_kind not null,
  name_en     text not null,
  name_id     text not null,
  summary_en  text not null default '',
  summary_id  text not null default '',
  sort        int not null default 0
);

create table public.products (
  id                uuid primary key default gen_random_uuid(),
  pathway_id        smallint not null references public.pathways(id),
  kind              public.product_kind not null,
  slug              text not null unique,
  name              text not null,
  synonyms          text[] not null default '{}',
  compound_class_en text,
  compound_class_id text,
  molecular_class_en text,
  molecular_class_id text,
  cas_no            text,                          -- only a real CAS number; never invented
  identity_en       text,
  identity_id       text,
  research_en       text,                          -- renders only with >= 1 product_references row
  research_id       text,
  handling_en       text,                          -- null = shared baseline from site_settings
  handling_id       text,
  is_published      boolean not null default false,
  published_at      timestamptz,
  sort              int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index on public.products(pathway_id);

create table public.product_variants (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid not null references public.products(id) on delete cascade,
  sku                 text not null unique,
  dose                text not null,               -- '10 mg', '36 IU', 'Face - LED array'
  content             text not null,               -- 'Vial + pen', 'Device', 'Apparel', 'Accessory'
  price_idr           bigint not null check (price_idr >= 0),
  is_cold_chain       boolean not null default false,
  low_stock_threshold int not null default 3,
  is_active           boolean not null default true,
  sort                int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index on public.product_variants(product_id);

-- Cost lives apart from the variant so that it can be refused to everyone but owner at the database.
create table public.variant_costs (
  variant_id        uuid primary key references public.product_variants(id) on delete cascade,
  supplier_cost_idr bigint not null check (supplier_cost_idr >= 0),
  pen_cost_idr      bigint not null default 0 check (pen_cost_idr >= 0),
  cost_assumed      boolean not null default false,
  updated_at        timestamptz not null default now()
);

create table public.product_references (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  claim_key   text not null,
  citation    text not null,
  pubmed_id   text,
  doi         text,
  url         text,
  created_at  timestamptz not null default now(),
  check (pubmed_id is not null or doi is not null)
);
create index on public.product_references(product_id);

create table public.price_changes (
  id          uuid primary key default gen_random_uuid(),
  variant_id  uuid not null references public.product_variants(id) on delete cascade,
  from_idr    bigint not null,
  to_idr      bigint not null,
  changed_by  uuid references public.profiles(id),
  changed_at  timestamptz not null default now()
);
create index on public.price_changes(changed_at desc);

create table public.site_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

create table public.delivery_zones (
  zone            public.delivery_zone primary key,
  label_en        text not null,
  label_id        text not null,
  per_three_idr   bigint,                          -- null = rate pending
  cap_idr         bigint,
  eta_days        int not null default 2
);

-- ---------------------------------------------------------------- stock ledger
create table public.stock_movements (
  id          bigint generated always as identity primary key,
  variant_id  uuid not null references public.product_variants(id) on delete cascade,
  delta       int not null check (delta <> 0),
  reason      public.move_reason not null,
  ref         text,
  actor_id    uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);
create index on public.stock_movements(variant_id, created_at);

-- Derived balance, kept by trigger from the ledger. The check constraint is what refuses a
-- movement that would take on hand below zero: the movement's insert fails and rolls back.
create table public.variant_stock (
  variant_id  uuid primary key references public.product_variants(id) on delete cascade,
  on_hand     int not null default 0 check (on_hand >= 0)
);

-- Phase 2, schema-reserved
create table public.lots (
  id          uuid primary key default gen_random_uuid(),
  variant_id  uuid not null references public.product_variants(id) on delete cascade,
  lot_code    text not null unique,
  received_at date,
  expires_at  date
);
create table public.coa_documents (
  id          uuid primary key default gen_random_uuid(),
  variant_id  uuid references public.product_variants(id) on delete cascade,
  lot_id      uuid references public.lots(id) on delete set null,
  lot_code    text,
  file_path   text not null,
  issued_at   date,
  method      text not null default 'HPLC / MS',
  purity_pct  numeric(5,2),
  is_sample   boolean not null default false
);

-- ---------------------------------------------------------------- commerce
create table public.doc_sequences (
  kind        text not null,                       -- 'quote' | 'order' | 'invoice'
  period      text not null,                       -- '' for quotes, 'YYMM' for orders/invoices
  last_number int not null default 0,
  primary key (kind, period)
);

create table public.quotes (
  id          uuid primary key default gen_random_uuid(),
  number      text not null unique,
  account_id  uuid not null references public.accounts(id),
  state       public.quote_state not null default 'requested',
  notes       text,
  sent_at     timestamptz,
  accepted_at timestamptz,
  order_id    uuid,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on public.quotes(account_id, state);

create table public.quote_items (
  id              uuid primary key default gen_random_uuid(),
  quote_id        uuid not null references public.quotes(id) on delete cascade,
  variant_id      uuid not null references public.product_variants(id),
  site_id         uuid references public.account_sites(id),
  qty             int not null check (qty > 0),
  unit_price_idr  bigint,                          -- frozen when the quote is sent
  line_total_idr  bigint generated always as (coalesce(unit_price_idr,0) * qty) stored
);
create index on public.quote_items(quote_id);

create table public.quote_item_costs (               -- owner-only snapshot, frozen at send
  quote_item_id           uuid primary key references public.quote_items(id) on delete cascade,
  unit_supplier_cost_idr  bigint not null,
  unit_pen_cost_idr       bigint not null
);

create table public.quote_events (
  id          bigint generated always as identity primary key,
  quote_id    uuid not null references public.quotes(id) on delete cascade,
  at          timestamptz not null default now(),
  actor_id    uuid references public.profiles(id),
  actor_label text not null,
  from_state  text,
  to_state    text not null
);
create index on public.quote_events(quote_id, at);

create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  number          text not null unique,
  account_id      uuid not null references public.accounts(id),
  quote_id        uuid references public.quotes(id),
  state           public.order_state not null default 'awaiting_payment',
  subtotal_idr    bigint not null default 0,
  delivery_idr    bigint not null default 0,
  total_idr       bigint not null default 0,
  sites_snapshot  jsonb not null default '[]',      -- frozen addresses at acceptance
  placed_at       timestamptz not null default now(),
  paid_claim_at   timestamptz,
  paid_claim_ref  text,
  paid_claim_by   uuid references public.profiles(id),
  accepted_by     uuid references public.profiles(id),
  delivered_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.orders(account_id, state);
alter table public.quotes add constraint quotes_order_fk foreign key (order_id) references public.orders(id);

create table public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  variant_id      uuid not null references public.product_variants(id),
  site_id         uuid references public.account_sites(id),
  site_name       text,
  qty             int not null check (qty > 0),
  unit_price_idr  bigint not null,                 -- frozen at acceptance
  line_total_idr  bigint generated always as (unit_price_idr * qty) stored,
  lot_id          uuid references public.lots(id)
);
create index on public.order_items(order_id);

create table public.order_item_costs (
  order_item_id           uuid primary key references public.order_items(id) on delete cascade,
  unit_supplier_cost_idr  bigint not null,
  unit_pen_cost_idr       bigint not null
);

create table public.order_events (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders(id) on delete cascade,
  at          timestamptz not null default now(),
  actor_id    uuid references public.profiles(id),
  actor_label text not null,
  from_state  text,
  to_state    text not null
);
create index on public.order_events(order_id, at);

create table public.shipments (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  carrier       text,
  tracking_no   text,
  dispatched_at timestamptz,
  eta_at        date,
  delivered_at  timestamptz
);

create table public.invoices (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders(id),
  kind              public.invoice_kind not null default 'invoice',
  parent_invoice_id uuid references public.invoices(id),
  number            text not null unique,
  issued_at         timestamptz,
  due_at            timestamptz,
  terms_days        int not null default 7,
  ppn_rate          numeric(5,2) not null default 0,
  subtotal_idr      bigint not null default 0,
  delivery_idr      bigint not null default 0,
  ppn_idr           bigint not null default 0,
  total_idr         bigint not null default 0,
  notes             text,
  bank_details      jsonb,
  pdf_path          text,
  sent_at           timestamptz,
  sent_via          text,
  paid_at           timestamptz,
  paid_ref          text,
  paid_by           uuid references public.profiles(id),
  voided_at         timestamptz,
  created_at        timestamptz not null default now()
);
create index on public.invoices(order_id);

create table public.invoice_items (
  id              uuid primary key default gen_random_uuid(),
  invoice_id      uuid not null references public.invoices(id) on delete cascade,
  description     text not null,
  spec            text,
  qty             int not null,
  unit_price_idr  bigint not null,
  line_total_idr  bigint generated always as (unit_price_idr * qty) stored,
  is_peptide      boolean not null default false,
  sort            int not null default 0
);

create table public.invoice_events (
  id          bigint generated always as identity primary key,
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  at          timestamptz not null default now(),
  actor_id    uuid references public.profiles(id),
  actor_label text not null,
  kind        public.invoice_event not null,
  ref         text
);

-- ---------------------------------------------------------------- baskets, leads, crm
create table public.carts (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid references public.accounts(id) on delete cascade,
  anon_key    text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (account_id is not null or anon_key is not null)
);
create unique index carts_account_uq on public.carts(account_id) where account_id is not null;

create table public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  cart_id     uuid not null references public.carts(id) on delete cascade,
  variant_id  uuid not null references public.product_variants(id) on delete cascade,
  qty         int not null check (qty > 0),
  site_id     uuid references public.account_sites(id) on delete set null,
  unique (cart_id, variant_id, site_id)
);

create table public.leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  clinic      text,
  role_title  text,
  email       text,
  whatsapp    text,
  persona     text,
  source      text not null default 'site',
  stage       public.lead_stage not null default 'new',
  owner_id    uuid references public.profiles(id),
  account_id  uuid references public.accounts(id),
  quote_id    uuid references public.quotes(id),
  created_at  timestamptz not null default now()
);

create table public.activities (
  id            bigint generated always as identity primary key,
  subject_type  text not null,
  subject_id    uuid not null,
  kind          text not null,
  body          text,
  actor_id      uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);
create index on public.activities(subject_type, subject_id);

-- ---------------------------------------------------------------- updated_at
create or replace function axiom.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger t_products_touch before update on public.products for each row execute function axiom.touch_updated_at();
create trigger t_variants_touch before update on public.product_variants for each row execute function axiom.touch_updated_at();
create trigger t_quotes_touch   before update on public.quotes for each row execute function axiom.touch_updated_at();
create trigger t_orders_touch   before update on public.orders for each row execute function axiom.touch_updated_at();
create trigger t_carts_touch    before update on public.carts for each row execute function axiom.touch_updated_at();
