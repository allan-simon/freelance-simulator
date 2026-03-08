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
  ratioTreso: 0.15,
  ratioCapi: 0.65,
  frais: {
    comptable: 3000, rcPro: 800, cfe: 500, banque: 300, bureau: 2000,
    mutuelle: 1200, prevoyance: 3000, materiel: 2000, chequesVacances: 540,
    divers: 1500
  },
  // Constantes réglementaires 2026
  tauxPatronales: 0.42,
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
  const maxSalaireBrut = Math.floor((caHT - totalFraisHorsPer) / 1.42 / 5000) * 5000;
  const salaireBrutEffectif = Math.min(salaireBrut, maxSalaireBrut);
  const superbrut = salaireBrutEffectif * 1.42;
  const maxPer = Math.max(0, Math.floor((caHT - superbrut - totalFraisHorsPer) / 500) * 500);
  const perEffectif = Math.min(per, maxPer);
  const totalFrais = totalFraisHorsPer + perEffectif;

  const resultat = Math.max(0, caHT - superbrut - totalFrais);
  const is = Math.min(resultat, 100000) * 0.15 + Math.max(0, resultat - 100000) * 0.25;
  const maxDivNets = Math.floor((resultat - is) * (1 - 0.314) / 1000) * 1000;

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

// Moteur principal — IDENTIQUE à ce qui tourne dans l'UI
export function computeAll(params) {
  const {
    tjm, jours, salaireBrut, divNetsVoulus,
    tauxPatronales, tauxSalariales, seuilIS, tauxISReduit, tauxISNormal,
    tauxFlatTax, abattementIR, revenuConjoint, partsFiscales,
    frais, rendement, ageActuel, ageObjectif,
    croquerCapital = false, ageFin = 80, joursLeverLePied = 50,
    ratioTreso = 0.15, ratioCapi = 0.65
  } = params;

  // --- CA ---
  const caHT = tjm * jours;

  // --- Frais pro ---
  const totalFrais = Object.values(frais).reduce((a, b) => a + b, 0);

  // --- Charges salaire ---
  const chargesPatronales = salaireBrut * tauxPatronales;
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
  const retraiteBaseMois = 1400;
  const retraiteCompMois = 900;
  const retraiteTotaleMois = retraiteBaseMois + retraiteCompMois;
  const joursMissionsPonctuelles = joursLeverLePied;
  const revenuMissionsAnnuel = tjm * joursMissionsPonctuelles * 0.45;

  const projection = [];
  let cumCapi = 0, cumScpi = 0, cumPea = 0, cumPer = 0;

  // First pass: capital at ageObjectif for drawdown
  let capitalAtObjectif = 0;
  {
    let tc = 0, ts = 0, tp = 0, tpe = 0;
    for (let y = 1; y <= annees; y++) {
      tc = tc * (1 + rendement) + contratCapi;
      ts = ts * (1 + rendement) + scpi;
      tp = tp * (1 + rendement) + peaPerso;
      tpe = tpe * (1 + rendement) + per;
    }
    capitalAtObjectif = tc + ts + tp + tpe + tresoSecurite;
  }

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

  // --- Scénarios ratio ---
  const scenariosRatio = [0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0].map(r => {
    const db = benefDistribuable * r;
    const ft = db * tauxFlatTax;
    const dn = db - ft;
    const nn = salaireNet + dn - votreIR + frais.chequesVacances;
    const reste = benefDistribuable - db;
    const epargne = reste * 0.85 + peaPerso + per;
    const capitalFin = rendement > 0 ? epargne * ((Math.pow(1 + rendement, annees) - 1) / rendement) : epargne * annees;
    const revPassif = capitalFin * 0.04 * 0.7 / 12;
    return {
      ratio: r,
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
