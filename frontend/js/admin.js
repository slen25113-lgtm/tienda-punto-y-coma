/**
 * Panel de pedidos: consulta GET /api/pedidos y los muestra en una tabla.
 * Solo lee; no modifica nada en el servidor.
 */
(function () {
  const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const money = v => cop.format(v).replace(/ /g, ' ');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = id => document.getElementById(id);

  function fecha(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) + ' · ' +
      d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  }

  async function cargar() {
    try {
      const respuesta = await fetch('/api/pedidos');
      if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
      const datos = await respuesta.json();

      $('resumen').innerHTML =
        `<span><b>Pedidos:</b> ${datos.total}</span>` +
        `<span><b>Total vendido:</b> ${money(datos.totalVendido)}</span>`;

      if (datos.total === 0) {
        const estado = $('estado');
        estado.hidden = false;
        estado.textContent = 'Todavía no hay pedidos. Envía uno desde la tienda y recarga esta página.';
        return;
      }

      $('cuerpo').innerHTML = datos.pedidos.map(p => `
        <tr>
          <td class="num">${esc(p.numero)}</td>
          <td class="num">${fecha(p.fecha)}</td>
          <td>${esc(p.cliente)}${p.nota ? `<br><small>Nota: ${esc(p.nota)}</small>` : ''}</td>
          <td><ul>${p.items.map(i => `<li>${i.cantidad} × ${esc(i.nombre)}</li>`).join('')}</ul></td>
          <td>${p.entrega === 'domicilio' ? 'Domicilio' : 'Recoge en campus'}${p.direccion ? `<br><small>${esc(p.direccion)}</small>` : ''}</td>
          <td class="num">${money(p.total)}</td>
        </tr>`).join('');
      $('tabla-wrap').hidden = false;
    } catch (error) {
      $('resumen').textContent = '';
      const estado = $('estado');
      estado.hidden = false;
      estado.className = 'estado error';
      estado.textContent = 'No se pudo consultar el servidor. Revisa que esté encendido (npm start).';
      console.error('Error al consultar pedidos:', error);
    }
  }

  cargar();
})();
