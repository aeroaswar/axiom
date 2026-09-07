import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCatalogue, groupCompounds, pick, type CatalogueRow } from '@/lib/site/catalogue';
import { fmtLong } from '@/lib/domain/dates';
import { FilterChips } from '@/components/console/shared/filter-chips';
import { rv } from '@/components/console/shared/reveal';
import { CompoundCard } from './compound-card';
import type { Ack } from './data';

/**
 * One price for everyone. Pathways are chapters, a compound is one card, and its lots are dose
 * rows: the catalogue reads as a book rather than as a list of eighty-seven SKUs.
 *
 * The gate is not a button here. `public.v_catalogue` returns a null price for a peptide lot when
 * the account's acknowledgement is not current, so the card has nothing to show and says so; the
 * banner explains what opens it. Devices and apparel are priced for every account.
 */

/** The banner is the whole explanation of a missing price; a card never argues with the reader. */
export async function AckBanner({ ack }: { ack: Ack }) {
  const t = await getTranslations('account.shop');
  const locale = await getLocale();
  if (ack.state === 'current') return null;
  if (ack.state === 'expiring') {
    return (
      <div className="gatebar" data-ack="expiring">
        <span>{t('expiring', { date: fmtLong(ack.expires, locale) })}</span>
        <span className="sp" />
        <Link className="tlink" href="/account/profile#acknowledgement">{t('renew')}</Link>
      </div>
    );
  }
  return (
    <div className="gatebar err" data-ack={ack.state}>
      <div>
        <b>{t('gate_title')}</b>
        <p className="note">{ack.state === 'lapsed' ? t('gate_lapsed') : t('gate_body')}</p>
      </div>
      <span className="sp" />
      <Link className="btn btn-sm btn-accent" href="/account/profile#acknowledgement">{t('gate_link')}</Link>
    </div>
  );
}

export async function ShopGrid({ uid, ack, saved }: { uid: string; ack: Ack; saved: string[] }) {
  const t = await getTranslations('account.shop');
  const locale = await getLocale();
  const rows = await getCatalogue(uid);

  // Pathways in catalogue order, each with its compounds; a lot never becomes a card of its own.
  const chapters: { no: string; name: string; kind: string; rows: CatalogueRow[] }[] = [];
  for (const r of rows) {
    let c = chapters.find(x => x.no === r.pathway_no);
    if (!c) chapters.push((c = { no: r.pathway_no, name: pick(locale, r.pathway_en, r.pathway_id_name), kind: r.pathway_kind, rows: [] }));
    c.rows.push(r);
  }

  return (
    <>
      <div className="rv" style={rv(0)}>
        <AckBanner ack={ack} />
        <FilterChips scope="shop" chips={[
          { value: '', label: t('all') },
          { value: 'peptide', label: t('peptides') },
          { value: 'device', label: t('therapy') },
          { value: 'apparel', label: t('apparel') },
          { value: 'saved', label: t('saved') },
        ]} />
      </div>

      <div className="pgrid rv" style={rv(1)} data-scope="shop">
        {chapters.map(ch => {
          const compounds = groupCompounds(ch.rows);
          const anySaved = ch.rows.some(r => saved.includes(r.sku));
          return (
            <div key={ch.no} style={{ display: 'contents' }}>
              <div className="pgrp" data-group data-tags={`${ch.kind}${anySaved ? ' saved' : ''}`}>
                <span>{ch.no}</span><span className="nm">{ch.name}</span>
              </div>
              {compounds.map(c => (
                <CompoundCard key={c.id} slug={c.slug} name={c.name} tags={`${c.kind}${c.variants.some(v => saved.includes(v.sku)) ? ' saved' : ''}`}
                  saved={saved}
                  lots={c.variants
                    .slice()
                    .sort((a, b) => a.sort - b.sort)
                    .map(v => ({ sku: v.sku, dose: v.dose, content: v.content, price: v.price_idr, available: v.available }))} />
              ))}
            </div>
          );
        })}
        <p className="empty" data-none hidden style={{ gridColumn: '1 / -1' }}>{t('empty')}</p>
      </div>
    </>
  );
}
