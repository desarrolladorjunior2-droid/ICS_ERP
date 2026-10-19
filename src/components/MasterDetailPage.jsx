import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Search, LayoutList, Columns3, History, Lock, Workflow } from 'lucide-react';
import { db, useDb } from '../data/db';
import { useAuth } from '../auth/AuthContext';
import { WORKFLOWS } from '../workflow/definitions';
import { availableTransitions, findTransition, isEditable, pendingFor, runTransition } from '../workflow/engine';
import DataTable from './DataTable';
import { WorkflowStepper, WorkflowTimeline } from './WorkflowBar';
import { PendingList, ProcessMap } from './WorkflowPanels';
import { Button, Card, Empty, FormModal, IconButton, StatusBadge, Tabs, fmtDate, useUi } from './ui';

/**
 * Página genérica Maestro → Detalle dirigida por configuración.
 * Ver src/modules/compras/Compras.jsx como ejemplo completo de `config`.
 */
export default function MasterDetailPage({ config }) {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('id');
  const open = (id) => setParams(id ? { id } : {});
  return selectedId ? (
    <RecordView config={config} id={selectedId} onBack={() => open(null)} />
  ) : (
    <ListView config={config} onOpen={open} />
  );
}

// ======================= LISTA / KANBAN =======================
function ListView({ config, onOpen }) {
  const { can, user } = useAuth();
  const { toast, confirm } = useUi();
  const rows = useDb((d) => d.list(config.table), [config.table]);
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [view, setView] = useState('tabla');
  const [creating, setCreating] = useState(false);
  const wf = WORKFLOWS[config.module];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!estado || r.estado === estado) &&
        (!term || config.searchText(r).toLowerCase().includes(term)),
    );
  }, [rows, q, estado, config]);

  const create = (data) => {
    const rec = db.insert(config.table, { ...data, estado: wf.initial });
    db.insert('workflow_historial', {
      modulo: config.module, registro_id: rec.id, registro_codigo: rec.codigo, desde: '', hacia: wf.initial,
      accion: 'Creación', usuario: user.nombre, usuario_id: user.id, comentario: '', fecha: new Date().toISOString(),
    });
    setCreating(false);
    toast(`${rec.codigo} registrado`);
    onOpen(rec.id);
  };

  const onDrop = async (rec, to) => {
    if (rec.estado === to) return;
    const t = findTransition(config.module, rec.estado, to, can);
    if (!t) return toast('Transición no permitida por el flujo o por sus permisos.', 'critical');
    const ok = await confirm(`${t.label}: ${rec.codigo} → ${wf.states[to].label}`, { title: 'Workflow', danger: t.danger, withComment: t.comment });
    if (!ok) return;
    const res = runTransition(config.module, config.table, rec, t, user, ok.comment);
    toast(res.ok ? `${rec.codigo}: ${wf.states[to].label}` : res.error, res.ok ? 'good' : 'critical');
  };

  const kpis = config.kpis ? config.kpis(rows) : [];
  const pendingCount = useDb(() => pendingFor(can).filter((p) => p.module === config.module).length, [can, config.module]);

  return (
    <div className="page">
      <PageHeader config={config}>
        {can(config.module, 'crear') && (
          <Button icon={Plus} onClick={() => setCreating(true)}>
            {config.newLabel}
          </Button>
        )}
      </PageHeader>

      {kpis.length > 0 && (
        <div className="kpi-row">
          {kpis.map((k) => (
            <div className="kpi" key={k.label}>
              <span className="kpi-label">{k.label}</span>
              <strong className="kpi-value">{k.value}</strong>
              {k.hint && <span className="kpi-hint">{k.hint}</span>}
            </div>
          ))}
        </div>
      )}

      {pendingCount > 0 && (
        <Card title="Por aprobar" subtitle={`${pendingCount} registro(s) esperan una acción de su rol`} className="pending-card">
          <PendingList module={config.module} limit={4} />
        </Card>
      )}

      <div className="toolbar">
        <div className="search">
          <Search size={16} aria-hidden />
          <input placeholder={`Buscar ${config.title.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        </div>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {Object.entries(wf.states).map(([k, s]) => (
            <option key={k} value={k}>
              {s.label}
            </option>
          ))}
        </select>
        <div className="seg" role="group" aria-label="Vista">
          <button className={view === 'tabla' ? 'active' : ''} onClick={() => setView('tabla')} title="Vista tabla">
            <LayoutList size={16} /> Tabla
          </button>
          <button className={view === 'kanban' ? 'active' : ''} onClick={() => setView('kanban')} title="Tablero de flujo">
            <Columns3 size={16} /> Flujo
          </button>
          <button className={view === 'proceso' ? 'active' : ''} onClick={() => setView('proceso')} title="Mapa del proceso y bitácora">
            <Workflow size={16} /> Proceso
          </button>
        </div>
        <span className="muted small">{filtered.length} registros</span>
      </div>

      {view === 'proceso' ? (
        <ProcessMap module={config.module} />
      ) : view === 'tabla' ? (
        <Card className="flush">
          <DataTable
            columns={[{ key: 'codigo', label: 'Código', render: (r) => <span className="code">{r.codigo}</span> }, ...config.columns, {
              key: 'estado', label: 'Estado', render: (r) => <StatusBadge module={config.module} estado={r.estado} />,
            }]}
            rows={filtered}
            onRowClick={(r) => onOpen(r.id)}
          />
        </Card>
      ) : (
        <Kanban config={config} rows={filtered} onOpen={onOpen} onDrop={onDrop} />
      )}

      {creating && (
        <FormModal
          title={config.newLabel}
          fields={config.fields}
          initial={config.defaults?.() || {}}
          onSubmit={create}
          onClose={() => setCreating(false)}
          submitLabel="Crear"
        />
      )}
    </div>
  );
}

function Kanban({ config, rows, onOpen, onDrop }) {
  const wf = WORKFLOWS[config.module];
  const [over, setOver] = useState(null);
  return (
    <div className="kanban">
      {Object.entries(wf.states).map(([key, s]) => {
        const items = rows.filter((r) => r.estado === key);
        return (
          <div
            key={key}
            className={`kanban-col ${over === key ? 'over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(key);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              setOver(null);
              const rec = rows.find((r) => r.id === e.dataTransfer.getData('text/plain'));
              if (rec) onDrop(rec, key);
            }}
          >
            <header>
              <span className={`badge tone-${s.tone}`}>
                <i className="dot" aria-hidden /> {s.label}
              </span>
              <span className="muted small">{items.length}</span>
            </header>
            <div className="kanban-list">
              {items.map((r) => (
                <article
                  key={r.id}
                  className="kanban-card"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', r.id)}
                  onClick={() => onOpen(r.id)}
                >
                  <span className="code">{r.codigo}</span>
                  {config.kanbanCard(r)}
                </article>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PageHeader({ config, children }) {
  const Icon = config.icon;
  return (
    <header className="page-head">
      <div className="page-title">
        <span className="page-icon">
          <Icon size={22} aria-hidden />
        </span>
        <div>
          <h1>{config.title}</h1>
          <p className="muted">{config.subtitle}</p>
        </div>
      </div>
      <div className="page-actions">{children}</div>
    </header>
  );
}

// ======================= FICHA MAESTRO + DETALLES =======================
function RecordView({ config, id, onBack }) {
  const { can, user } = useAuth();
  const { toast, confirm, openDialog } = useUi();
  const rec = useDb((d) => d.get(config.table, id), [config.table, id]);
  const detailRows = useDb(
    (d) => Object.fromEntries(config.details.map((dt) => [dt.table, d.details(config.table, id, dt.table)])),
    [config, id],
  );
  const history = useDb((d) => d.list('workflow_historial', (h) => h.registro_id === id), [id]);
  const [tab, setTab] = useState(config.details[0]?.table || 'historial');
  const [editing, setEditing] = useState(false);
  const [detailForm, setDetailForm] = useState(null); // { detail, row }

  if (!rec) {
    return (
      <div className="page">
        <Empty title="Registro no encontrado">
          <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
            Volver
          </Button>
        </Empty>
      </div>
    );
  }

  const editable = isEditable(config.module, rec);
  const canEdit = can(config.module, 'editar') && editable;
  const transitions = availableTransitions(config.module, rec, can);
  const ctx = { rec, user, can, toast, confirm, openDialog, details: detailRows };

  const saveMaster = (data) => {
    db.update(config.table, rec.id, data);
    setEditing(false);
    toast('Cambios guardados');
  };

  const removeMaster = async () => {
    if (await confirm(`¿Eliminar ${rec.codigo} y todos sus detalles? Esta acción no se puede deshacer.`, { title: 'Eliminar', danger: true })) {
      db.remove(config.table, rec.id);
      toast(`${rec.codigo} eliminado`);
      onBack();
    }
  };

  const doTransition = async (t) => {
    const ok = await confirm(`¿${t.label} ${rec.codigo}?`, { title: 'Workflow', danger: t.danger, withComment: t.comment });
    if (!ok) return;
    const res = runTransition(config.module, config.table, rec, t, user, ok.comment);
    toast(res.ok ? `${rec.codigo}: ${WORKFLOWS[config.module].states[t.to].label}` : res.error, res.ok ? 'good' : 'critical');
  };

  const saveDetail = (detail, row, data) => {
    if (row) db.update(detail.table, row.id, data);
    else db.insert(detail.table, { ...data, [detail.fk]: rec.id });
    setDetailForm(null);
    toast(row ? 'Detalle actualizado' : 'Detalle agregado');
  };

  const removeDetail = async (detail, row) => {
    if (await confirm('¿Eliminar este registro de detalle?', { title: 'Eliminar detalle', danger: true })) {
      db.remove(detail.table, row.id);
      toast('Detalle eliminado');
    }
  };

  const summary = config.summary ? config.summary(rec, detailRows) : [];
  const tabs = [
    ...config.details.map((d) => ({ key: d.table, label: d.label, icon: d.icon, count: detailRows[d.table].length })),
    { key: 'historial', label: 'Historial', icon: History, count: history.length },
  ];
  const activeDetail = config.details.find((d) => d.table === tab);

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-title">
          <IconButton icon={ArrowLeft} label="Volver" onClick={onBack} className="back" />
          <div>
            <p className="muted small">
              {config.title} / <span className="code">{rec.codigo}</span>
            </p>
            <h1>{config.recordTitle(rec)}</h1>
          </div>
          <StatusBadge module={config.module} estado={rec.estado} />
        </div>
        <div className="page-actions">
          {transitions.map((t) => (
            <Button key={t.to + t.label} variant={t.danger ? 'danger-ghost' : 'primary'} onClick={() => doTransition(t)}>
              {t.label}
            </Button>
          ))}
          {canEdit && <IconButton icon={Pencil} label="Editar maestro" onClick={() => setEditing(true)} />}
          {can(config.module, 'eliminar') && <IconButton icon={Trash2} label="Eliminar" onClick={removeMaster} className="danger" />}
        </div>
      </header>

      <Card className="wf-card">
        <WorkflowStepper module={config.module} estado={rec.estado} />
        {!editable && (
          <p className="lock-note">
            <Lock size={13} aria-hidden /> Registro bloqueado para edición en el estado actual del flujo.
          </p>
        )}
      </Card>

      <div className="record-grid">
        <Card title="Maestro" subtitle={config.entity}>
          <dl className="dl-grid">
            {config.fields.map((f) => (
              <div key={f.key} className={`span-${f.span || 1}`}>
                <dt>{f.label}</dt>
                <dd>{displayValue(f, rec)}</dd>
              </div>
            ))}
          </dl>
        </Card>
        {summary.length > 0 && (
          <div className="summary-col">
            {summary.map((s) => (
              <div key={s.label} className={`kpi ${s.highlight ? 'kpi-hl' : ''}`}>
                <span className="kpi-label">{s.label}</span>
                <strong className="kpi-value">{s.value}</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      <Card className="flush">
        <div className="detail-head">
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
          {activeDetail && canDetail(activeDetail, rec, editable, can, config.module) && (
            <Button variant="ghost" icon={Plus} onClick={() => setDetailForm({ detail: activeDetail, row: null })}>
              Agregar
            </Button>
          )}
        </div>
        {activeDetail ? (
          <>
            <DataTable
              dense
              columns={activeDetail.columns}
              rows={detailRows[activeDetail.table]}
              empty={`Sin ${activeDetail.label.toLowerCase()}`}
              actions={(row) => (
                <>
                  {activeDetail.rowActions
                    ?.filter((a) => a.visible(row, ctx))
                    .map((a) => (
                      <Button key={a.label} variant="ghost" icon={a.icon} onClick={() => a.run(row, ctx)} className="sm">
                        {a.label}
                      </Button>
                    ))}
                  {canDetail(activeDetail, rec, editable, can, config.module) && (
                    <>
                      <IconButton icon={Pencil} label="Editar" onClick={() => setDetailForm({ detail: activeDetail, row })} />
                      <IconButton icon={Trash2} label="Eliminar" className="danger" onClick={() => removeDetail(activeDetail, row)} />
                    </>
                  )}
                </>
              )}
            />
            {activeDetail.footer && <div className="detail-foot">{activeDetail.footer(detailRows[activeDetail.table])}</div>}
          </>
        ) : (
          <WorkflowTimeline module={config.module} items={history} />
        )}
      </Card>

      {editing && (
        <FormModal title={`Editar ${rec.codigo}`} fields={config.fields} initial={rec} onSubmit={saveMaster} onClose={() => setEditing(false)} />
      )}
      {detailForm && (
        <FormModal
          title={`${detailForm.row ? 'Editar' : 'Agregar'} · ${detailForm.detail.label}`}
          fields={detailForm.detail.fields}
          initial={detailForm.row || detailForm.detail.defaults?.(detailRows[detailForm.detail.table]) || {}}
          onSubmit={(data) => saveDetail(detailForm.detail, detailForm.row, data)}
          onClose={() => setDetailForm(null)}
        />
      )}
    </div>
  );
}

function canDetail(detail, rec, editable, can, module) {
  if (detail.alwaysEditable) return can(module, 'editar');
  return editable && can(module, 'editar');
}

function displayValue(field, rec) {
  if (field.display) return field.display(rec);
  const v = rec[field.key];
  if (v === '' || v == null) return '—';
  if (field.type === 'select') {
    const opts = typeof field.options === 'function' ? field.options() : field.options;
    const o = opts.find((x) => (typeof x === 'string' ? x : x.value) === v);
    return typeof o === 'object' ? o.label : v;
  }
  if (field.type === 'date') return fmtDate(v);
  return String(v);
}
