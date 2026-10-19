import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, AreaChart, Area, LabelList,
} from 'recharts';
import { LayoutDashboard, ShoppingCart, PenTool, ListChecks, Users2, Workflow, TrendingUp, Filter, ChevronDown } from 'lucide-react';
import { useDb } from '../../data/db';
import { useAuth } from '../../auth/AuthContext';
import { DASHBOARDS } from '../../config/modules';
import { compraTotales, avanceActividad, terceroName } from '../../data/lookups';
import { WORKFLOWS } from '../../workflow/definitions';
import { Card, Empty, fmtCompact, fmtDate, fmtMoney, Progress, StatusBadge } from '../../components/ui';
import { PendingList } from '../../components/WorkflowPanels';
import { pendingFor } from '../../workflow/engine';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const AXIS = { fill: 'var(--muted)', fontSize: 11 };
const GRID = { stroke: 'var(--grid)', strokeDasharray: '0', vertical: false };

// ---------- piezas de gráfico ----------
function ChartTooltip({ active, payload, label, format = (v) => v }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      {label != null && <strong>{label}</strong>}
      {payload.map((p) => (
        <div key={p.dataKey ?? p.name} className="chart-tip-row">
          <i style={{ background: p.payload?.color || p.color || p.fill }} aria-hidden />
          <span>{p.name}</span>
          <b>{format(p.value)}</b>
        </div>
      ))}
    </div>
  );
}

function StatTile({ icon: Icon, label, value, hint, onClick }) {
  return (
    <button className="stat" onClick={onClick}>
      <span className="stat-icon">
        <Icon size={18} aria-hidden />
      </span>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {hint && <span className="stat-hint">{hint}</span>}
    </button>
  );
}

function Legend({ items }) {
  return (
    <ul className="legend">
      {items.map((it) => (
        <li key={it.name}>
          <i style={{ background: it.color }} aria-hidden />
          <span>{it.name}</span>
          <b>{it.value}</b>
        </li>
      ))}
    </ul>
  );
}

// ---------- widgets ----------
function ResumenWidget() {
  const navigate = useNavigate();
  const data = useDb((d) => {
    const year = d.list('compras', (c) => c.estado !== 'ANULADA');
    return {
      gasto: year.reduce((s, c) => s + compraTotales(c.id).total, 0),
      porAprobar: d.list('compras', (c) => c.estado === 'SOLICITADA').length,
      enFirma: d.list('firmas', (f) => f.estado === 'EN_FIRMA').length,
      actAbiertas: d.list('actividades', (a) => ['PLANEADA', 'EN_CURSO', 'EN_REVISION'].includes(a.estado)).length,
      tercerosActivos: d.list('terceros', (t) => t.estado === 'ACTIVO').length,
    };
  });
  return (
    <section className="dash-section">
      <SectionTitle icon={LayoutDashboard} title="Resumen ejecutivo" />
      <div className="stat-row">
        <StatTile icon={TrendingUp} label="Compras comprometidas 2026" value={`$${fmtCompact(data.gasto)}`} hint="COP con IVA, sin anuladas" onClick={() => navigate('/compras')} />
        <StatTile icon={ShoppingCart} label="Órdenes por aprobar" value={data.porAprobar} hint="estado Solicitada" onClick={() => navigate('/compras')} />
        <StatTile icon={PenTool} label="Documentos en firma" value={data.enFirma} hint="esperando firmantes" onClick={() => navigate('/firmas')} />
        <StatTile icon={ListChecks} label="Actividades abiertas" value={data.actAbiertas} hint="planeadas, en curso o revisión" onClick={() => navigate('/actividades')} />
        <StatTile icon={Users2} label="Terceros activos" value={data.tercerosActivos} onClick={() => navigate('/terceros')} />
      </div>
    </section>
  );
}

function ComprasWidget() {
  const { mensual, top, estados } = useDb((d) => {
    const vivas = d.list('compras', (c) => c.estado !== 'ANULADA');
    const mensual = MESES.slice(0, 10).map((m) => ({ mes: m, valor: 0 }));
    const porProv = {};
    vivas.forEach((c) => {
      const t = compraTotales(c.id).total;
      const mi = new Date(c.fecha).getMonth();
      if (mensual[mi]) mensual[mi].valor += t;
      porProv[c.proveedor_id] = (porProv[c.proveedor_id] || 0) + t;
    });
    const top = Object.entries(porProv)
      .map(([id, valor]) => ({ nombre: terceroName(id), valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
    const estados = Object.entries(WORKFLOWS.compras.states).map(([k, s]) => ({
      estado: s.label, cantidad: d.list('compras', (c) => c.estado === k).length,
    }));
    return { mensual, top, estados };
  });
  return (
    <section className="dash-section">
      <SectionTitle icon={ShoppingCart} title="Compras" />
      <div className="dash-grid">
        <Card title="Valor comprado por mes" subtitle="COP con IVA · 2026" className="span-2">
          <div className="chart">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={mensual} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="mes" tick={AXIS} axisLine={{ stroke: 'var(--axis)' }} tickLine={false} />
                <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => fmtCompact(v)} width={48} />
                <Tooltip cursor={{ fill: 'var(--hover)' }} content={<ChartTooltip format={(v) => fmtMoney(v)} />} />
                <Bar dataKey="valor" name="Valor" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Órdenes por estado" subtitle="Cantidad de órdenes">
          <div className="chart">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={estados} layout="vertical" margin={{ top: 0, right: 28, left: 0, bottom: 0 }}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="estado" tick={AXIS} axisLine={false} tickLine={false} width={80} />
                <Tooltip cursor={{ fill: 'var(--hover)' }} content={<ChartTooltip />} />
                <Bar dataKey="cantidad" name="Órdenes" fill="var(--series-1)" radius={[0, 4, 4, 0]} barSize={14}>
                  <LabelList dataKey="cantidad" position="right" fill="var(--text-2)" fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Top 5 proveedores" subtitle="Valor comprometido" className="span-3">
          <ul className="rank">
            {top.map((p, i) => (
              <li key={p.nombre}>
                <span className="rank-n">{i + 1}</span>
                <span className="rank-name">{p.nombre}</span>
                <span className="rank-bar">
                  <i style={{ width: `${(p.valor / top[0].valor) * 100}%` }} />
                </span>
                <b>${fmtCompact(p.valor)}</b>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}

function FirmasWidget() {
  const { estados, proximos } = useDb((d) => {
    const colors = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)'];
    const estados = Object.entries(WORKFLOWS.firmas.states)
      .map(([k, s], i) => ({ name: s.label, value: d.list('firmas', (f) => f.estado === k).length, color: colors[i] }))
      .filter((e) => e.value > 0);
    const proximos = d
      .list('firmas', (f) => f.estado === 'EN_FIRMA')
      .sort((a, b) => a.fecha_limite.localeCompare(b.fecha_limite))
      .slice(0, 5);
    return { estados, proximos };
  });
  const total = estados.reduce((s, e) => s + e.value, 0);
  return (
    <section className="dash-section">
      <SectionTitle icon={PenTool} title="Firmas" />
      <div className="dash-grid">
        <Card title="Documentos por estado" subtitle={`${total} documentos`}>
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={estados} dataKey="value" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={2} stroke="var(--surface)" strokeWidth={2}>
                  {estados.map((e) => (
                    <Cell key={e.name} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <strong>{total}</strong>
              <span>docs</span>
            </div>
          </div>
          <Legend items={estados} />
        </Card>
        <Card title="Próximos vencimientos" subtitle="Documentos en firma" className="span-2">
          {proximos.length ? (
            <ul className="list">
              {proximos.map((f) => (
                <li key={f.id}>
                  <span className="code">{f.codigo}</span>
                  <span className="grow">{f.titulo}</span>
                  <span className="muted small">vence {fmtDate(f.fecha_limite)}</span>
                  <StatusBadge module="firmas" estado={f.estado} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="Sin documentos en firma" />
          )}
        </Card>
      </div>
    </section>
  );
}

function ActividadesWidget() {
  const { avance, carga } = useDb((d) => {
    const abiertas = d.list('actividades', (a) => !['COMPLETADA', 'CANCELADA'].includes(a.estado));
    const avance = abiertas.map((a) => ({ ...a, pct: avanceActividad(a.id) })).sort((a, b) => b.pct - a.pct);
    const carga = {};
    d.list('actividades_tareas', (t) => !t.completada).forEach((t) => (carga[t.responsable] = (carga[t.responsable] || 0) + 1));
    return { avance, carga: Object.entries(carga).map(([nombre, tareas]) => ({ nombre: nombre.split(' ')[0], tareas })) };
  });
  return (
    <section className="dash-section">
      <SectionTitle icon={ListChecks} title="Actividades" />
      <div className="dash-grid">
        <Card title="Avance de actividades abiertas" subtitle="% de tareas completadas" className="span-2">
          <ul className="list">
            {avance.map((a) => (
              <li key={a.id}>
                <span className="grow">{a.titulo}</span>
                <StatusBadge module="actividades" estado={a.estado} />
                <span className="w-160">
                  <Progress value={a.pct} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Tareas pendientes por responsable">
          <div className="chart">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={carga} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="nombre" tick={AXIS} axisLine={{ stroke: 'var(--axis)' }} tickLine={false} />
                <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                <Tooltip cursor={{ fill: 'var(--hover)' }} content={<ChartTooltip />} />
                <Bar dataKey="tareas" name="Tareas" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={34}>
                  <LabelList dataKey="tareas" position="top" fill="var(--text-2)" fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </section>
  );
}

function TercerosWidget() {
  const { tipos, ciudades } = useDb((d) => {
    const colors = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)'];
    const ts = d.list('terceros');
    const tipos = ['Proveedor', 'Cliente', 'Aliado', 'Empleado']
      .map((t, i) => ({ name: t, value: ts.filter((x) => x.tipo === t).length, color: colors[i] }))
      .filter((t) => t.value);
    const c = {};
    ts.forEach((t) => (c[t.ciudad] = (c[t.ciudad] || 0) + 1));
    return { tipos, ciudades: Object.entries(c).map(([ciudad, n]) => ({ ciudad, n })).sort((a, b) => b.n - a.n) };
  });
  const total = tipos.reduce((s, t) => s + t.value, 0);
  return (
    <section className="dash-section">
      <SectionTitle icon={Users2} title="Terceros" />
      <div className="dash-grid">
        <Card title="Terceros por tipo" subtitle={`${total} registrados`}>
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={tipos} dataKey="value" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={2} stroke="var(--surface)" strokeWidth={2}>
                  {tipos.map((t) => (
                    <Cell key={t.name} fill={t.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <strong>{total}</strong>
              <span>terceros</span>
            </div>
          </div>
          <Legend items={tipos} />
        </Card>
        <Card title="Distribución por ciudad" className="span-2">
          <div className="chart">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ciudades} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="ciudad" tick={AXIS} axisLine={{ stroke: 'var(--axis)' }} tickLine={false} />
                <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                <Tooltip cursor={{ fill: 'var(--hover)' }} content={<ChartTooltip />} />
                <Bar dataKey="n" name="Terceros" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  <LabelList dataKey="n" position="top" fill="var(--text-2)" fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </section>
  );
}

/** Flujo de trabajo del dashboard: bandeja de aprobación (y actividad de flujo en el resumen). */
function FlujoSection({ module }) {
  const { can } = useAuth();
  const pendientes = useDb(() => pendingFor(can).filter((p) => !module || p.module === module).length, [can, module]);
  const serie = useDb((d) => {
    const m = MESES.slice(0, 10).map((mes) => ({ mes, movimientos: 0 }));
    d.list('workflow_historial', (h) => !module || h.modulo === module).forEach((h) => {
      const i = new Date(h.fecha).getMonth();
      if (m[i]) m[i].movimientos += 1;
    });
    return m;
  }, [module]);
  if (module && pendientes === 0) return null;
  return (
    <section className="dash-section">
      <SectionTitle icon={Workflow} title="Flujo de trabajo" />
      <div className="dash-grid">
        <Card title="Pendientes de mi aprobación" subtitle={`${pendientes} por atender`} className={module ? 'span-3' : 'span-2'}>
          <PendingList module={module} limit={6} />
        </Card>
        {!module && (
          <Card title="Movimientos de flujo por mes" subtitle="Transiciones registradas · 2026">
            <div className="chart">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={serie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wf-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="var(--series-1)" stopOpacity={0.35} />
                      <stop offset="1" stopColor="var(--series-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="mes" tick={AXIS} axisLine={{ stroke: 'var(--axis)' }} tickLine={false} />
                  <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                  <Tooltip cursor={{ stroke: 'var(--axis)' }} content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="movimientos" name="Movimientos" stroke="var(--series-1)" strokeWidth={2} fill="url(#wf-area)" activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>
    </section>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <h2 className="section-title">
      <Icon size={16} aria-hidden /> {title}
    </h2>
  );
}

const WIDGETS = {
  resumen: ResumenWidget,
  compras: ComprasWidget,
  firmas: FirmasWidget,
  actividades: ActividadesWidget,
  terceros: TercerosWidget,
};

const viewKey = (userId) => `ics-dashboard-${userId}`;

/** Vista seleccionada: ?vista= en la URL, luego la última elegida, luego la primera asignada. */
function useSelectedDashboard(userId, available) {
  const [params, setParams] = useSearchParams();
  let stored = null;
  try {
    stored = localStorage.getItem(viewKey(userId));
  } catch {
    /* sin almacenamiento */
  }
  const keys = available.map((d) => d.key);
  const fromUrl = params.get('vista');
  const selected = [fromUrl, stored].find((k) => keys.includes(k)) || keys[0];
  const select = (key) => {
    try {
      localStorage.setItem(viewKey(userId), key);
    } catch {
      /* noop */
    }
    setParams({ vista: key }, { replace: true });
  };
  return [selected, select];
}

export default function Dashboard() {
  const { user, dashboards, isAdmin } = useAuth();
  const hour = new Date().getHours();
  const saludo = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const ordered = DASHBOARDS.filter((d) => dashboards.includes(d.key));
  const [selected, select] = useSelectedDashboard(user.id, ordered);
  const Widget = WIDGETS[selected];

  return (
    <div className="page">
      <header className="page-head hero">
        <div>
          <p className="eyebrow">
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1>
            {saludo}, <span className="grad-text">{user.nombre.split(' ')[0]}</span>
          </h1>
          <p className="muted">
            {isAdmin ? 'Perfil administrador: tiene acceso a todos los dashboards.' : `Dashboards disponibles para su usuario: ${ordered.length}.`}
          </p>
        </div>
        {ordered.length > 0 && (
          <label className="dash-filter">
            <Filter size={16} aria-hidden />
            <span className="dash-filter-label">Dashboard</span>
            <select value={selected} onChange={(e) => select(e.target.value)} aria-label="Seleccionar dashboard">
              {ordered.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} aria-hidden className="dash-filter-caret" />
          </label>
        )}
      </header>
      {ordered.length === 0 ? (
        <Empty title="Sin dashboards asignados">Solicite al administrador la parametrización de sus dashboards.</Empty>
      ) : (
        <>
          <Widget key={selected} />
          <FlujoSection key={`flujo-${selected}`} module={selected === 'resumen' ? undefined : selected} />
        </>
      )}
    </div>
  );
}
