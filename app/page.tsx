"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Coffee, DollarSign, Package, ShoppingBag, Plus, RefreshCw, AlertCircle, LogOut, LockKeyhole } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import type { NuevaVenta, Perfil, Venta } from "@/types/venta";

const money = (value: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);
const initialForm: NuevaVenta = { presentacion: "grano", tueste: "medio", gramos: 250, cantidad: 1, total_mxn: 180 };

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState<NuevaVenta>(initialForm);

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); setLoading(false); return; }
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setPerfil(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    async function cargarPerfil() {
      if (!supabase || !session?.user) { setPerfil(null); return; }
      setProfileLoading(true);
      const { data, error: profileError } = await supabase.from("perfiles").select("id,email,rol").eq("id", session.user.id).single();
      if (!active) return;
      if (profileError) setError(`No se pudo consultar tu perfil: ${profileError.message}`);
      else setPerfil(data as Perfil);
      setProfileLoading(false);
    }
    void cargarPerfil();
    return () => { active = false; };
  }, [session?.user?.id]);

  const cargarVentas = useCallback(async () => {
    if (!supabase || !session?.user) { setVentas([]); setLoading(false); return; }
    setLoading(true); setError("");
    const { data, error: queryError } = await supabase.from("ventas_cafe").select("*").order("created_at", { ascending: false }).limit(100);
    if (queryError) setError(queryError.message);
    else setVentas((data ?? []) as Venta[]);
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => { if (perfil) void cargarVentas(); }, [perfil, cargarVentas]);

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

 async function iniciarSesion(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();
  if (!supabase) return;

  setLoginError("");

  const { data, error: signInError } = await supabase.functions.invoke(
    "login-username",
    {
      body: {
        username: email.trim(),
        password,
      },
    }
  );

  if (signInError || !data?.session) {
    setLoginError("No se pudo iniciar sesión. Revisa tu nombre de usuario y contraseña.");
    return;
  }

  const { error: sessionError } = await supabase.auth.setSession(data.session);

  if (sessionError) {
    setLoginError("No se pudo iniciar sesión. Inténtalo de nuevo.");
  }
}

  async function cerrarSesion() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setVentas([]); setPerfil(null); setPassword("");
  }

  async function registrarVenta(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || !session?.user) return;
    setSaving(true); setNotice(""); setError("");
    const { error: insertError } = await supabase.from("ventas_cafe").insert({ ...form, user_id: session.user.id });
    if (insertError) setError(insertError.message);
    else { setNotice("Venta registrada correctamente."); setForm(initialForm); await cargarVentas(); }
    setSaving(false);
  }

  if (!supabaseConfigured) return <main className="auth-shell"><section className="auth-card"><div className="brand-icon"><Coffee size={24}/></div><h1>Dashboard Café</h1><p>Falta conectar Supabase. Revisa las variables de entorno de Vercel.</p></section></main>;
  if (authLoading) return <main className="auth-shell"><section className="auth-card">Cargando sesión…</section></main>;
  if (!session) return (
    <main className="auth-shell"><section className="auth-card">
      <div className="auth-mark"><Coffee size={25}/></div><p className="eyebrow">ACCESO PRIVADO</p><h1>Dashboard Café</h1><p className="auth-sub">Inicia sesión para consultar y registrar ventas.</p>
      {loginError && <div className="alert error"><AlertCircle size={18}/>{loginError}</div>}
      <form className="login-form" onSubmit={iniciarSesion}><label>Correo electrónico<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@correo.com"/></label><label>Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Tu contraseña"/></label><button className="primary" type="submit"><LockKeyhole size={16}/> Entrar al dashboard</button></form>
      <p className="login-foot">Las cuentas son creadas por el administrador.</p>
    </section></main>
  );
  if (profileLoading || !perfil) return <main className="auth-shell"><section className="auth-card"><div className="auth-mark"><Coffee size={25}/></div><h1>Verificando tu cuenta</h1><p>{profileLoading ? "Cargando permisos…" : "No encontramos tu perfil. Pide al administrador que revise tu cuenta y los permisos de Supabase."}</p><button className="refresh" onClick={()=>void cerrarSesion()}><LogOut size={16}/> Cerrar sesión</button></section></main>;

  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><div className="brand-icon"><Coffee size={23}/></div><div><strong>Dashboard Café</strong><span>Panel de ventas</span></div></div><div className="user-actions"><span className="role-pill">{perfil.rol === "admin" ? "Administrador" : "Empleado"}</span><span className="user-email">{perfil.email}</span><button className="refresh" onClick={()=>void cerrarSesion()}><LogOut size={16}/> Salir</button></div></header>
      <section className="welcome"><div><p className="eyebrow">{perfil.rol === "admin" ? "VISTA GENERAL DEL NEGOCIO" : "TUS VENTAS"}</p><h1>Tu café, tus números.</h1><p className="sub">{perfil.rol === "admin" ? "Consulta las ventas de todo tu equipo." : "Consulta y registra tus propias ventas."}</p></div><div className="date-pill">{new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div></section>
      {error && <div className="alert error"><AlertCircle size={18}/><div><b>No se pudo completar la operación.</b><br/>{error}<br/><small>Verifica que ejecutaste el SQL de configuración y que tu cuenta tenga perfil.</small></div></div>}
      {notice && <div className="success">{notice}</div>}
      <section className="metrics">
        <article className="metric"><div className="metric-head"><span>Ingresos registrados</span><div className="metric-icon green"><DollarSign size={19}/></div></div><strong>{money(resumen.total)}</strong><small>{perfil.rol === "admin" ? "Ventas de todo el equipo" : "Tus ventas registradas"}</small></article>
        <article className="metric"><div className="metric-head"><span>Bolsas vendidas</span><div className="metric-icon beige"><ShoppingBag size={19}/></div></div><strong>{resumen.bolsas}</strong><small>Unidades registradas</small></article>
        <article className="metric"><div className="metric-head"><span>Café en grano</span><div className="metric-icon green"><Coffee size={19}/></div></div><strong>{resumen.grano}</strong><small>Bolsas vendidas</small></article>
        <article className="metric"><div className="metric-head"><span>Café molido</span><div className="metric-icon beige"><Package size={19}/></div></div><strong>{resumen.molido}</strong><small>Bolsas vendidas</small></article>
      </section>
      <section className="content-grid">
        <article className="panel chart-panel"><div className="panel-title"><div><h2>Ventas registradas</h2><p>Ingresos por fecha · últimos 100 registros visibles</p></div></div>{chartData.length > 0 ? <div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#71866a" stopOpacity={0.28}/><stop offset="95%" stopColor="#71866a" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ecebe5"/><XAxis dataKey="fecha" tickLine={false} axisLine={false}/><YAxis tickLine={false} axisLine={false} tickFormatter={v=>`$${v}`}/><Tooltip formatter={v=>money(Number(v))}/><Area type="monotone" dataKey="ingresos" stroke="#647b5d" strokeWidth={2.5} fill="url(#fillSales)"/></AreaChart></ResponsiveContainer></div> : <div className="empty-chart">{loading ? "Cargando ventas…" : "Cuando registres ventas, aquí aparecerá tu gráfica."}</div>}</article>
        <article className="panel form-panel"><div className="panel-title"><div><h2><Plus size={18}/> Registrar venta</h2><p>La venta quedará asociada a tu cuenta</p></div></div><form onSubmit={registrarVenta}>
          <label>Presentación<select value={form.presentacion} onChange={e=>setForm({...form,presentacion:e.target.value as NuevaVenta["presentacion"]})}><option value="grano">Café en grano</option><option value="molido">Café molido</option></select></label>
          <label>Tipo de tueste<select value={form.tueste} onChange={e=>setForm({...form,tueste:e.target.value as NuevaVenta["tueste"]})}><option value="claro">Claro</option><option value="medio">Medio</option><option value="oscuro">Oscuro</option></select></label>
          <div className="form-row"><label>Gramaje<select value={form.gramos} onChange={e=>setForm({...form,gramos:Number(e.target.value)})}><option value={250}>250 g</option><option value={500}>500 g</option><option value={1000}>1 kg</option></select></label><label>Cantidad<input type="number" min="1" step="1" required value={form.cantidad} onChange={e=>setForm({...form,cantidad:Number(e.target.value)})}/></label></div>
          <label>Total de venta (MXN)<input type="number" min="0.01" step="0.01" required value={form.total_mxn} onChange={e=>setForm({...form,total_mxn:Number(e.target.value)})}/></label><button className="primary" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar venta"}</button>
        </form></article>
      </section>
      <section className="panel history"><div className="panel-title"><div><h2>Últimas ventas</h2><p>{perfil.rol === "admin" ? "Movimientos de todos los integrantes" : "Movimientos registrados por tu cuenta"}</p></div><div className="history-actions"><span className="count">{ventas.length} registros</span><button className="refresh" onClick={()=>void cargarVentas()}><RefreshCw size={15}/> Actualizar</button></div></div>
        <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Presentación</th><th>Tueste</th><th>Gramaje</th><th>Cantidad</th><th className="right">Total</th></tr></thead><tbody>{ventas.map(v=><tr key={v.id}><td>{new Date(v.created_at).toLocaleString("es-MX",{dateStyle:"medium",timeStyle:"short"})}</td><td><span className="tag">{v.presentacion === "grano" ? "En grano" : "Molido"}</span></td><td className="capitalize">{v.tueste}</td><td>{v.gramos>=1000?`${v.gramos/1000} kg`:`${v.gramos} g`}</td><td>{v.cantidad}</td><td className="right amount">{money(Number(v.total_mxn))}</td></tr>)}{!loading&&ventas.length===0&&<tr><td colSpan={6} className="no-data">Todavía no hay ventas visibles.</td></tr>}{loading&&<tr><td colSpan={6} className="no-data">Cargando historial…</td></tr>}</tbody></table></div>
      </section>
      {perfil.rol === "admin" && <p className="admin-hint">Para dar de alta empleados: Supabase → Authentication → Users → Add user. Sus cuentas tendrán permisos de empleado automáticamente.</p>}
      <footer>Dashboard Café · Hecho para ayudarte a entender y hacer crecer tu negocio.</footer>
    </main>
  );
}
