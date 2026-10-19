import { ShoppingCart, Package, Truck } from 'lucide-react';
import MasterDetailPage from '../../components/MasterDetailPage';
import { fmtDate, fmtMoney, fmtCompact } from '../../components/ui';
import { compraTotales, itemSubtotal, itemTotal, terceroName, terceroOptions } from '../../data/lookups';

const today = () => new Date().toISOString().slice(0, 10);

export const comprasConfig = {
  module: 'compras',
  table: 'compras',
  title: 'Compras',
  subtitle: 'Órdenes de compra · Maestro (orden) → Detalle (ítems, entregas)',
  entity: 'Orden de compra',
  newLabel: 'Nueva orden de compra',
  icon: ShoppingCart,
  searchText: (r) => `${r.codigo} ${terceroName(r.proveedor_id)} ${r.solicitante} ${r.centro_costo}`,
  recordTitle: (r) => `Orden de compra · ${terceroName(r.proveedor_id)}`,
  defaults: () => ({ fecha: today(), moneda: 'COP', forma_pago: 'Crédito 30 días' }),

  // ---- Maestro ----
  fields: [
    { key: 'proveedor_id', label: 'Proveedor', type: 'select', options: terceroOptions('Proveedor'), required: true, span: 2, display: (r) => terceroName(r.proveedor_id) },
    { key: 'fecha', label: 'Fecha', type: 'date', required: true },
    { key: 'solicitante', label: 'Solicitante', required: true },
    { key: 'centro_costo', label: 'Centro de costo', type: 'select', options: ['TI', 'Administración', 'Proyectos', 'Comercial'], required: true },
    { key: 'forma_pago', label: 'Forma de pago', type: 'select', options: ['Contado', 'Crédito 30 días', 'Crédito 60 días'], required: true },
    { key: 'moneda', label: 'Moneda', type: 'select', options: ['COP', 'USD'], required: true },
    { key: 'observaciones', label: 'Observaciones', type: 'textarea', span: 3 },
  ],
  columns: [
    { key: 'fecha', label: 'Fecha', render: (r) => fmtDate(r.fecha) },
    { key: 'proveedor_id', label: 'Proveedor', render: (r) => terceroName(r.proveedor_id), sortValue: (r) => terceroName(r.proveedor_id) },
    { key: 'centro_costo', label: 'Centro de costo' },
    { key: 'solicitante', label: 'Solicitante' },
    { key: 'total', label: 'Total', align: 'right', render: (r) => fmtMoney(compraTotales(r.id).total, r.moneda), sortValue: (r) => compraTotales(r.id).total },
  ],
  kpis: (rows) => {
    const vivas = rows.filter((r) => r.estado !== 'ANULADA');
    const total = vivas.reduce((s, r) => s + compraTotales(r.id).total, 0);
    return [
      { label: 'Órdenes', value: vivas.length, hint: 'sin anuladas' },
      { label: 'Valor comprometido', value: `$${fmtCompact(total)}`, hint: 'COP con IVA' },
      { label: 'Por aprobar', value: rows.filter((r) => r.estado === 'SOLICITADA').length, hint: 'estado Solicitada' },
      { label: 'Por recibir', value: rows.filter((r) => r.estado === 'APROBADA').length, hint: 'estado Aprobada' },
    ];
  },
  kanbanCard: (r) => (
    <>
      <strong>{terceroName(r.proveedor_id)}</strong>
      <span className="muted small">{fmtDate(r.fecha)} · {r.centro_costo}</span>
      <span className="kc-amount">{fmtMoney(compraTotales(r.id).total, r.moneda)}</span>
    </>
  ),
  summary: (r) => {
    const t = compraTotales(r.id);
    return [
      { label: 'Ítems', value: t.items },
      { label: 'Subtotal', value: fmtMoney(t.subtotal, r.moneda) },
      { label: 'IVA', value: fmtMoney(t.iva, r.moneda) },
      { label: 'Total', value: fmtMoney(t.total, r.moneda), highlight: true },
    ];
  },

  // ---- Detalles (tablas relacionadas al maestro) ----
  details: [
    {
      table: 'compras_items',
      fk: 'compra_id',
      label: 'Ítems',
      icon: Package,
      fields: [
        { key: 'descripcion', label: 'Descripción', required: true, span: 3 },
        { key: 'cantidad', label: 'Cantidad', type: 'number', required: true, min: 1 },
        { key: 'unidad', label: 'Unidad', type: 'select', options: ['UND', 'HRS', 'MES', 'PAQ', 'SRV'], required: true },
        { key: 'precio_unitario', label: 'Precio unitario', type: 'number', required: true, min: 0 },
        { key: 'iva', label: 'IVA %', type: 'select', options: [{ value: 0, label: '0%' }, { value: 5, label: '5%' }, { value: 19, label: '19%' }], default: 19, required: true },
      ],
      columns: [
        { key: 'descripcion', label: 'Descripción' },
        { key: 'cantidad', label: 'Cant.', align: 'right' },
        { key: 'unidad', label: 'Und.' },
        { key: 'precio_unitario', label: 'Precio unit.', align: 'right', render: (i) => fmtMoney(i.precio_unitario) },
        { key: 'iva', label: 'IVA', align: 'right', render: (i) => `${i.iva}%` },
        { key: 'subtotal', label: 'Subtotal', align: 'right', render: (i) => fmtMoney(itemSubtotal(i)), sortValue: itemSubtotal },
        { key: 'total', label: 'Total', align: 'right', render: (i) => fmtMoney(itemTotal(i)), sortValue: itemTotal },
      ],
      footer: (rows) => (
        <>
          <span>{rows.length} ítems</span>
          <strong>Total orden: {fmtMoney(rows.reduce((s, i) => s + itemTotal(i), 0))}</strong>
        </>
      ),
    },
    {
      table: 'compras_entregas',
      fk: 'compra_id',
      label: 'Entregas',
      icon: Truck,
      alwaysEditable: true, // las recepciones se registran después de aprobada la orden
      defaults: () => ({ fecha: today() }),
      fields: [
        { key: 'fecha', label: 'Fecha', type: 'date', required: true },
        { key: 'remision', label: 'N.º remisión', required: true },
        { key: 'recibido_por', label: 'Recibido por', required: true },
        { key: 'observacion', label: 'Observación', type: 'textarea', span: 3 },
      ],
      columns: [
        { key: 'fecha', label: 'Fecha', render: (e) => fmtDate(e.fecha) },
        { key: 'remision', label: 'Remisión' },
        { key: 'recibido_por', label: 'Recibido por' },
        { key: 'observacion', label: 'Observación' },
      ],
    },
  ],
};

export default function Compras() {
  return <MasterDetailPage config={comprasConfig} />;
}
