import { db } from '../data/db';
import { WORKFLOWS } from './definitions';

// Guardas: reglas de negocio que deben cumplirse antes de una transición.
const GUARDS = {
  tieneItems: (rec) =>
    db.details('compras', rec.id, 'compras_items').length > 0 || 'La orden debe tener al menos un ítem.',
  tieneFirmantes: (rec) =>
    db.details('firmas', rec.id, 'firmas_firmantes').length > 0 || 'El documento debe tener al menos un firmante.',
  todosFirmaron: (rec) =>
    db.details('firmas', rec.id, 'firmas_firmantes').every((f) => f.estado === 'FIRMADO') ||
    'Faltan firmantes por firmar.',
};

// Efectos automáticos al entrar a un estado ("modulo:ESTADO").
const EFFECTS = {
  // Un documento reenviado a firma reinicia las firmas rechazadas.
  'firmas:EN_FIRMA': (rec) =>
    db.details('firmas', rec.id, 'firmas_firmantes')
      .filter((f) => f.estado === 'RECHAZADO')
      .forEach((f) => db.update('firmas_firmantes', f.id, { estado: 'PENDIENTE', firma: '', fecha_firma: '' })),
};

export const stateInfo =(module, estado) =>
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
  EFFECTS[`${module}:${transition.to}`]?.(rec);
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
  return pending;
}
