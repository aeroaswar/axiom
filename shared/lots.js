/* AXIOM — lot verification records, keyed by lot code.
 *
 * SAMPLE DATA — these records are structured specimens so the verification
 * surface works end-to-end. Replace each entry with the real lot's figures
 * (and set coaUrl to the lot's CoA PDF) as shipments are received and tested.
 *
 * Lot code scheme: AX-YYMM-<compound abbreviation + spec>
 *   e.g. AX-2508-RT05 = received Aug 2025, Retatrutide 5 mg.
 *
 * `sku` joins the record to its catalogue item in shared/catalog.js.
 * `status`: "verified" | "expired" | "recalled". Contains no dosing or usage data.
 */
window.AXIOM_LOTS = {
  "AX-2406-1157": {
    sku: "bpc-157-10mg", compound: "BPC-157", spec: "10 mg",
    mfgOn: "2024-06-04", testedOn: "2024-06-14",
    purity: 99.2, method: "HPLC / MS", mass: "1419.5 Da",
    appearance: "White lyophilate",
    lab: "Independent third-party laboratory",
    status: "verified", coaUrl: null
  },
  "AX-2508-RT05": {
    sku: "retatrutide-5mg", compound: "Retatrutide", spec: "5 mg",
    mfgOn: "2025-08-02", testedOn: "2025-08-12",
    purity: 99.1, method: "HPLC / MS",
    appearance: "White lyophilate",
    lab: "Independent third-party laboratory",
    status: "verified", coaUrl: null
  },
  "AX-2507-TZ30": {
    sku: "tirzepatide-30mg", compound: "Tirzepatide", spec: "30 mg",
    mfgOn: "2025-07-08", testedOn: "2025-07-18",
    purity: 99.3, method: "HPLC / MS",
    appearance: "White lyophilate",
    lab: "Independent third-party laboratory",
    status: "verified", coaUrl: null
  },
  "AX-2506-GH36": {
    sku: "hgh-36iu", compound: "HGH", spec: "36 IU",
    mfgOn: "2025-06-10", testedOn: "2025-06-20",
    purity: 98.9, method: "HPLC / MS",
    appearance: "White lyophilate",
    lab: "Independent third-party laboratory",
    status: "verified", coaUrl: null
  },
  "AX-2508-NAD5": {
    sku: "nad-500mg", compound: "NAD+", spec: "500 mg",
    mfgOn: "2025-08-05", testedOn: "2025-08-15",
    purity: 99.0, method: "HPLC / MS",
    appearance: "White lyophilate",
    lab: "Independent third-party laboratory",
    status: "verified", coaUrl: null
  },
  "AX-2505-GHK50": {
    sku: "ghk-cu-50mg", compound: "GHK-Cu", spec: "50 mg",
    mfgOn: "2025-05-12", testedOn: "2025-05-22",
    purity: 99.4, method: "HPLC / MS",
    appearance: "Blue-violet lyophilate",
    lab: "Independent third-party laboratory",
    status: "verified", coaUrl: null
  },
  "AX-2507-TB10": {
    sku: "tb-500-10mg", compound: "TB-500", spec: "10 mg",
    mfgOn: "2025-07-01", testedOn: "2025-07-11",
    purity: 99.0, method: "HPLC / MS",
    appearance: "White lyophilate",
    lab: "Independent third-party laboratory",
    status: "verified", coaUrl: null
  },
  "AX-2504-SEM10": {
    sku: "semax-10mg", compound: "Semax", spec: "10 mg",
    mfgOn: "2025-04-14", testedOn: "2025-04-24",
    purity: 98.8, method: "HPLC / MS",
    appearance: "White lyophilate",
    lab: "Independent third-party laboratory",
    status: "verified", coaUrl: null
  },
  "AX-2508-MC40": {
    sku: "mots-c-40mg", compound: "MOTS-c", spec: "40 mg",
    mfgOn: "2025-08-08", testedOn: "2025-08-18",
    purity: 99.2, method: "HPLC / MS",
    appearance: "White lyophilate",
    lab: "Independent third-party laboratory",
    status: "verified", coaUrl: null
  },
  "AX-2503-EP50": {
    sku: "epitalon-50mg", compound: "Epitalon", spec: "50 mg",
    mfgOn: "2025-03-06", testedOn: "2025-03-16",
    purity: 99.1, method: "HPLC / MS",
    appearance: "White lyophilate",
    lab: "Independent third-party laboratory",
    status: "verified", coaUrl: null
  },
  "AX-2506-TA10": {
    sku: "thymosin-alpha-1-10mg", compound: "Thymosin Alpha-1", spec: "10 mg",
    mfgOn: "2025-06-02", testedOn: "2025-06-12",
    purity: 99.5, method: "HPLC / MS",
    appearance: "White lyophilate",
    lab: "Independent third-party laboratory",
    status: "verified", coaUrl: null
  },
  "AX-2405-KPV10": {
    sku: "kpv-10mg", compound: "KPV", spec: "10 mg",
    mfgOn: "2024-05-09", testedOn: "2024-05-19",
    purity: 98.7, method: "HPLC / MS",
    appearance: "White lyophilate",
    lab: "Independent third-party laboratory",
    status: "expired", coaUrl: null
  }
};
