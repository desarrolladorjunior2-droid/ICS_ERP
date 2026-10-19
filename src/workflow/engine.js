import { db } from '../data/db';
import { articuloName, signedQty, stockMap } from '../data/lookups';
import { WORKFLOWS } from './definitions';

/** Efecto neto de un movimiento de inventario sobre el stock, por artículo. */
function movimientoDeltas(rec) {
  const out = {};
  db.details('inventario', rec.id, 'inventario_lineas').forEach((l) => {
    out[l.articulo_id] = (out[l.articulo_id] || 0) + signedQty(rec.tipo, l.cantidad);
  });
  return out;
}

// Guardas: reglas de negocio que deben cumplirse antes de una transición.
const GUARDS = {
  tieneItems: (rec) =>
    db.details('compras', rec.id, 'compras_items').length > 0 || 'La orden debe tener al menos un ítem.',
  tieneFirmantes: (rec) =>
    db.details('firmas', rec.id, 'firmas_firmantes').length > 0 || 'El documento debe tener al menos un firmante.',
  todosFirmaron: (rec) =>
    db.details('firmas', rec.id, 'firmas_firmantes').every((f) => f.estado === 'FIRMADO') ||
    'Faltan firmantes por firmar.',
  // Inventario: no se confirma un movimiento vacío ni que deje el stock en negativo.
  puedeConfirmar: (rec) => {
    if (!db.details('inventario', rec.id, 'inventario_lineas').length) return 'El movimiento debe tener al menos una línea.';
    const stock = stockMap();
    for (const [art, d] of Object.entries(movimientoDeltas(rec))) {
      if ((stock[art] || 0) + d < 0) return `Stock insuficiente de "${articuloName(art)}" (disponible: ${stock[art] || 0}).`;
    }
    return true;
  },
  // Anular un movimiento ya confirmado revierte su efecto: no puede dejar stock negativo.
  anulacionSegura: (rec) => {
    if (rec.estado !== 'CONFIRMADO') return true;
    const stock = stockMap();
    for (const [art, d] of Object.entries(movimientoDeltas(rec))) {
      if ((stock[art] || 0) - d < 0) return `No se puede anular: dejaría el stock de "${articuloName(art)}" en negativo.`;
    }
    return true;
  },
};

// Efectos automáticos al entrar a un estado ("modulo:ESTADO").
const EFFECTS = {
  // Un documento reenviado a firma reinicia las firmas rechazadas.
  'firmas:EN_FIRMA': (rec) =>
    db.details('firmas', rec.id, 'firmas_firmantes')
      .filter((f) => f.estado === 'RECHAZADO')
      .forEach((f) => db.update('firmas_firmantes', f.id, { estado: 'PENDIENTE', firma: '', fecha_firma: '' })),

  // INVENTARIO ⇄ COMPRAS: al recibir una orden, sus ítems ligados a un artículo generan
  // un ingreso en borrador que el almacén debe confirmar.
  'compras:RECIBIDA': (rec, user) => {
    const items = db.details('compras', rec.id, 'compras_items').filter((i) => i.articulo_id);
    if (!items.length || db.list('inventario', (m) => m.compra_id === rec.id && m.estado !== 'ANULADO').length) return;
    const mov = db.insert('inventario', {
      tipo: 'Entrada por compra',
      fecha: new Date().toISOString().slice(0, 10),
      bodega: 'Bodega principal',
      compra_id: rec.id,
      referencia: rec.codigo,
      observaciones: 'Generado automáticamente al recibir la orden de compra',
      estado: 'BORRADOR',
    });
    items.forEach((i) =>
      db.insert('inventario_lineas', {
        movimiento_id: mov.id,
        articulo_id: i.articulo_id,
        cantidad: i.cantidad,
        costo_unitario: i.precio_unitario,
      }),
    );
    db.insert('workflow_historial', {
      modulo: 'inventario',
      registro_id: mov.id,
      registro_codigo: mov.codigo,
      desde: '',
      hacia: 'BORRADOR',
      accion: `Creado automáticamente desde ${rec.codigo}`,
      usuario_id: user.id,
      usuario: user.nombre,
      comentario: '',
      fecha: new Date().toISOString(),
    });
  },

  // Al confirmar una entrada por compra se actualiza el último costo del artículo.
  'inventario:CONFIRMADO': (rec) => {
    if (rec.tipo !== 'Entrada por compra') return;
    db.details('inventario', rec.id, 'inventario_lineas').forEach((l) => {
      if (Number(l.costo_unitario) > 0) db.update('articulos', l.articulo_id, { ultimo_costo: Number(l.costo_unitario) });
    });
  },
};

export const stateInfo = (module, estado) =>
  WORKFLOWS[module]?.states[estado] || { label: estado || '—', tone: 'neutral' };

export const isEditable = (module, rec) => !rec || !!stateInfo(module, rec.estado).editable;

/** Transiciones disponibles para el registro y el usuario actual. */
export function availableTransitions(module, rec, can) {
  const wf = WORKFLOWS[module];
  if (!wf || !rec) return [];
  return wf.transitions.filter((t) => t.from.includes(rec.estado) && can(module, t.perm));
}

/** Ejecuta una transición; devuelve { ok } o { ok:false, error }. */
export function runTransition(module, table, rec, transition, user, comentario = '') {
  if (transition.guard) {
    const res = GUARDS[transition.guard](rec);
    if (res !== true) return { ok: false, error: res };
  }
  db.update(table, rec.id, { estado: transition.to });
  EFFECTS[`${module}:${transition.to}`]?.(rec, user);
  db.insert('workflow_historial', {
    modulo: module,
    registro_id: rec.id,
    registro_codigo: rec.codigo,
    desde: rec.estado,
    hacia: transition.to,
    accion: transition.label,
    usuario_id: user.id,
    usuario: user.nombre,
    comentario,
    fecha: new Date().toISOString(),
  });
  return { ok: true };
}

/** Busca la transición directa entre dos estados (usada por el tablero Kanban). */
export const findTransition = (module, from, to, can) =>
  WORKFLOWS[module]?.transitions.find((t) => t.from.includes(from) && t.to === to && can(module, t.perm));

/** Registros que esperan una acción del usuario (bandeja de workflow). */
export function pendingFor(can) {
  const pending = [];
  const push = (module, table, rows) =>
    rows.forEach((r) => {
      const ts = availableTransitions(module, r, can).filter((t) => t.perm === 'aprobar');
      if (ts.length) pending.push({ module, table, record: r, transitions: ts });
    });
  push('compras', 'compras', db.list('compras', (r) => r.estado === 'SOLICITADA' || r.estado === 'RECIBIDA'));
  push('firmas', 'firmas', db.list('firmas', (r) => r.estado === 'EN_FIRMA'));
  push('actividades', 'actividades', db.list('actividades', (r) => r.estado === 'EN_REVISION'));
  push('terceros', 'terceros', db.list('terceros', (r) => r.estado === 'EN_VALIDACION'));
  push('inventario', 'inventario', db.list('inventario', (r) => r.estado === 'BORRADOR'));
  return pending;
}
