import { fullPermissions, emptyPermissions, DASHBOARDS } from '../config/modules';

// Generador pseudoaleatorio determinístico: el DEMO siempre arranca igual.
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

let counter = 0;
const id = (p) => `${p}-${(++counter).toString(36).padStart(5, '0')}`;
const iso = (y, m, d) => new Date(Date.UTC(y, m, d, 14)).toISOString();

export function buildSeed() {
  counter = 0;
  const r = rng(20261019);
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const int = (a, b) => Math.floor(a + r() * (b - a + 1));

  // ---------- Roles ----------
  const perms = (map) => {
    const p = emptyPermissions();
    Object.entries(map).forEach(([mod, acts]) => acts.split(',').forEach((a) => (p[mod][a] = true)));
    return p;
  };
  const roles = [
    { id: 'rol-admin', codigo: 'ROL-0001', nombre: 'Administrador', descripcion: 'Acceso total al sistema', permisos: fullPermissions(), sistema: true },
    {
      id: 'rol-compras', codigo: 'ROL-0002', nombre: 'Analista de compras', descripcion: 'Gestiona órdenes de compra y proveedores',
      permisos: perms({ dashboard: 'ver', compras: 'ver,crear,editar', terceros: 'ver,crear,editar', firmas: 'ver' }),
    },
    {
      id: 'rol-aprob', codigo: 'ROL-0003', nombre: 'Aprobador', descripcion: 'Aprueba compras, firma documentos y valida terceros',
      permisos: perms({ dashboard: 'ver', compras: 'ver,aprobar', firmas: 'ver,aprobar', terceros: 'ver,aprobar', actividades: 'ver,aprobar' }),
    },
    {
      id: 'rol-proy', codigo: 'ROL-0004', nombre: 'Líder de proyectos', descripcion: 'Planea y ejecuta actividades',
      permisos: perms({ dashboard: 'ver', actividades: 'ver,crear,editar,eliminar', terceros: 'ver' }),
    },
  ];

  // ---------- Usuarios ----------
  const allDash = DASHBOARDS.map((d) => d.key);
  const usuarios = [
    {
      id: 'usr-admin', codigo: 'USR-0001', usuario: 'admin', clave: 'Ics2026*', nombre: 'Administrador ICS',
      email: 'admin@ics.demo', cargo: 'Administrador del sistema', rol_id: 'rol-admin', activo: true,
      dashboards: allDash,
    },
    {
      id: 'usr-compras', codigo: 'USR-0002', usuario: 'lgomez', clave: 'Demo2026*', nombre: 'Laura Gómez',
      email: 'lgomez@ics.demo', cargo: 'Analista de compras', rol_id: 'rol-compras', activo: true,
      dashboards: ['compras', 'terceros'],
    },
    {
      id: 'usr-aprob', codigo: 'USR-0003', usuario: 'crojas', clave: 'Demo2026*', nombre: 'Carlos Rojas',
      email: 'crojas@ics.demo', cargo: 'Gerente financiero', rol_id: 'rol-aprob', activo: true,
      dashboards: ['resumen', 'compras', 'firmas'],
    },
    {
      id: 'usr-proy', codigo: 'USR-0004', usuario: 'amejia', clave: 'Demo2026*', nombre: 'Andrea Mejía',
      email: 'amejia@ics.demo', cargo: 'Líder de proyectos', rol_id: 'rol-proy', activo: true,
      dashboards: ['actividades'],
    },
  ];

  // ---------- Terceros (maestro) + contactos / direcciones / cuentas (detalle) ----------
  const nombres = [
    ['Nubetec S.A.S.', 'Proveedor'], ['DataCore Andina', 'Proveedor'], ['Ofimática del Norte', 'Proveedor'],
    ['Seguridad Digital Ltda.', 'Proveedor'], ['Logística Express', 'Proveedor'], ['Grupo Altavista', 'Cliente'],
    ['Banco Horizonte', 'Cliente'], ['Clínica Santa Fe', 'Cliente'], ['Constructora Prisma', 'Cliente'],
    ['Consultores Quantum', 'Aliado'], ['Energía Verde S.A.', 'Cliente'], ['Mobiliario Moderno', 'Proveedor'],
  ];
  const ciudades = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Bucaramanga'];
  const estadosTer = ['ACTIVO', 'ACTIVO', 'ACTIVO', 'ACTIVO', 'EN_VALIDACION', 'PROSPECTO', 'INACTIVO'];
  const terceros = [];
  const terceros_contactos = [];
  const terceros_direcciones = [];
  const terceros_cuentas = [];
  nombres.forEach(([razon, tipo], i) => {
    const t = {
      id: id('ter'), codigo: `TER-${String(i + 1).padStart(4, '0')}`, razon_social: razon, tipo,
      tipo_documento: 'NIT', documento: `${int(800, 901)}.${int(100, 999)}.${int(100, 999)}-${int(0, 9)}`,
      ciudad: pick(ciudades), email: `contacto@${razon.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12)}.co`,
      telefono: `+57 60${int(1, 8)} ${int(200, 899)} ${int(1000, 9999)}`,
      estado: i < 9 ? 'ACTIVO' : pick(estadosTer), creado: iso(2026, int(0, 5), int(1, 27)),
    };
    terceros.push(t);
    const nC = int(1, 3);
    for (let k = 0; k < nC; k++) {
      terceros_contactos.push({
        id: id('tc'), tercero_id: t.id,
        nombre: pick(['Juan Pérez', 'María López', 'Diego Torres', 'Paula Ríos', 'Sergio Díaz', 'Natalia Cruz']),
        cargo: pick(['Gerente comercial', 'Coordinador de cuentas', 'Director financiero', 'Asistente administrativo']),
        email: `c${k + 1}@${t.email.split('@')[1]}`, telefono: `+57 3${int(0, 2)}${int(0, 9)} ${int(100, 999)} ${int(1000, 9999)}`,
      });
    }
    terceros_direcciones.push({
      id: id('td'), tercero_id: t.id, tipo: 'Principal',
      direccion: `Cra ${int(5, 80)} # ${int(10, 120)}-${int(10, 99)}`, ciudad: t.ciudad,
    });
    if (tipo === 'Proveedor') {
      terceros_cuentas.push({
        id: id('tb'), tercero_id: t.id, banco: pick(['Bancolombia', 'Davivienda', 'BBVA', 'Banco de Bogotá']),
        tipo_cuenta: pick(['Ahorros', 'Corriente']), numero: `${int(100, 999)}-${int(100000, 999999)}-${int(10, 99)}`,
      });
    }
  });
  const proveedores = terceros.filter((t) => t.tipo === 'Proveedor');

  // ---------- Compras (maestro) + ítems / entregas (detalle) ----------
  const catalogo = [
    ['Licencia software analítica (anual)', 'UND', 4_800_000], ['Portátil desarrollo 32GB', 'UND', 6_900_000],
    ['Servidor cloud – horas cómputo', 'HRS', 18_000], ['Monitor 27" 4K', 'UND', 1_650_000],
    ['Silla ergonómica', 'UND', 890_000], ['Servicio soporte TI mensual', 'MES', 3_200_000],
    ['Certificado SSL wildcard', 'UND', 1_100_000], ['Resma papel carta', 'PAQ', 21_000],
    ['Firewall perimetral', 'UND', 12_500_000], ['Transporte equipos', 'SRV', 450_000],
  ];
  const estadosOC = ['CERRADA', 'CERRADA', 'RECIBIDA', 'APROBADA', 'APROBADA', 'SOLICITADA', 'SOLICITADA', 'BORRADOR', 'RECHAZADA'];
  const compras = [];
  const compras_items = [];
  const compras_entregas = [];
  for (let i = 0; i < 34; i++) {
    const month = Math.min(9, Math.floor(i / 3.4));
    const estado = month < 6 ? pick(['CERRADA', 'CERRADA', 'RECIBIDA', 'ANULADA', 'CERRADA']) : pick(estadosOC);
    const c = {
      id: id('oc'), codigo: `OC-${String(i + 1).padStart(4, '0')}`, fecha: iso(2026, month, int(1, 27)),
      proveedor_id: pick(proveedores).id, solicitante: pick(['Laura Gómez', 'Andrea Mejía', 'Administrador ICS']),
      centro_costo: pick(['TI', 'Administración', 'Proyectos', 'Comercial']), forma_pago: pick(['Contado', 'Crédito 30 días', 'Crédito 60 días']),
      moneda: 'COP', observaciones: '', estado,
    };
    compras.push(c);
    const nI = int(1, 4);
    for (let k = 0; k < nI; k++) {
      const [desc, und, precio] = pick(catalogo);
      compras_items.push({
        id: id('oci'), compra_id: c.id, descripcion: desc, unidad: und,
        cantidad: und === 'HRS' ? int(100, 600) : int(1, 8), precio_unitario: precio, iva: pick([19, 19, 0]),
      });
    }
    if (['RECIBIDA', 'CERRADA'].includes(estado)) {
      compras_entregas.push({
        id: id('oce'), compra_id: c.id, fecha: c.fecha, remision: `REM-${int(10000, 99999)}`,
        recibido_por: pick(['Almacén central', 'Mesa de ayuda TI']), observacion: 'Recibido a satisfacción',
      });
    }
  }

  // ---------- Firmas (maestro) + firmantes / adjuntos (detalle) ----------
  const docs = [
    ['Contrato de licenciamiento cloud', 'Contrato'], ['Acuerdo de confidencialidad Quantum', 'Acuerdo'],
    ['Acta de entrega proyecto Prisma', 'Acta'], ['Política de seguridad de la información', 'Política'],
    ['Otrosí contrato soporte TI', 'Contrato'], ['Orden de servicio consultoría', 'Orden'],
    ['Acta comité de compras septiembre', 'Acta'], ['Contrato marco Banco Horizonte', 'Contrato'],
    ['Acuerdo de nivel de servicio (SLA)', 'Acuerdo'], ['Política de teletrabajo', 'Política'],
  ];
  const estDoc = ['FIRMADO', 'FIRMADO', 'FIRMADO', 'EN_FIRMA', 'EN_FIRMA', 'EN_FIRMA', 'BORRADOR', 'FIRMADO', 'RECHAZADO', 'EN_FIRMA'];
  const firmas = [];
  const firmas_firmantes = [];
  const firmas_adjuntos = [];
  docs.forEach(([titulo, tipo], i) => {
    const f = {
      id: id('doc'), codigo: `DOC-${String(i + 1).padStart(4, '0')}`, titulo, tipo, tercero_id: pick(terceros).id,
      fecha_limite: iso(2026, int(8, 11), int(1, 27)), descripcion: '', estado: estDoc[i], creado: iso(2026, int(3, 9), int(1, 27)),
    };
    firmas.push(f);
    const firmantes = [
      ['Carlos Rojas', 'Gerente financiero', 'crojas@ics.demo'],
      ['Administrador ICS', 'Representante legal', 'admin@ics.demo'],
      ['Juan Pérez', 'Representante tercero', 'juan.perez@tercero.co'],
    ].slice(0, int(2, 3));
    firmantes.forEach(([nombre, cargo, email], k) => {
      const firmado = f.estado === 'FIRMADO' || (f.estado === 'EN_FIRMA' && k === 0 && r() > 0.4);
      firmas_firmantes.push({
        id: id('ff'), documento_id: f.id, orden: k + 1, nombre, cargo, email,
        estado: f.estado === 'RECHAZADO' && k === 0 ? 'RECHAZADO' : firmado ? 'FIRMADO' : 'PENDIENTE',
        fecha_firma: firmado ? f.creado : '', firma: '',
      });
    });
    firmas_adjuntos.push({ id: id('fa'), documento_id: f.id, nombre: `${titulo}.pdf`, tipo: 'PDF', tamano_kb: int(120, 2400) });
  });

  // ---------- Actividades (maestro) + tareas / tiempos (detalle) ----------
  const acts = [
    ['Implementación módulo de compras', 'Proyectos'], ['Migración a nube híbrida', 'TI'],
    ['Auditoría de seguridad Q4', 'TI'], ['Onboarding cliente Energía Verde', 'Comercial'],
    ['Capacitación usuarios ERP', 'Administración'], ['Rediseño portal de clientes', 'Proyectos'],
    ['Cierre contable septiembre', 'Administración'], ['Plan comercial 2027', 'Comercial'],
  ];
  const estAct = ['EN_CURSO', 'EN_CURSO', 'PLANEADA', 'EN_REVISION', 'COMPLETADA', 'EN_CURSO', 'COMPLETADA', 'PLANEADA'];
  const responsables = ['Andrea Mejía', 'Laura Gómez', 'Carlos Rojas', 'Administrador ICS'];
  const actividades = [];
  const actividades_tareas = [];
  const actividades_tiempos = [];
  acts.forEach(([titulo, area], i) => {
    const m = int(6, 10);
    const a = {
      id: id('act'), codigo: `ACT-${String(i + 1).padStart(4, '0')}`, titulo, area, responsable: pick(responsables),
      prioridad: pick(['Alta', 'Media', 'Media', 'Baja']), fecha_inicio: iso(2026, m - 1, int(1, 15)),
      fecha_fin: iso(2026, m + 1, int(1, 27)), descripcion: '', estado: estAct[i],
    };
    actividades.push(a);
    const nT = int(3, 6);
    for (let k = 0; k < nT; k++) {
      const done = a.estado === 'COMPLETADA' || (a.estado !== 'PLANEADA' && r() > 0.45);
      actividades_tareas.push({
        id: id('at'), actividad_id: a.id, titulo: pick(['Levantamiento de requisitos', 'Diseño de solución', 'Desarrollo', 'Pruebas', 'Documentación', 'Despliegue', 'Reunión de seguimiento']),
        responsable: pick(responsables), fecha: a.fecha_fin, horas_estimadas: int(4, 24), completada: done,
      });
    }
    if (a.estado !== 'PLANEADA') {
      for (let k = 0; k < int(1, 4); k++) {
        actividades_tiempos.push({ id: id('ah'), actividad_id: a.id, fecha: iso(2026, m - 1, int(1, 27)), usuario: a.responsable, horas: int(2, 8), nota: 'Avance registrado' });
      }
    }
  });

  // ---------- Historial de workflow ----------
  const workflow_historial = [];
  const hist = (modulo, rec, hacia, accion, fecha, usuario = 'Carlos Rojas') =>
    workflow_historial.push({ id: id('wf'), modulo, registro_id: rec.id, registro_codigo: rec.codigo, desde: '', hacia, accion, usuario, usuario_id: '', comentario: '', fecha });
  compras.forEach((c) => {
    if (c.estado !== 'BORRADOR') hist('compras', c, 'SOLICITADA', 'Enviar a aprobación', c.fecha, c.solicitante);
    if (['APROBADA', 'RECIBIDA', 'CERRADA'].includes(c.estado)) hist('compras', c, 'APROBADA', 'Aprobar', c.fecha);
  });
  firmas.forEach((f) => f.estado !== 'BORRADOR' && hist('firmas', f, 'EN_FIRMA', 'Enviar a firma', f.creado, 'Administrador ICS'));

  return {
    roles, usuarios, terceros, terceros_contactos, terceros_direcciones, terceros_cuentas,
    compras, compras_items, compras_entregas, firmas, firmas_firmantes, firmas_adjuntos,
    actividades, actividades_tareas, actividades_tiempos, workflow_historial,
  };
}
