
"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Coffee,
  DollarSign,
  Package,
  ShoppingBag,
  RefreshCw,
  AlertCircle,
  LogOut,
  Pencil,
  Trash2,
  Plus,
  LockKeyhole,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase, supabaseConfigured } from "@/lib/supabase";
import type { Venta } from "@/types/venta";

const money = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);

const calcularTotal = (
  presentacion: "grano" | "molido",
  gramos: number,
  cantidad: number
) => {
  const precioPorGramo = presentacion === "molido" ? 125 / 500 : 55 / 500;
  return precioPorGramo * gramos * cantidad;
};

export default function Home() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [admin, setAdmin] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [presentacion, setPresentacion] = useState<"grano" | "molido">("molido");
  const [tueste, setTueste] = useState<"claro" | "medio" | "oscuro">("medio");
  const [gramos, setGramos] = useState(500);
  const [cantidad, setCantidad] = useState(1);
  const [ventaEditando, setVentaEditando] = useState<number | null>(null);

  const totalCalculado = calcularTotal(presentacion, gramos, cantidad);

  const comprobarAdmin = useCallback(async (userId: string) => {
    if (!supabase) return false;

    const { data, error: perfilError } = await supabase
      .from("perfiles")
      .select("rol")
      .eq("id", userId)
      .single();

    if (perfilError || data?.rol !== "admin") {
      return false;
    }

    return true;
  }, []);



const cargarVentas = useCallback(async () => {
  if (!supabase) {
    setVentas([]);
    setLoading(false);
    return;
  }

  setLoading(true);
  setError("");

  let todasLasVentas: Venta[] = [];
  let desde = 0;
  const tamanoBloque = 1000;
  let continuar = true;

  while (continuar) {
    const { data, error: queryError } = await supabase
      .from("ventas_publicas")
      .select("*")
      .order("created_at", { ascending: false })
      .range(desde, desde + tamanoBloque - 1);

    if (queryError) {
      setError(queryError.message);
      continuar = false;
      break;
    }

    const bloque = (data ?? []) as Venta[];
    todasLasVentas = [...todasLasVentas, ...bloque];

    if (bloque.length < tamanoBloque) {
      continuar = false;
    } else {
      desde += tamanoBloque;
    }
  }

  setVentas(todasLasVentas);
  setLoading(false);
}, []);



  useEffect(() => {
    void cargarVentas();

    if (!supabase) return;

    let activo = true;

    const revisarSesion = async () => {
      const { data } = await supabase!.auth.getSession();

      if (data.session) {
        const esAdmin = await comprobarAdmin(data.session.user.id);

        if (activo) {
          setAdmin(esAdmin);

          if (!esAdmin) {
            await supabase!.auth.signOut();
          }
        }
      }
    };

    void revisarSesion();

    return () => {
      activo = false;
    };
  }, [cargarVentas, comprobarAdmin]);

  const iniciarSesion = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!supabase) return;

    setError("");
    setMensaje("");
    setGuardando(true);

    const { data, error: loginError } = await supabase.functions.invoke(
      "login-username",
      {
        body: {
          username: usuario.trim(),
          password,
        },
      }
    );

    if (loginError || !data?.session) {
      setError(data?.error || loginError?.message || "No se pudo iniciar sesión.");
      setGuardando(false);
      return;
    }

    const { error: sessionError } = await supabase.auth.setSession(data.session);

    if (sessionError) {
      setError(sessionError.message);
      setGuardando(false);
      return;
    }

    const esAdmin = await comprobarAdmin(data.session.user.id);

    if (!esAdmin) {
      await supabase.auth.signOut();
      setError("Esta cuenta no tiene permisos de administrador.");
      setGuardando(false);
      return;
    }

    setAdmin(true);
    setPassword("");
    setUsuario("");
    setMensaje("Sesión de administrador iniciada.");
    setGuardando(false);
  };

  const cerrarSesion = async () => {
    if (!supabase) return;

    await supabase.auth.signOut();
    setAdmin(false);
    setVentaEditando(null);
    setMensaje("Sesión cerrada.");
    setError("");
  };

  const guardarVenta = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!supabase || !admin) return;

    if (gramos <= 0 || cantidad <= 0) {
      setError("El gramaje y la cantidad deben ser mayores que cero.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      setError("Tu sesión terminó. Inicia sesión nuevamente.");
      setAdmin(false);
      setGuardando(false);
      return;
    }

    const total = calcularTotal(presentacion, gramos, cantidad);

    const datosVenta = {
      presentacion,
      tueste,
      gramos,
      cantidad,
      total_mxn: total,
    };

    let resultado;

    if (ventaEditando !== null) {
      resultado = await supabase
        .from("ventas_cafe")
        .update(datosVenta)
        .eq("id", ventaEditando);
    } else {
      resultado = await supabase
        .from("ventas_cafe")
        .insert({
          ...datosVenta,
          user_id: userId,
        });
    }

    if (resultado.error) {
      setError(resultado.error.message);
      setGuardando(false);
      return;
    }

    setMensaje(
      ventaEditando !== null
        ? "Venta actualizada correctamente."
        : "Venta registrada correctamente."
    );

    setVentaEditando(null);
    setPresentacion("molido");
    setTueste("medio");
    setGramos(500);
    setCantidad(1);

    await cargarVentas();
    setGuardando(false);
  };

  const editarVenta = (venta: Venta) => {
    setVentaEditando(venta.id);
    setPresentacion(venta.presentacion);
    setTueste(venta.tueste);
    setGramos(venta.gramos);
    setCantidad(venta.cantidad);
    setError("");
    setMensaje("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const eliminarVenta = async (id: number) => {
    if (!supabase || !admin) return;

    const confirmar = window.confirm(
      "¿Seguro que deseas eliminar esta venta? Esta acción no se puede deshacer."
    );

    if (!confirmar) return;

    setError("");
    setMensaje("");

    const { error: deleteError } = await supabase
      .from("ventas_cafe")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMensaje("Venta eliminada correctamente.");
    await cargarVentas();
  };

  const cancelarEdicion = () => {
    setVentaEditando(null);
    setPresentacion("molido");
    setTueste("medio");
    setGramos(500);
    setCantidad(1);
    setError("");
    setMensaje("");
  };

  const resumen = useMemo(() => {
    const total = ventas.reduce((sum, v) => sum + Number(v.total_mxn), 0);
    const bolsas = ventas.reduce((sum, v) => sum + v.cantidad, 0);
    const grano = ventas
      .filter((v) => v.presentacion === "grano")
      .reduce((sum, v) => sum + v.cantidad, 0);
    const molido = ventas
      .filter((v) => v.presentacion === "molido")
      .reduce((sum, v) => sum + v.cantidad, 0);

    return { total, bolsas, grano, molido };
  }, [ventas]);

  const chartData = useMemo(() => {
    const days = new Map<string, number>();

    [...ventas].reverse().forEach((v) => {
      const day = new Date(v.created_at).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
      });

      days.set(day, (days.get(day) ?? 0) + Number(v.total_mxn));
    });

    return Array.from(days, ([fecha, ingresos]) => ({ fecha, ingresos }));
  }, [ventas]);

  if (!supabaseConfigured) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="brand-icon"><Coffee size={24} /></div>
          <h1>Dashboard Café</h1>
          <p>Falta conectar Supabase. Revisa las variables de entorno de Vercel.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon"><Coffee size={23} /></div>
          <div>
            <strong>Dashboard Café</strong>
            <span>Panel de ventas</span>
          </div>
        </div>

        <div className="user-actions">
          <span className="role-pill">
            {admin ? "Administrador" : "Consulta pública"}
          </span>

          {admin && (
            <button className="refresh" onClick={cerrarSesion}>
              <LogOut size={15} /> Cerrar sesión
            </button>
          )}
        </div>
      </header>

      <section className="welcome">
        <div>
          <p className="eyebrow">VISTA GENERAL DEL NEGOCIO</p>
          <h1>Tu café, tus números.</h1>
          <p className="sub">Consulta las ventas registradas del negocio.</p>
        </div>

        <div className="date-pill">
          {new Date().toLocaleDateString("es-MX", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
      </section>

      {error && (
        <div className="alert error">
          <AlertCircle size={18} />
          <div>
            <b>No se pudo completar la operación.</b>
            <br />
            {error}
          </div>
        </div>
      )}

      {mensaje && (
        <div className="alert">
          {mensaje}
        </div>
      )}

      {!admin && (
        <section className="panel" style={{ marginBottom: 24 }}>
          <div className="panel-title">
            <div>
              <h2><LockKeyhole size={19} /> Acceso de administrador</h2>
              <p>Inicia sesión para registrar y administrar ventas.</p>
            </div>
          </div>

          <form onSubmit={iniciarSesion} className="login-form">
            <label>
              Nombre de usuario
              <input
                type="text"
                required
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Tu nombre de usuario"
                autoComplete="username"
              />
            </label>

            <label>
              Contraseña
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                autoComplete="current-password"
              />
            </label>

            <button className="primary" type="submit" disabled={guardando}>
              <LockKeyhole size={16} />
              {guardando ? "Verificando..." : "Iniciar sesión"}
            </button>
          </form>
        </section>
      )}

      {admin && (
        <section className="panel" style={{ marginBottom: 24 }}>
          <div className="panel-title">
            <div>
              <h2>
                <Plus size={19} />
                {ventaEditando !== null ? "Editar venta" : "Registrar nueva venta"}
              </h2>
              <p>El importe se calcula automáticamente según el producto y el gramaje.</p>
            </div>
          </div>

          <form onSubmit={guardarVenta} className="login-form">
            <label>
              Presentación
              <select
                value={presentacion}
                onChange={(e) =>
                  setPresentacion(e.target.value as "grano" | "molido")
                }
              >
                <option value="molido">Café molido</option>
                <option value="grano">Café en grano</option>
              </select>
            </label>

            <label>
              Tipo de tueste
              <select
                value={tueste}
                onChange={(e) =>
                  setTueste(e.target.value as "claro" | "medio" | "oscuro")
                }
              >
                <option value="claro">Claro</option>
                <option value="medio">Medio</option>
                <option value="oscuro">Oscuro</option>
              </select>
            </label>

            <label>
              Gramaje
              <select
                value={gramos}
                onChange={(e) => setGramos(Number(e.target.value))}
              >
                <option value={250}>250 gramos</option>
                <option value={500}>500 gramos</option>
                <option value={1000}>1 kilogramo</option>
                <option value={2000}>2 kilogramos</option>
              </select>
            </label>

            <label>
              Cantidad de bolsas
              <input
                type="number"
                min="1"
                step="1"
                required
                value={cantidad}
                onChange={(e) => setCantidad(Number(e.target.value))}
              />
            </label>

            <div className="metric" style={{ margin: "8px 0" }}>
              <span>Importe calculado</span>
              <strong>{money(totalCalculado)}</strong>
              <small>
                {presentacion === "molido" ? "$125" : "$55"} por cada 500 g
              </small>
            </div>

            <div className="history-actions">
              <button className="primary" type="submit" disabled={guardando}>
                <Plus size={16} />
                {guardando
                  ? "Guardando..."
                  : ventaEditando !== null
                    ? "Guardar cambios"
                    : "Registrar venta"}
              </button>

              {ventaEditando !== null && (
                <button
                  className="refresh"
                  type="button"
                  onClick={cancelarEdicion}
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      <section className="metrics">
        <article className="metric">
          <div className="metric-head">
            <span>Ingresos registrados</span>
            <div className="metric-icon green"><DollarSign size={19} /></div>
          </div>
          <strong>{money(resumen.total)}</strong>
          <small>Ventas de todo el negocio</small>
        </article>

        <article className="metric">
          <div className="metric-head">
            <span>Bolsas vendidas</span>
            <div className="metric-icon beige"><ShoppingBag size={19} /></div>
          </div>
          <strong>{resumen.bolsas}</strong>
          <small>Unidades registradas</small>
        </article>

        <article className="metric">
          <div className="metric-head">
            <span>Café en grano</span>
            <div className="metric-icon green"><Coffee size={19} /></div>
          </div>
          <strong>{resumen.grano}</strong>
          <small>Bolsas vendidas</small>
        </article>

        <article className="metric">
          <div className="metric-head">
            <span>Café molido</span>
            <div className="metric-icon beige"><Package size={19} /></div>
          </div>
          <strong>{resumen.molido}</strong>
          <small>Bolsas vendidas</small>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel chart-panel">
          <div className="panel-title">
            <div>
              <h2>Ventas registradas</h2>
              <p>Ingresos por fecha · últimos 100 registros visibles</p>
            </div>
          </div>

          {chartData.length > 0 ? (
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#71866a" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#71866a" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#ecebe5"
                  />
                  <XAxis dataKey="fecha" tickLine={false} axisLine={false} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip formatter={(v) => money(Number(v))} />
                  <Area
                    type="monotone"
                    dataKey="ingresos"
                    stroke="#647b5d"
                    strokeWidth={2.5}
                    fill="url(#fillSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-chart">
              {loading
                ? "Cargando ventas…"
                : "Cuando registres ventas, aquí aparecerá tu gráfica."}
            </div>
          )}
        </article>
      </section>

      <section className="panel history">
        <div className="panel-title">
          <div>
            <h2>Últimas ventas</h2>
            <p>Movimientos de todo el negocio</p>
          </div>

          <div className="history-actions">
            <span className="count">{ventas.length} registros</span>
            <button className="refresh" onClick={() => void cargarVentas()}>
              <RefreshCw size={15} /> Actualizar
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Presentación</th>
                <th>Tueste</th>
                <th>Gramaje</th>
                <th>Cantidad</th>
                <th className="right">Total</th>
                {admin && <th>Acciones</th>}
              </tr>
            </thead>

            <tbody>
              {ventas.map((v) => (
                <tr key={v.id}>
                  <td>
                    {new Date(v.created_at).toLocaleString("es-MX", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td>
                    <span className="tag">
                      {v.presentacion === "grano" ? "En grano" : "Molido"}
                    </span>
                  </td>
                  <td className="capitalize">{v.tueste}</td>
                  <td>{v.gramos >= 1000 ? `${v.gramos / 1000} kg` : `${v.gramos} g`}</td>
                  <td>{v.cantidad}</td>
                  <td className="right amount">{money(Number(v.total_mxn))}</td>

                  {admin && (
                    <td>
                      <div className="history-actions">
                        <button
                          className="refresh"
                          onClick={() => editarVenta(v)}
                          title="Editar venta"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="refresh"
                          onClick={() => void eliminarVenta(v.id)}
                          title="Eliminar venta"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {!loading && ventas.length === 0 && (
                <tr>
                  <td colSpan={admin ? 7 : 6} className="no-data">
                    Todavía no hay ventas visibles.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={admin ? 7 : 6} className="no-data">
                    Cargando historial…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer>
        Dashboard Café · Hecho para ayudarte a entender y hacer crecer tu negocio.
      </footer>
    </main>
  );
}
