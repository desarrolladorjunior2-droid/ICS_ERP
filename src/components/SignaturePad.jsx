import { useEffect, useRef, useState } from 'react';
import { Eraser, PenTool } from 'lucide-react';
import { Button, Modal } from './ui';

/** Diálogo de captura de firma manuscrita (mouse, lápiz o táctil). */
export default function SignaturePad({ signer, onDone }) {
  const canvas = useRef(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);
  const [accept, setAccept] = useState(false);

  useEffect(() => {
    const c = canvas.current;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0A1630';
  }, []);

  const pos = (e) => {
    const r = canvas.current.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  const down = (e) => {
    canvas.current.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = canvas.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(...pos(e));
  };
  const move = (e) => {
    if (!drawing.current) return;
    const ctx = canvas.current.getContext('2d');
    ctx.lineTo(...pos(e));
    ctx.stroke();
    setEmpty(false);
  };
  const up = () => (drawing.current = false);
  const clear = () => {
    const c = canvas.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    setEmpty(true);
  };

  return (
    <Modal
      title={`Firmar como ${signer.nombre}`}
      onClose={() => onDone(null)}
      footer={
        <>
          <Button variant="ghost" icon={Eraser} onClick={clear}>
            Limpiar
          </Button>
          <Button variant="ghost" onClick={() => onDone(null)}>
            Cancelar
          </Button>
          <Button icon={PenTool} disabled={empty || !accept} onClick={() => onDone(canvas.current.toDataURL('image/png'))}>
            Firmar documento
          </Button>
        </>
      }
    >
      <p className="muted small">
        {signer.cargo} · {signer.email}
      </p>
      <canvas
        ref={canvas}
        className="sig-canvas"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        aria-label="Área de firma"
      />
      <label className="check">
        <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
        Declaro que he leído el documento y acepto firmarlo electrónicamente.
      </label>
    </Modal>
  );
}
