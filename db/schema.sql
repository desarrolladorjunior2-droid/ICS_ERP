-- =====================================================================
-- Insight Cloud Solution (ICS) · Esquema de referencia PostgreSQL
-- Modelo Maestro -> Detalle: cada detalle referencia a su maestro con
-- ON DELETE CASCADE. El estado de cada maestro lo gobierna el workflow.
-- =====================================================================

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

-- ---------- Terceros ----------
CREATE TABLE terceros (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo          VARCHAR(20) UNIQUE NOT NULL,
  razon_social    VARCHAR(160) NOT NULL,
  tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('Proveedor','Cliente','Aliado','Empleado')),
  tipo_documento  VARCHAR(10) NOT NULL,
  documento       VARCHAR(30) NOT NULL,
  ciudad          VARCHAR(80),
  email           VARCHAR(160),
  telefono        VARCHAR(40),
  estado          VARCHAR(20) NOT NULL DEFAULT 'PROSPECTO',
  creado          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tipo_documento, documento)
);
CREATE TABLE terceros_contactos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tercero_id  UUID NOT NULL REFERENCES terceros(id) ON DELETE CASCADE,
  nombre      VARCHAR(120) NOT NULL,
  cargo       VARCHAR(120),
  email       VARCHAR(160),
  telefono    VARCHAR(40)
);
CREATE TABLE terceros_direcciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tercero_id  UUID NOT NULL REFERENCES terceros(id) ON DELETE CASCADE,
  tipo        VARCHAR(30) NOT NULL,
  direccion   VARCHAR(200) NOT NULL,
  ciudad      VARCHAR(80) NOT NULL
);
CREATE TABLE terceros_cuentas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tercero_id   UUID NOT NULL REFERENCES terceros(id) ON DELETE CASCADE,
  banco        VARCHAR(80) NOT NULL,
  tipo_cuenta  VARCHAR(20) NOT NULL,
  numero       VARCHAR(40) NOT NULL
);

-- ---------- Compras ----------
CREATE TABLE compras (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo         VARCHAR(20) UNIQUE NOT NULL,
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
  compra_id        UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  descripcion      VARCHAR(200) NOT NULL,
  cantidad         NUMERIC(14,2) NOT NULL CHECK (cantidad > 0),
  unidad           VARCHAR(10) NOT NULL,
  precio_unitario  NUMERIC(16,2) NOT NULL CHECK (precio_unitario >= 0),
  iva              NUMERIC(5,2) NOT NULL DEFAULT 19
);
CREATE TABLE compras_entregas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id     UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  fecha         DATE NOT NULL,
  remision      VARCHAR(40) NOT NULL,
  recibido_por  VARCHAR(120) NOT NULL,
  observacion   TEXT
);

-- ---------- Firmas ----------
CREATE TABLE firmas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        VARCHAR(20) UNIQUE NOT NULL,
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
  documento_id  UUID NOT NULL REFERENCES firmas(id) ON DELETE CASCADE,
  nombre        VARCHAR(200) NOT NULL,
  tipo          VARCHAR(20) NOT NULL,
  tamano_kb     INTEGER,
  url           TEXT
);

-- ---------- Actividades ----------
CREATE TABLE actividades (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        VARCHAR(20) UNIQUE NOT NULL,
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
  actividad_id     UUID NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
  titulo           VARCHAR(200) NOT NULL,
  responsable      VARCHAR(120) NOT NULL,
  fecha            DATE NOT NULL,
  horas_estimadas  NUMERIC(6,2),
  completada       BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE actividades_tiempos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actividad_id  UUID NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
  fecha         DATE NOT NULL,
  usuario       VARCHAR(120) NOT NULL,
  horas         NUMERIC(6,2) NOT NULL CHECK (horas > 0),
  nota          TEXT
);

-- ---------- Workflow: bitácora transversal ----------
CREATE TABLE workflow_historial (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
