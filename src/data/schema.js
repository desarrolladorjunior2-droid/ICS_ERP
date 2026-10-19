// Definición de tablas y relaciones Maestro → Detalle.
// Cada maestro declara sus tablas detalle y la llave foránea que las relaciona.
// El mismo modelo está expresado en SQL (PostgreSQL) en /db/schema.sql.

export const SCHEMA = {
  // ---- Seguridad ----
  roles: { prefix: 'ROL' },
  usuarios: { prefix: 'USR' },

  // ---- Terceros ----
  terceros: {
    prefix: 'TER',
    details: {
      terceros_contactos: 'tercero_id',
      terceros_direcciones: 'tercero_id',
      terceros_cuentas: 'tercero_id',
    },
  },
  terceros_contactos: {},
  terceros_direcciones: {},
  terceros_cuentas: {},

  // ---- Compras ----
  compras: {
    prefix: 'OC',
    details: {
      compras_items: 'compra_id',
      compras_entregas: 'compra_id',
    },
  },
  compras_items: {},
  compras_entregas: {},

  // ---- Firmas ----
  firmas: {
    prefix: 'DOC',
    details: {
      firmas_firmantes: 'documento_id',
      firmas_adjuntos: 'documento_id',
    },
  },
  firmas_firmantes: {},
  firmas_adjuntos: {},

  // ---- Actividades ----
  actividades: {
    prefix: 'ACT',
    details: {
      actividades_tareas: 'actividad_id',
      actividades_tiempos: 'actividad_id',
    },
  },
  actividades_tareas: {},
  actividades_tiempos: {},

  // ---- Workflow (bitácora transversal) ----
  workflow_historial: {},
};

export const TABLES = Object.keys(SCHEMA);
