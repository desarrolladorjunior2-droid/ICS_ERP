import { db } from './db';

export const terceroOptions = (tipo) => () =>
  db
    .list('terceros', (t) => (!tipo || t.tipo === tipo) && t.estado !== 'BLOQUEADO')
    .map((t) => ({ value: t.id, label: t.razon_social }));

export const terceroName = (id) => db.get('terceros', id)?.razon_social || '—';

export const usuarioOptions = () => db.list('usuarios', (u) => u.activo).map((u) => ({ value: u.nombre, label: u.nombre }));

export const itemSubtotal = (i) => (Number(i.cantidad) || 0) * (Number(i.precio_unitario) || 0);
export const itemTotal = (i) => itemSubtotal(i) * (1 + (Number(i.iva) || 0) / 100);

/** Totales de una orden de compra a partir de su detalle de ítems. */
export function compraTotales(compraId) {
  const items = db.details('compras', compraId, 'compras_items');
  const subtotal = items.reduce((s, i) => s + itemSubtotal(i), 0);
  const total = items.reduce((s, i) => s + itemTotal(i), 0);
  return { items: items.length, subtotal, iva: total - subtotal, total };
}

/** Avance de una actividad = % de tareas completadas. */
export function avanceActividad(actId) {
  const t = db.details('actividades', actId, 'actividades_tareas');
  return t.length ? (t.filter((x) => x.completada).length / t.length) * 100 : 0;
}
