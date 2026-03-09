#!/usr/bin/env node
// ============================================================
// CLI Freelance SASU — même moteur que l'UI React
// Usage step-by-step :
//   node cli.js --step1 --tjm 1200 --jours 220
//   node cli.js --step2 --tjm 1200 --jours 220
//   node cli.js --step3 --tjm 1200 --jours 220 --salaireBrut 60000 --per 5000 --divNetsVoulus 40000
//   node cli.js --step4 --tjm 1200 --jours 220 --salaireBrut 60000 --per 5000 --divNetsVoulus 40000 --rendementCapi 0.06 --rendementScpi 0.045 --ageObjectif 50
//   node cli.js --all   (run all steps with defaults, or override any param)
// ============================================================

import { DEFAULTS, RANGES, computeConstraints, computeAll, formatReport } from './src/model.js';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
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

function pick(key) {
  return args[key] !== undefined ? args[key] : DEFAULTS[key];
}

const tjm = pick('tjm');
const jours = pick('jours');
const frais = { ...DEFAULTS.frais };
const salaireBrut = pick('salaireBrut');
const per = pick('per');
const divNetsVoulus = pick('divNetsVoulus');
// --rendement override les 4 enveloppes (backward compat), sinon defaults individuels
const rendementFallback = args.rendement !== undefined ? args.rendement : null;
const rendementCapi = args.rendementCapi !== undefined ? args.rendementCapi : (rendementFallback ?? DEFAULTS.rendementCapi);
const rendementScpi = args.rendementScpi !== undefined ? args.rendementScpi : (rendementFallback ?? DEFAULTS.rendementScpi);
const rendementPea  = args.rendementPea  !== undefined ? args.rendementPea  : (rendementFallback ?? DEFAULTS.rendementPea);
const rendementPer  = args.rendementPer  !== undefined ? args.rendementPer  : (rendementFallback ?? DEFAULTS.rendementPer);
const ageObjectif = pick('ageObjectif');
const joursLeverLePied = pick('joursLeverLePied');
const croquerCapital = pick('croquerCapital');
const ageFin = pick('ageFin');
const ratioTreso = pick('ratioTreso');
const ratioCapi = pick('ratioCapi');
const inflation = pick('inflation');
const anneesAre = pick('anneesAre');
const salaireBrutCDI = pick('salaireBrutCDI');

function buildParams() {
  const c = computeConstraints({ tjm, jours, frais, salaireBrut, per });
  const fraisAvecPer = { ...frais, per: c.perEffectif };
  const divNetsEffectif = Math.max(0, Math.min(divNetsVoulus, c.maxDivNets));
  return {
    params: {
      tjm, jours, salaireBrut: c.salaireBrutEffectif, divNetsVoulus: divNetsEffectif,
      seuilIS: DEFAULTS.seuilIS, tauxISReduit: DEFAULTS.tauxISReduit, tauxISNormal: DEFAULTS.tauxISNormal,
      tauxFlatTax: DEFAULTS.tauxFlatTax, abattementIR: DEFAULTS.abattementIR,
      revenuConjoint: DEFAULTS.revenuConjoint, partsFiscales: DEFAULTS.partsFiscales,
      frais: fraisAvecPer, rendementCapi, rendementScpi, rendementPea, rendementPer,
      ageActuel: DEFAULTS.ageActuel, ageObjectif,
      croquerCapital, ageFin, joursLeverLePied, ratioTreso, ratioCapi, inflation,
      anneesAre, salaireBrutCDI
    },
    constraints: c,
    perEffectif: c.perEffectif,
    divNetsEffectif,
  };
}

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
}

// ─── STEP 3 & 4 : utilisent formatReport ─────────────────
function step3() {
  const { params, perEffectif, divNetsEffectif } = buildParams();
  const r = computeAll(params);
  // formatReport contient steps 1-4, on extrait juste step 3
  const text = formatReport({
    tjm, jours, salaireBrut: params.salaireBrut, per: perEffectif,
    divNetsVoulus: divNetsEffectif, rendementCapi, rendementScpi, rendementPea, rendementPer, inflation, ageActuel: DEFAULTS.ageActuel, ageObjectif, joursLeverLePied,
    croquerCapital, ageFin, ratioTreso, ratioCapi, salaireBrutCDI, anneesAre, r
  });
  // Afficher seulement steps 1-3 (couper avant step 4)
  const lines = text.split('\n');
  const step4idx = lines.findIndex(l => l.includes('STEP 4'));
  console.log(lines.slice(1, step4idx > 0 ? step4idx - 1 : undefined).join('\n')); // skip la ligne cmd
  console.log();
  console.log('Ranges pour step 4 :');
  console.log(`  --rendementCapi    ${RANGES.rendementCapi.min}..${RANGES.rendementCapi.max} (contrat capi)`);
  console.log(`  --rendementScpi    ${RANGES.rendementScpi.min}..${RANGES.rendementScpi.max} (SCPI)`);
  console.log(`  --rendementPea     ${RANGES.rendementPea.min}..${RANGES.rendementPea.max} (PEA)`);
  console.log(`  --rendementPer     ${RANGES.rendementPer.min}..${RANGES.rendementPer.max} (PER)`);
  console.log(`  --rendement        (fallback unique pour les 4 enveloppes)`);
  console.log(`  --ageObjectif      ${RANGES.ageObjectif.min}..${RANGES.ageObjectif.max}`);
  console.log(`  --joursLeverLePied ${RANGES.joursLeverLePied.min}..${RANGES.joursLeverLePied.max}`);
  console.log(`  --croquerCapital   true|false`);
  console.log(`  --ageFin           ${RANGES.ageFin.min}..${RANGES.ageFin.max} (si croquerCapital)`);
}

function step4() {
  const { params, perEffectif, divNetsEffectif } = buildParams();
  const r = computeAll(params);
  console.log(formatReport({
    tjm, jours, salaireBrut: params.salaireBrut, per: perEffectif,
    divNetsVoulus: divNetsEffectif, rendementCapi, rendementScpi, rendementPea, rendementPer, inflation, ageActuel: DEFAULTS.ageActuel, ageObjectif, joursLeverLePied,
    croquerCapital, ageFin, ratioTreso, ratioCapi, salaireBrutCDI, anneesAre, r
  }));
}

// ─── JSON output mode ────────────────────────────────────
function runJson() {
  const { params, constraints } = buildParams();
  const r = computeAll(params);
  console.log(JSON.stringify({ inputs: params, constraints, results: r }, null, 2));
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
  console.log('  node cli.js --step4 [--tjm N] [--jours N] [--salaireBrut N] [--per N] [--divNetsVoulus N] [--rendementCapi N] [--rendementScpi N] [--rendementPea N] [--rendementPer N] [--ageObjectif N] [--joursLeverLePied N] [--croquerCapital true|false] [--ageFin N]');
  console.log('  node cli.js --all   (toutes les steps avec les défauts)');
  console.log('  node cli.js --json  (sortie JSON complète pour traitement programmatique)');
  console.log();
  console.log('Chaque step affiche les résultats et les ranges valides pour la step suivante.');
  console.log('Les valeurs par défaut sont utilisées pour tout paramètre non spécifié.');
}
