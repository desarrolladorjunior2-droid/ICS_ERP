import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Building2, Check, ChevronDown, Settings2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useUi } from './ui';

export const iniciales = (nombre = '') =>
  nombre
    .replace(/S\.A\.S\.|S\.A\.|Ltda\.?/gi, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

/** Fichita de color con las iniciales de la empresa. */
export function EmpresaChip({ empresa, size = 28 }) {
  return (
    <span className="empresa-chip" style={{ '--c': empresa.color, width: size, height: size, fontSize: size * 0.4 }} aria-hidden>
      {iniciales(empresa.alias || empresa.nombre)}
    </span>
  );
}

/** Selector de la empresa activa. Con una sola empresa se muestra como etiqueta fija. */
export default function EmpresaSwitcher() {
  const { empresa, empresas, cambiarEmpresa, can } = useAuth();
  const { toast } = useUi();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!empresa) return null;
  const multiple = empresas.length > 1;

  const elegir = (e) => {
    setOpen(false);
    if (cambiarEmpresa(e.id)) {
      // Un registro abierto pertenece a la empresa anterior: se vuelve a la lista del módulo.
      navigate({ pathname, search: '' }, { replace: true });
      toast(`Trabajando en ${e.alias || e.nombre}`, 'info');
    }
  };

  return (
    <div className="empresa-switch" ref={ref}>
      <button
        className={`empresa-btn ${multiple ? '' : 'static'}`}
        onClick={() => multiple && setOpen((o) => !o)}
        aria-haspopup={multiple ? 'listbox' : undefined}
        aria-expanded={multiple ? open : undefined}
        aria-label={`Empresa activa: ${empresa.nombre}`}
        title={empresa.nombre}
      >
        <EmpresaChip empresa={empresa} />
        <span className="empresa-name">{empresa.alias || empresa.nombre}</span>
        {multiple && <ChevronDown size={15} aria-hidden />}
      </button>
      {open && (
        <div className="empresa-menu" role="listbox" aria-label="Seleccionar empresa">
          <p className="empresa-menu-title">
            <Building2 size={13} aria-hidden /> Cambiar de empresa
          </p>
          {empresas.map((e) => (
            <button key={e.id} role="option" aria-selected={e.id === empresa.id} className={e.id === empresa.id ? 'active' : ''} onClick={() => elegir(e)}>
              <EmpresaChip empresa={e} size={34} />
              <span className="empresa-info">
                <strong>{e.alias || e.nombre}</strong>
                <small>
                  {e.nombre} · NIT {e.nit}
                </small>
              </span>
              {e.id === empresa.id && <Check size={16} aria-hidden />}
            </button>
          ))}
          {can('empresas', 'ver') && (
            <button className="empresa-admin" onClick={() => { setOpen(false); navigate('/empresas'); }}>
              <Settings2 size={15} aria-hidden /> Administrar empresas
            </button>
          )}
        </div>
      )}
    </div>
  );
}
