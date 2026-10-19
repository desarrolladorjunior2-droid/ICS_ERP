import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Lock, ArrowLeft, UserCog, LogOut } from 'lucide-react';
import { LogoMark } from './Logo';
import { MODULES } from '../config/modules';
import { useAuth } from '../auth/AuthContext';

// Menú de módulos en arco. Todos los módulos existentes se muestran;
// los que el rol no puede ver aparecen bloqueados con un candado.
const ARC_MODULES = MODULES.filter((m) => m.key !== 'dashboard'); // Inicio va arriba
const X_EDGE = 34; // X del centro de los iconos en los extremos del arco
const BULGE = 70; // cuánto sobresale el centro del arco hacia la derecha
const ARC = 62; // semiángulo del arco (grados)
const GAP = 78; // separación vertical máxima entre iconos
const TOP = 132; // espacio reservado arriba (inicio + atrás)
const BOTTOM = 92; // espacio reservado abajo (usuario)

export default function ModuleWheel({ collapsed, onToggle }) {
  const { can, user, role, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [height, setHeight] = useState(700);
  const [profile, setProfile] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setHeight(e.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => setProfile(false), [pathname]);

  const N = ARC_MODULES.length;
  const span = Math.min(height - TOP - BOTTOM, GAP * (N - 1));
  const cy = TOP + (height - TOP - BOTTOM) / 2;
  const cosA = Math.cos((ARC * Math.PI) / 180);

  const position = (i) => {
    const t = N === 1 ? 0 : (i / (N - 1)) * 2 - 1; // -1 … 1
    const th = (t * ARC * Math.PI) / 180;
    return {
      x: X_EDGE + (BULGE * (Math.cos(th) - cosA)) / (1 - cosA),
      y: cy + (t * span) / 2,
    };
  };

  // react-router guarda el índice de historial: idx 0 = primera página de la sesión.
  const canGoBack = (window.history.state?.idx ?? 0) > 0;
  const initials = user.nombre.split(' ').map((p) => p[0]).slice(0, 2).join('');

  return (
    <nav className={`wheel ${collapsed ? 'collapsed' : ''}`} ref={ref} aria-label="Menú de módulos">
      {/* Inicio + atrás */}
      <div className="wheel-top">
        <button
          className={`orb-btn home ${pathname.startsWith('/dashboard') ? 'active' : ''}`}
          onClick={() => navigate('/dashboard')}
          aria-label="Inicio"
          data-tip="Inicio"
        >
          <LogoMark size={44} />
        </button>
        <button className="orb-btn small" onClick={() => navigate(-1)} disabled={!canGoBack} aria-label="Atrás" data-tip="Atrás">
          <ArrowLeft size={16} />
        </button>
      </div>

      {/* Arco guía */}
      <svg className="wheel-arc" width="100%" height="100%" aria-hidden>
        <path
          d={ARC_MODULES.map((_, i) => {
            const p = position(i);
            return `${i ? 'L' : 'M'} ${p.x} ${p.y}`;
          }).join(' ')}
        />
      </svg>

      <ul className="wheel-items">
        {ARC_MODULES.map((m, i) => {
          const { x, y } = position(i);
          const allowed = can(m.key, 'ver');
          const active = pathname.startsWith(m.path);
          const Icon = m.icon;
          return (
            <li
              key={m.key}
              className="wheel-item"
              style={{
                transform: collapsed ? `translate(-60px, ${y}px)` : `translate(${x}px, ${y}px)`,
                transitionDelay: `${(collapsed ? N - i : i) * 28}ms`,
              }}
            >
              <button
                className={`orb-btn ${active ? 'active' : ''} ${allowed ? '' : 'locked'}`}
                onClick={() => allowed && navigate(m.path)}
                aria-disabled={!allowed}
                aria-current={active ? 'page' : undefined}
                aria-label={allowed ? m.label : `${m.label} (sin permiso)`}
                data-tip={allowed ? m.label : `${m.label} · sin permiso`}
                tabIndex={collapsed ? -1 : 0}
              >
                <Icon size={19} />
                {!allowed && (
                  <span className="lock-badge" aria-hidden>
                    <Lock size={9} strokeWidth={3} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Usuario */}
      <div className="wheel-bottom">
        <button className="orb-btn user" onClick={() => setProfile((p) => !p)} aria-label="Mi usuario" aria-expanded={profile} data-tip="Mi usuario">
          <UserCog size={19} />
        </button>
        {profile && (
          <div className="profile-pop" role="menu">
            <div className="profile-head">
              <span className="avatar">{initials}</span>
              <div>
                <strong>{user.nombre}</strong>
                <small>{role?.nombre}</small>
              </div>
            </div>
            {can('usuarios', 'ver') && (
              <button role="menuitem" onClick={() => navigate('/usuarios')}>
                <UserCog size={15} /> Gestión de usuarios
              </button>
            )}
            <button role="menuitem" onClick={logout}>
              <LogOut size={15} /> Cerrar sesión
            </button>
          </div>
        )}
      </div>

      {/* Pestaña para plegar / desplegar */}
      <button className="wheel-tab" onClick={onToggle} aria-label={collapsed ? 'Mostrar menú' : 'Ocultar menú'} aria-expanded={!collapsed}>
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      {/* Navegación compacta para pantallas pequeñas */}
      <div className="dock">
        {MODULES.filter((m) => can(m.key, 'ver')).map((m) => (
          <button
            key={m.key}
            className={pathname.startsWith(m.path) ? 'active' : ''}
            onClick={() => navigate(m.path)}
            aria-label={m.label}
          >
            <m.icon size={20} aria-hidden />
          </button>
        ))}
      </div>
    </nav>
  );
}
