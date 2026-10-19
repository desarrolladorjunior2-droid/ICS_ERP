// Repositorio de datos del DEMO.
// Persiste en localStorage con una API CRUD síncrona; para producción basta con
// reemplazar la implementación de estas funciones por llamadas a la API real
// (p. ej. funciones serverless de Vercel sobre PostgreSQL) sin tocar la UI.
import { useEffect, useState, useCallback } from 'react';
import { SCHEMA, TABLES } from './schema';
import { buildSeed } from './seed';

const STORAGE_KEY = 'ics-erp-db-v1';
const listeners = new Set();
let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      TABLES.forEach((t) => (parsed[t] ??= []));
      return parsed;
    }
  } catch {
    /* almacenamiento no disponible: se usa la semilla en memoria */
  }
  return buildSeed();
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* sin persistencia en este navegador */
  }
  listeners.forEach((fn) => fn());
}

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

const now = () => new Date().toISOString();

function nextCode(table) {
  const prefix = SCHEMA[table]?.prefix;
  if (!prefix) return undefined;
  const max = state[table].reduce((m, r) => {
    const n = parseInt(String(r.codigo || '').split('-').pop(), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(4, '0')}`;
}

export const db = {
  list(table, filter) {
    const rows = state[table] || [];
    return filter ? rows.filter(filter) : rows;
  },

  get(table, id) {
    return (state[table] || []).find((r) => r.id === id) || null;
  },

  insert(table, data) {
    const row = { id: uid(), creado: now(), actualizado: now(), ...data };
    if (!row.codigo && SCHEMA[table]?.prefix) row.codigo = nextCode(table);
    state = { ...state, [table]: [...state[table], row] };
    persist();
    return row;
  },

  update(table, id, patch) {
    let updated = null;
    state = {
      ...state,
      [table]: state[table].map((r) => (r.id === id ? (updated = { ...r, ...patch, actualizado: now() }) : r)),
    };
    persist();
    return updated;
  },

  /** Elimina un registro y, si es maestro, todos sus detalles (cascada). */
  remove(table, id) {
    const details = SCHEMA[table]?.details || {};
    const next = { ...state, [table]: state[table].filter((r) => r.id !== id) };
    Object.entries(details).forEach(([dt, fk]) => {
      next[dt] = next[dt].filter((r) => r[fk] !== id);
    });
    next.workflow_historial = next.workflow_historial.filter((h) => h.registro_id !== id);
    state = next;
    persist();
  },

  /** Detalles de un maestro para una tabla detalle concreta. */
  details(masterTable, masterId, detailTable) {
    const fk = SCHEMA[masterTable]?.details?.[detailTable];
    return fk ? state[detailTable].filter((r) => r[fk] === masterId) : [];
  },

  reset() {
    state = buildSeed();
    persist();
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

/** Hook reactivo: re-renderiza cuando cambia cualquier tabla. */
export function useDb(selector, deps = []) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const select = useCallback(selector, deps);
  const [value, setValue] = useState(() => select(db));
  useEffect(() => {
    setValue(select(db));
    return db.subscribe(() => setValue(select(db)));
  }, [select]);
  return value;
}
