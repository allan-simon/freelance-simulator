#!/usr/bin/env node
// ============================================================
// CLI Freelance SASU — même moteur que l'UI React
// Usage step-by-step :
//   node cli.js --step1 --tjm 1200 --jours 220
//   node cli.js --step2 --tjm 1200 --jours 220
//   node cli.js --step3 --tjm 1200 --jours 220 --salaireBrut 60000 --per 5000 --divNetsVoulus 40000
//   node cli.js --step4 --tjm 1200 --jours 220 --salaireBrut 60000 --per 5000 --divNetsVoulus 40000 --rendement 0.06 --ageObjectif 50
//   node cli.js --all   (run all steps with defaults, or override any param)
// ============================================================

import { DEFAULTS, RANGES, computeConstraints, computeAll } from './src/model.js';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        // Try to parse as number or boolean
        if (next === 'true') args[key] = true;
        else if (next === 'false') args[key] = false;
        else if (!isNaN(next)) args[key] = parseFloat(next);
        else args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

const args = parseArgs(process.argv);

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtPct = (n) => `${(n * 100).toFixed(1)}%`;

function pick(key) {
  return args[key] !== undefined ? args[key] : DEFAULTS[key];
}

const tjm = pick('tjm');
const jours = pick('jours');
const frais = { ...DEFAULTS.frais };
const salaireBrut = pick('salaireBrut');
const per = pick('per');
const divNetsVoulus = pick('divNetsVoulus');
const rendement = pick('rendement');
const ageObjectif = pick('ageObjectif');
const joursLeverLePied = pick('joursLeverLePied');
const croquerCapital = pick('croquerCapital');
const ageFin = pick('ageFin');
const ratioTreso = pick('ratioTreso');
const ratioCapi = pick('ratioCapi');

// ─── STEP 1 : Chiffre d'affaires ──────────────────────────
function step1() {
  const caHT = tjm * jours;
  console.log('═══ STEP 1 : CHIFFRE D\'AFFAIRES ═══');
  console.log(`  TJM          : ${fmt(tjm)}`);
  console.log(`  Jours/an     : ${jours}`);
  console.log(`  ► CA HT      : ${fmt(caHT)}`);
  console.log();
  console.log('Ranges pour step 1 :');
  console.log(`  --tjm   ${RANGES.tjm.min}..${RANGES.tjm.max} (step ${RANGES.tjm.step})`);
  console.log(`  --jours ${RANGES.jours.min}..${RANGES.jours.max} (step ${RANGES.jours.step})`);
  console.log();
  console.log('► Pour step 2, relancer avec : --step2 --tjm', tjm, '--jours', jours);
  return { caHT };
}

// ─── STEP 2 : Charges fixes ───────────────────────────────
function step2() {
  const caHT = tjm * jours;
  const totalFraisHorsPer = Object.values(frais).reduce((a, b) => a + b, 0);
  const c = computeConstraints({ tjm, jours, frais, salaireBrut, per });

  console.log('═══ STEP 2 : CHARGES FIXES ═══');
  console.log(`  CA HT           : ${fmt(caHT)}`);
  console.log(`  Charges fixes   : ${fmt(totalFraisHorsPer)}`);
  Object.entries(frais).forEach(([k, v]) => {
    console.log(`    ${k.padEnd(18)}: ${fmt(v)}`);
  });
  console.log(`  ► Disponible    : ${fmt(caHT - totalFraisHorsPer)}`);
  console.log();
  console.log('Ranges dynamiques pour step 3 :');
  console.log(`  --salaireBrut  30000..${c.maxSalaireBrut} (step 5000)`);
  console.log(`  --per          0..${c.maxPer} (step 500)`);
  console.log(`  --divNetsVoulus 0..${c.maxDivNets} (step 1000)`);
  console.log(`  --ratioTreso   0..1 (défaut ${ratioTreso})`);
  console.log(`  --ratioCapi    0..1 (défaut ${ratioCapi})`);
  console.log();
  console.log('► Pour step 3, relancer avec : --step3 --tjm', tjm, '--jours', jours, '--salaireBrut', salaireBrut, '--per', per, '--divNetsVoulus', divNetsVoulus);
  return c;
}

// ─── STEP 3 : Répartition & résultat ─────────────────────
function step3() {
  const c = computeConstraints({ tjm, jours, frais, salaireBrut, per });
  const fraisAvecPer = { ...frais, per: c.perEffectif };
  const divNetsEffectif = Math.max(0, Math.min(divNetsVoulus, c.maxDivNets));

  const params = {
    tjm, jours, salaireBrut: c.salaireBrutEffectif, divNetsVoulus: divNetsEffectif,
    tauxPatronales: DEFAULTS.tauxPatronales, tauxSalariales: DEFAULTS.tauxSalariales,
    seuilIS: DEFAULTS.seuilIS, tauxISReduit: DEFAULTS.tauxISReduit, tauxISNormal: DEFAULTS.tauxISNormal,
    tauxFlatTax: DEFAULTS.tauxFlatTax, abattementIR: DEFAULTS.abattementIR,
    revenuConjoint: DEFAULTS.revenuConjoint, partsFiscales: DEFAULTS.partsFiscales,
    frais: fraisAvecPer, rendement, ageActuel: DEFAULTS.ageActuel, ageObjectif,
    croquerCapital, ageFin, joursLeverLePied, ratioTreso, ratioCapi
  };
  const r = computeAll(params);

  console.log('═══ STEP 3 : RÉPARTITION & RÉSULTAT ═══');
  console.log(`  Salaire brut (effectif) : ${fmt(r.superbrut / 1.42)} → superbrut ${fmt(r.superbrut)}`);
  console.log(`  Salaire net             : ${fmt(r.salaireNet)}`);
  console.log(`  PER (effectif)          : ${fmt(c.perEffectif)}`);
  console.log(`  Résultat avant IS       : ${fmt(r.resultatAvantIS)}`);
  console.log(`  IS (taux effectif ${fmtPct(r.tauxEffectifIS)}) : ${fmt(r.isTotal)}`);
  console.log(`  Bénéf. distribuable     : ${fmt(r.benefDistribuable)}`);
  console.log(`  Dividendes nets         : ${fmt(r.divNets)} (flat tax: ${fmt(r.flatTax)})`);
  console.log(`  IR (votre part)         : ${fmt(r.votreIR)} (TMI: ${fmtPct(r.tmi)})`);
  console.log();
  console.log(`  ► NET NET ANNUEL        : ${fmt(r.netNetAnnuel)}`);
  console.log(`  ► NET NET MENSUEL       : ${fmt(r.netNetMensuel)}`);
  console.log();
  console.log('  Capitalisation dans la SASU :');
  console.log(`    Reste en SASU         : ${fmt(r.resteSASU)}`);
  console.log(`    Contrat capi (${Math.round(ratioCapi * 100)}%)   : ${fmt(r.contratCapi)}`);
  console.log(`    SCPI (${Math.round((1 - ratioCapi - ratioTreso) * 100)}%)          : ${fmt(r.scpi)}`);
  console.log(`    Tréso (${Math.round(ratioTreso * 100)}%)         : ${fmt(r.reserveTreso)}`);
  console.log(`    PEA perso             : ${fmt(r.peaPerso)}`);
  console.log(`    Épargne totale/an     : ${fmt(r.epargneTotale)}`);
  console.log();
  console.log('Ranges pour step 4 :');
  console.log(`  --rendement        ${RANGES.rendement.min}..${RANGES.rendement.max} (step ${RANGES.rendement.step})`);
  console.log(`  --ageObjectif      ${RANGES.ageObjectif.min}..${RANGES.ageObjectif.max}`);
  console.log(`  --joursLeverLePied ${RANGES.joursLeverLePied.min}..${RANGES.joursLeverLePied.max}`);
  console.log(`  --croquerCapital   true|false`);
  console.log(`  --ageFin           ${RANGES.ageFin.min}..${RANGES.ageFin.max} (si croquerCapital)`);
  console.log();
  console.log('► Pour step 4, ajouter : --step4 --rendement', rendement, '--ageObjectif', ageObjectif);
  return r;
}

// ─── STEP 4 : Projection long terme ─────────────────────
function step4() {
  const c = computeConstraints({ tjm, jours, frais, salaireBrut, per });
  const fraisAvecPer = { ...frais, per: c.perEffectif };
  const divNetsEffectif = Math.max(0, Math.min(divNetsVoulus, c.maxDivNets));

  const params = {
    tjm, jours, salaireBrut: c.salaireBrutEffectif, divNetsVoulus: divNetsEffectif,
    tauxPatronales: DEFAULTS.tauxPatronales, tauxSalariales: DEFAULTS.tauxSalariales,
    seuilIS: DEFAULTS.seuilIS, tauxISReduit: DEFAULTS.tauxISReduit, tauxISNormal: DEFAULTS.tauxISNormal,
    tauxFlatTax: DEFAULTS.tauxFlatTax, abattementIR: DEFAULTS.abattementIR,
    revenuConjoint: DEFAULTS.revenuConjoint, partsFiscales: DEFAULTS.partsFiscales,
    frais: fraisAvecPer, rendement, ageActuel: DEFAULTS.ageActuel, ageObjectif,
    croquerCapital, ageFin, joursLeverLePied, ratioTreso, ratioCapi
  };
  const r = computeAll(params);

  console.log('═══ STEP 4 : PROJECTION LONG TERME ═══');
  console.log(`  Rendement          : ${fmtPct(rendement)}`);
  console.log(`  Objectif           : ${ageObjectif} ans (${r.annees} ans de freelance)`);
  console.log(`  Jours lever pied   : ${joursLeverLePied} j/an`);
  console.log(`  Mode               : ${croquerCapital ? 'Consommer le capital' : 'Rente perpétuelle'}`);
  if (croquerCapital) console.log(`  Capital à 0 à      : ${ageFin} ans`);
  console.log();

  console.log('  Timeline :');
  console.log('  Age  Phase            Patrimoine     Rev. passif/m   Missions/m   Retraite/m   Total/m');
  console.log('  ' + '─'.repeat(95));
  for (const p of r.projection) {
    if (p.age === DEFAULTS.ageActuel || p.age === ageObjectif || p.age === 64 || p.age === 67
      || p.age === 75 || p.age === ageFin || p.age === ageObjectif + 1) {
      console.log(
        `  ${String(p.age).padStart(3)}  ${p.label.padEnd(16)} ${fmt(p.total).padStart(14)}  ${fmt(p.revenuPassifMois).padStart(14)}  ${fmt(p.missionsMois).padStart(11)}  ${fmt(p.retraiteMois).padStart(11)}  ${fmt(p.revenuTotalMois).padStart(8)}`
      );
    }
  }
  console.log();

  // Scénarios
  console.log('  Scénarios distribution (ratio dividendes/bénéf.) :');
  console.log('  Ratio    Net/mois    Capital@' + ageObjectif + '    Rev.passif/m');
  console.log('  ' + '─'.repeat(55));
  for (const s of r.scenariosRatio) {
    const marker = s.isSelected ? ' ◄' : '';
    console.log(
      `  ${fmtPct(s.ratio).padStart(6)}  ${fmt(s.netMensuel).padStart(10)}  ${fmt(s.capital50).padStart(14)}  ${fmt(s.revenuPassif).padStart(12)}${marker}`
    );
  }
  console.log();

  // Jalons de vie
  const age50 = r.projection.find(p => p.age === ageObjectif);
  const age64 = r.projection.find(p => p.age === 64);
  const age67 = r.projection.find(p => p.age === 67);
  const age75 = r.projection.find(p => p.age === 75);

  console.log('  Jalons de vie :');
  console.log(`    CDI équivalent        : ${fmt(r.cdiNetAnnuel / 12)}/mois | capital ${fmt(r.cdiCapital14)} à ${ageObjectif} ans`);
  console.log(`    Freelance (maintenant): ${fmt(r.netNetMensuel)}/mois`);
  if (age50) console.log(`    ${ageObjectif} ans (lever pied)  : ${fmt(age50.revenuTotalMois)}/mois | patrimoine ${fmt(age50.total)}`);
  if (age64) console.log(`    64 ans (PER débloqué) : ${fmt(age64.revenuTotalMois)}/mois | patrimoine ${fmt(age64.total)}`);
  if (age67) console.log(`    67 ans (retraite)     : ${fmt(age67.revenuTotalMois)}/mois | patrimoine ${fmt(age67.total)}`);
  if (age75) console.log(`    75 ans                : ${fmt(age75.revenuTotalMois)}/mois | patrimoine ${fmt(age75.total)}`);

  return r;
}

// ─── JSON output mode ────────────────────────────────────
function runJson() {
  const c = computeConstraints({ tjm, jours, frais, salaireBrut, per });
  const fraisAvecPer = { ...frais, per: c.perEffectif };
  const divNetsEffectif = Math.max(0, Math.min(divNetsVoulus, c.maxDivNets));

  const params = {
    tjm, jours, salaireBrut: c.salaireBrutEffectif, divNetsVoulus: divNetsEffectif,
    tauxPatronales: DEFAULTS.tauxPatronales, tauxSalariales: DEFAULTS.tauxSalariales,
    seuilIS: DEFAULTS.seuilIS, tauxISReduit: DEFAULTS.tauxISReduit, tauxISNormal: DEFAULTS.tauxISNormal,
    tauxFlatTax: DEFAULTS.tauxFlatTax, abattementIR: DEFAULTS.abattementIR,
    revenuConjoint: DEFAULTS.revenuConjoint, partsFiscales: DEFAULTS.partsFiscales,
    frais: fraisAvecPer, rendement, ageActuel: DEFAULTS.ageActuel, ageObjectif,
    croquerCapital, ageFin, joursLeverLePied, ratioTreso, ratioCapi
  };
  const r = computeAll(params);
  console.log(JSON.stringify({ inputs: params, constraints: c, results: r }, null, 2));
}

// ─── Dispatch ────────────────────────────────────────────
if (args.json) {
  runJson();
} else if (args.step1) {
  step1();
} else if (args.step2) {
  step2();
} else if (args.step3) {
  step3();
} else if (args.step4) {
  step4();
} else if (args.all) {
  step1();
  step2();
  step3();
  step4();
} else {
  console.log('Usage :');
  console.log('  node cli.js --step1 [--tjm N] [--jours N]');
  console.log('  node cli.js --step2 [--tjm N] [--jours N]');
  console.log('  node cli.js --step3 [--tjm N] [--jours N] [--salaireBrut N] [--per N] [--divNetsVoulus N]');
  console.log('  node cli.js --step4 [--tjm N] [--jours N] [--salaireBrut N] [--per N] [--divNetsVoulus N] [--rendement N] [--ageObjectif N] [--joursLeverLePied N] [--croquerCapital true|false] [--ageFin N]');
  console.log('  node cli.js --all   (toutes les steps avec les défauts)');
  console.log('  node cli.js --json  (sortie JSON complète pour traitement programmatique)');
  console.log();
  console.log('Chaque step affiche les résultats et les ranges valides pour la step suivante.');
  console.log('Les valeurs par défaut sont utilisées pour tout paramètre non spécifié.');
}
