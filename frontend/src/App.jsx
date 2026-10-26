import { useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const fmt = (v) => (v == null ? "–" : Math.round(v).toLocaleString());

function Card({ label, value, unit, hint }) {
  return (
    <div className="card">
      <div className="card-label">{label}</div>
      <div className="card-value">{value}<span className="unit"> {unit}</span></div>
      <div className="card-hint">{hint}</div>
    </div>
  );
}

export default function App() {
  const [start, setStart] = useState("2026-01-01");
  const [end, setEnd] = useState("2026-01-31");
  const [cutoff, setCutoff] = useState(9);
  const [series, setSeries] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [byHour, setByHour] = useState([]);
  const [byHorizon, setByHorizon] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = `start=${start}&end=${end}&cutoff_hour=${cutoff}`;
    const qh = `start=${start}&end=${end}`;
    setLoading(true);
    setError("");
    Promise.all([
      fetch(`${API}/api/data?${q}`).then((r) => r.json()),
      fetch(`${API}/api/metrics?${q}`).then((r) => r.json()),
      fetch(`${API}/api/metrics/by-hour?${q}`).then((r) => r.json()),
      fetch(`${API}/api/metrics/by-horizon?${qh}`).then((r) => r.json()),
    ])
      .then(([d, m, h, hz]) => {
        setSeries(d.map((x) => ({ ...x, t: x.startTime.slice(5, 16).replace("T", " ") })));
        setMetrics(m);
        setByHour(h);
        setByHorizon(hz);
      })
      .catch(() => setError("Could not reach the API. Is the backend running?"))
      .finally(() => setLoading(false));
  }, [start, end, cutoff]);

  const m = metrics;
  const pct = m && m.mean_actual ? ((m.bias / m.mean_actual) * 100).toFixed(1) : null;
  const headline =
    m && m.n > 0
      ? `With decisions made by ${String(cutoff).padStart(2, "0")}:00 UTC the day before, the wind forecast ` +
        `${m.bias >= 0 ? "over-predicted" : "under-predicted"} actual generation by about ` +
        `${fmt(Math.abs(m.bias))} MW (${Math.abs(pct)}%) on average, and was off by ${fmt(m.mae)} MW in a typical half-hour.`
      : "";

  return (
    <div className="page">
      <header>
        <h1>UK Wind Forecast Accuracy</h1>
        <p className="sub">Day-ahead buying view · National wind generation · Source: Elexon BMRS (FUELHH, WINDFOR)</p>
      </header>

      <section className="controls">
        <label>From <input type="date" value={start} min="2026-01-01" max="2026-01-31" onChange={(e) => setStart(e.target.value)} /></label>
        <label>To <input type="date" value={end} min="2026-01-01" max="2026-01-31" onChange={(e) => setEnd(e.target.value)} /></label>
        <label>
          Decision cutoff (UTC hour, day before delivery)
          <input type="number" min="0" max="23" value={cutoff} onChange={(e) => setCutoff(Math.min(23, Math.max(0, Number(e.target.value) || 0)))} />
        </label>
      </section>

      {error && <div className="error">{error}</div>}
      {loading && <div className="muted">Loading…</div>}

      {m && m.n > 0 && (
        <>
          <p className="headline">{headline}</p>
          <section className="cards">
            <Card label="Mean absolute error" value={fmt(m.mae)} unit="MW" hint="Typical miss per half-hour" />
            <Card label="RMSE" value={fmt(m.rmse)} unit="MW" hint="Penalises large misses" />
            <Card label="Bias" value={(m.bias >= 0 ? "+" : "") + fmt(m.bias)} unit="MW" hint="+ means forecast too high" />
            <Card label="MAPE" value={m.mape} unit="%" hint="Average % error" />
            <Card label="Points compared" value={fmt(m.n)} unit="" hint="Hourly forecast vs actual" />
          </section>

          <h2>Actual vs latest available forecast</h2>
          <div className="chart">
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" minTickGap={60} />
                <YAxis tickFormatter={fmt} unit=" MW" width={90} />
                <Tooltip formatter={(v) => `${fmt(v)} MW`} />
                <Legend />
                <Line type="monotone" dataKey="actual" name="Actual" stroke="#2563eb" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#f97316" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="two-col">
            <div>
              <h2>Error by hour of day (UTC)</h2>
              <div className="chart">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byHour}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis tickFormatter={fmt} width={70} />
                    <Tooltip formatter={(v) => `${fmt(v)} MW`} />
                    <Legend />
                    <ReferenceLine y={0} stroke="#444" />
                    <Bar dataKey="mae" name="MAE" fill="#6366f1" />
                    <Bar dataKey="bias" name="Bias" fill="#f97316" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <h2>Error by how early the forecast was made</h2>
              <div className="chart">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byHorizon}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" />
                    <YAxis tickFormatter={fmt} width={70} />
                    <Tooltip formatter={(v) => `${fmt(v)} MW`} />
                    <Legend />
                    <Bar dataKey="mae" name="MAE" fill="#6366f1" />
                    <Bar dataKey="bias" name="Bias" fill="#f97316" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
      {m && m.n === 0 && !loading && <div className="muted">No data for this range.</div>}

      <footer>
        Forecast shown = latest WINDFOR forecast published before the cutoff. Actuals = FUELHH wind. Forecasts are
        hourly, so comparison is on the hour. Times in UTC (= UK time in January).
      </footer>
    </div>
  );
}
