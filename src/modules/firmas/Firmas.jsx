import { PenTool, UserCheck, Paperclip, XCircle } from 'lucide-react';
import MasterDetailPage from '../../components/MasterDetailPage';
import SignaturePad from '../../components/SignaturePad';
import { fmtDate, Tag } from '../../components/ui';
import { db } from '../../data/db';
import { terceroName, terceroOptions } from '../../data/lookups';
import { WORKFLOWS } from '../../workflow/definitions';
import { runTransition } from '../../workflow/engine';

const signerTone = { PENDIENTE: 'neutral', FIRMADO: 'good', RECHAZADO: 'critical' };
const firmantes = (docId) => db.details('firmas', docId, 'firmas_firmantes');

/** Firma secuencial: solo puede firmar el siguiente firmante pendiente según su orden. */
const nextSigner = (docId) =>
  firmantes(docId)
    .filter((f) => f.estado === 'PENDIENTE')
    .sort((a, b) => a.orden - b.orden)[0];

const canSign = (row, { rec, can }) =>
  rec.estado === 'EN_FIRMA' && can('firmas', 'aprobar') && nextSigner(rec.id)?.id === row.id;

export const firmasConfig = {
  module: 'firmas',
  table: 'firmas',
  title: 'Firmas',
  subtitle: 'Firma electrónica de documentos · Maestro (documento) → Detalle (firmantes, adjuntos)',
  entity: 'Documento',
  newLabel: 'Nuevo documento',
  icon: PenTool,
  searchText: (r) => `${r.codigo} ${r.titulo} ${r.tipo} ${terceroName(r.tercero_id)}`,
  recordTitle: (r) => r.titulo,
  fields: [
    { key: 'titulo', label: 'Título del documento', required: true, span: 2 },
    { key: 'tipo', label: 'Tipo', type: 'select', options: ['Contrato', 'Acuerdo', 'Acta', 'Política', 'Orden'], required: true },
    { key: 'tercero_id', label: 'Tercero', type: 'select', options: terceroOptions(), display: (r) => terceroName(r.tercero_id), span: 2 },
    { key: 'fecha_limite', label: 'Fecha límite', type: 'date', required: true },
    { key: 'descripcion', label: 'Descripción', type: 'textarea', span: 3 },
  ],
  columns: [
    { key: 'titulo', label: 'Documento' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'tercero_id', label: 'Tercero', render: (r) => terceroName(r.tercero_id) },
    { key: 'firmantes', label: 'Firmas', render: (r) => { const f = firmantes(r.id); return `${f.filter((x) => x.estado === 'FIRMADO').length}/${f.length}`; } },
    { key: 'fecha_limite', label: 'Fecha límite', render: (r) => fmtDate(r.fecha_limite) },
  ],
  kpis: (rows) => [
    { label: 'Documentos', value: rows.length },
    { label: 'En firma', value: rows.filter((r) => r.estado === 'EN_FIRMA').length, hint: 'esperando firmantes' },
    { label: 'Firmados', value: rows.filter((r) => r.estado === 'FIRMADO').length },
    { label: 'Rechazados', value: rows.filter((r) => r.estado === 'RECHAZADO').length },
  ],
  kanbanCard: (r) => {
    const f = firmantes(r.id);
    return (
      <>
        <strong>{r.titulo}</strong>
        <span className="muted small">{r.tipo} · vence {fmtDate(r.fecha_limite)}</span>
        <span className="kc-amount">{f.filter((x) => x.estado === 'FIRMADO').length}/{f.length} firmas</span>
      </>
    );
  },
  summary: (r, d) => {
    const f = d.firmas_firmantes;
    const ok = f.filter((x) => x.estado === 'FIRMADO').length;
    return [
      { label: 'Firmantes', value: f.length },
      { label: 'Firmados', value: ok },
      { label: 'Pendientes', value: f.length - ok },
      { label: 'Avance', value: `${f.length ? Math.round((ok / f.length) * 100) : 0}%`, highlight: true },
    ];
  },
  details: [
    {
      table: 'firmas_firmantes',
      fk: 'documento_id',
      label: 'Firmantes',
      icon: UserCheck,
      defaults: (rows) => ({ orden: rows.length + 1, estado: 'PENDIENTE' }),
      fields: [
        { key: 'orden', label: 'Orden', type: 'number', min: 1, required: true },
        { key: 'nombre', label: 'Nombre', required: true, span: 2 },
        { key: 'cargo', label: 'Cargo', required: true },
        { key: 'email', label: 'Correo', type: 'email', required: true, span: 2 },
      ],
      columns: [
        { key: 'orden', label: '#', align: 'right' },
        { key: 'nombre', label: 'Firmante' },
        { key: 'cargo', label: 'Cargo' },
        { key: 'estado', label: 'Estado', render: (f) => <Tag tone={signerTone[f.estado]}>{f.estado}</Tag> },
        { key: 'fecha_firma', label: 'Fecha firma', render: (f) => fmtDate(f.fecha_firma) },
        { key: 'firma', label: 'Firma', render: (f) => (f.firma ? <img className="sig-thumb" src={f.firma} alt={`Firma de ${f.nombre}`} /> : f.estado === 'FIRMADO' ? '✓ digital' : '—') },
      ],
      rowActions: [
        {
          label: 'Firmar',
          icon: PenTool,
          visible: canSign,
          run: async (row, { rec, user, openDialog, toast }) => {
            const firma = await openDialog((done) => <SignaturePad signer={row} onDone={done} />);
            if (!firma) return;
            db.update('firmas_firmantes', row.id, { estado: 'FIRMADO', firma, fecha_firma: new Date().toISOString(), firmado_por: user.nombre });
            toast(`Firma registrada: ${row.nombre}`);
            // Cuando todos firman, el flujo avanza automáticamente a FIRMADO.
            if (!nextSigner(rec.id)) {
              const t = WORKFLOWS.firmas.transitions.find((x) => x.to === 'FIRMADO');
              runTransition('firmas', 'firmas', db.get('firmas', rec.id), t, user, 'Todas las firmas completadas');
              toast(`${rec.codigo} firmado por todas las partes`);
            }
          },
        },
        {
          label: 'Rechazar',
          icon: XCircle,
          visible: canSign,
          run: async (row, { rec, user, confirm, toast }) => {
            const ok = await confirm(`¿Rechazar la firma de ${row.nombre}?`, { title: 'Rechazar firma', danger: true, withComment: true });
            if (!ok) return;
            db.update('firmas_firmantes', row.id, { estado: 'RECHAZADO' });
            const t = WORKFLOWS.firmas.transitions.find((x) => x.to === 'RECHAZADO');
            runTransition('firmas', 'firmas', rec, t, user, ok.comment);
            toast(`${rec.codigo} rechazado`, 'critical');
          },
        },
      ],
    },
    {
      table: 'firmas_adjuntos',
      fk: 'documento_id',
      label: 'Adjuntos',
      icon: Paperclip,
      fields: [
        { key: 'nombre', label: 'Nombre del archivo', required: true, span: 2 },
        { key: 'tipo', label: 'Tipo', type: 'select', options: ['PDF', 'DOCX', 'XLSX', 'Imagen'], required: true },
        { key: 'tamano_kb', label: 'Tamaño (KB)', type: 'number', min: 0 },
      ],
      columns: [
        { key: 'nombre', label: 'Archivo' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'tamano_kb', label: 'Tamaño', align: 'right', render: (a) => `${a.tamano_kb || 0} KB` },
      ],
    },
  ],
};

export default function Firmas() {
  return <MasterDetailPage config={firmasConfig} />;
}
