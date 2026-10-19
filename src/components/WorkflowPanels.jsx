import { useNavigate } from 'react-router-dom';
import { ArrowRight, Inbox } from 'lucide-react';
import { useDb } from '../data/db';
import { terceroName } from '../data/lookups';
import { useAuth } from '../auth/AuthContext';
import { MODULES } from '../config/modules';
import { WORKFLOWS } from '../workflow/definitions';
import { pendingFor, runTransition, stateInfo } from '../workflow/engine';
import DataTable from './DataTable';
import { Button, Card, Empty, StatusBadge, fmtDateTime, useUi } from './ui';

// Piezas de la metodología Workflow que viven DENTRO de cada módulo
// (el workflow no es un módulo: es la forma de trabajar de todos).

const recordLabel = (r) => r.titulo || r.razon_social || (r.proveedor_id ? `Orden · ${terceroName(r.proveedor_id)}` : r.codigo);

/** Registros que esperan una acción de aprobación del usuario. `module` filtra a un solo módulo. */
export function PendingList({ module, limit }) {
  const { can, user } = useAuth();
  const { confirm, toast } = useUi();
  const navigate = useNavigate();
  const pending = useDb(() => pendingFor(can), [can]);
  const filtered = module ? pending.filter((p) => p.module === module) : pending;
  const list = limit ? filtered.slice(0, limit) : filtered;

  const act = async (p, t) => {
    const ok = await confirm(`¿${t.label} ${p.record.codigo}?`, { title: 'Workflow', danger: t.danger, withComment: t.comment });
    if (!ok) return;
    const res = runTransition(p.module, p.table, p.record, t, user, ok.comment);
    toast(res.ok ? `${p.record.codigo}: ${stateInfo(p.module, t.to).label}` : res.error, res.ok ? 'good' : 'critical');
  };

  if (!list.length) return <Empty icon={Inbox} title="Bandeja al día">No hay registros esperando su aprobación.</Empty>;
  return (
    <ul className="inbox">
      {list.map((p) => {
        const mod = MODULES.find((m) => m.key === p.module);
        return (
          <li key={p.record.id}>
            <span className="inbox-icon">
              <mod.icon size={16} aria-hidden />
            </span>
            <button className="inbox-main" onClick={() => navigate(`${mod.path}?id=${p.record.id}`)}>
              <span className="code">{p.record.codigo}</span>
              <strong>{recordLabel(p.record)}</strong>
              {!module && <span className="muted small">{mod.label}</span>}
            </button>
            <StatusBadge module={p.module} estado={p.record.estado} />
            <div className="inbox-actions">
              {p.transitions.map((t) => (
                <Button key={t.label} variant={t.danger ? 'danger-ghost' : 'primary'} className="sm" onClick={() => act(p, t)}>
                  {t.label}
                </Button>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Mapa del proceso del módulo: etapas, transiciones y permiso requerido. */
export function ProcessMap({ module }) {
  const wf = WORKFLOWS[module];
  const history = useDb((d) => d.list('workflow_historial', (h) => h.modulo === module), [module]);
  return (
    <div className="process">
      <Card title="Etapas del flujo" subtitle="Camino principal del proceso">
        <div className="process-flow">
          {wf.flow.map((s, i) => (
            <span key={s} className="process-node">
              <span className={`badge tone-${wf.states[s].tone}`}>
                <i className="dot" aria-hidden />
                {wf.states[s].label}
              </span>
              {i < wf.flow.length - 1 && <ArrowRight size={14} className="muted" aria-hidden />}
            </span>
          ))}
        </div>
      </Card>
      <Card title="Transiciones" subtitle="Acciones disponibles y permiso que las habilita" className="flush">
        <div className="table-wrap">
          <table className="table dense">
            <thead>
              <tr>
                <th>Acción</th>
                <th>Desde</th>
                <th>Hacia</th>
                <th>Requiere</th>
              </tr>
            </thead>
            <tbody>
              {wf.transitions.map((t) => (
                <tr key={t.label + t.to}>
                  <td>{t.label}</td>
                  <td>{t.from.map((f) => wf.states[f].label).join(', ')}</td>
                  <td>
                    <StatusBadge module={module} estado={t.to} />
                  </td>
                  <td className="muted">
                    permiso «{t.perm}»{t.comment ? ' · comentario obligatorio' : ''}
                    {t.guard ? ' · con validación' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Bitácora del módulo" subtitle="Últimos 30 movimientos" className="flush">
        <DataTable
          dense
          columns={[
            { key: 'fecha', label: 'Fecha', render: (h) => fmtDateTime(h.fecha) },
            { key: 'registro_codigo', label: 'Registro', render: (h) => <span className="code">{h.registro_codigo}</span> },
            { key: 'accion', label: 'Acción' },
            { key: 'hacia', label: 'Nuevo estado', render: (h) => <StatusBadge module={module} estado={h.hacia} /> },
            { key: 'usuario', label: 'Usuario' },
            { key: 'comentario', label: 'Comentario' },
          ]}
          rows={[...history].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 30)}
        />
      </Card>
    </div>
  );
}
