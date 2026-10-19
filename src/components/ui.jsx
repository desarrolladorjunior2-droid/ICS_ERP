import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { stateInfo } from '../workflow/engine';

export function Button({ variant = 'primary', icon: Icon, children, className = '', ...props }) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {Icon && <Icon size={16} aria-hidden />}
      {children && <span>{children}</span>}
    </button>
  );
}

export function IconButton({ icon: Icon, label, className = '', ...props }) {
  return (
    <button className={`icon-btn ${className}`} aria-label={label} title={label} {...props}>
      <Icon size={17} aria-hidden />
    </button>
  );
}

export function Card({ title, actions, children, className = '', subtitle }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p className="muted small">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatusBadge({ module, estado }) {
  const s = stateInfo(module, estado);
  return (
    <span className={`badge tone-${s.tone}`}>
      <i className="dot" aria-hidden />
      {s.label}
    </span>
  );
}

export function Tag({ children, tone = 'neutral' }) {
  return <span className={`badge tone-${tone}`}>{children}</span>;
}

export function Progress({ value }) {
  const v = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div className="progress" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-bar" style={{ width: `${v}%` }} />
      <span>{v}%</span>
    </div>
  );
}

export function Empty({ icon: Icon = Info, title, children }) {
  return (
    <div className="empty">
      <Icon size={28} aria-hidden />
      <strong>{title}</strong>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          className={`tab ${active === t.key ? 'active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.icon && <t.icon size={15} aria-hidden />}
          {t.label}
          {t.count != null && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ---------- Modal ----------
export function Modal({ title, onClose, children, footer, size = 'md' }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    ref.current?.querySelector('input, select, textarea, button')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <header className="modal-head">
          <h3>{title}</h3>
          <IconButton icon={X} label="Cerrar" onClick={onClose} />
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

// ---------- Campos de formulario dirigidos por configuración ----------
export function Field({ field, value, onChange, disabled, error }) {
  const common = {
    id: `f-${field.key}`,
    disabled: disabled || field.readOnly,
    required: field.required,
    value: value ?? '',
    onChange: (e) => onChange(field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value),
  };
  let input;
  switch (field.type) {
    case 'select': {
      const options = typeof field.options === 'function' ? field.options() : field.options;
      input = (
        <select {...common}>
          <option value="">Seleccione…</option>
          {options.map((o) => {
            const opt = typeof o === 'string' ? { value: o, label: o } : o;
            return (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            );
          })}
        </select>
      );
      break;
    }
    case 'textarea':
      input = <textarea rows={3} {...common} />;
      break;
    case 'checkbox':
      input = (
        <label className="switch">
          <input type="checkbox" checked={!!value} disabled={common.disabled} onChange={(e) => onChange(e.target.checked)} />
          <span className="switch-track" />
          <span>{field.checkLabel || (value ? 'Sí' : 'No')}</span>
        </label>
      );
      break;
    case 'multicheck': {
      const selected = Array.isArray(value) ? value : [];
      input = (
        <div className="multicheck">
          {field.options.map((o) => (
            <label key={o.value} className={`chip ${selected.includes(o.value) ? 'on' : ''}`}>
              <input
                type="checkbox"
                disabled={common.disabled}
                checked={selected.includes(o.value)}
                onChange={(e) => onChange(e.target.checked ? [...selected, o.value] : selected.filter((x) => x !== o.value))}
              />
              {o.label}
            </label>
          ))}
        </div>
      );
      break;
    }
    case 'date':
      input = <input type="date" {...common} value={value ? String(value).slice(0, 10) : ''} />;
      break;
    default:
      input = <input type={field.type || 'text'} step={field.step} min={field.min} {...common} />;
  }
  return (
    <div className={`field span-${field.span || 1} ${error ? 'has-error' : ''}`}>
      <label htmlFor={common.id}>
        {field.label}
        {field.required && <b className="req"> *</b>}
      </label>
      {input}
      {error && <small className="error">{error}</small>}
    </div>
  );
}

export function validate(fields, data) {
  const errors = {};
  fields.forEach((f) => {
    const v = data[f.key];
    if (f.required && (v === '' || v == null)) errors[f.key] = 'Campo obligatorio';
    else if (f.type === 'number' && v !== '' && v != null && f.min != null && v < f.min) errors[f.key] = `Mínimo ${f.min}`;
    else if (f.type === 'email' && v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) errors[f.key] = 'Correo inválido';
  });
  return errors;
}

/** Formulario modal genérico para crear/editar (CRUD). */
export function FormModal({ title, fields, initial, onSubmit, onClose, submitLabel = 'Guardar' }) {
  const [data, setData] = useState(() => ({ ...Object.fromEntries(fields.map((f) => [f.key, f.default ?? ''])), ...initial }));
  const [errors, setErrors] = useState({});
  const submit = (e) => {
    e.preventDefault();
    const errs = validate(fields, data);
    setErrors(errs);
    if (!Object.keys(errs).length) onSubmit(data);
  };
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button type="submit" form="crud-form">
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id="crud-form" className="form-grid" onSubmit={submit} noValidate>
        {fields.map((f) => (
          <Field key={f.key} field={f} value={data[f.key]} error={errors[f.key]} onChange={(v) => setData((d) => ({ ...d, [f.key]: v }))} />
        ))}
      </form>
    </Modal>
  );
}

// ---------- Diálogos y notificaciones ----------
const UiContext = createContext(null);

export function UiProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);

  const toast = useCallback((message, tone = 'good') => {
    const tid = Math.random();
    setToasts((t) => [...t, { id: tid, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== tid)), 3800);
  }, []);

  /** Abre un diálogo; `render(resolve)` devuelve el JSX. Retorna una promesa. */
  const openDialog = useCallback(
    (render) =>
      new Promise((resolve) => {
        const done = (v) => {
          setDialog(null);
          resolve(v);
        };
        setDialog(() => render(done));
      }),
    [],
  );

  const confirm = useCallback(
    (message, { title = 'Confirmar', danger = false, withComment = false } = {}) =>
      openDialog((done) => <ConfirmDialog {...{ title, message, danger, withComment, done }} />),
    [openDialog],
  );

  const icons = { good: CheckCircle2, critical: AlertTriangle, info: Info };
  return (
    <UiContext.Provider value={{ toast, confirm, openDialog }}>
      {children}
      {dialog}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => {
          const I = icons[t.tone] || Info;
          return (
            <div key={t.id} className={`toast tone-${t.tone}`}>
              <I size={16} aria-hidden /> {t.message}
            </div>
          );
        })}
      </div>
    </UiContext.Provider>
  );
}

function ConfirmDialog({ title, message, danger, withComment, done }) {
  const [comment, setComment] = useState('');
  return (
    <Modal
      title={title}
      size="sm"
      onClose={() => done(false)}
      footer={
        <>
          <Button variant="ghost" onClick={() => done(false)}>
            Cancelar
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            disabled={withComment && !comment.trim()}
            onClick={() => done(withComment ? { comment } : true)}
          >
            Confirmar
          </Button>
        </>
      }
    >
      <p>{message}</p>
      {withComment && (
        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="wf-comment">
            Comentario <b className="req">*</b>
          </label>
          <textarea id="wf-comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
      )}
    </Modal>
  );
}

export const useUi = () => useContext(UiContext);

// ---------- Formato ----------
export const fmtMoney = (n, currency = 'COP') =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n || 0);
export const fmtCompact = (n) => new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(n || 0);
// Fechas "AAAA-MM-DD" se interpretan como fecha local (no medianoche UTC).
export const toDate = (d) => new Date(typeof d === 'string' && d.length === 10 ? `${d}T12:00:00` : d);
export const fmtDate = (d) => (d ? toDate(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
