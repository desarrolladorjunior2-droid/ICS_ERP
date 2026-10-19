import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { db, useDb } from '../data/db';
import { DASHBOARDS } from '../config/modules';

const AuthContext = createContext(null);
const SESSION_KEY = 'ics-erp-session';
const EMPRESA_KEY = 'ics-erp-empresa';

function readStorage(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key, value) {
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch {
    /* sesión solo en memoria */
  }
}

/** Empresas a las que puede entrar un usuario: el administrador a todas las activas; el resto, las asignadas. */
function empresasPermitidas(user) {
  if (!user) return [];
  const activas = db.listAll('empresas').filter((e) => e.activo !== false);
  if (user.rol_id === 'rol-admin') return activas;
  return activas.filter((e) => (user.empresas_ids || []).includes(e.id));
}

export function AuthProvider({ children }) {
  const [userId, setUserId] = useState(() => readStorage(SESSION_KEY));
  // La empresa activa debe fijarse ANTES del primer render para no mostrar datos de otra empresa.
  const [empresaId, setEmpresaId] = useState(() => {
    const saved = readStorage(EMPRESA_KEY);
    db.setEmpresa(saved, { silent: true });
    return saved;
  });

  // Usuario y rol se leen siempre del repositorio para reflejar cambios en caliente.
  const user = useDb((d) => (userId ? d.get('usuarios', userId) : null), [userId]);
  const role = useDb((d) => (user ? d.get('roles', user.rol_id) : null), [user?.rol_id]);
  const empresasAll = useDb((d) => d.listAll('empresas'));

  const empresas = useMemo(
    () => empresasPermitidas(user),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, empresasAll],
  );
  const empresa = empresas.find((e) => e.id === empresaId) || null;

  // El repositorio necesita saber quién actúa para registrar la auditoría.
  useEffect(() => {
    db.setActor(user ? { id: user.id, nombre: user.nombre, usuario: user.usuario, rol: role?.nombre || '—' } : null);
  }, [user, role]);

  // Si la empresa activa deja de estar permitida (p. ej. se le retiró el acceso), pasa a la primera disponible.
  useEffect(() => {
    if (!user) return;
    if (!empresa && empresas.length) {
      const fallback = empresas.find((e) => e.id === user.empresa_id) || empresas[0];
      db.setEmpresa(fallback.id);
      writeStorage(EMPRESA_KEY, fallback.id);
      setEmpresaId(fallback.id);
    }
  }, [user, empresa, empresas]);

  // NOTA DEMO: la validación de clave ocurre en el cliente. En producción debe
  // hacerse en el backend con contraseñas cifradas (bcrypt/argon2) y JWT.
  const login = useCallback((usuario, clave) => {
    const u = db.list('usuarios').find((x) => x.usuario.toLowerCase() === usuario.trim().toLowerCase());
    if (!u || u.clave !== clave) {
      const typed = usuario.trim();
      db.logEvent('LOGIN_FALLIDO', `Intento de ingreso fallido con el usuario "${typed || '(vacío)'}"`, {
        who: { id: u?.id || '', nombre: u?.nombre || typed || '(desconocido)', usuario: typed, rol: '—' },
        nivel: 'critical',
      });
      return 'Usuario o contraseña incorrectos.';
    }
    if (!u.activo) return 'El usuario está inactivo.';
    const permitidas = empresasPermitidas(u);
    if (!permitidas.length) return 'El usuario no tiene empresas asignadas. Contacte al administrador.';
    const inicial = permitidas.find((e) => e.id === u.empresa_id) || permitidas[0];
    db.setEmpresa(inicial.id, { silent: true });
    db.logEvent('LOGIN', `Inició sesión en ${inicial.alias || inicial.nombre}`, {
      who: { id: u.id, nombre: u.nombre, usuario: u.usuario, rol: db.get('roles', u.rol_id)?.nombre || '—' },
    });
    writeStorage(SESSION_KEY, u.id);
    writeStorage(EMPRESA_KEY, inicial.id);
    setEmpresaId(inicial.id);
    setUserId(u.id);
    return null;
  }, []);

  const logout = useCallback(() => {
    db.logEvent('LOGOUT', 'Cerró sesión');
    writeStorage(SESSION_KEY, null);
    writeStorage(EMPRESA_KEY, null);
    db.setEmpresa(null, { silent: true });
    setEmpresaId(null);
    setUserId(null);
  }, []);

  /** Cambia la empresa con la que se trabaja; todas las pantallas se recargan con sus datos. */
  const cambiarEmpresa = useCallback(
    (id) => {
      const destino = empresas.find((e) => e.id === id);
      if (!destino || destino.id === empresaId) return false;
      db.setEmpresa(id);
      writeStorage(EMPRESA_KEY, id);
      setEmpresaId(id);
      db.logEvent('CAMBIO_EMPRESA', `Cambió a la empresa ${destino.nombre}`);
      return true;
    },
    [empresas, empresaId],
  );

  const value = useMemo(() => {
    const isAdmin = role?.id === 'rol-admin';
    const can = (module, action = 'ver') => isAdmin || !!role?.permisos?.[module]?.[action];
    // El administrador ve todos los dashboards; el resto, los parametrizados y permitidos.
    const dashboards = isAdmin
      ? DASHBOARDS.map((d) => d.key)
      : (user?.dashboards || []).filter((k) => can(DASHBOARDS.find((d) => d.key === k)?.module || 'dashboard'));
    return { user, role, isAdmin, can, dashboards, login, logout, empresa, empresas, cambiarEmpresa };
  }, [user, role, login, logout, empresa, empresas, cambiarEmpresa]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
