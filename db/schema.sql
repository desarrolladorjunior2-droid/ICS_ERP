-- =====================================================================
-- Insight Cloud Solution (ICS) · Esquema de referencia PostgreSQL
-- Modelo Maestro -> Detalle: cada detalle referencia a su maestro con
-- ON DELETE CASCADE. El estado de cada maestro lo gobierna el workflow.
-- =====================================================================

-- ---------- Multiempresa ----------
-- Cada empresa del grupo tiene sus propios datos, numeración y auditoría.
-- Usuarios, roles y empresas son globales; los usuarios acceden a las empresas que se les asignan.
CREATE TABLE empresas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo     VARCHAR(20) UNIQUE NOT NULL,
  nombre     VARCHAR(160) NOT NULL,          -- razón social
  alias      VARCHAR(60) NOT NULL,           -- nombre corto para el selector
  nit        VARCHAR(30) UNIQUE NOT NULL,
  ciudad     VARCHAR(80),
  moneda     CHAR(3) NOT NULL DEFAULT 'COP',
  color      VARCHAR(9) NOT NULL DEFAULT '#22C8F0',
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  creado     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Seguridad ----------
CREATE TABLE roles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        VARCHAR(20) UNIQUE NOT NULL,
  nombre        VARCHAR(80) NOT NULL,
  descripcion   TEXT,
  sistema       BOOLEAN NOT NULL DEFAULT FALSE,
  creado        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Detalle del rol: matriz CRUD + aprobar por módulo
CREATE TABLE roles_permisos (
  rol_id    UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  modulo    VARCHAR(30) NOT NULL,
  ver       BOOLEAN NOT NULL DEFAULT FALSE,
  crear     BOOLEAN NOT NULL DEFAULT FALSE,
  editar    BOOLEAN NOT NULL DEFAULT FALSE,
  eliminar  BOOLEAN NOT NULL DEFAULT FALSE,
  aprobar   BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (rol_id, modulo)
);

CREATE TABLE usuarios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        VARCHAR(20) UNIQUE NOT NULL,
  usuario       VARCHAR(60) UNIQUE NOT NULL,
  clave_hash    TEXT NOT NULL,                -- bcrypt/argon2, nunca texto plano
  nombre        VARCHAR(120) NOT NULL,
  email         VARCHAR(160) UNIQUE NOT NULL,
  cargo         VARCHAR(120),
  rol_id        UUID NOT NULL REFERENCES roles(id),
  empresa_id    UUID REFERENCES empresas(id),   -- empresa predeterminada al ingresar
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  creado        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Detalle del usuario: dashboards parametrizados como vista inicial
CREATE TABLE usuarios_dashboards (
  usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  dashboard   VARCHAR(30) NOT NULL,
  orden       SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (usuario_id, dashboard)
);

-- Empresas a las que puede acceder cada usuario (el rol Administrador accede a todas)
CREATE TABLE usuarios_empresas (
  usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  PRIMARY KEY (usuario_id, empresa_id)
);

-- ---------- Terceros ----------
CREATE TABLE terceros (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  codigo          VARCHAR(20) NOT NULL,
  razon_social    VARCHAR(160) NOT NULL,
  tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('Proveedor','Cliente','Aliado','Empleado')),
  tipo_documento  VARCHAR(10) NOT NULL,
  documento       VARCHAR(30) NOT NULL,
  ciudad          VARCHAR(80),
  email           VARCHAR(160),
  telefono        VARCHAR(40),
  estado          VARCHAR(20) NOT NULL DEFAULT 'PROSPECTO',
  creado          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, tipo_documento, documento)
);
CREATE TABLE terceros_contactos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  tercero_id  UUID NOT NULL REFERENCES terceros(id) ON DELETE CASCADE,
  nombre      VARCHAR(120) NOT NULL,
  cargo       VARCHAR(120),
  email       VARCHAR(160),
  telefono    VARCHAR(40)
);
CREATE TABLE terceros_direcciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  tercero_id  UUID NOT NULL REFERENCES terceros(id) ON DELETE CASCADE,
  tipo        VARCHAR(30) NOT NULL,
  direccion   VARCHAR(200) NOT NULL,
  ciudad      VARCHAR(80) NOT NULL
);
CREATE TABLE terceros_cuentas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  tercero_id   UUID NOT NULL REFERENCES terceros(id) ON DELETE CASCADE,
  banco        VARCHAR(80) NOT NULL,
  tipo_cuenta  VARCHAR(20) NOT NULL,
  numero       VARCHAR(40) NOT NULL
);

-- ---------- Compras ----------
CREATE TABLE compras (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  codigo         VARCHAR(20) NOT NULL,
  fecha          DATE NOT NULL,
  proveedor_id   UUID NOT NULL REFERENCES terceros(id),
  solicitante    VARCHAR(120) NOT NULL,
  centro_costo   VARCHAR(60) NOT NULL,
  forma_pago     VARCHAR(40) NOT NULL,
  moneda         CHAR(3) NOT NULL DEFAULT 'COP',
  observaciones  TEXT,
  estado         VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
  creado         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE compras_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  compra_id        UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  descripcion      VARCHAR(200) NOT NULL,
  cantidad         NUMERIC(14,2) NOT NULL CHECK (cantidad > 0),
  unidad           VARCHAR(10) NOT NULL,
  precio_unitario  NUMERIC(16,2) NOT NULL CHECK (precio_unitario >= 0),
  iva              NUMERIC(5,2) NOT NULL DEFAULT 19
);
CREATE TABLE compras_entregas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  compra_id     UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  fecha         DATE NOT NULL,
  remision      VARCHAR(40) NOT NULL,
  recibido_por  VARCHAR(120) NOT NULL,
  observacion   TEXT
);

-- ---------- Firmas ----------
CREATE TABLE firmas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  codigo        VARCHAR(20) NOT NULL,
  titulo        VARCHAR(200) NOT NULL,
  tipo          VARCHAR(30) NOT NULL,
  tercero_id    UUID REFERENCES terceros(id),
  fecha_limite  DATE NOT NULL,
  descripcion   TEXT,
  estado        VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
  creado        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE firmas_firmantes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  documento_id  UUID NOT NULL REFERENCES firmas(id) ON DELETE CASCADE,
  orden         SMALLINT NOT NULL,
  nombre        VARCHAR(120) NOT NULL,
  cargo         VARCHAR(120),
  email         VARCHAR(160) NOT NULL,
  estado        VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  fecha_firma   TIMESTAMPTZ,
  firma         TEXT,            -- imagen PNG (base64) o referencia a almacenamiento
  UNIQUE (documento_id, orden)
);
CREATE TABLE firmas_adjuntos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  documento_id  UUID NOT NULL REFERENCES firmas(id) ON DELETE CASCADE,
  nombre        VARCHAR(200) NOT NULL,
  tipo          VARCHAR(20) NOT NULL,
  tamano_kb     INTEGER,
  url           TEXT
);

-- ---------- Actividades ----------
CREATE TABLE actividades (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  codigo        VARCHAR(20) NOT NULL,
  titulo        VARCHAR(200) NOT NULL,
  area          VARCHAR(60) NOT NULL,
  responsable   VARCHAR(120) NOT NULL,
  prioridad     VARCHAR(10) NOT NULL,
  fecha_inicio  DATE NOT NULL,
  fecha_fin     DATE NOT NULL,
  descripcion   TEXT,
  estado        VARCHAR(20) NOT NULL DEFAULT 'PLANEADA',
  creado        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE actividades_tareas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  actividad_id     UUID NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
  titulo           VARCHAR(200) NOT NULL,
  responsable      VARCHAR(120) NOT NULL,
  fecha            DATE NOT NULL,
  horas_estimadas  NUMERIC(6,2),
  completada       BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE actividades_tiempos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  actividad_id  UUID NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
  fecha         DATE NOT NULL,
  usuario       VARCHAR(120) NOT NULL,
  horas         NUMERIC(6,2) NOT NULL CHECK (horas > 0),
  nota          TEXT
);

-- ---------- Inventario (relacionado con Compras) ----------
CREATE TABLE articulos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  codigo        VARCHAR(20) NOT NULL,
  nombre        VARCHAR(160) NOT NULL,
  categoria     VARCHAR(60) NOT NULL,
  unidad        VARCHAR(10) NOT NULL,
  stock_minimo  NUMERIC(14,2) NOT NULL DEFAULT 0,
  ultimo_costo  NUMERIC(16,2) NOT NULL DEFAULT 0,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  creado        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Los ítems de compra pueden ligarse a un artículo: al recibir la orden se genera el ingreso
ALTER TABLE compras_items ADD COLUMN articulo_id UUID REFERENCES articulos(id);

CREATE TABLE inventario (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  codigo         VARCHAR(20) NOT NULL,
  tipo           VARCHAR(20) NOT NULL CHECK (tipo IN ('Entrada por compra','Entrada','Salida','Ajuste')),
  fecha          DATE NOT NULL,
  bodega         VARCHAR(60) NOT NULL,
  compra_id      UUID REFERENCES compras(id),      -- orden de origen (entradas por compra)
  referencia     VARCHAR(80),
  observaciones  TEXT,
  estado         VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
  creado         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE inventario_lineas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  movimiento_id   UUID NOT NULL REFERENCES inventario(id) ON DELETE CASCADE,
  articulo_id     UUID NOT NULL REFERENCES articulos(id),
  cantidad        NUMERIC(14,2) NOT NULL,           -- en ajustes puede ser negativa
  costo_unitario  NUMERIC(16,2) NOT NULL DEFAULT 0
);
-- Existencias = suma de líneas de movimientos CONFIRMADOS (salidas restan)
CREATE VIEW existencias AS
SELECT a.id AS articulo_id, a.codigo, a.nombre, a.stock_minimo,
       COALESCE(SUM(CASE WHEN m.tipo = 'Salida' THEN -l.cantidad ELSE l.cantidad END), 0) AS stock
FROM articulos a
LEFT JOIN inventario_lineas l ON l.articulo_id = a.id
LEFT JOIN inventario m ON m.id = l.movimiento_id AND m.estado = 'CONFIRMADO'
GROUP BY a.id;

-- ---------- Auditoría: registro de actividad (solo inserción; sin UPDATE/DELETE) ----------
CREATE TABLE auditoria_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID REFERENCES empresas(id),  -- NULL = evento global del grupo (sesiones, usuarios, roles)
  codigo           VARCHAR(20) NOT NULL,
  fecha            TIMESTAMPTZ NOT NULL DEFAULT now(),
  usuario_id       UUID REFERENCES usuarios(id),
  usuario          VARCHAR(120) NOT NULL,
  usuario_login    VARCHAR(60),
  rol              VARCHAR(80),
  accion           VARCHAR(20) NOT NULL
                   CHECK (accion IN ('CREAR','EDITAR','ELIMINAR','WORKFLOW','LOGIN','LOGOUT','LOGIN_FALLIDO','CAMBIO_EMPRESA')),
  modulo           VARCHAR(30) NOT NULL,
  tabla            VARCHAR(60),
  registro_id      UUID,
  registro_codigo  VARCHAR(120),
  descripcion      TEXT NOT NULL,
  nivel            VARCHAR(10) NOT NULL DEFAULT 'info'
);
CREATE INDEX ix_audit_fecha ON auditoria_logs (fecha DESC);
CREATE INDEX ix_audit_usuario ON auditoria_logs (usuario_id, fecha DESC);
CREATE INDEX ix_audit_registro ON auditoria_logs (tabla, registro_id);
CREATE TABLE auditoria_logs_cambios (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id    UUID NOT NULL REFERENCES auditoria_logs(id) ON DELETE CASCADE,
  campo     VARCHAR(60) NOT NULL,
  anterior  TEXT,
  nuevo     TEXT
);
-- Inmutabilidad: el rol de la aplicación solo debe tener permiso INSERT/SELECT
-- REVOKE UPDATE, DELETE ON auditoria_logs, auditoria_logs_cambios FROM app_user;

-- ---------- Workflow: bitácora transversal ----------
CREATE TABLE workflow_historial (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  modulo           VARCHAR(30) NOT NULL,
  registro_id      UUID NOT NULL,
  registro_codigo  VARCHAR(20),
  desde            VARCHAR(20),
  hacia            VARCHAR(20) NOT NULL,
  accion           VARCHAR(80) NOT NULL,
  usuario_id       UUID REFERENCES usuarios(id),
  comentario       TEXT,
  fecha            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_wf_registro ON workflow_historial (modulo, registro_id);

-- ---------- Numeración propia por empresa ----------
CREATE UNIQUE INDEX ux_terceros_codigo ON terceros (empresa_id, codigo);
CREATE UNIQUE INDEX ux_compras_codigo ON compras (empresa_id, codigo);
CREATE UNIQUE INDEX ux_firmas_codigo ON firmas (empresa_id, codigo);
CREATE UNIQUE INDEX ux_actividades_codigo ON actividades (empresa_id, codigo);
CREATE UNIQUE INDEX ux_articulos_codigo ON articulos (empresa_id, codigo);
CREATE UNIQUE INDEX ux_inventario_codigo ON inventario (empresa_id, codigo);
CREATE INDEX ix_audit_empresa ON auditoria_logs (empresa_id, fecha DESC);

-- ---------- Aislamiento por empresa (Row Level Security) ----------
-- La aplicación fija la empresa activa en cada conexión/transacción:
--   SET LOCAL app.empresa_id = '<uuid de la empresa>';
-- y PostgreSQL impide leer o escribir filas de otra empresa aunque falle un filtro en la API.
ALTER TABLE terceros ENABLE ROW LEVEL SECURITY;
CREATE POLICY empresa_activa ON terceros
  USING (empresa_id = current_setting('app.empresa_id')::uuid)
  WITH CHECK (empresa_id = current_setting('app.empresa_id')::uuid);
ALTER TABLE terceros_contactos ENABLE ROW LEVEL SECURITY;
CREATE POLICY empresa_activa ON terceros_contactos
  USING (empresa_id = current_setting('app.empresa_id')::uuid)
  WITH CHECK (empresa_id = current_setting('app.empresa_id')::uuid);
ALTER TABLE terceros_direcciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY empresa_activa ON terceros_direcciones
  USING (empresa_id = current_setting('app.empresa_id')::uuid)
  WITH CHECK (empresa_id = current_setting('app.empresa_id')::uuid);
ALTER TABLE terceros_cuentas ENABLE ROW LEVEL SECURITY;
CREATE POLICY empresa_activa ON terceros_cuentas
  USING (empresa_id = current_setting('app.empresa_id')::uuid)
  WITH CHECK (empresa_id = current_setting('app.empresa_id')::uuid);
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
CREATE POLICY empresa_activa ON compras
  USING (empresa_id = current_setting('app.empresa_id')::uuid)
  WITH CHECK (empresa_id = current_setting('app.empresa_id')::uuid);
ALTER TABLE compras_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY empresa_activa ON compras_items
  USING (empresa_id = current_setting('app.empresa_id')::uuid)
  WITH CHECK (empresa_id = current_setting('app.empresa_id')::uuid);
ALTER TABLE compras_entregas ENABLE ROW LEVEL SECURITY;
CREATE POLICY empresa_activa ON compras_entregas
  USING (empresa_id = current_setting('app.empresa_id')::uuid)
  WITH CHECK (empresa_id = current_setting('app.empresa_id')::uuid);
ALTER TABLE firmas ENABLE ROW LEVEL SECURITY;
CREATE POLICY empresa_activa ON firmas
  USING (empresa_id = current_setting('app.empresa_id')::uuid)
  WITH CHECK (empresa_id = current_setting('app.empresa_id')::uuid);
ALTER TABLE firmas_firmantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY empresa_activa ON firmas_firmantes
  USING (empresa_id = current_setting('app.empresa_id')::uuid)
  WITH CHECK (empresa_id = current_setting('app.empresa_id')::uuid);
ALTER TABLE firmas_adjuntos ENABLE ROW LEVEL SECURITY;
CREATE POLICY empresa_activa ON firmas_adjuntos
  USING (empresa_id = current_setting('app.empresa_id')::uuid)
  WITH CHECK (empresa_id = current_setting('app.empresa_id')::uuid);
ALTER TABLE actividades ENABLE ROW LEVEL SECURITY;
CREATE POLICY empresa_activa ON actividades
  USING (empresa_id = current_setting('app.empresa_id')::uuid)
  WITH CHECK (empresa_id = current_setting('app.empresa_id')::uuid);
ALTER TABLE actividades_tareas ENABLE ROW LEVEL SECURITY;
CREATE POLICY empresa_activa ON actividades_tareas
  USING (empresa_id = current_setting('app.empresa_id')::uuid)
  WITH CHECK (empresa_id = current_setting('app.empresa_id')::uuid);
ALTER TABLE actividades_tiempos ENABLE ROW LEVEL SECURITY;
CREATE POLICY empresa_activa ON actividades_tiempos
  USING (empresa_id = current_setting('app.empresa_id')::uuid)
  WITH CHECK (empresa_id = current_setting('app.empresa_id')::uuid);
ALTER TABLE articulos ENABLE ROW LEVEL SECURITY;
CREATE POLICY empresa_activa ON articulos
  USING (empresa_id = current_setting('app.empresa_id')::uuid)
  WITH CHECK (empresa_id = current_setting('app.empresa_id')::uuid);
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;
CREATE POLICY empresa_activa ON inventario
  USING (empresa_id = current_setting('app.empresa_id')::uuid)
  WITH CHECK (empresa_id = current_setting('app.empresa_id')::uuid);
ALTER TABLE inventario_lineas ENABLE ROW LEVEL SECURITY;
CREATE POLICY empresa_activa ON inventario_lineas
  USING (empresa_id = current_setting('app.empresa_id')::uuid)
  WITH CHECK (empresa_id = current_setting('app.empresa_id')::uuid);
ALTER TABLE auditoria_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY empresa_activa ON auditoria_logs
  USING (empresa_id = current_setting('app.empresa_id')::uuid OR empresa_id IS NULL)
  WITH CHECK (empresa_id = current_setting('app.empresa_id')::uuid OR empresa_id IS NULL);
ALTER TABLE workflow_historial ENABLE ROW LEVEL SECURITY;
CREATE POLICY empresa_activa ON workflow_historial
  USING (empresa_id = current_setting('app.empresa_id')::uuid)
  WITH CHECK (empresa_id = current_setting('app.empresa_id')::uuid);
