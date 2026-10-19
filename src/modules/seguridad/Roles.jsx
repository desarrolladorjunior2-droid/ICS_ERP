import { useState } from 'react';
import { ShieldCheck, Plus, Trash2, Save, Lock } from 'lucide-react';
import { db, useDb } from '../../data/db';
import { useAuth } from '../../auth/AuthContext';
import { ACTIONS, MODULES, emptyPermissions } from '../../config/modules';
import { Button, Card, FormModal, IconButton, Tag, useUi } from '../../components/ui';

export default function Roles() {
  const { can } = useAuth();
  const { toast, confirm } = useUi();
  const roles = useDb((d) => d.list('roles'));
  const usuarios = useDb((d) => d.list('usuarios'));
  const [selId, setSelId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [creating, setCreating] = useState(false);

  const sel = roles.find((r) => r.id === selId) || roles[0];
  const perms = draft?.id === sel?.id ? draft.permisos : sel?.permisos;
  const dirty = draft && draft.id === sel?.id;
  const locked = sel?.sistema || !can('roles', 'editar');

  const toggle = (mod, act) => {
    const base = structuredClone(perms);
    base[mod][act] = !base[mod][act];
    if (act !== 'ver' && base[mod][act]) base[mod].ver = true; // cualquier acción implica lectura
    if (act === 'ver' && !base[mod].ver) ACTIONS.forEach((a) => (base[mod][a.key] = false));
    setDraft({ id: sel.id, permisos: base });
  };
  const toggleRow = (mod) => {
    const base = structuredClone(perms);
    const all = ACTIONS.every((a) => base[mod][a.key]);
    ACTIONS.forEach((a) => (base[mod][a.key] = !all));
    setDraft({ id: sel.id, permisos: base });
  };

  const save = () => {
    db.update('roles', sel.id, { permisos: draft.permisos });
    setDraft(null);
    toast(`Permisos de "${sel.nombre}" guardados`);
  };

  const create = (data) => {
    const r = db.insert('roles', { ...data, permisos: emptyPermissions() });
    setCreating(false);
    setSelId(r.id);
    toast('Rol creado');
  };

  const remove = async () => {
    const uses = usuarios.filter((u) => u.rol_id === sel.id).length;
    if (uses) return toast(`El rol tiene ${uses} usuario(s) asignado(s).`, 'critical');
    if (await confirm(`¿Eliminar el rol "${sel.nombre}"?`, { title: 'Eliminar rol', danger: true })) {
      db.remove('roles', sel.id);
      setSelId(null);
      toast('Rol eliminado');
    }
  };

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-title">
          <span className="page-icon">
            <ShieldCheck size={22} />
          </span>
          <div>
            <h1>Roles y permisos</h1>
            <p className="muted">Matriz CRUD por módulo: Crear · Leer · Actualizar · Eliminar + Aprobar</p>
          </div>
        </div>
        <div className="page-actions">
          {can('roles', 'crear') && (
            <Button icon={Plus} onClick={() => setCreating(true)}>
              Nuevo rol
            </Button>
          )}
        </div>
      </header>

      <div className="roles-layout">
        <Card title="Roles" className="roles-list">
          <ul>
            {roles.map((r) => (
              <li key={r.id}>
                <button className={r.id === sel?.id ? 'active' : ''} onClick={() => { setSelId(r.id); setDraft(null); }}>
                  <strong>{r.nombre}</strong>
                  <span className="muted small">{r.descripcion}</span>
                  <span className="small">
                    {usuarios.filter((u) => u.rol_id === r.id).length} usuarios {r.sistema && <Tag tone="accent">Sistema</Tag>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {sel && (
          <Card
            title={`Permisos · ${sel.nombre}`}
            subtitle={locked ? 'Rol de sistema: acceso total, no editable' : 'Haga clic en una celda para conceder o retirar el permiso'}
            actions={
              <>
                {dirty && (
                  <Button icon={Save} onClick={save}>
                    Guardar cambios
                  </Button>
                )}
                {!sel.sistema && can('roles', 'eliminar') && <IconButton icon={Trash2} label="Eliminar rol" className="danger" onClick={remove} />}
              </>
            }
          >
            <div className="table-wrap">
              <table className="table perm-matrix">
                <thead>
                  <tr>
                    <th>Módulo</th>
                    {ACTIONS.map((a) => (
                      <th key={a.key} className="center">
                        {a.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((m) => (
                    <tr key={m.key}>
                      <td>
                        <button className="perm-mod" disabled={locked} onClick={() => toggleRow(m.key)} title="Alternar todo el módulo">
                          <m.icon size={15} aria-hidden /> {m.label}
                        </button>
                      </td>
                      {ACTIONS.map((a) => {
                        const on = !!perms?.[m.key]?.[a.key];
                        return (
                          <td key={a.key} className="center">
                            <button
                              className={`perm-cell ${on ? 'on' : ''}`}
                              disabled={locked}
                              onClick={() => toggle(m.key, a.key)}
                              aria-pressed={on}
                              aria-label={`${a.label} en ${m.label}`}
                            >
                              {locked ? <Lock size={12} /> : on ? '✓' : ''}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {creating && (
        <FormModal
          title="Nuevo rol"
          fields={[
            { key: 'nombre', label: 'Nombre del rol', required: true, span: 3 },
            { key: 'descripcion', label: 'Descripción', type: 'textarea', span: 3 },
          ]}
          onSubmit={create}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}
