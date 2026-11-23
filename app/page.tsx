 "use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Coffee, DollarSign, Package, ShoppingBag, Plus, RefreshCw, AlertCircle } from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import type { NuevaVenta, Venta } from "@/types/venta";

const money = (value: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);

export default function Home() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState<NuevaVenta>({
    presentacion: "grano", tueste: "medio", gramos: 250, cantidad: 1, total_mxn: 180
  });

  const cargarVentas = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    setError("");
    const { data, error: queryError } = await supabase
      .from("ventas_cafe").select("*").order("created_at", { ascending: false }).limit(100);
    if (queryError) setError(queryError.message);
    else setVentas((data ?? []) as Venta[]);
    setLoading(false);
  }, []);

  useEffect(() => { void cargarVentas(); }, [cargarVentas]);

  const resumen = useMemo(() => {
    const total = ventas.reduce((sum, v) => sum + Number(v.total_mxn), 0);
    const bolsas = ventas.reduce((sum, v) => sum + v.cantidad, 0);
    const grano = ventas.filter(v => v.presentacion === "grano").reduce((sum, v) => sum + v.cantidad, 0);
    const molido = ventas.filter(v => v.presentacion === "molido").reduce((sum, v) => sum + v.cantidad, 0);
    return { total, bolsas, grano, molido };
  }, [ventas]);

  const chartData = useMemo(() => {
    const days = new Map<string, number>();
    [...ventas].reverse().forEach(v => {
      const day = new Date(v.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
      days.set(day, (days.get(day) ?? 0) + Number(v.total_mxn));
    });
    return Array.from(days, ([fecha, ingresos]) => ({ fecha, ingresos }));
  }, [ventas]);

  async function registrarVenta(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;
    setSaving(true); setNotice(""); setError("");
    const { error: insertError } = await supabase.from("ventas_cafe").insert(form);
    if (insertError) setError(insertError.message);
    else {
      setNotice("Venta registrada correctamente.");
      setForm({ presentacion: "grano", tueste: "medio", gramos: 250, cantidad: 1, total_mxn: 180 });
      await cargarVentas();
    }
    setSaving(false);
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><div className="brand-icon"><Coffee size={23} /></div><div><strong>Dashboard Café</strong><span>Panel de ventas</span></div></div>
        <button className="refresh" onClick={() => void cargarVentas()}><RefreshCw size={16}/> Actualizar</button>
      </header>

      <section className="welcome">
        <div><p className="eyebrow">RESUMEN DEL NEGOCIO</p><h1>Tu café, tus números.</h1><p className="sub">Controla tus ventas de café en grano y molido desde un solo lugar.</p></div>
        <div className="date-pill">{new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
      </section>

      {!supabaseConfigured && <div className="alert"><AlertCircle size={18}/><div><b>Falta conectar Supabase.</b><br/>Copia .env.example como .env.local, agrega tu Project URL y tu clave publicable, y reinicia el servidor.</div></div>}
      {error && <div className="alert error"><AlertCircle size={18}/><div><b>No se pudo completar la operación.</b><br/>{error}<br/><small>Verifica que ejecutaste el SQL incluido y que las políticas de acceso estén configuradas.</small></div></div>}
      {notice && <div className="success">{notice}</div>}

      <section className="metrics">
        <article className="metric"><div className="metric-head"><span>Ingresos registrados</span><div className="metric-icon green"><DollarSign size={19}/></div></div><strong>{money(resumen.total)}</strong><small>Total de ventas cargadas</small></article>
        <article className="metric"><div className="metric-head"><span>Bolsas vendidas</span><div className="metric-icon beige"><ShoppingBag size={19}/></div></div><strong>{resumen.bolsas}</strong><small>Unidades registradas</small></article>
        <article className="metric"><div className="metric-head"><span>Café en grano</span><div className="metric-icon green"><Coffee size={19}/></div></div><strong>{resumen.grano}</strong><small>Bolsas vendidas</small></article>
        <article className="metric"><div className="metric-head"><span>Café molido</span><div className="metric-icon beige"><Package size={19}/></div></div><strong>{resumen.molido}</strong><small>Bolsas vendidas</small></article>
      </section>

      <section className="content-grid">
        <article className="panel chart-panel">
          <div className="panel-title"><div><h2>Ventas registradas</h2><p>Ingresos por fecha · últimos 100 registros</p></div></div>
          {chartData.length > 0 ? <div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#71866a" stopOpacity={0.28}/><stop offset="95%" stopColor="#71866a" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ecebe5"/><XAxis dataKey="fecha" tickLine={false} axisLine={false}/><YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`}/><Tooltip formatter={(v) => money(Number(v))}/><Area type="monotone" dataKey="ingresos" stroke="#647b5d" strokeWidth={2.5} fill="url(#fillSales)"/></AreaChart></ResponsiveContainer></div> : <div className="empty-chart">{loading ? "Cargando ventas…" : "Cuando registres ventas, aquí aparecerá tu gráfica."}</div>}
        </article>

        <article className="panel form-panel">
          <div className="panel-title"><div><h2><Plus size={18}/> Registrar venta</h2><p>Agrega una nueva operación</p></div></div>
          <form onSubmit={registrarVenta}>
            <label>Presentación<select value={form.presentacion} onChange={e => setForm({...form, presentacion: e.target.value as NuevaVenta["presentacion"]})}><option value="grano">Café en grano</option><option value="molido">Café molido</option></select></label>
            <label>Tipo de tueste<select value={form.tueste} onChange={e => setForm({...form, tueste: e.target.value as NuevaVenta["tueste"]})}><option value="claro">Claro</option><option value="medio">Medio</option><option value="oscuro">Oscuro</option></select></label>
            <div className="form-row">
              <label>Gramaje<select value={form.gramos} onChange={e => setForm({...form, gramos: Number(e.target.value)})}><option value={250}>250 g</option><option value={500}>500 g</option><option value={1000}>1 kg</option></select></label>
              <label>Cantidad<input type="number" min="1" step="1" required value={form.cantidad} onChange={e => setForm({...form, cantidad: Number(e.target.value)})}/></label>
            </div>
            <label>Total de venta (MXN)<input type="number" min="0.01" step="0.01" required value={form.total_mxn} onChange={e => setForm({...form, total_mxn: Number(e.target.value)})}/></label>
            <button className="primary" type="submit" disabled={saving || !supabaseConfigured}>{saving ? "Guardando…" : "Guardar venta"}</button>
          </form>
        </article>
      </section>

      <section className="panel history">
        <div className="panel-title"><div><h2>Últimas ventas</h2><p>Movimientos guardados en Supabase</p></div><span className="count">{ventas.length} registros</span></div>
        <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Presentación</th><th>Tueste</th><th>Gramaje</th><th>Cantidad</th><th className="right">Total</th></tr></thead><tbody>
          {ventas.map(v => <tr key={v.id}><td>{new Date(v.created_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</td><td><span className="tag">{v.presentacion === "grano" ? "En grano" : "Molido"}</span></td><td className="capitalize">{v.tueste}</td><td>{v.gramos >= 1000 ? `${v.gramos / 1000} kg` : `${v.gramos} g`}</td><td>{v.cantidad}</td><td className="right amount">{money(Number(v.total_mxn))}</td></tr>)}
          {!loading && ventas.length === 0 && <tr><td colSpan={6} className="no-data">Todavía no hay ventas. Registra la primera en el formulario.</td></tr>}
          {loading && <tr><td colSpan={6} className="no-data">Cargando historial…</td></tr>}
        </tbody></table></div>
      </section>
      <footer>Dashboard Café · Hecho para ayudarte a entender y hacer crecer tu negocio.</footer>
    </main>
  );
}
