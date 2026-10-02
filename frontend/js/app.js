/**
 * Frontend de la tienda Punto & Coma.
 *
 * No tiene productos escritos aqui: los pide al backend (GET /api/productos).
 * Al enviar, registra el pedido en el backend (POST /api/pedidos) y solo
 * despues abre WhatsApp con el texto que devolvio el servidor.
 */
(function () {
  const SHIP = 5000;
  const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const money = v => cop.format(v).replace(/ /g, ' ');

  const range = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');
  const ART = {
    cuaderno:`<svg viewBox="0 0 120 90" aria-hidden="true"><rect x="34" y="8" width="58" height="74" rx="4" class="fs"/><rect x="34" y="8" width="14" height="74" class="fc"/>${range(6,i=>`<line x1="54" y1="${24+i*9}" x2="86" y2="${24+i*9}" class="thin"/>`)}${range(7,i=>`<circle cx="34" cy="${14+i*10.5}" r="3.2" class="fs"/>`)}</svg>`,
    ingenieria:`<svg viewBox="0 0 120 90" aria-hidden="true"><rect x="28" y="10" width="64" height="72" rx="3" class="fg"/>${range(9,i=>`<line x1="${34+i*7}" y1="14" x2="${34+i*7}" y2="78" class="thin"/>`)}${range(9,i=>`<line x1="30" y1="${18+i*7}" x2="90" y2="${18+i*7}" class="thin"/>`)}<path d="M40 66 L56 36 L66 52 L80 28" class="st"/></svg>`,
    portaminas:`<svg viewBox="0 0 120 90" aria-hidden="true"><g transform="rotate(-28 60 45)"><path d="M16 39 L4 45 L16 51 Z" class="fs"/><line x1="4" y1="45" x2="-2" y2="45" class="st"/><rect x="16" y="38" width="78" height="14" rx="3" class="fc"/><rect x="30" y="38" width="16" height="14" class="fi"/><rect x="94" y="40" width="14" height="10" rx="2" class="fs"/><rect x="62" y="35" width="26" height="4" rx="2" class="fi"/></g></svg>`,
    resaltadores:`<svg viewBox="0 0 120 90" aria-hidden="true">${[['fh',0],['fp',1],['fc',2],['fg',3]].map(([c,i])=>`<g transform="rotate(${-8+i*5} ${34+i*17} 45)"><rect x="${26+i*17}" y="22" width="15" height="58" rx="3" class="fs"/><rect x="${26+i*17}" y="10" width="15" height="18" rx="3" class="${c}"/></g>`).join('')}</svg>`,
    calculadora:`<svg viewBox="0 0 120 90" aria-hidden="true"><rect x="36" y="4" width="48" height="82" rx="7" class="fs"/><rect x="42" y="11" width="36" height="16" rx="2" class="fg"/><text x="75" y="23" text-anchor="end" style="font:500 9px var(--mono);fill:var(--ink)">3.1416</text>${range(20,i=>`<rect x="${42+(i%4)*9.4}" y="${33+Math.floor(i/4)*9.6}" width="7" height="6.4" rx="1.5" class="${i===19?'fh':(i%4===3?'fc':'fs')}" style="stroke-width:1.4"/>`)}</svg>`,
    usb:`<svg viewBox="0 0 120 90" aria-hidden="true"><g transform="rotate(-20 60 45)"><rect x="22" y="32" width="58" height="26" rx="6" class="fi"/><rect x="80" y="36" width="24" height="18" rx="1" class="fs"/><rect x="86" y="41" width="5" height="4" class="fi"/><rect x="95" y="41" width="5" height="4" class="fi"/><circle cx="32" cy="45" r="4" class="fh"/><text x="58" y="49" text-anchor="middle" style="font:500 10px var(--mono);fill:var(--paper)">64GB</text></g></svg>`,
    regla:`<svg viewBox="0 0 120 90" aria-hidden="true"><g transform="rotate(-14 60 45)"><rect x="2" y="32" width="116" height="24" rx="2" class="fs"/>${range(24,i=>`<line x1="${7+i*4.6}" y1="32" x2="${7+i*4.6}" y2="${i%5===0?44:38}" class="st" style="stroke-width:1.4"/>`)}<text x="96" y="52" style="font:500 8px var(--mono);fill:var(--ink)">cm</text></g></svg>`,
    bata:`<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M44 8 L60 18 L76 8 L98 20 L108 58 L94 62 L88 42 L88 86 L32 86 L32 42 L26 62 L12 58 L22 20 Z" class="fs"/><path d="M60 18 L52 34 L60 86 M60 18 L68 34 L60 86" class="st"/><rect x="38" y="56" width="14" height="12" rx="2" class="st"/><rect x="70" y="30" width="10" height="4" rx="1" class="fc" style="stroke-width:1.4"/><circle cx="62" cy="50" r="1.8" class="fi"/><circle cx="62" cy="64" r="1.8" class="fi"/></svg>`,
    block:`<svg viewBox="0 0 120 90" aria-hidden="true"><rect x="24" y="14" width="72" height="68" class="fs"/><rect x="24" y="6" width="72" height="10" class="fi"/><circle cx="50" cy="48" r="16" class="st"/><path d="M62 70 L88 70 L88 36 Z" class="st"/><line x1="50" y1="48" x2="66" y2="48" class="thin"/><circle cx="50" cy="48" r="2" class="fi"/></svg>`
  };

  // Catalogo: se llena con lo que responda el backend.
  let PRODUCTS = [];
  let byId = {};
  let CATS = ['Todo'];

  const KEY = 'pyc-tienda-v1';
  let state = { cart: {}, cat: 'Todo', cliente: '', entrega: 'campus', direccion: '', nota: '', wa: '' };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') state = Object.assign(state, s);
  } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  $('ship-fee').textContent = money(SHIP);

  /** Pide el catalogo al backend. */
  async function cargarCatalogo() {
    const estado = $('estado-catalogo');
    estado.hidden = false;
    estado.className = 'estado';
    estado.textContent = 'Cargando catálogo desde el servidor…';

    try {
      const respuesta = await fetch('/api/productos');
      if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
      const datos = await respuesta.json();

      PRODUCTS = datos.productos.map(p => ({
        id: p.id, name: p.nombre, spec: p.especificacion,
        price: p.precio, cat: p.categoria, art: p.dibujo, stock: p.existencias
      }));
      byId = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
      CATS = ['Todo', ...new Set(PRODUCTS.map(p => p.cat))];
      if (!CATS.includes(state.cat)) state.cat = 'Todo';

      // Descarta del carrito guardado lo que ya no exista en el catalogo.
      for (const id of Object.keys(state.cart)) if (!byId[id]) delete state.cart[id];

      estado.hidden = true;
      renderFilters(); renderGrid(); renderOrder();
    } catch (error) {
      estado.className = 'estado error';
      estado.textContent = 'No se pudo cargar el catálogo. Revisa que el servidor esté encendido (npm start) y recarga la página.';
      console.error('Error al cargar el catálogo:', error);
    }
  }

  function renderFilters() {
    $('filters').innerHTML = CATS.map(c => {
      const n = c === 'Todo' ? PRODUCTS.length : PRODUCTS.filter(p => p.cat === c).length;
      return `<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="${state.cat === c}">${esc(c)}<span class="c">${n}</span></button>`;
    }).join('');
  }

  function renderGrid() {
    const list = PRODUCTS.filter(p => state.cat === 'Todo' || p.cat === state.cat);
    $('grid').innerHTML = list.map(p => {
      const q = state.cart[p.id] || 0;
      const ctl = q
        ? `<span class="stepper" aria-label="Cantidad de ${esc(p.name)}"><button type="button" data-dec="${p.id}" aria-label="Quitar uno">−</button><span>${q}</span><button type="button" data-inc="${p.id}" aria-label="Agregar uno">+</button></span>`
        : `<button type="button" class="add" data-inc="${p.id}">Agregar</button>`;
      return `<article class="product"><div class="art">${ART[p.art] || ''}</div><div class="pbody"><span class="sku">${p.id} · ${esc(p.cat)}</span><h3 class="pname">${esc(p.name)}</h3><p class="spec">${esc(p.spec)}</p><div class="prow"><span class="price">${money(p.price)}</span>${ctl}</div></div></article>`;
    }).join('');
  }

  function totals() {
    const items = Object.entries(state.cart).filter(([id, q]) => byId[id] && q > 0).map(([id, q]) => ({ p: byId[id], q }));
    const units = items.reduce((a, i) => a + i.q, 0);
    const sub = items.reduce((a, i) => a + i.q * i.p.price, 0);
    const ship = items.length && state.entrega === 'domicilio' ? SHIP : 0;
    return { items, units, sub, ship, total: sub + ship };
  }

  /** Vista previa del mensaje. El texto definitivo lo arma el backend. */
  function buildMessage(t) {
    const L = [];
    L.push('*Nuevo pedido · Punto & Coma*');
    L.push(`Cliente: ${state.cliente.trim() || '(sin nombre)'}`);
    L.push('');
    t.items.forEach(i => L.push(`• ${i.q} × ${i.p.name} (${i.p.id}) — ${money(i.q * i.p.price)}`));
    L.push('');
    L.push(`Subtotal: ${money(t.sub)}`);
    L.push(state.entrega === 'domicilio' ? `Entrega: Domicilio (${money(SHIP)})` : 'Entrega: Recoger en Bloque C, local 104');
    if (state.entrega === 'domicilio' && state.direccion.trim()) L.push(`Dirección: ${state.direccion.trim()}`);
    L.push(`*Total: ${money(t.total)}*`);
    if (state.nota.trim()) L.push(`Nota: ${state.nota.trim()}`);
    return L.join('\n');
  }

  function digitosWa() {
    const d = state.wa.replace(/\D/g, '');
    return { d, valido: d.length >= 10 && d.length <= 15 };
  }

  function renderOrder() {
    const t = totals();
    $('order-count').textContent = `${t.units} ${t.units === 1 ? 'artículo' : 'artículos'}`;
    $('bar-count').textContent = t.units;
    $('lines').innerHTML = t.items.map(i => `<li class="line"><span class="ln">${esc(i.p.name)}</span><span class="lt">${money(i.q * i.p.price)}</span><span class="stepper" aria-label="Cantidad de ${esc(i.p.name)}"><button type="button" data-dec="${i.p.id}" aria-label="Quitar uno">−</button><span>${i.q}</span><button type="button" data-inc="${i.p.id}" aria-label="Agregar uno">+</button></span><span class="lu">${money(i.p.price)} c/u</span></li>`).join('');
    $('empty').hidden = t.items.length > 0;
    $('t-sub').textContent = money(t.sub);
    $('t-ship').textContent = state.entrega === 'domicilio' ? money(t.ship) : 'Sin costo';
    $('t-total').textContent = money(t.total);
    $('dir-wrap').hidden = state.entrega !== 'domicilio';

    const msg = buildMessage(t);
    const ahora = new Date();
    $('bubble').innerHTML = esc(msg).replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>') +
      `<time>${ahora.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}</time>`;

    const { d, valido } = digitosWa();
    const help = $('wa-help');
    if (d && !valido) { help.textContent = 'El número debe tener entre 10 y 15 dígitos, con indicativo de país (57 para Colombia).'; help.classList.add('err'); }
    else if (valido) { help.textContent = `Los pedidos se enviarán a +${d}.`; help.classList.remove('err'); }
    else { help.textContent = 'Sin número, WhatsApp abre el mensaje y te deja elegir el chat. Útil para la demo.'; help.classList.remove('err'); }

    const send = $('send'), sh = $('send-help');
    let falta = '';
    if (!PRODUCTS.length) falta = 'El catálogo aún no se ha cargado.';
    else if (!t.items.length) falta = 'Agrega al menos un producto para enviar el pedido.';
    else if (!state.cliente.trim()) falta = 'Escribe tu nombre para enviar el pedido.';
    else if (state.entrega === 'domicilio' && !state.direccion.trim()) falta = 'Escribe la dirección de entrega.';
    else if (d && !valido) falta = 'Corrige el número de WhatsApp del negocio.';

    send.disabled = Boolean(falta);
    sh.classList.remove('err');
    sh.textContent = falta || 'Se registra el pedido en el servidor y luego abres WhatsApp.';

    const f = $('float');
    f.hidden = !t.items.length;
    $('float-n').textContent = `Ver pedido (${t.units})`;
    $('float-t').textContent = money(t.total);
  }

  /** Envia el pedido al backend y muestra el numero que asigno el servidor. */
  async function enviarPedido() {
    const t = totals();
    const send = $('send'), sh = $('send-help'), conf = $('confirmacion');

    send.disabled = true;
    sh.classList.remove('err');
    sh.textContent = 'Registrando el pedido en el servidor…';

    try {
      const respuesta = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: state.cliente.trim(),
          entrega: state.entrega,
          direccion: state.direccion.trim(),
          nota: state.nota.trim(),
          items: t.items.map(i => ({ id: i.p.id, cantidad: i.q }))
        })
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        sh.classList.add('err');
        sh.textContent = (datos.detalles && datos.detalles.join(' ')) || datos.error || 'No se pudo registrar el pedido.';
        send.disabled = false;
        return;
      }

      const { d, valido } = digitosWa();
      $('conf-numero').textContent = datos.numero;
      $('conf-total').textContent = money(datos.total);
      $('conf-abrir').href = `https://wa.me/${valido ? d : ''}?text=${encodeURIComponent(datos.mensajeWhatsApp)}`;
      conf.hidden = false;

      state.cart = {};
      save();
      renderGrid();
      renderOrder();
      sh.textContent = 'Pedido registrado en el servidor. Ahora ábrelo en WhatsApp.';
      conf.scrollIntoView({ block: 'nearest' });
    } catch (error) {
      sh.classList.add('err');
      sh.textContent = 'No hay conexión con el servidor. Revisa que esté encendido (npm start) e intenta de nuevo.';
      send.disabled = false;
      console.error('Error al registrar el pedido:', error);
    }
  }

  function change(id, d) {
    const q = Math.max(0, (state.cart[id] || 0) + d);
    if (q) state.cart[id] = q; else delete state.cart[id];
    $('confirmacion').hidden = true;
    save(); renderGrid(); renderOrder();
  }

  document.addEventListener('click', e => {
    const inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]'), chip = e.target.closest('[data-cat]');
    if (inc) change(inc.dataset.inc, 1);
    else if (dec) change(dec.dataset.dec, -1);
    else if (chip) { state.cat = chip.dataset.cat; save(); renderFilters(); renderGrid(); }
  });
  $('send').addEventListener('click', enviarPedido);

  const bind = (id, key) => {
    const el = $(id);
    el.value = state[key];
    el.addEventListener('input', () => { state[key] = el.value; save(); renderOrder(); });
  };
  bind('cliente', 'cliente'); bind('direccion', 'direccion'); bind('nota', 'nota'); bind('wa-numero', 'wa');
  document.querySelectorAll('input[name="entrega"]').forEach(r => {
    r.checked = r.value === state.entrega;
    r.addEventListener('change', () => { if (r.checked) { state.entrega = r.value; save(); renderOrder(); } });
  });

  renderOrder();
  cargarCatalogo();
})();
