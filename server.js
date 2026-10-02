/**
 * Servidor de la tienda Punto & Coma.
 *
 * Hace dos cosas:
 *   1. Entrega el frontend (la pagina de aterrizaje) como archivos estaticos.
 *   2. Expone la API en /api: catalogo de productos y registro de pedidos.
 *
 * Arranque:  npm install  y luego  npm start
 */

const express = require("express")
const path = require("path")

const rutasProductos = require("./rutas/productos")
const rutasPedidos = require("./rutas/pedidos")

const app = express()
const PUERTO = process.env.PORT || 3100

// Permite recibir cuerpos JSON en los POST (el navegador manda el pedido asi).
app.use(express.json({ limit: "100kb" }))

// Deja una linea en consola por cada peticion. Sirve para mostrar en la
// sustentacion que el frontend realmente esta llamando al backend.
app.use((peticion, _respuesta, siguiente) => {
  const hora = new Date().toLocaleTimeString("es-CO")
  console.log(`[${hora}] ${peticion.method} ${peticion.originalUrl}`)
  siguiente()
})

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
app.use("/api/productos", rutasProductos)
app.use("/api/pedidos", rutasPedidos)

app.get("/api/salud", (_peticion, respuesta) => {
  respuesta.json({ estado: "ok", fecha: new Date().toISOString() })
})

// Cualquier otra ruta bajo /api no existe: responde JSON, no HTML.
app.use("/api", (_peticion, respuesta) => {
  respuesta.status(404).json({ error: "Recurso no encontrado" })
})

// ---------------------------------------------------------------------------
// Frontend
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, "frontend")))

// Manejador de errores: si algo falla, el cliente recibe JSON y el detalle
// queda en la consola del servidor, nunca en la respuesta.
app.use((error, _peticion, respuesta, _siguiente) => {
  console.error("Error no controlado:", error)
  respuesta.status(500).json({ error: "Error interno del servidor" })
})

app.listen(PUERTO, () => {
  console.log(`\nTienda Punto & Coma`)
  console.log(`Frontend:  http://localhost:${PUERTO}`)
  console.log(`Pedidos:   http://localhost:${PUERTO}/admin.html`)
  console.log(`API:       http://localhost:${PUERTO}/api/productos\n`)
})
