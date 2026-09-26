import { useEffect, useMemo, useState } from 'react';

// Kapazitäts-Dashboard: geplante Wocheneinheiten (manuell) vs. gebuchte Termine (CSV-Export).
// 1 Einheit = 30 Minuten. Ausschließlich synthetische Beispieldaten.

const UNIT_MIN = 30;
const DEFAULT_PLANNED = 50;
const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function parseDate(s) {
  const m = s.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  const iso = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  return null;
}
function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}
function monday(d) { const r = new Date(d); r.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return r; }
function fmt(d) { return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`; }

function parseCsv(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
  const head = lines[0].split(sep).map(h => h.trim().toLowerCase());
  const col = (...names) => head.findIndex(h => names.some(n => h.startsWith(n)));
  const iDate = col('datum', 'date'), iTime = col('uhrzeit', 'zeit', 'time'), iDur = col('dauer', 'duration');
  const iType = col('terminart', 'typ', 'type'), iCal = col('kalender', 'calendar'), iStat = col('status'), iPat = col('patient');
  const out = [];
  for (const line of lines.slice(1)) {
    const c = line.split(sep).map(x => x.trim());
    const date = iDate >= 0 ? parseDate(c[iDate] || '') : null;
    if (!date) continue;
    const dur = iDur >= 0 ? parseInt(c[iDur], 10) || UNIT_MIN : UNIT_MIN;
    const status = iStat >= 0 ? (c[iStat] || 'gebucht').toLowerCase() : 'gebucht';
    out.push({ date, time: iTime >= 0 ? c[iTime] : '', dur, units: dur / UNIT_MIN, type: iType >= 0 ? c[iType] : '',
      cal: iCal >= 0 ? c[iCal] : '', status, patient: iPat >= 0 ? c[iPat] : '', week: isoWeek(date) });
  }
  return out;
}

function level(pct) { return pct >= 90 ? 'high' : pct >= 65 ? 'mid' : 'low'; }
const LABEL = { high: 'nahezu voll', mid: 'gut gebucht', low: 'viel frei' };

export default function App() {
  const [appts, setAppts] = useState([]);
  const [fileName, setFileName] = useState('');
  const [planned, setPlanned] = useState({});
  const [selected, setSelected] = useState(null);
  const [countCancelled, setCountCancelled] = useState(false);

  async function loadExample() {
    const txt = await fetch('/beispiel-export-samedi.csv').then(r => r.text());
    setAppts(parseCsv(txt)); setFileName('beispiel-export-samedi.csv (Demo)');
  }
  useEffect(() => { loadExample(); }, []);

  function onFile(e) {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { setAppts(parseCsv(String(r.result))); setFileName(f.name); setSelected(null); };
    r.readAsText(f, 'utf-8');
  }

  const weeks = useMemo(() => {
    const map = new Map();
    for (const a of appts) {
      if (!countCancelled && a.status.startsWith('abges')) continue;
      if (!map.has(a.week)) map.set(a.week, { key: a.week, monday: monday(a.date), booked: 0, count: 0, days: Array(7).fill(0), types: {}, list: [] });
      const w = map.get(a.week);
      w.booked += a.units; w.count += 1; w.days[(a.date.getDay() + 6) % 7] += a.units;
      w.types[a.type || 'Sonstige'] = (w.types[a.type || 'Sonstige'] || 0) + a.units; w.list.push(a);
    }
    return [...map.values()].sort((a, b) => a.monday - b.monday).map(w => {
      const plan = planned[w.key] ?? DEFAULT_PLANNED;
      const free = plan - w.booked; const pct = plan ? Math.round((w.booked / plan) * 100) : 0;
      return { ...w, plan, free, pct, lvl: level(pct) };
    });
  }, [appts, planned, countCancelled]);

  const total = weeks.reduce((s, w) => ({ plan: s.plan + w.plan, booked: s.booked + w.booked, count: s.count + w.count }), { plan: 0, booked: 0, count: 0 });
  const totalPct = total.plan ? Math.round((total.booked / total.plan) * 100) : 0;
  const sel = weeks.find(w => w.key === selected) || weeks[0];
  const maxBar = Math.max(1, ...weeks.map(w => Math.max(w.plan, w.booked)));

  return (
    <>
      <header className="topbar">
        <div className="brand"><span className="dot" /> Kapazitäts-Dashboard · Standort Mitte</div>
        <div className="toolbar">
          <label className="check"><input type="checkbox" checked={countCancelled} onChange={e => setCountCancelled(e.target.checked)} /> abgesagte mitzählen</label>
          <label className="btn">
            CSV-Export hochladen
            <input type="file" accept=".csv,text/csv" onChange={onFile} hidden />
          </label>
          <button className="btn ghost" onClick={loadExample}>Demo-Daten</button>
        </div>
      </header>

      <main className="container wide">
        <div className="filebar">Datenquelle: <strong>{fileName || '–'}</strong> · {appts.length} Termine · 1 Einheit = {UNIT_MIN} Min</div>

        <section className="kpis">
          <Kpi label="Geplante Einheiten" value={total.plan} sub={`${weeks.length} Wochen`} />
          <Kpi label="Gebuchte Einheiten" value={total.booked} sub={`${total.count} Termine`} />
          <Kpi label="Freie Einheiten" value={total.plan - total.booked} sub="Delta Plan minus gebucht" tone={total.plan - total.booked < 0 ? 'high' : 'ok'} />
          <Kpi label="Auslastung" value={`${totalPct} %`} sub={LABEL[level(totalPct)]} tone={level(totalPct)} />
        </section>

        <section className="card">
          <h2>Auslastung pro Woche</h2>
          <div className="chart">
            {weeks.map(w => (
              <div key={w.key} className={`bar-col ${sel?.key === w.key ? 'active' : ''}`} onClick={() => setSelected(w.key)} title={`${w.booked} von ${w.plan} Einheiten`}>
                <div className="bar-area">
                  <div className="bar plan" style={{ height: `${(w.plan / maxBar) * 100}%` }} />
                  <div className={`bar booked ${w.lvl}`} style={{ height: `${(w.booked / maxBar) * 100}%` }}><span>{w.pct} %</span></div>
                </div>
                <div className="bar-label">KW {w.key.slice(-2)}</div>
              </div>
            ))}
          </div>
          <div className="legend"><span className="sw plan" /> geplant <span className="sw low" /> unter 65 % <span className="sw mid" /> 65 bis 89 % <span className="sw high" /> ab 90 %</div>
        </section>

        <section className="weeks">
          {weeks.map(w => (
            <div key={w.key} className={`card week ${w.lvl} ${sel?.key === w.key ? 'active' : ''}`} onClick={() => setSelected(w.key)}>
              <div className="week-head">
                <div><div className="week-kw">KW {w.key.slice(-2)}</div><div className="week-range">{fmt(w.monday)} bis {fmt(new Date(w.monday.getTime() + 4 * 86400000))}{w.monday.getFullYear()}</div></div>
                <span className={`badge ${w.lvl}`}>{w.pct} %</span>
              </div>
              <label className="plan-input" onClick={e => e.stopPropagation()}>
                geplant
                <input type="number" min="0" value={w.plan} onChange={e => setPlanned({ ...planned, [w.key]: Math.max(0, parseInt(e.target.value, 10) || 0) })} />
                <span>Einheiten</span>
              </label>
              <div className="week-nums">
                <div><small>gebucht</small><b>{w.booked}</b></div>
                <div><small>frei</small><b className={w.free < 0 ? 'neg' : ''}>{w.free}</b></div>
                <div><small>Termine</small><b>{w.count}</b></div>
              </div>
              <div className="progress"><div className={`fill ${w.lvl}`} style={{ width: `${Math.min(100, w.pct)}%` }} /></div>
              <div className="mini-days">
                {w.days.slice(0, 5).map((u, i) => <div key={i}><span style={{ height: `${Math.min(100, (u / 18) * 100)}%` }} /><small>{DAYS[i]}</small></div>)}
              </div>
            </div>
          ))}
          {!weeks.length && <div className="card empty">Keine Termine erkannt. Bitte CSV-Export hochladen.</div>}
        </section>

        {sel && (
          <section className="card">
            <h2>Detail KW {sel.key.slice(-2)} · {sel.booked} von {sel.plan} Einheiten gebucht · {sel.free} frei</h2>
            <div className="detail">
              <div>
                <h3>Nach Terminart</h3>
                <table className="tbl"><tbody>
                  {Object.entries(sel.types).sort((a, b) => b[1] - a[1]).map(([t, u]) => (
                    <tr key={t}><td>{t}</td><td className="num">{u}</td><td className="num muted">{Math.round((u / sel.booked) * 100)} %</td></tr>
                  ))}
                </tbody></table>
              </div>
              <div>
                <h3>Termine</h3>
                <div className="scroll">
                  <table className="tbl"><thead><tr><th>Datum</th><th>Zeit</th><th>Terminart</th><th>Kalender</th><th className="num">Einh.</th></tr></thead><tbody>
                    {sel.list.map((a, i) => (
                      <tr key={i} className={a.status.startsWith('abges') ? 'cancelled' : ''}><td>{DAYS[(a.date.getDay() + 6) % 7]} {fmt(a.date)}</td><td>{a.time}</td><td>{a.type}</td><td className="muted">{a.cal}</td><td className="num">{a.units}</td></tr>
                    ))}
                  </tbody></table>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}

function Kpi({ label, value, sub, tone = '' }) {
  return <div className={`card kpi ${tone}`}><small>{label}</small><div className="kpi-value">{value}</div><span className="muted">{sub}</span></div>;
}
