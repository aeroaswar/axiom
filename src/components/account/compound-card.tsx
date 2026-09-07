'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { idr } from '@/lib/money';
import { AddToBasket, SaveMark } from './client-forms';

/**
 * A compound is one card. Retatrutide is one card with five doses, not five cards: the lots are
 * dose rows, and the dose in view sets the price, the availability and what Add puts in the
 * basket. Where the acknowledgement is not current the price is absent rather than zero, because
 * the database returned no price at all.
 */

export type Lot = { sku: string; dose: string; content: string; price: number | null; available: number };

export function CompoundCard({ slug, name, kind, lots, saved, tags }: {
  slug: string; name: string; kind: string; lots: Lot[]; saved: string[]; tags: string;
}) {
  const [sku, setSku] = useState(lots[0]?.sku ?? '');
  const t = useTranslations('account.shop');
  const sel = lots.find(l => l.sku === sku) ?? lots[0];
  if (!sel) return null;

  // Available is the norm and stays silent; a lot with three or fewer left, or none, is the
  // exception and earns its chip. Seventy identical "Available" lines say nothing.
  const short = sel.available <= 0 ? t('out') : sel.available <= 3 ? t('left', { count: sel.available }) : null;

  const addable = sel.price !== null && sel.available > 0;

  return (
    // `data-kind` is what tells a peptide card from a device card without reading its text: the
    // acknowledgement gate withholds a peptide price and never a device's, so a check on "no price
    // showing" has to be able to say which kind it is looking at.
    <article className={`pcard${addable ? '' : ' flat'}`} data-kind={kind} data-tags={tags} data-compound={slug} data-priced={sel.price === null ? '0' : '1'}>
      {short ? (
        <span className="st"><span className={`chip ${sel.available <= 0 ? 'err' : 'warn'}`}><span className="dot" />{short}</span></span>
      ) : null}

      <Link className="nm lk" href={`/account/shop/${slug}`}>{name}</Link>

      {lots.length > 1 ? (
        <span className="doses">
          {lots.map(l => (
            <button key={l.sku} type="button" className={`dose${l.sku === sel.sku ? ' on' : ''}`}
              aria-pressed={l.sku === sel.sku} onClick={() => setSku(l.sku)}>{l.dose}</button>
          ))}
        </span>
      ) : (
        <span className="ds">{sel.dose} · {sel.content}</span>
      )}

      <span className={`pr${sel.price === null ? ' gated' : ''}`}>{sel.price === null ? t('gated') : idr(sel.price)}</span>

      {/* Commerce is gated at the database: with no price there is nothing to add, so the card
          offers nothing to press and the banner above carries the whole explanation. A lot with
          nothing available says so in its chip; asking to be told lives on the compound's sheet,
          where there is room for the sentence. */}
      <span className="cardfoot">
        {addable ? <AddToBasket sku={sel.sku} label={t('add_short')} done={t('added_short')} bare /> : null}
        <SaveMark sku={sel.sku} saved={saved.includes(sel.sku)} />
      </span>
    </article>
  );
}
