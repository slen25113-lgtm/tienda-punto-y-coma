# Entregas del proyecto

Tienda en línea **Punto & Coma** — papelería universitaria con pedidos por
WhatsApp. Este documento indica dónde está la evidencia de cada actividad.

Repositorio: <https://github.com/slen25113-lgtm/tienda-punto-y-coma>

| Actividad | Entregable | Dónde está |
|---|---|---|
| Presentación inicial del ecommerce con conexión a WhatsApp | Página de aterrizaje funcionando, con catálogo, carrito y envío del pedido por WhatsApp | [`frontend/index.html`](frontend/index.html) |
| Parcial 2 — Avance del ecommerce en el repositorio | Frontend y backend completos y versionados | [`frontend/`](frontend) y [`server.js`](server.js) + [`rutas/`](rutas) |
| Parcial 3 — Avance total del proyecto | Todo el proyecto en el repositorio, con historial de commits | Este repositorio |
| Actividad — SQL de la tienda en línea | Script de base de datos para MySQL / MariaDB | [`base-de-datos/tienda_punto_y_coma.sql`](base-de-datos/tienda_punto_y_coma.sql) |

---

## 1. Frontend

Página de aterrizaje en HTML, CSS y JavaScript, en archivos separados.

- [`frontend/index.html`](frontend/index.html) — tienda: catálogo, carrito, datos de entrega y vista previa del mensaje de WhatsApp.
- [`frontend/admin.html`](frontend/admin.html) — panel de consulta de pedidos registrados.
- [`frontend/css/estilos.css`](frontend/css/estilos.css) — estilos, con modo claro y oscuro y diseño adaptable a celular.
- [`frontend/js/app.js`](frontend/js/app.js) — pide el catálogo al servidor, arma el pedido y lo envía.
- [`frontend/js/admin.js`](frontend/js/admin.js) — consulta y muestra los pedidos.

El frontend **no tiene productos escritos en su código**: los pide al backend.

## 2. Backend

Servidor en Node.js con Express.

- [`server.js`](server.js) — servidor: entrega el frontend y monta la API.
- [`rutas/productos.js`](rutas/productos.js) — catálogo.
- [`rutas/pedidos.js`](rutas/pedidos.js) — registro y consulta de pedidos.

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/productos` | Entrega el catálogo |
| GET | `/api/productos/:id` | Un producto, o 404 si no existe |
| POST | `/api/pedidos` | Valida, calcula, guarda y devuelve el número de pedido |
| GET | `/api/pedidos` | Lista los pedidos registrados |
| GET | `/api/salud` | Comprueba que el servidor responde |

## 3. Base de datos

[`base-de-datos/tienda_punto_y_coma.sql`](base-de-datos/tienda_punto_y_coma.sql)
crea la base completa: 5 tablas relacionadas (`categorias`, `productos`,
`clientes`, `pedidos`, `pedido_detalle`), 2 vistas, los datos de ejemplo y 6
consultas de comprobación.

Se importa desde phpMyAdmin (pestaña **Importar**) o por consola:

```bash
mysql -u root -p < base-de-datos/tienda_punto_y_coma.sql
```

---

## Cómo ejecutar el proyecto

```bash
npm install
npm start
```

Luego abrir <http://localhost:3100>. El panel de pedidos queda en
<http://localhost:3100/admin.html>.

Requisitos: Node.js 18 o superior. Para la base de datos, MySQL 8 o MariaDB
10.4 (el que trae XAMPP).

## Comprobaciones realizadas

- **Flujo completo de la tienda:** se arma un pedido en el navegador, el
  servidor lo registra con su número (`PYC-000001`, `PYC-000002`…), queda
  guardado y aparece en el panel de pedidos. Sin errores en la consola.
- **API:** pedido válido responde `201` con el número y el total calculado por
  el servidor; pedidos inválidos (sin nombre, producto inexistente, domicilio
  sin dirección) responden `400` con el detalle del error.
- **Base de datos:** el script se ejecutó completo en MariaDB 11.4 sin errores.
  Las 6 consultas finales devuelven datos correctos y el total vendido
  ($69.600) coincide con el que registra la aplicación.
- **Restricciones de la base:** se probaron una por una y rechazan lo que
  deben rechazar — domicilio sin dirección, número de pedido repetido, total
  descuadrado, producto inexistente, cantidad cero, precio negativo, categoría
  inexistente y borrado de un producto con pedidos.

## Alcance

Proyecto académico. Los productos, precios y datos de cliente son de ejemplo.
No procesa pagos, no descuenta inventario y no confirma el pedido
automáticamente: el cliente pulsa «Enviar» en su propio WhatsApp y la papelería
responde. Automatizar esa confirmación exigiría la API oficial de WhatsApp
Business, con empresa verificada en Meta y costos según sus tarifas.
