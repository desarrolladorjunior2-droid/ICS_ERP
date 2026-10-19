import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, Moon, Sun, User } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { LogoMark } from '../components/Logo';
import NetworkBackground from '../components/NetworkBackground';
import { BRAND } from '../config/brand';
import { useTheme } from '../hooks/useTheme';

// Palabras que rotan bajo el nombre: lo que el sistema hace.
const WORDS = ['Compras', 'Inventario', 'Firmas', 'Actividades', 'Auditoría', 'Multiempresa'];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [w, setW] = useState(0);
  const [theme, toggleTheme] = useTheme();

  useEffect(() => {
    const id = setInterval(() => setW((i) => (i + 1) % WORDS.length), 2400);
    return () => clearInterval(id);
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const err = login(usuario, clave);
    if (err) setError(err);
    else navigate('/dashboard', { replace: true });
  };

  const fillDemo = () => {
    setUsuario('admin');
    setClave('Ics2026*');
    setError('');
  };

  return (
    <div className="lg">
      <NetworkBackground />
      <button
        type="button"
        className="lg-theme"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
      >
        {theme === 'dark' ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
      </button>
      <div className="lg-vignette" aria-hidden />

      <main className="lg-main">
        <div className="lg-logo">
          <span className="lg-ring r1" aria-hidden />
          <span className="lg-ring r2" aria-hidden />
          <span className="lg-ring r3" aria-hidden />
          <LogoMark size={112} />
        </div>

        <h1 className="lg-title">
          Insight <b>Cloud</b> Solution
        </h1>
        <p className="lg-sub">
          {BRAND.company} · {BRAND.companyName}
        </p>

        <p className="lg-tag" aria-live="polite">
          <span>Un solo sistema para</span>
          <span className="lg-word" key={w}>
            {WORDS[w]}
          </span>
        </p>

        <form className="lg-form" onSubmit={submit}>
          <label className="lg-field">
            <User size={17} aria-hidden />
            <input
              placeholder="Usuario"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username"
              aria-label="Usuario"
              autoFocus
            />
          </label>
          <label className="lg-field">
            <KeyRound size={17} aria-hidden />
            <input
              type="password"
              placeholder="Contraseña"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              autoComplete="current-password"
              aria-label="Contraseña"
            />
          </label>
          {error && (
            <p className="lg-error" role="alert">
              {error}
            </p>
          )}
          <button className="lg-btn" type="submit">
            <span>Ingresar</span>
            <ArrowRight size={18} aria-hidden />
          </button>
        </form>

        <button type="button" className="lg-demo" onClick={fillDemo}>
          Cuenta DEMO · <code>admin</code> / <code>Ics2026*</code> <span>autocompletar</span>
        </button>
      </main>

      <footer className="lg-foot">
        {BRAND.product} · v{BRAND.version}
      </footer>
    </div>
  );
}
