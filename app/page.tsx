"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Coffee, DollarSign, Package, ShoppingBag, Plus, RefreshCw, AlertCircle, LogOut, LockKeyhole } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { supabase, supabaseConfigured } from "@/lib/supabase";
import type { Venta } from "@/types/venta";
const money = (value: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);


export default function Home() {

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  

  

 const cargarVentas = useCallback(async () => {
  if (!supabase) {
    setVentas([]);
    setLoading(false);
    return;
  }

  setLoading(true);
  setError("");

  const { data, error: queryError } = await supabase
    .from("ventas_publicas")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (queryError) {
    setError(queryError.message);
  } else {
    setVentas((data ?? []) as Venta[]);
  }

  setLoading(false);
}, []);

 useEffect(() => {
  void cargarVentas();
}, [cargarVentas]);
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

 
  

 

 
  if (!supabaseConfigured) return <main className="auth-shell"><section className="auth-card"><div className="brand-icon"><Coffee size={24}/></div><h1>Dashboard Café</h1><p>Falta conectar Supabase. Revisa las variables de entorno de Vercel.</p></section></main>;
 
 
  

  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><div className="brand-icon"><Coffee size={23}/></div><div><strong>Dashboard Café</strong><span>Panel de ventas</span></div></div><div className="user-actions">
  <span className="role-pill">Consulta pública</span>
</div></header>
      <section className="welcome"><div><p className="eyebrow">VISTA GENERAL DEL NEGOCIO</p><h1>Tu café, tus números.</h1><p className="sub">Consulta las ventas registradas del negocio.</p></div><div className="date-pill">{new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div></section>
      {error && <div className="alert error"><AlertCircle size={18}/><div><b>No se pudo completar la operación.</b><br/>{error}<br/><small>Verifica la conexión y los permisos de lectura de Supabase.</small></div></div>}
 
      <section className="metrics">
        <article className="metric"><div className="metric-head"><span>Ingresos registrados</span><div className="metric-icon green"><DollarSign size={19}/></div></div><strong>{money(resumen.total)}</strong><small>Ventas de todo el negocio</small></article>
        <article className="metric"><div className="metric-head"><span>Bolsas vendidas</span><div className="metric-icon beige"><ShoppingBag size={19}/></div></div><strong>{resumen.bolsas}</strong><small>Unidades registradas</small></article>
        <article className="metric"><div className="metric-head"><span>Café en grano</span><div className="metric-icon green"><Coffee size={19}/></div></div><strong>{resumen.grano}</strong><small>Bolsas vendidas</small></article>
        <article className="metric"><div className="metric-head"><span>Café molido</span><div className="metric-icon beige"><Package size={19}/></div></div><strong>{resumen.molido}</strong><small>Bolsas vendidas</small></article>
      </section>
      <section className="content-grid">
        <article className="panel chart-panel"><div className="panel-title"><div><h2>Ventas registradas</h2><p>Ingresos por fecha · últimos 100 registros visibles</p></div></div>{chartData.length > 0 ? <div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#71866a" stopOpacity={0.28}/><stop offset="95%" stopColor="#71866a" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ecebe5"/><XAxis dataKey="fecha" tickLine={false} axisLine={false}/><YAxis tickLine={false} axisLine={false} tickFormatter={v=>`$${v}`}/><Tooltip formatter={v=>money(Number(v))}/><Area type="monotone" dataKey="ingresos" stroke="#647b5d" strokeWidth={2.5} fill="url(#fillSales)"/></AreaChart></ResponsiveContainer></div> : <div className="empty-chart">{loading ? "Cargando ventas…" : "Cuando registres ventas, aquí aparecerá tu gráfica."}</div>}</article>
        
      </section>
      <section className="panel history"><div className="panel-title"><div><h2>Últimas ventas</h2><p>Movimientos de todo el negocio</p></div><div className="history-actions"><span className="count">{ventas.length} registros</span><button className="refresh" onClick={()=>void cargarVentas()}><RefreshCw size={15}/> Actualizar</button></div></div>
        <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Presentación</th><th>Tueste</th><th>Gramaje</th><th>Cantidad</th><th className="right">Total</th></tr></thead><tbody>{ventas.map(v=><tr key={v.id}><td>{new Date(v.created_at).toLocaleString("es-MX",{dateStyle:"medium",timeStyle:"short"})}</td><td><span className="tag">{v.presentacion === "grano" ? "En grano" : "Molido"}</span></td><td className="capitalize">{v.tueste}</td><td>{v.gramos>=1000?`${v.gramos/1000} kg`:`${v.gramos} g`}</td><td>{v.cantidad}</td><td className="right amount">{money(Number(v.total_mxn))}</td></tr>)}{!loading&&ventas.length===0&&<tr><td colSpan={6} className="no-data">Todavía no hay ventas visibles.</td></tr>}{loading&&<tr><td colSpan={6} className="no-data">Cargando historial…</td></tr>}</tbody></table></div>
      </section>
      
      <footer>Dashboard Café · Hecho para ayudarte a entender y hacer crecer tu negocio.</footer>
    </main>
  );
}
