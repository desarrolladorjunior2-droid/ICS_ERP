import { ListChecks, CheckSquare, Timer, Check } from 'lucide-react';
import MasterDetailPage from '../../components/MasterDetailPage';
import { fmtDate, Progress, Tag } from '../../components/ui';
import { db } from '../../data/db';
import { avanceActividad, usuarioOptions } from '../../data/lookups';
import { isEditable } from '../../workflow/engine';

const prioTone = { Alta: 'critical', Media: 'info', Baja: 'neutral' };
const today = () => new Date().toISOString().slice(0, 10);

export const actividadesConfig = {
  module: 'actividades',
  table: 'actividades',
  title: 'Gestión de actividades',
  subtitle: 'Proyectos y tareas · Maestro (actividad) → Detalle (tareas, registro de tiempos)',
  entity: 'Actividad',
  newLabel: 'Nueva actividad',
  icon: ListChecks,
  searchText: (r) => `${r.codigo} ${r.titulo} ${r.responsable} ${r.area}`,
  recordTitle: (r) => r.titulo,
  defaults: () => ({ prioridad: 'Media', fecha_inicio: today() }),
  fields: [
    { key: 'titulo', label: 'Título', required: true, span: 2 },
    { key: 'area', label: 'Área', type: 'select', options: ['TI', 'Proyectos', 'Comercial', 'Administración'], required: true },
    { key: 'responsable', label: 'Responsable', type: 'select', options: usuarioOptions, required: true },
    { key: 'prioridad', label: 'Prioridad', type: 'select', options: ['Alta', 'Media', 'Baja'], required: true },
    { key: 'fecha_inicio', label: 'Inicio', type: 'date', required: true },
    { key: 'fecha_fin', label: 'Fin planeado', type: 'date', required: true },
    { key: 'descripcion', label: 'Descripción', type: 'textarea', span: 3 },
  ],
  columns: [
    { key: 'titulo', label: 'Actividad' },
    { key: 'responsable', label: 'Responsable' },
    { key: 'prioridad', label: 'Prioridad', render: (r) => <Tag tone={prioTone[r.prioridad]}>{r.prioridad}</Tag> },
    { key: 'fecha_fin', label: 'Fin', render: (r) => fmtDate(r.fecha_fin) },
    { key: 'avance', label: 'Avance', render: (r) => <Progress value={avanceActividad(r.id)} />, sortValue: (r) => avanceActividad(r.id) },
  ],
  kpis: (rows) => {
    const abiertas = rows.filter((r) => ['PLANEADA', 'EN_CURSO', 'EN_REVISION'].includes(r.estado));
    const prom = abiertas.length ? abiertas.reduce((s, r) => s + avanceActividad(r.id), 0) / abiertas.length : 0;
    const horas = db.list('actividades_tiempos').reduce((s, t) => s + (Number(t.horas) || 0), 0);
    return [
      { label: 'Abiertas', value: abiertas.length },
      { label: 'En curso', value: rows.filter((r) => r.estado === 'EN_CURSO').length },
      { label: 'Avance promedio', value: `${Math.round(prom)}%`, hint: 'actividades abiertas' },
      { label: 'Horas registradas', value: horas },
    ];
  },
  kanbanCard: (r) => (
    <>
      <strong>{r.titulo}</strong>
      <span className="muted small">{r.responsable} · {r.area}</span>
      <Progress value={avanceActividad(r.id)} />
    </>
  ),
  summary: (r, d) => {
    const t = d.actividades_tareas;
    return [
      { label: 'Tareas', value: t.length },
      { label: 'Completadas', value: t.filter((x) => x.completada).length },
      { label: 'Horas registradas', value: d.actividades_tiempos.reduce((s, x) => s + (Number(x.horas) || 0), 0) },
      { label: 'Avance', value: `${Math.round(avanceActividad(r.id))}%`, highlight: true },
    ];
  },
  details: [
    {
      table: 'actividades_tareas',
      fk: 'actividad_id',
      label: 'Tareas',
      icon: CheckSquare,
      defaults: () => ({ completada: false }),
      fields: [
        { key: 'titulo', label: 'Tarea', required: true, span: 3 },
        { key: 'responsable', label: 'Responsable', type: 'select', options: usuarioOptions, required: true },
        { key: 'fecha', label: 'Fecha compromiso', type: 'date', required: true },
        { key: 'horas_estimadas', label: 'Horas estimadas', type: 'number', min: 0 },
        { key: 'completada', label: 'Completada', type: 'checkbox' },
      ],
      columns: [
        { key: 'completada', label: '✓', render: (t) => (t.completada ? <Tag tone="good">Hecha</Tag> : <Tag>Pendiente</Tag>) },
        { key: 'titulo', label: 'Tarea' },
        { key: 'responsable', label: 'Responsable' },
        { key: 'fecha', label: 'Compromiso', render: (t) => fmtDate(t.fecha) },
        { key: 'horas_estimadas', label: 'Horas est.', align: 'right' },
      ],
      rowActions: [
        {
          label: 'Hecha',
          icon: Check,
          visible: (t, { rec, can }) => !t.completada && isEditable('actividades', rec) && can('actividades', 'editar'),
          run: (t, { toast }) => {
            db.update('actividades_tareas', t.id, { completada: true });
            toast('Tarea completada');
          },
        },
      ],
    },
    {
      table: 'actividades_tiempos',
      fk: 'actividad_id',
      label: 'Registro de tiempos',
      icon: Timer,
      defaults: () => ({ fecha: today() }),
      fields: [
        { key: 'fecha', label: 'Fecha', type: 'date', required: true },
        { key: 'usuario', label: 'Usuario', type: 'select', options: usuarioOptions, required: true },
        { key: 'horas', label: 'Horas', type: 'number', min: 0.5, step: 0.5, required: true },
        { key: 'nota', label: 'Nota', type: 'textarea', span: 3 },
      ],
      columns: [
        { key: 'fecha', label: 'Fecha', render: (t) => fmtDate(t.fecha) },
        { key: 'usuario', label: 'Usuario' },
        { key: 'horas', label: 'Horas', align: 'right' },
        { key: 'nota', label: 'Nota' },
      ],
      footer: (rows) => <strong>Total: {rows.reduce((s, x) => s + (Number(x.horas) || 0), 0)} h</strong>,
    },
  ],
};

export default function Actividades() {
  return <MasterDetailPage config={actividadesConfig} />;
}
