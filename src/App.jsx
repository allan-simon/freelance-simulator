import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { computeAll, computeChargesPatronales, computeConstraints, DEFAULTS, formatReport } from "./model.js";

// ============================================================
// COMPOSANTS UI
// ============================================================

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtK = (n) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M €` : `${Math.round(n/1000)}k €`;
const fmtPct = (n) => `${(n * 100).toFixed(1)}%`;


function NumberInput({ label, value, onChange, min = 0, max = Infinity, step = 1, suffix = "" }) {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value)); }, [value]);
  const commit = (v) => { const n = Math.max(min, Math.min(max, Number(v) || 0)); onChange(n); setText(String(n)); };
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 13, color: '#4a5568', fontFamily: "'DM Sans', sans-serif", display: 'block', marginBottom: 4 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input type="number" min={min} max={max} step={step} value={text}
          onChange={e => setText(e.target.value)}
          onBlur={e => commit(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && commit(e.target.value)}
          style={{ width: '100%', padding: '6px 10px', fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
            color: '#1a365d', border: '1px solid #cbd5e0', borderRadius: 6, background: '#fff' }} />
        {suffix && <span style={{ fontSize: 13, color: '#4a5568', whiteSpace: 'nowrap' }}>{suffix}</span>}
      </div>
    </div>
  );
}

function Slider({ label, value, onChange, min, max, step, format = "money", suffix = "", note }) {
  const display = format === "money" ? fmt(value) : format === "pct" ? fmtPct(value) : `${value}${suffix}`;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: '#4a5568', fontFamily: "'DM Sans', sans-serif" }}>
          {label}
          {note && <span title={note} style={{ marginLeft: 4, cursor: 'help', opacity: 0.6 }}>&#9432;</span>}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1a365d', fontFamily: "'JetBrains Mono', monospace" }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#2563eb', height: 6, cursor: 'pointer' }} />
    </div>
  );
}

function PieSlider({ v1, v2, onChange, label1, label2, label3, color1 = '#1a365d', color2 = '#2563eb', color3 = '#38a169', amounts }) {
  const svgRef = useRef(null);
  const dragging = useRef(null);
  const [offset, setOffset] = useState(0);

  const v3 = Math.max(0, 1 - v1 - v2);
  const pct1 = Math.round(v1 * 100);
  const pct2 = Math.round(v2 * 100);
  const pct3 = Math.round(v3 * 100);

  const size = 160;
  const cx = size / 2, cy = size / 2;
  const R = 64, ri = 38;
  const midR = (R + ri) / 2;
  const TWO_PI = 2 * Math.PI;
  const ANG0 = -Math.PI / 2; // 12 o'clock

  const toXY = (frac, radius) => {
    const a = ANG0 + frac * TWO_PI;
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
  };

  const arcPath = (f1, f2) => {
    const span = f2 - f1;
    if (span < 0.003) return '';
    const a1 = ANG0 + f1 * TWO_PI, a2 = ANG0 + f2 * TWO_PI;
    const c1 = Math.cos(a1), s1 = Math.sin(a1), c2 = Math.cos(a2), s2 = Math.sin(a2);
    const lg = span > 0.5 ? 1 : 0;
    return `M${cx+R*c1},${cy+R*s1} A${R},${R} 0 ${lg} 1 ${cx+R*c2},${cy+R*s2} L${cx+ri*c2},${cy+ri*s2} A${ri},${ri} 0 ${lg} 0 ${cx+ri*c1},${cy+ri*s1} Z`;
  };

  const getFrac = useCallback((ev) => {
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const scX = size / rect.width, scY = size / rect.height;
    const px = ev.touches ? ev.touches[0].clientX : ev.clientX;
    const py = ev.touches ? ev.touches[0].clientY : ev.clientY;
    const dx = (px - rect.left) * scX - cx;
    const dy = (py - rect.top) * scY - cy;
    let a = Math.atan2(dy, dx) - ANG0;
    while (a < 0) a += TWO_PI;
    return a / TWO_PI;
  }, []);

  const step = 0.01;
  const snap = v => Math.round(v / step) * step;

  const onDown = useCallback((handle) => (e) => {
    e.preventDefault();
    dragging.current = handle;
    let prevF = getFrac(e);
    let cumDelta = 0;
    const startV1 = v1, startV2 = v2, startOffset = offset;
    const sum12 = v1 + v2;

    const move = (ev) => {
      if (!dragging.current) return;
      ev.preventDefault();
      const f = getFrac(ev);
      let d = f - prevF;
      d = d - Math.round(d); // normalize to [-0.5, 0.5]
      cumDelta += d;
      prevF = f;

      if (handle === 'h0') {
        // Boundary SCPI/tréso — capi (v2) stays fixed
        const nv1 = snap(Math.max(0, Math.min(1 - startV2, startV1 - cumDelta)));
        setOffset(((startOffset + cumDelta) % 1 + 1) % 1);
        onChange(nv1, startV2);
      } else if (handle === 'h1') {
        // Boundary tréso/capi — SCPI (v3) stays fixed
        const nv1 = snap(Math.max(0, Math.min(sum12, startV1 + cumDelta)));
        onChange(nv1, snap(Math.max(0, sum12 - nv1)));
      } else {
        // h2: boundary capi/SCPI — tréso (v1) stays fixed
        const nv2 = snap(Math.max(0, Math.min(1 - startV1, startV2 + cumDelta)));
        onChange(startV1, nv2);
      }
    };
    const up = () => {
      dragging.current = null;
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', up);
  }, [v1, v2, offset, onChange, getFrac]);

  // Handle positions on the donut
  const [hx0, hy0] = toXY(offset, midR);
  const [hx1, hy1] = toXY(offset + v1, midR);
  const [hx2, hy2] = toXY(offset + v1 + v2, midR);

  // Label positions at midpoint of each arc
  const labelR = R + 12;
  const [lx1, ly1] = toXY(offset + v1 / 2, labelR);
  const [lx2, ly2] = toXY(offset + v1 + v2 / 2, labelR);
  const [lx3, ly3] = toXY(offset + v1 + v2 + v3 / 2, labelR);

  const hStyle = { cursor: 'grab', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' };

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg ref={svgRef} width={size} height={size} viewBox={`0 0 ${size} ${size}`}
          style={{ touchAction: 'none', userSelect: 'none', overflow: 'visible' }}>
          <path d={arcPath(offset, offset + v1)} fill={color1} />
          <path d={arcPath(offset + v1, offset + v1 + v2)} fill={color2} />
          <path d={arcPath(offset + v1 + v2, offset + 1)} fill={color3} />
          {pct1 >= 10 && <text x={lx1} y={ly1} textAnchor="middle" dominantBaseline="central"
            style={{ fontSize: 10, fontWeight: 700, fill: color1, pointerEvents: 'none' }}>{pct1}%</text>}
          {pct2 >= 10 && <text x={lx2} y={ly2} textAnchor="middle" dominantBaseline="central"
            style={{ fontSize: 10, fontWeight: 700, fill: color2, pointerEvents: 'none' }}>{pct2}%</text>}
          {pct3 >= 10 && <text x={lx3} y={ly3} textAnchor="middle" dominantBaseline="central"
            style={{ fontSize: 10, fontWeight: 700, fill: color3, pointerEvents: 'none' }}>{pct3}%</text>}
          <circle cx={hx0} cy={hy0} r={8} fill="#fff" stroke="#4a5568" strokeWidth={2} style={hStyle}
            onMouseDown={onDown('h0')} onTouchStart={onDown('h0')} />
          <circle cx={hx1} cy={hy1} r={8} fill="#fff" stroke="#4a5568" strokeWidth={2} style={hStyle}
            onMouseDown={onDown('h1')} onTouchStart={onDown('h1')} />
          <circle cx={hx2} cy={hy2} r={8} fill="#fff" stroke="#4a5568" strokeWidth={2} style={hStyle}
            onMouseDown={onDown('h2')} onTouchStart={onDown('h2')} />
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, gap: 8 }}>
        {[{ label: label1, pct: pct1, color: color1, amount: amounts[0] },
          { label: label2, pct: pct2, color: color2, amount: amounts[1] },
          { label: label3, pct: pct3, color: color3, amount: amounts[2] }].map((s, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', padding: '4px 2px', background: '#f7fafc', borderRadius: 4, borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 10, color: '#718096', fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.amount}</div>
            <div style={{ fontSize: 10, color: '#a0aec0' }}>{s.pct}%</div>
          </div>
        ))}
      </div>
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
// QUERY PARAMS — initialisation depuis l'URL
// ============================================================

function getUrlParams() {
  const p = new URLSearchParams(window.location.search);
  const num = (key, fallback) => {
    const v = p.get(key);
    return v !== null && !isNaN(v) ? parseFloat(v) : fallback;
  };
  const bool = (key, fallback) => {
    const v = p.get(key);
    return v !== null ? v === 'true' : fallback;
  };
  return {
    tjm: num('tjm', DEFAULTS.tjm),
    jours: num('jours', DEFAULTS.jours),
    salaireBrut: num('salaireBrut', DEFAULTS.salaireBrut),
    divNetsVoulus: num('divNetsVoulus', DEFAULTS.divNetsVoulus),
    rendementCapi: num('rendementCapi', num('rendement', null) ?? DEFAULTS.rendementCapi),
    rendementScpi: num('rendementScpi', num('rendement', null) ?? DEFAULTS.rendementScpi),
    rendementPea:  num('rendementPea',  num('rendement', null) ?? DEFAULTS.rendementPea),
    rendementPer:  num('rendementPer',  num('rendement', null) ?? DEFAULTS.rendementPer),
    ageActuel: num('ageActuel', DEFAULTS.ageActuel),
    ageObjectif: num('ageObjectif', DEFAULTS.ageObjectif),
    joursLeverLePied: num('joursLeverLePied', DEFAULTS.joursLeverLePied),
    croquerCapital: bool('croquerCapital', DEFAULTS.croquerCapital),
    ageFin: num('ageFin', DEFAULTS.ageFin),
    per: num('per', DEFAULTS.per),
    salaireBrutCDI: num('salaireBrutCDI', DEFAULTS.salaireBrutCDI),
    ratioTreso: num('ratioTreso', DEFAULTS.ratioTreso),
    ratioCapi: num('ratioCapi', DEFAULTS.ratioCapi),
    inflation: num('inflation', DEFAULTS.inflation),
    partsFiscales: num('partsFiscales', DEFAULTS.partsFiscales),
  };
}

const INIT = getUrlParams();

// ============================================================
// APP PRINCIPALE
// ============================================================

export default function App() {
  const [tjm, setTjm] = useState(INIT.tjm);
  const [jours, setJours] = useState(INIT.jours);
  const [salaireBrut, setSalaireBrut] = useState(INIT.salaireBrut);
  const [divNetsVoulus, setDivNetsVoulus] = useState(INIT.divNetsVoulus);
  const [rendementCapi, setRendementCapi] = useState(INIT.rendementCapi);
  const [rendementScpi, setRendementScpi] = useState(INIT.rendementScpi);
  const [rendementPea,  setRendementPea]  = useState(INIT.rendementPea);
  const [rendementPer,  setRendementPer]  = useState(INIT.rendementPer);
  const [ageActuel, setAgeActuel] = useState(INIT.ageActuel);
  const [ageObjectif, setAgeObjectif] = useState(INIT.ageObjectif);
  const [joursLeverLePied, setJoursLeverLePied] = useState(INIT.joursLeverLePied);
  const [croquerCapital, setCroquerCapital] = useState(INIT.croquerCapital);
  const [ageFin, setAgeFin] = useState(INIT.ageFin);
  const [per, setPer] = useState(INIT.per);
  const [salaireBrutCDI, setSalaireBrutCDI] = useState(INIT.salaireBrutCDI);
  const [ratioTreso, setRatioTreso] = useState(INIT.ratioTreso);
  const [ratioCapi, setRatioCapi] = useState(INIT.ratioCapi);
  const [inflation, setInflation] = useState(INIT.inflation);
  const [partsFiscales, setPartsFiscales] = useState(INIT.partsFiscales);

  const [frais] = useState(DEFAULTS.frais);
  const caHT = tjm * jours;
  const totalFraisHorsPer = Object.values(frais).reduce((a, b) => a + b, 0);

  // Contraintes dynamiques (calcul exact des charges patronales par tranche)
  const c = computeConstraints({ tjm, jours, frais, salaireBrut, per });
  const { maxSalaireBrut, salaireBrutEffectif, maxPer, perEffectif, maxDivNets } = c;
  const superbrut_ = salaireBrutEffectif + computeChargesPatronales(salaireBrutEffectif);
  const fraisAvecPer = { ...frais, per: perEffectif };
  const totalFrais = totalFraisHorsPer + perEffectif;
  const divNetsEffectif = Math.max(0, Math.min(divNetsVoulus, maxDivNets));

  const params = {
    ...DEFAULTS,
    tjm, jours, salaireBrut: salaireBrutEffectif, divNetsVoulus: divNetsEffectif,
    frais: fraisAvecPer, rendementCapi, rendementScpi, rendementPea, rendementPer, ageActuel, ageObjectif,
    croquerCapital, ageFin, joursLeverLePied,
    ratioTreso, ratioCapi, salaireBrutCDI, inflation, partsFiscales
  };

  const r = useMemo(() => computeAll(params), [tjm, jours, salaireBrutEffectif, divNetsEffectif, perEffectif, ratioTreso, ratioCapi, rendementCapi, rendementScpi, rendementPea, rendementPer, inflation, ageActuel, ageObjectif, croquerCapital, ageFin, joursLeverLePied, salaireBrutCDI, partsFiscales]);

  const age50Data = r.projection.find(p => p.age === ageObjectif) || r.projection[r.projection.length - 1];

  // Sync URL avec tous les paramètres pour partage
  useEffect(() => {
    const p = new URLSearchParams();
    const set = (k, v, def) => { if (v !== def) p.set(k, v); };
    set('tjm', tjm, DEFAULTS.tjm);
    set('jours', jours, DEFAULTS.jours);
    set('salaireBrut', salaireBrut, DEFAULTS.salaireBrut);
    set('divNetsVoulus', divNetsVoulus, DEFAULTS.divNetsVoulus);
    set('rendementCapi', rendementCapi, DEFAULTS.rendementCapi);
    set('rendementScpi', rendementScpi, DEFAULTS.rendementScpi);
    set('rendementPea',  rendementPea,  DEFAULTS.rendementPea);
    set('rendementPer',  rendementPer,  DEFAULTS.rendementPer);
    set('ageActuel', ageActuel, DEFAULTS.ageActuel);
    set('ageObjectif', ageObjectif, DEFAULTS.ageObjectif);
    set('joursLeverLePied', joursLeverLePied, DEFAULTS.joursLeverLePied);
    set('croquerCapital', croquerCapital, DEFAULTS.croquerCapital);
    set('ageFin', ageFin, DEFAULTS.ageFin);
    set('per', per, DEFAULTS.per);
    set('salaireBrutCDI', salaireBrutCDI, DEFAULTS.salaireBrutCDI);
    set('ratioTreso', ratioTreso, DEFAULTS.ratioTreso);
    set('ratioCapi', ratioCapi, DEFAULTS.ratioCapi);
    set('inflation', inflation, DEFAULTS.inflation);
    set('partsFiscales', partsFiscales, DEFAULTS.partsFiscales);
    const qs = p.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', url);
  }, [tjm, jours, salaireBrut, divNetsVoulus, rendementCapi, rendementScpi, rendementPea, rendementPer, inflation, ageActuel, ageObjectif, joursLeverLePied, croquerCapital, ageFin, per, salaireBrutCDI, ratioTreso, ratioCapi, partsFiscales]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: 'Simulateur Freelance SASU', url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const [copied, setCopied] = useState(false);
  const handleCopyLLM = () => {
    const text = '```\n' + formatReport({
      tjm, jours, salaireBrut: salaireBrutEffectif, per: perEffectif,
      divNetsVoulus: divNetsEffectif, rendementCapi, rendementScpi, rendementPea, rendementPer, inflation, ageActuel, ageObjectif, joursLeverLePied,
      croquerCapital, ageFin, ratioTreso, ratioCapi, salaireBrutCDI, r
    }) + '\n```';
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f7fafc', fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;700;800&display=swap" rel="stylesheet" />

      <div style={{ background: 'linear-gradient(135deg, #1a365d 0%, #2563eb 100%)', padding: '24px 0 20px', marginBottom: 24 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Simulateur Freelance SASU
            </h1>
            <p style={{ color: '#bee3f8', fontSize: 13, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              J'ai <input type="number" min={20} max={65} value={ageActuel}
                onChange={e => setAgeActuel(Math.max(20, Math.min(65, parseInt(e.target.value) || 20)))}
                style={{ width: 42, padding: '2px 4px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 13, fontWeight: 700,
                  textAlign: 'center', fontFamily: "'JetBrains Mono', monospace" }} /> ans · Toutes formules vérifiables
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleCopyLLM} style={{
              background: copied ? '#38a169' : 'rgba(255,255,255,0.15)',
              color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              transition: 'all 0.2s',
            }}>
              {copied ? 'Copié !' : 'Copy to LLM'}
            </button>
            <button onClick={handleShare} style={{
              background: 'rgba(255,255,255,0.15)',
              color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              transition: 'all 0.2s',
            }}>
              Partager
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 40px' }}>
        {/* ÉTAPE 1 : CHIFFRE D'AFFAIRES */}
        <Card title="1. Chiffre d'affaires" subtitle="Votre facturation = le point de départ" accent="#2563eb">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, alignItems: 'end' }}>
            <Slider label="TJM HT" value={tjm} onChange={setTjm} min={400} max={2500} step={50} />
            <Slider label="Jours facturés/an" value={jours} onChange={setJours} min={150} max={230} step={5} format="num" suffix=" j" />
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 12, color: '#718096', marginBottom: 4 }}>CA HT annuel</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb', fontFamily: "'JetBrains Mono', monospace" }}>{fmt(caHT)}</div>
            </div>
          </div>
        </Card>

        {/* ÉTAPE 2 : CHARGES FIXES */}
        <div style={{ textAlign: 'center', margin: '4px 0', color: '#cbd5e0', fontSize: 20 }}>▼</div>
        <Card title="2. Charges fixes d'exploitation" subtitle="Ce que la société paie quoi qu'il arrive — non lié à votre rémunération" accent="#e53e3e">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {Object.entries(frais).map(([k, v]) => {
              const labels = {
                comptable: 'Comptable', rcPro: 'RC Pro', cfe: 'CFE', banque: 'Banque', bureau: 'Bureau',
                mutuelle: 'Mutuelle', prevoyance: 'Prévoyance', materiel: 'Matériel', chequesVacances: 'Chèques-vacances',
                divers: 'Divers', per: 'PER'
              };
              const tooltips = {
                cfe: "Cotisation Foncière des Entreprises — impôt local dû par toute entreprise, même sans locaux. Montant variable selon la commune.",
                per: "Plan d'Épargne Retraite — versement déductible du résultat (réduit l'IS). Capital bloqué jusqu'à 64 ans sauf cas de déblocage anticipé (achat résidence principale, etc.).",
                rcPro: "Responsabilité Civile Professionnelle — assurance obligatoire couvrant les dommages causés à vos clients dans le cadre de vos missions.",
                prevoyance: "Contrat de prévoyance complémentaire — couvre l'incapacité de travail, l'invalidité et le décès au-delà des garanties du régime général.",
                mutuelle: "Complémentaire santé — non obligatoire pour un dirigeant SASU mais fortement recommandée. Déductible du résultat.",
                chequesVacances: "Chèques-vacances ANCV — exonérés de cotisations sociales et d'impôt sur le revenu dans la limite du SMIC mensuel.",
              };
              return (
              <div key={k} title={tooltips[k] || ''} style={{ fontSize: 11, padding: '4px 10px', background: '#f7fafc', borderRadius: 6, border: '1px solid #e2e8f0', fontFamily: "'JetBrains Mono', monospace", cursor: tooltips[k] ? 'help' : 'default' }}>
                {labels[k] || k} : {fmt(v)}{tooltips[k] ? ' ⓘ' : ''}
              </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#fff5f5', borderRadius: 8, border: '1px solid #fc8181' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#9b2c2c' }}>Total charges fixes</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#9b2c2c', fontFamily: "'JetBrains Mono', monospace" }}>- {fmt(totalFraisHorsPer)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', marginTop: 8, background: '#ebf5ff', borderRadius: 8, border: '1px solid #90cdf4' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#2563eb' }}>Disponible après charges fixes</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#2563eb', fontFamily: "'JetBrains Mono', monospace" }}>{fmt(caHT - totalFraisHorsPer)}</span>
          </div>
        </Card>

        {/* ÉTAPE 3 : RÉPARTITION */}
        <div style={{ textAlign: 'center', margin: '4px 0', color: '#cbd5e0', fontSize: 20 }}>▼</div>
        <Card title="3. Répartition de la rémunération" subtitle="Comment vous répartissez entre salaire, dividendes et ce qui reste dans la société" accent="#38a169">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {/* Colonne salaire */}
            <div style={{ padding: 12, background: '#f7fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1a365d', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Salaire président</div>
              <Slider label="Salaire brut annuel" value={salaireBrutEffectif} onChange={setSalaireBrut} min={30000} max={maxSalaireBrut} step={5000} />
              <div style={{ fontSize: 11, color: '#718096', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span>Superbrut (brut + 42% patronales)</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>- {fmt(r.superbrut)}</span>
              </div>
              <div style={{ fontSize: 11, color: '#718096', display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span>Net perso ({fmt(Math.round(r.salaireNet / 12))}/mois)</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(r.salaireNet)}</span>
              </div>
            </div>
            {/* Colonne PER */}
            <div style={{ padding: 12, background: '#faf5ff', borderRadius: 8, border: '1px solid #d6bcfa' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#553c9a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PER — Plan d'Épargne Retraite</div>
              <Slider label="Versement annuel PER" value={perEffectif} onChange={setPer} min={0} max={maxPer} step={500} />
              <div style={{ fontSize: 11, color: '#718096', marginTop: -8, marginBottom: 0, fontStyle: 'italic' }}>
                Versé par la SASU, déduit du résultat (réduit l'IS) — bloqué jusqu'à 64 ans
              </div>
            </div>
          </div>

          {/* IS + bénéfice */}
          <div style={{ marginTop: 16, padding: 12, background: '#fffff0', borderRadius: 8, border: '1px solid #fefcbf' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#975a16', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Résultat & IS</div>
            <div style={{ fontSize: 11, color: '#718096', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Résultat avant IS</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(r.resultatAvantIS)}</span>
            </div>
            <div style={{ fontSize: 11, color: '#718096', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>IS (taux effectif {fmtPct(r.tauxEffectifIS)})</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>- {fmt(r.isTotal)}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#975a16', display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #fefcbf' }}>
              <span>Bénéfice distribuable</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(r.benefDistribuable)}</span>
            </div>
            <details style={{ marginTop: 8 }}>
              <summary style={{ fontSize: 11, color: '#975a16', cursor: 'pointer', fontWeight: 600 }}>Détail du compte de résultat</summary>
              <div style={{ marginTop: 8, padding: '8px 0' }}>
                <Row label="Chiffre d'affaires HT" value={fmt(r.caHT)} bold sub={`${fmt(tjm)} × ${jours} jours`} />
                <Row label="Rémunération président (superbrut)" value={`- ${fmt(r.superbrut)}`} sub={`brut ${fmt(salaireBrutEffectif)} + cotisations patronales ${fmtPct(r.chargesPatronales / salaireBrutEffectif)} [1]`} />
                <Row label="Charges d'exploitation" value={`- ${fmt(r.totalFrais)}`} sub="comptable, RC Pro, prévoyance, mutuelle, PER, bureau..." />
                <Row label="Résultat fiscal avant IS" value={fmt(r.resultatAvantIS)} bold />
                <Row label="Impôt sur les sociétés (IS)" value={`- ${fmt(r.isTotal)}`} sub={`taux effectif ${fmtPct(r.tauxEffectifIS)} — barème : 15% → 42 500 € puis 25% [2]`} />
                <Row label="Bénéfice distribuable" value={fmt(r.benefDistribuable)} bold highlight sub="montant max que la SASU peut vous verser en dividendes" />
              </div>
            </details>
          </div>

          {/* Répartition du bénéfice */}
          <div style={{ marginTop: 16, padding: 12, background: '#f0fff4', borderRadius: 8, border: '1px solid #9ae6b4' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#22543d', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Répartition du bénéfice</div>
            <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 12, padding: '6px 8px', background: '#e6fffa', borderRadius: 4, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
              <span>Bénéfice distribuable : <b style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(r.benefDistribuable)}</b></span>
              <span>→ après flat tax (31,4%) : <b style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(maxDivNets)}</b> nets max</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {/* Colonne gauche : Dividendes */}
              <div style={{ padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #c6f6d5' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#22543d', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dividendes — dans votre poche</div>
                <Slider label="Dividendes nets annuels (après flat tax)" value={divNetsEffectif} onChange={setDivNetsVoulus} min={0} max={maxDivNets} step={1000} />
                <div style={{ fontSize: 11, color: '#718096', marginTop: -8, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                  {fmt(Math.round(divNetsEffectif / 12))}/mois sur votre compte
                </div>
                <div style={{ fontSize: 11, color: '#718096', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Flat tax prélevée</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>- {fmt(r.flatTax)}</span>
                </div>
                <div style={{ fontSize: 11, color: '#718096', display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                  <span>Dividendes bruts sortis</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(r.divBrutsSortis)}</span>
                </div>
              </div>
              {/* Colonne droite : Reste en SASU */}
              <div style={{ padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #c6f6d5' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1a365d', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reste en SASU — {fmt(r.resteSASU)}</div>
                <div style={{ fontSize: 11, color: '#718096', marginBottom: 8 }}>Glissez les poignées du graphique pour répartir</div>
                <PieSlider
                  v1={ratioTreso} v2={ratioCapi}
                  onChange={(t, c) => { setRatioTreso(t); setRatioCapi(c); }}
                  label1="Réserve tréso" label2="Contrat capi" label3="SCPI (usufruit)"
                  color1="#1a365d" color2="#2563eb" color3="#38a169"
                  amounts={[fmt(r.reserveTreso), fmt(r.contratCapi), fmt(r.scpi)]}
                />
              </div>
            </div>
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 16, marginBottom: 16 }}>

          {/* NET NET */}
          <Card title="Net net — à consommer" subtitle="Ce qui atterrit sur votre compte perso, après charges, IS, flat tax et IR" accent="#38a169">
            <Row label="Salaire net" value={fmt(r.salaireNet)} sub={`${fmt(Math.round(r.salaireNet/12))} /mois — brut ${fmt(salaireBrutEffectif)} moins cotisations salariales (28%) [3]`} />
            <Row label={`Dividendes bruts sortis (${fmtPct(r.ratioDistrib)} du distribuable)`} value={fmt(r.divBrutsSortis)} sub="le reste capitalise dans la SASU" />
            <Row label="Prélèvement forfaitaire unique (flat tax 31,4%)" value={`- ${fmt(r.flatTax)}`} sub="12,8% IR + 18,6% prélèvements sociaux — prélevé à la source [4]" />
            <Row label="Dividendes nets encaissés" value={fmt(r.divNets)} sub={`${fmt(Math.round(r.divNets/12))} /mois sur votre compte`} />
            <div style={{ margin: '8px 0 4px', padding: '8px 12px', background: '#f7fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <Slider label="Parts fiscales du foyer" value={partsFiscales} onChange={setPartsFiscales} min={1} max={5} step={0.5} format="num" suffix=" parts" />
              <div style={{ fontSize: 11, color: '#718096', marginTop: -8, fontStyle: 'italic' }}>
                1 = célibataire · 2 = couple · +0,5 par enfant (×1 à partir du 3e)
              </div>
            </div>
            <Row label="Impôt sur le revenu (votre part du foyer)" value={`- ${fmt(r.votreIR)}`} sub={`TMI ${fmtPct(r.tmi)} · quotient familial ${fmt(r.quotientFamilial)} · ${partsFiscales} parts [5]`} />
            <Row label="Chèques-vacances ANCV" value={`+ ${fmt(frais.chequesVacances)}`} sub="exonéré d'IR et de cotisations sociales [6]" />
            <Row label="PEA (épargne depuis compte perso)" value={`- ${fmt(r.peaPerso)}`} sub="200 €/mois — plus-values exonérées d'IR après 5 ans" />
            <Row label="Net net annuel" value={fmt(r.netNetAnnuel)} bold highlight sub="total à consommer sur l'année, après épargne PEA" />
            <Row label="Net net mensuel" value={fmt(r.netNetMensuel)} bold highlight sub="votre vrai budget — loyer, bouffe, vacances, tout" />
          </Card>

          {/* CAPITALISATION */}
          <Card title="Capitalisation automatique" subtitle="L'argent qui reste dans la SASU et travaille pour vous, sans y toucher" accent="#9b2c2c">
            <Row label="Bénéfice non distribué" value={fmt(r.resteSASU)} bold sub={`${fmtPct(1 - r.ratioDistrib)} du distribuable reste dans la SASU`} />
            <Row label="→ Contrat de capitalisation luxembourgeois (65%)" value={fmt(r.contratCapi)} sub="flexible, super-privilège, pas de plafond de garantie [9]" />
            <Row label="→ Usufruit temporaire SCPI (20%)" value={fmt(r.scpi)} sub="rendement immobilier + amortissement fiscal sur 5 ans" />
            <Row label="→ Réserve de trésorerie SASU (15%)" value={fmt(r.reserveTreso)} sub="renforce le matelas intercontrat" />
            <Row label="PEA — Plan d'Épargne en Actions" value={fmt(r.peaPerso)} sub="200 €/mois depuis votre compte perso (déjà déduit du net net)" />
            <Row label="PER — Plan d'Épargne Retraite" value={fmt(r.per)} sub="versé par la SASU, déduit du résultat (IS) — bloqué jusqu'à 64 ans [8]" />
            <Row label="Total épargne annuelle" value={fmt(r.epargneTotale)} bold highlight sub="placé chaque année sans effort" />
          </Card>

          {/* PRÉVOYANCE */}
          <Card title="Protection sociale & prévoyance" subtitle="Vos filets de sécurité en cas d'arrêt maladie, invalidité ou décès" accent="#d69e2e">
            <Row label="Indemnités journalières Sécu (CPAM)" value={`${fmt(r.ijSecuMois)} /mois`} sub="régime général, plafonné au PASS (48 060 €/an) [7]" />
            <Row label="Complément prévoyance (contrat SASU)" value={`${fmt(r.complementPrevoyance)} /mois`} sub="incapacité/invalidité — ~3 000 €/an de cotisation" />
            <Row label="Total maintien de revenu en arrêt" value={`${fmt(r.totalCouvertMois)} /mois`} bold sub="sécu + prévoyance combinés" />
            <Row label="Découvert vs train de vie" value={`${fmt(Math.max(0, r.netNetMensuel - r.totalCouvertMois))} /mois`} sub="couvert par la trésorerie de sécurité de la SASU" />
            <Row label="Provision pour risque" value={fmt(r.provisionRisque)} bold highlight sub={`6 mois de net net — constituée par la réserve de trésorerie (${fmt(r.reserveTreso)}/an)`} />
            <Row label="Capital décès (contrat prévoyance)" value={fmt(r.capitalDeces)} sub="~3× salaire brut annuel, versé à votre famille" />
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
          <Stat label="Revenu passif net / mois" value={fmt(age50Data.revenuPassifMois)} sub={croquerCapital ? `consommation capital → ${ageFin} ans` : "rente perpétuelle prudente"} />
        </div>

        {/* ÉTAPE 4 : PROJECTION */}
        <div style={{ textAlign: 'center', margin: '4px 0', color: '#cbd5e0', fontSize: 20 }}>▼</div>
        <Card title="4. Projection patrimoniale" subtitle="Paramètres de votre stratégie long terme" accent="#6b46c1">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <Slider label="Rendement contrat capi" value={rendementCapi} onChange={setRendementCapi} min={0.02} max={0.10} step={0.005} format="pct" note="Contrat capi lux, FID actions" />
            <Slider label="Rendement SCPI" value={rendementScpi} onChange={setRendementScpi} min={0.02} max={0.08} step={0.005} format="pct" note="Immobilier, loyers nets de frais" />
            <Slider label="Rendement PEA" value={rendementPea} onChange={setRendementPea} min={0.02} max={0.12} step={0.005} format="pct" note="ETF actions européennes" />
            <Slider label="Rendement PER" value={rendementPer} onChange={setRendementPer} min={0.02} max={0.08} step={0.005} format="pct" note="Allocation mixte/défensive" />
            <Slider label="Inflation anticipée" value={inflation} onChange={setInflation} min={0} max={0.05} step={0.005} format="pct" />
            <Slider label="Objectif lever le pied" value={ageObjectif} onChange={setAgeObjectif} min={42} max={60} step={1} format="num" suffix=" ans" />
            <Slider label="Jours missions après objectif" value={joursLeverLePied} onChange={setJoursLeverLePied} min={0} max={150} step={5} format="num" suffix=" j/an" />
            <NumberInput label="Dernier salaire brut CDI (avant freelance)" value={salaireBrutCDI} onChange={setSalaireBrutCDI} min={0} max={200000} step={1000} suffix="€" />
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ padding: '10px 16px', background: croquerCapital ? '#fff5f5' : '#f0fff4',
              borderRadius: 8, border: `1px solid ${croquerCapital ? '#fc8181' : '#9ae6b4'}`, cursor: 'pointer', flex: '1 1 auto' }}
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
              <div style={{ minWidth: 200 }}>
                <Slider label="Âge fin de capital" value={ageFin} onChange={setAgeFin} min={70} max={95} step={1} format="num" suffix=" ans" />
              </div>
            )}
          </div>
        </Card>

        {/* GRAPHIQUE PROJECTION */}
        <Card title={`Timeline complète ${ageActuel} → ${ageFin} ans`} subtitle="Patrimoine et revenus à chaque âge — le capital continue de travailler même quand vous levez le pied" accent="#9b2c2c">
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
              {inflation > 0 && <Line yAxisId="revenu" type="stepAfter" dataKey="revenuTotalMoisReel" stroke="#e53e3e" strokeWidth={2} name={`Revenu réel /mois (€ ${new Date().getFullYear()})`} dot={false} strokeDasharray="6 3" />}
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
                  {inflation > 0 && <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 800, background: '#2d3748', fontSize: 10 }}>en € {new Date().getFullYear()}</th>}
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
                        {inflation > 0 && <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700, color: '#9b2c2c', background: i % 2 === 0 ? '#fff5f5' : '#fffafa' }}>{fmt(p.revenuTotalMoisReel)}</td>}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: '#a0aec0' }}>
            Retraite base : {fmt(r.retraiteBaseMois)}/mois + complémentaire AGIRC-ARRCO : {fmt(r.retraiteCompMois)}/mois = {fmt(r.retraiteTotaleMois)}/mois — estimé sur {ageActuel - 22} ans CDI (dernier salaire {fmt(salaireBrutCDI)} brut, progression +2,5%/an) + {ageObjectif - ageActuel} ans SASU à {fmt(params.salaireBrut)} brut, taux plein à 67 ans.
            Sources : <a href="https://www.legislation.cnav.fr/Pages/bareme.aspx?Nom=salaire_annuel_moyen_702" target="_blank" rel="noopener" style={{ color: '#718096' }}>SAM (CNAV)</a> · <a href="https://www.agirc-arrco.fr/mes-services-particuliers/les-experts-retraite/valeur-du-point/" target="_blank" rel="noopener" style={{ color: '#718096' }}>Points AGIRC-ARRCO</a> · <a href="https://www.service-public.fr/particuliers/vosdroits/F21552" target="_blank" rel="noopener" style={{ color: '#718096' }}>Calcul pension base</a>
          </div>
        </Card>

        {/* SOLVEUR RATIO */}
        <Card title="Solveur — dividendes vs capitalisation" subtitle={`Et si vous changiez le montant de dividendes ? Impact sur votre net et votre patrimoine à ${ageObjectif} ans (objectif ci-dessus).`} accent="#6b46c1">
          <div style={{ fontSize: 12, color: '#718096', marginBottom: 12 }}>
            Chaque ligne simule un montant de dividendes nets différent, avec {r.annees} ans de capitalisation (jusqu'à {ageObjectif} ans). La ligne surlignée correspond à votre choix actuel ({fmt(r.divNets)}/an).
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
              <thead>
                <tr style={{ background: '#1a365d', color: '#fff' }}>
                  <th style={{ padding: '8px 6px', textAlign: 'right' }}>Div. nets /an</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center' }}>Ratio</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right' }}>Net /mois</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right' }}>Capital {ageObjectif} ans</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right' }}>Rente /mois à {ageObjectif} ans</th>
                  {inflation > 0 && <th style={{ padding: '8px 6px', textAlign: 'right', background: '#2d3748', fontSize: 10 }}>Rente en € {new Date().getFullYear()}</th>}
                </tr>
              </thead>
              <tbody>
                {r.scenariosRatio.map((s, i) => (
                  <tr key={i} style={{ background: s.isSelected ? '#f0fff4' : i % 2 === 0 ? '#fff' : '#f7fafc',
                    fontWeight: s.isSelected ? 700 : 400, borderLeft: s.isSelected ? '3px solid #38a169' : '3px solid transparent' }}>
                    <td style={{ padding: '6px', textAlign: 'right' }}>{fmt(s.divNets)}</td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>{fmtPct(s.ratio)}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>{fmt(s.netMensuel)}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>{fmtK(s.capital50)}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>{fmt(s.revenuPassif)}</td>
                    {inflation > 0 && <td style={{ padding: '6px', textAlign: 'right', color: '#9b2c2c', background: s.isSelected ? '#fff5f5' : i % 2 === 0 ? '#fffafa' : '#fff5f5' }}>{fmt(s.revenuPassifReel)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* SCÉNARIOS À CHAQUE ÂGE CLÉ */}
        <Card title="Revenus mensuels à chaque étape de vie" subtitle="Du freelance jusqu'à la retraite — combien vous touchez, d'où ça vient" accent="#38a169">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { label: "Freelance", emoji: "🚀", value: Math.round(r.netNetMensuel), reel: Math.round(r.netNetMensuel), sub: `${ageActuel}→${ageObjectif} ans`, color: "#2563eb" },
              { label: `${ageObjectif} ans (${joursLeverLePied}j/an)`, emoji: "⛵",
                value: (r.projection.find(p => p.age === ageObjectif + 1) || {}).revenuTotalMois || 0,
                reel: (r.projection.find(p => p.age === ageObjectif + 1) || {}).revenuTotalMoisReel || 0,
                sub: `${joursLeverLePied}j missions + passif`, color: "#38a169" },
              { label: "64 ans (PER débloqué)", emoji: "🔓",
                value: (r.projection.find(p => p.age === 64) || {}).revenuTotalMois || 0,
                reel: (r.projection.find(p => p.age === 64) || {}).revenuTotalMoisReel || 0,
                sub: "missions + passif + PER", color: "#6b46c1" },
              { label: `${r.ageRetraite} ans (retraite)`, emoji: "🏖️",
                value: (r.projection.find(p => p.age === r.ageRetraite) || {}).revenuTotalMois || 0,
                reel: (r.projection.find(p => p.age === r.ageRetraite) || {}).revenuTotalMoisReel || 0,
                sub: "passif + retraite + PER", color: "#d69e2e" },
              { label: "75 ans", emoji: "🌅",
                value: (r.projection.find(p => p.age === 75) || {}).revenuTotalMois || 0,
                reel: (r.projection.find(p => p.age === 75) || {}).revenuTotalMoisReel || 0,
                sub: "rente perpétuelle", color: "#9b2c2c" },
            ].map((s, i) => (
              <div key={i} style={{ background: '#f7fafc', borderRadius: 10, padding: 14, textAlign: 'center',
                borderTop: `3px solid ${s.color}` }}>
                <div style={{ fontSize: 24, marginBottom: 2 }}>{s.emoji}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.label}</div>
                <div style={{ fontSize: 10, color: '#718096', marginBottom: 6 }}>{s.sub}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#1a365d', fontFamily: "'JetBrains Mono', monospace" }}>
                  {fmt(inflation > 0 ? s.reel : s.value)}
                  <span style={{ fontSize: 10, fontWeight: 400, color: '#718096' }}>/mois</span>
                </div>
                {inflation > 0 && (
                  <div style={{ fontSize: 9, color: '#718096', marginTop: 1 }}>en € {new Date().getFullYear()}</div>
                )}
                {inflation > 0 && s.reel !== s.value && (
                  <div style={{ fontSize: 10, color: '#a0aec0', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmt(s.value)} nominal
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: 12, background: croquerCapital ? '#fff5f5' : '#f0fff4', borderRadius: 8, fontSize: 12,
            color: croquerCapital ? '#9b2c2c' : '#22543d' }}>
            {(() => {
              const p1 = r.projection.find(p => p.age === ageObjectif + 1) || {};
              const reelNote = inflation > 0 ? ` (${fmt(p1.revenuTotalMoisReel || 0)} en € ${new Date().getFullYear()})` : '';
              return croquerCapital ? (
                <>
                  <strong>Mode "je croque tout" :</strong> Vous retirez {fmt(r.drawdownMensuelNet)}/mois net de votre capital
                  à partir de {ageObjectif} ans (+ missions + retraite).
                  {ageObjectif < 64 && r.drawdownAnnuelBrutApres64 > 0 && (
                    <> Le PER est bloqué jusqu'à 64 ans — à 64 ans le retrait passe à {fmt(r.drawdownAnnuelBrutApres64 * 0.7 / 12)}/mois net.</>
                  )}
                  {' '}Le capital atteint 0 € à {ageFin} ans.
                  Après {ageFin} ans il ne reste que la retraite obligatoire ({fmt(r.retraiteTotaleMois)}/mois).
                  <br />C'est ~{Math.round(r.drawdownMensuelNet / Math.max(1, (r.capitalHorsPerAtObjectif * 0.04 * 0.7 / 12)) * 100 - 100)}% de revenu en plus
                  qu'en rente perpétuelle (hors PER), mais rien à transmettre.
                </>
              ) : (
                <>
                  <strong>Mode rente perpétuelle :</strong> votre revenu ne baisse jamais en dessous de {fmt(p1.revenuTotalMois || 0)}/mois{reelNote}
                  {' '}après {ageObjectif} ans. À {r.ageRetraite} ans, la retraite ({fmt(r.retraiteTotaleMois)}/mois) s'ajoute.
                  Le taux de retrait inclut une marge de sécurité (−0,5 pt) pour absorber la volatilité → le capital est préservé.
                </>
              );
            })()}
          </div>
        </Card>

        <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', marginTop: 24,
          borderLeft: '4px solid #a0aec0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, color: '#1a365d',
            textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'DM Sans', sans-serif" }}>Sources réglementaires (2026)</h3>
          <div style={{ fontSize: 11, color: '#4a5568', lineHeight: 1.8, fontFamily: "'DM Sans', sans-serif" }}>
            <div title="Maladie 13% · vieillesse 8,55%+2,02% · AF 5,25% · AT/MP 0,44% · CSA 0,30% · FNAL 0,10% · AGIRC-ARRCO 4,72%/12,95% · CEG 1,29%/1,62% · CET 0,21% · prévoyance décès 1,50% · APEC 0,036% · formation 0,55% · apprentissage 0,68%"><strong>[1]</strong> Cotisations patronales ~{fmtPct(r.chargesPatronales / salaireBrutEffectif)} — calcul exact par tranche (PASS = 48 060 €), président SASU assimilé salarié sans taux réduit maladie/AF ni Fillon <span style={{ cursor: 'help', opacity: 0.5 }}>(?)</span></div>
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
