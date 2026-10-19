import { Check, GitBranch } from 'lucide-react';
import { WORKFLOWS } from '../workflow/definitions';
import { stateInfo } from '../workflow/engine';
import { fmtDateTime } from './ui';

/** Línea de etapas del flujo con el estado actual resaltado. */
export function WorkflowStepper({ module, estado }) {
  const wf = WORKFLOWS[module];
  if (!wf) return null;
  const idx = wf.flow.indexOf(estado);
  const offFlow = idx === -1;
  return (
    <div className="stepper" aria-label="Etapas del flujo">
      {wf.flow.map((s, i) => {
        const status = offFlow ? 'pending' : i < idx ? 'done' : i === idx ? 'current' : 'pending';
        return (
          <div key={s} className={`step ${status}`}>
            <span className="step-dot">{status === 'done' ? <Check size={13} /> : i + 1}</span>
            <span className="step-label">{wf.states[s].label}</span>
          </div>
        );
      })}
      {offFlow && (
        <div className={`step current branch tone-${stateInfo(module, estado).tone}`}>
          <span className="step-dot">
            <GitBranch size={13} />
          </span>
          <span className="step-label">{stateInfo(module, estado).label}</span>
        </div>
      )}
    </div>
  );
}

/** Bitácora de transiciones de un registro. */
export function WorkflowTimeline({ module, items }) {
  if (!items.length) return <p className="muted pad">Sin movimientos de flujo registrados.</p>;
  return (
    <ol className="timeline">
      {[...items]
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
        .map((h) => (
          <li key={h.id}>
            <span className={`tl-dot tone-${stateInfo(module, h.hacia).tone}`} aria-hidden />
            <div>
              <strong>{h.accion}</strong> → {stateInfo(module, h.hacia).label}
              <div className="muted small">
                {h.usuario} · {fmtDateTime(h.fecha)}
              </div>
              {h.comentario && <blockquote>{h.comentario}</blockquote>}
            </div>
          </li>
        ))}
    </ol>
  );
}
