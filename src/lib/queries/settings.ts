import 'server-only';
import { withRls } from '@/lib/db';
import type { Settings } from '@/lib/settings';

/**
 * The settings a signed-in caller may read. `getSettings()` reads anonymously — which is right for
 * the public site, and wrong for a document, because the policy on `site_settings` withholds the
 * `entity` and `bank` rows from an anonymous caller. An invoice without its issuing entity and its
 * NPWP is not an Indonesian tax document, so the document builders read them as the caller instead.
 */
export async function callerSettings(uid: string): Promise<Settings> {
  const rows = await withRls({ uid }, tx => tx<{ key: string; value: unknown }[]>`
    select key, value from public.site_settings`);
  return Object.fromEntries(rows.map(r => [r.key, r.value])) as Settings;
}
