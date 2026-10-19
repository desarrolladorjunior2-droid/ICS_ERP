import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Warehouse, Package, ArrowLeftRight, Plus, Pencil, Trash2, Search, History, Boxes, ShoppingCart } from 'lucide-react';
import MasterDetailPage from '../../components/MasterDetailPage';
import DataTable from '../../components/DataTable';
import { Button, Card, FormModal, IconButton, Modal, Tabs, Tag, fmtCompact, fmtDate, fmtMoney, useUi } from '../../components/ui';
import { db, useDb } from '../../data/db';
import { useAuth } from '../../auth/AuthContext';
import { articuloName, articuloOptions, compraLabel, movimientoValor, signedQty, stockMap } from '../../data/lookups';

const today = () => new Date().toISOString().slice(0, 10);
const tipoTone = { 'Entrada por compra': 'accent', Entrada: 'good', Salida: 'info', Ajuste: 'muted' };

// ======================= MOVIMIENTOS (maestro) → LÍNEAS (detalle) =======================
const compraOptions = () =>
  db.list('compras', (c) => !['ANULADA', 'BORRADOR', 'RECHAZADA'].includes(c.estado)).map((c) => ({ value: c.id, label: compraLabel(c.id) }));

export const movimientosConfig = {
  module: 'inventario',
  table: 'inventario',
  title: 'Movimientos de inventario',
  subtitle: 'Entradas, salidas y ajustes · Maestro (movimiento) → Detalle (líneas por artículo)',
  entity: 'Movimiento',
  newLabel: 'Nuevo movimiento',
  icon: Warehouse,
  searchText: (r) => `${r.codigo} ${r.tipo} ${r.referencia} ${r.observaciones} ${compraLabel(r.compra_id)}`,
  recordTitle: (r) => `${r.tipo}${r.referencia ? ` · ${r.referencia}` : ''}`,
  defaults: () => ({ tipo: 'Entrada', fecha: today(), bodega: 'Bodega principal' }),

  fields: [
    { key: 'tipo', label: 'Tipo de movimiento', type: 'select', options: ['Entrada por compra', 'Entrada', 'Salida', 'Ajuste'], required: true },
    { key: 'fecha', label: 'Fecha', type: 'date', required: true },
    { key: 'bodega', label: 'Bodega', type: 'select', options: ['Bodega principal', 'Bodega TI', 'Oficina'], required: true },
    { key: 'compra_id', label: 'Orden de compra de origen', type: 'select', options: compraOptions, span: 2, display: (r) => (r.compra_id ? compraLabel(r.compra_id) : '—') },
    { key: 'referencia', label: 'Referencia / documento' },
    { key: 'observaciones', label: 'Observaciones', type: 'textarea', span: 3 },
  ],
  columns: [
    { key: 'fecha', label: 'Fecha', render: (r) => fmtDate(r.fecha) },
    { key: 'tipo', label: 'Tipo', render: (r) => <Tag tone={tipoTone[r.tipo]}>{r.tipo}</Tag> },
    { key: 'referencia', label: 'Origen', render: (r) => (r.compra_id ? <span className="code">{db.get('compras', r.compra_id)?.codigo}</span> : r.referencia || '—') },
    { key: 'bodega', label: 'Bodega' },
    { key: 'lineas', label: 'Líneas', align: 'right', render: (r) => db.details('inventario', r.id, 'inventario_lineas').length, sortValue: (r) => db.details('inventario', r.id, 'inventario_lineas').length },
    { key: 'valor', label: 'Valor', align: 'right', render: (r) => fmtMoney(movimientoValor(r.id)), sortValue: (r) => movimientoValor(r.id) },
  ],
  kpis: (rows) => [
    { label: 'Movimientos', value: rows.filter((r) => r.estado !== 'ANULADO').length, hint: 'sin anulados' },
    { label: 'Por confirmar', value: rows.filter((r) => r.estado === 'BORRADOR').length, hint: 'en borrador' },
    { label: 'Ingresos desde compras', value: rows.filter((r) => r.compra_id && r.estado === 'CONFIRMADO').length, hint: 'confirmados' },
    { label: 'Pendientes de compras', value: rows.filter((r) => r.compra_id && r.estado === 'BORRADOR').length, hint: 'recibidos sin ingresar al stock' },
  ],
  kanbanCard: (r) => (
    <>
      <strong>{r.tipo}</strong>
      <span className="muted small">{fmtDate(r.fecha)} · {r.compra_id ? db.get('compras', r.compra_id)?.codigo : r.referencia || r.bodega}</span>
      <span className="kc-amount">{fmtMoney(movimientoValor(r.id))}</span>
    </>
  ),
  summary: (r, d) => [
    { label: 'Líneas', value: d.inventario_lineas.length },
    { label: 'Unidades', value: d.inventario_lineas.reduce((s, l) => s + Math.abs(Number(l.cantidad) || 0), 0) },
    { label: 'Origen', value: r.compra_id ? db.get('compras', r.compra_id)?.codigo : '—' },
    { label: 'Valor', value: fmtMoney(movimientoValor(r.id)), highlight: true },
  ],
  details: [
    {
      table: 'inventario_lineas',
      fk: 'movimiento_id',
      label: 'Líneas',
      icon: Package,
      fields: [
        {
          key: 'articulo_id', label: 'Artículo', type: 'select', options: articuloOptions, required: true, span: 3,
          onChange: (v) => {
            const a = db.get('articulos', v);
            return a ? { costo_unitario: a.ultimo_costo } : {};
          },
        },
        { key: 'cantidad', label: 'Cantidad', type: 'number', required: true, step: 0.01 },
        { key: 'costo_unitario', label: 'Costo unitario', type: 'number', min: 0, required: true },
      ],
      columns: [
        { key: 'articulo_id', label: 'Artículo', render: (l) => articuloName(l.articulo_id), sortValue: (l) => articuloName(l.articulo_id) },
        { key: 'cantidad', label: 'Cantidad', align: 'right' },
        { key: 'costo_unitario', label: 'Costo unit.', align: 'right', render: (l) => fmtMoney(l.costo_unitario) },
        { key: 'valor', label: 'Valor', align: 'right', render: (l) => fmtMoney(Math.abs(l.cantidad) * l.costo_unitario), sortValue: (l) => Math.abs(l.cantidad) * l.costo_unitario },
      ],
      footer: (rows) => (
        <>
          <span>{rows.length} líneas</span>
          <strong>Valor del movimiento: {fmtMoney(rows.reduce((s, l) => s + Math.abs(Number(l.cantidad) || 0) * (Number(l.costo_unitario) || 0), 0))}</strong>
        </>
      ),
    },
  ],
};

// ======================= EXISTENCIAS (catálogo + stock) =======================
const articuloFields = [
  { key: 'nombre', label: 'Nombre del artículo', required: true, span: 2 },
  { key: 'categoria', label: 'Categoría', type: 'select', options: ['Equipos de cómputo', 'Periféricos', 'Componentes', 'Redes', 'Mobiliario', 'Papelería', 'Otros'], required: true },
  { key: 'unidad', label: 'Unidad', type: 'select', options: ['UND', 'PAQ', 'MTS', 'KG', 'CAJA'], required: true },
  { key: 'stock_minimo', label: 'Stock mínimo', type: 'number', min: 0, required: true },
  { key: 'ultimo_costo', label: 'Último costo', type: 'number', min: 0, required: true },
  { key: 'activo', label: 'Estado', type: 'checkbox', checkLabel: 'Artículo activo', default: true },
];

function estadoStock(a, stock) {
  if (stock <= 0) return { label: 'Sin stock', tone: 'critical' };
  if (stock < a.stock_minimo) return { label: 'Bajo mínimo', tone: 'warning' };
  return { label: 'Disponible', tone: 'good' };
}

function kardexDe(articuloId) {
  const movs = db
    .list('inventario', (m) => m.estado === 'CONFIRMADO')
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '') || (a.creado || '').localeCompare(b.creado || ''));
  let saldo = 0;
  const out = [];
  movs.forEach((m) =>
    db
      .details('inventario', m.id, 'inventario_lineas')
      .filter((l) => l.articulo_id === articuloId)
      .forEach((l) => {
        const d = signedQty(m.tipo, l.cantidad);
        saldo += d;
        out.push({ id: l.id, fecha: m.fecha, codigo: m.codigo, tipo: m.tipo, entrada: d > 0 ? d : 0, salida: d < 0 ? -d : 0, costo: l.costo_unitario, saldo });
      }),
  );
  return out;
}

function Existencias() {
  const { can } = useAuth();
  const { toast, confirm } = useUi();
  const articulos = useDb((d) => d.list('articulos'));
  const stock = useDb(() => stockMap());
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState('');
  const [form, setForm] = useState(null); // { row }
  const [kardex, setKardex] = useState(null);

  const filas = useMemo(
    () =>
      articulos
        .map((a) => ({ ...a, stock: stock[a.id] || 0, estadoStock: estadoStock(a, stock[a.id] || 0) }))
        .filter((a) => `${a.codigo} ${a.nombre} ${a.categoria}`.toLowerCase().includes(q.toLowerCase()))
        .filter((a) => !filtro || a.estadoStock.label === filtro),
    [articulos, stock, q, filtro],
  );

  const valorTotal = articulos.reduce((s, a) => s + (stock[a.id] || 0) * (Number(a.ultimo_costo) || 0), 0);
  const bajos = articulos.filter((a) => (stock[a.id] || 0) > 0 && (stock[a.id] || 0) < a.stock_minimo).length;
  const sinStock = articulos.filter((a) => (stock[a.id] || 0) <= 0).length;

  const save = (data) => {
    if (form.row) db.update('articulos', form.row.id, data);
    else db.insert('articulos', data);
    toast(form.row ? 'Artículo actualizado' : 'Artículo creado');
    setForm(null);
  };

  const remove = async (a) => {
    const enUso =
      db.list('inventario_lineas', (l) => l.articulo_id === a.id).length + db.list('compras_items', (i) => i.articulo_id === a.id).length;
    if (enUso) return toast(`"${a.nombre}" tiene movimientos u órdenes de compra asociados; inactívelo en lugar de eliminarlo.`, 'critical');
    if (await confirm(`¿Eliminar el artículo ${a.codigo}?`, { title: 'Eliminar artículo', danger: true })) {
      db.remove('articulos', a.id);
      toast('Artículo eliminado');
    }
  };

  return (
    <div className="embedded">
      <div className="kpi-row">
        <div className="kpi">
          <span className="kpi-label">Artículos</span>
          <strong className="kpi-value">{articulos.length}</strong>
          <span className="kpi-hint">{articulos.filter((a) => a.activo !== false).length} activos</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Valor del inventario</span>
          <strong className="kpi-value">${fmtCompact(valorTotal)}</strong>
          <span className="kpi-hint">existencias × último costo</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Bajo el mínimo</span>
          <strong className="kpi-value">{bajos}</strong>
          <span className="kpi-hint">requieren reposición</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Sin stock</span>
          <strong className="kpi-value">{sinStock}</strong>
        </div>
      </div>

      <div className="toolbar">
        <div className="search">
          <Search size={16} aria-hidden />
          <input placeholder="Buscar artículos…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        </div>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar por estado de stock">
          <option value="">Todo el stock</option>
          <option>Disponible</option>
          <option>Bajo mínimo</option>
          <option>Sin stock</option>
        </select>
        <span className="muted small">{filas.length} artículos</span>
        {can('inventario', 'crear') && (
          <Button icon={Plus} className="push-right" onClick={() => setForm({ row: null })}>
            Nuevo artículo
          </Button>
        )}
      </div>

      <Card className="flush">
        <DataTable
          columns={[
            { key: 'codigo', label: 'Código', render: (a) => <span className="code">{a.codigo}</span> },
            { key: 'nombre', label: 'Artículo' },
            { key: 'categoria', label: 'Categoría' },
            { key: 'stock', label: 'Existencias', align: 'right', render: (a) => `${a.stock} ${a.unidad}` },
            { key: 'stock_minimo', label: 'Mínimo', align: 'right' },
            { key: 'ultimo_costo', label: 'Último costo', align: 'right', render: (a) => fmtMoney(a.ultimo_costo) },
            { key: 'valor', label: 'Valor', align: 'right', render: (a) => fmtMoney(a.stock * a.ultimo_costo), sortValue: (a) => a.stock * a.ultimo_costo },
            {
              key: 'estadoStock', label: 'Stock', sortValue: (a) => a.estadoStock.label,
              render: (a) => (a.activo === false ? <Tag tone="muted">Inactivo</Tag> : <Tag tone={a.estadoStock.tone}>{a.estadoStock.label}</Tag>),
            },
          ]}
          rows={filas}
          onRowClick={(a) => setKardex(a)}
          actions={(a) => (
            <>
              <IconButton icon={History} label="Ver kardex" onClick={() => setKardex(a)} />
              {can('inventario', 'editar') && <IconButton icon={Pencil} label="Editar" onClick={() => setForm({ row: a })} />}
              {can('inventario', 'eliminar') && <IconButton icon={Trash2} label="Eliminar" className="danger" onClick={() => remove(a)} />}
            </>
          )}
        />
      </Card>

      {form && (
        <FormModal
          title={form.row ? `Editar ${form.row.codigo}` : 'Nuevo artículo'}
          fields={articuloFields}
          initial={form.row || {}}
          onSubmit={save}
          onClose={() => setForm(null)}
        />
      )}
      {kardex && (
        <Modal title={`Kardex · ${kardex.codigo} ${kardex.nombre}`} onClose={() => setKardex(null)}>
          <DataTable
            dense
            columns={[
              { key: 'fecha', label: 'Fecha', render: (k) => fmtDate(k.fecha) },
              { key: 'codigo', label: 'Movimiento', render: (k) => <span className="code">{k.codigo}</span> },
              { key: 'tipo', label: 'Tipo', render: (k) => <Tag tone={tipoTone[k.tipo]}>{k.tipo}</Tag> },
              { key: 'entrada', label: 'Entra', align: 'right', render: (k) => k.entrada || '' },
              { key: 'salida', label: 'Sale', align: 'right', render: (k) => k.salida || '' },
              { key: 'saldo', label: 'Saldo', align: 'right' },
            ]}
            rows={kardexDe(kardex.id)}
            empty="Sin movimientos confirmados"
          />
        </Modal>
      )}
    </div>
  );
}

// ======================= PÁGINA =======================
export default function Inventario() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'existencias';
  const pendientes = useDb((d) => d.list('inventario', (m) => m.estado === 'BORRADOR').length);

  // Ficha de un movimiento (maestro-detalle a pantalla completa)
  if (params.get('id')) return <MasterDetailPage config={movimientosConfig} />;

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-title">
          <span className="page-icon">
            <Warehouse size={22} aria-hidden />
          </span>
          <div>
            <h1>Inventario</h1>
            <p className="muted">
              Existencias y movimientos · se alimenta de <ShoppingCart size={13} className="inline-icon" aria-hidden /> Compras al recibir una orden
            </p>
          </div>
        </div>
      </header>
      <Tabs
        tabs={[
          { key: 'existencias', label: 'Existencias', icon: Boxes },
          { key: 'movimientos', label: 'Movimientos', icon: ArrowLeftRight, count: pendientes || undefined },
        ]}
        active={tab}
        onChange={(t) => setParams({ tab: t })}
      />
      {tab === 'movimientos' ? <MasterDetailPage config={movimientosConfig} embedded /> : <Existencias />}
    </div>
  );
}
