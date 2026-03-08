// ============================================================
// MOTEUR DE CALCUL — Source unique de vérité
// Utilisé par App.jsx (React) ET cli.js (Node)
// ============================================================

export const DEFAULTS = {
  tjm: 1200,
  jours: 220,
  salaireBrut: 60000,
  divNetsVoulus: 40000,
  rendement: 0.06,
  ageObjectif: 50,
  joursLeverLePied: 50,
  croquerCapital: false,
  ageFin: 80,
  per: 5000,
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
  fiscNetteCapi: 0.686,  // Contrat capitalisation : PFU 31,4% (12,8% IR + 18,6% PS)
  fiscNetteScpi: 0.53,   // SCPI usufruit : revenus fonciers TMI 30% + PS 17,2% ≈ 47% (PS 18,6% ne s'applique PAS aux rev. fonciers)
  fiscNettePea:  0.814,  // PEA > 5 ans : PS seules 18,6%
  fiscNettePer:  0.55,   // PER sortie rente : IR TMI ~30% + PS 17,2% (approx)
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

export const RANGES = {
  tjm:    { min: 400, max: 2500, step: 50 },
  jours:  { min: 150, max: 230, step: 5 },
  rendement: { min: 0.02, max: 0.10, step: 0.005 },
  ageObjectif: { min: 42, max: 60, step: 1 },
  joursLeverLePied: { min: 0, max: 150, step: 10 },
  ageFin: { min: 70, max: 95, step: 1 },
  inflation: { min: 0, max: 0.05, step: 0.005 },
};

// Calcule les contraintes dynamiques (max salary, max PER, max dividendes)
// à partir des inputs step1 + step2
export function computeConstraints({ tjm, jours, frais, salaireBrut, per }) {
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
  const is = Math.min(resultat, DEFAULTS.seuilIS) * DEFAULTS.tauxISReduit + Math.max(0, resultat - DEFAULTS.seuilIS) * DEFAULTS.tauxISNormal;
  const maxDivNets = Math.floor((resultat - is) * (1 - DEFAULTS.tauxFlatTax) / 1000) * 1000;

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
export function computeCapitalProjection({ contratCapi, scpi, peaPerso, per, provisionRisque, rendement, annees, inflation = 0 }) {
  let tc = 0, ts = 0, tp = 0, tpe = 0;
  for (let y = 1; y <= annees; y++) {
    const infY = Math.pow(1 + inflation, y);
    tc = tc * (1 + rendement) + contratCapi * infY;
    ts = ts * (1 + rendement) + scpi * infY;
    tp = tp * (1 + rendement) + peaPerso * infY;
    tpe = tpe * (1 + rendement) + per * infY;
  }
  return tc + ts + tp + tpe + provisionRisque;
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
  const salCDI = Math.min(salaireBrutCDI, PASS_RET);
  const salFL = Math.min(salaireBrut, PASS_RET);

  let sam;
  if (totalAnnees <= 0) {
    sam = 0;
  } else if (totalAnnees <= 25) {
    sam = (anneesCDI * salCDI + anneesFreelance * salFL) / totalAnnees;
  } else {
    // Prendre les 25 meilleures années
    const years = [];
    for (let i = 0; i < anneesCDI; i++) years.push(salCDI);
    for (let i = 0; i < anneesFreelance; i++) years.push(salFL);
    years.sort((a, b) => b - a);
    sam = years.slice(0, 25).reduce((a, b) => a + b, 0) / 25;
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
  // Points CDI
  const t1c = Math.min(salaireBrutCDI, PASS_RET);
  const t2c = Math.max(0, Math.min(salaireBrutCDI, 8 * PASS_RET) - PASS_RET);
  totalPoints += anneesCDI * (t1c * TAUX_T1 + t2c * TAUX_T2) / PRIX_POINT;

  // Points freelance (SASU)
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
    fiscNetteCapi = DEFAULTS.fiscNetteCapi,
    fiscNetteScpi = DEFAULTS.fiscNetteScpi,
    fiscNettePea = DEFAULTS.fiscNettePea,
    fiscNettePer = DEFAULTS.fiscNettePer,
    frais, rendement, ageActuel, ageObjectif,
    croquerCapital = false, ageFin = 80, joursLeverLePied = 50,
    ratioTreso = 0.15, ratioCapi = 0.65,
    salaireBrutCDI = 45000,
    inflation = 0.02
  } = params;

  // Fiscalité pondérée : moyenne des taux nets par enveloppe, pondérée par les encours
  const fiscalitePonderee = (cCapi, cScpi, cPea, cPer, inclurePer = true) => {
    const c = cCapi || 0, s = cScpi || 0, p = cPea || 0, pe = (inclurePer && cPer) ? cPer : 0;
    const total = c + s + p + pe;
    if (total <= 0) return fiscNetteCapi; // fallback
    return (c * fiscNetteCapi + s * fiscNetteScpi + p * fiscNettePea + pe * fiscNettePer) / total;
  };

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
  const revenuImposableVous = salaireNet * (1 - abattementIR);
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
  for (let i = tranches.length - 1; i >= 1; i--) {
    const trancheRevenu = Math.max(0, quotientFamilial - tranches[i].seuil);
    irParPart += trancheRevenu * tranches[i].taux;
    if (trancheRevenu > 0 && tmi === 0) tmi = tranches[i].taux;
  }
  const irFoyer = irParPart * partsFiscales;
  const votreIR = revenuImposableFoyer > 0 ? irFoyer * (revenuImposableVous / revenuImposableFoyer) : 0;

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
  const netNetAnnuel = salaireNet + divNets - votreIR + frais.chequesVacances - peaPerso;
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
  const joursMissionsPonctuelles = joursLeverLePied;
  const ratioNetSurCA = caHT > 0 ? netNetAnnuel / caHT : 0;
  const revenuMissionsAnnuel = tjm * joursMissionsPonctuelles * ratioNetSurCA;

  const projection = [];
  let cumCapi = 0, cumScpi = 0, cumPea = 0, cumPer = 0;

  // First pass: capital at ageObjectif for drawdown
  // Le PER est bloqué jusqu'à 64 ans (sauf cas exceptionnels)
  // On calcule le drawdown en excluant le PER avant 64 ans
  const capitalAtObjectif = computeCapitalProjection({ contratCapi, scpi, peaPerso, per, provisionRisque, rendement, annees, inflation });
  const capitalHorsPerAtObjectif = computeCapitalProjection({ contratCapi, scpi, peaPerso, per: 0, provisionRisque, rendement, annees, inflation });

  const anneesDrawdown = ageFin - ageObjectif;
  const anneesAvant64 = Math.max(0, Math.min(64, ageFin) - ageObjectif);
  const anneesApres64 = Math.max(0, ageFin - Math.max(ageObjectif, 64));

  // Capital drainable à l'entrée de la phase drawdown :
  // La boucle fait annees-1 contributions (y=1..annees-1 en phase 1).
  // À y=annees (phase 2), le capital croît PUIS le retrait a lieu.
  // La formule d'annuité PV×r/(1-(1+r)^-n) suppose PV = pool AVANT la première croissance.
  // La provision pour risque couvre les aléas lissés → s'amortit linéairement, pas drainable.
  const anneesContrib = Math.max(0, annees - 1);
  const poolHorsPerAvantRetrait = computeCapitalProjection({ contratCapi, scpi, peaPerso, per: 0, provisionRisque: 0, rendement, annees: anneesContrib, inflation });
  const poolPerAvantRetrait = computeCapitalProjection({ contratCapi: 0, scpi: 0, peaPerso: 0, per, provisionRisque: 0, rendement, annees: anneesContrib, inflation });
  const poolTotalAvantRetrait = poolHorsPerAvantRetrait + poolPerAvantRetrait;

  let drawdownAnnuelBrutAvant64 = 0;
  let drawdownAnnuelBrutApres64 = 0;

  if (croquerCapital && rendement > 0) {
    if (ageObjectif >= 64) {
      // Tout est débloqué dès le départ
      drawdownAnnuelBrutApres64 = anneesDrawdown > 0
        ? poolTotalAvantRetrait * rendement / (1 - Math.pow(1 + rendement, -anneesDrawdown))
        : 0;
    } else {
      // Phase 1 : avant 64, on consomme le capital hors PER
      if (anneesAvant64 > 0) {
        drawdownAnnuelBrutAvant64 = poolHorsPerAvantRetrait * rendement / (1 - Math.pow(1 + rendement, -anneesAvant64));
      }
      // Phase 2 : à 64 ans, le PER se débloque et rejoint le pool
      if (anneesApres64 > 0) {
        // Le PER a grossi (contributions jusqu'à ageObjectif, puis capitalisation seule jusqu'à 64)
        let perAt64 = poolPerAvantRetrait;
        for (let i = 0; i < anneesAvant64; i++) perAt64 = perAt64 * (1 + rendement);
        // Capital hors PER restant (annuité conçue pour drainer à 0)
        let soldeHorsPer = poolHorsPerAvantRetrait;
        for (let i = 0; i < anneesAvant64; i++) {
          soldeHorsPer = soldeHorsPer * (1 + rendement) - drawdownAnnuelBrutAvant64;
        }
        soldeHorsPer = Math.max(0, soldeHorsPer);
        const capitalTotal64 = soldeHorsPer + perAt64;
        drawdownAnnuelBrutApres64 = capitalTotal64 * rendement / (1 - Math.pow(1 + rendement, -anneesApres64));
      }
    }
  }
  // Pour la compatibilité : drawdownAnnuelBrut est celui de la première phase
  const drawdownAnnuelBrut = ageObjectif >= 64 ? drawdownAnnuelBrutApres64 : drawdownAnnuelBrutAvant64;
  const fiscPondereeEstimee = fiscalitePonderee(contratCapi, scpi, peaPerso, per);
  const drawdownMensuelNet = drawdownAnnuelBrut * fiscPondereeEstimee / 12;

  // Déflateur : convertit un montant nominal futur en pouvoir d'achat d'aujourd'hui
  const deflate = (nominal, years) => inflation > 0 ? nominal / Math.pow(1 + inflation, years) : nominal;

  for (let y = 0; y <= ageFin - ageActuel; y++) {
    const age = ageActuel + y;
    const annee = 2026 + y;
    let phase = age < ageObjectif ? 1 : age < ageRetraite ? 2 : 3;

    if (y === 0) {
      projection.push({
        age, annee, phase,
        capi: 0, scpiVal: 0, pea: 0, perVal: 0, tresoSecu: provisionRisque,
        total: provisionRisque, totalReel: provisionRisque,
        revenuPassifMois: 0, retraiteMois: 0, perRenteMois: 0, missionsMois: 0,
        drawdownMois: 0,
        revenuTotalMois: Math.round(netNetMensuel),
        revenuTotalMoisReel: Math.round(netNetMensuel),
        label: "Freelance"
      });
    } else {
      // Les contributions croissent avec l'inflation (le CA croît → le résultat croît → l'épargne croît)
      const infY = Math.pow(1 + inflation, y);
      let actualWithdrawal = 0;
      if (phase === 1) {
        cumCapi = cumCapi * (1 + rendement) + contratCapi * infY;
        cumScpi = cumScpi * (1 + rendement) + scpi * infY;
        cumPea = cumPea * (1 + rendement) + peaPerso * infY;
        cumPer = cumPer * (1 + rendement) + per * infY;
      } else if (croquerCapital) {
        // PER bloqué jusqu'à 64 ans : il grossit mais on ne le ponctione pas
        const perDebloque = age >= 64;
        const currentDrawdown = perDebloque ? drawdownAnnuelBrutApres64 : drawdownAnnuelBrutAvant64;

        // Pool de retrait : hors PER avant 64, tout après 64
        const poolCapi = cumCapi * (1 + rendement);
        const poolScpi = cumScpi * (1 + rendement);
        const poolPea = cumPea * (1 + rendement);
        const poolPer = cumPer * (1 + rendement);

        const totalPool = perDebloque
          ? poolCapi + poolScpi + poolPea + poolPer
          : poolCapi + poolScpi + poolPea;
        actualWithdrawal = Math.min(currentDrawdown, totalPool);

        if (totalPool > 0) {
          const ratio_c = poolCapi / totalPool;
          const ratio_s = poolScpi / totalPool;
          const ratio_p = poolPea / totalPool;
          cumCapi = poolCapi - actualWithdrawal * ratio_c;
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
          cumCapi = cumCapi * (1 + rendement);
          cumScpi = cumScpi * (1 + rendement);
          cumPea = cumPea * (1 + rendement) + 1200 * infY;
          cumPer = cumPer * (1 + rendement);
        } else {
          cumCapi = cumCapi * (1 + rendement);
          cumScpi = cumScpi * (1 + rendement);
          cumPea = cumPea * (1 + rendement);
          cumPer = cumPer * (1 + rendement);
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

      const fiscPondYear = fiscalitePonderee(cumCapi, cumScpi, cumPea, cumPer, false);
      const revenuPassifNet = croquerCapital ? 0 : totalHorsPer * 0.04 * fiscPondYear / 12;

      // drawdownMois = retrait réel (plafonné au pool disponible)
      const perDebloque = age >= 64;
      const fiscPondRetrait = fiscalitePonderee(cumCapi, cumScpi, cumPea, cumPer, perDebloque);
      const drawdownMois = (croquerCapital && phase >= 2) ? Math.round(actualWithdrawal * fiscPondRetrait / 12) : 0;

      // inflate() : le TJM suit l'inflation (et même plus : progression avec l'XP), salaire, missions, retraite → leur nominal croît
      const inflate = (base) => Math.round(base * Math.pow(1 + inflation, y));
      const perRenteMois = (!croquerCapital && perDebloque) ? Math.round(cumPer * 0.04 * fiscNettePer / 12) : 0;
      // Revenus indexés sur l'inflation → nominal croît, réel constant
      const retraiteMois = phase === 3 ? inflate(retraiteTotaleMois) : 0;
      const missionsMois = phase === 2 ? inflate(Math.round(revenuMissionsAnnuel / 12)) : 0;

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
        revenuTotalMoisReel = Math.round(deflate(drawdownMois, y) + Math.round(revenuMissionsAnnuel / 12) + (phase === 3 ? retraiteTotaleMois : 0));
      } else if (phase === 2) {
        revenuTotalMoisReel = Math.round(revenuPassifReel + Math.round(revenuMissionsAnnuel / 12) + (perDebloque ? perRenteMoisReel : 0));
      } else {
        revenuTotalMoisReel = Math.round(revenuPassifReel + retraiteTotaleMois + perRenteMoisReel);
      }

      projection.push({
        age, annee, phase,
        capi: Math.round(cumCapi), scpiVal: Math.round(cumScpi),
        pea: Math.round(cumPea), perVal: Math.round(cumPer),
        tresoSecu: Math.round(provisionRisque),
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
    const nn = salaireNet + dn - votreIR + frais.chequesVacances;
    const reste = benefDistribuable - db;
    const capitalFin = computeCapitalProjection({
      contratCapi: reste * ratioCapi,
      scpi: reste * ratioScpi,
      peaPerso,
      per,
      provisionRisque: nn / 12 * 6,
      rendement,
      annees,
      inflation,
    });
    const fiscScenario = fiscalitePonderee(reste * ratioCapi, reste * ratioScpi, peaPerso, per);
    const revPassif = capitalFin * 0.04 * fiscScenario / 12;
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

  // CDI comparison — mêmes cotisations salariales que SASU (différence = patronales uniquement)
  const cdiNetAvantIR = salaireBrutCDI - computeCotisationsSalariales(salaireBrutCDI);
  const cdiImposable = cdiNetAvantIR * (1 - abattementIR);
  const cdiQF = (cdiImposable + revenuConjoint * (1 - abattementIR)) / partsFiscales;
  let cdiIRParPart = 0;
  for (let i = tranches.length - 1; i >= 1; i--) {
    cdiIRParPart += Math.max(0, cdiQF - tranches[i].seuil) * tranches[i].taux;
  }
  const cdiIRFoyer = cdiIRParPart * partsFiscales;
  const cdiImposableFoyer = cdiImposable + revenuConjoint * (1 - abattementIR);
  const cdiIR = cdiImposableFoyer > 0 ? cdiIRFoyer * (cdiImposable / cdiImposableFoyer) : 0;
  const cdiNetAnnuel = cdiNetAvantIR - cdiIR;
  const cdiEpargneMois = 500;
  const cdiCapital14 = rendement > 0 ? cdiEpargneMois * 12 * ((Math.pow(1 + rendement, annees) - 1) / rendement) : cdiEpargneMois * 12 * annees;

  return {
    caHT, totalFrais, chargesPatronales, superbrut, salaireNet,
    totalCharges, resultatAvantIS, baseISReduit, baseISNormal,
    isReduit, isNormal, isTotal, tauxEffectifIS, benefDistribuable,
    divBrutsSortis, flatTax, divNets, divNetsMax, ratioDistrib,
    revenuImposableVous, revenuImposableConjoint, revenuImposableFoyer,
    quotientFamilial, irFoyer, votreIR, tmi,
    netNetAnnuel, netNetMensuel,
    resteSASU, contratCapi, scpi, reserveTreso, peaPerso, per, epargneTotale,
    ijSecuMois, complementPrevoyance, totalCouvertMois, provisionRisque, capitalDeces,
    projection, scenariosRatio, annees,
    cdiNetAnnuel, cdiCapital14,
    retraiteBaseMois, retraiteCompMois, retraiteTotaleMois, ageRetraite,
    capitalAtObjectif, capitalHorsPerAtObjectif, drawdownMensuelNet, drawdownAnnuelBrut,
    drawdownAnnuelBrutAvant64, drawdownAnnuelBrutApres64,
    joursMissionsPonctuelles, inflation
  };
}

// ============================================================
// FORMATAGE TEXTE — Source unique pour CLI et bouton "Copy to LLM"
// ============================================================

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtPct = (n) => `${(n * 100).toFixed(1)}%`;

export function formatReport({ tjm, jours, salaireBrut, per, divNetsVoulus, rendement, inflation, ageActuel, ageObjectif, joursLeverLePied, croquerCapital, ageFin, ratioTreso, ratioCapi, salaireBrutCDI, r }) {
  const cmd = `node cli.js --step4 --tjm ${tjm} --jours ${jours} --salaireBrut ${salaireBrut} --per ${per} --divNetsVoulus ${divNetsVoulus} --rendement ${rendement} --inflation ${inflation} --ageActuel ${ageActuel} --ageObjectif ${ageObjectif} --joursLeverLePied ${joursLeverLePied} --croquerCapital ${croquerCapital} --ageFin ${ageFin} --ratioTreso ${ratioTreso} --ratioCapi ${ratioCapi}`;

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
  L.push(`  Rendement       : ${fmtPct(rendement)} nominal`);
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
  L.push(`    CDI équivalent        : ${fmt(r.cdiNetAnnuel / 12)}/mois | capital ${fmt(r.cdiCapital14)} à ${ageObjectif} ans`);
  L.push(`    Freelance (maintenant): ${fmt(r.netNetMensuel)}/mois`);
  if (age50) L.push(`    ${ageObjectif} ans (lever pied)  : ${fmt(age50.revenuTotalMois)}/mois | patrimoine ${fmt(age50.total)}`);
  if (age64) L.push(`    64 ans (PER débloqué) : ${fmt(age64.revenuTotalMois)}/mois | patrimoine ${fmt(age64.total)}`);
  if (age67) L.push(`    67 ans (retraite)     : ${fmt(age67.revenuTotalMois)}/mois | patrimoine ${fmt(age67.total)}`);
  if (age75) L.push(`    75 ans                : ${fmt(age75.revenuTotalMois)}/mois | patrimoine ${fmt(age75.total)}`);

  return L.join('\n');
}
