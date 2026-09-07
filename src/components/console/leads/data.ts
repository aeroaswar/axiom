import { withRls } from '@/lib/db';

/**
 * The pipeline, read from what has already happened. A lead's stage follows its quote — sent makes
 * it quoted, accepted makes it won, lost makes it lost — so this list is the commerce record seen
 * from the sales side, not a second record kept by hand. Only 'contacted' is set by a person.
 */
export type LeadRow = {
  id: string; name: string; clinic: string | null; role_title: string | null;
  email: string | null; whatsapp: string | null; source: string; stage: string;
  account_id: string | null; account: string | null; ack: string;
  quote_number: string | null; quote_state: string | null; owner: string | null;
  created_at: Date;
};

export const STAGES = ['new', 'contacted', 'acknowledged', 'quoted', 'won', 'lost'] as const;
export type Stage = typeof STAGES[number];

export async function leadRows(uid: string) {
  return withRls({ uid }, tx => tx<LeadRow[]>`
    select l.id::text as id, l.name, l.clinic, l.role_title, l.email, l.whatsapp,
           l.source, l.stage::text as stage, l.account_id::text as account_id,
           a.name as account,
           case when l.account_id is null then 'none' else axiom.ack_state_for(l.account_id) end as ack,
           q.number as quote_number,
           case when q.id is null then null else axiom.quote_state(q.*) end as quote_state,
           p.full_name as owner, l.created_at
    from public.leads l
    left join public.accounts a on a.id = l.account_id
    left join public.quotes q on q.id = l.quote_id
    left join public.profiles p on p.id = l.owner_id
    order by case l.stage when 'new' then 0 when 'contacted' then 1 when 'acknowledged' then 2
                          when 'quoted' then 3 when 'won' then 4 else 5 end, l.created_at desc`);
}

/** One count per stage, summed from the rows below so the strip and the list cannot disagree. */
export function pipeline(rows: LeadRow[]) {
  return STAGES.map(s => ({ stage: s, n: rows.filter(r => r.stage === s).length }));
}
