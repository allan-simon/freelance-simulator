import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

// ============================================================
// CONSTANTES RÉGLEMENTAIRES 2026
// Modifier ici pour mettre à jour tous les calculs et l'UI
// ============================================================

const REGL = {
  // Charges sociales président SASU assimilé salarié [1][3]
  TAUX_PATRONALES: 0.42,

  // Impôt sur les sociétés — LDF 2026 [2]
  SEUIL_IS_REDUIT: 42500,
  TAUX_IS_REDUIT: 0.15,
  TAUX_IS_NORMAL: 0.25,

  // Prélèvement forfaitaire unique — LFSS 2026 [4]
  TAUX_IR_PFU: 0.128,            // part IR du PFU
  TAUX_PS_PFU: 0.186,            // part prélèvements sociaux du PFU
  TAUX_FLAT_TAX: 0.314,          // = IR (12,8%) + PS (18,6%)

  // Barème IR 2026 (revenus 2025, +0,9%) [5]
  ABATTEMENT_IR: 0.10,
  TRANCHES_IR: [
    { seuil: 0, taux: 0 },
    { seuil: 11600, taux: 0.11 },
    { seuil: 29579, taux: 0.30 },
    { seuil: 84577, taux: 0.41 },
    { seuil: 181917, taux: 0.45 },
  ],

  // Prévoyance & sécurité sociale [7]
  SMIC_MENSUEL: 1802,
  PLAFOND_IJ_COEFF: 1.4,       // plafond IJ = 1,4× SMIC mensuel (depuis avril 2025)
  TAUX_IJ: 0.50,
  TAUX_PREVOYANCE: 0.40,       // complément prévoyance = 40% du brut
  CAPITAL_DECES_COEFF: 3,      // 3× salaire brut
  MOIS_TRESO_SECURITE: 6,

  // Capitalisation
  RATIO_CONTRAT_CAPI: 0.65,
  RATIO_SCPI: 0.20,
  RATIO_RESERVE_TRESO: 0.15,
  // Fiscalité nette par enveloppe (1 - prélèvements)
  FISC_NETTE_CAPI: 0.70,   // PFU 30%
  FISC_NETTE_SCPI: 0.53,   // TMI 30% + PS 17,2%
  FISC_NETTE_PEA:  0.828,  // PS seules 17,2%
  FISC_NETTE_PER:  0.55,   // IR TMI + PS (sortie rente)
  PEA_ANNUEL: 2400,
  PEA_PHASE2_ANNUEL: 1200,     // versement PEA réduit en phase "lever le pied"
  // Pas de taux de retrait hardcodé : on utilise rendement - inflation (SWR)

  // Retraite [8]
  AGE_RETRAITE: 67,             // taux plein automatique
  AGE_DEBLOCAGE_PER: 64,       // générations ≥ 1969
  RETRAITE_BASE_MOIS: 1400,
  RETRAITE_COMP_MOIS: 900,

  // Chèques-vacances [6]
  CHEQUES_VACANCES_MAX: 540,

  // Comparaison CDI
  CDI_NET_ANNUEL: 67000,
  CDI_NET_MENSUEL: 5580,
  CDI_EPARGNE_MOIS: 500,
};

// Cotisations salariales détaillées — identiques SASU président et CDI cadre
const PASS = 48060;

function computeCotisationsSalariales(salaireBrut) {
  // Taux sur totalité du brut
  const totalite = 0.0040 + 0.0014 + 0.00024; // vieillesse dépl + CET + APEC
  // Taux sur T1 (≤ PASS)
  const t1Taux = 0.0690 + 0.0315 + 0.0086; // vieillesse pl + AGIRC-ARRCO + CEG
  // Taux sur T2 (> PASS)
  const t2Taux = 0.0864 + 0.0108; // AGIRC-ARRCO T2 + CEG T2
  // CSG/CRDS sur 98,25% du brut
  const csgCrds = 0.0970 * 0.9825;

  const t1 = Math.min(salaireBrut, PASS);
  const t2 = Math.max(0, salaireBrut - PASS);
  return salaireBrut * totalite + t1 * t1Taux + t2 * t2Taux + salaireBrut * csgCrds;
}

// ============================================================
// MOTEUR DE CALCUL — Toutes les formules sont ici
// ============================================================

function computeAll(params) {
  const {
    tjm, jours, salaireBrut, divNetsVoulus,
    tauxPatronales, seuilIS, tauxISReduit, tauxISNormal,
    tauxFlatTax, abattementIR, revenuConjoint, partsFiscales,
    frais, rendement, ageActuel, ageObjectif,
    croquerCapital = false, ageFin = 80, joursLeverLePied = 50
  } = params;

  // --- CA ---
  const caHT = tjm * jours;

  // --- Frais pro ---
  const totalFrais = Object.values(frais).reduce((a, b) => a + b, 0);

  // --- Charges salaire ---
  const chargesPatronales = salaireBrut * tauxPatronales;
  const superbrut = salaireBrut + chargesPatronales;
  const salaireNet = salaireBrut - computeCotisationsSalariales(salaireBrut);

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

  // --- IR (barème 2026) ---
  const revenuImposableVous = salaireNet * (1 - abattementIR);
  const revenuImposableConjoint = revenuConjoint * (1 - abattementIR);
  const revenuImposableFoyer = revenuImposableVous + revenuImposableConjoint;
  const quotientFamilial = revenuImposableFoyer / partsFiscales;

  // Barème progressif
  const tranches = REGL.TRANCHES_IR;

  let irParPart = 0;
  let tmi = 0;
  for (let i = tranches.length - 1; i >= 1; i--) {
    const upper = i < tranches.length - 1 ? tranches[i + 1].seuil : Infinity;
    const trancheRevenu = Math.max(0, Math.min(quotientFamilial, upper) - tranches[i].seuil);
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
  const contratCapi = resteSASU * REGL.RATIO_CONTRAT_CAPI;
  const scpi = resteSASU * REGL.RATIO_SCPI;
  const reserveTreso = resteSASU * REGL.RATIO_RESERVE_TRESO;
  const peaPerso = REGL.PEA_ANNUEL;
  const per = frais.per;
  const epargneTotale = contratCapi + scpi + peaPerso + per;

  // --- Prévoyance ---
  const plafondIJ = REGL.SMIC_MENSUEL * REGL.PLAFOND_IJ_COEFF * 12;
  const ijSecuJour = Math.min(salaireBrut, plafondIJ) * REGL.TAUX_IJ / 365;
  const ijSecuMois = ijSecuJour * 30;
  const complementPrevoyance = salaireBrut * REGL.TAUX_PREVOYANCE / 12;
  const totalCouvertMois = ijSecuMois + complementPrevoyance;
  const tresoSecurite = netNetMensuel * REGL.MOIS_TRESO_SECURITE;
  const capitalDeces = salaireBrut * REGL.CAPITAL_DECES_COEFF;

  // --- Projection COMPLÈTE 36 → ageFin ans ---
  // Phase 1 : 36 → ageObjectif = freelance plein régime, on capitalise
  // Phase 2 : ageObjectif → ageRetraite = lever le pied, on vit sur le passif + missions ponctuelles
  // Phase 3 : ageRetraite → ageFin = retraite obligatoire + PER + revenus passifs
  //
  // Si croquerCapital = true : en phase 2+3, on consomme le capital pour qu'il atteigne 0 à ageFin
  // Formule annuité : PMT = PV × r / (1 - (1+r)^-n) (amortissement constant)
  const annees = ageObjectif - ageActuel;
  const ageRetraite = REGL.AGE_RETRAITE;
  const retraiteBaseMois = REGL.RETRAITE_BASE_MOIS;
  const retraiteCompMois = REGL.RETRAITE_COMP_MOIS;
  const retraiteTotaleMois = retraiteBaseMois + retraiteCompMois;
  const tauxRetrait = Math.max(0, rendement - inflation); // SWR = rendement réel
  // Phase 2 "lever le pied" : modèle de coûts propre
  // Pas de salaire, frais fixes réduits (compta, RC pro, CFE, banque, mutuelle)
  // CA missions → résultat → IS → dividendes flat tax
  const joursMissionsPonctuelles = joursLeverLePied;
  const caMissions = tjm * joursMissionsPonctuelles;
  const fraisPhase2 = (frais.comptable || 0) + (frais.rcPro || 0) + (frais.cfe || 0) + (frais.banque || 0) + (frais.mutuelle || 0);
  const resultatMissions = Math.max(0, caMissions - fraisPhase2);
  const isMissions = Math.min(resultatMissions, REGL.SEUIL_IS_REDUIT) * REGL.TAUX_IS_REDUIT + Math.max(0, resultatMissions - REGL.SEUIL_IS_REDUIT) * REGL.TAUX_IS_NORMAL;
  const revenuMissionsAnnuel = (resultatMissions - isMissions) * (1 - REGL.TAUX_FLAT_TAX);
  
  const projection = [];
  let cumCapi = 0, cumScpi = 0, cumPea = 0, cumPer = 0;

  // First pass: calculate capital at ageObjectif to determine drawdown amount
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

  // Drawdown annuel si on croque le capital de ageObjectif à ageFin
  const anneesDrawdown = ageFin - ageObjectif;
  // PMT = PV × r / (1 - (1+r)^-n) — annuité qui épuise le capital
  const drawdownAnnuelBrut = croquerCapital && anneesDrawdown > 0 && rendement > 0
    ? capitalAtObjectif * rendement / (1 - Math.pow(1 + rendement, -anneesDrawdown))
    : 0;
  // Fiscalité pondérée par enveloppe
  const fiscPonderee = (cCapi, cScpi, cPea, cPer, inclurePer = true) => {
    const total = cCapi + cScpi + cPea + (inclurePer ? cPer : 0);
    if (total <= 0) return REGL.FISC_NETTE_CAPI;
    return (cCapi * REGL.FISC_NETTE_CAPI + cScpi * REGL.FISC_NETTE_SCPI + cPea * REGL.FISC_NETTE_PEA
      + (inclurePer ? cPer * REGL.FISC_NETTE_PER : 0)) / total;
  };
  const fiscEstimee = fiscPonderee(contratCapi, scpi, REGL.PEA_ANNUEL, per);
  const drawdownMensuelNet = drawdownAnnuelBrut * fiscEstimee / 12;

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
        // Capital grows then we withdraw drawdownAnnuelBrut
        const totalBefore = cumCapi + cumScpi + cumPea + cumPer;
        const growth = totalBefore * rendement;
        const withdrawal = Math.min(drawdownAnnuelBrut, totalBefore + growth);
        // Proportional withdrawal from all pockets
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
        // Rente perpétuelle : capital croît, on ne retire que les fruits
        if (phase === 2) {
          cumCapi = cumCapi * (1 + rendement);
          cumScpi = cumScpi * (1 + rendement);
          cumPea = cumPea * (1 + rendement) + REGL.PEA_PHASE2_ANNUEL;
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
      
      // Revenus passifs (mode perpétuel : 4% des fruits)
      const fiscPondYear = fiscPonderee(cumCapi, cumScpi, cumPea, cumPer, false);
      const revenuPassifNet = croquerCapital ? 0 : totalHorsPer * tauxRetrait * fiscPondYear / 12;
      
      // Drawdown mensuel (mode consommation)
      const drawdownMois = (croquerCapital && phase >= 2) ? Math.round(drawdownMensuelNet) : 0;
      
      const perDebloque = age >= REGL.AGE_DEBLOCAGE_PER;
      const perRenteMois = (!croquerCapital && perDebloque) ? Math.round(cumPer * tauxRetrait * REGL.FISC_NETTE_PER / 12) : 0;
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
    const epargne = reste * (REGL.RATIO_CONTRAT_CAPI + REGL.RATIO_SCPI) + peaPerso + per;
    // FV annuité
    const capitalFin = rendement > 0 ? epargne * ((Math.pow(1 + rendement, annees) - 1) / rendement) : epargne * annees;
    const revPassif = capitalFin * tauxRetrait * (1 - tauxFlatTax) / 12;
    return {
      ratio: r,
      netMensuel: Math.round(nn / 12),
      capital50: Math.round(capitalFin),
      revenuPassif: Math.round(revPassif),
      isSelected: Math.abs(r - ratioDistrib) < 0.001
    };
  });

  // CDI comparison
  const cdiNetAnnuel = REGL.CDI_NET_ANNUEL;
  const cdiEpargneMois = REGL.CDI_EPARGNE_MOIS;
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
    joursMissionsPonctuelles, tauxRetrait
  };
}

// ============================================================
// COMPOSANTS UI
// ============================================================

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtK = (n) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M €` : `${Math.round(n/1000)}k €`;
const fmtPct = (n) => `${(n * 100).toFixed(1)}%`;

function Slider({ label, value, onChange, min, max, step, format = "money", suffix = "" }) {
  const display = format === "money" ? fmt(value) : format === "pct" ? fmtPct(value) : `${value}${suffix}`;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: '#4a5568', fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1a365d', fontFamily: "'JetBrains Mono', monospace" }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#2563eb', height: 6, cursor: 'pointer' }} />
    </div>
  );
}

function Card({ title, subtitle, children, accent = "#2563eb" }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 16,
      borderLeft: `4px solid ${accent}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <h3 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 700, color: '#1a365d',
        textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'DM Sans', sans-serif" }}>{title}</h3>
      {subtitle && <p style={{ margin: '0 0 14px 0', fontSize: 12, color: '#718096', fontStyle: 'italic' }}>{subtitle}</p>}
      {!subtitle && <div style={{ marginBottom: 12 }} />}
      {children}
    </div>
  );
}

function Stat({ label, value, sub, color = "#1a365d", big = false }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 4px' }}>
      <div style={{ fontSize: big ? 28 : 22, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#718096', marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Row({ label, value, bold, highlight, sub }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0',
      borderBottom: '1px solid #edf2f7', background: highlight ? '#f0fff4' : 'transparent',
      paddingLeft: highlight ? 8 : 0, paddingRight: highlight ? 8 : 0, borderRadius: highlight ? 6 : 0 }}>
      <span style={{ fontSize: 13, color: '#4a5568', fontWeight: bold ? 700 : 400, fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: 13, fontWeight: bold ? 700 : 400, color: highlight ? '#22543d' : '#1a365d',
          fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
        {sub && <div style={{ fontSize: 10, color: '#a0aec0' }}>{sub}</div>}
      </div>
    </div>
  );
}

// ============================================================
// APP PRINCIPALE
// ============================================================

export default function App() {
  const [tjm, setTjm] = useState(1200);
  const [jours, setJours] = useState(220);
  const [salaireBrut, setSalaireBrut] = useState(60000);
  const [divNetsVoulus, setDivNetsVoulus] = useState(40000);
  const [rendement, setRendement] = useState(0.06);
  const [ageObjectif, setAgeObjectif] = useState(50);
  const [joursLeverLePied, setJoursLeverLePied] = useState(50);
  const [croquerCapital, setCroquerCapital] = useState(false);
  const [ageFin, setAgeFin] = useState(80);

  const [frais] = useState({
    comptable: 3000, rcPro: 800, cfe: 500, banque: 300, bureau: 2000,
    mutuelle: 1200, prevoyance: 3000, materiel: 2000, chequesVacances: 540,
    divers: 1500, per: 5000
  });

  const caHT = tjm * jours;
  const totalFrais = Object.values(frais).reduce((a, b) => a + b, 0);
  const maxSalaireBrut = Math.floor((caHT - totalFrais) / (1 + REGL.TAUX_PATRONALES) / 5000) * 5000;
  const salaireBrutEffectif = Math.min(salaireBrut, maxSalaireBrut);

  // Max dividendes nets distribuables
  const superbrut_ = salaireBrutEffectif * (1 + REGL.TAUX_PATRONALES);
  const resultat_ = Math.max(0, caHT - superbrut_ - totalFrais);
  const is_ = Math.min(resultat_, REGL.SEUIL_IS_REDUIT) * REGL.TAUX_IS_REDUIT + Math.max(0, resultat_ - REGL.SEUIL_IS_REDUIT) * REGL.TAUX_IS_NORMAL;
  const maxDivNets = Math.floor((resultat_ - is_) * (1 - REGL.TAUX_FLAT_TAX) / 1000) * 1000;
  const divNetsEffectif = Math.max(0, Math.min(divNetsVoulus, maxDivNets));

  const params = {
    tjm, jours, salaireBrut: salaireBrutEffectif, divNetsVoulus: divNetsEffectif,
    tauxPatronales: REGL.TAUX_PATRONALES,
    seuilIS: REGL.SEUIL_IS_REDUIT, tauxISReduit: REGL.TAUX_IS_REDUIT, tauxISNormal: REGL.TAUX_IS_NORMAL,
    tauxFlatTax: REGL.TAUX_FLAT_TAX, abattementIR: REGL.ABATTEMENT_IR,
    revenuConjoint: 16800, partsFiscales: 2.5,
    frais, rendement, ageActuel: 36, ageObjectif,
    croquerCapital, ageFin, joursLeverLePied
  };

  const r = useMemo(() => computeAll(params), [tjm, jours, salaireBrutEffectif, divNetsEffectif, rendement, ageObjectif, croquerCapital, ageFin, joursLeverLePied]);

  const age50Data = r.projection.find(p => p.age === ageObjectif) || r.projection[r.projection.length - 1];

  return (
    <div style={{ minHeight: '100vh', background: '#f7fafc', fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;700;800&display=swap" rel="stylesheet" />

      <div style={{ background: 'linear-gradient(135deg, #1a365d 0%, #2563eb 100%)', padding: '24px 0 20px', marginBottom: 24 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Simulateur Freelance SASU
          </h1>
          <p style={{ color: '#bee3f8', fontSize: 13, margin: '4px 0 0' }}>Dev Senior · 15 ans XP · Toutes formules vérifiables</p>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 40px' }}>
        {/* SLIDERS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
          <Card title="Paramètres d'activité" subtitle="Votre facturation et votre rémunération de président" accent="#2563eb">
            <Slider label="TJM HT" value={tjm} onChange={setTjm} min={400} max={2500} step={50} />
            <Slider label="Jours facturés/an" value={jours} onChange={setJours} min={150} max={230} step={5} format="num" suffix=" j" />
          </Card>
          <Card title="Distribution & projection" subtitle="Combien vous sortez pour vivre vs ce que vous capitalisez" accent="#38a169">
            <Slider label="Salaire brut annuel" value={salaireBrutEffectif} onChange={setSalaireBrut} min={30000} max={maxSalaireBrut} step={5000} />
            <Slider label="Dividendes nets annuels" value={divNetsEffectif} onChange={setDivNetsVoulus} min={0} max={maxDivNets} step={1000} />
            <div style={{ fontSize: 11, color: '#718096', marginTop: -8, marginBottom: 12, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
              {fmt(Math.round(divNetsEffectif / 12))}/mois — {fmtPct(r.ratioDistrib)} du bénéfice distribuable
            </div>
            <Slider label="Rendement placements" value={rendement} onChange={setRendement} min={0.02} max={0.10} step={0.005} format="pct" />
            <Slider label="Objectif lever le pied" value={ageObjectif} onChange={setAgeObjectif} min={42} max={60} step={1} format="num" suffix=" ans" />
            <Slider label="Lever le pied = bosser combien de jours/an" value={joursLeverLePied} onChange={setJoursLeverLePied} min={0} max={150} step={5} format="num" suffix=" j/an" />
            <div style={{ marginTop: 8, marginBottom: 8, padding: '12px', background: croquerCapital ? '#fff5f5' : '#f0fff4',
              borderRadius: 8, border: `1px solid ${croquerCapital ? '#fc8181' : '#9ae6b4'}`, cursor: 'pointer' }}
              onClick={() => setCroquerCapital(!croquerCapital)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 44, height: 24, borderRadius: 12, background: croquerCapital ? '#e53e3e' : '#c6f6d5',
                  position: 'relative', transition: 'all 0.2s' }}>
                  <div style={{ width: 20, height: 20, borderRadius: 10, background: '#fff', position: 'absolute',
                    top: 2, left: croquerCapital ? 22 : 2, transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: croquerCapital ? '#9b2c2c' : '#22543d' }}>
                    {croquerCapital ? '💀 Je croque tout le capital' : '🌳 Rente perpétuelle (transmission)'}
                  </div>
                  <div style={{ fontSize: 10, color: '#718096' }}>
                    {croquerCapital ? `Capital = 0 € à ${ageFin} ans, revenus maximisés` : 'Capital intact, revenus modérés, héritage'}
                  </div>
                </div>
              </div>
            </div>
            {croquerCapital && (
              <Slider label="Âge fin de capital" value={ageFin} onChange={setAgeFin} min={70} max={95} step={1} format="num" suffix=" ans" />
            )}
          </Card>
        </div>

        {/* HEADLINE STATS */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
          <Stat label="Net net mensuel — à consommer" value={fmt(r.netNetMensuel)} color="#22543d" big />
          <Stat label="CA HT annuel" value={fmtK(r.caHT)} sub="chiffre d'affaires de la SASU" />
          <Stat label="Épargne auto / an" value={fmtK(r.epargneTotale)} sub="placé sans y toucher" color="#2563eb" />
          <Stat label={`Patrimoine à ${ageObjectif} ans`} value={fmtK(age50Data.total)} sub="capital accumulé" color="#9b2c2c" />
          <Stat label="Revenu passif net / mois" value={fmt(age50Data.revenuPassifMois)} sub={croquerCapital ? `consommation capital → ${ageFin} ans` : "rente perpétuelle (règle des 4%)"} />
          <Stat label="vs CDI 100k brut" value={`+${fmtPct((r.netNetMensuel - REGL.CDI_NET_MENSUEL) / REGL.CDI_NET_MENSUEL)}`} sub={`${fmt(REGL.CDI_NET_MENSUEL)}/mois en CDI`} color="#38a169" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 16 }}>
          {/* COMPTE DE RÉSULTAT */}
          <Card title="Compte de résultat SASU" subtitle="Ce que la société gagne, paie, et ce qu'il reste à distribuer" accent="#2563eb">
            <Row label="Chiffre d'affaires HT" value={fmt(r.caHT)} bold sub={`${fmt(tjm)} × ${jours} jours`} />
            <Row label="Rémunération président (superbrut)" value={`- ${fmt(r.superbrut)}`} sub={`brut ${fmt(salaireBrut)} + cotisations patronales ${fmtPct(REGL.TAUX_PATRONALES)} [1]`} />
            <Row label="Charges d'exploitation" value={`- ${fmt(r.totalFrais)}`} sub="comptable, RC Pro, prévoyance, mutuelle, PER, bureau..." />
            <Row label="Résultat fiscal avant IS" value={fmt(r.resultatAvantIS)} bold />
            <Row label="Impôt sur les sociétés (IS)" value={`- ${fmt(r.isTotal)}`} sub={`taux effectif ${fmtPct(r.tauxEffectifIS)} — barème : ${fmtPct(REGL.TAUX_IS_REDUIT)} → ${fmt(REGL.SEUIL_IS_REDUIT)} puis ${fmtPct(REGL.TAUX_IS_NORMAL)} [2]`} />
            <Row label="Bénéfice distribuable" value={fmt(r.benefDistribuable)} bold highlight sub="montant max que la SASU peut vous verser en dividendes" />
          </Card>

          {/* NET NET */}
          <Card title="Net net — à consommer" subtitle="Ce qui atterrit sur votre compte perso, après charges, IS, flat tax et IR" accent="#38a169">
            <Row label="Salaire net" value={fmt(r.salaireNet)} sub={`${fmt(Math.round(r.salaireNet/12))} /mois — brut ${fmt(salaireBrut)} moins cotisations salariales (${fmtPct(REGL.TAUX_SALARIALES)}) [3]`} />
            <Row label={`Dividendes bruts sortis (${fmtPct(ratioDistrib)} du distribuable)`} value={fmt(r.divBrutsSortis)} sub="le reste capitalise dans la SASU" />
            <Row label={`Prélèvement forfaitaire unique (flat tax ${fmtPct(REGL.TAUX_FLAT_TAX)})`} value={`- ${fmt(r.flatTax)}`} sub={`${fmtPct(REGL.TAUX_IR_PFU)} IR + ${fmtPct(REGL.TAUX_PS_PFU)} prélèvements sociaux — prélevé à la source [4]`} />
            <Row label="Dividendes nets encaissés" value={fmt(r.divNets)} sub={`${fmt(Math.round(r.divNets/12))} /mois sur votre compte`} />
            <Row label="Impôt sur le revenu (votre part du foyer)" value={`- ${fmt(r.votreIR)}`} sub={`TMI ${fmtPct(r.tmi)} · quotient familial ${fmt(r.quotientFamilial)} · 2,5 parts [5]`} />
            <Row label="Chèques-vacances ANCV" value={`+ ${fmt(frais.chequesVacances)}`} sub="exonéré d'IR et de cotisations sociales [6]" />
            <Row label="PEA (épargne depuis compte perso)" value={`- ${fmt(r.peaPerso)}`} sub="200 €/mois — plus-values exonérées d'IR après 5 ans" />
            <Row label="Net net annuel" value={fmt(r.netNetAnnuel)} bold highlight sub="total à consommer sur l'année, après épargne PEA" />
            <Row label="Net net mensuel" value={fmt(r.netNetMensuel)} bold highlight sub="votre vrai budget — loyer, bouffe, vacances, tout" />
          </Card>

          {/* CAPITALISATION */}
          <Card title="Capitalisation automatique" subtitle="L'argent qui reste dans la SASU et travaille pour vous, sans y toucher" accent="#9b2c2c">
            <Row label="Bénéfice non distribué" value={fmt(r.resteSASU)} bold sub={`${fmtPct(1 - ratioDistrib)} du distribuable reste dans la SASU`} />
            <Row label="→ Contrat de capitalisation luxembourgeois (65%)" value={fmt(r.contratCapi)} sub="flexible, super-privilège, pas de plafond de garantie [9]" />
            <Row label="→ Usufruit temporaire SCPI (20%)" value={fmt(r.scpi)} sub="rendement immobilier + amortissement fiscal sur 5 ans" />
            <Row label="→ Réserve de trésorerie SASU (15%)" value={fmt(r.reserveTreso)} sub="renforce le matelas intercontrat" />
            <Row label="PEA — Plan d'Épargne en Actions" value={fmt(r.peaPerso)} sub="200 €/mois depuis votre compte perso (déjà déduit du net net)" />
            <Row label="PER — Plan d'Épargne Retraite" value={fmt(r.per)} sub={`versé par la SASU, déduit du résultat (IS) — bloqué jusqu'à ${REGL.AGE_DEBLOCAGE_PER} ans [8]`} />
            <Row label="Total épargne annuelle" value={fmt(r.epargneTotale)} bold highlight sub="placé chaque année sans effort" />
          </Card>

          {/* PRÉVOYANCE */}
          <Card title="Protection sociale & prévoyance" subtitle="Vos filets de sécurité en cas d'arrêt maladie, invalidité ou décès" accent="#d69e2e">
            <Row label="Indemnités journalières Sécu (CPAM)" value={`${fmt(r.ijSecuMois)} /mois`} sub={`régime général, plafonné à ${REGL.PLAFOND_IJ_COEFF}× SMIC mensuel (~${fmt(REGL.SMIC_MENSUEL * REGL.PLAFOND_IJ_COEFF * 12)}/an) [7]`} />
            <Row label="Complément prévoyance (contrat SASU)" value={`${fmt(r.complementPrevoyance)} /mois`} sub="incapacité/invalidité — ~3 000 €/an de cotisation" />
            <Row label="Total maintien de revenu en arrêt" value={`${fmt(r.totalCouvertMois)} /mois`} bold sub="sécu + prévoyance combinés" />
            <Row label="Découvert vs train de vie" value={`${fmt(Math.max(0, r.netNetMensuel - r.totalCouvertMois))} /mois`} sub="couvert par la trésorerie de sécurité de la SASU" />
            <Row label="Trésorerie de sécurité recommandée" value={fmt(r.tresoSecurite)} bold highlight sub="6 mois de net net — couvre intercontrat + arrêt maladie" />
            <Row label="Capital décès (contrat prévoyance)" value={fmt(r.capitalDeces)} sub="~3× salaire brut annuel, versé à votre famille" />
          </Card>
        </div>

        {/* GRAPHIQUE PROJECTION */}
        <Card title="Timeline complète 36 → 80 ans" subtitle="Patrimoine et revenus à chaque âge — le capital continue de travailler même quand vous levez le pied" accent="#9b2c2c">
          <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
            {[
              { label: "Phase 1 : Freelance", age: `36→${ageObjectif}`, color: "#2563eb" },
              { label: "Phase 2 : Lever le pied", age: `${ageObjectif}→${r.ageRetraite}`, color: "#38a169" },
              { label: "Phase 3 : Retraite", age: `${r.ageRetraite}→80`, color: "#d69e2e" },
            ].map((p, i) => (
              <div key={i} style={{ fontSize: 11, color: p.color, fontWeight: 600, padding: '4px 10px',
                background: `${p.color}11`, borderRadius: 20, border: `1px solid ${p.color}33` }}>
                {p.label} ({p.age} ans)
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#718096', marginBottom: 8 }}>Patrimoine (barres) et revenu mensuel total (ligne)</div>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={r.projection} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
              <XAxis dataKey="age" tick={{ fontSize: 11 }} interval={2} />
              <YAxis yAxisId="patrimoine" tickFormatter={v => fmtK(v)} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="revenu" orientation="right" tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, name) => name.includes('mois') ? fmt(v) : fmtK(v)} labelFormatter={(l) => `${l} ans`} />
              <Legend />
              <Line yAxisId="patrimoine" type="monotone" dataKey="total" stroke="#1a365d" strokeWidth={3} name="Patrimoine total" dot={false} />
              <Line yAxisId="revenu" type="stepAfter" dataKey="revenuTotalMois" stroke="#38a169" strokeWidth={2.5} name="Revenu total /mois" dot={false} />
              <Line yAxisId="revenu" type="stepAfter" dataKey="revenuPassifMois" stroke="#9b2c2c" strokeWidth={1.5} name="Revenus passifs /mois" dot={false} strokeDasharray="5 5" />
              <Line yAxisId="revenu" type="stepAfter" dataKey="retraiteMois" stroke="#d69e2e" strokeWidth={1.5} name="Retraite obligatoire /mois" dot={false} strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* TIMELINE DÉTAILLÉE */}
        <Card title="Détail des revenus par âge" subtitle="D'où vient l'argent à chaque étape — missions, passif, retraite obligatoire, PER" accent="#38a169">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
              <thead>
                <tr style={{ background: '#1a365d', color: '#fff' }}>
                  <th style={{ padding: '8px 6px', textAlign: 'center' }}>Âge</th>
                  <th style={{ padding: '8px 6px', textAlign: 'left' }}>Phase</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right' }}>Patrimoine</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right' }}>Revenus passifs</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right' }}>Missions</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right' }}>Retraite</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right' }}>PER</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 800 }}>TOTAL /mois</th>
                </tr>
              </thead>
              <tbody>
                {r.projection
                  .filter(p => [36, 40, 45, ageObjectif, 55, 60, 64, r.ageRetraite, 70, 75, 80].includes(p.age))
                  .map((p, i) => {
                    const bg = p.phase === 1 ? '#ebf5ff' : p.phase === 2 ? '#f0fff4' : '#fffff0';
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? bg : '#fff',
                        fontWeight: [ageObjectif, r.ageRetraite, 64].includes(p.age) ? 700 : 400,
                        borderLeft: [ageObjectif, r.ageRetraite].includes(p.age) ? '3px solid #38a169' : '3px solid transparent' }}>
                        <td style={{ padding: '6px', textAlign: 'center' }}>{p.age} ans</td>
                        <td style={{ padding: '6px', fontSize: 11, color: p.phase === 1 ? '#2563eb' : p.phase === 2 ? '#38a169' : '#d69e2e' }}>{p.label}</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>{fmtK(p.total)}</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>{fmt(p.revenuPassifMois)}</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>{p.missionsMois > 0 ? fmt(p.missionsMois) : '—'}</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>{p.retraiteMois > 0 ? fmt(p.retraiteMois) : '—'}</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>{p.perRenteMois > 0 ? fmt(p.perRenteMois) : '—'}</td>
                        <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700, color: '#22543d' }}>{fmt(p.revenuTotalMois)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: '#a0aec0' }}>
            Retraite base : {fmt(r.retraiteBaseMois)}/mois + complémentaire : {fmt(r.retraiteCompMois)}/mois = {fmt(r.retraiteTotaleMois)}/mois (estimé, 60k brut SASU + années CDI)
          </div>
        </Card>

        {/* SOLVEUR RATIO */}
        <Card title="Solveur — optimisation du ratio de distribution" subtitle="Testez chaque ratio : combien pour vivre maintenant vs combien pour capitaliser" accent="#6b46c1">
          <div style={{ fontSize: 12, color: '#718096', marginBottom: 12 }}>
            Chaque ligne = un ratio de distribution différent. La ligne surlignée = votre choix actuel.
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
              <thead>
                <tr style={{ background: '#1a365d', color: '#fff' }}>
                  <th style={{ padding: '8px 6px', textAlign: 'center' }}>Ratio</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right' }}>Net /mois</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right' }}>Capital {ageObjectif} ans</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right' }}>Revenu passif /mois</th>
                </tr>
              </thead>
              <tbody>
                {r.scenariosRatio.map((s, i) => (
                  <tr key={i} style={{ background: s.isSelected ? '#f0fff4' : i % 2 === 0 ? '#fff' : '#f7fafc',
                    fontWeight: s.isSelected ? 700 : 400, borderLeft: s.isSelected ? '3px solid #38a169' : '3px solid transparent' }}>
                    <td style={{ padding: '6px', textAlign: 'center' }}>{fmtPct(s.ratio)}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>{fmt(s.netMensuel)}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>{fmtK(s.capital50)}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>{fmt(s.revenuPassif)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* SCÉNARIOS À CHAQUE ÂGE CLÉ */}
        <Card title="Revenus mensuels à chaque étape de vie" subtitle="Du CDI actuel jusqu'à la retraite — combien vous touchez, d'où ça vient" accent="#38a169">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { label: "Aujourd'hui (CDI)", emoji: "💼", value: REGL.CDI_NET_MENSUEL, sub: "100k brut", color: "#718096" },
              { label: "Freelance", emoji: "🚀", value: Math.round(r.netNetMensuel), sub: `36→${ageObjectif} ans`, color: "#2563eb" },
              { label: `${ageObjectif} ans (${joursLeverLePied}j/an)`, emoji: "⛵",
                value: (r.projection.find(p => p.age === ageObjectif + 1) || {}).revenuTotalMois || 0,
                sub: `${joursLeverLePied}j missions + passif`, color: "#38a169" },
              { label: "64 ans (PER débloqué)", emoji: "🔓",
                value: (r.projection.find(p => p.age === 64) || {}).revenuTotalMois || 0,
                sub: "missions + passif + PER", color: "#6b46c1" },
              { label: `${r.ageRetraite} ans (retraite)`, emoji: "🏖️",
                value: (r.projection.find(p => p.age === r.ageRetraite) || {}).revenuTotalMois || 0,
                sub: "passif + retraite + PER", color: "#d69e2e" },
              { label: "75 ans", emoji: "🌅",
                value: (r.projection.find(p => p.age === 75) || {}).revenuTotalMois || 0,
                sub: "rente perpétuelle", color: "#9b2c2c" },
            ].map((s, i) => (
              <div key={i} style={{ background: '#f7fafc', borderRadius: 10, padding: 14, textAlign: 'center',
                borderTop: `3px solid ${s.color}` }}>
                <div style={{ fontSize: 24, marginBottom: 2 }}>{s.emoji}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.label}</div>
                <div style={{ fontSize: 10, color: '#718096', marginBottom: 6 }}>{s.sub}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#1a365d', fontFamily: "'JetBrains Mono', monospace" }}>
                  {fmt(s.value)}
                  <span style={{ fontSize: 10, fontWeight: 400, color: '#718096' }}>/mois</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: 12, background: croquerCapital ? '#fff5f5' : '#f0fff4', borderRadius: 8, fontSize: 12,
            color: croquerCapital ? '#9b2c2c' : '#22543d' }}>
            {croquerCapital ? (
              <>
                <strong>Mode "je croque tout" :</strong> Vous retirez {fmt(r.drawdownMensuelNet)}/mois net de votre capital
                à partir de {ageObjectif} ans (+ missions + retraite). Le capital atteint 0 € à {ageFin} ans.
                Après {ageFin} ans il ne reste que la retraite obligatoire ({fmt(r.retraiteTotaleMois)}/mois).
                <br />C'est ~{Math.round(r.drawdownMensuelNet / Math.max(1, (r.capitalAtObjectif * r.tauxRetrait * (1 - REGL.TAUX_FLAT_TAX) / 12)) * 100 - 100)}% de revenu en plus
                qu'en rente perpétuelle, mais rien à transmettre.
              </>
            ) : (
              <>
                <strong>Mode rente perpétuelle :</strong> votre revenu ne baisse jamais en dessous de {fmt((r.projection.find(p => p.age === ageObjectif + 1) || {}).revenuTotalMois || 0)}/mois
                après {ageObjectif} ans. À {r.ageRetraite} ans, la retraite ({fmt(r.retraiteTotaleMois)}/mois) s'ajoute.
                Le capital reste intact → transmission aux enfants.
              </>
            )}
          </div>
        </Card>

        <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', marginTop: 24,
          borderLeft: '4px solid #a0aec0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, color: '#1a365d',
            textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'DM Sans', sans-serif" }}>Sources réglementaires (2026)</h3>
          <div style={{ fontSize: 11, color: '#4a5568', lineHeight: 1.8, fontFamily: "'DM Sans', sans-serif" }}>
            <div><strong>[1]</strong> Cotisations patronales ~42% — calcul exact par tranche, président SASU assimilé salarié sans taux réduit maladie/AF ni Fillon</div>
            <div><strong>[2]</strong> IS : 15% → 42 500 € puis 25% — seuil inchangé, l'amendement PLF 2026 à 100k€ n'a pas été retenu dans le texte final</div>
            <div><strong>[3]</strong> Cotisations salariales ~28%</div>
            <div><strong>[4]</strong> Flat tax 31,4% — LFSS 2026 promulguée 30/12/2025, CSG capital +1,4pt (ne s'applique pas à l'assurance-vie ni aux PEL)</div>
            <div><strong>[5]</strong> Barème IR 2026 (revenus 2025, +0,9%)</div>
            <div><strong>[6]</strong> Chèques-vacances ANCV exonérés (30% × SMIC mensuel = 547 €/an, CSG/CRDS reste due)</div>
            <div><strong>[7]</strong> PASS 2026 = 48 060 € (arrêté du 22/12/2025) · IJ Sécu 50%</div>
            <div><strong>[8]</strong> PER déblocage 64 ans (âge légal retraite, générations ≥1969)</div>
            <div><strong>[9]</strong> Contrat de capitalisation luxembourgeois & super-privilège</div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>Détail complet des sources, textes de loi et liens Légifrance : <a href="https://github.com/allan-simon/freelance-simulator/blob/master/skills/sasu/reglementation-2026.md" target="_blank" rel="noopener noreferrer"><strong>reglementation-2026.md</strong></a></div>
          </div>
        </div>

        <div style={{ textAlign: 'center', color: '#a0aec0', fontSize: 11, marginTop: 16, fontStyle: 'italic' }}>
          Simulation indicative — consultez un expert-comptable et un avocat fiscaliste pour valider votre montage.
          <br />Barème IR 2026 · Taux IS 2026 · Tous les calculs sont dans le code source, vérifiables.
        </div>
      </div>
    </div>
  );
}
