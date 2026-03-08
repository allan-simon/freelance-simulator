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
  tauxSalariales: 0.28,
  seuilIS: 100000,
  tauxISReduit: 0.15,
  tauxISNormal: 0.25,
  tauxFlatTax: 0.314,
  abattementIR: 0.10,
  revenuConjoint: 16800,
  partsFiscales: 2.5,
  ageActuel: 36,
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

export const RANGES = {
  tjm:    { min: 400, max: 2500, step: 50 },
  jours:  { min: 150, max: 230, step: 5 },
  rendement: { min: 0.02, max: 0.10, step: 0.005 },
  ageObjectif: { min: 42, max: 60, step: 1 },
  joursLeverLePied: { min: 0, max: 150, step: 10 },
  ageFin: { min: 70, max: 95, step: 1 },
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
export function computeCapitalProjection({ contratCapi, scpi, peaPerso, per, tresoSecurite, rendement, annees }) {
  let tc = 0, ts = 0, tp = 0, tpe = 0;
  for (let y = 1; y <= annees; y++) {
    tc = tc * (1 + rendement) + contratCapi;
    ts = ts * (1 + rendement) + scpi;
    tp = tp * (1 + rendement) + peaPerso;
    tpe = tpe * (1 + rendement) + per;
  }
  return tc + ts + tp + tpe + tresoSecurite;
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
    tauxSalariales, seuilIS, tauxISReduit, tauxISNormal,
    tauxFlatTax, abattementIR, revenuConjoint, partsFiscales,
    frais, rendement, ageActuel, ageObjectif,
    croquerCapital = false, ageFin = 80, joursLeverLePied = 50,
    ratioTreso = 0.15, ratioCapi = 0.65,
    salaireBrutCDI = 45000
  } = params;

  // --- CA ---
  const caHT = tjm * jours;

  // --- Frais pro ---
  const totalFrais = Object.values(frais).reduce((a, b) => a + b, 0);

  // --- Charges salaire (calcul exact par tranche) ---
  const chargesPatronales = computeChargesPatronales(salaireBrut);
  const superbrut = salaireBrut + chargesPatronales;
  const salaireNet = salaireBrut * (1 - tauxSalariales);

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

  // --- Net net ---
  const netNetAnnuel = salaireNet + divNets - votreIR + frais.chequesVacances;
  const netNetMensuel = netNetAnnuel / 12;

  // --- Capitalisation ---
  const resteSASU = benefDistribuable - divBrutsSortis;
  const ratioScpi = Math.max(0, 1 - ratioTreso - ratioCapi);
  const reserveTreso = resteSASU * ratioTreso;
  const contratCapi = resteSASU * ratioCapi;
  const scpi = resteSASU * ratioScpi;
  const peaPerso = 2400;
  const per = frais.per;
  const epargneTotale = contratCapi + scpi + peaPerso + per;

  // --- Prévoyance ---
  const ijSecuJour = Math.min(salaireBrut, 48060) * 0.5 / 365;
  const ijSecuMois = ijSecuJour * 30;
  const complementPrevoyance = salaireBrut * 0.4 / 12;
  const totalCouvertMois = ijSecuMois + complementPrevoyance;
  const tresoSecurite = netNetMensuel * 6;
  const capitalDeces = salaireBrut * 3;

  // --- Projection COMPLÈTE ageActuel → ageFin ---
  const annees = ageObjectif - ageActuel;
  const ageRetraite = 67;
  const { retraiteBaseMois, retraiteCompMois, retraiteTotaleMois } = computeRetraite({ salaireBrutCDI, salaireBrut, ageActuel, ageObjectif });
  const joursMissionsPonctuelles = joursLeverLePied;
  const revenuMissionsAnnuel = tjm * joursMissionsPonctuelles * 0.45;

  const projection = [];
  let cumCapi = 0, cumScpi = 0, cumPea = 0, cumPer = 0;

  // First pass: capital at ageObjectif for drawdown
  const capitalAtObjectif = computeCapitalProjection({ contratCapi, scpi, peaPerso, per, tresoSecurite, rendement, annees });

  const anneesDrawdown = ageFin - ageObjectif;
  const drawdownAnnuelBrut = croquerCapital && anneesDrawdown > 0 && rendement > 0
    ? capitalAtObjectif * rendement / (1 - Math.pow(1 + rendement, -anneesDrawdown))
    : 0;
  const drawdownMensuelNet = drawdownAnnuelBrut * 0.7 / 12;

  for (let y = 0; y <= ageFin - ageActuel; y++) {
    const age = ageActuel + y;
    const annee = 2026 + y;
    let phase = age < ageObjectif ? 1 : age < ageRetraite ? 2 : 3;

    if (y === 0) {
      projection.push({
        age, annee, phase,
        capi: 0, scpiVal: 0, pea: 0, perVal: 0, tresoSecu: tresoSecurite,
        total: tresoSecurite,
        revenuPassifMois: 0, retraiteMois: 0, perRenteMois: 0, missionsMois: 0,
        drawdownMois: 0,
        revenuTotalMois: Math.round(netNetMensuel),
        label: "Freelance"
      });
    } else {
      if (phase === 1) {
        cumCapi = cumCapi * (1 + rendement) + contratCapi;
        cumScpi = cumScpi * (1 + rendement) + scpi;
        cumPea = cumPea * (1 + rendement) + peaPerso;
        cumPer = cumPer * (1 + rendement) + per;
      } else if (croquerCapital) {
        const totalBefore = cumCapi + cumScpi + cumPea + cumPer;
        const growth = totalBefore * rendement;
        const withdrawal = Math.min(drawdownAnnuelBrut, totalBefore + growth);
        const totalWithGrowth = totalBefore + growth;
        if (totalWithGrowth > 0) {
          const ratio_c = (cumCapi * (1 + rendement)) / totalWithGrowth;
          const ratio_s = (cumScpi * (1 + rendement)) / totalWithGrowth;
          const ratio_p = (cumPea * (1 + rendement)) / totalWithGrowth;
          const ratio_pe = (cumPer * (1 + rendement)) / totalWithGrowth;
          cumCapi = cumCapi * (1 + rendement) - withdrawal * ratio_c;
          cumScpi = cumScpi * (1 + rendement) - withdrawal * ratio_s;
          cumPea = cumPea * (1 + rendement) - withdrawal * ratio_p;
          cumPer = cumPer * (1 + rendement) - withdrawal * ratio_pe;
        }
        cumCapi = Math.max(0, cumCapi);
        cumScpi = Math.max(0, cumScpi);
        cumPea = Math.max(0, cumPea);
        cumPer = Math.max(0, cumPer);
      } else {
        if (phase === 2) {
          cumCapi = cumCapi * (1 + rendement);
          cumScpi = cumScpi * (1 + rendement);
          cumPea = cumPea * (1 + rendement) + 1200;
          cumPer = cumPer * (1 + rendement);
        } else {
          cumCapi = cumCapi * (1 + rendement);
          cumScpi = cumScpi * (1 + rendement);
          cumPea = cumPea * (1 + rendement);
          cumPer = cumPer * (1 + rendement);
        }
      }

      const totalHorsPer = cumCapi + cumScpi + cumPea + tresoSecurite;
      const totalAvecPer = totalHorsPer + cumPer;

      const revenuPassifNet = croquerCapital ? 0 : totalHorsPer * 0.04 * 0.7 / 12;

      const drawdownMois = (croquerCapital && phase >= 2) ? Math.round(drawdownMensuelNet) : 0;

      const perDebloque = age >= 64;
      const perRenteMois = (!croquerCapital && perDebloque) ? Math.round(cumPer * 0.04 * 0.7 / 12) : 0;
      const retraiteMois = phase === 3 ? retraiteTotaleMois : 0;
      const missionsMois = phase === 2 ? Math.round(revenuMissionsAnnuel / 12) : 0;

      let revenuTotalMois;
      if (phase === 1) {
        revenuTotalMois = Math.round(netNetMensuel);
      } else if (croquerCapital) {
        revenuTotalMois = Math.round(drawdownMois + missionsMois + retraiteMois);
      } else if (phase === 2) {
        revenuTotalMois = Math.round(revenuPassifNet + missionsMois + (perDebloque ? perRenteMois : 0));
      } else {
        revenuTotalMois = Math.round(revenuPassifNet + retraiteMois + perRenteMois);
      }

      projection.push({
        age, annee, phase,
        capi: Math.round(cumCapi), scpiVal: Math.round(cumScpi),
        pea: Math.round(cumPea), perVal: Math.round(cumPer),
        tresoSecu: Math.round(tresoSecurite),
        total: Math.round(totalAvecPer),
        revenuPassifMois: Math.round(croquerCapital ? drawdownMois : revenuPassifNet),
        retraiteMois, perRenteMois, missionsMois, drawdownMois,
        revenuTotalMois,
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
      tresoSecurite: nn / 12 * 6,
      rendement,
      annees,
    });
    const revPassif = capitalFin * 0.04 * 0.7 / 12;
    return {
      ratio: r,
      divNets: Math.round(dn),
      netMensuel: Math.round(nn / 12),
      capital50: Math.round(capitalFin),
      revenuPassif: Math.round(revPassif),
      isSelected: Math.abs(r - ratioDistrib) < 0.001
    };
  });

  // CDI comparison
  const cdiNetAnnuel = 67000;
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
    ijSecuMois, complementPrevoyance, totalCouvertMois, tresoSecurite, capitalDeces,
    projection, scenariosRatio, annees,
    cdiNetAnnuel, cdiCapital14,
    retraiteBaseMois, retraiteCompMois, retraiteTotaleMois, ageRetraite,
    capitalAtObjectif, drawdownMensuelNet, drawdownAnnuelBrut,
    joursMissionsPonctuelles
  };
}

// ============================================================
// FORMATAGE TEXTE — Source unique pour CLI et bouton "Copy to LLM"
// ============================================================

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtPct = (n) => `${(n * 100).toFixed(1)}%`;

export function formatReport({ tjm, jours, salaireBrut, per, divNetsVoulus, rendement, ageActuel, ageObjectif, joursLeverLePied, croquerCapital, ageFin, ratioTreso, ratioCapi, salaireBrutCDI, r }) {
  const cmd = `node cli.js --step4 --tjm ${tjm} --jours ${jours} --salaireBrut ${salaireBrut} --per ${per} --divNetsVoulus ${divNetsVoulus} --rendement ${rendement} --ageActuel ${ageActuel} --ageObjectif ${ageObjectif} --joursLeverLePied ${joursLeverLePied} --croquerCapital ${croquerCapital} --ageFin ${ageFin} --ratioTreso ${ratioTreso} --ratioCapi ${ratioCapi}`;

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
  L.push(`    Tréso             : ${fmt(r.reserveTreso)}`);
  L.push(`    PEA perso         : ${fmt(r.peaPerso)}`);
  L.push(`    Épargne totale/an : ${fmt(r.epargneTotale)}`);
  L.push('');

  // Step 4
  L.push(`═══ STEP 4 : PROJECTION LONG TERME ═══`);
  L.push(`  Rendement       : ${fmtPct(rendement)}`);
  L.push(`  Objectif        : ${ageObjectif} ans (${r.annees} ans de freelance)`);
  L.push(`  Jours lever pied: ${joursLeverLePied} j/an`);
  L.push(`  Mode            : ${croquerCapital ? 'Consommer le capital' : 'Rente perpétuelle'}`);
  if (croquerCapital) L.push(`  Capital à 0 à   : ${ageFin} ans`);
  L.push('');

  L.push('  Timeline :');
  L.push('  Age  Phase            Patrimoine     Rev.passif/m  Missions/m  Retraite/m  Total/m');
  L.push('  ' + '─'.repeat(90));
  const keyAges = new Set([ageActuel, ageObjectif, ageObjectif + 1, 64, 67, 75, ageFin]);
  for (const p of r.projection) {
    if (keyAges.has(p.age)) {
      L.push(
        `  ${String(p.age).padStart(3)}  ${p.label.padEnd(16)} ${fmt(p.total).padStart(14)}  ${fmt(p.revenuPassifMois).padStart(12)}  ${fmt(p.missionsMois).padStart(10)}  ${fmt(p.retraiteMois).padStart(10)}  ${fmt(p.revenuTotalMois).padStart(8)}`
      );
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
