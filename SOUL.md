# AXIOM — soul

Who AXIOM is, what it believes and how it speaks. Read this before you write a line of copy,
name a feature or decide what a page leaves out. How it looks is in [DESIGN.md](DESIGN.md).

The canonical sources are §2, §3 and §9 of `business-proposal/axiom-business-master-prompt.md`
and chapter 02 of `brand-book/index.html`. This file condenses them, and where they disagree with
each other or with the code, it says so.

## What AXIOM is

A human-performance and longevity house based in Jakarta, Indonesia. It is a **branded house**:
one master mark and one standard, not a family of sub-brands. Research-grade peptides, clinical
red-light therapy, recovery, wellness and apparel are held to a single standard of
**verification and documentation**.

AXIOM sells direct to the buyer, prices in IDR, works bilingually in Indonesian and English
(Indonesian first), offers human support on WhatsApp first, ships peptides cold-chain and issues
a Certificate of Analysis for every lot.

> AXIOM is a human-performance and longevity house based in Jakarta, Indonesia. We bring
> research-grade peptides, clinical red-light therapy, recovery, wellness and apparel under one
> standard — verified, documented, sourced right. Peptides are Research Use Only, in-vitro.
> Prices in IDR.

That boilerplate is used verbatim.

- **Mission:** make verified, research-grade performance and longevity tools available to people
  who train for decades, not weeks, held to one standard.
- **Promise:** *Human performance, engineered for the long run.*
- **Values:** verification over claims · restraint · the long run · direct.

## The five pillars

Each is written `AXIOM · Pillar` and is never given its own brand.

1. **Peptide Science.** Research-grade peptides, each lot verified by HPLC/MS to ≥ 98 % with a
   CoA. Research Use Only, in-vitro.
2. **Therapy & Recovery.** Clinical red-light therapy at true 660 + 850 nm with verified
   irradiance, plus compression, mats and masks.
3. **Wellness.** Antioxidants, NAD⁺ and cellular-energy support.
4. **Longevity.** Compounds for cellular ageing, senescence and copper peptides, for the long game.
5. **Apparel.** Neutral, precise performance wear and everyday carry.

## Who it is for

| Persona | Their pain | What AXIOM offers | Proof | Call to action |
| --- | --- | --- | --- | --- |
| The Researcher | Can't trust identity or purity | Verified, documented material by lot | HPLC/MS ≥ 98 %, CoA, cold-chain | *Request the CoA.* |
| The Decade Athlete | Hype and neon marketing | A calm clinical system for the long game | One standard across every product | *Explore the range.* |
| The Clinic Buyer | Novelty LEDs, bad specs, unreliable restock | Clinical-grade, spec-honest hardware | True 660 + 850 nm, verified irradiance | *Talk to the team.* |
| The Identity Wearer | Loud logos that stand for nothing | Quiet identity with a real standard behind it | The same mark, lab to label | *Wear the standard.* |

## How AXIOM speaks

The voice of a senior clinician who is also a world-class designer: precise without being cold,
authoritative without condescension, restrained without disappearing.

- **Proof before promise.** Say what was measured before saying what it means.
- **Short declaratives.** One idea to a sentence.
- **Quiet confidence.** No exclamation marks, anywhere. No emoji, no alarm, no hype.
- **Exact numbers.** Units are spaced (`10 mg`, `≥ 98%`), currency is written `Rp 1.600.000`
  and every figure is tabular.
- **Plain language where the reader is not a scientist.** The compound guide leads each page with
  what a compound does in one sentence, and puts the pharmacology class underneath.
- **Errors are calm and specific.** Say what happened and what to do next. Never infantilise the
  reader ("Oops!") and never be vague.

**Use:** standard · verified · documented · protocol · lot · purity · clinical · research-grade ·
longevity · the long run · Certificate of Analysis · cold-chain.

**Never use:** miracle · guaranteed · cure · anti-aging · stack · cycle · boost · best / #1, or
any overclaim, medical claim or superlative. In the web app, the copy lint (`pnpm gates:lint`,
`scripts/gates/lib/copy-rules.mjs`) fails the build on any of these words, or on an exclamation
mark, in the message catalogues and the product content. The storefront, the print sheets and
the guide are not linted, so check them by hand.

Headlines are sentence case. "AXIOM" is always in capitals.

## The restraint is the credibility

Compliance is part of the identity, not an appendix to it.

- **Peptides are Research Use Only, in-vitro.** They are not drugs, food, cosmetics or
  supplements, and not for human or veterinary consumption, diagnosis or treatment.
- **The disclaimer is stated as fact, never buried.** It appears wherever peptides appear, set
  legibly:
  > Research Use Only. Intended exclusively for in-vitro laboratory research — not for human or
  > veterinary consumption, diagnosis, or treatment. No dosing or usage guidance is provided.
- **The acknowledgement gate.** Buyers must be 18 or over, and a peptide purchase needs a
  qualified researcher or institutional buyer. In the web app this is enforced by the database:
  an account without a current acknowledgement is shown no peptide price.
- **Jurisdiction.** Several compounds are controlled. The buyer is responsible for compliance,
  and AXIOM makes no claim of legality in any territory.
- **Labels** may state compound, lot, HPLC purity, molecular mass and storage temperature. They
  must carry the RUO micro-disclaimer and a tamper-evident seal. They may not imply a human dose,
  route, frequency, cycle or therapeutic benefit.
- **Every research claim needs a source.** A PubMed ID or DOI that resolves, or the claim doesn't
  render.

## Open tensions

These are places where the repository does not yet agree with the rules above. Each needs a
decision from the owner, and none should be resolved silently in code.

- **The compound guide shows doses.** `dosage-guide/` documents trial and label doses, has a pen
  calculator and exports dose dates. That conflicts with "zero medical guidance" in the master
  prompt's §3. The guide labels each figure with its evidence tier and states "No human dose has
  been set" rather than inventing one, but it remains dosing content.
- **The personal tracker.** `dosage-guide/tracker.html` is a dose log the owner asked for on
  10 November 2026: a person records what they took, with check-ins and progress photos. It
  suggests no amount or schedule and keeps every record on the device, but it is still a
  personal-use surface beside a Research Use Only catalogue. It is kept out of the guide's
  deployment (`dosage-guide/.vercelignore`) and published only as a private Claude Artifact.
- **The vial label's DOSE row.** `10 clicks = 1 mg` is a pen calibration, but a regulator may
  read it as a dose. `stickers/design.md` §9 keeps it switchable per SKU (`dose: null`).
- **The brand book's copy examples.** Its "write this" example states a dose ("250mcg twice
  daily"), and its type scale uses phrases such as "Clinically Validated · Precisely Dosed". The
  compliance guardrails supersede both, so don't copy them.
- **Two wordmark drawings.** The storefront carries a different drawing from the master path
  (see DESIGN.md).

## Language

Indonesian is the default locale of the web app. The storefront opens in Indonesian for
browsers set to Indonesian and remembers a visitor's own choice. The Indonesian copy was drafted
by machine against a fixed glossary. A fluent Indonesian speaker must review the legal pages and
the certificate wording before public use.
