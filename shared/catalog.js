/* AXIOM — canonical catalogue & brand contacts. Single source of truth.
 *
 * Consumed via <script src> by:
 *   website/index.html
 *   business-proposal/axiom-peptide-pricelist.html
 *   business-proposal/axiom-pricelist-print.html
 *
 * Pricing rule (business-proposal/axiom-business-proposal.html):
 *   sale price = (supplier lot + Rp 600.000) ÷ 0.47, rounded to the nearest Rp 100.000.
 *   Items without a cost basis on file carry their previous list price until costed.
 * Supplier costs are NOT in this file — see business-proposal/axiom-costs.js (internal only).
 *
 * Fields per item:
 *   sku       stable unique id — used for deep links (#products/p/<sku>), cart entries and lot records
 *   name      display name (keys into window.REFERENCE where a research entry exists)
 *   printName wording used on the price-list documents when it differs from `name`
 *   pathway / pathwayNo — the price-list's 8-pathway grouping (peptides only)
 *   price     IDR integer; formatted at render time
 */
window.AXIOM_DATA = {
  meta: { version: "2.0", updated: "2026-08-30", currency: "IDR" },
  brand: {
    name: "AXIOM — Human Performance & Longevity",
    waNumber: "628128573396",
    waDisplay: "+62 812 857 3396",
    email: "hello@axiomperformance.example",
    hours: "Mon–Sat · 09:00–18:00 WIB",
    location: "Jakarta, Indonesia"
  },
  pathways: [
    { no: "01", name: "GLP-1s & Weight Loss" },
    { no: "02", name: "GH Secretagogues" },
    { no: "03", name: "Healing & Repair" },
    { no: "04", name: "Brain Health & Nootropics" },
    { no: "05", name: "Energy & Endurance" },
    { no: "06", name: "Immunity" },
    { no: "07", name: "Sexual Health" },
    { no: "08", name: "Longevity & Cellular Repair" }
  ],
  categories: [
    {
      id: "metabolic",
      no: "01",
      name: "Metabolic & Weight Management",
      icon: "scales",
      blurb: "Metabolic regulators, incretin mimetics and cellular-energy compounds for research into weight, glucose handling and longevity pathways.",
      items: [
        { sku: "mots-c-10mg", name: "MOTS-c", dose: "10 mg", content: "Pen", price: 2400000, pathwayNo: "05" },
        { sku: "mots-c-40mg", name: "MOTS-c", dose: "40 mg", content: "Pen", price: 4300000, pathwayNo: "05" },
        { sku: "tesamorelin-10mg", name: "Tesamorelin", dose: "10 mg", content: "Pen", price: 3600000, pathwayNo: "02" },
        { sku: "tesamorelin-20mg", name: "Tesamorelin", dose: "20 mg", content: "Pen", price: 4700000, pathwayNo: "02" },
        { sku: "tirzepatide-10mg", name: "Tirzepatide", dose: "10 mg", content: "Pen", price: 2400000, pathwayNo: "01" },
        { sku: "tirzepatide-30mg", name: "Tirzepatide", dose: "30 mg", content: "Pen", price: 3800000, pathwayNo: "01" },
        { sku: "tirzepatide-40mg", name: "Tirzepatide", dose: "40 mg", content: "Pen", price: 4500000, pathwayNo: "01" },
        { sku: "cagrilintide-10mg", name: "Cagrilintide", dose: "10 mg", content: "Pen", price: 3000000, pathwayNo: "01" },
        { sku: "retatrutide-5mg", name: "Retatrutide", dose: "5 mg", content: "Pen", price: 2700000, pathwayNo: "01" },
        { sku: "retatrutide-10mg", name: "Retatrutide", dose: "10 mg", content: "Pen", price: 3100000, pathwayNo: "01" },
        { sku: "retatrutide-15mg", name: "Retatrutide", dose: "15 mg", content: "Pen", price: 3500000, pathwayNo: "01" },
        { sku: "retatrutide-20mg", name: "Retatrutide", dose: "20 mg", content: "Pen", price: 3900000, pathwayNo: "01" },
        { sku: "retatrutide-30mg", name: "Retatrutide", dose: "30 mg", content: "Pen", price: 5100000, pathwayNo: "01" },
        { sku: "retatrutide-60mg", name: "Retatrutide", dose: "60 mg", content: "Pen", price: 8300000, pathwayNo: "01" },
        { sku: "nad-500mg", name: "NAD+", dose: "500 mg", content: "Pen", price: 2600000, pathwayNo: "08" },
        { sku: "nad-1000mg", name: "NAD+", dose: "1000 mg", content: "Pen", price: 3000000, pathwayNo: "08" },
        { sku: "slu-pp-332-5mg", name: "SLU-PP-332", printName: "SLU-PP-332 (Injectable)", dose: "5 mg", content: "Pen", price: 2700000, pathwayNo: "05" },
        { sku: "5-amino-1mq-5mg", name: "5-Amino-1MQ", dose: "5 mg", content: "Pen", price: 1600000, pathwayNo: "05" },
        { sku: "5-amino-1mq-50mg", name: "5-Amino-1MQ", dose: "50 mg", content: "Pen", price: 3200000, pathwayNo: "05" },
        { sku: "aicar-50mg", name: "AICAR", dose: "50 mg", content: "Pen", price: 3000000, pathwayNo: "05" },
        { sku: "l-carnitine-5000mg", name: "L-Carnitine", printName: "L-Carnitine (Injectable)", dose: "5000 mg", content: "Pen", price: 3000000, pathwayNo: "05" }
      ]
    },
    {
      id: "tissue",
      no: "02",
      name: "Tissue Repair & Regeneration",
      icon: "first-aid",
      blurb: "Cytoprotective and regenerative peptides studied for soft-tissue, gut and recovery research models.",
      items: [
        { sku: "bpc-157-10mg", name: "BPC-157", dose: "10 mg", content: "Pen", price: 2700000, pathwayNo: "03" },
        { sku: "tb-500-10mg", name: "TB-500", dose: "10 mg", content: "Pen", price: 2900000, pathwayNo: "03" },
        { sku: "kpv-10mg", name: "KPV", dose: "10 mg", content: "Pen", price: 2600000, pathwayNo: "03" },
        { sku: "wolverine-20mg", name: "Wolverine Blend", printName: "BPC-157 + TB-500 (Wolverine)", dose: "20 mg", content: "Pen", price: 3900000, pathwayNo: "03" },
        { sku: "klow-80mg", name: "KLOW Blend", printName: "KLOW (BPC-157+TB-500+GHK-Cu+KPV)", dose: "80 mg", content: "Pen", price: 4400000, pathwayNo: "03" },
        { sku: "ara-290-10mg", name: "ARA-290", dose: "10 mg", content: "Pen", price: 1900000, pathwayNo: "03" },
        { sku: "cartalax-20mg", name: "Cartalax", dose: "20 mg", content: "Pen", price: 2500000, pathwayNo: "03" },
        { sku: "peg-mgf-2mg", name: "PEG-MGF", printName: "Peg MGF", dose: "2 mg", content: "Pen", price: 3100000, pathwayNo: "03" },
        { sku: "ll-37-5mg", name: "LL-37", dose: "5 mg", content: "Pen", price: 3000000, pathwayNo: "03" }
      ]
    },
    {
      id: "growth",
      no: "03",
      name: "Growth Factors & Recovery",
      icon: "pulse",
      blurb: "Secretagogues and growth-factor analogues for research into recovery, repair and somatotropic pathways.",
      items: [
        { sku: "cjc-ipamorelin-10mg", name: "CJC No DAC + Ipamorelin", printName: "CJC-1295 (No DAC) + Ipamorelin", dose: "10 mg", content: "Pen", price: 3000000, pathwayNo: "02" },
        { sku: "cjc-ipamorelin-20mg", name: "CJC No DAC + Ipamorelin", printName: "CJC-1295 (No DAC) + Ipamorelin", dose: "20 mg", content: "Pen", price: 4300000, pathwayNo: "02" },
        { sku: "ipamorelin-10mg", name: "Ipamorelin", dose: "10 mg", content: "Pen", price: 2800000, pathwayNo: "02" },
        { sku: "ipa-tesamorelin-18mg", name: "Ipamorelin + Tesamorelin", dose: "18 mg", content: "Pen", price: 5000000, pathwayNo: "02" },
        { sku: "igf-1-lr3-1mg", name: "IGF-1 LR3", dose: "1 mg", content: "Pen", price: 2700000, pathwayNo: "02" },
        { sku: "hgh-36iu", name: "HGH", printName: "HGH 191AA (Somatropin)", dose: "36 IU", content: "Pen", price: 3200000, pathwayNo: "02" },
        { sku: "hgh-40iu", name: "HGH", printName: "HGH 191AA (Somatropin)", dose: "40 IU", content: "Pen", price: 3600000, pathwayNo: "02" },
        { sku: "thymosin-alpha-1-10mg", name: "Thymosin Alpha-1", dose: "10 mg", content: "Pen", price: 3600000, pathwayNo: "06" }
      ]
    },
    {
      id: "neuro",
      no: "04",
      name: "Neuropeptides & Cognitive Research",
      icon: "brain",
      blurb: "Neuroactive and nootropic peptides studied for cognition, neuroprotection and sleep-architecture research.",
      items: [
        { sku: "cerebrolysin-60mg", name: "Cerebrolysin", dose: "60 mg", content: "Pen", price: 3000000, pathwayNo: "04" },
        { sku: "dsip-10mg", name: "DSIP", dose: "10 mg", content: "Pen", price: 2600000, pathwayNo: "08" },
        { sku: "dsip-5mg", name: "DSIP", dose: "5 mg", content: "Pen", price: 2100000, pathwayNo: "08" },
        { sku: "selank-10mg", name: "Selank", dose: "10 mg", content: "Pen", price: 2300000, pathwayNo: "04" },
        { sku: "semax-10mg", name: "Semax", dose: "10 mg", content: "Pen", price: 2300000, pathwayNo: "04" },
        { sku: "selank-semax-20mg", name: "Selank + Semax", dose: "20 mg", content: "Pen", price: 3200000, pathwayNo: "04" },
        { sku: "adamax-10mg", name: "Adamax", dose: "10 mg", content: "Pen", price: 3100000, pathwayNo: "04" },
        { sku: "pinealon-20mg", name: "Pinealon", dose: "20 mg", content: "Pen", price: 3600000, pathwayNo: "04" }
      ]
    },
    {
      id: "reproductive",
      no: "05",
      name: "Reproductive & Hormonal Research",
      icon: "gender-intersex",
      blurb: "Gonadotropins and hormonal-axis modulators for endocrine and reproductive research models.",
      items: [
        { sku: "hcg-10000iu", name: "HCG", dose: "10000 IU", content: "Pen", price: 3000000, pathwayNo: "07" },
        { sku: "hmg-75iu", name: "HMG", dose: "75 IU", content: "Pen", price: 2700000, pathwayNo: "07" },
        { sku: "kisspeptin-10-10mg", name: "Kisspeptin-10", printName: "Kisspeptin", dose: "10 mg", content: "10 mg", price: 3200000, pathwayNo: "07" },
        { sku: "pt-141-10mg", name: "PT-141", dose: "10 mg", content: "Pen", price: 2600000, pathwayNo: "07" },
        { sku: "oxytocin-10mg", name: "Oxytocin Acetate", dose: "10 mg", content: "10 mg", price: 3000000, pathwayNo: "07" }
      ]
    },
    {
      id: "longevity",
      no: "06",
      name: "Longevity, Cellular & Cosmetic Research",
      icon: "sparkle",
      blurb: "Copper peptides, antioxidants and senescence-pathway compounds for longevity and dermal-research applications.",
      items: [
        { sku: "epitalon-50mg", name: "Epitalon", printName: "Epithalon", dose: "50 mg", content: "Pen", price: 3400000, pathwayNo: "08" },
        { sku: "ghk-cu-50mg", name: "GHK-Cu", dose: "50 mg", content: "Pen", price: 2100000, pathwayNo: "03" },
        { sku: "ghk-cu-100mg", name: "GHK-Cu", dose: "100 mg", content: "Pen", price: 2300000, pathwayNo: "03" },
        { sku: "ahk-cu-100mg", name: "AHK-Cu", dose: "100 mg", content: "Pen", price: 1700000, pathwayNo: "08" },
        { sku: "glutathione-1500mg", name: "Glutathione", dose: "1500 mg", content: "Pen", price: 1600000, pathwayNo: "08" },
        { sku: "humanin-10mg", name: "Humanin", dose: "10 mg", content: "Pen", price: 4500000, pathwayNo: "08" },
        { sku: "ss-31-50mg", name: "SS-31", dose: "50 mg", content: "Pen", price: 4500000, pathwayNo: "08" }
      ]
    },
    {
      id: "redlight",
      no: "07",
      name: "Red Light Therapy & Recovery",
      icon: "sun",
      unit: "devices",
      consumer: true,
      blurb: "Photobiomodulation and recovery hardware — clinical-wavelength red and near-infrared light for circulation, skin and post-training recovery. Consumer devices, not research chemicals.",
      items: [
        { sku: "redlight-leg-compression", name: "Red Light Leg Compression System", dose: "660 + 850 nm · Pair", content: "Device", price: 6500000, img: "assets/products/leg-compression.webp" },
        { sku: "redlight-therapy-mat", name: "Red Light Therapy Mat", dose: "Full-body · 660 + 850 nm", content: "Device", price: 5900000, img: "assets/products/therapy-mat.webp" },
        { sku: "redlight-therapy-mask", name: "Red Light Therapy Mask", dose: "Face · LED array", content: "Device", price: 2400000, img: "assets/products/therapy-mask.webp" }
      ]
    },
    {
      id: "apparel",
      no: "08",
      name: "Apparel & Merch",
      icon: "t-shirt",
      unit: "products",
      consumer: true,
      blurb: "AXIOM training apparel and accessories — the same neutral, precise identity, off the lab and into the field.",
      items: [
        { sku: "performance-tee", name: "Performance Tee", dose: "Dry-knit · Unisex", content: "Apparel", price: 450000 },
        { sku: "training-hoodie", name: "Oversized Training Hoodie", dose: "Heavyweight · Unisex", content: "Apparel", price: 950000 },
        { sku: "logo-cap", name: "Logo Cap", dose: "Adjustable", content: "Accessory", price: 350000 },
        { sku: "water-bottle", name: "Steel Water Bottle", dose: "750 ml · Insulated", content: "Accessory", price: 400000 },
        { sku: "gym-duffel", name: "Gym Duffel", dose: "45 L", content: "Accessory", price: 850000 }
      ]
    }
  ]
};

/* Back-compat: existing consumers read window.CATALOG directly. */
window.CATALOG = window.AXIOM_DATA.categories;
