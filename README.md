# AXIOM

Consolidated AXIOM brand and product materials, migrated from the `aeroaswar/general`
repository, where the work had accumulated across several unmerged topic branches.

## Contents

- `website/` — the current AXIOM product site (Human Performance & Longevity: peptides,
  clinical red-light therapy, recovery, wellness, apparel). Migrated from
  `claude/axiom-check-uk4uhm`, the most complete and recent iteration of the site.
- `web-app/` — the AXIOM platform: two master prompts an executing agent builds from, plus a
  clickable single-file mockup.
  - `axiom-platform-master-prompt.md` — the entry document for the whole property: the public
    website (price list and compound guide), the client account and the admin console as one
    Next.js and Supabase build over **one catalogue of 79 lots**. Start here.
  - `axiom-web-app-master-prompt.md` — the interior detail of the Console and Account: the
    commercial flow from quote to delivery, the six admin modules, the system rules, the mobile
    shell and the design system.
  - `mockup/index.html` — the clickable target for the Console and Account: smoked-bronze glass,
    the desktop rail, the Instagram-style mobile tab bar, and the working quote-to-delivery
    pipeline.
- `brand-book/` — the AXIOM brand book / style guide. Migrated from
  `claude/axiom-brand-book-0puows`.
- `business-proposal/` — business proposal, GTM strategy, and pricing materials.
  Migrated from `claude/axiom-business-proposal-p57t1y`.
- `archive/premium-hero/` — an earlier iteration of the product site (peptides-only
  catalogue, root-level layout), superseded by `website/`. Migrated from
  `claude/axiom-premium-hero-uzxjp4` and kept for reference.

## Source

All content originated in `aeroaswar/general` on the following branches, which remain
in that repository's history:

- `claude/axiom-brand-book-0puows`
- `claude/axiom-business-proposal-p57t1y`
- `claude/axiom-check-uk4uhm`
- `claude/axiom-premium-hero-uzxjp4`

None of this content had been merged into `general`'s `main` branch prior to migration.
