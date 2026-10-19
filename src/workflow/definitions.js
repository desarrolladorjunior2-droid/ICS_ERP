// Metodología de trabajo (WorkFlow) por módulo: estados + transiciones.
// `perm` es la acción de la matriz de permisos que habilita la transición.
// `editable` indica si el maestro y sus detalles pueden modificarse en ese estado.

export const WORKFLOWS = {
  compras: {
    initial: 'BORRADOR',
    states: {
      BORRADOR: { label: 'Borrador', tone: 'neutral', editable: true },
      SOLICITADA: { label: 'Solicitada', tone: 'info' },
      APROBADA: { label: 'Aprobada', tone: 'good' },
      RECIBIDA: { label: 'Recibida', tone: 'accent' },
      CERRADA: { label: 'Cerrada', tone: 'done', final: true },
      RECHAZADA: { label: 'Rechazada', tone: 'critical', editable: true },
      ANULADA: { label: 'Anulada', tone: 'muted', final: true },
    },
    flow: ['BORRADOR', 'SOLICITADA', 'APROBADA', 'RECIBIDA', 'CERRADA'],
    transitions: [
      { from: ['BORRADOR', 'RECHAZADA'], to: 'SOLICITADA', label: 'Enviar a aprobación', perm: 'editar', guard: 'tieneItems' },
      { from: ['SOLICITADA'], to: 'APROBADA', label: 'Aprobar', perm: 'aprobar' },
      { from: ['SOLICITADA'], to: 'RECHAZADA', label: 'Rechazar', perm: 'aprobar', comment: true, danger: true },
      { from: ['APROBADA'], to: 'RECIBIDA', label: 'Registrar recepción', perm: 'editar' },
      { from: ['RECIBIDA'], to: 'CERRADA', label: 'Cerrar orden', perm: 'aprobar' },
      { from: ['BORRADOR', 'RECHAZADA', 'SOLICITADA'], to: 'ANULADA', label: 'Anular', perm: 'eliminar', comment: true, danger: true },
    ],
  },

  firmas: {
    initial: 'BORRADOR',
    states: {
      BORRADOR: { label: 'Borrador', tone: 'neutral', editable: true },
      EN_FIRMA: { label: 'En firma', tone: 'info' },
      FIRMADO: { label: 'Firmado', tone: 'good', final: true },
      RECHAZADO: { label: 'Rechazado', tone: 'critical', editable: true },
      VENCIDO: { label: 'Vencido', tone: 'muted', final: true },
    },
    flow: ['BORRADOR', 'EN_FIRMA', 'FIRMADO'],
    transitions: [
      { from: ['BORRADOR', 'RECHAZADO'], to: 'EN_FIRMA', label: 'Enviar a firma', perm: 'editar', guard: 'tieneFirmantes' },
      { from: ['EN_FIRMA'], to: 'FIRMADO', label: 'Completar', perm: 'aprobar', guard: 'todosFirmaron' },
      { from: ['EN_FIRMA'], to: 'RECHAZADO', label: 'Rechazar', perm: 'aprobar', comment: true, danger: true },
      { from: ['EN_FIRMA', 'BORRADOR'], to: 'VENCIDO', label: 'Marcar vencido', perm: 'eliminar', danger: true },
    ],
  },

  actividades: {
    initial: 'PLANEADA',
    states: {
      PLANEADA: { label: 'Planeada', tone: 'neutral', editable: true },
      EN_CURSO: { label: 'En curso', tone: 'info', editable: true },
      EN_REVISION: { label: 'En revisión', tone: 'accent', editable: true },
      COMPLETADA: { label: 'Completada', tone: 'good', final: true },
      CANCELADA: { label: 'Cancelada', tone: 'muted', final: true },
    },
    flow: ['PLANEADA', 'EN_CURSO', 'EN_REVISION', 'COMPLETADA'],
    transitions: [
      { from: ['PLANEADA'], to: 'EN_CURSO', label: 'Iniciar', perm: 'editar' },
      { from: ['EN_CURSO'], to: 'EN_REVISION', label: 'Enviar a revisión', perm: 'editar' },
      { from: ['EN_REVISION'], to: 'EN_CURSO', label: 'Devolver', perm: 'aprobar', comment: true },
      { from: ['EN_REVISION'], to: 'COMPLETADA', label: 'Aprobar cierre', perm: 'aprobar' },
      { from: ['PLANEADA', 'EN_CURSO', 'EN_REVISION'], to: 'CANCELADA', label: 'Cancelar', perm: 'eliminar', comment: true, danger: true },
    ],
  },

  terceros: {
    initial: 'PROSPECTO',
    states: {
      PROSPECTO: { label: 'Prospecto', tone: 'neutral', editable: true },
      EN_VALIDACION: { label: 'En validación', tone: 'info', editable: true },
      ACTIVO: { label: 'Activo', tone: 'good', editable: true },
      INACTIVO: { label: 'Inactivo', tone: 'muted', editable: true },
      BLOQUEADO: { label: 'Bloqueado', tone: 'critical' },
    },
    flow: ['PROSPECTO', 'EN_VALIDACION', 'ACTIVO'],
    transitions: [
      { from: ['PROSPECTO'], to: 'EN_VALIDACION', label: 'Validar documentos', perm: 'editar' },
      { from: ['EN_VALIDACION'], to: 'ACTIVO', label: 'Activar', perm: 'aprobar' },
      { from: ['EN_VALIDACION'], to: 'PROSPECTO', label: 'Devolver', perm: 'aprobar', comment: true },
      { from: ['ACTIVO'], to: 'INACTIVO', label: 'Inactivar', perm: 'editar' },
      { from: ['INACTIVO'], to: 'ACTIVO', label: 'Reactivar', perm: 'aprobar' },
      { from: ['ACTIVO', 'INACTIVO', 'EN_VALIDACION'], to: 'BLOQUEADO', label: 'Bloquear', perm: 'aprobar', comment: true, danger: true },
      { from: ['BLOQUEADO'], to: 'ACTIVO', label: 'Desbloquear', perm: 'aprobar', comment: true },
    ],
  },

  inventario: {
    initial: 'BORRADOR',
    states: {
      BORRADOR: { label: 'Borrador', tone: 'neutral', editable: true },
      CONFIRMADO: { label: 'Confirmado', tone: 'good', final: true },
      ANULADO: { label: 'Anulado', tone: 'muted', final: true },
    },
    flow: ['BORRADOR', 'CONFIRMADO'],
    transitions: [
      { from: ['BORRADOR'], to: 'CONFIRMADO', label: 'Confirmar movimiento', perm: 'aprobar', guard: 'puedeConfirmar' },
      { from: ['BORRADOR', 'CONFIRMADO'], to: 'ANULADO', label: 'Anular', perm: 'eliminar', comment: true, danger: true, guard: 'anulacionSegura' },
    ],
  },
};
