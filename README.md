# Insight Cloud Solution · ERP ICS v1.0

ERP de **ICS – Innovation Code Services**, construido en React + Vite y listo para desplegar en Vercel.

## Módulos

| Módulo | Maestro | Detalles (tablas relacionadas) | Workflow |
|---|---|---|---|
| Compras | Orden de compra | Ítems, Entregas | Borrador → Solicitada → Aprobada → Recibida → Cerrada (+ Rechazada / Anulada) |
| Firmas | Documento | Firmantes (firma manuscrita secuencial), Adjuntos | Borrador → En firma → Firmado (+ Rechazado / Vencido) |
| Actividades | Actividad | Tareas, Registro de tiempos | Planeada → En curso → En revisión → Completada (+ Cancelada) |
| Terceros | Tercero | Contactos, Direcciones, Cuentas bancarias | Prospecto → En validación → Activo (+ Inactivo / Bloqueado) |
| Inventario | Movimiento (y catálogo de artículos) | Líneas por artículo | Borrador → Confirmado (+ Anulado) |
| Auditoría | Evento (log) | Cambios campo a campo (anterior → nuevo) | — (solo lectura, inmutable) |
| Empresas | Empresa | — (vista consolidada del grupo) | — |
| Usuarios / Roles | Usuario, Rol | Dashboards por usuario; matriz CRUD + Aprobar por módulo | — |

**El workflow no es un módulo: es la metodología de trabajo de todos los módulos.** Cada módulo de gestión incluye:

- Etapas del flujo en cada registro (con bloqueo de edición según el estado) y botones de transición según permisos.
- Bandeja **Por aprobar** al inicio de la lista del módulo.
- Vistas **Tabla**, **Flujo** (tablero para arrastrar entre estados) y **Proceso** (mapa de estados, transiciones y bitácora).
- Historial de movimientos en cada registro y sección **Flujo de trabajo** en los dashboards.

**Compras ⇄ Inventario.** Los ítems de una orden de compra pueden ligarse a un artículo del inventario. Al ejecutar *Registrar recepción*, el sistema genera automáticamente un movimiento de **Entrada por compra** en borrador con las cantidades y costos de la orden; el almacén lo confirma (ahí se actualizan las existencias y el último costo del artículo). Las salidas no pueden dejar el stock en negativo, y la orden muestra el estado de su ingreso (*Al recibir la orden / Pendiente / Ingresado*).

**Auditoría (logs).** Toda creación, edición, eliminación y cambio de estado, además de inicios y cierres de sesión (incluidos los intentos fallidos), queda registrada automáticamente con usuario, rol, fecha y los valores anterior y nuevo de cada campo. El módulo es de solo lectura, permite filtrar por usuario, módulo, acción y fechas, y exportar a CSV. Las contraseñas nunca se guardan en el log. En el DEMO se conservan los últimos 1.500 eventos.

**Multiempresa.** El sistema administra varias empresas del grupo en una misma instalación:

- Cada empresa tiene sus propios terceros, compras, firmas, actividades, inventario y auditoría, con **numeración independiente** (cada una arranca en OC-0001, TER-0001…). Usuarios, roles y empresas son globales.
- Cada usuario tiene **empresas con acceso** y una **predeterminada** (*Usuarios → Editar*); el administrador accede a todas. Al ingresar entra a su empresa predeterminada y puede cambiar de empresa desde el selector de la barra superior; todos los módulos y dashboards se recargan con los datos de la empresa elegida. Un usuario sin empresas asignadas no puede ingresar.
- El módulo **Empresas** (alta, edición, inactivación, color distintivo) incluye una vista consolidada del grupo con indicadores por empresa. No se puede eliminar una empresa que ya tiene registros: se inactiva.
- El aislamiento lo aplica la capa de datos (`src/data/db.js`): toda lectura se filtra por la empresa activa y todo registro nuevo se sella con ella, de modo que ninguna pantalla puede mezclar datos de empresas distintas ni abrir un registro de otra empresa por URL. En producción se refuerza en la base de datos con *Row Level Security* (ver `db/schema.sql`).
- La auditoría registra los eventos de cada empresa en su propio historial; las sesiones, cambios de empresa y gestión de usuarios/roles son eventos globales del grupo.
- Demo: **ICS Matriz** (con todos los datos), **ICS Cloud** e **ICS Andina**. `admin` y `crojas` acceden a las tres; `lgomez` y `rvargas` a Matriz y Cloud; `amejia` solo a Matriz.

- **Navegación en rueda** a la izquierda: gira con la rueda del ratón, las flechas o el teclado (↑ ↓); en móvil se convierte en una barra inferior.
- **Primera vista = dashboard parametrizado** del usuario (en *Usuarios → Dashboards de inicio*). El rol Administrador ve todos.
- Cada lista tiene vista **Tabla** y vista **Flujo** (Kanban: arrastrar una tarjeta a otra columna ejecuta la transición si el flujo y los permisos lo permiten).
- Tema oscuro y claro; los colores corporativos están en `src/styles/theme.css` y `src/config/brand.js`.

## Usuarios DEMO

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `Ics2026*` | Administrador (acceso total, todos los dashboards) |
| `lgomez` | `Demo2026*` | Analista de compras |
| `crojas` | `Demo2026*` | Aprobador |
| `amejia` | `Demo2026*` | Líder de proyectos |
| `rvargas` | `Demo2026*` | Auditor interno |

El botón ↺ de la barra superior (solo administrador) restaura los datos de demostración.

## Ejecutar en local

```bash
npm install
npm run dev
```

## Desplegar en Vercel

1. Suba el proyecto a un repositorio Git (GitHub, GitLab o Bitbucket).
2. En Vercel: **Add New → Project**, importe el repositorio. Vercel detecta Vite automáticamente
   (build `npm run build`, salida `dist`). `vercel.json` ya incluye la reescritura para rutas SPA.
3. O desde la terminal: `npx vercel` (vista previa) y `npx vercel --prod`.

## Arquitectura

```
src/
  config/        brand.js (marca), modules.js (módulos, acciones CRUD, dashboards)
  data/          schema.js (relaciones maestro→detalle), db.js (repositorio CRUD), seed.js (datos DEMO)
  workflow/      definitions.js (estados y transiciones), engine.js (guardas, efectos, bitácora) — usado por todos los módulos
  auth/          AuthContext.jsx (sesión, can(modulo, accion), dashboards del usuario)
  components/    ModuleWheel, MasterDetailPage (motor genérico maestro-detalle), WorkflowPanels, DataTable, SignaturePad, ui
  modules/       compras, firmas, actividades, terceros, seguridad, dashboard
db/schema.sql    Esquema PostgreSQL de referencia para el backend productivo
```

Cada módulo de gestión es una **configuración** (campos del maestro, tablas detalle, columnas, KPIs)
que interpreta `MasterDetailPage`; añadir un módulo nuevo consiste en declarar su configuración y su workflow.

## Importante: alcance del DEMO

Esta versión guarda los datos en el `localStorage` del navegador y valida la contraseña en el cliente.
Es adecuada para demostraciones, **no para producción**. Para producción:

- Implementar la API (p. ej. funciones serverless de Vercel) sobre PostgreSQL con `db/schema.sql`
  y sustituir la implementación de `src/data/db.js` por llamadas a esa API.
- Autenticación en el servidor con contraseñas cifradas (bcrypt/argon2) y tokens (JWT/sesiones),
  y verificación de permisos también en el servidor.
