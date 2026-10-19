import { useEffect, useRef } from 'react';

// Fondo dinámico: una red de datos viva. Los nodos flotan y se conectan entre sí, pequeños pulsos de
// luz viajan por las conexiones y el mouse atrae/ilumina los nodos cercanos. Respeta
// prefers-reduced-motion (imagen fija) y se pausa cuando la pestaña no está visible.
const CYAN = '34,200,240';
const BLUE = '26,91,230';

export default function NetworkBackground({ variant = 'hero' }) {
  // hero = portada (más visible) · app = fondo sutil detrás de todo el sistema
  const soft = variant === 'app';
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let nodes = [];
    let pulses = [];
    let raf = 0;
    let last = performance.now();
    const mouse = { x: -9999, y: -9999, on: false };

    const isLight = () => document.documentElement.dataset.theme === 'light';
    const LINK = () => Math.max(110, Math.min(170, w / 9));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(soft ? 70 : 95, Math.max(24, (w * h) / (soft ? 26000 : 17000))));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.4 + 0.8,
        ph: Math.random() * Math.PI * 2,
      }));
      pulses = [];
    };

    const draw = (dt, t) => {
      ctx.clearRect(0, 0, w, h);
      const link = LINK();
      const k0 = soft ? 0.62 : 1; // intensidad global
      const dot = isLight() ? BLUE : CYAN;

      // movimiento
      nodes.forEach((n) => {
        if (!reduced) {
          n.x += n.vx * dt * 60;
          n.y += n.vy * dt * 60;
          if (n.x < -20) n.x = w + 20;
          if (n.x > w + 20) n.x = -20;
          if (n.y < -20) n.y = h + 20;
          if (n.y > h + 20) n.y = -20;
          // el mouse atrae suavemente los nodos cercanos
          if (mouse.on) {
            const dx = mouse.x - n.x;
            const dy = mouse.y - n.y;
            const d = Math.hypot(dx, dy);
            if (d < 190 && d > 1) {
              n.x += (dx / d) * (1 - d / 190) * 0.9;
              n.y += (dy / d) * (1 - d / 190) * 0.9;
            }
          }
        }
      });

      // conexiones
      const edges = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < link) {
            const k = 1 - d / link;
            ctx.strokeStyle = `rgba(${BLUE},${(0.08 + k * 0.4) * k0})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            edges.push([a, b]);
          }
        }
      }

      // pulsos de datos viajando por las conexiones
      if (!reduced && edges.length && pulses.length < 14 && Math.random() < 0.07) {
        const [a, b] = edges[Math.floor(Math.random() * edges.length)];
        pulses.push({ a, b, p: 0, s: 0.5 + Math.random() * 0.7 });
      }
      pulses = pulses.filter((p) => {
        p.p += dt * p.s;
        if (p.p >= 1) return false;
        const x = p.a.x + (p.b.x - p.a.x) * p.p;
        const y = p.a.y + (p.b.y - p.a.y) * p.p;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
        g.addColorStop(0, `rgba(${dot},${0.95 * k0})`);
        g.addColorStop(1, `rgba(${dot},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });

      // nodos (con un leve "latido") y conexión de luz hacia el mouse
      nodes.forEach((n) => {
        const near = mouse.on ? Math.max(0, 1 - Math.hypot(mouse.x - n.x, mouse.y - n.y) / 190) : 0;
        const beat = reduced ? 0.5 : 0.5 + Math.sin(t * 1.4 + n.ph) * 0.5;
        ctx.fillStyle = `rgba(${dot},${(0.28 + beat * 0.3 + near * 0.45) * k0})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + near * 1.6, 0, Math.PI * 2);
        ctx.fill();
        if (near > 0.05) {
          ctx.strokeStyle = `rgba(${dot},${near * 0.55 * k0})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      });
    };

    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      draw(dt, now / 1000);
      raf = requestAnimationFrame(frame);
    };

    resize();
    if (reduced) draw(0, 0);
    else raf = requestAnimationFrame(frame);

    const onMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.on = true;
    };
    const onLeave = () => {
      mouse.on = false;
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    const onResize = () => {
      resize();
      if (reduced) draw(0, 0);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={ref} className={`lg-network ${soft ? 'app-network' : ''}`} aria-hidden />;
}
