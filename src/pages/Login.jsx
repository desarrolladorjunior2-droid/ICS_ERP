import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, User, KeyRound, ShieldCheck, Workflow, BarChart3 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Logo } from '../components/Logo';
import { BRAND } from '../config/brand';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');

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
    <div className="login">
      <div className="login-bg" aria-hidden>
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="grid-floor" />
      </div>

      <section className="login-hero">
        <Logo size={64} />
        <h1>
          La nube que convierte <span className="grad-text">datos en decisiones</span>.
        </h1>
        <p className="muted">
          ERP de {BRAND.company} · {BRAND.companyName}. Compras, firmas, actividades y terceros orquestados por flujos de trabajo.
        </p>
        <ul className="login-feats">
          <li>
            <Workflow size={16} /> Workflow con aprobaciones y trazabilidad
          </li>
          <li>
            <BarChart3 size={16} /> Dashboards e indicadores en tiempo real
          </li>
          <li>
            <ShieldCheck size={16} /> Roles y permisos CRUD por módulo
          </li>
        </ul>
      </section>

      <form className="login-card" onSubmit={submit}>
        <h2>Iniciar sesión</h2>
        <p className="muted small">Acceda con sus credenciales corporativas</p>
        <label className="input-icon">
          <User size={16} aria-hidden />
          <input placeholder="Usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" aria-label="Usuario" />
        </label>
        <label className="input-icon">
          <KeyRound size={16} aria-hidden />
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
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-block" type="submit">
          <LogIn size={16} /> <span>Ingresar</span>
        </button>
        <button type="button" className="demo-box" onClick={fillDemo}>
          <strong>Usuario DEMO (administrador)</strong>
          <span>
            usuario: <code>admin</code> · contraseña: <code>Ics2026*</code>
          </span>
          <small className="muted">Clic para autocompletar</small>
        </button>
        <p className="muted small center">
          {BRAND.product} v{BRAND.version}
        </p>
      </form>
    </div>
  );
}
