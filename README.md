# Tienda Punto & Coma — página de aterrizaje con frontend y backend

Proyecto universitario. Tienda en línea de una papelería universitaria: el
cliente arma su pedido en la página, el servidor lo registra y el pedido se
envía a la papelería por WhatsApp.

**Prototipo académico.** Los productos, precios y datos de cliente son de
ejemplo. No se procesan pagos.

---

## Requisitos

- Node.js 18 o superior (probado con Node 24).
- Un navegador moderno (Chrome, Edge, Firefox).

## Cómo ejecutarlo

```bash
npm install
npm start
```

Luego abre en el navegador:

| Página | Dirección |
|---|---|
| Tienda (página de aterrizaje) | http://localhost:3100 |
| Panel de pedidos registrados | http://localhost:3100/admin.html |
| API del catálogo | http://localhost:3100/api/productos |

Para desarrollo, `npm run dev` reinicia el servidor al guardar cambios.

---

## Estructura del proyecto

```
tienda-punto-y-coma/
├── server.js              Servidor Express: sirve el frontend y monta la API
├── package.json           Dependencias y comandos
├── rutas/
│   ├── productos.js       GET /api/productos  · GET /api/productos/:id
│   └── pedidos.js         POST /api/pedidos   · GET /api/pedidos
├── datos/
│   ├── productos.json     Catálogo (9 productos)
│   └── pedidos.json       Pedidos registrados (lo escribe el servidor)
└── frontend/
    ├── index.html         Página de aterrizaje: catálogo, carrito y pedido
    ├── admin.html         Panel de consulta de pedidos
    ├── css/estilos.css    Estilos, incluye modo claro y oscuro
    └── js/
        ├── app.js         Lógica de la tienda y llamadas a la API
        └── admin.js       Consulta y tabla de pedidos
```

El frontend y el backend están separados: el frontend no tiene ningún producto
ni precio escrito en su código, y el backend no genera HTML. Se comunican solo
por la API en formato JSON.

---

## API

### `GET /api/productos`

Devuelve el catálogo completo.

```json
{
  "total": 9,
  "productos": [
    {
      "id": "CU-175",
      "nombre": "Cuaderno argollado 5 materias",
      "especificacion": "175 hojas · cuadriculado 7 mm",
      "precio": 18900,
      "categoria": "Cuadernos",
      "dibujo": "cuaderno",
      "existencias": 40
    }
  ]
}
```

### `GET /api/productos/:id`

Un producto. Responde `404` con `{ "error": "Producto no encontrado" }` si el
código no existe.

### `POST /api/pedidos`

Registra un pedido. Cuerpo de la petición:

```json
{
  "cliente": "Laura Gómez",
  "entrega": "campus",
  "direccion": "",
  "nota": "Paso a las 10:00 a. m.",
  "items": [
    { "id": "CU-175", "cantidad": 2 },
    { "id": "ES-R04", "cantidad": 1 }
  ]
}
```

El navegador **no envía precios ni totales**: solo el código del producto y la
cantidad. Respuesta `201`:

```json
{
  "numero": "PYC-000001",
  "fecha": "2026-10-01T22:14:03.221Z",
  "cliente": "Laura Gómez",
  "entrega": "campus",
  "items": [
    { "id": "CU-175", "nombre": "Cuaderno argollado 5 materias", "cantidad": 2, "precioUnitario": 18900, "subtotal": 37800 }
  ],
  "subtotal": 50700,
  "costoEntrega": 0,
  "total": 50700,
  "estado": "recibido",
  "mensajeWhatsApp": "*Nuevo pedido · Punto & Coma*\nPedido: PYC-000001\n…"
}
```

Si los datos están mal, responde `400`:

```json
{
  "error": "Pedido invalido",
  "detalles": ["El nombre del cliente es obligatorio (minimo 3 caracteres)."]
}
```

### `GET /api/pedidos`

Lista los pedidos registrados, del más reciente al más antiguo, con el total
vendido. Es lo que consume `admin.html`.

### `GET /api/salud`

Comprobación de que el servidor responde.

---

## Decisiones técnicas (para la sustentación)

1. **El servidor no confía en el navegador.** Recalcula precios y totales con
   su propio catálogo. Si alguien modificara el precio desde la consola del
   navegador, el pedido se guarda con el precio real.
2. **El número de pedido lo asigna el servidor** (`PYC-000001`, `PYC-000002`…),
   nunca el cliente, para que no se repita.
3. **El texto de WhatsApp lo arma el backend**, así el mensaje que recibe la
   papelería coincide exactamente con lo que quedó registrado.
4. **Validación en los dos lados.** El navegador avisa de lo que falta antes de
   enviar; el servidor vuelve a validar todo porque las peticiones pueden
   llegar sin pasar por la página.
5. **Persistencia en archivo JSON.** Suficiente para este alcance y no obliga a
   instalar una base de datos. Como el frontend solo conoce la API, cambiar a
   MySQL o PostgreSQL no obligaría a modificar el frontend.
6. **Escrituras en cola.** Dos pedidos simultáneos no se sobrescriben: cada
   escritura espera a que termine la anterior.

## Flujo del pedido

1. La página carga y pide el catálogo con `GET /api/productos`.
2. El cliente agrega productos, escribe su nombre y elige la entrega.
3. Al pulsar **Registrar pedido**, el navegador hace `POST /api/pedidos`.
4. El servidor valida, calcula, guarda en `datos/pedidos.json` y responde con
   el número de pedido y el texto del mensaje.
5. La página muestra el número y un botón que abre WhatsApp con ese texto
   mediante un enlace `wa.me`.
6. El pedido queda visible en `admin.html`.

## Número de WhatsApp

En el pedido hay un campo **Número de WhatsApp del negocio**. Si se deja vacío,
WhatsApp abre el mensaje y deja elegir el chat, lo que sirve para probar. Con un
número (indicativo + celular, solo dígitos) el mensaje va directo a ese chat.

## Lo que este proyecto no hace

- No cobra ni procesa pagos en línea.
- No descuenta existencias del catálogo.
- No confirma el pedido automáticamente por WhatsApp: el cliente pulsa «Enviar»
  en su propio WhatsApp y la papelería responde a mano. Automatizarlo exige la
  API oficial de WhatsApp Business, con empresa verificada en Meta y costos
  según sus tarifas.
- No tiene autenticación: el panel de pedidos es abierto, porque es una
  demostración académica en un servidor local.

---

## Base de datos (MySQL / MariaDB)

El script está en [`base-de-datos/tienda_punto_y_coma.sql`](base-de-datos/tienda_punto_y_coma.sql).
Crea la base, las tablas, las vistas, los datos de ejemplo y deja al final seis
consultas de comprobación.

### Cómo importarlo

**Con XAMPP y phpMyAdmin**

1. Inicia **Apache** y **MySQL** en el panel de XAMPP.
2. Abre `http://localhost/phpmyadmin`.
3. Pestaña **Importar** → **Seleccionar archivo** → elige `tienda_punto_y_coma.sql`.
4. Pulsa **Continuar**. El script crea la base `tienda_punto_y_coma` desde cero.

**Por consola**

```bash
mysql -u root -p < base-de-datos/tienda_punto_y_coma.sql
```

### Tablas

| Tabla | Para qué sirve |
|---|---|
| `categorias` | Agrupa los productos (Cuadernos, Escritura, Dibujo técnico, Tecnología, Laboratorio) |
| `productos` | Catálogo. La llave primaria es el código del producto (`CU-175`) |
| `clientes` | Quién hace el pedido |
| `pedidos` | Cabecera: número, entrega, totales y estado |
| `pedido_detalle` | Líneas del pedido: producto, cantidad y precio del día |

Dos vistas: `v_catalogo` (catálogo con el nombre de la categoría) y
`v_pedidos_resumen` (pedidos con cliente, número de artículos y total).

### Decisiones del modelo

- **`DECIMAL` para el dinero**, nunca `FLOAT`: los números flotantes pierden
  exactitud al sumar y eso en pesos se nota.
- **El precio se copia en `pedido_detalle`**, porque si mañana sube el precio
  del cuaderno, el pedido viejo debe conservar lo que se cobró ese día.
- **Llaves foráneas con `RESTRICT`** en productos y clientes: no se puede
  borrar un producto que ya aparece en un pedido. En `pedido_detalle` se usa
  `CASCADE`, porque borrar un pedido sí debe borrar sus líneas.
- **Restricciones `CHECK`**: cantidad entre 1 y 50, precio mayor que cero,
  total igual a subtotal más entrega, y un domicilio no puede quedar sin
  dirección.
- **`subtotal` es columna generada**: la calcula el motor
  (`cantidad * precio_unitario`), así nunca queda descuadrada.

### Comprobación realizada

El script se ejecutó completo en **MariaDB 11.4** sin errores: crea las 5
tablas, inserta los 9 productos y los 2 pedidos de ejemplo, y las 6 consultas
finales devuelven datos correctos (total vendido $69.600, el mismo que
registra la aplicación).

Las restricciones se probaron una por una y rechazan lo que deben rechazar:
domicilio sin dirección, número de pedido repetido, total descuadrado,
producto inexistente, cantidad cero, precio negativo, categoría inexistente y
borrado de un producto con pedidos.
