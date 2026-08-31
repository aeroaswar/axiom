/* ------------------------------------------------------------------ *
 * AXIOM — Compound Guide data
 *
 * EVIDENCE TIERS — every protocol row carries one. This is the spine of
 * the guide: it is what separates a documented regimen from a number
 * somebody made up.
 *
 *   "label"       Approved product label exists. The regimen shown is the
 *                 labelled one, and the label is named.
 *   "trial"       No approval, but dosing is published in registered human
 *                 clinical trials. The trial phase is named.
 *   "regional"    Approved/registered in a specific jurisdiction only.
 *   "preclinical" Animal or in-vitro data only. NO established human dose.
 *                 The guide says so rather than inventing a figure.
 *
 * Nothing here is a prescription. Where no human protocol exists, the
 * guide states that plainly instead of filling the gap.
 * ------------------------------------------------------------------ */
window.COMPOUNDS = [
  {
    slug: "tirzepatide", name: "Tirzepatide", category: "Metabolic",
    cls: "Dual GIP / GLP-1 receptor agonist",
    halfLife: "≈5 days", route: "Subcutaneous", cadence: "weekly",
    days: [1, 0, 0, 0, 0, 0, 0],
    cadenceNote: "Once weekly, same day each week. Time of day is flexible; keep it consistent.",
    evidence: "label",
    evidenceNote: "Approved as Mounjaro / Zepbound (FDA, EMA). The regimen below is the labelled titration.",
    protocol: [
      { k: "Starting dose", v: "2.5 mg once weekly", n: "Initiation dose — for tolerability, not intended as a maintenance dose." },
      { k: "After 4 weeks", v: "5 mg once weekly", n: "First maintenance step." },
      { k: "Escalation", v: "+2.5 mg increments", n: "No sooner than every 4 weeks at each step." },
      { k: "Maximum", v: "15 mg once weekly", n: "Labelled ceiling." },
      { k: "Missed dose", v: "Within 4 days → take it", n: "Beyond 4 days, skip and resume the normal day." }
    ],
    benefits: [
      "Glycaemic control — dual incretin action on glucose-dependent insulin secretion.",
      "Body-weight reduction, sustained across 72-week trial data.",
      "Appetite and gastric-emptying modulation via central and peripheral incretin signalling.",
      "Improvements in lipid profile and blood pressure observed as secondary endpoints."
    ],
    recon: { vialMg: 10, bacMl: 2, doseMg: 2.5, unit: "mg" },
    storage: "Refrigerate 2–8 °C. Protect from light. Do not freeze. Discard if the solution is cloudy or discoloured.",
    cautions: [
      "Contraindicated with personal or family history of medullary thyroid carcinoma or MEN 2.",
      "Gastrointestinal effects are the dose-limiting factor — escalate slowly.",
      "Prescription-only medicine in most jurisdictions."
    ]
  },
  {
    slug: "retatrutide", name: "Retatrutide", category: "Metabolic",
    cls: "Triple GIP / GLP-1 / glucagon receptor agonist",
    halfLife: "≈6 days", route: "Subcutaneous", cadence: "weekly",
    days: [1, 0, 0, 0, 0, 0, 0],
    cadenceNote: "Weekly administration in trial protocols, consistent with the ~6-day half-life.",
    evidence: "trial",
    evidenceNote: "Investigational. Not approved in any jurisdiction. Doses below are those used in registered Phase 2 trials — they are trial protocol, not a licensed regimen.",
    protocol: [
      { k: "Phase 2 range", v: "1–12 mg once weekly", n: "Trial arms spanned this range with stepwise escalation." },
      { k: "Escalation", v: "Stepwise, multi-week", n: "Trials escalated over 4-week blocks from a low starting dose." },
      { k: "Approved regimen", v: "None", n: "No regulator has approved a dose. Outside a trial there is no established protocol." }
    ],
    benefits: [
      "Triple-pathway metabolic action — adds glucagon-receptor agonism to the incretin mechanism.",
      "Largest weight reduction reported to date in Phase 2 incretin trials.",
      "Studied for hepatic fat reduction and glycaemic endpoints."
    ],
    recon: { vialMg: 10, bacMl: 2, doseMg: 2, unit: "mg" },
    storage: "Lyophilised: store sealed at −20 °C, protected from light. Reconstituted: 2–8 °C, avoid freeze–thaw cycles.",
    cautions: [
      "Investigational compound — the full human safety profile is not established.",
      "Gastrointestinal tolerability is dose-limiting in trial data.",
      "Not a licensed medicine. Supplied for research use."
    ]
  },
  {
    slug: "tesamorelin", name: "Tesamorelin", category: "Metabolic",
    cls: "GHRH analogue",
    halfLife: "≈26–38 minutes", route: "Subcutaneous", cadence: "daily",
    days: [1, 1, 1, 1, 1, 1, 1],
    cadenceNote: "Once daily. The short half-life is the reason for daily administration — a weekly schedule is not pharmacologically coherent.",
    evidence: "label",
    evidenceNote: "Approved as Egrifta (FDA) for HIV-associated lipodystrophy. The regimen below is the labelled one.",
    protocol: [
      { k: "Labelled dose", v: "2 mg once daily", n: "Subcutaneous, abdomen, rotating the injection site." },
      { k: "Timing", v: "Consistent daily time", n: "Commonly at night, aligning with endogenous GH pulsatility." },
      { k: "Assessment", v: "Reassess at 6 months", n: "Label directs review of continued benefit." }
    ],
    benefits: [
      "Reduction of visceral adipose tissue — the labelled indication.",
      "Stimulates endogenous GH release rather than supplying exogenous GH.",
      "Studied for effects on triglycerides and hepatic fat fraction."
    ],
    recon: { vialMg: 10, bacMl: 2, doseMg: 2, unit: "mg" },
    storage: "Lyophilised: 2–8 °C. Reconstitute with the supplied diluent and use promptly; do not freeze once reconstituted.",
    cautions: [
      "Contraindicated in active malignancy and during pregnancy.",
      "Monitor glucose — GH-axis stimulation can reduce insulin sensitivity.",
      "Prescription-only medicine."
    ]
  },
  {
    slug: "bpc-157", name: "BPC-157", category: "Tissue Repair",
    cls: "Synthetic pentadecapeptide (gastric-juice derived sequence)",
    halfLife: "Short — minutes (model-dependent)", route: "Subcutaneous / oral in study models",
    cadence: "daily",
    days: [1, 1, 1, 1, 1, 1, 1],
    cadenceNote: "Preclinical protocols dose daily, often split, on the basis of a short half-life. No human schedule is established.",
    evidence: "preclinical",
    evidenceNote: "No completed human clinical trials. There is no established human dose, and any figure presented as one is not supported by published evidence.",
    protocol: [
      { k: "Human dose", v: "Not established", n: "No registered human trial has defined a therapeutic dose or schedule." },
      { k: "Study models", v: "Rodent, µg/kg range", n: "Animal protocols report effect across a wide µg/kg band; these do not translate directly to human dosing." },
      { k: "Regulatory status", v: "Not approved", n: "Placed on the FDA's bulk-substance exclusion list. Research use only." }
    ],
    benefits: [
      "Tendon, ligament and muscle healing — the most replicated preclinical finding.",
      "Gastrointestinal mucosal protection in ulcer and colitis models.",
      "Angiogenesis promotion via VEGFR2 signalling in animal work.",
      "Studied for cytoprotection against NSAID-induced injury."
    ],
    recon: { vialMg: 10, bacMl: 2, doseMg: 0.25, unit: "mg" },
    storage: "Lyophilised: sealed at −20 °C, protected from light. Reconstituted: 2–8 °C, use within weeks, no freeze–thaw.",
    cautions: [
      "Long-term human safety data does not exist.",
      "Angiogenic activity is the mechanism of interest and also the basis of theoretical concern in the presence of malignancy.",
      "Research use only — not a medicine."
    ]
  },
  {
    slug: "tb-500", name: "TB-500", category: "Tissue Repair",
    cls: "Thymosin β4 fragment (actin-binding peptide)",
    halfLife: "Extended relative to BPC-157 (model-dependent)",
    route: "Subcutaneous", cadence: "weekly",
    days: [1, 0, 0, 1, 0, 0, 0],
    cadenceNote: "Preclinical work uses a loading phase of two administrations per week, then a reduced maintenance frequency. No human schedule is established.",
    evidence: "preclinical",
    evidenceNote: "Thymosin β4 itself has reached early human trials; the TB-500 fragment as sold has no established human dose.",
    protocol: [
      { k: "Human dose", v: "Not established", n: "No approved indication and no defined human regimen for the fragment." },
      { k: "Study models", v: "Twice-weekly loading", n: "Animal protocols commonly front-load, then taper frequency." },
      { k: "Regulatory status", v: "Not approved", n: "WADA-prohibited in sport. Research use only." }
    ],
    benefits: [
      "Cell migration and actin regulation — the core mechanism under study.",
      "Angiogenesis and tissue remodelling in injury models.",
      "Studied alongside BPC-157 for soft-tissue and cardiac repair endpoints.",
      "Anti-fibrotic signalling reported in preclinical cardiac work."
    ],
    recon: { vialMg: 10, bacMl: 2, doseMg: 2, unit: "mg" },
    storage: "Lyophilised: −20 °C sealed. Reconstituted: 2–8 °C, protect from light, avoid repeated freeze–thaw.",
    cautions: [
      "Prohibited at all times under the WADA code — relevant to any tested athlete.",
      "No human safety dataset.",
      "Research use only."
    ]
  },
  {
    slug: "cjc-ipamorelin", name: "CJC-1295 no DAC + Ipamorelin", category: "Growth Factors",
    cls: "GHRH analogue + selective ghrelin-receptor agonist (GHS)",
    halfLife: "CJC no DAC ≈30 min · Ipamorelin ≈2 h",
    route: "Subcutaneous", cadence: "daily",
    days: [1, 1, 1, 1, 1, 0, 0],
    cadenceNote: "Short half-lives drive daily administration, typically before sleep to coincide with the nocturnal GH pulse. Five-on / two-off patterns appear in practice, not in trial data.",
    evidence: "preclinical",
    evidenceNote: "Neither component is approved as a combination product. Ipamorelin was discontinued in clinical development; CJC-1295 without DAC has no approved indication.",
    protocol: [
      { k: "Human dose", v: "Not established", n: "No approved regimen exists for this combination." },
      { k: "Timing rationale", v: "Pre-sleep", n: "GH secretion is pulsatile and largely nocturnal — the basis for evening administration in study designs." },
      { k: "Food effect", v: "Fasted window", n: "Elevated glucose and somatostatin tone blunt GH response in physiological studies." }
    ],
    benefits: [
      "Stimulates endogenous GH pulses through two complementary receptors rather than supplying exogenous GH.",
      "Ipamorelin is selective — minimal cortisol and prolactin release compared with earlier GHS compounds.",
      "Studied for recovery, sleep quality and body-composition endpoints."
    ],
    recon: { vialMg: 10, bacMl: 2, doseMg: 0.2, unit: "mg" },
    storage: "Lyophilised: −20 °C. Reconstituted: 2–8 °C. Both components are light-sensitive.",
    cautions: [
      "GH-axis stimulation can reduce insulin sensitivity.",
      "Prohibited under the WADA code.",
      "Research use only."
    ]
  },
  {
    slug: "mots-c", name: "MOTS-c", category: "Metabolic",
    cls: "Mitochondrial-derived peptide",
    halfLife: "Short (minutes–hours, model-dependent)",
    route: "Subcutaneous", cadence: "cycle",
    days: [1, 0, 1, 0, 1, 0, 0],
    cadenceNote: "Study protocols use intermittent rather than continuous administration. No human schedule is established.",
    evidence: "preclinical",
    evidenceNote: "Human data is limited to observational and early-stage work. No approved indication or defined dose.",
    protocol: [
      { k: "Human dose", v: "Not established", n: "No registered trial has defined a therapeutic human regimen." },
      { k: "Study models", v: "Intermittent dosing", n: "Rodent metabolic studies dose on alternate days rather than continuously." },
      { k: "Regulatory status", v: "Not approved", n: "Research use only." }
    ],
    benefits: [
      "AMPK activation — the central mechanism in metabolic-homeostasis research.",
      "Insulin-sensitivity and glucose-handling endpoints in animal models.",
      "Exercise-capacity and mitochondrial-function research interest.",
      "Studied within the broader mitochondrial-signalling and longevity literature."
    ],
    recon: { vialMg: 10, bacMl: 2, doseMg: 5, unit: "mg" },
    storage: "Lyophilised: −20 °C sealed, protected from light. Reconstituted: 2–8 °C.",
    cautions: [
      "No human safety dataset.",
      "Research use only."
    ]
  },
  {
    slug: "ghk-cu", name: "GHK-Cu", category: "Longevity & Cosmetic",
    cls: "Copper-binding tripeptide",
    halfLife: "Short systemically; depot effect topically",
    route: "Topical (human data) / subcutaneous (research)",
    cadence: "daily",
    days: [1, 1, 1, 1, 1, 1, 1],
    cadenceNote: "Topical formulations are applied once or twice daily in the published human cosmetic studies.",
    evidence: "regional",
    evidenceNote: "Human evidence is for TOPICAL cosmetic formulations, which are widely marketed. Injectable use has no approved indication and no established dose.",
    protocol: [
      { k: "Topical (human data)", v: "1–2× daily application", n: "Cosmetic-study formulations typically at low percentage concentrations." },
      { k: "Injectable dose", v: "Not established", n: "No approved regimen. Copper load is the limiting consideration." },
      { k: "Regulatory status", v: "Cosmetic ingredient", n: "Not approved as an injectable medicine." }
    ],
    benefits: [
      "Collagen and elastin synthesis — the basis of its cosmetic use.",
      "Wound-healing and skin-remodelling endpoints in dermatological studies.",
      "Antioxidant and anti-inflammatory signalling in the copper-peptide literature.",
      "Hair-follicle research interest."
    ],
    recon: { vialMg: 50, bacMl: 5, doseMg: 2, unit: "mg" },
    storage: "Lyophilised: −20 °C, protect from light — copper peptides are photosensitive. Reconstituted: 2–8 °C.",
    cautions: [
      "Copper accumulation is the principal concern with systemic use.",
      "Contraindicated in Wilson's disease and other copper-handling disorders.",
      "Injectable use is research only."
    ]
  },
  {
    slug: "pt-141", name: "PT-141 (Bremelanotide)", category: "Reproductive",
    cls: "Melanocortin receptor agonist",
    halfLife: "≈2.7 hours", route: "Subcutaneous", cadence: "as-needed",
    days: [0, 0, 0, 0, 0, 0, 0],
    cadenceNote: "Episodic — taken ahead of anticipated activity, not on a fixed daily or weekly schedule.",
    evidence: "label",
    evidenceNote: "Approved as Vyleesi (FDA) for hypoactive sexual desire disorder in premenopausal women. The regimen below is the labelled one.",
    protocol: [
      { k: "Labelled dose", v: "1.75 mg as needed", n: "Single subcutaneous dose in the abdomen or thigh." },
      { k: "Timing", v: "≥45 minutes before", n: "Labelled lead time ahead of anticipated activity." },
      { k: "Frequency ceiling", v: "1 per 24 h · 8 per month", n: "Labelled maximum — this is the limiting constraint." }
    ],
    benefits: [
      "Central melanocortin pathway action on sexual desire — distinct from vascular mechanisms.",
      "Episodic use rather than daily dosing.",
      "Studied in both female (approved) and male populations."
    ],
    recon: { vialMg: 10, bacMl: 2, doseMg: 1.75, unit: "mg" },
    storage: "Lyophilised: −20 °C. Reconstituted: 2–8 °C, protect from light.",
    cautions: [
      "Nausea is the most common labelled adverse effect.",
      "Transient blood-pressure increase — contraindicated in uncontrolled hypertension or established cardiovascular disease.",
      "May cause focal hyperpigmentation with repeated use."
    ]
  },
  {
    slug: "thymosin-alpha-1", name: "Thymosin Alpha-1", category: "Growth Factors",
    cls: "Immunomodulatory peptide",
    halfLife: "≈2 hours", route: "Subcutaneous", cadence: "weekly",
    days: [1, 0, 0, 1, 0, 0, 0],
    cadenceNote: "Twice weekly in the approved regimen, spaced across the week.",
    evidence: "regional",
    evidenceNote: "Approved as Zadaxin in a number of countries for chronic hepatitis B and as a vaccine adjuvant. Not FDA-approved.",
    protocol: [
      { k: "Registered dose", v: "1.6 mg twice weekly", n: "Subcutaneous, in the approved hepatitis B regimen." },
      { k: "Duration", v: "Indication-dependent", n: "Registered courses run for months, not weeks." },
      { k: "US status", v: "Not FDA-approved", n: "Approval is jurisdiction-specific." }
    ],
    benefits: [
      "T-cell maturation and function — the core immunomodulatory mechanism.",
      "Registered use in chronic hepatitis B.",
      "Studied as a vaccine adjuvant and in sepsis and oncology-support settings."
    ],
    recon: { vialMg: 10, bacMl: 2, doseMg: 1.6, unit: "mg" },
    storage: "Lyophilised: 2–8 °C acceptable; −20 °C for long-term. Reconstituted: 2–8 °C, use promptly.",
    cautions: [
      "Immunomodulatory — relevant in autoimmune disease and after transplantation.",
      "Approval status varies by country; confirm local regulatory position."
    ]
  },
  {
    slug: "semax", name: "Semax", category: "Neuropeptides",
    cls: "ACTH(4-10) analogue — heptapeptide",
    halfLife: "Short (minutes, intranasal)",
    route: "Intranasal", cadence: "daily",
    days: [1, 1, 1, 1, 1, 1, 1],
    cadenceNote: "Daily, often divided across the day, reflecting a very short half-life.",
    evidence: "regional",
    evidenceNote: "Registered in Russia for stroke and cognitive indications. Not approved in the US, EU, UK or Australia.",
    protocol: [
      { k: "Registered use", v: "Intranasal, daily divided", n: "Russian clinical practice; regimens are indication-specific." },
      { k: "Western status", v: "Not approved", n: "No approved dose outside its registration jurisdiction." },
      { k: "Route", v: "Intranasal", n: "The registered route — nose-to-brain delivery is central to its use." }
    ],
    benefits: [
      "BDNF and NGF expression increases reported in the neurotrophic literature.",
      "Registered for ischaemic stroke recovery in its home jurisdiction.",
      "Studied for attention, cognition and neuroprotection endpoints.",
      "Non-sedating anxiolytic profile reported alongside Selank."
    ],
    recon: { vialMg: 10, bacMl: 2, doseMg: 0.3, unit: "mg" },
    storage: "Lyophilised: −20 °C. Reconstituted: 2–8 °C, protect from light, short in-use window.",
    cautions: [
      "Regulatory status is jurisdiction-specific — unapproved in most Western markets.",
      "Long-term safety data is limited outside its registration setting."
    ]
  },
  {
    slug: "epitalon", name: "Epitalon", category: "Longevity & Cosmetic",
    cls: "Synthetic tetrapeptide (pineal-derived sequence)",
    halfLife: "Short (minutes)", route: "Subcutaneous", cadence: "cycle",
    days: [1, 1, 1, 1, 1, 0, 0],
    cadenceNote: "Administered in short defined courses separated by long intervals, rather than continuously — the pattern used throughout the source literature.",
    evidence: "preclinical",
    evidenceNote: "Human data comes from a small body of Russian-language work that has not been independently replicated. No approved indication and no established dose.",
    protocol: [
      { k: "Human dose", v: "Not established", n: "No regulator has approved a dose; source studies are not independently replicated." },
      { k: "Course pattern", v: "Short course, long gap", n: "The literature uses defined multi-day courses repeated a few times a year." },
      { k: "Regulatory status", v: "Not approved", n: "Research use only." }
    ],
    benefits: [
      "Telomerase-activity findings in cell-culture work — the origin of its longevity interest.",
      "Melatonin-rhythm and pineal-function endpoints in the source literature.",
      "Antioxidant signalling in animal ageing models."
    ],
    recon: { vialMg: 10, bacMl: 2, doseMg: 5, unit: "mg" },
    storage: "Lyophilised: −20 °C sealed. Reconstituted: 2–8 °C, short in-use window, protect from light.",
    cautions: [
      "The human evidence base is thin and largely single-source.",
      "Research use only."
    ]
  }
];

/* Shared handling note — carried through from the AXIOM reference material. */
window.HANDLING = "Supplied lyophilised (freeze-dried). Store sealed at −20 °C and protect from light. Reconstitute with sterile or bacteriostatic water added slowly down the vial wall — do not shake; swirl until dissolved. Refrigerate (2–8 °C) once reconstituted and avoid repeated freeze–thaw.";

window.EVIDENCE_META = {
  label:       { label: "Approved label",   tone: "solid",  blurb: "An approved product label exists. The regimen shown is the labelled one." },
  trial:       { label: "Clinical trial",   tone: "mid",    blurb: "Not approved. Dosing shown is from registered human trials — trial protocol, not a licensed regimen." },
  regional:    { label: "Regional approval",tone: "mid",    blurb: "Approved or registered in specific jurisdictions only. Confirm the position where you are." },
  preclinical: { label: "Preclinical only", tone: "open",   blurb: "Animal or in-vitro data only. No established human dose — this guide will not invent one." }
};
