/**
 * Catalogo de productos.
 *
 *   GET /api/productos        lista completa
 *   GET /api/productos/:id    un producto
 *
 * Los datos viven en datos/productos.json. El frontend no tiene productos
 * escritos en su codigo: los pide aqui al cargar la pagina.
 */

const express = require("express")
const fs = require("fs/promises")
const path = require("path")

const router = express.Router()
const ARCHIVO = path.join(__dirname, "..", "datos", "productos.json")

async function leerCatalogo() {
  const contenido = await fs.readFile(ARCHIVO, "utf8")
  return JSON.parse(contenido)
}

router.get("/", async (_peticion, respuesta, siguiente) => {
  try {
    const productos = await leerCatalogo()
    respuesta.json({ total: productos.length, productos })
  } catch (error) {
    siguiente(error)
  }
})

router.get("/:id", async (peticion, respuesta, siguiente) => {
  try {
    const productos = await leerCatalogo()
    const producto = productos.find((p) => p.id === peticion.params.id)

    if (!producto) {
      return respuesta.status(404).json({ error: "Producto no encontrado" })
    }
    respuesta.json(producto)
  } catch (error) {
    siguiente(error)
  }
})

module.exports = router
module.exports.leerCatalogo = leerCatalogo
