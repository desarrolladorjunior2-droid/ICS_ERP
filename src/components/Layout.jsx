import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Moon, Sun, RotateCcw, ArrowLeft } from 'lucide-react';
import ModuleWheel from './ModuleWheel';
import { useAuth } from '../auth/AuthContext';
import { MODULES } from '../config/modules';
import { BRAND } from '../config/brand';
import { db } from '../data/db';
import { IconButton, useUi } from './ui';

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('ics-theme') || 'dark';
    } catch {
      return 'dark';
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('ics-theme', theme);
    } catch {
      /* noop */
    }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))];
}

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('ics-menu') === 'collapsed';
    } catch {
      return false;
    }
  });
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem('ics-menu', c ? 'open' : 'collapsed');
      } catch {
        /* noop */
      }
      return !c;
    });
  return [collapsed, toggle];
}

export default function Layout() {
  const { user, role, isAdmin, logout } = useAuth();
  const { confirm, toast } = useUi();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [theme, toggleTheme] = useTheme();
  const [collapsed, toggleMenu] = useCollapsed();
  const canGoBack = (window.history.state?.idx ?? 0) > 0;
  const inRecord = new URLSearchParams(search).has('id');
  const current = MODULES.find((m) => pathname.startsWith(m.path));
  const initials = user.nombre
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

  const resetDemo = async () => {
    if (await confirm('Se restaurarán todos los datos de demostración. ¿Continuar?', { title: 'Restaurar DEMO', danger: true })) {
      db.reset();
      db.logEvent('EDITAR', 'Restauró los datos de demostración', { modulo: 'sistema' });
      toast('Datos de demostración restaurados');
    }
  };

  return (
    <div className={`app ${collapsed ? 'menu-collapsed' : ''}`}>
      <ModuleWheel collapsed={collapsed} onToggle={toggleMenu} />
      <div className="main">
        <header className="topbar">
          <div className="crumbs">
            <button className="back-btn" onClick={() => navigate(-1)} disabled={!canGoBack} aria-label="Ir atrás" title="Ir atrás">
              <ArrowLeft size={16} /> <span>Atrás</span>
            </button>
            <span className="brand-name">{BRAND.product}</span>
            <span className="sep">/</span>
            {inRecord && current ? (
              <>
                <button className="crumb-link" onClick={() => navigate(current.path)}>
                  {current.label}
                </button>
                <span className="sep">/</span>
                <span>Detalle</span>
              </>
            ) : (
              <span>{current?.label || 'Inicio'}</span>
            )}
          </div>
          <div className="topbar-right">
            {isAdmin && <IconButton icon={RotateCcw} label="Restaurar datos DEMO" onClick={resetDemo} />}
            <IconButton icon={theme === 'dark' ? Sun : Moon} label={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'} onClick={toggleTheme} />
            <div className="user-chip">
              <span className="avatar">{initials}</span>
              <span className="user-meta">
                <strong>{user.nombre}</strong>
                <small>{role?.nombre}</small>
              </span>
            </div>
            <IconButton icon={LogOut} label="Cerrar sesión" onClick={logout} />
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
