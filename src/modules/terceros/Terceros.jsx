import { Users2, Contact, MapPin, Landmark } from 'lucide-react';
import MasterDetailPage from '../../components/MasterDetailPage';
import { Tag } from '../../components/ui';
import { db } from '../../data/db';

const tipoTone = { Proveedor: 'info', Cliente: 'accent', Aliado: 'neutral', Empleado: 'neutral' };

export const tercerosConfig = {
  module: 'terceros',
  table: 'terceros',
  title: 'Terceros',
  subtitle: 'Proveedores, clientes y aliados · Maestro (tercero) → Detalle (contactos, direcciones, cuentas)',
  entity: 'Tercero',
  newLabel: 'Nuevo tercero',
  icon: Users2,
  searchText: (r) => `${r.codigo} ${r.razon_social} ${r.documento} ${r.ciudad} ${r.tipo}`,
  recordTitle: (r) => r.razon_social,
  defaults: () => ({ tipo_documento: 'NIT', tipo: 'Proveedor' }),
  fields: [
    { key: 'razon_social', label: 'Razón social / Nombre', required: true, span: 2 },
    { key: 'tipo', label: 'Tipo de tercero', type: 'select', options: ['Proveedor', 'Cliente', 'Aliado', 'Empleado'], required: true },
    { key: 'tipo_documento', label: 'Tipo documento', type: 'select', options: ['NIT', 'CC', 'CE', 'Pasaporte'], required: true },
    { key: 'documento', label: 'N.º documento', required: true },
    { key: 'ciudad', label: 'Ciudad', required: true },
    { key: 'email', label: 'Correo', type: 'email', required: true },
    { key: 'telefono', label: 'Teléfono' },
  ],
  columns: [
    { key: 'razon_social', label: 'Razón social' },
    { key: 'documento', label: 'Documento', render: (r) => `${r.tipo_documento} ${r.documento}` },
    { key: 'tipo', label: 'Tipo', render: (r) => <Tag tone={tipoTone[r.tipo]}>{r.tipo}</Tag> },
    { key: 'ciudad', label: 'Ciudad' },
    { key: 'email', label: 'Correo' },
  ],
  kpis: (rows) => [
    { label: 'Terceros', value: rows.length },
    { label: 'Proveedores', value: rows.filter((r) => r.tipo === 'Proveedor').length },
    { label: 'Clientes', value: rows.filter((r) => r.tipo === 'Cliente').length },
    { label: 'En validación', value: rows.filter((r) => r.estado === 'EN_VALIDACION').length, hint: 'pendientes de activar' },
  ],
  kanbanCard: (r) => (
    <>
      <strong>{r.razon_social}</strong>
      <span className="muted small">{r.tipo} · {r.ciudad}</span>
    </>
  ),
  summary: (r, d) => [
    { label: 'Contactos', value: d.terceros_contactos.length },
    { label: 'Direcciones', value: d.terceros_direcciones.length },
    { label: 'Cuentas bancarias', value: d.terceros_cuentas.length },
    { label: 'Órdenes de compra', value: db.list('compras', (c) => c.proveedor_id === r.id).length, highlight: true },
  ],
  details: [
    {
      table: 'terceros_contactos',
      fk: 'tercero_id',
      label: 'Contactos',
      icon: Contact,
      fields: [
        { key: 'nombre', label: 'Nombre', required: true, span: 2 },
        { key: 'cargo', label: 'Cargo' },
        { key: 'email', label: 'Correo', type: 'email', required: true, span: 2 },
        { key: 'telefono', label: 'Teléfono' },
      ],
      columns: [
        { key: 'nombre', label: 'Nombre' },
        { key: 'cargo', label: 'Cargo' },
        { key: 'email', label: 'Correo' },
        { key: 'telefono', label: 'Teléfono' },
      ],
    },
    {
      table: 'terceros_direcciones',
      fk: 'tercero_id',
      label: 'Direcciones',
      icon: MapPin,
      fields: [
        { key: 'tipo', label: 'Tipo', type: 'select', options: ['Principal', 'Facturación', 'Entrega', 'Sucursal'], required: true },
        { key: 'direccion', label: 'Dirección', required: true, span: 2 },
        { key: 'ciudad', label: 'Ciudad', required: true },
      ],
      columns: [
        { key: 'tipo', label: 'Tipo' },
        { key: 'direccion', label: 'Dirección' },
        { key: 'ciudad', label: 'Ciudad' },
      ],
    },
    {
      table: 'terceros_cuentas',
      fk: 'tercero_id',
      label: 'Cuentas bancarias',
      icon: Landmark,
      fields: [
        { key: 'banco', label: 'Banco', required: true, span: 2 },
        { key: 'tipo_cuenta', label: 'Tipo de cuenta', type: 'select', options: ['Ahorros', 'Corriente'], required: true },
        { key: 'numero', label: 'Número', required: true },
      ],
      columns: [
        { key: 'banco', label: 'Banco' },
        { key: 'tipo_cuenta', label: 'Tipo' },
        { key: 'numero', label: 'Número' },
      ],
    },
  ],
};

export default function Terceros() {
  return <MasterDetailPage config={tercerosConfig} />;
}
