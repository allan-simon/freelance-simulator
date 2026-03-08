// ============================================================
// MOTEUR DE CALCUL — Source unique de vérité
// Utilisé par App.jsx (React) ET cli.js (Node)
// ============================================================

export const DEFAULTS = {
  tjm: 1200,
  jours: 220,
  salaireBrut: 60000,
  divNetsVoulus: 40000,
  rendement: 0.06, // fallback si un seul rendement est fourni (CLI, URL legacy)
  rendementCapi: 0.06,  // contrat capi lux, FID actions diversifié
  rendementScpi: 0.045, // SCPI, loyers nets de frais de gestion
  rendementPea:  0.07,  // PEA, ETF actions européennes
  rendementPer:  0.05,  // PER, allocation mixte/défensive
  ageObjectif: 50,
  joursLeverLePied: 50,
  croquerCapital: false,
  ageFin: 80,
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
  // Constantes réglementaires 2026
  // Fiscalité nette par enveloppe (1 - prélèvements) — utilisée pour pondérer les retraits
  // fiscNetteCapi : calculée dynamiquement (IS sur gains + flat tax sur distribution)
  // fiscNetteScpi : calculée dynamiquement (IS + flat tax — SCPI détenues par la SASU)
  // fiscNettePer  : calculée dynamiquement (TMI réelle × 90% + PS pension 9,1%)
  fiscNettePea:  0.814,  // PEA > 5 ans : PS seules 18,6% — seule constante (indépendante de la TMI)
  seuilIS: 42500,
  tauxISReduit: 0.15,
  tauxISNormal: 0.25,
  tauxFlatTax: 0.314,
  abattementIR: 0.10,
  revenuConjoint: 16800,
  partsFiscales: 2.5,
  ageActuel: 36,
  inflation: 0.02,
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
};

// Calcule les contraintes dynamiques (max salary, max PER, max dividendes)
// à partir des inputs step1 + step2
export function computeConstraints({
  tjm, jours, frais, salaireBrut, per,
  seuilIS = DEFAULTS.seuilIS, tauxISReduit = DEFAULTS.tauxISReduit,
  tauxISNormal = DEFAULTS.tauxISNormal, tauxFlatTax = DEFAULTS.tauxFlatTax,
}) {
  const caHT = tjm * jours;
  const totalFraisHorsPer = Object.values(frais).reduce((a, b) => a + b, 0);
  // Pour le max salaire, on cherche le brut tel que brut + charges(brut) ≤ disponible
  // Approximation itérative : on part d'une estimation haute et on converge
  const disponible = caHT - totalFraisHorsPer;
  let maxBrut = disponible; // borne haute
  for (let i = 0; i < 10; i++) {
    maxBrut = disponible - computeChargesPatronales(maxBrut);
  }
  const maxSalaireBrut = Math.floor(Math.max(0, maxBrut) / 5000) * 5000;
  const salaireBrutEffectif = Math.min(salaireBrut, maxSalaireBrut);
  const chargesP = computeChargesPatronales(salaireBrutEffectif);
  const superbrut = salaireBrutEffectif + chargesP;
  const maxPer = Math.max(0, Math.floor((caHT - superbrut - totalFraisHorsPer) / 500) * 500);
  const perEffectif = Math.min(per, maxPer);
  const totalFrais = totalFraisHorsPer + perEffectif;

  const resultat = Math.max(0, caHT - superbrut - totalFrais);
  const is = Math.min(resultat, seuilIS) * tauxISReduit + Math.max(0, resultat - seuilIS) * tauxISNormal;
  const maxDivNets = Math.floor((resultat - is) * (1 - tauxFlatTax) / 1000) * 1000;

  return {
    caHT,
    totalFraisHorsPer,
    maxSalaireBrut,
    salaireBrutEffectif,
    maxPer,
    perEffectif,
    maxDivNets,
  };
}

// Projection du capital à l'objectif — utilisé par le calcul principal ET le solveur
// Les contributions croissent avec l'inflation (le CA/résultat croît avec le TJM)
// Le forfait IS annuel (CGI 238 septies E : 105% TME × versements nets) est déduit du contrat capi
export function computeCapitalProjection({ contratCapi, scpi, peaPerso, per, rendementCapi, rendementScpi, rendementPea, rendementPer, annees, inflation = 0, tme = 0.0345, tauxISEffectif = 0.25 }) {
  let tc = 0, tcBase = 0, ts = 0, tp = 0, tpe = 0;
  const forfaitTME = 1.05 * tme;
  for (let y = 1; y <= annees; y++) {
    const infY = Math.pow(1 + inflation, y);
    tc = tc * (1 + rendementCapi) + contratCapi * infY;
    tcBase += contratCapi * infY;
    // Forfait IS annuel sur le contrat capi
    if (tcBase > 0) tc = Math.max(0, tc - tcBase * forfaitTME * tauxISEffectif);
    ts = ts * (1 + rendementScpi) + scpi * infY;
    tp = tp * (1 + rendementPea) + peaPerso * infY;
    tpe = tpe * (1 + rendementPer) + per * infY;
  }
  return { total: tc + ts + tp + tpe, capiValue: tc, capiBase: tcBase };
}

// Estimation retraite réaliste (base régime général + complémentaire AGIRC-ARRCO)
// Hypothèses : début carrière à 22 ans, taux plein à 67 ans, pas de cotisation après ageObjectif
// Sources :
//   - Pension base : SAM × 50% × prorata — service-public.fr/particuliers/vosdroits/F21552
//   - SAM (25 meilleures années plafonnées PASS) — legislation.cnav.fr
//   - Points AGIRC-ARRCO : taux calcul T1=6,20%, T2=17,00% — agirc-arrco.fr
//   - Prix achat point 2024 : 19,6321 € — Valeur service : 1,4159 € — agirc-arrco.fr
//   - Trimestres requis génération ~1990 : 172 (43 ans) — service-public.fr/particuliers/vosdroits/F35063
export function computeRetraite({ salaireBrutCDI, salaireBrut, ageActuel, ageObjectif }) {
  const AGE_DEBUT = 22;
  const AGE_RETRAITE = 67;
  const TRIMESTRES_REQUIS = 172; // génération ~1990
  const PASS_RET = PASS; // plafond annuel sécu

  const anneesCDI = Math.max(0, ageActuel - AGE_DEBUT);
  const anneesFreelance = Math.max(0, Math.min(ageObjectif, AGE_RETRAITE) - ageActuel);
  const totalAnnees = anneesCDI + anneesFreelance;
  const trimestres = Math.min(totalAnnees * 4, TRIMESTRES_REQUIS);

  // SAM : 25 meilleures années, salaires plafonnés au PASS
  // Courbe salariale CDI : progression ~2,5%/an nominal (inflation + ancienneté/mérite)
  // salaireBrutCDI = salaire actuel (point d'arrivée), on reconstitue la trajectoire
  const PROGRESSION_SAL = 0.025; // 2,5%/an nominal — INSEE cadres, moyenne long terme
  const salFL = Math.min(salaireBrut, PASS_RET);

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
    // Collecter toutes les années (CDI progressif + freelance constant)
    const years = [...salairesCDI];
    for (let i = 0; i < anneesFreelance; i++) years.push(salFL);
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

  // Points freelance (SASU) — salaire constant
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

// Moteur principal — IDENTIQUE à ce qui tourne dans l'UI
export function computeAll(params) {
  const {
    tjm, jours, salaireBrut, divNetsVoulus,
    seuilIS, tauxISReduit, tauxISNormal,
    tauxFlatTax, abattementIR, revenuConjoint, partsFiscales,
    fiscNettePea = DEFAULTS.fiscNettePea,
    frais, rendement: rendementGlobal, ageActuel, ageObjectif,
    croquerCapital = false, ageFin = 80, joursLeverLePied = 50, tauxConversionPer = 0.035, tme = 0.0345,
    ratioTreso = 0.15, ratioCapi = 0.65,
    salaireBrutCDI = 45000,
    inflation = 0.02,
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

  // --- CA ---
  const caHT = tjm * jours;

  // --- Frais pro ---
  const totalFrais = Object.values(frais).reduce((a, b) => a + b, 0);

  // --- Charges salaire (calcul exact par tranche) ---
  const chargesPatronales = computeChargesPatronales(salaireBrut);
  const superbrut = salaireBrut + chargesPatronales;
  const cotisationsSalariales = computeCotisationsSalariales(salaireBrut);
  const salaireNet = salaireBrut - cotisationsSalariales;

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
  const divNetsMax = divBrutsMax * (1 - tauxFlatTax);
  const divNets = Math.min(divNetsVoulus, divNetsMax);
  const divBrutsSortis = divNets / (1 - tauxFlatTax);
  const flatTax = divBrutsSortis * tauxFlatTax;
  const ratioDistrib = divBrutsMax > 0 ? divBrutsSortis / divBrutsMax : 0;

  // --- IR (barème 2025) ---
  const netImposable = computeNetImposable(salaireBrut);
  const revenuImposableVous = netImposable * (1 - abattementIR);
  const revenuImposableConjoint = revenuConjoint * (1 - abattementIR);
  const revenuImposableFoyer = revenuImposableVous + revenuImposableConjoint;
  const quotientFamilial = revenuImposableFoyer / partsFiscales;

  const tranches = [
    { seuil: 0, taux: 0 },
    { seuil: 11600, taux: 0.11 },
    { seuil: 29579, taux: 0.30 },
    { seuil: 84577, taux: 0.41 },
    { seuil: 181917, taux: 0.45 },
  ];

  let irParPart = 0;
  let tmi = 0;
  for (let i = 1; i < tranches.length; i++) {
    const plafond = i < tranches.length - 1 ? tranches[i + 1].seuil : Infinity;
    const base = Math.max(0, Math.min(quotientFamilial, plafond) - tranches[i].seuil);
    irParPart += base * tranches[i].taux;
    if (base > 0) tmi = tranches[i].taux;
  }
  const irFoyer = irParPart * partsFiscales;
  const votreIR = revenuImposableFoyer > 0 ? irFoyer * (revenuImposableVous / revenuImposableFoyer) : 0;

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
  const ratioScpiEff = Math.max(0, 1 - ratioTreso - ratioCapi);
  const resteSASUEstime = benefDistribuable - divBrutsSortis;
  const revenuScpiEstime = (resteSASUEstime * ratioScpiEff) * rendementScpi;
  const fiscNetteScpiEff = (1 - tauxISMoyen(revenuScpiEstime)) * (1 - tauxFlatTax);
  const fiscNettePerEff  = 1 - tmi * 0.90 - 0.091;  // rente PER : TMI × 90% (abattement pension) + PS pension 9,1%

  // Contrat capi détenu par la SASU (CGI art. 238 septies E) :
  // - Pendant la détention : IS annuel sur forfait (versements nets × 105% × TME)
  //   → déduit de cumCapi dans la boucle, tracké dans cumForfaitsIS
  // - Au rachat : régularisation IS sur max(0, gains réels - forfaits cumulés), puis flat tax
  const forfaitTME = 1.05 * tme; // taux forfaitaire annuel appliqué aux versements nets
  const computeFiscNetteCapi = (value, basis, cumForfaits) => {
    if (value <= 0) return 1 - tauxFlatTax;
    const gain = Math.max(0, value - basis);
    // Régularisation au rachat : IS seulement sur l'excédent de gain réel vs forfaits déjà taxés
    const gainNonEncoreTaxe = Math.max(0, gain - (cumForfaits || 0));
    const isRegul = Math.min(gainNonEncoreTaxe, seuilISRestant) * tauxISReduit + Math.max(0, gainNonEncoreTaxe - seuilISRestant) * tauxISNormal;
    return ((value - isRegul) / value) * (1 - tauxFlatTax);
  };

  // Fiscalité pondérée : moyenne des taux nets par enveloppe, pondérée par les encours
  const fiscalitePonderee = (cCapi, cCapiBase, cScpi, cPea, cPer, inclurePer = true, cForfaits = 0) => {
    const c = cCapi || 0, s = cScpi || 0, p = cPea || 0, pe = (inclurePer && cPer) ? cPer : 0;
    const total = c + s + p + pe;
    if (total <= 0) return computeFiscNetteCapi(0, 0, 0); // fallback
    const fCapi = computeFiscNetteCapi(c, cCapiBase || 0, cForfaits);
    return (c * fCapi + s * fiscNetteScpiEff + p * fiscNettePea + pe * fiscNettePerEff) / total;
  };

  // --- Capitalisation ---
  const resteSASU = benefDistribuable - divBrutsSortis;
  const ratioScpi = Math.max(0, 1 - ratioTreso - ratioCapi);
  const reserveTreso = resteSASU * ratioTreso;
  const contratCapi = resteSASU * ratioCapi;
  const scpi = resteSASU * ratioScpi;
  const peaPerso = 2400;
  const per = frais.per;
  const epargneTotale = contratCapi + scpi + peaPerso + per;

  // --- Net net (après épargne perso) ---
  const netNetAnnuel = salaireNet + divNets - votreIR + frais.chequesVacances * (1 - ASSIETTE_CSG * TAUX_CSG_CRDS) - peaPerso;
  const netNetMensuel = netNetAnnuel / 12;

  // --- Prévoyance ---
  const ijSecuJour = Math.min(salaireBrut, 48060) * 0.5 / 365;
  const ijSecuMois = ijSecuJour * 30;
  const complementPrevoyance = salaireBrut * 0.4 / 12;
  const totalCouvertMois = ijSecuMois + complementPrevoyance;
  const provisionRisque = netNetMensuel * 6;
  const capitalDeces = salaireBrut * 3;

  // --- Projection COMPLÈTE ageActuel → ageFin ---
  const annees = ageObjectif - ageActuel;
  const ageRetraite = 67;
  const { retraiteBaseMois, retraiteCompMois, retraiteTotaleMois } = computeRetraite({ salaireBrutCDI, salaireBrut, ageActuel, ageObjectif });
  // Phase 2 "lever le pied" : modèle de coûts propre
  // Pas de salaire, frais fixes réduits (compta, RC pro, CFE, banque, mutuelle)
  // CA missions → résultat → IS → dividendes flat tax
  const joursMissionsPonctuelles = joursLeverLePied;
  const caMissions = tjm * joursMissionsPonctuelles;
  const fraisPhase2 = (frais.comptable || 0) + (frais.rcPro || 0) + (frais.cfe || 0) + (frais.banque || 0) + (frais.mutuelle || 0);
  const resultatMissions = Math.max(0, caMissions - fraisPhase2);
  const isMissions = Math.min(resultatMissions, seuilIS) * tauxISReduit + Math.max(0, resultatMissions - seuilIS) * tauxISNormal;
  const revenuMissionsAnnuel = (resultatMissions - isMissions) * (1 - tauxFlatTax);

  const projection = [];
  let cumCapi = 0, cumCapiBase = 0, cumScpi = 0, cumPea = 0, cumPer = 0, cumForfaitsIS = 0;

  // First pass: capital at ageObjectif for drawdown
  // Le PER est bloqué jusqu'à 64 ans (sauf cas exceptionnels)
  // On calcule le drawdown en excluant le PER avant 64 ans
  // Pour la projection, le forfait TME est petit → on estime le taux IS moyen applicable
  const forfaitEstime = (resteSASUEstime * ratioCapi) * 1.05 * tme;
  const projArgs = { tme, tauxISEffectif: tauxISMoyen(forfaitEstime) };
  const rendements = { rendementCapi, rendementScpi, rendementPea, rendementPer };
  const projAtObjectif = computeCapitalProjection({ contratCapi, scpi, peaPerso, per, ...rendements, annees, inflation, ...projArgs });
  const capitalAtObjectif = projAtObjectif.total;
  const capitalHorsPerAtObjectif = computeCapitalProjection({ contratCapi, scpi, peaPerso, per: 0, ...rendements, annees, inflation, ...projArgs }).total;

  const anneesDrawdown = ageFin - ageObjectif;
  const anneesAvant64 = Math.max(0, Math.min(64, ageFin) - ageObjectif);
  const anneesApres64 = Math.max(0, ageFin - Math.max(ageObjectif, 64));

  // Capital drainable à l'entrée de la phase drawdown :
  // La boucle fait annees-1 contributions (y=1..annees-1 en phase 1).
  // À y=annees (phase 2), le capital croît PUIS le retrait a lieu.
  // La formule d'annuité PV×r/(1-(1+r)^-n) suppose PV = pool AVANT la première croissance.
  // La provision pour risque couvre les aléas lissés → s'amortit linéairement, pas drainable.
  const anneesContrib = Math.max(0, annees - 1);
  const poolHorsPerAvantRetrait = computeCapitalProjection({ contratCapi, scpi, peaPerso, per: 0, ...rendements, annees: anneesContrib, inflation, ...projArgs }).total;
  const poolPerAvantRetrait = computeCapitalProjection({ contratCapi: 0, scpi: 0, peaPerso: 0, per, ...rendements, annees: anneesContrib, inflation, ...projArgs }).total;
  const poolTotalAvantRetrait = poolHorsPerAvantRetrait + poolPerAvantRetrait;

  let drawdownAnnuelBrutAvant64 = 0;
  let drawdownAnnuelBrutApres64 = 0;

  // Rendement net du drag fiscal annuel sur le capital :
  // - Contrat capi : forfait TME = 105% × TME × base (versements nets), pas × valeur (encours).
  //   Le ratio base/valeur diminue dans le temps quand les gains s'accumulent.
  //   On estime ce ratio à l'objectif pour la formule d'annuité.
  // - SCPI : IS sur les revenus fonciers = rendement × valeur → drag direct sur la valeur
  // - PEA : pas de drag fiscal annuel (PS uniquement au retrait)
  const ratioScpiEst = Math.max(0, 1 - ratioTreso - ratioCapi);
  const totalCapiScpi = ratioCapi + ratioScpiEst;
  const partCapi = totalCapiScpi > 0 ? ratioCapi / totalCapiScpi : 1; // fallback sans impact (drag × 0 = 0)
  const partScpi = 1 - partCapi;
  // Ratio base/valeur du contrat capi à l'objectif (les gains diluent la base)
  const ratioBaseValeur = projAtObjectif.capiValue > 0
    ? projAtObjectif.capiBase / projAtObjectif.capiValue
    : 1;
  const dragFiscalCapi = forfaitTME * tauxISMoyen(forfaitEstime) * ratioBaseValeur; // drag en % de la valeur
  const dragFiscalScpi = rendementScpi * tauxISMoyen(revenuScpiEstime);  // IS sur les revenus fonciers
  const dragFiscalMoyen = partCapi * dragFiscalCapi + partScpi * dragFiscalScpi;
  // Rendement nominal pondéré des enveloppes SASU (capi + SCPI) soumises au drag IS
  const rendementPondereCapiScpi = partCapi * rendementCapi + partScpi * rendementScpi;
  const rendementNetDrag = Math.max(0, rendementPondereCapiScpi - dragFiscalMoyen);

  // Annuité en taux réel net de drag fiscal → versements constants en pouvoir d'achat
  const tauxReel = Math.max(0.001, rendementNetDrag - inflation);

  // Sortie PER à 64 ans (art. L224-1 Code monétaire et financier, loi PACTE) :
  // - croquer = true  → sortie en capital fractionné : le PER rejoint le pool de drawdown
  //   Pas de contrainte légale de durée max ni de montant min (modalités contractuelles variables).
  //   Approximation fiscale : le modèle applique la fiscalité pondérée du pool (flat tax),
  //   alors qu'en réalité les versements PER déduits sont imposés au barème IR (pas PFU)
  //   et seuls les gains sont au PFU 30%. L'écart est limité si la TMI ≈ 30%.
  // - croquer = false → sortie en rente viagère : capital converti par l'assureur (tauxConversionPer)
  if (croquerCapital && rendementPondereCapiScpi > 0) {
    if (ageObjectif >= 64) {
      // Tout est débloqué dès le départ
      drawdownAnnuelBrutApres64 = anneesDrawdown > 0
        ? poolTotalAvantRetrait * tauxReel / (1 - Math.pow(1 + tauxReel, -anneesDrawdown))
        : 0;
    } else {
      // Phase 1 : avant 64, on consomme le capital hors PER
      if (anneesAvant64 > 0) {
        drawdownAnnuelBrutAvant64 = poolHorsPerAvantRetrait * tauxReel / (1 - Math.pow(1 + tauxReel, -anneesAvant64));
      }
      // Phase 2 : à 64 ans, sortie PER en capital fractionné (art. L224-1 CMF) → rejoint le pool
      if (anneesApres64 > 0) {
        // Le PER a grossi (contributions jusqu'à ageObjectif, puis capitalisation seule jusqu'à 64)
        // PER : pas de drag fiscal en phase capitalisation
        let perAt64 = poolPerAvantRetrait;
        for (let i = 0; i < anneesAvant64; i++) perAt64 = perAt64 * (1 + rendementPer);
        // Capital hors PER (capi + SCPI) : croît au rendement net du drag fiscal IS
        let soldeHorsPer = poolHorsPerAvantRetrait;
        for (let i = 0; i < anneesAvant64; i++) {
          soldeHorsPer = soldeHorsPer * (1 + rendementNetDrag) - drawdownAnnuelBrutAvant64 * Math.pow(1 + inflation, i);
        }
        soldeHorsPer = Math.max(0, soldeHorsPer);
        const capitalTotal64 = soldeHorsPer + perAt64;
        drawdownAnnuelBrutApres64 = capitalTotal64 * tauxReel / (1 - Math.pow(1 + tauxReel, -anneesApres64));
      }
    }
  }
  // Pour la compatibilité : drawdownAnnuelBrut est celui de la première phase
  const drawdownAnnuelBrut = ageObjectif >= 64 ? drawdownAnnuelBrutApres64 : drawdownAnnuelBrutAvant64;
  // Estimation headline (encours à ageObjectif) — la boucle recalcule fiscPondRetrait chaque année
  // avec les encours réels (la composition du portefeuille évolue pendant le drawdown)
  const fiscPondereeEstimee = fiscalitePonderee(projAtObjectif.capiValue, projAtObjectif.capiBase, scpi, peaPerso, per);
  const drawdownMensuelNet = drawdownAnnuelBrut * fiscPondereeEstimee / 12;

  // Déflateur : convertit un montant nominal futur en pouvoir d'achat d'aujourd'hui
  const deflate = (nominal, years) => inflation > 0 ? nominal / Math.pow(1 + inflation, years) : nominal;

  let perRenteAnnuelleBrute = 0; // rente viagère fixée à 64 ans, nominale constante

  for (let y = 0; y <= ageFin - ageActuel; y++) {
    const age = ageActuel + y;
    const annee = 2026 + y;
    let phase = age < ageObjectif ? 1 : age < ageRetraite ? 2 : 3;

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
      if (phase === 1) {
        cumCapi = cumCapi * (1 + rendementCapi) + contratCapi * infY;
        cumCapiBase += contratCapi * infY;  // coût d'acquisition : seuls les versements, pas les gains
        cumScpi = cumScpi * (1 + rendementScpi) + scpi * infY;
        cumPea = cumPea * (1 + rendementPea) + peaPerso * infY;
        cumPer = cumPer * (1 + rendementPer) + per * infY;
      } else if (croquerCapital) {
        // PER bloqué jusqu'à 64 ans : il grossit mais on ne le ponctione pas
        const perDebloque = age >= 64;
        // Annuité indexée sur l'inflation → pouvoir d'achat constant
        const anneesDepuisPhase = perDebloque
          ? age - Math.max(ageObjectif, 64)
          : age - ageObjectif;
        const baseDrawdown = perDebloque ? drawdownAnnuelBrutApres64 : drawdownAnnuelBrutAvant64;
        const currentDrawdown = baseDrawdown * Math.pow(1 + inflation, anneesDepuisPhase);

        // Pool de retrait : hors PER avant 64, tout après 64
        const poolCapi = cumCapi * (1 + rendementCapi);
        const poolScpi = cumScpi * (1 + rendementScpi);
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
          cumScpi = poolScpi - actualWithdrawal * ratio_s;
          cumPea = poolPea - actualWithdrawal * ratio_p;
          if (perDebloque) {
            const ratio_pe = poolPer / totalPool;
            cumPer = poolPer - actualWithdrawal * ratio_pe;
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
          cumScpi = cumScpi * (1 + rendementScpi);
          const peaContrib = Math.min(peaPerso / 2, revenuMissionsAnnuel) * infY; // clampé au revenu missions disponible
          cumPea = cumPea * (1 + rendementPea) + peaContrib;
          cumPer = cumPer * (1 + rendementPer);
        } else {
          cumCapi = cumCapi * (1 + rendementCapi);
          cumScpi = cumScpi * (1 + rendementScpi);
          cumPea = cumPea * (1 + rendementPea);
          cumPer = cumPer * (1 + rendementPer);
        }
        // croquer = false → sortie PER en rente viagère à 64 ans (art. L224-1 CMF)
        // Le capital est transféré à l'assureur qui verse une rente nominale fixe à vie
        if (age === 64 && perRenteAnnuelleBrute === 0 && cumPer > 0) {
          perRenteAnnuelleBrute = cumPer * tauxConversionPer;
          cumPer = 0; // capital parti chez l'assureur
        }
      }

      // Recalculer le seuil IS restant selon la phase :
      // Phase 1 → le résultat d'exploitation (indexé inflation) consomme le seuil
      // Phases 2/3 → pas d'activité, seuil intégralement disponible pour les placements
      seuilISRestant = phase === 1
        ? Math.max(0, seuilIS - resultatAvantIS * infY)
        : seuilIS;

      // Drag fiscal annuel sur le capital détenu par la SASU :
      // Le forfait capi et les revenus SCPI partagent le même seuil IS restant.
      const forfaitAnnuel = cumCapiBase > 0 ? cumCapiBase * forfaitTME : 0;
      const revenuScpiAnnuel = cumScpi > 0 ? cumScpi * rendementScpi : 0;
      const totalRevenuIS = forfaitAnnuel + revenuScpiAnnuel;
      if (totalRevenuIS > 0) {
        const isTotal = computeISOnAmount(totalRevenuIS);
        // Répartir l'IS au prorata entre capi et SCPI
        if (forfaitAnnuel > 0) {
          cumCapi = Math.max(0, cumCapi - isTotal * (forfaitAnnuel / totalRevenuIS));
          cumForfaitsIS += forfaitAnnuel; // base forfaitaire cumulée (pour régularisation au rachat)
        }
        if (revenuScpiAnnuel > 0) {
          cumScpi = Math.max(0, cumScpi - isTotal * (revenuScpiAnnuel / totalRevenuIS));
        }
      }

      // En mode croquer capital, la provision pour risque s'amortit linéairement
      // (elle absorbe les aléas lissés chaque année → pas un stock permanent)
      const anneesDepuisObjectif = age - ageObjectif;
      const tresoRestante = (croquerCapital && phase >= 2)
        ? Math.max(0, provisionRisque * (1 - anneesDepuisObjectif / anneesDrawdown))
        : provisionRisque;

      const totalHorsPer = cumCapi + cumScpi + cumPea + tresoRestante;
      const totalAvecPer = totalHorsPer + cumPer;

      const fiscPondYear = fiscalitePonderee(cumCapi, cumCapiBase, cumScpi, cumPea, cumPer, false, cumForfaitsIS);
      // SWR prudent : rendement réel net du drag IS, moins 0.5 point de marge
      // pour absorber le sequence-of-returns risk et la volatilité réelle.
      // Avec les défauts (5% brut, 2% inflation, ~0.7% drag IS) → SWR ≈ 1.8% au lieu de 2.3%.
      const tauxRetrait = Math.max(0, rendementNetDrag - inflation - 0.005);
      const revenuPassifNet = croquerCapital ? 0 : totalHorsPer * tauxRetrait * fiscPondYear / 12;

      // drawdownMois = retrait réel (plafonné au pool disponible)
      const perDebloque = age >= 64;
      const fiscPondRetrait = fiscalitePonderee(cumCapi, cumCapiBase, cumScpi, cumPea, cumPer, perDebloque, cumForfaitsIS);
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
      const retraiteMois = phase === 3
        ? Math.round(inflate(retraiteBaseMois) + inflate(retraiteCompMois) * facteurErosionArrco)
        : 0;
      const peaPhase2 = (!croquerCapital && phase === 2) ? Math.min(peaPerso / 2, revenuMissionsAnnuel) : 0;
      const missionsMois = phase === 2 ? inflate(Math.round((revenuMissionsAnnuel - peaPhase2) / 12)) : 0;

      let revenuTotalMois;
      if (phase === 1) {
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
      if (phase === 1) {
        revenuTotalMoisReel = Math.round(netNetMensuel);
      } else if (croquerCapital) {
        // Retraite en réel : base = valeur constante, complémentaire érodée par sous-indexation
        const retraiteMoisReel = phase === 3 ? Math.round(retraiteBaseMois + retraiteCompMois * facteurErosionArrco) : 0;
        revenuTotalMoisReel = Math.round(deflate(drawdownMois, y) + Math.round(revenuMissionsAnnuel / 12) + retraiteMoisReel);
      } else if (phase === 2) {
        revenuTotalMoisReel = Math.round(revenuPassifReel + Math.round((revenuMissionsAnnuel - peaPhase2) / 12) + (perDebloque ? perRenteMoisReel : 0));
      } else {
        const retraiteMoisReel = Math.round(retraiteBaseMois + retraiteCompMois * facteurErosionArrco);
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
        label: phase === 1 ? "Freelance" : phase === 2 ? "Lever le pied" : "Retraite"
      });
    }
  }

  // --- Scénarios ratio (réutilise la même logique que le calcul principal) ---
  const paliers = [0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0];
  // Insérer le ratio réel de l'utilisateur s'il ne tombe pas sur un palier
  if (ratioDistrib > 0 && !paliers.some(p => Math.abs(p - ratioDistrib) < 0.001)) {
    paliers.push(ratioDistrib);
    paliers.sort((a, b) => a - b);
  }
  const scenariosRatio = paliers.map(r => {
    const db = benefDistribuable * r;
    const dn = db * (1 - tauxFlatTax);
    const nn = salaireNet + dn - votreIR + frais.chequesVacances * (1 - ASSIETTE_CSG * TAUX_CSG_CRDS) - peaPerso;
    const reste = benefDistribuable - db;
    const projScenario = computeCapitalProjection({
      contratCapi: reste * ratioCapi,
      scpi: reste * ratioScpi,
      peaPerso,
      per,
      ...rendements,
      annees,
      inflation,
      ...projArgs,
    });
    const capitalFin = projScenario.total;
    const fiscScenario = fiscalitePonderee(projScenario.capiValue, projScenario.capiBase, reste * ratioScpi, peaPerso, per);
    const tauxRetraitScenario = Math.max(0, rendementNetDrag - inflation - 0.005);
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
    quotientFamilial, irFoyer, votreIR, tmi, fiscNetteScpiEff, fiscNettePerEff,
    netNetAnnuel, netNetMensuel,
    resteSASU, contratCapi, scpi, reserveTreso, peaPerso, per, epargneTotale,
    ijSecuMois, complementPrevoyance, totalCouvertMois, provisionRisque, capitalDeces,
    projection, scenariosRatio, annees,
    retraiteBaseMois, retraiteCompMois, retraiteTotaleMois, ageRetraite,
    capitalAtObjectif, capitalHorsPerAtObjectif, drawdownMensuelNet, drawdownAnnuelBrut,
    drawdownAnnuelBrutAvant64, drawdownAnnuelBrutApres64,
    joursMissionsPonctuelles, revenuMissionsAnnuel, inflation
  };
}

// ============================================================
// FORMATAGE TEXTE — Source unique pour CLI et bouton "Copy to LLM"
// ============================================================

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtPct = (n) => `${(n * 100).toFixed(1)}%`;

export function formatReport({ tjm, jours, salaireBrut, per, divNetsVoulus, rendementCapi, rendementScpi, rendementPea, rendementPer, inflation, ageActuel, ageObjectif, joursLeverLePied, croquerCapital, ageFin, ratioTreso, ratioCapi, salaireBrutCDI, r }) {
  const cmd = `node cli.js --step4 --tjm ${tjm} --jours ${jours} --salaireBrut ${salaireBrut} --per ${per} --divNetsVoulus ${divNetsVoulus} --rendementCapi ${rendementCapi} --rendementScpi ${rendementScpi} --rendementPea ${rendementPea} --rendementPer ${rendementPer} --inflation ${inflation} --ageActuel ${ageActuel} --ageObjectif ${ageObjectif} --joursLeverLePied ${joursLeverLePied} --croquerCapital ${croquerCapital} --ageFin ${ageFin} --ratioTreso ${ratioTreso} --ratioCapi ${ratioCapi}`;

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
  L.push(`═══ STEP 3 : RÉPARTITION & RÉSULTAT ═══`);
  L.push(`  Salaire brut    : ${fmt(salaireBrut)} → superbrut ${fmt(r.superbrut)}`);
  L.push(`  Salaire net     : ${fmt(r.salaireNet)}`);
  L.push(`  Résultat av. IS : ${fmt(r.resultatAvantIS)}`);
  L.push(`  IS (${fmtPct(r.tauxEffectifIS)})    : ${fmt(r.isTotal)}`);
  L.push(`  Bénéf. distrib. : ${fmt(r.benefDistribuable)}`);
  L.push(`  Dividendes nets : ${fmt(r.divNets)} (flat tax: ${fmt(r.flatTax)})`);
  L.push(`  IR (votre part) : ${fmt(r.votreIR)} (TMI: ${fmtPct(r.tmi)})`);
  L.push(`  ► NET NET /AN   : ${fmt(r.netNetAnnuel)}`);
  L.push(`  ► NET NET /MOIS : ${fmt(r.netNetMensuel)}`);
  L.push('');
  L.push(`  Capitalisation :`);
  L.push(`    Reste en SASU     : ${fmt(r.resteSASU)}`);
  L.push(`    Contrat capi      : ${fmt(r.contratCapi)}`);
  L.push(`    SCPI              : ${fmt(r.scpi)}`);
  L.push(`    Provision risque   : ${fmt(r.reserveTreso)}`);
  L.push(`    PEA perso         : ${fmt(r.peaPerso)}`);
  L.push(`    Épargne totale/an : ${fmt(r.epargneTotale)}`);
  L.push('');

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
  L.push('  Jalons de vie :');
  L.push(`    Freelance (maintenant): ${fmt(r.netNetMensuel)}/mois`);
  if (age50) L.push(`    ${ageObjectif} ans (lever pied)  : ${fmt(age50.revenuTotalMois)}/mois | patrimoine ${fmt(age50.total)}`);
  if (age64) L.push(`    64 ans (PER débloqué) : ${fmt(age64.revenuTotalMois)}/mois | patrimoine ${fmt(age64.total)}`);
  if (age67) L.push(`    67 ans (retraite)     : ${fmt(age67.revenuTotalMois)}/mois | patrimoine ${fmt(age67.total)}`);
  if (age75) L.push(`    75 ans                : ${fmt(age75.revenuTotalMois)}/mois | patrimoine ${fmt(age75.total)}`);

  return L.join('\n');
}
