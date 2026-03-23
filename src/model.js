// ============================================================
// MOTEUR DE CALCUL — Source unique de vérité
// Utilisé par App.jsx (React) ET cli.js (Node)
//
// Hypothèses structurelles non modélisées :
// - Pas de liquidation SASU : le boni de liquidation (flat tax) est fiscalement quasi-identique
//   à des rachats progressifs. Coût de liquidation (~2-3k€) non comptabilisé.
// ============================================================

export const DEFAULTS = {
  tjm: 1200,
  jours: 220,
  salaireBrut: 60000,
  divNetsVoulus: 40000,
  rendement: 0.06, // fallback si un seul rendement est fourni (CLI, URL legacy)
  // Rendements nets de frais de gestion (TER, frais assureur, courtage)
  rendementCapi: 0.06,  // contrat capi lux, FID actions diversifié — net de frais assureur (~0,5%)
  rendementScpi: 0.045, // SCPI, rendement total (distribution + revalorisation parts) — net de frais de gestion
  partDistribScpi: 0.89, // ~4% distribution sur 4,5% total → 89% (seule la distribution est imposable à l'IS)
  // Frais de souscription SCPI (~8-12%, médiane 10%) — prélevés sur chaque versement
  // Sources : francescpi.com/scpi/questions-frequentes-scpi-faq/les-frais-SCPI, louveinvest.com/frais-scpi
  fraisEntreeScpi: 0.10,
  rendementPea:  0.07,  // PEA, ETF actions — net de TER (~0,2%) et frais courtier
  rendementPer:  0.05,  // PER, allocation mixte/défensive — net de frais assureur (~0,5%, PER en ligne)
  ageObjectif: 50,
  joursLeverLePied: 50,
  croquerCapital: false,
  ageFin: 80,
  // Versement annuel PEA personnel (200 €/mois) — plafond PEA 150k€ de versements (CMF art. L221-30).
  // Une fois le plafond atteint, l'excédent reste dans le net net (hypothèse assumée : pas de
  // redirection vers une AV ou autre enveloppe perso, le modèle ne gère que le PEA côté perso).
  peaPerso: 2400,
  per: 5000,
  tauxConversionPer: 0.035,  // taux de conversion rente viagère assureur à 64 ans (typiquement 3-4%)
  tme: 0.0345,  // Taux Moyen d'Emprunt d'État (figé à la souscription du contrat capi, CGI 238 septies E)
  salaireBrutCDI: 45000,
  ratioTreso: 0.15,
  ratioCapi: 0.65,
  frais: {
    comptable: 3000, rcPro: 800, cfe: 500, banque: 300, bureau: 2000,
    mutuelle: 1200, prevoyance: 3000, materiel: 2000, chequesVacances: 547,
    divers: 1500
  },
  // EURL : pas de prévoyance décès cadre obligatoire, mutuelle facultative
  fraisEurl: {
    comptable: 2500, rcPro: 800, cfe: 500, banque: 300, bureau: 2000,
    mutuelle: 600, prevoyance: 0, materiel: 2000, chequesVacances: 547,
    divers: 1500
  },
  // Constantes réglementaires 2026
  // Fiscalité nette par enveloppe (1 - prélèvements) — utilisée pour pondérer les retraits
  // fiscNetteCapi : calculée dynamiquement (IS sur gains + flat tax sur distribution)
  // fiscNetteScpi : calculée dynamiquement (IS + flat tax — SCPI détenues par la SASU)
  // fiscNettePer  : calculée dynamiquement (TMI retraite × 90% + PS pension 9,1%)
  psPea: 0.186, // PEA > 5 ans : PS seules 18,6% sur les gains (CSG 9,2% + CRDS 0,5% + PS 7,5% + contrib. add. 1,4%)
  // PS sur pensions de retraite (CSS art. L136-8-III, ord. 96-50 art. 14, CSS art. L14-10-4)
  psPension: 0.091,      // CSG 8,3% + CRDS 0,5% + CASA 0,3% = 9,1% (taux plein, non exonéré)
  plafondAbattementPension: 4439, // plafond abattement 10% pensions par foyer (CGI art. 158-5-a, revenus 2025)
  plafondAbattementSalaire: 14171, // plafond abattement 10% salaires (CGI art. 83-3°, 2025)
  margeSecurite: 0.005, // marge 0,5 pt sur le taux de retrait (prudence vs rendements futurs incertains)
  seuilIS: 42500,
  tauxISReduit: 0.15,
  tauxISNormal: 0.25,
  // ⚠ Hypothèse : PFU (flat tax) sur les dividendes. L'option barème progressif avec abattement
  // 40% peut être plus avantageuse si TMI ≤ 11% (rare avec les paramètres par défaut, TMI 30%).
  tauxFlatTax: 0.314,
  abattementIR: 0.10,
  // ⚠ Hypothèse : conjoint salarié du même âge, revenu constant à vie (même montant en
  // activité et en retraite). En phase retraite, ce revenu est traité comme pension (soumis
  // au plafond d'abattement pension partagé avec le déclarant, pas au plafond salaire).
  revenuConjoint: 16800,
  partsFiscales: 2.5,
  ageActuel: 36,
  inflation: 0.02,
  anneesAre: 0, // années de maintien ARE avant rémunération (0 = pas de phase ARE)
  forme: 'sasu', // 'sasu' ou 'eurl'
  capitalSocial: 1000, // capital social EURL (seuil 10% pour dividendes TNS)
};

// Cotisations patronales détaillées — président SASU (assimilé salarié cadre)
// Le président ne bénéficie PAS du taux réduit maladie (7%) ni AF (3,45%) ni Fillon
// Sources : CSS L241-1, L311-3 ; Legisocial ; sas-sasu.info
export const PASS = 48060; // Plafond Annuel Sécu 2026

// Taux sur la totalité du brut
const TAUX_TOTALITE = {
  maladie: 0.1300,        // 13% (pas 7% — mandataire social)
  csa: 0.0030,            // contribution solidarité autonomie
  vieillesseDepl: 0.0202, // vieillesse déplafonnée
  af: 0.0525,             // allocations familiales (pas 3,45% — mandataire)
  atmp: 0.0044,           // AT/MP (taux bureau/IT, variable selon code risque)
  cet: 0.0021,            // contribution d'équilibre technique
  apec: 0.00036,          // APEC cadre
  formation: 0.0055,      // formation professionnelle (<11 salariés)
  apprentissage: 0.0068,  // taxe d'apprentissage
};
// Total sur totalité : 22,55%

// Taux sur tranche 1 uniquement (≤ PASS)
const TAUX_T1 = {
  vieillessePl: 0.0855,   // vieillesse plafonnée
  fnal: 0.0010,           // FNAL (<50 salariés)
  prevoyanceDeces: 0.0150, // prévoyance décès cadre (minimum conventionnel)
  agircArrco: 0.0472,     // retraite complémentaire T1
  ceg: 0.0129,            // contribution d'équilibre général T1
};
// Total T1 : 16,16%

// Taux sur tranche 2 uniquement (> PASS, ≤ 8×PASS)
const TAUX_T2 = {
  agircArrco: 0.1295,     // retraite complémentaire T2
  ceg: 0.0162,            // contribution d'équilibre général T2
};
// Total T2 : 14,57%

const SUM_TOTALITE = Object.values(TAUX_TOTALITE).reduce((a, b) => a + b, 0);
const SUM_T1 = Object.values(TAUX_T1).reduce((a, b) => a + b, 0);
const SUM_T2 = Object.values(TAUX_T2).reduce((a, b) => a + b, 0);

// Calcul exact des charges patronales par tranche
export function computeChargesPatronales(salaireBrut) {
  const t1 = Math.min(salaireBrut, PASS);
  const t2 = Math.max(0, salaireBrut - PASS);
  return salaireBrut * SUM_TOTALITE + t1 * SUM_T1 + t2 * SUM_T2;
}

// Cotisations salariales détaillées — identiques SASU président et CDI cadre
// (la différence SASU/CDI est uniquement sur les cotisations patronales)
const TAUX_SAL_TOTALITE = {
  vieillesseDepl: 0.0040,   // vieillesse déplafonnée
  cet: 0.0014,              // contribution d'équilibre technique
  apec: 0.00024,            // APEC cadre
};

const TAUX_SAL_T1 = {
  vieillessePl: 0.0690,     // vieillesse plafonnée
  agircArrco: 0.0315,       // retraite complémentaire T1
  ceg: 0.0086,              // contribution d'équilibre général T1
};

const TAUX_SAL_T2 = {
  agircArrco: 0.0864,       // retraite complémentaire T2
  ceg: 0.0108,              // contribution d'équilibre général T2
};

// CSG/CRDS sur 98,25% du brut
const TAUX_CSG_CRDS = 0.0970; // 9,20% CSG + 0,50% CRDS
const ASSIETTE_CSG = 0.9825;
const TAUX_CSG_NON_DEDUCTIBLE = 0.024; // part non déductible de la CSG
const TAUX_CRDS = 0.005;              // CRDS non déductible

const SUM_SAL_TOTALITE = Object.values(TAUX_SAL_TOTALITE).reduce((a, b) => a + b, 0);
const SUM_SAL_T1 = Object.values(TAUX_SAL_T1).reduce((a, b) => a + b, 0);
const SUM_SAL_T2 = Object.values(TAUX_SAL_T2).reduce((a, b) => a + b, 0);

// Calcul exact des cotisations salariales par tranche
export function computeCotisationsSalariales(salaireBrut) {
  const t1 = Math.min(salaireBrut, PASS);
  const t2 = Math.max(0, salaireBrut - PASS);
  return salaireBrut * SUM_SAL_TOTALITE + t1 * SUM_SAL_T1 + t2 * SUM_SAL_T2
       + salaireBrut * ASSIETTE_CSG * TAUX_CSG_CRDS;
}

// ============================================================
// Cotisations TNS — Gérant majoritaire EURL à l'IS (réforme 2026)
// Assiette unique = rémunération × 0.74 (abattement 26%)
// Sources : URSSAF taux-cotisations-ac-plnr.html, décret 2024-688
// ============================================================
const TNS_ABATTEMENT = 0.26;

// Maladie-maternité : taux moyen progressif appliqué à TOUTE l'assiette
// (pas un taux marginal — le taux au niveau de revenu s'applique à l'ensemble)
// Dernier palier (> 300% PASS) : taux marginal 6,5% sur l'excédent uniquement
function computeMaladieTNS(assiette) {
  const tranches = [
    { min: 0,    max: 0.20, tauxMin: 0,     tauxMax: 0 },
    { min: 0.20, max: 0.40, tauxMin: 0,     tauxMax: 0.015 },
    { min: 0.40, max: 0.60, tauxMin: 0.015, tauxMax: 0.04 },
    { min: 0.60, max: 1.10, tauxMin: 0.04,  tauxMax: 0.065 },
    { min: 1.10, max: 2.00, tauxMin: 0.065, tauxMax: 0.077 },
    { min: 2.00, max: 3.00, tauxMin: 0.077, tauxMax: 0.085 },
  ];
  for (const { min, max, tauxMin, tauxMax } of tranches) {
    const seuilMin = min * PASS, seuilMax = max * PASS;
    if (assiette <= seuilMax) {
      if (assiette <= seuilMin) return 0;
      const ratio = (assiette - seuilMin) / (seuilMax - seuilMin);
      return assiette * (tauxMin + (tauxMax - tauxMin) * ratio);
    }
  }
  // > 300% PASS : taux moyen à 300% PASS (8,5%) + marginal 6,5% sur l'excédent
  const seuil300 = 3 * PASS;
  return seuil300 * 0.085 + (assiette - seuil300) * 0.065;
}

// Allocations familiales : taux moyen progressif
function computeAFTNS(assiette) {
  const seuil110 = 1.10 * PASS, seuil140 = 1.40 * PASS;
  if (assiette <= seuil110) return 0;
  if (assiette >= seuil140) return assiette * 0.031;
  const ratio = (assiette - seuil110) / (seuil140 - seuil110);
  return assiette * 0.031 * ratio;
}

export function computeCotisationsTNS(remuneration) {
  if (remuneration <= 0) return { total: 0, assiette: 0, maladie: 0, maladieIJ: 0, retraiteBase: 0, retraiteCompl: 0, invaliditeDeces: 0, af: 0, csgCrds: 0, cfp: 0, csgDeductible: 0, csgNonDeductible: 0, crds: 0, net: 0, tauxEffectif: 0 };
  const assiette = remuneration * (1 - TNS_ABATTEMENT);
  const t1 = Math.min(assiette, PASS);
  const t2above = Math.max(0, assiette - PASS);
  const t2_4pass = Math.min(t2above, 3 * PASS); // entre 1 et 4 PASS

  const maladie = computeMaladieTNS(assiette);
  const maladieIJ = Math.min(assiette, 5 * PASS) * 0.005;
  const retraiteBase = t1 * 0.1787 + t2above * 0.0072;
  const retraiteCompl = t1 * 0.081 + t2_4pass * 0.091;
  const invaliditeDeces = t1 * 0.013;
  const af = computeAFTNS(assiette);
  const csgCrds = assiette * 0.097;
  const cfp = PASS * 0.0025; // forfaitaire sur 1 PASS

  const total = maladie + maladieIJ + retraiteBase + retraiteCompl + invaliditeDeces + af + csgCrds + cfp;

  // Pour l'IR : CSG déductible 6,8%, non déductible 2,4%, CRDS 0,5%
  const csgDeductible = assiette * 0.068;
  const csgNonDeductible = assiette * 0.024;
  const crds = assiette * 0.005;

  return {
    total, assiette, maladie, maladieIJ, retraiteBase, retraiteCompl,
    invaliditeDeces, af, csgCrds, cfp,
    csgDeductible, csgNonDeductible, crds,
    net: remuneration - total,
    tauxEffectif: total / remuneration,
  };
}

// Net imposable TNS (pour l'IR) : rémunération − cotisations déductibles
// Toutes les cotisations sont déductibles SAUF CSG non déductible (2,4%) et CRDS (0,5%)
export function computeNetImposableTNS(remuneration, tns) {
  const cotisationsDeductibles = tns.total - tns.csgNonDeductible - tns.crds;
  return remuneration - cotisationsDeductibles;
}

// Barème IR 2025 — retourne { irParPart, tmi } pour un quotient familial donné
const TRANCHES_IR = [
  { seuil: 0, taux: 0 },
  { seuil: 11600, taux: 0.11 },
  { seuil: 29579, taux: 0.30 },
  { seuil: 84577, taux: 0.41 },
  { seuil: 181917, taux: 0.45 },
];
const PLAFOND_DEMI_PART = 1759; // avantage max par demi-part supplémentaire (CGI art. 197-I-2, 2025)
function computeIRBrut(quotientFamilial) {
  let irParPart = 0, tmi = 0;
  for (let i = 1; i < TRANCHES_IR.length; i++) {
    const plafond = i < TRANCHES_IR.length - 1 ? TRANCHES_IR[i + 1].seuil : Infinity;
    const base = Math.max(0, Math.min(quotientFamilial, plafond) - TRANCHES_IR[i].seuil);
    irParPart += base * TRANCHES_IR[i].taux;
    if (base > 0) tmi = TRANCHES_IR[i].taux;
  }
  return { irParPart, tmi };
}
// Plafonnement du quotient familial (CGI art. 197-I-2) :
// L'avantage procuré par chaque demi-part au-delà de 2 parts (couple) est plafonné.
// ⚠ Hypothèse : foyer = couple marié/pacsé (base 2 parts). Un parent isolé (1 part + 0,5)
// a une demi-part majorée avec un plafond différent (~3 959 € au lieu de 1 759 €).
function computeIR(quotientFamilial, parts = 2) {
  const result = computeIRBrut(quotientFamilial);
  if (parts <= 2) return result;
  // IR sans les demi-parts supplémentaires (base couple = 2 parts)
  const qf2 = quotientFamilial * parts / 2;
  const ir2 = computeIRBrut(qf2).irParPart * 2;
  // IR avec les demi-parts
  const irAvecParts = result.irParPart * parts;
  // Avantage = réduction d'IR grâce aux demi-parts supplémentaires
  const avantage = ir2 - irAvecParts;
  const demiPartsSupp = (parts - 2) * 2; // nombre de demi-parts au-delà de 2
  const plafond = demiPartsSupp * PLAFOND_DEMI_PART;
  if (avantage > plafond) {
    // Plafonner : IR = IR sans demi-parts - plafond
    const irPlafonne = ir2 - plafond;
    // TMI effective = celle du QF à 2 parts (c'est le barème qui s'applique réellement)
    return { irParPart: irPlafonne / parts, tmi: computeIRBrut(qf2).tmi };
  }
  return result;
}

// Net imposable = net payé + CSG non déductible + CRDS (réintégrées dans l'assiette IR)
export function computeNetImposable(salaireBrut) {
  const netPaye = salaireBrut - computeCotisationsSalariales(salaireBrut);
  const csgCrdsNonDeductible = salaireBrut * ASSIETTE_CSG * (TAUX_CSG_NON_DEDUCTIBLE + TAUX_CRDS);
  return netPaye + csgCrdsNonDeductible;
}

export const RANGES = {
  tjm:    { min: 400, max: 2500, step: 50 },
  jours:  { min: 150, max: 230, step: 5 },
  rendement:     { min: 0.02, max: 0.10, step: 0.005 },
  rendementCapi: { min: 0.02, max: 0.10, step: 0.005 },
  rendementScpi: { min: 0.02, max: 0.08, step: 0.005 },
  rendementPea:  { min: 0.02, max: 0.12, step: 0.005 },
  rendementPer:  { min: 0.02, max: 0.08, step: 0.005 },
  ageObjectif: { min: 42, max: 60, step: 1 },
  joursLeverLePied: { min: 0, max: 150, step: 10 },
  ageFin: { min: 70, max: 95, step: 1 },
  inflation: { min: 0, max: 0.05, step: 0.005 },
  anneesAre: { min: 0, max: 3, step: 1 },
};

// Calcule les contraintes dynamiques (max salary, max PER, max dividendes)
// à partir des inputs step1 + step2
export function computeConstraints({
  tjm, jours, frais, salaireBrut, per,
  seuilIS = DEFAULTS.seuilIS, tauxISReduit = DEFAULTS.tauxISReduit,
  tauxISNormal = DEFAULTS.tauxISNormal, tauxFlatTax = DEFAULTS.tauxFlatTax,
  forme = DEFAULTS.forme, capitalSocial = DEFAULTS.capitalSocial,
}) {
  const isEurl = forme === 'eurl';
  const caHT = tjm * jours;
  const totalFraisHorsPer = Object.values(frais).reduce((a, b) => a + b, 0);
  const disponible = caHT - totalFraisHorsPer;

  let maxSalaireBrut, salaireBrutEffectif, superbrut;
  if (isEurl) {
    // EURL : pas de patronales en sus, la rémunération EST le coût
    maxSalaireBrut = Math.floor(Math.max(0, disponible) / 5000) * 5000;
    salaireBrutEffectif = Math.min(salaireBrut, maxSalaireBrut);
    superbrut = salaireBrutEffectif;
  } else {
    // SASU : brut + charges patronales
    let maxBrut = disponible;
    for (let i = 0; i < 10; i++) {
      maxBrut = disponible - computeChargesPatronales(maxBrut);
    }
    maxSalaireBrut = Math.floor(Math.max(0, maxBrut) / 5000) * 5000;
    salaireBrutEffectif = Math.min(salaireBrut, maxSalaireBrut);
    superbrut = salaireBrutEffectif + computeChargesPatronales(salaireBrutEffectif);
  }

  const maxPer = Math.max(0, Math.floor((caHT - superbrut - totalFraisHorsPer) / 500) * 500);
  const perEffectif = Math.min(per, maxPer);
  const totalFrais = totalFraisHorsPer + perEffectif;

  const resultat = Math.max(0, caHT - superbrut - totalFrais);
  const is = Math.min(resultat, seuilIS) * tauxISReduit + Math.max(0, resultat - seuilIS) * tauxISNormal;
  // EURL : dividendes > 10% capital → TNS (~45%), pas flat tax. Approximation prudente.
  const benefDistrib = resultat - is;
  let maxDivNets;
  if (isEurl) {
    const seuilFlatTax = capitalSocial * 0.10;
    const divFlatTaxMax = Math.min(benefDistrib, seuilFlatTax);
    const divTNSMax = Math.max(0, benefDistrib - seuilFlatTax);
    // Approx : TNS ~45% sur l'excédent
    maxDivNets = Math.floor((divFlatTaxMax * (1 - tauxFlatTax) + divTNSMax * 0.55) / 1000) * 1000;
  } else {
    maxDivNets = Math.floor(benefDistrib * (1 - tauxFlatTax) / 1000) * 1000;
  }

  return {
    caHT, totalFraisHorsPer, maxSalaireBrut, salaireBrutEffectif,
    maxPer, perEffectif, maxDivNets,
  };
}

// Projection du capital à l'objectif — utilisé par le calcul principal ET le solveur
// Les contributions croissent avec l'inflation (le CA/résultat croît avec le TJM)
// Le forfait IS annuel (CGI 238 septies E : 105% TME × versements nets) est déduit du contrat capi
export function computeCapitalProjection({ contratCapi, scpi, peaPerso, per, rendementCapi, rendementScpi, rendementPea, rendementPer, annees, inflation = 0, tme = 0.0345, tauxISEffectif = 0.25, partDistribScpi = 0.89, fraisEntreeScpi = 0.10, anneesAre = 0, contratCapiAre = 0, scpiAre = 0, perAre = 0 }) {
  let tc = 0, tcBase = 0, ts = 0, tsBase = 0, tp = 0, tpBase = 0, tpe = 0, tpeBase = 0;
  const forfaitTME = 1.05 * tme;
  const rendementScpiDistrib = rendementScpi * partDistribScpi;
  // Distributions réinvesties en SCPI → frais de souscription sur la part distribution
  // Rendement effectif = revalo + distrib × (1 − frais) = rendementScpi × (1 − partDistrib × frais)
  const rendementScpiEffectif = rendementScpi * (1 - partDistribScpi * fraisEntreeScpi);
  for (let y = 1; y <= annees; y++) {
    const isAre = y <= anneesAre;
    const ccY = isAre ? contratCapiAre : contratCapi;
    const scY = isAre ? scpiAre : scpi; // net (après frais d'entrée)
    const peY = isAre ? perAre : per;
    const infY = Math.pow(1 + inflation, y);
    tc = tc * (1 + rendementCapi) + ccY * infY;
    tcBase += ccY * infY;
    // Forfait IS annuel sur le contrat capi
    if (tcBase > 0) tc = Math.max(0, tc - tcBase * forfaitTME * tauxISEffectif);
    const tsAvant = ts;
    ts = ts * (1 + rendementScpiEffectif) + scY * infY;
    tsBase += scY / (1 - fraisEntreeScpi) * infY; // base comptable = coût d'acquisition incluant frais
    // Les distributions réinvesties augmentent la base (coût d'acquisition des nouvelles parts)
    // Distribution brute − IS = net ; réinvesti avec frais → base = montant net après frais
    const distribBrut = tsAvant * rendementScpiDistrib;
    const distribNetIS = distribBrut * (1 - tauxISEffectif);
    tsBase += distribNetIS * (1 - fraisEntreeScpi);
    // IS annuel sur les distributions SCPI (loyers)
    if (ts > 0) ts = Math.max(0, ts - distribBrut * tauxISEffectif);
    const peaV = Math.min(peaPerso * infY, Math.max(0, 150000 - tpBase));
    tp = tp * (1 + rendementPea) + peaV;
    tpBase += peaV;
    tpe = tpe * (1 + rendementPer) + peY * infY;
    tpeBase += peY * infY;
  }
  return { total: tc + ts + tp + tpe, capiValue: tc, capiBase: tcBase, scpiValue: ts, scpiBase: tsBase, peaValue: tp, peaBase: tpBase, perValue: tpe, perBase: tpeBase };
}

// Estimation retraite réaliste (base régime général + complémentaire AGIRC-ARRCO)
// Hypothèses : début carrière à 22 ans, taux plein à 67 ans
// En EURL : les dividendes > 10% capital sont soumis aux cotisations TNS (dont retraite SSI),
// générant des points supplémentaires en phase active ET en phase "lever le pied" (jusqu'à 67 ans).
// Sources :
//   - Pension base : SAM × 50% × prorata — service-public.fr/particuliers/vosdroits/F21552
//   - SAM (25 meilleures années plafonnées PASS) — legislation.cnav.fr
//   - Points AGIRC-ARRCO : taux calcul T1=6,20%, T2=17,00% — agirc-arrco.fr
//   - Prix achat point 2024 : 19,6321 € — Valeur service : 1,4159 € — agirc-arrco.fr
//     NB : valeurs figées — en réalité le prix d'achat croît plus vite que la valeur de service,
//     érodant le rendement de la complémentaire. Le modèle est légèrement optimiste.
//   - Trimestres requis génération ~1990 : 172 (43 ans) — service-public.fr/particuliers/vosdroits/F35063
export function computeRetraite({ salaireBrutCDI, salaireBrut, ageActuel, ageObjectif, forme = 'sasu',
  // EURL : assiette dividendes soumise aux cotisations TNS (div bruts - seuil 10% capital)
  divBrutsTNSAnnuel = 0,
  // EURL : distribution annuelle en phase "lever le pied" (drawdown brut avant TNS)
  drawdownBrutAnnuel = 0,
}) {
  const AGE_DEBUT = 22;
  const AGE_RETRAITE = 67;
  const TRIMESTRES_REQUIS = 172; // génération ~1990
  const PASS_RET = PASS; // plafond annuel sécu

  const anneesCDI = Math.max(0, ageActuel - AGE_DEBUT);
  const anneesFreelance = Math.max(0, Math.min(ageObjectif, AGE_RETRAITE) - ageActuel);
  // EURL : les distributions en phase "lever le pied" sont soumises TNS → valident des trimestres
  const anneesLeverLePiedEurl = (forme === 'eurl' && drawdownBrutAnnuel > 0)
    ? Math.max(0, AGE_RETRAITE - Math.max(ageObjectif, ageActuel)) : 0;
  const totalAnnees = anneesCDI + anneesFreelance + anneesLeverLePiedEurl;
  const trimestres = Math.min(totalAnnees * 4, TRIMESTRES_REQUIS);

  // SAM : 25 meilleures années, salaires plafonnés au PASS
  // Simplification assumée : pas de revalorisation CNAV des salaires passés, PASS constant.
  // En réalité les salaires anciens sont revalorisés (≈ inflation) puis plafonnés au PASS de l'année.
  // Effet net : surestimation du SAM de quelques %, dans le bruit d'un simulateur.
  // Courbe salariale CDI : progression ~2,5%/an nominal (inflation + ancienneté/mérite)
  // salaireBrutCDI = salaire actuel (point d'arrivée), on reconstitue la trajectoire
  const PROGRESSION_SAL = 0.025; // 2,5%/an nominal — INSEE cadres, moyenne long terme
  // EURL : les dividendes > 10% capital sont du revenu d'activité TNS (CSS art. L131-6)
  // → ils cotisent à la retraite de base SSI et entrent dans le SAM
  const salFL = Math.min(salaireBrut + (forme === 'eurl' ? divBrutsTNSAnnuel : 0), PASS_RET);

  // Reconstituer les salaires CDI année par année (du plus ancien au plus récent)
  const salairesCDI = [];
  for (let i = anneesCDI - 1; i >= 0; i--) {
    // i années avant aujourd'hui → salaire = salaireBrutCDI / (1 + progression)^i
    const salBrut = salaireBrutCDI / Math.pow(1 + PROGRESSION_SAL, i);
    salairesCDI.push(Math.min(salBrut, PASS_RET)); // plafonné au PASS
  }

  let sam;
  if (totalAnnees <= 0) {
    sam = 0;
  } else {
    // Collecter toutes les années (CDI progressif + freelance constant + lever le pied EURL)
    const years = [...salairesCDI];
    for (let i = 0; i < anneesFreelance; i++) years.push(salFL);
    // EURL lever le pied : assiette = drawdown brut (plafonné PASS pour la retraite de base)
    const salLeverLePied = Math.min(drawdownBrutAnnuel, PASS_RET);
    for (let i = 0; i < anneesLeverLePiedEurl; i++) years.push(salLeverLePied);
    // Prendre les 25 meilleures (ou toutes si moins de 25 ans)
    years.sort((a, b) => b - a);
    const n = Math.min(25, years.length);
    sam = years.slice(0, n).reduce((a, b) => a + b, 0) / n;
  }

  // Pension de base : SAM × 50% × prorata trimestres
  const prorata = Math.min(1, trimestres / TRIMESTRES_REQUIS);
  const retraiteBaseMois = Math.round(sam * 0.50 * prorata / 12);

  // Complémentaire AGIRC-ARRCO
  // Taux de calcul des points (taux contractuel, hors appel)
  const TAUX_T1 = 0.0620;  // tranche 1 (≤ PASS)
  const TAUX_T2 = 0.1700;  // tranche 2 (> PASS, ≤ 8×PASS)
  const PRIX_POINT = 19.6321;  // prix d'achat 2024
  const VALEUR_POINT = 1.4159; // valeur de service 2024

  let totalPoints = 0;
  // Points CDI : année par année avec la courbe salariale progressive
  for (let i = 0; i < anneesCDI; i++) {
    const salBrut = salaireBrutCDI / Math.pow(1 + PROGRESSION_SAL, anneesCDI - 1 - i);
    const t1 = Math.min(salBrut, PASS_RET);
    const t2 = Math.max(0, Math.min(salBrut, 8 * PASS_RET) - PASS_RET);
    totalPoints += (t1 * TAUX_T1 + t2 * TAUX_T2) / PRIX_POINT;
  }

  // Points freelance — AGIRC-ARRCO (SASU) ou SSI (EURL)
  if (forme === 'eurl') {
    // SSI : taux de calcul des points = cotisation / prix d'achat
    // Cotisation retraite complémentaire SSI : 8,1% ≤ PASS + 9,1% entre 1-4 PASS
    // L'assiette TNS inclut rémunération + dividendes > 10% capital (CSS art. L131-6)
    // Prix d'achat point SSI ≈ 19,04 € (2024), valeur de service ≈ 1,280 €
    const PRIX_POINT_SSI = 19.04;
    const VALEUR_POINT_SSI = 1.280;
    const computePointsSSI = (assietteBrute) => {
      const assiette = assietteBrute * (1 - TNS_ABATTEMENT);
      const t1 = Math.min(assiette, PASS_RET);
      const t2 = Math.min(Math.max(0, assiette - PASS_RET), 3 * PASS_RET);
      return (t1 * 0.081 + t2 * 0.091) / PRIX_POINT_SSI;
    };
    // Phase active (ageActuel → ageObjectif) : rémunération + dividendes TNS
    const assietteActive = salaireBrut + divBrutsTNSAnnuel;
    totalPoints += anneesFreelance * computePointsSSI(assietteActive);
    // Phase "lever le pied" (ageObjectif → 67) : distributions du capital (drawdown) soumises TNS
    const anneesLeverLePied = Math.max(0, AGE_RETRAITE - Math.max(ageObjectif, ageActuel));
    if (drawdownBrutAnnuel > 0 && anneesLeverLePied > 0) {
      totalPoints += anneesLeverLePied * computePointsSSI(drawdownBrutAnnuel);
    }
    const retraiteCompMois = Math.round(totalPoints * VALEUR_POINT_SSI / 12);
    return { retraiteBaseMois, retraiteCompMois, retraiteTotaleMois: retraiteBaseMois + retraiteCompMois };
  }

  // SASU : AGIRC-ARRCO
  const t1f = Math.min(salaireBrut, PASS_RET);
  const t2f = Math.max(0, Math.min(salaireBrut, 8 * PASS_RET) - PASS_RET);
  totalPoints += anneesFreelance * (t1f * TAUX_T1 + t2f * TAUX_T2) / PRIX_POINT;

  const retraiteCompMois = Math.round(totalPoints * VALEUR_POINT / 12);

  return {
    retraiteBaseMois,
    retraiteCompMois,
    retraiteTotaleMois: retraiteBaseMois + retraiteCompMois,
  };
}

// Calcul ARE (allocation chômage) basé sur le dernier salaire brut CDI
// Sources : Code du travail art. R5422-1 et s. ; unedic.org
// Formule : max(40,4% SJR + 13,11 €, 57% SJR), plafonné à 75% SJR
// CSG/CRDS ~6,7% sur l'ARE brute
export function computeARE(salaireBrutCDI) {
  if (salaireBrutCDI <= 0) return { areJour: 0, areMensuelBrut: 0, areMensuelNet: 0 };
  const sjr = salaireBrutCDI / 365;
  const partieFix = 13.11; // partie fixe journalière (2025, revalorisée annuellement)
  const areJour = Math.min(
    Math.max(0.404 * sjr + partieFix, 0.57 * sjr),
    0.75 * sjr
  );
  const areMensuelBrut = areJour * 30;
  const areMensuelNet = areMensuelBrut * 0.933; // ~6,7% CSG/CRDS
  return {
    areJour: Math.round(areJour * 100) / 100,
    areMensuelBrut: Math.round(areMensuelBrut),
    areMensuelNet: Math.round(areMensuelNet),
  };
}

// Moteur principal — IDENTIQUE à ce qui tourne dans l'UI
export function computeAll(params) {
  const {
    tjm, jours, salaireBrut, divNetsVoulus,
    seuilIS, tauxISReduit, tauxISNormal,
    tauxFlatTax, abattementIR, revenuConjoint, partsFiscales,
    psPea = DEFAULTS.psPea,
    psPension = DEFAULTS.psPension,
    plafondAbattementPension = DEFAULTS.plafondAbattementPension,
    plafondAbattementSalaire = DEFAULTS.plafondAbattementSalaire,
    partDistribScpi = DEFAULTS.partDistribScpi,
    fraisEntreeScpi = DEFAULTS.fraisEntreeScpi,
    margeSecurite = DEFAULTS.margeSecurite,
    frais, rendement: rendementGlobal, ageActuel, ageObjectif,
    peaPerso = DEFAULTS.peaPerso,
    croquerCapital = false, ageFin = 80, joursLeverLePied = 50, tauxConversionPer = 0.035, tme = 0.0345,
    ratioTreso = 0.15, ratioCapi = 0.65,
    salaireBrutCDI = 45000,
    inflation = 0.02,
    anneesAre = 0,
    forme = DEFAULTS.forme,
    capitalSocial = DEFAULTS.capitalSocial,
    rendementCapi: rendementCapi_ = rendementGlobal,
    rendementScpi: rendementScpi_ = rendementGlobal,
    rendementPea:  rendementPea_  = rendementGlobal,
    rendementPer:  rendementPer_  = rendementGlobal,
  } = params;
  // Rendements par enveloppe (fallback sur rendementGlobal pour backward compat)
  const rendementCapi = rendementCapi_;
  const rendementScpi = rendementScpi_;
  const rendementPea  = rendementPea_;
  const rendementPer  = rendementPer_;
  // SCPI : seule la distribution (loyers) est imposable à l'IS chaque année.
  // La revalorisation des parts est une plus-value latente, imposée uniquement à la cession.
  const rendementScpiDistrib = rendementScpi * partDistribScpi;
  // Distributions réinvesties en SCPI → frais de souscription (~10%) sur la part distribution
  const rendementScpiEffectif = rendementScpi * (1 - partDistribScpi * fraisEntreeScpi);

  // --- CA ---
  const caHT = tjm * jours;

  // --- Frais pro ---
  const totalFrais = Object.values(frais).reduce((a, b) => a + b, 0);

  // --- Charges sociales ---
  const isEurl = forme === 'eurl';
  let chargesPatronales, superbrut, cotisationsSalariales, salaireNet, cotisationsTNSResult;
  if (isEurl) {
    // EURL : cotisations TNS, pas de patronales/salariales séparées
    cotisationsTNSResult = computeCotisationsTNS(salaireBrut);
    chargesPatronales = 0;
    superbrut = salaireBrut; // la rémunération est le coût direct pour la société
    cotisationsSalariales = cotisationsTNSResult.total;
    salaireNet = cotisationsTNSResult.net;
  } else {
    // SASU : charges patronales + salariales classiques
    chargesPatronales = computeChargesPatronales(salaireBrut);
    superbrut = salaireBrut + chargesPatronales;
    cotisationsSalariales = computeCotisationsSalariales(salaireBrut);
    salaireNet = salaireBrut - cotisationsSalariales;
    cotisationsTNSResult = null;
  }

  // --- Résultat ---
  const totalCharges = superbrut + totalFrais;
  const resultatAvantIS = Math.max(0, caHT - totalCharges);

  // --- IS ---
  const baseISReduit = Math.min(resultatAvantIS, seuilIS);
  const baseISNormal = Math.max(0, resultatAvantIS - seuilIS);
  const isReduit = baseISReduit * tauxISReduit;
  const isNormal = baseISNormal * tauxISNormal;
  const isTotal = isReduit + isNormal;
  const tauxEffectifIS = resultatAvantIS > 0 ? isTotal / resultatAvantIS : 0;
  const benefDistribuable = resultatAvantIS - isTotal;

  // --- Dividendes ---
  const divBrutsMax = benefDistribuable;
  let divNets, divBrutsSortis, flatTax, ratioDistrib, divCotisationsTNS = 0, divNetsMax;
  // EURL : taux effectif de sortie TNS (remplace tauxFlatTax pour la distribution)
  // = cotisations TNS marginales / dividendes bruts soumis TNS
  let tauxSortieTNS = 0;
  if (isEurl) {
    // EURL : dividendes > 10% capital social → cotisations TNS (approche marginale)
    const seuilFlatTaxDiv = capitalSocial * 0.10;
    // Solver : trouver divBruts tel que divNets(divBruts) = divNetsVoulus
    const computeDivNetsEurl = (divBruts) => {
      const partFlatTax = Math.min(divBruts, seuilFlatTaxDiv);
      const partTNS = Math.max(0, divBruts - seuilFlatTaxDiv);
      const netFlatTax = partFlatTax * (1 - tauxFlatTax);
      // Cotisations TNS marginales sur les dividendes excédentaires
      const tnsAvec = computeCotisationsTNS(salaireBrut + partTNS);
      const tnsSans = computeCotisationsTNS(salaireBrut);
      const cotTNSDiv = tnsAvec.total - tnsSans.total;
      const netTNS = partTNS - cotTNSDiv;
      return { net: netFlatTax + netTNS, cotTNSDiv };
    };
    // Bisection pour trouver divBruts → divNetsVoulus
    const maxDivNetsEurl = computeDivNetsEurl(divBrutsMax).net;
    divNetsMax = maxDivNetsEurl;
    const divNetsTarget = Math.min(divNetsVoulus, maxDivNetsEurl);
    let lo = 0, hi = divBrutsMax;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (computeDivNetsEurl(mid).net < divNetsTarget) lo = mid; else hi = mid;
    }
    divBrutsSortis = Math.round((lo + hi) / 2);
    const divResult = computeDivNetsEurl(divBrutsSortis);
    divNets = Math.round(divResult.net);
    divCotisationsTNS = Math.round(divResult.cotTNSDiv);
    flatTax = Math.min(divBrutsSortis, seuilFlatTaxDiv) * tauxFlatTax;
    ratioDistrib = divBrutsMax > 0 ? divBrutsSortis / divBrutsMax : 0;
    // Taux TNS marginal effectif sur les dividendes (hors la part flat tax, négligeable avec capital 1k)
    // Utilisé pour la fiscalité de sortie des enveloppes en EURL (remplace tauxFlatTax)
    const partTNSCalc = Math.max(0, divBrutsSortis - seuilFlatTaxDiv);
    tauxSortieTNS = partTNSCalc > 0 ? divResult.cotTNSDiv / partTNSCalc : 0.30;
  } else {
    // SASU : flat tax simple
    divNetsMax = divBrutsMax * (1 - tauxFlatTax);
    divNets = Math.min(divNetsVoulus, divNetsMax);
    divBrutsSortis = divNets / (1 - tauxFlatTax);
    flatTax = divBrutsSortis * tauxFlatTax;
    ratioDistrib = divBrutsMax > 0 ? divBrutsSortis / divBrutsMax : 0;
  }

  // --- IR (barème 2025) ---
  // Abattement 10% sur salaires/rémunération gérant (CGI art. 83-3° / art. 62)
  const netImposable = isEurl
    ? computeNetImposableTNS(salaireBrut, cotisationsTNSResult)
    : computeNetImposable(salaireBrut);
  const revenuImposableVous = netImposable - Math.min(netImposable * abattementIR, plafondAbattementSalaire);
  const revenuImposableConjoint = revenuConjoint - Math.min(revenuConjoint * abattementIR, plafondAbattementSalaire);
  const revenuImposableFoyer = revenuImposableVous + revenuImposableConjoint;
  const quotientFamilial = revenuImposableFoyer / partsFiscales;

  const { irParPart, tmi } = computeIR(quotientFamilial, partsFiscales);
  const irFoyer = irParPart * partsFiscales;
  const votreIR = revenuImposableFoyer > 0 ? irFoyer * (revenuImposableVous / revenuImposableFoyer) : 0;

  // EURL : taux de sortie pour la distribution (TNS au lieu de flat tax)
  // En EURL, les dividendes > 10% du capital sont soumis aux cotisations TNS, pas à la flat tax.
  // tauxSortieDistrib est utilisé partout où tauxFlatTax s'appliquait à la distribution.
  // Mutable : en EURL, le taux est recalculé pour la phase "lever le pied" (pas de salaire sous-jacent)
  let tauxSortieDistrib = isEurl ? tauxSortieTNS : tauxFlatTax;
  const tauxSortieDistribPhase1 = tauxSortieDistrib;

  // Le seuil IS réduit (42 500 €) est partagé avec le résultat d'exploitation.
  // Les revenus de placement (forfait TME, revenus SCPI) consomment progressivement le seuil restant.
  // En phase 1 : le résultat d'exploitation consomme le seuil → peu/pas de reste pour les placements.
  // En phases 2/3 : pas de résultat d'exploitation → seuil intégralement disponible pour les placements.
  // NB : `let` car recalculé dans la boucle de projection selon la phase courante.
  let seuilISRestant = Math.max(0, seuilIS - resultatAvantIS);
  const computeISOnAmount = (amount) =>
    Math.min(amount, seuilISRestant) * tauxISReduit + Math.max(0, amount - seuilISRestant) * tauxISNormal;
  const tauxISMoyen = (amount) => amount > 0 ? computeISOnAmount(amount) / amount : tauxISNormal;

  // Fiscalité nette par enveloppe
  // SCPI détenues par la SASU : revenus fonciers taxés à l'IS (pas au barème IR du dirigeant),
  // puis flat tax sur la distribution au dirigeant. Même logique que le contrat capi.
  // On estime le revenu SCPI annuel pour calculer le taux IS moyen applicable.
  // Seule la distribution (loyers) est imposable, pas la revalorisation des parts.
  const ratioScpiEff = Math.max(0, 1 - ratioTreso - ratioCapi);
  const resteSASUEstime = benefDistribuable - divBrutsSortis;
  const revenuScpiEstime = (resteSASUEstime * ratioScpiEff) * rendementScpiDistrib;
  const fiscNetteScpiEff = (1 - tauxISMoyen(revenuScpiEstime)) * (1 - tauxSortieDistrib);
  // fiscNettePerEff, fiscNetteRetraite, tmiRetraite : calculés après estimation du revenu en retraite (voir plus bas)
  let fiscNettePerEff, fiscNetteRetraite, tmiRetraite;

  // Contrat capi détenu par la SASU (CGI art. 238 septies E) :
  // - Pendant la détention : IS annuel sur forfait (versements nets × 105% × TME)
  //   → déduit de cumCapi dans la boucle, tracké dans cumForfaitsIS
  // - Au rachat : régularisation IS sur max(0, gains réels - forfaits cumulés), puis flat tax
  const forfaitTME = 1.05 * tme; // taux forfaitaire annuel appliqué aux versements nets
  const computeFiscNetteCapi = (value, basis, cumForfaits) => {
    if (value <= 0) return 1 - tauxSortieDistrib;
    const gain = Math.max(0, value - basis);
    // Régularisation au rachat : IS seulement sur l'excédent de gain réel vs forfaits déjà taxés
    const gainNonEncoreTaxe = Math.max(0, gain - (cumForfaits || 0));
    const isRegul = Math.min(gainNonEncoreTaxe, seuilISRestant) * tauxISReduit + Math.max(0, gainNonEncoreTaxe - seuilISRestant) * tauxISNormal;
    // Distribution : flat tax (SASU) ou cotisations TNS (EURL) sur le gain net d'IS
    const gainNetIS = Math.max(0, gain - isRegul);
    return (basis + gainNetIS * (1 - tauxSortieDistrib)) / value;
  };

  // SCPI détenues par la SASU : à la cession, IS sur la plus-value (revalo), puis flat tax
  // Les distributions (loyers) ont déjà été taxées annuellement (IS dans la boucle).
  // La plus-value = value - basis (basis = versements nets de frais d'entrée).
  const computeFiscNetteScpi = (value, basis) => {
    if (value <= 0) return fiscNetteScpiEff; // fallback sur estimation statique
    const b = Math.min(basis || 0, value);
    const pvCession = Math.max(0, value - b);
    // IS sur la PV de cession (produit exceptionnel de la société)
    const isPV = Math.min(pvCession, seuilISRestant) * tauxISReduit + Math.max(0, pvCession - seuilISRestant) * tauxISNormal;
    // Distribution : flat tax (SASU) ou cotisations TNS (EURL)
    return (b + (pvCession - isPV) * (1 - tauxSortieDistrib)) / value;
  };

  // PEA > 5 ans : PS (18,6%) sur les gains uniquement, retour de capital en franchise
  const computeFiscNettePea = (value, basis) => {
    if (value <= 0) return 1;
    const b = Math.min(basis || 0, value);
    const gains = value - b;
    return (b + gains * (1 - psPea)) / value;
  };

  // Fiscalité PER sortie en capital (CGI art. 154 bis, 163 quatervicies, 200 A) :
  // - Versements déduits → barème IR (TMI retraite), pas de PS (c'est du capital, pas une pension)
  // - Gains → PFU (tauxFlatTax)
  const computeFiscNettePerCapital = (value, basis) => {
    if (value <= 0) return 1 - tauxFlatTax;
    const b = Math.min(basis || 0, value);
    const gains = value - b;
    return (b * (1 - (tmiRetraite || 0)) + gains * (1 - tauxFlatTax)) / value;
  };

  // Fiscalité pondérée : moyenne des taux nets par enveloppe, pondérée par les encours
  const fiscalitePonderee = (cCapi, cCapiBase, cScpi, cScpiBase, cPea, cPeaBase, cPer, inclurePer = true, cForfaits = 0, cPerBase = 0) => {
    const c = cCapi || 0, s = cScpi || 0, p = cPea || 0, pe = (inclurePer && cPer) ? cPer : 0;
    const total = c + s + p + pe;
    if (total <= 0) return computeFiscNetteCapi(0, 0, 0); // fallback
    const fCapi = computeFiscNetteCapi(c, cCapiBase || 0, cForfaits);
    const fScpi = computeFiscNetteScpi(s, cScpiBase || 0);
    const fPea = computeFiscNettePea(p, cPeaBase || 0);
    // PER : sortie capital (croquer) → versements au barème IR, gains au PFU
    //        sortie rente          → fiscNettePerEff (TMI × 90% + PS)
    const fPer = croquerCapital ? computeFiscNettePerCapital(pe, cPerBase) : fiscNettePerEff;
    return (c * fCapi + s * fScpi + p * fPea + pe * fPer) / total;
  };

  // --- Capitalisation ---
  // ⚠ resteSASU = bénéfice distribuable − dividendes sortis. Le PER n'y figure PAS :
  // il a déjà été déduit en amont (inclus dans totalFrais → réduit resultatAvantIS).
  // Ce n'est PAS un double comptage : le PER est une charge déductible de l'IS (flux sortant)
  // ET un versement épargne (flux entrant dans l'enveloppe PER). Deux flux distincts.
  const resteSASU = benefDistribuable - divBrutsSortis;
  const ratioScpi = Math.max(0, 1 - ratioTreso - ratioCapi);
  const reserveTreso = resteSASU * ratioTreso;
  // ⚠ Hypothèse simplificatrice : la part trésorerie du resteSASU n'est PAS accumulée
  // dans la projection. Elle sert à construire progressivement la provision pour risque
  // (6 mois de net net ≈ 60k€). En pratique, les aléas du freelance (impayés, creux
  // d'activité, imprévus) consomment ce cash au fil de l'eau — il ne s'empile pas.
  // Cette simplification est valide tant que resteSASU annuel << provisionRisque cible
  // (ici ~4k/an vs 60k cible → ~15 ans pour atteindre le seuil, dilué par les aléas).
  const contratCapi = resteSASU * ratioCapi;
  const scpi = resteSASU * ratioScpi;
  const scpiNet = scpi * (1 - fraisEntreeScpi); // montant effectivement investi après frais de souscription
  // peaPerso : paramètre (DEFAULTS.peaPerso = 2400 €/an)
  // ⚠ Hypothèse : PER Entreprise (ex-art. 83), déduit du résultat IS de la SASU.
  // Un PER Individuel serait déduit de l'IR personnel (plafond 10% revenus pro) — non modélisé.
  // Pour un freelance SASU optimisé, le PER entreprise est le choix standard.
  const per = frais.per;
  const epargneTotale = contratCapi + scpi + peaPerso + per;

  // --- Phase ARE : SASU avec 0 salaire, 0 dividende ---
  // Pendant anneesAre années, le freelance vit de l'ARE et laisse tout le résultat en SASU.
  // Pas d'acomptes IS la première année (base = IS N-1 qui n'existe pas).
  let areResultatAvantIS = 0, areIS = 0, areBenefDistribuable = 0, areResteSASU = 0;
  let areContratCapi = 0, areScpi = 0, areScpiNet = 0, areReserveTreso = 0, arePer = 0;
  let areMensuelNet = 0;
  // Plafond 60% des droits (réforme avril 2025, France Travail).
  // Le paramètre anneesAre = durée totale des droits. Le créateur ne peut consommer
  // automatiquement que 60% ; les 40% restants nécessitent une demande IPR.
  const anneesAreEff = Math.min(Math.round(anneesAre * 0.6 * 10) / 10, ageObjectif - ageActuel);
  if (anneesAreEff > 0) {
    areResultatAvantIS = Math.max(0, caHT - totalFrais); // pas de superbrut (0 salaire)
    areIS = Math.min(areResultatAvantIS, seuilIS) * tauxISReduit
      + Math.max(0, areResultatAvantIS - seuilIS) * tauxISNormal;
    areBenefDistribuable = areResultatAvantIS - areIS;
    areResteSASU = areBenefDistribuable; // 0 dividendes
    areContratCapi = areResteSASU * ratioCapi;
    areScpi = areResteSASU * ratioScpi;
    areScpiNet = areScpi * (1 - fraisEntreeScpi);
    areReserveTreso = areResteSASU * ratioTreso;
    arePer = per; // PER déjà inclus dans totalFrais → même montant
    const are = computeARE(salaireBrutCDI);
    areMensuelNet = are.areMensuelNet;
  }

  // --- Net net (après épargne perso) ---
  const netNetAnnuel = salaireNet + divNets - votreIR + frais.chequesVacances * (1 - ASSIETTE_CSG * TAUX_CSG_CRDS) - peaPerso;
  const netNetMensuel = netNetAnnuel / 12;

  // --- Prévoyance ---
  let ijSecuJour, complementPrevoyance, capitalDeces;
  if (isEurl) {
    // TNS : IJ = 1/730 du revenu annuel moyen (plafonné PASS), délai de carence 3 jours
    ijSecuJour = Math.min(salaireBrut, PASS) / 730;
    complementPrevoyance = 0; // pas de prévoyance décès cadre obligatoire en EURL
    capitalDeces = 0; // pas de prévoyance décès cadre
  } else {
    ijSecuJour = Math.min(salaireBrut, 48060) * 0.5 / 365;
    complementPrevoyance = salaireBrut * 0.4 / 12;
    capitalDeces = salaireBrut * 3;
  }
  const ijSecuMois = ijSecuJour * 30;
  const totalCouvertMois = ijSecuMois + complementPrevoyance;
  const provisionRisque = netNetMensuel * 6;

  // --- Projection COMPLÈTE ageActuel → ageFin ---
  const annees = ageObjectif - ageActuel;
  const ageRetraite = 67;
  // EURL : les dividendes > 10% capital sont soumis TNS → génèrent des points retraite SSI
  const seuilFlatTaxDivRet = isEurl ? capitalSocial * 0.10 : 0;
  const divBrutsTNSAnnuel = isEurl ? Math.max(0, divBrutsSortis - seuilFlatTaxDivRet) : 0;
  // Premier appel : sans drawdown (estimé à 0) — sera recalculé après le drawdown pour l'EURL
  let { retraiteBaseMois, retraiteCompMois, retraiteTotaleMois } = computeRetraite({
    salaireBrutCDI, salaireBrut, ageActuel, ageObjectif, forme,
    divBrutsTNSAnnuel,
  });
  // Phase 2 "lever le pied" : modèle de coûts propre
  // Pas de salaire, frais fixes réduits (compta, RC pro, CFE, banque, mutuelle, prévoyance)
  // CA missions → résultat → IS → dividendes flat tax
  const joursMissionsPonctuelles = joursLeverLePied;
  const caMissions = tjm * joursMissionsPonctuelles;
  const fraisPhase2 = (frais.comptable || 0) + (frais.rcPro || 0) + (frais.cfe || 0) + (frais.banque || 0) + (frais.mutuelle || 0) + (frais.prevoyance || 0);
  const resultatMissions = Math.max(0, caMissions - fraisPhase2);
  const isMissions = Math.min(resultatMissions, seuilIS) * tauxISReduit + Math.max(0, resultatMissions - seuilIS) * tauxISNormal;
  // NB : recalculé avec tauxSortieDistribPhase2 après le drawdown (let, pas const)
  let revenuMissionsAnnuel = (resultatMissions - isMissions) * (1 - tauxSortieDistrib);

  const projection = [];
  const PLAFOND_PEA = 150000; // plafond versements PEA (CMF art. L221-30)
  let cumCapi = 0, cumCapiBase = 0, cumScpi = 0, cumScpiBase = 0, cumPea = 0, cumPeaBase = 0, cumPer = 0, cumPerBase = 0, cumForfaitsIS = 0;

  // First pass: capital at ageObjectif for drawdown
  // Le PER est bloqué jusqu'à 64 ans (sauf cas exceptionnels)
  // On calcule le drawdown en excluant le PER avant 64 ans
  // Pour la projection, le forfait TME est petit → on estime le taux IS moyen applicable
  const forfaitEstime = (resteSASUEstime * ratioCapi) * 1.05 * tme;
  const projArgs = { tme, tauxISEffectif: tauxISMoyen(forfaitEstime), partDistribScpi, fraisEntreeScpi };
  const areArgs = anneesAreEff > 0 ? { anneesAre: anneesAreEff, contratCapiAre: areContratCapi, scpiAre: areScpiNet, perAre: arePer } : {};
  const rendements = { rendementCapi, rendementScpi, rendementPea, rendementPer };
  const projAtObjectif = computeCapitalProjection({ contratCapi, scpi: scpiNet, peaPerso, per, ...rendements, annees, inflation, ...projArgs, ...areArgs });
  const capitalAtObjectif = projAtObjectif.total;
  // projHorsPer calculé plus bas (rendement pondéré) — on y extrait aussi capitalHorsPerAtObjectif
  let capitalHorsPerAtObjectif;

  const anneesDrawdown = ageFin - ageObjectif;
  const anneesAvant64 = Math.max(0, Math.min(64, ageFin) - ageObjectif);
  const anneesApres64 = Math.max(0, ageFin - Math.max(ageObjectif, 64));

  // Capital drainable à l'entrée de la phase drawdown :
  // ⚠ annees - 1 est CORRECT, pas un off-by-one :
  // La boucle fait annees-1 contributions (y=1..annees-1 en phase 1).
  // À y=annees, age === ageObjectif → phase 2 (plus de contribution, premier retrait).
  // La formule d'annuité PV×r/(1-(1+r)^-n) suppose PV = pool AVANT la première croissance.
  // La provision pour risque couvre les aléas lissés → s'amortit linéairement, pas drainable.
  const anneesContrib = Math.max(0, annees - 1);
  const poolHorsPerAvantRetrait = computeCapitalProjection({ contratCapi, scpi: scpiNet, peaPerso, per: 0, ...rendements, annees: anneesContrib, inflation, ...projArgs, ...areArgs, perAre: 0 }).total;
  const poolPerAvantRetrait = computeCapitalProjection({ contratCapi: 0, scpi: 0, peaPerso: 0, per, ...rendements, annees: anneesContrib, inflation, ...projArgs, anneesAre: anneesAreEff, contratCapiAre: 0, scpiAre: 0, perAre: arePer }).total;
  const poolTotalAvantRetrait = poolHorsPerAvantRetrait + poolPerAvantRetrait;

  // --- TMI retraite pour fiscalité PER ---
  // La rente PER est perçue à 64+ ans, quand le revenu imposable est plus faible
  // qu'en phase active. On estime la TMI sur le revenu réel en retraite :
  // retraite base + complémentaire + rente PER brute × 90% (abattement pension 10%)
  {
    // Estimer le capital PER à 64 ans (contributions jusqu'à ageObjectif, puis capitalisation seule)
    let perEstime64 = poolPerAvantRetrait;
    const anneesCapiPer = Math.max(0, 64 - ageObjectif);
    for (let i = 0; i < anneesCapiPer; i++) perEstime64 *= (1 + rendementPer);
    // En sortie capital, pas de rente → ne pas gonfler la TMI avec une rente fictive
    const rentePerBruteEstimee = croquerCapital ? 0 : perEstime64 * tauxConversionPer;
    // Revenu imposable en retraite : pensions + rente PER, abattement 10% plafonné
    // CGI art. 158-5-a : abattement 10% sur pensions, plafond 4 439 € / foyer (revenus 2025)
    const retraiteAnnuelleBrute = (retraiteBaseMois + retraiteCompMois) * 12;
    const pensionsBrutesVous = retraiteAnnuelleBrute + rentePerBruteEstimee;
    // Abattement 10% plafonné à plafondAbattementPension pour le FOYER (CGI 158-5-a)
    const abattementBrutVous = pensionsBrutesVous * abattementIR;
    const abattementBrutConjoint = revenuConjoint * abattementIR;
    const totalAbattementBrut = abattementBrutVous + abattementBrutConjoint;
    // Si le total dépasse le plafond foyer, on répartit au prorata
    const ratioPlafond = totalAbattementBrut > plafondAbattementPension
      ? plafondAbattementPension / totalAbattementBrut : 1;
    const abattementVous = abattementBrutVous * ratioPlafond;
    const abattementConjoint = abattementBrutConjoint * ratioPlafond;
    const revenuRetraiteVous = pensionsBrutesVous - abattementVous;
    const revenuRetraiteConjoint = revenuConjoint - abattementConjoint;
    const qfRetraite = (revenuRetraiteVous + revenuRetraiteConjoint) / partsFiscales;
    tmiRetraite = computeIR(qfRetraite, partsFiscales).tmi;
    // Rente PER imposée comme pension (CGI art. 158-5-a) :
    //   - Part imposable = rente brute − quote-part de l'abattement
    //     (prorata : la rente PER partage le plafond avec les autres pensions)
    //   - PS sur pensions de retraite : CSG 8,3% + CRDS 0,5% + CASA 0,3% = 9,1%
    //     (CSS art. L136-8-III, ord. 96-50 art. 14, CSS art. L14-10-4)
    const ratioAbattement = pensionsBrutesVous > 0 ? abattementVous / pensionsBrutesVous : abattementIR;
    // Taux net applicable aux pensions (IR au barème + PS)
    // Même formule pour retraite et rente PER (même plafond d'abattement, même prorata)
    fiscNettePerEff = 1 - tmiRetraite * (1 - ratioAbattement) - psPension;
    fiscNetteRetraite = fiscNettePerEff;
  }

  let drawdownAnnuelBrutAvant64 = 0;
  let drawdownAnnuelBrutApres64 = 0;

  // Rendement net du drag fiscal annuel sur le capital (hors PER) :
  // - Contrat capi : forfait TME = 105% × TME × base (versements nets), pas × valeur (encours).
  //   Le ratio base/valeur diminue dans le temps quand les gains s'accumulent.
  //   On estime ce ratio à l'objectif pour la formule d'annuité.
  // - SCPI : IS sur les distributions (loyers) = rendementDistrib × valeur → drag direct
  // - PEA : pas de drag fiscal annuel (PS uniquement au retrait, > 5 ans)
  // Pondération par les encours estimés à l'objectif (pas les ratios d'allocation initiale)
  const projHorsPer = computeCapitalProjection({ contratCapi, scpi: scpiNet, peaPerso, per: 0, ...rendements, annees, inflation, ...projArgs, ...areArgs, perAre: 0 });
  capitalHorsPerAtObjectif = projHorsPer.total;
  const vCapi = projHorsPer.capiValue, vScpi = projHorsPer.scpiValue, vPea = projHorsPer.peaValue;
  const totalHorsPer = vCapi + vScpi + vPea;
  const wCapi = totalHorsPer > 0 ? vCapi / totalHorsPer : 0;
  const wScpi = totalHorsPer > 0 ? vScpi / totalHorsPer : 0;
  const wPea  = totalHorsPer > 0 ? vPea  / totalHorsPer : 0;
  // Ratio base/valeur du contrat capi à l'objectif (les gains diluent la base)
  const ratioBaseValeur = projAtObjectif.capiValue > 0
    ? projAtObjectif.capiBase / projAtObjectif.capiValue
    : 1;
  const dragFiscalCapi = forfaitTME * tauxISMoyen(forfaitEstime) * ratioBaseValeur; // drag en % de la valeur
  const dragFiscalScpi = rendementScpiDistrib * tauxISMoyen(revenuScpiEstime);  // IS sur les loyers (pas la revalo)
  // PEA : drag = 0 (pas d'imposition annuelle)
  const dragFiscalMoyen = wCapi * dragFiscalCapi + wScpi * dragFiscalScpi;
  // Rendement nominal pondéré de toutes les enveloppes hors PER
  // ⚠ Hypothèse : pondération figée à ageObjectif. Pendant le drawdown, la composition évolue
  // (le PEA résiste mieux car pas de drag fiscal annuel → poids relatif croissant → rendement
  // pondéré réel légèrement supérieur). La marge de sécurité (0,5 pt) absorbe ce conservatisme.
  const rendementPondereHorsPer = wCapi * rendementCapi + wScpi * rendementScpiEffectif + wPea * rendementPea;
  const rendementNetDrag = Math.max(0, rendementPondereHorsPer - dragFiscalMoyen);

  // Annuité en taux réel net de drag fiscal → estimation initiale pour la bisection
  // Marge 0,5 point : le mode croquer capital est risqué (capital à zéro si rendements déçoivent)
  const tauxReel = Math.max(0.001, rendementNetDrag - inflation - margeSecurite);

  // Simulation légère du capital pendant le drawdown (phases 2-3, croquerCapital uniquement).
  // Réplique la logique de la boucle principale : croissance par enveloppe, retrait pro-rata,
  // IS drag (forfait TME + distributions SCPI), PER débloqué à 64.
  // Retourne le capital total restant à ageFin.
  const simulateDrawdownFinal = (drawdownBase) => {
    let c = projHorsPer.capiValue, cb = projHorsPer.capiBase;
    let s = projHorsPer.scpiValue, sb = projHorsPer.scpiBase;
    let p = projHorsPer.peaValue, pb = projHorsPer.peaBase;
    let pe = poolPerAvantRetrait, peb = projAtObjectif.perBase;
    for (let dy = 0; dy < anneesDrawdown; dy++) {
      const age = ageObjectif + dy;
      const perDebloque = age >= 64;
      const phase = age < ageRetraite ? 2 : 3;
      const infY = Math.pow(1 + inflation, dy + 1);  // +1 car dy=0 est la 1ère année après ageObjectif
      // Drawdown indexé inflation → pouvoir d'achat constant
      const currentDrawdown = drawdownBase * Math.pow(1 + inflation, dy);
      // Croissance par enveloppe
      const poolCapi = c * (1 + rendementCapi);
      const poolScpi = s * (1 + rendementScpiEffectif);
      const poolPea = p * (1 + rendementPea);
      const poolPer = pe * (1 + rendementPer);
      const totalPool = perDebloque
        ? poolCapi + poolScpi + poolPea + poolPer
        : poolCapi + poolScpi + poolPea;
      const withdrawal = Math.min(currentDrawdown, totalPool);
      if (totalPool > 0) {
        const rc = poolCapi / totalPool, rs = poolScpi / totalPool, rp = poolPea / totalPool;
        const prevC = poolCapi; c = poolCapi - withdrawal * rc;
        cb = prevC > 0 ? cb * (c / prevC) : 0;
        const prevS = poolScpi; s = poolScpi - withdrawal * rs;
        sb = prevS > 0 ? sb * (s / prevS) : 0;
        const prevP = poolPea; p = poolPea - withdrawal * rp;
        pb = prevP > 0 ? pb * (p / prevP) : 0;
        if (perDebloque) {
          const rpe = poolPer / totalPool;
          const prevPe = poolPer; pe = poolPer - withdrawal * rpe;
          peb = prevPe > 0 ? peb * (pe / prevPe) : 0;
        } else { pe = poolPer; }
      } else { c = poolCapi; s = poolScpi; p = poolPea; pe = poolPer; }
      c = Math.max(0, c); s = Math.max(0, s); p = Math.max(0, p); pe = Math.max(0, pe);
      // IS drag annuel (même logique que la boucle principale)
      const forfait = cb > 0 ? cb * forfaitTME : 0;
      const revScpi = s > 0 ? s * rendementScpiDistrib : 0;
      const totalRevPl = forfait + revScpi;
      const resMissY = phase === 2 ? resultatMissions * infY : 0;
      const totalRes = resMissY + totalRevPl;
      const isTotal = Math.min(totalRes, seuilIS) * tauxISReduit + Math.max(0, totalRes - seuilIS) * tauxISNormal;
      if (totalRevPl > 0 && totalRes > 0) {
        const ratioPl = totalRevPl / totalRes;
        const isPl = isTotal * ratioPl;
        if (forfait > 0) c = Math.max(0, c - isPl * (forfait / totalRevPl));
        if (revScpi > 0) s = Math.max(0, s - isPl * (revScpi / totalRevPl));
      }
    }
    return c + s + p + pe;
  };

  // Sortie PER à 64 ans (art. L224-1 Code monétaire et financier, loi PACTE) :
  // - croquer = true  → sortie en capital fractionné : le PER rejoint le pool de drawdown
  //   Pas de contrainte légale de durée max ni de montant min (modalités contractuelles variables).
  //   Fiscalité : versements déduits → barème IR (TMI retraite), gains → PFU (tauxFlatTax)
  //   (CGI art. 154 bis, 163 quatervicies, 200 A)
  // - croquer = false → sortie en rente viagère : capital converti par l'assureur (tauxConversionPer)
  if (croquerCapital && rendementPondereHorsPer > 0) {
    // Estimation initiale par formule d'annuité (taux blend), puis bisection pour trouver
    // le drawdown qui épuise exactement le capital dans la simulation par enveloppe.
    let drawdownEstime;
    if (ageObjectif >= 64) {
      drawdownEstime = anneesDrawdown > 0
        ? poolTotalAvantRetrait * tauxReel / (1 - Math.pow(1 + tauxReel, -anneesDrawdown))
        : 0;
    } else {
      let perAt64 = poolPerAvantRetrait;
      for (let i = 0; i < anneesAvant64; i++) perAt64 = perAt64 * (1 + rendementPer);
      const fv1 = Math.pow(1 + tauxReel, anneesAvant64);
      const ann1 = anneesAvant64 > 0 ? (fv1 - 1) / tauxReel : 0;
      const pv2 = anneesApres64 > 0 ? (1 - Math.pow(1 + tauxReel, -anneesApres64)) / tauxReel : 0;
      drawdownEstime = (ann1 + pv2) > 0
        ? (poolHorsPerAvantRetrait * fv1 + perAt64) / (ann1 + pv2)
        : 0;
    }
    // Bisection : trouver le drawdown qui donne capital final ≈ 0
    // Bornes : 0 (pas de retrait) → 2× l'estimation (largement suffisant)
    let lo = 0, hi = drawdownEstime * 2;
    for (let iter = 0; iter < 50; iter++) {
      const mid = (lo + hi) / 2;
      const finalCap = simulateDrawdownFinal(mid);
      if (finalCap > 0) lo = mid; else hi = mid;
      if (Math.abs(hi - lo) < 1) break; // convergence à 1€ près
    }
    const drawdownBisection = (lo + hi) / 2;
    drawdownAnnuelBrutAvant64 = drawdownBisection;
    drawdownAnnuelBrutApres64 = drawdownBisection;
  }
  // Pour la compatibilité : drawdownAnnuelBrut est celui de la première phase
  const drawdownAnnuelBrut = ageObjectif >= 64 ? drawdownAnnuelBrutApres64 : drawdownAnnuelBrutAvant64;
  // Estimation headline (encours à ageObjectif) — la boucle recalcule fiscPondRetrait chaque année
  // avec les encours réels (la composition du portefeuille évolue pendant le drawdown)
  const fiscPondereeEstimee = fiscalitePonderee(projAtObjectif.capiValue, projAtObjectif.capiBase, projAtObjectif.scpiValue, projAtObjectif.scpiBase, projAtObjectif.peaValue, projAtObjectif.peaBase, per, true, 0, projAtObjectif.perBase);
  const drawdownMensuelNet = drawdownAnnuelBrut * fiscPondereeEstimee / 12;

  // EURL : recalculer la retraite avec les points SSI sur les distributions en phase "lever le pied"
  // En mode rente : retrait brut ≈ capital × taux de retrait. En mode croquer : drawdownAnnuelBrut.
  let tauxSortieDistribPhase2 = tauxSortieDistrib;
  if (isEurl) {
    const drawdownBrutEstime = croquerCapital
      ? drawdownAnnuelBrut
      : capitalHorsPerAtObjectif * Math.max(0, rendementNetDrag - inflation - margeSecurite);
    ({ retraiteBaseMois, retraiteCompMois, retraiteTotaleMois } = computeRetraite({
      salaireBrutCDI, salaireBrut, ageActuel, ageObjectif, forme,
      divBrutsTNSAnnuel,
      drawdownBrutAnnuel: drawdownBrutEstime,
    }));
    // Recalculer le taux de sortie TNS pour la phase "lever le pied" :
    // Plus de rémunération → cotisations TNS depuis zéro, taux effectif plus bas
    const distribPhase2 = drawdownBrutEstime + Math.max(0, resultatMissions - isMissions);
    const seuilFTPhase2 = capitalSocial * 0.10;
    const partTNSPhase2 = Math.max(0, distribPhase2 - seuilFTPhase2);
    if (partTNSPhase2 > 0) {
      const tnsPhase2 = computeCotisationsTNS(partTNSPhase2);
      tauxSortieDistribPhase2 = tnsPhase2.total / partTNSPhase2;
    }
    // Recalculer le revenu missions avec le taux phase 2 (utilisé pour PEA contrib et affichage)
    revenuMissionsAnnuel = (resultatMissions - isMissions) * (1 - tauxSortieDistribPhase2);
  }

  // Déflateur : convertit un montant nominal futur en pouvoir d'achat d'aujourd'hui
  const deflate = (nominal, years) => inflation > 0 ? nominal / Math.pow(1 + inflation, years) : nominal;

  let perRenteAnnuelleBrute = 0; // rente viagère fixée à 64 ans, nominale constante

  for (let y = 0; y <= ageFin - ageActuel; y++) {
    const age = ageActuel + y;
    const annee = 2026 + y;
    let phase = age < ageObjectif ? 1 : age < ageRetraite ? 2 : 3;

    // EURL : basculer le taux de sortie TNS selon la phase
    // Phase active : taux marginal (par-dessus le salaire), Phase 2+ : taux depuis zéro (pas de salaire)
    if (isEurl) tauxSortieDistrib = phase >= 2 ? tauxSortieDistribPhase2 : tauxSortieDistribPhase1;

    if (y === 0) {
      projection.push({
        age, annee, phase,
        capi: 0, scpiVal: 0, pea: 0, perVal: 0, provisionRisque: provisionRisque,
        total: provisionRisque, totalReel: provisionRisque,
        revenuPassifMois: 0, retraiteMois: 0, perRenteMois: 0, missionsMois: 0,
        drawdownMois: 0,
        revenuTotalMois: Math.round(netNetMensuel),
        revenuTotalMoisReel: Math.round(netNetMensuel),
        label: "Freelance"
      });
    } else {
      // Les contributions croissent avec l'inflation : on suppose que CA ET frais croissent
      // au même rythme (TJM, comptable, RC pro, mutuelle… tous indexés sur l'inflation),
      // donc le résultat net et l'épargne croissent proportionnellement.
      const infY = Math.pow(1 + inflation, y);
      let actualWithdrawal = 0;
      const isAre = anneesAreEff > 0 && y <= anneesAreEff;
      if (phase === 1) {
        // ARE boost : contributions SASU majorées (0 salaire, 0 dividende)
        const ccY = isAre ? areContratCapi : contratCapi;
        const scNetY = isAre ? areScpiNet : scpiNet;
        const scGrossY = isAre ? areScpi : scpi;
        const perY = isAre ? arePer : per;
        cumCapi = cumCapi * (1 + rendementCapi) + ccY * infY;
        cumCapiBase += ccY * infY;  // coût d'acquisition : seuls les versements, pas les gains
        const cumScpiAvant = cumScpi;
        cumScpi = cumScpi * (1 + rendementScpiEffectif) + scNetY * infY;
        cumScpiBase += scGrossY * infY; // base comptable = coût d'acquisition incluant frais de souscription
        // Distributions réinvesties : augmentent la base (évite double taxation à la cession)
        const distribScpiBrut = cumScpiAvant * rendementScpiDistrib;
        const distribScpiNetIS = distribScpiBrut * (1 - tauxISMoyen(distribScpiBrut));
        cumScpiBase += distribScpiNetIS * (1 - fraisEntreeScpi);
        // PEA plafonné à 150k€ de versements (CMF art. L221-30).
        // L'excédent reste dans le net net du foyer (pas de redirection vers une autre enveloppe).
        const peaVersement1 = Math.min(peaPerso * infY, Math.max(0, PLAFOND_PEA - cumPeaBase));
        cumPea = cumPea * (1 + rendementPea) + peaVersement1;
        cumPeaBase += peaVersement1;
        cumPer = cumPer * (1 + rendementPer) + perY * infY;
        cumPerBase += perY * infY;
      } else if (croquerCapital) {
        // PER bloqué jusqu'à 64 ans : il grossit mais on ne le ponctione pas
        const perDebloque = age >= 64;
        // Annuité indexée sur l'inflation → pouvoir d'achat constant
        // Si drawdown lissé (avant64 === après64), compteur continu pour éviter un saut à 64
        const anneesDepuisPhase = (perDebloque && drawdownAnnuelBrutAvant64 !== drawdownAnnuelBrutApres64)
          ? age - Math.max(ageObjectif, 64)
          : age - ageObjectif;
        const baseDrawdown = perDebloque ? drawdownAnnuelBrutApres64 : drawdownAnnuelBrutAvant64;
        const currentDrawdown = baseDrawdown * Math.pow(1 + inflation, anneesDepuisPhase);

        // Pool de retrait : hors PER avant 64, tout après 64
        const poolCapi = cumCapi * (1 + rendementCapi);
        const poolScpi = cumScpi * (1 + rendementScpiEffectif);
        const poolPea = cumPea * (1 + rendementPea);
        const poolPer = cumPer * (1 + rendementPer);

        const totalPool = perDebloque
          ? poolCapi + poolScpi + poolPea + poolPer
          : poolCapi + poolScpi + poolPea;
        actualWithdrawal = Math.min(currentDrawdown, totalPool);

        if (totalPool > 0) {
          const ratio_c = poolCapi / totalPool;
          const ratio_s = poolScpi / totalPool;
          const ratio_p = poolPea / totalPool;
          const prevCapi = poolCapi;
          cumCapi = poolCapi - actualWithdrawal * ratio_c;
          cumCapiBase = prevCapi > 0 ? cumCapiBase * (cumCapi / prevCapi) : 0;  // base réduite au prorata
          const prevScpi = poolScpi;
          cumScpi = poolScpi - actualWithdrawal * ratio_s;
          cumScpiBase = prevScpi > 0 ? cumScpiBase * (cumScpi / prevScpi) : 0;
          const prevPea = poolPea;
          cumPea = poolPea - actualWithdrawal * ratio_p;
          cumPeaBase = prevPea > 0 ? cumPeaBase * (cumPea / prevPea) : 0;
          if (perDebloque) {
            const ratio_pe = poolPer / totalPool;
            const prevPer = poolPer;
            cumPer = poolPer - actualWithdrawal * ratio_pe;
            cumPerBase = prevPer > 0 ? cumPerBase * (cumPer / prevPer) : 0;
          } else {
            cumPer = poolPer; // PER grossit mais pas ponctionné
          }
        } else {
          cumCapi = poolCapi;
          cumScpi = poolScpi;
          cumPea = poolPea;
          cumPer = poolPer;
        }
        cumCapi = Math.max(0, cumCapi);
        cumScpi = Math.max(0, cumScpi);
        cumPea = Math.max(0, cumPea);
        cumPer = Math.max(0, cumPer);
      } else {
        if (phase === 2) {
          cumCapi = cumCapi * (1 + rendementCapi);
          cumScpi = cumScpi * (1 + rendementScpiEffectif);
          const peaContribBrut = Math.min(peaPerso / 2, revenuMissionsAnnuel) * infY; // estimation (IS exact calculé plus bas)
          const peaContrib = Math.min(peaContribBrut, Math.max(0, PLAFOND_PEA - cumPeaBase));
          cumPea = cumPea * (1 + rendementPea) + peaContrib;
          cumPeaBase += peaContrib;
          cumPer = cumPer * (1 + rendementPer);
        } else {
          cumCapi = cumCapi * (1 + rendementCapi);
          cumScpi = cumScpi * (1 + rendementScpiEffectif);
          cumPea = cumPea * (1 + rendementPea);
          cumPer = cumPer * (1 + rendementPer);
        }
        // croquer = false → sortie PER en rente viagère à 64 ans (art. L224-1 CMF)
        // Le capital est transféré à l'assureur qui verse une rente nominale fixe à vie
        if (age === 64 && perRenteAnnuelleBrute === 0 && cumPer > 0) {
          perRenteAnnuelleBrute = cumPer * tauxConversionPer;
          cumPer = 0; cumPerBase = 0; // capital parti chez l'assureur
        }
      }

      // Drag fiscal annuel sur le capital détenu par la SASU :
      // Le forfait capi et les revenus SCPI partagent le même seuil IS restant.
      const forfaitAnnuel = cumCapiBase > 0 ? cumCapiBase * forfaitTME : 0;
      const revenuScpiAnnuel = cumScpi > 0 ? cumScpi * rendementScpiDistrib : 0;
      const totalRevenuPlacements = forfaitAnnuel + revenuScpiAnnuel;

      // IS société : un seul résultat fiscal, un seul seuil IS (42 500 €)
      // Phase 1 → résultat d'exploitation + placements
      // Phase 2 → missions ponctuelles + placements
      // Phase 3 → placements seuls
      const resultatMissionsY = phase === 2 ? resultatMissions * infY : 0;
      const resultatExploitationY = phase === 1 ? (isAre ? areResultatAvantIS : resultatAvantIS) * infY : resultatMissionsY;
      const totalResultatSociete = resultatExploitationY + totalRevenuPlacements;
      const isTotalSociete = Math.min(totalResultatSociete, seuilIS) * tauxISReduit
        + Math.max(0, totalResultatSociete - seuilIS) * tauxISNormal;

      // Répartir l'IS au prorata entre exploitation et placements
      if (totalRevenuPlacements > 0 && totalResultatSociete > 0) {
        const ratioPlacements = totalRevenuPlacements / totalResultatSociete;
        const isPlacements = isTotalSociete * ratioPlacements;
        if (forfaitAnnuel > 0) {
          // ⚠ Limitation assumée : l'IS forfaitaire est déduit directement de cumCapi.
          // En réalité la SASU paie l'IS depuis sa trésorerie ; en phases 2-3 sans activité,
          // elle ferait un rachat partiel qui déclenche une régularisation (gain réel vs forfait
          // cumulé) non modélisée ici. Impact faible et compensé (pas de drag au rachat).
          cumCapi = Math.max(0, cumCapi - isPlacements * (forfaitAnnuel / totalRevenuPlacements));
          cumForfaitsIS += forfaitAnnuel;
        }
        if (revenuScpiAnnuel > 0) {
          cumScpi = Math.max(0, cumScpi - isPlacements * (revenuScpiAnnuel / totalRevenuPlacements));
        }
      }

      // Seuil IS résiduel (pour computeISOnAmount, utilisé par fiscalitePonderee)
      seuilISRestant = Math.max(0, seuilIS - totalResultatSociete);

      // Revenu net missions phase 2 : IS au prorata du résultat total
      // Distribution : flat tax (SASU) ou cotisations TNS (EURL)
      const revenuMissionsNet = (phase === 2 && resultatMissionsY > 0 && totalResultatSociete > 0)
        ? (resultatMissionsY - isTotalSociete * (resultatMissionsY / totalResultatSociete)) * (1 - tauxSortieDistrib)
        : 0;

      // En mode croquer capital, la provision pour risque s'amortit linéairement
      // (elle absorbe les aléas lissés chaque année → pas un stock permanent)
      const anneesDepuisObjectif = age - ageObjectif;
      const tresoRestante = (croquerCapital && phase >= 2)
        ? Math.max(0, provisionRisque * (1 - anneesDepuisObjectif / anneesDrawdown))
        : provisionRisque;

      const totalHorsPer = cumCapi + cumScpi + cumPea + tresoRestante;
      const totalAvecPer = totalHorsPer + cumPer;

      const fiscPondYear = fiscalitePonderee(cumCapi, cumCapiBase, cumScpi, cumScpiBase, cumPea, cumPeaBase, cumPer, false, cumForfaitsIS);
      // SWR prudent : rendement réel net du drag IS, moins 0.5 point de marge
      // pour absorber le sequence-of-returns risk et la volatilité réelle.
      // Avec les défauts (5% brut, 2% inflation, ~0.7% drag IS) → SWR ≈ 1.8% au lieu de 2.3%.
      const tauxRetrait = Math.max(0, rendementNetDrag - inflation - margeSecurite);
      const revenuPassifNet = croquerCapital ? 0 : totalHorsPer * tauxRetrait * fiscPondYear / 12;

      // drawdownMois = retrait réel (plafonné au pool disponible)
      const perDebloque = age >= 64;
      const fiscPondRetrait = fiscalitePonderee(cumCapi, cumCapiBase, cumScpi, cumScpiBase, cumPea, cumPeaBase, cumPer, perDebloque, cumForfaitsIS, cumPerBase);
      const drawdownMois = (croquerCapital && phase >= 2) ? Math.round(actualWithdrawal * fiscPondRetrait / 12) : 0;

      // inflate() : le TJM suit l'inflation (et même plus : progression avec l'XP), salaire, missions, retraite → leur nominal croît
      const inflate = (base) => Math.round(base * Math.pow(1 + inflation, y));
      // Rente PER : montant nominal fixe (conversion viagère à 64 ans)
      const perRenteMois = (!croquerCapital && perRenteAnnuelleBrute > 0) ? Math.round(perRenteAnnuelleBrute * fiscNettePerEff / 12) : 0;
      // Revenus indexés sur l'inflation → nominal croît, réel constant
      // Retraite de base : revalorisée ≈ inflation (hypothèse optimiste mais standard)
      // Complémentaire AGIRC-ARRCO : sous-indexée historiquement (ANI 2017, ~inflation − 0,3 pt/an)
      const sousIndexationArrco = 0.003; // 0,3 pt/an de sous-revalorisation vs inflation
      const facteurErosionArrco = Math.pow(1 - sousIndexationArrco, y);
      // Retraite brute → nette d'IR et PS (même fiscalité que la rente PER : abattement 10% + TMI + PS)
      const retraiteBrutMois = phase === 3
        ? Math.round(inflate(retraiteBaseMois) + inflate(retraiteCompMois) * facteurErosionArrco)
        : 0;
      const retraiteMois = Math.round(retraiteBrutMois * (fiscNetteRetraite || 1));
      const peaPhase2 = (!croquerCapital && phase === 2) ? Math.min(peaPerso / 2 * infY, revenuMissionsNet) : 0;
      const missionsMois = phase === 2 ? Math.round((revenuMissionsNet - peaPhase2) / 12) : 0;

      // ⚠ Limitation assumée : en phases 2-3, l'IR foyer (revenu conjoint + pensions) n'est pas
      // retranché. Avec les défauts (conjoint 16 800 €, 2.5 parts → QF ~6 000 € → TMI 0%), c'est
      // correct. Mais si revenuConjoint est élevé, le foyer doit de l'IR non modélisé ici.
      // Pour corriger il faudrait calculer l'IR barème du foyer année par année en phases 2-3.
      let revenuTotalMois;
      if (phase === 1 && isAre) {
        // ARE : revenu perso = allocation chômage (montant nominal fixe, pas d'inflation)
        revenuTotalMois = Math.round(areMensuelNet - peaPerso / 12);
      } else if (phase === 1) {
        revenuTotalMois = inflate(Math.round(netNetMensuel));
      } else if (croquerCapital) {
        revenuTotalMois = Math.round(drawdownMois + missionsMois + retraiteMois);
      } else if (phase === 2) {
        revenuTotalMois = Math.round(revenuPassifNet + missionsMois + (perDebloque ? perRenteMois : 0));
      } else {
        revenuTotalMois = Math.round(revenuPassifNet + retraiteMois + perRenteMois);
      }

      // Valeurs en € d'aujourd'hui (pouvoir d'achat)
      // Ce qui suit l'inflation (travail, missions, retraite) → réel = valeur de base constante
      // Ce qui vient du capital (passif, drawdown, PER rente) → déflater le nominal
      const totalReel = Math.round(deflate(totalAvecPer, y));
      const revenuPassifReel = Math.round(deflate(croquerCapital ? drawdownMois : revenuPassifNet, y));
      const perRenteMoisReel = Math.round(deflate(perRenteMois, y));
      let revenuTotalMoisReel;
      if (phase === 1 && isAre) {
        revenuTotalMoisReel = Math.round(deflate(areMensuelNet - peaPerso / 12, y));
      } else if (phase === 1) {
        revenuTotalMoisReel = Math.round(netNetMensuel);
      } else if (croquerCapital) {
        // Retraite en réel : base = valeur constante, complémentaire érodée par sous-indexation
        const retraiteMoisReel = phase === 3 ? Math.round((retraiteBaseMois + retraiteCompMois * facteurErosionArrco) * (fiscNetteRetraite || 1)) : 0;
        revenuTotalMoisReel = Math.round(deflate(drawdownMois, y) + Math.round(deflate(missionsMois, y)) + retraiteMoisReel);
      } else if (phase === 2) {
        revenuTotalMoisReel = Math.round(revenuPassifReel + Math.round(deflate(missionsMois, y)) + (perDebloque ? perRenteMoisReel : 0));
      } else {
        const retraiteMoisReel = Math.round((retraiteBaseMois + retraiteCompMois * facteurErosionArrco) * (fiscNetteRetraite || 1));
        revenuTotalMoisReel = Math.round(revenuPassifReel + retraiteMoisReel + perRenteMoisReel);
      }

      projection.push({
        age, annee, phase,
        capi: Math.round(cumCapi), scpiVal: Math.round(cumScpi),
        pea: Math.round(cumPea), perVal: Math.round(cumPer),
        provisionRisque: Math.round(tresoRestante),
        total: Math.round(totalAvecPer),
        revenuPassifMois: Math.round(croquerCapital ? drawdownMois : revenuPassifNet),
        retraiteMois, perRenteMois, missionsMois, drawdownMois,
        revenuTotalMois,
        totalReel, revenuTotalMoisReel,
        label: phase === 1 ? (isAre ? "ARE" : "Freelance") : phase === 2 ? "Lever le pied" : "Retraite"
      });
    }
  }

  // Restaurer le taux phase active pour les scénarios de distribution (phase 1)
  tauxSortieDistrib = tauxSortieDistribPhase1;

  // --- Scénarios ratio (réutilise la même logique que le calcul principal) ---
  const paliers = [0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0];
  // Insérer le ratio réel de l'utilisateur s'il ne tombe pas sur un palier
  if (ratioDistrib > 0 && !paliers.some(p => Math.abs(p - ratioDistrib) < 0.001)) {
    paliers.push(ratioDistrib);
    paliers.sort((a, b) => a - b);
  }
  const scenariosRatio = paliers.map(r => {
    const db = benefDistribuable * r;
    const dn = db * (1 - tauxSortieDistrib);
    const nn = salaireNet + dn - votreIR + frais.chequesVacances * (1 - ASSIETTE_CSG * TAUX_CSG_CRDS) - peaPerso;
    const reste = benefDistribuable - db;
    const projScenario = computeCapitalProjection({
      contratCapi: reste * ratioCapi,
      scpi: reste * ratioScpi * (1 - fraisEntreeScpi),
      peaPerso,
      per,
      ...rendements,
      annees,
      inflation,
      ...projArgs,
      // ARE : pendant les premières années, capitalisation boost (ratio n'affecte pas la phase ARE)
      anneesAre: anneesAreEff,
      contratCapiAre: areResteSASU * ratioCapi,
      scpiAre: areResteSASU * ratioScpi * (1 - fraisEntreeScpi),
      perAre: arePer,
    });
    const capitalFin = projScenario.total;
    const fiscScenario = fiscalitePonderee(projScenario.capiValue, projScenario.capiBase, projScenario.scpiValue, projScenario.scpiBase, projScenario.peaValue, projScenario.peaBase, per, true, 0, projScenario.perBase);
    const tauxRetraitScenario = Math.max(0, rendementNetDrag - inflation - margeSecurite);
    const revPassif = capitalFin * tauxRetraitScenario * fiscScenario / 12;
    const defl = inflation > 0 ? Math.pow(1 + inflation, annees) : 1;
    return {
      ratio: r,
      divNets: Math.round(dn),
      netMensuel: Math.round(nn / 12),
      capital50: Math.round(capitalFin),
      capital50Reel: Math.round(capitalFin / defl),
      revenuPassif: Math.round(revPassif),
      revenuPassifReel: Math.round(revPassif / defl),
      isSelected: Math.abs(r - ratioDistrib) < 0.001
    };
  });

  return {
    caHT, totalFrais, chargesPatronales, superbrut, salaireNet,
    totalCharges, resultatAvantIS, baseISReduit, baseISNormal,
    isReduit, isNormal, isTotal, tauxEffectifIS, benefDistribuable,
    divBrutsSortis, flatTax, divNets, divNetsMax, ratioDistrib,
    revenuImposableVous, revenuImposableConjoint, revenuImposableFoyer,
    quotientFamilial, irFoyer, votreIR, tmi, tmiRetraite, fiscNetteScpiEff, fiscNettePerEff,
    netNetAnnuel, netNetMensuel,
    resteSASU, contratCapi, scpi, reserveTreso, peaPerso, per, epargneTotale,
    ijSecuMois, complementPrevoyance, totalCouvertMois, provisionRisque, capitalDeces,
    projection, scenariosRatio, annees,
    retraiteBaseMois, retraiteCompMois, retraiteTotaleMois, ageRetraite,
    capitalAtObjectif, capitalHorsPerAtObjectif, drawdownMensuelNet, drawdownAnnuelBrut,
    drawdownAnnuelBrutAvant64, drawdownAnnuelBrutApres64,
    joursMissionsPonctuelles, revenuMissionsAnnuel, inflation,
    // ARE
    anneesAre: anneesAreEff, areResultatAvantIS, areIS, areBenefDistribuable,
    areResteSASU, areContratCapi, areScpi, areReserveTreso, areMensuelNet,
    // EURL
    forme, capitalSocial, cotisationsTNSResult, divCotisationsTNS,
    tauxSortieDistrib: tauxSortieDistribPhase1, tauxSortieDistribPhase2,
  };
}

// ============================================================
// MONTE CARLO — Simulation stochastique avec rendements aléatoires
// ============================================================

// Box-Muller transform : génère une variable normale standard Z ~ N(0,1)
function boxMullerZ() {
  let u1;
  do { u1 = Math.random(); } while (u1 === 0);
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Student-t via ratio of normals : Z * sqrt(df / chi2), chi2 ~ Gamma(df/2, 2)
// Produit des queues plus épaisses qu'une gaussienne (crises type 2008)
// df=5 : kurtosis = 9 (vs 3 pour normal) — calibré sur rendements actions historiques
function studentTZ(df = 5) {
  // chi2 via somme de df normales² (simple et suffisant pour df petit)
  let chi2 = 0;
  for (let i = 0; i < df; i++) { const z = boxMullerZ(); chi2 += z * z; }
  return boxMullerZ() * Math.sqrt(df / chi2);
}

// Décomposition de Cholesky 4×4 de la matrice de corrélation
// Entrée : matrice symétrique définie positive (flat row-major 4×4)
// Sortie : L triangulaire inférieure telle que L × L^T = corr
function cholesky4(corr) {
  const L = new Float64Array(16); // 4×4 row-major
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i * 4 + k] * L[j * 4 + k];
      if (i === j) {
        L[i * 4 + j] = Math.sqrt(Math.max(0, corr[i * 4 + j] - sum));
      } else {
        L[i * 4 + j] = L[j * 4 + j] > 0 ? (corr[i * 4 + j] - sum) / L[j * 4 + j] : 0;
      }
    }
  }
  return L;
}

// Matrice de corrélation par défaut entre classes d'actifs
// Ordre : [capi, scpi, pea, per]
// Sources : corrélations historiques approximatives (actions/immo/mixte)
// capi↔pea : 0.85 (tous deux equity-like, légèrement différents car FID vs ETF)
// capi↔scpi : 0.20 (immo vs actions, corrélation faible)
// capi↔per  : 0.60 (PER mixte contient ~50% actions)
// pea↔scpi  : 0.15 (ETF actions vs immo)
// pea↔per   : 0.55 (actions vs mixte)
// scpi↔per  : 0.25 (immo vs mixte)
const DEFAULT_CORR = [
  //  capi   scpi   pea    per
  1.00, 0.20, 0.85, 0.60,  // capi
  0.20, 1.00, 0.15, 0.25,  // scpi
  0.85, 0.15, 1.00, 0.55,  // pea
  0.60, 0.25, 0.55, 1.00,  // per
];

// Mean reversion AR(1) sur les log-rendements annuels
// phi < 0 : retour à la moyenne (une mauvaise année tend à être suivie d'une bonne)
// Calibration historique S&P 500 : phi ≈ -0.15 sur rendements annuels (Poterba & Summers 1988)
// SCPI : phi ≈ -0.05 (moins de mean reversion, marchés illiquides)
const DEFAULT_PHI = {
  capi: -0.15,
  scpi: -0.05,
  pea:  -0.15,
  per:  -0.10,
};

// Génère N années de rendements corrélés, fat-tailed, mean-reverting
// pour 4 classes d'actifs. Retourne { capi[], scpi[], pea[], per[] }
function generateCorrelatedReturns(nYears, expectedReturns, sigmas, {
  corr = DEFAULT_CORR,
  phi = DEFAULT_PHI,
  dfStudent = 5,
} = {}) {
  const L = cholesky4(corr);
  const keys = ['capi', 'scpi', 'pea', 'per'];
  const mu = keys.map(k => Math.log(1 + expectedReturns[k]));
  const sig = keys.map(k => sigmas[k]);
  const phiArr = keys.map(k => phi[k] || 0);

  const returns = {
    capi: new Float64Array(nYears),
    scpi: new Float64Array(nYears),
    pea:  new Float64Array(nYears),
    per:  new Float64Array(nYears),
  };

  // État AR(1) : écart par rapport à la moyenne (initialisé à 0)
  const prevDeviation = new Float64Array(4);

  for (let y = 0; y < nYears; y++) {
    // 4 innovations indépendantes Student-t
    const eps = [studentTZ(dfStudent), studentTZ(dfStudent), studentTZ(dfStudent), studentTZ(dfStudent)];
    // Normaliser Student-t pour variance unitaire : Var(t_df) = df/(df-2)
    const stdFactor = Math.sqrt((dfStudent - 2) / dfStudent);
    for (let i = 0; i < 4; i++) eps[i] *= stdFactor;

    // Corrélation via Cholesky : z = L × eps
    const z = new Float64Array(4);
    for (let i = 0; i < 4; i++) {
      let sum = 0;
      for (let j = 0; j <= i; j++) sum += L[i * 4 + j] * eps[j];
      z[i] = sum;
    }

    // AR(1) mean reversion : deviation_t = phi * deviation_{t-1} + z_t
    for (let i = 0; i < 4; i++) {
      prevDeviation[i] = phiArr[i] * prevDeviation[i] + z[i];
    }

    // Log-rendement avec mean reversion et volatilité ajustée
    // sigma_eff = sigma * sqrt(1 - phi²) pour conserver la variance marginale
    for (let i = 0; i < 4; i++) {
      const sigEff = sig[i] * Math.sqrt(1 - phiArr[i] * phiArr[i]);
      const logR = mu[i] - sigEff * sigEff / 2 + sigEff * prevDeviation[i];
      returns[keys[i]][y] = Math.exp(logR) - 1;
    }
  }
  return returns;
}

// Projection légère d'une simulation : renvoie {total[], revenuReel[]} par année.
// annualReturns = { capi[y], scpi[y], pea[y], per[y] } — rendements tirés au sort.
// ctx = valeurs déterministes pré-calculées depuis computeAll.
function runProjectionMC(ctx, annualReturns) {
  const {
    ageActuel, ageObjectif, ageFin, ageRetraite, inflation,
    contratCapi, scpiNet, scpi: scpiGross, peaPerso, per,
    partDistribScpi, fraisEntreeScpi, forfaitTME,
    seuilIS, tauxISReduit, tauxISNormal,
    resultatAvantIS, resultatMissions, revenuMissionsAnnuel,
    croquerCapital, drawdownAnnuelBrut,
    provisionRisque, anneesDrawdown,
    netNetMensuel,
    retraiteBaseMois, retraiteCompMois,
    fiscNetteRetraite, fiscNettePerEff, tauxConversionPer,
    tauxFlatTax, tauxSortieDistrib, tauxSortieDistribPhase2 = tauxSortieDistrib, psPea,
    rendementScpiDistrib: rendementScpiDistribDet,
    rendementNetDrag, margeSecurite,
  } = ctx;

  const PLAFOND_PEA = 150000;
  const nYears = ageFin - ageActuel + 1;
  const totals = new Float64Array(nYears);
  const revenus = new Float64Array(nYears);
  const annees = ageObjectif - ageActuel;

  let cumCapi = 0, cumCapiBase = 0, cumScpi = 0, cumScpiBase = 0;
  let cumPea = 0, cumPeaBase = 0, cumPer = 0, cumPerBase = 0;
  let cumForfaitsIS = 0;
  let perRenteAnnuelleBrute = 0;

  for (let y = 0; y < nYears; y++) {
    const age = ageActuel + y;
    const phase = age < ageObjectif ? 1 : age < ageRetraite ? 2 : 3;
    const infY = Math.pow(1 + inflation, y);

    if (y === 0) {
      totals[0] = provisionRisque;
      revenus[0] = netNetMensuel;
      continue;
    }

    // Rendements stochastiques pour cette année
    const rCapi = annualReturns.capi[y];
    const rScpi = annualReturns.scpi[y];
    const rPea  = annualReturns.pea[y];
    const rPer  = annualReturns.per[y];
    const rScpiEffectif = rScpi * (1 - partDistribScpi * fraisEntreeScpi);
    const rScpiDistrib  = rScpi * partDistribScpi;

    let actualWithdrawal = 0;

    if (phase === 1) {
      cumCapi = cumCapi * (1 + rCapi) + contratCapi * infY;
      cumCapiBase += contratCapi * infY;
      const cumScpiAvant = cumScpi;
      cumScpi = cumScpi * (1 + rScpiEffectif) + scpiNet * infY;
      cumScpiBase += scpiGross * infY;
      // Base SCPI : distributions réinvesties
      const distribBrut = cumScpiAvant * rScpiDistrib;
      const tauxISEst = tauxISNormal; // simplifié pour perf MC
      cumScpiBase += Math.max(0, distribBrut * (1 - tauxISEst) * (1 - fraisEntreeScpi));
      const peaV = Math.min(peaPerso * infY, Math.max(0, PLAFOND_PEA - cumPeaBase));
      cumPea = cumPea * (1 + rPea) + peaV;
      cumPeaBase += peaV;
      cumPer = cumPer * (1 + rPer) + per * infY;
      cumPerBase += per * infY;
    } else if (croquerCapital) {
      const perDebloque = age >= 64;
      const anneesDepuisPhase = age - ageObjectif;
      const currentDrawdown = drawdownAnnuelBrut * Math.pow(1 + inflation, anneesDepuisPhase);

      const poolCapi = cumCapi * (1 + rCapi);
      const poolScpi = cumScpi * (1 + rScpiEffectif);
      const poolPea = cumPea * (1 + rPea);
      const poolPer = cumPer * (1 + rPer);

      const totalPool = perDebloque
        ? poolCapi + poolScpi + poolPea + poolPer
        : poolCapi + poolScpi + poolPea;
      actualWithdrawal = Math.min(currentDrawdown, totalPool);

      if (totalPool > 0) {
        const rc = poolCapi / totalPool, rs = poolScpi / totalPool, rp = poolPea / totalPool;
        const prevC = poolCapi; cumCapi = poolCapi - actualWithdrawal * rc;
        cumCapiBase = prevC > 0 ? cumCapiBase * (cumCapi / prevC) : 0;
        const prevS = poolScpi; cumScpi = poolScpi - actualWithdrawal * rs;
        cumScpiBase = prevS > 0 ? cumScpiBase * (cumScpi / prevS) : 0;
        const prevP = poolPea; cumPea = poolPea - actualWithdrawal * rp;
        cumPeaBase = prevP > 0 ? cumPeaBase * (cumPea / prevP) : 0;
        if (perDebloque) {
          const rpe = poolPer / totalPool;
          const prevPe = poolPer; cumPer = poolPer - actualWithdrawal * rpe;
          cumPerBase = prevPe > 0 ? cumPerBase * (cumPer / prevPe) : 0;
        } else {
          cumPer = poolPer;
        }
      } else {
        cumCapi = poolCapi; cumScpi = poolScpi; cumPea = poolPea; cumPer = poolPer;
      }
      cumCapi = Math.max(0, cumCapi); cumScpi = Math.max(0, cumScpi);
      cumPea = Math.max(0, cumPea); cumPer = Math.max(0, cumPer);
    } else {
      // Mode rente perpétuelle
      cumCapi = cumCapi * (1 + rCapi);
      cumScpi = cumScpi * (1 + rScpiEffectif);
      if (phase === 2) {
        const peaContrib = Math.min(
          Math.min(peaPerso / 2, revenuMissionsAnnuel) * infY,
          Math.max(0, PLAFOND_PEA - cumPeaBase)
        );
        cumPea = cumPea * (1 + rPea) + peaContrib;
        cumPeaBase += peaContrib;
      } else {
        cumPea = cumPea * (1 + rPea);
      }
      cumPer = cumPer * (1 + rPer);
      if (age === 64 && perRenteAnnuelleBrute === 0 && cumPer > 0) {
        perRenteAnnuelleBrute = cumPer * tauxConversionPer;
        cumPer = 0; cumPerBase = 0;
      }
    }

    // IS drag annuel (forfait TME + distributions SCPI)
    const forfaitAnnuel = cumCapiBase > 0 ? cumCapiBase * forfaitTME : 0;
    const revenuScpiAnnuel = cumScpi > 0 ? cumScpi * rScpiDistrib : 0;
    const totalRevPlacements = forfaitAnnuel + revenuScpiAnnuel;
    const resultatMissionsY = phase === 2 ? resultatMissions * infY : 0;
    const resultatExploitationY = phase === 1 ? resultatAvantIS * infY : resultatMissionsY;
    const totalResultatSociete = resultatExploitationY + totalRevPlacements;
    const isTotalSociete = Math.min(totalResultatSociete, seuilIS) * tauxISReduit
      + Math.max(0, totalResultatSociete - seuilIS) * tauxISNormal;

    if (totalRevPlacements > 0 && totalResultatSociete > 0) {
      const ratioPl = totalRevPlacements / totalResultatSociete;
      const isPl = isTotalSociete * ratioPl;
      if (forfaitAnnuel > 0) {
        cumCapi = Math.max(0, cumCapi - isPl * (forfaitAnnuel / totalRevPlacements));
        cumForfaitsIS += forfaitAnnuel;
      }
      if (revenuScpiAnnuel > 0) {
        cumScpi = Math.max(0, cumScpi - isPl * (revenuScpiAnnuel / totalRevPlacements));
      }
    }

    // Provision risque (amortie en mode croquer)
    const anneesDepuisObjectif = age - ageObjectif;
    const tresoRestante = (croquerCapital && phase >= 2)
      ? Math.max(0, provisionRisque * (1 - anneesDepuisObjectif / anneesDrawdown))
      : provisionRisque;

    const totalHorsPer = cumCapi + cumScpi + cumPea + tresoRestante;
    const totalAvecPer = totalHorsPer + cumPer;
    totals[y] = totalAvecPer;

    // Revenu mensuel réel (simplifié pour perf MC)
    const deflate = inflation > 0 ? 1 / Math.pow(1 + inflation, y) : 1;
    const sousIndexationArrco = Math.pow(1 - 0.003, y);

    if (phase === 1) {
      revenus[y] = netNetMensuel; // déjà en réel (constant)
    } else if (croquerCapital) {
      // Drawdown net estimé (fiscalité simplifiée — ratio gains/base approximé)
      const totalVal = cumCapi + cumScpi + cumPea + cumPer;
      const totalBase = cumCapiBase + cumScpiBase + cumPeaBase + cumPerBase;
      const ratioGains = totalVal > 0 ? Math.max(0, totalVal - totalBase) / totalVal : 0;
      const fiscEst = 1 - ratioGains * tauxSortieDistribPhase2; // approximation conservatrice
      const drawdownNet = actualWithdrawal * fiscEst;
      const retraiteBrut = phase === 3
        ? (retraiteBaseMois + retraiteCompMois * sousIndexationArrco) : 0;
      const retraiteNet = retraiteBrut * (fiscNetteRetraite || 1);
      const revenuMissionsNet = (phase === 2 && resultatMissionsY > 0 && totalResultatSociete > 0)
        ? (resultatMissionsY - isTotalSociete * (resultatMissionsY / totalResultatSociete)) * (1 - tauxSortieDistribPhase2) / 12
        : 0;
      revenus[y] = drawdownNet * deflate / 12 + revenuMissionsNet * deflate + retraiteNet;
    } else {
      // Mode rente perpétuelle
      const tauxRetrait = Math.max(0, rendementNetDrag - inflation - margeSecurite);
      // Fiscalité simplifiée (ratio gains/base)
      const totalVal = cumCapi + cumScpi + cumPea;
      const totalBase = cumCapiBase + cumScpiBase + cumPeaBase;
      const ratioGains = totalVal > 0 ? Math.max(0, totalVal - totalBase) / totalVal : 0;
      const fiscEst = 1 - ratioGains * tauxSortieDistribPhase2;
      const revenuPassif = totalHorsPer * tauxRetrait * fiscEst / 12;
      const perRente = (!croquerCapital && perRenteAnnuelleBrute > 0)
        ? perRenteAnnuelleBrute * (fiscNettePerEff || 1) / 12 : 0;
      const retraiteBrut = phase === 3
        ? (retraiteBaseMois + retraiteCompMois * sousIndexationArrco) : 0;
      const retraiteNet = retraiteBrut * (fiscNetteRetraite || 1);
      const revenuMissionsNet = (phase === 2 && resultatMissionsY > 0 && totalResultatSociete > 0)
        ? (resultatMissionsY - isTotalSociete * (resultatMissionsY / totalResultatSociete)) * (1 - tauxSortieDistribPhase2) / 12
        : 0;
      revenus[y] = revenuPassif * deflate + perRente * deflate + retraiteNet + revenuMissionsNet * deflate;
    }
  }
  return { totals, revenus };
}

// Orchestrateur Monte Carlo : lance N simulations et renvoie les percentiles.
// Prend les mêmes params que computeAll + volatilités.
export function computeMonteCarloProjection(params, det, {
  volCapi = 0.15,
  volScpi = 0.05,
  volPea  = 0.18,
  volPer  = 0.10,
  nSimulations = 500,
} = {}) {
  const {
    rendementCapi: rendementCapi_ = params.rendement,
    rendementScpi: rendementScpi_ = params.rendement,
    rendementPea:  rendementPea_  = params.rendement,
    rendementPer:  rendementPer_  = params.rendement,
  } = params;
  const rendementCapi = rendementCapi_;
  const rendementScpi = rendementScpi_;
  const rendementPea  = rendementPea_;
  const rendementPer  = rendementPer_;
  const partDistribScpi = params.partDistribScpi || DEFAULTS.partDistribScpi;
  const fraisEntreeScpi = params.fraisEntreeScpi || DEFAULTS.fraisEntreeScpi;

  const nYears = (params.ageFin || DEFAULTS.ageFin) - (params.ageActuel || DEFAULTS.ageActuel) + 1;

  // Contexte déterministe (calculé une seule fois)
  const ctx = {
    ageActuel: params.ageActuel || DEFAULTS.ageActuel,
    ageObjectif: params.ageObjectif || DEFAULTS.ageObjectif,
    ageFin: params.ageFin || DEFAULTS.ageFin,
    ageRetraite: 67,
    inflation: det.inflation,
    contratCapi: det.contratCapi,
    scpiNet: det.scpi * (1 - fraisEntreeScpi),
    scpi: det.scpi,
    peaPerso: det.peaPerso,
    per: det.per,
    partDistribScpi,
    fraisEntreeScpi,
    forfaitTME: 1.05 * (params.tme || DEFAULTS.tme),
    seuilIS: params.seuilIS || DEFAULTS.seuilIS,
    tauxISReduit: params.tauxISReduit || DEFAULTS.tauxISReduit,
    tauxISNormal: params.tauxISNormal || DEFAULTS.tauxISNormal,
    resultatAvantIS: det.resultatAvantIS,
    resultatMissions: Math.max(0, (params.tjm || DEFAULTS.tjm) * (params.joursLeverLePied || DEFAULTS.joursLeverLePied) - ((params.frais?.comptable || 0) + (params.frais?.rcPro || 0) + (params.frais?.cfe || 0) + (params.frais?.banque || 0) + (params.frais?.mutuelle || 0) + (params.frais?.prevoyance || 0))),
    revenuMissionsAnnuel: det.revenuMissionsAnnuel,
    croquerCapital: params.croquerCapital || false,
    drawdownAnnuelBrut: det.drawdownAnnuelBrut,
    provisionRisque: det.provisionRisque,
    anneesDrawdown: (params.ageFin || DEFAULTS.ageFin) - (params.ageObjectif || DEFAULTS.ageObjectif),
    netNetMensuel: det.netNetMensuel,
    retraiteBaseMois: det.retraiteBaseMois,
    retraiteCompMois: det.retraiteCompMois,
    fiscNetteRetraite: det.fiscNettePerEff, // même formule (pension)
    fiscNettePerEff: det.fiscNettePerEff,
    tauxConversionPer: params.tauxConversionPer || DEFAULTS.tauxConversionPer,
    tauxFlatTax: params.tauxFlatTax || DEFAULTS.tauxFlatTax,
    tauxSortieDistrib: det.tauxSortieDistrib, tauxSortieDistribPhase2: det.tauxSortieDistribPhase2,
    psPea: params.psPea || DEFAULTS.psPea,
    rendementScpiDistrib: rendementScpi * partDistribScpi,
    rendementNetDrag: 0, // calculé ci-dessous
    margeSecurite: params.margeSecurite || DEFAULTS.margeSecurite,
  };

  // Calcul du rendementNetDrag depuis le résultat déterministe
  // (réutilise la logique de computeAll pour la pondération)
  const projHP = det.projection.find(p => p.age === ctx.ageObjectif);
  if (projHP) {
    const vC = projHP.capi || 0, vS = projHP.scpiVal || 0, vP = projHP.pea || 0;
    const tot = vC + vS + vP;
    if (tot > 0) {
      const wC = vC / tot, wS = vS / tot, wP = vP / tot;
      const rScpiEff = rendementScpi * (1 - partDistribScpi * fraisEntreeScpi);
      const rendPond = wC * rendementCapi + wS * rScpiEff + wP * rendementPea;
      const dragCapi = ctx.forfaitTME * ctx.tauxISNormal * 0.5; // ratio base/valeur approx
      const dragScpi = rendementScpi * partDistribScpi * ctx.tauxISNormal;
      const dragMoyen = wC * dragCapi + wS * dragScpi;
      ctx.rendementNetDrag = Math.max(0, rendPond - dragMoyen);
    }
  }

  // Collecter les résultats : [year][simulation]
  const allTotals = new Array(nYears).fill(null).map(() => new Float64Array(nSimulations));
  const allRevenus = new Array(nYears).fill(null).map(() => new Float64Array(nSimulations));

  const expectedReturns = { capi: rendementCapi, scpi: rendementScpi, pea: rendementPea, per: rendementPer };
  const sigmas = { capi: volCapi, scpi: volScpi, pea: volPea, per: volPer };

  for (let sim = 0; sim < nSimulations; sim++) {
    // Rendements corrélés, fat-tailed (Student-t df=5), mean-reverting (AR(1))
    const returns = generateCorrelatedReturns(nYears, expectedReturns, sigmas);

    const { totals, revenus } = runProjectionMC(ctx, returns);
    for (let y = 0; y < nYears; y++) {
      allTotals[y][sim] = totals[y];
      allRevenus[y][sim] = revenus[y];
    }
  }

  // Calculer les percentiles
  const percentiles = [10, 25, 50, 75, 90];
  const projection = [];
  for (let y = 0; y < nYears; y++) {
    const sortedT = Array.from(allTotals[y]).sort((a, b) => a - b);
    const sortedR = Array.from(allRevenus[y]).sort((a, b) => a - b);
    const entry = { age: ctx.ageActuel + y, annee: 2026 + y };
    for (const p of percentiles) {
      const idx = Math.min(Math.floor(p / 100 * nSimulations), nSimulations - 1);
      entry[`totalP${p}`] = Math.round(sortedT[idx]);
      entry[`revenuP${p}`] = Math.round(sortedR[idx]);
    }
    projection.push(entry);
  }

  // Taux de survie du capital (mode croquer : % de runs avec capital > 0 à ageFin)
  const lastIdx = nYears - 1;
  const survived = Array.from(allTotals[lastIdx]).filter(v => v > 0).length;

  return {
    projection,
    survivalRate: survived / nSimulations,
    nSimulations,
  };
}

// ============================================================
// FORMATAGE TEXTE — Source unique pour CLI et bouton "Copy to LLM"
// ============================================================

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtPct = (n) => `${(n * 100).toFixed(1)}%`;

export function formatReport({ tjm, jours, salaireBrut, per, divNetsVoulus, rendementCapi, rendementScpi, rendementPea, rendementPer, inflation, ageActuel, ageObjectif, joursLeverLePied, croquerCapital, ageFin, ratioTreso, ratioCapi, salaireBrutCDI, anneesAre, r }) {
  const isEurl = r.forme === 'eurl';
  const formeLabel = isEurl ? 'EURL' : 'SASU';
  const areFlag = r.anneesAre > 0 ? ` --anneesAre ${r.anneesAre} --salaireBrutCDI ${salaireBrutCDI}` : '';
  const formeFlag = isEurl ? ` --forme eurl --capitalSocial ${r.capitalSocial}` : '';
  const cmd = `node cli.js --step4 --tjm ${tjm} --jours ${jours} --salaireBrut ${salaireBrut} --per ${per} --divNetsVoulus ${divNetsVoulus} --rendementCapi ${rendementCapi} --rendementScpi ${rendementScpi} --rendementPea ${rendementPea} --rendementPer ${rendementPer} --inflation ${inflation} --ageActuel ${ageActuel} --ageObjectif ${ageObjectif} --joursLeverLePied ${joursLeverLePied} --croquerCapital ${croquerCapital} --ageFin ${ageFin} --ratioTreso ${ratioTreso} --ratioCapi ${ratioCapi}${areFlag}${formeFlag}`;

  const L = [];
  L.push(`$ ${cmd}`);
  L.push('');

  // Step 1
  L.push(`═══ STEP 1 : CHIFFRE D'AFFAIRES ═══`);
  L.push(`  TJM          : ${fmt(tjm)}`);
  L.push(`  Jours/an     : ${jours}`);
  L.push(`  CA HT        : ${fmt(r.caHT)}`);
  L.push('');

  // Step 2
  L.push(`═══ STEP 2 : CHARGES FIXES ═══`);
  L.push(`  Charges fixes   : ${fmt(r.totalFrais - (r.per || 0))}`);
  L.push(`  PER             : ${fmt(r.per)}`);
  L.push(`  Total charges   : ${fmt(r.totalFrais)}`);
  L.push('');

  // Step 3
  L.push(`═══ STEP 3 : RÉPARTITION & RÉSULTAT (${formeLabel}) ═══`);
  if (isEurl) {
    const tns = r.cotisationsTNSResult;
    L.push(`  Rémunération     : ${fmt(salaireBrut)} (coût société = rémunération)`);
    L.push(`  Cotisations TNS  : ${fmt(tns.total)} (${fmtPct(tns.tauxEffectif)})`);
    L.push(`    Maladie        : ${fmt(tns.maladie + tns.maladieIJ)}`);
    L.push(`    Retraite base  : ${fmt(tns.retraiteBase)}`);
    L.push(`    Retraite compl.: ${fmt(tns.retraiteCompl)} (SSI)`);
    L.push(`    Invalidité     : ${fmt(tns.invaliditeDeces)}`);
    L.push(`    AF             : ${fmt(tns.af)}`);
    L.push(`    CSG-CRDS       : ${fmt(tns.csgCrds)}`);
    L.push(`    CFP            : ${fmt(tns.cfp)}`);
    L.push(`  Net gérant       : ${fmt(r.salaireNet)}`);
  } else {
    L.push(`  Salaire brut    : ${fmt(salaireBrut)} → superbrut ${fmt(r.superbrut)}`);
    L.push(`  Salaire net     : ${fmt(r.salaireNet)}`);
  }
  L.push(`  Résultat av. IS : ${fmt(r.resultatAvantIS)}`);
  L.push(`  IS (${fmtPct(r.tauxEffectifIS)})    : ${fmt(r.isTotal)}`);
  L.push(`  Bénéf. distrib. : ${fmt(r.benefDistribuable)}`);
  if (isEurl && r.divCotisationsTNS > 0) {
    L.push(`  Dividendes nets : ${fmt(r.divNets)} (flat tax: ${fmt(r.flatTax)} + TNS div: ${fmt(r.divCotisationsTNS)})`);
    L.push(`    ⚠ Div. > 10% capital (${fmt(r.capitalSocial)}) → cotisations TNS`);
  } else {
    L.push(`  Dividendes nets : ${fmt(r.divNets)} (flat tax: ${fmt(r.flatTax)})`);
  }
  L.push(`  IR (votre part) : ${fmt(r.votreIR)} (TMI: ${fmtPct(r.tmi)})`);
  L.push(`  ► NET NET /AN   : ${fmt(r.netNetAnnuel)}`);
  L.push(`  ► NET NET /MOIS : ${fmt(r.netNetMensuel)}`);
  L.push('');
  L.push(`  Capitalisation :`);
  L.push(`    Reste en ${formeLabel}     : ${fmt(r.resteSASU)}`);
  L.push(`    Contrat capi      : ${fmt(r.contratCapi)}`);
  L.push(`    SCPI              : ${fmt(r.scpi)}`);
  L.push(`    Provision risque   : ${fmt(r.reserveTreso)}`);
  L.push(`    PEA perso         : ${fmt(r.peaPerso)}`);
  L.push(`    Épargne totale/an : ${fmt(r.epargneTotale)}`);
  L.push('');

  // ARE phase (si activée)
  if (r.anneesAre > 0) {
    L.push(`  ═══ PHASE ARE (${r.anneesAre} an${r.anneesAre > 1 ? 's' : ''}) ═══`);
    L.push(`  Revenu perso      : ${fmt(r.areMensuelNet)}/mois (ARE, basé sur ${fmt(salaireBrutCDI)} brut CDI)`);
    L.push(`  SASU (0 salaire, 0 dividende) :`);
    L.push(`    Résultat av. IS : ${fmt(r.areResultatAvantIS)}`);
    L.push(`    IS              : ${fmt(r.areIS)}`);
    L.push(`    Reste en SASU   : ${fmt(r.areResteSASU)}`);
    L.push(`    Contrat capi    : ${fmt(r.areContratCapi)}`);
    L.push(`    SCPI            : ${fmt(r.areScpi)}`);
    L.push(`    Provision risque: ${fmt(r.areReserveTreso)}`);
    L.push('');
  }

  // Step 4
  L.push(`═══ STEP 4 : PROJECTION LONG TERME ═══`);
  L.push(`  Rendement capi  : ${fmtPct(rendementCapi)} | SCPI : ${fmtPct(rendementScpi)} | PEA : ${fmtPct(rendementPea)} | PER : ${fmtPct(rendementPer)}`);
  L.push(`  Inflation       : ${fmtPct(inflation)}`);
  L.push(`  Objectif        : ${ageObjectif} ans (${r.annees} ans de freelance)`);
  L.push(`  Jours lever pied: ${joursLeverLePied} j/an`);
  L.push(`  Mode            : ${croquerCapital ? 'Consommer le capital' : 'Rente perpétuelle'}`);
  if (croquerCapital) L.push(`  Capital à 0 à   : ${ageFin} ans`);
  L.push('');

  L.push('  Timeline :');
  if (inflation > 0) {
    L.push(`  Age  Phase            Patrimoine     Total/m    (€ ${new Date().getFullYear()})  Patrimoine réel`);
    L.push('  ' + '─'.repeat(95));
  } else {
    L.push('  Age  Phase            Patrimoine     Rev.passif/m  Missions/m  Retraite/m  Total/m');
    L.push('  ' + '─'.repeat(90));
  }
  const keyAges = new Set([ageActuel, ageObjectif, ageObjectif + 1, 64, 67, 75, ageFin]);
  if (r.anneesAre > 0) keyAges.add(ageActuel + r.anneesAre); // fin de la phase ARE
  for (const p of r.projection) {
    if (keyAges.has(p.age)) {
      if (inflation > 0) {
        L.push(
          `  ${String(p.age).padStart(3)}  ${p.label.padEnd(16)} ${fmt(p.total).padStart(14)}  ${fmt(p.revenuTotalMois).padStart(8)}  ${fmt(p.revenuTotalMoisReel).padStart(10)}  ${fmt(p.totalReel).padStart(14)}`
        );
      } else {
        L.push(
          `  ${String(p.age).padStart(3)}  ${p.label.padEnd(16)} ${fmt(p.total).padStart(14)}  ${fmt(p.revenuPassifMois).padStart(12)}  ${fmt(p.missionsMois).padStart(10)}  ${fmt(p.retraiteMois).padStart(10)}  ${fmt(p.revenuTotalMois).padStart(8)}`
        );
      }
    }
  }
  L.push('');

  // Scénarios
  L.push('  Scénarios dividendes vs capitalisation :');
  L.push('  Div.nets/an   Ratio    Net/mois    Capital@' + ageObjectif + '    Rente/m@' + ageObjectif);
  L.push('  ' + '─'.repeat(72));
  for (const s of r.scenariosRatio) {
    const marker = s.isSelected ? ' ◄' : '';
    L.push(
      `  ${fmt(s.divNets).padStart(11)}  ${fmtPct(s.ratio).padStart(6)}  ${fmt(s.netMensuel).padStart(10)}  ${fmt(s.capital50).padStart(14)}  ${fmt(s.revenuPassif).padStart(12)}${marker}`
    );
  }
  L.push('');

  // Jalons
  const age50 = r.projection.find(p => p.age === ageObjectif);
  const age64 = r.projection.find(p => p.age === 64);
  const age67 = r.projection.find(p => p.age === 67);
  const age75 = r.projection.find(p => p.age === 75);
  L.push('  Jalons de vie (€ 2026) :');
  if (r.anneesAre > 0) {
    L.push(`    ARE (maintenant)     : ${fmt(r.areMensuelNet)}/mois (chômage) + ${formeLabel} capitalise ${fmt(r.areResteSASU)}/an`);
    L.push(`    Freelance (${ageActuel + r.anneesAre} ans)   : ${fmt(r.netNetMensuel)}/mois`);
  } else {
    L.push(`    Freelance (maintenant): ${fmt(r.netNetMensuel)}/mois`);
  }
  if (age50) L.push(`    ${ageObjectif} ans (lever pied)  : ${fmt(age50.revenuTotalMoisReel)}/mois | patrimoine ${fmt(age50.totalReel)}`);
  if (age64) L.push(`    64 ans (PER débloqué) : ${fmt(age64.revenuTotalMoisReel)}/mois | patrimoine ${fmt(age64.totalReel)}`);
  if (age67) L.push(`    67 ans (retraite)     : ${fmt(age67.revenuTotalMoisReel)}/mois | patrimoine ${fmt(age67.totalReel)}`);
  if (age75) L.push(`    75 ans                : ${fmt(age75.revenuTotalMoisReel)}/mois | patrimoine ${fmt(age75.totalReel)}`);

  return L.join('\n');
}
