/**
 * Pedidos.
 *
 *   POST /api/pedidos     registra un pedido y devuelve su numero
 *   GET  /api/pedidos     lista los pedidos registrados (panel admin.html)
 *
 * Decisiones importantes para la sustentacion:
 *
 *  - El backend NO confia en los precios ni en los totales que manda el
 *    navegador: vuelve a calcularlos con el catalogo del servidor. Si el
 *    cliente manipulara el precio desde la consola, el pedido se registra
 *    igual con el precio real.
 *  - El numero de pedido lo asigna el servidor (PYC-000001, PYC-000002...),
 *    no el navegador, para que nunca se repita.
 *  - El texto que se envia por WhatsApp tambien lo arma el servidor, asi el
 *    mensaje que recibe la papeleria coincide con lo guardado.
 *  - Los pedidos se guardan en datos/pedidos.json. Es suficiente para este
 *    proyecto; en produccion se cambiaria por una base de datos sin tocar
 *    el frontend, porque el contrato de la API no cambiaria.
 */

const express = require("express")
const fs = require("fs/promises")
const path = require("path")

const { leerCatalogo } = require("./productos")

const router = express.Router()
const ARCHIVO = path.join(__dirname, "..", "datos", "pedidos.json")

const COSTO_DOMICILIO = 5000
const ENTREGAS = ["campus", "domicilio"]

// Evita que dos pedidos simultaneos se sobrescriban: cada escritura espera a
// que termine la anterior.
let escrituraEnCurso = Promise.resolve()

async function leerPedidos() {
  try {
    return JSON.parse(await fs.readFile(ARCHIVO, "utf8"))
  } catch (error) {
    if (error.code === "ENOENT") return []
    throw error
  }
}

function guardarPedido(pedido) {
  escrituraEnCurso = escrituraEnCurso.then(async () => {
    const pedidos = await leerPedidos()
    pedidos.push(pedido)
    await fs.writeFile(ARCHIVO, JSON.stringify(pedidos, null, 2) + "\n", "utf8")
    return pedido
  })
  return escrituraEnCurso
}

function pesos(valor) {
  return "$" + valor.toLocaleString("es-CO")
}

/** Revisa el pedido que llega del navegador. Devuelve { errores, datos }. */
function validar(cuerpo, catalogo) {
  const errores = []
  const cliente = typeof cuerpo.cliente === "string" ? cuerpo.cliente.trim() : ""
  const entrega = cuerpo.entrega
  const direccion = typeof cuerpo.direccion === "string" ? cuerpo.direccion.trim() : ""
  const nota = typeof cuerpo.nota === "string" ? cuerpo.nota.trim() : ""

  if (cliente.length < 3) errores.push("El nombre del cliente es obligatorio (minimo 3 caracteres).")
  if (!ENTREGAS.includes(entrega)) errores.push('La entrega debe ser "campus" o "domicilio".')
  if (entrega === "domicilio" && direccion.length < 5) {
    errores.push("Para entrega a domicilio se necesita la direccion.")
  }
  if (!Array.isArray(cuerpo.items) || cuerpo.items.length === 0) {
    errores.push("El pedido no tiene productos.")
  }

  const items = []
  if (Array.isArray(cuerpo.items)) {
    for (const item of cuerpo.items) {
      const producto = catalogo.find((p) => p.id === item?.id)
      const cantidad = Number(item?.cantidad)

      if (!producto) {
        errores.push(`El producto ${item?.id ?? "(sin id)"} no existe en el catalogo.`)
        continue
      }
      if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 50) {
        errores.push(`Cantidad invalida para ${producto.id}: debe ser un entero entre 1 y 50.`)
        continue
      }
      // El precio sale del catalogo del servidor, no del navegador.
      items.push({
        id: producto.id,
        nombre: producto.nombre,
        cantidad,
        precioUnitario: producto.precio,
        subtotal: producto.precio * cantidad,
      })
    }
  }

  return { errores, datos: { cliente, entrega, direccion, nota, items } }
}

function armarMensajeWhatsApp(pedido) {
  const lineas = []
  lineas.push("*Nuevo pedido · Punto & Coma*")
  lineas.push(`Pedido: ${pedido.numero}`)
  lineas.push(`Cliente: ${pedido.cliente}`)
  lineas.push("")
  for (const item of pedido.items) {
    lineas.push(`• ${item.cantidad} × ${item.nombre} (${item.id}) — ${pesos(item.subtotal)}`)
  }
  lineas.push("")
  lineas.push(`Subtotal: ${pesos(pedido.subtotal)}`)
  lineas.push(
    pedido.entrega === "domicilio"
      ? `Entrega: Domicilio (${pesos(pedido.costoEntrega)})`
      : "Entrega: Recoger en Bloque C, local 104"
  )
  if (pedido.entrega === "domicilio") lineas.push(`Direccion: ${pedido.direccion}`)
  lineas.push(`*Total: ${pesos(pedido.total)}*`)
  if (pedido.nota) lineas.push(`Nota: ${pedido.nota}`)
  return lineas.join("\n")
}

router.post("/", async (peticion, respuesta, siguiente) => {
  try {
    const catalogo = await leerCatalogo()
    const { errores, datos } = validar(peticion.body ?? {}, catalogo)

    if (errores.length > 0) {
      return respuesta.status(400).json({ error: "Pedido invalido", detalles: errores })
    }

    const subtotal = datos.items.reduce((suma, item) => suma + item.subtotal, 0)
    const costoEntrega = datos.entrega === "domicilio" ? COSTO_DOMICILIO : 0
    const registrados = await leerPedidos()

    const pedido = {
      numero: "PYC-" + String(registrados.length + 1).padStart(6, "0"),
      fecha: new Date().toISOString(),
      cliente: datos.cliente,
      entrega: datos.entrega,
      direccion: datos.direccion,
      nota: datos.nota,
      items: datos.items,
      subtotal,
      costoEntrega,
      total: subtotal + costoEntrega,
      estado: "recibido",
    }
    pedido.mensajeWhatsApp = armarMensajeWhatsApp(pedido)

    await guardarPedido(pedido)
    console.log(`  -> pedido ${pedido.numero} registrado por ${pedido.total}`)

    respuesta.status(201).json(pedido)
  } catch (error) {
    siguiente(error)
  }
})

router.get("/", async (_peticion, respuesta, siguiente) => {
  try {
    const pedidos = await leerPedidos()
    const totalVendido = pedidos.reduce((suma, pedido) => suma + pedido.total, 0)
    respuesta.json({ total: pedidos.length, totalVendido, pedidos: pedidos.slice().reverse() })
  } catch (error) {
    siguiente(error)
  }
})

module.exports = router
