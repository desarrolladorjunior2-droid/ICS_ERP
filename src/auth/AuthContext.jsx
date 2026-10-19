import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { db, useDb } from '../data/db';
import { DASHBOARDS } from '../config/modules';

const AuthContext = createContext(null);
const SESSION_KEY = 'ics-erp-session';

function readSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [userId, setUserId] = useState(readSession);
  // Usuario y rol se leen siempre del repositorio para reflejar cambios en caliente.
  const user = useDb((d) => (userId ? d.get('usuarios', userId) : null), [userId]);
  const role = useDb((d) => (user ? d.get('roles', user.rol_id) : null), [user?.rol_id]);

  // El repositorio necesita saber quién actúa para registrar la auditoría.
  useEffect(() => {
    db.setActor(user ? { id: user.id, nombre: user.nombre, usuario: user.usuario, rol: role?.nombre || '—' } : null);
  }, [user, role]);

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
    db.logEvent('LOGIN', 'Inició sesión', {
      who: { id: u.id, nombre: u.nombre, usuario: u.usuario, rol: db.get('roles', u.rol_id)?.nombre || '—' },
    });
    try {
      sessionStorage.setItem(SESSION_KEY, u.id);
    } catch {
      /* sesión solo en memoria */
    }
    setUserId(u.id);
    return null;
  }, []);

  const logout = useCallback(() => {
    db.logEvent('LOGOUT', 'Cerró sesión');
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* noop */
    }
    setUserId(null);
  }, []);

  const value = useMemo(() => {
    const isAdmin = role?.id === 'rol-admin';
    const can = (module, action = 'ver') => isAdmin || !!role?.permisos?.[module]?.[action];
    // El administrador ve todos los dashboards; el resto, los parametrizados y permitidos.
    const dashboards = isAdmin
      ? DASHBOARDS.map((d) => d.key)
      : (user?.dashboards || []).filter((k) => can(DASHBOARDS.find((d) => d.key === k)?.module || 'dashboard'));
    return { user, role, isAdmin, can, dashboards, login, logout };
  }, [user, role, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
