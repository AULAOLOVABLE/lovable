import './styles.css'
import { supabase } from './lib/supabase.js'
import { WHATSAPP_NUMBER } from './config.js'

const CART_KEY = 'forno-brasa-cart-v1'
const MIN_LEAD_MINUTES = 30
const MAX_CART_LINES = 20
const MAX_QUANTITY_PER_ITEM = 20

const state = {
  pizzas: [],
  cart: loadCart(),
  loadingCatalog: true,
  submitting: false,
  error: ''
}

const app = document.querySelector('#app')

function loadCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(item => item && typeof item.pizza_id === 'string')
      .slice(0, MAX_CART_LINES)
      .map(item => ({
        pizza_id: item.pizza_id,
        name: String(item.name || '').slice(0, 120),
        price: Math.max(0, Number(item.price) || 0),
        quantity: Math.min(MAX_QUANTITY_PER_ITEM, Math.max(1, Number(item.quantity) || 1)),
        observations: String(item.observations || '').slice(0, 240)
      }))
  } catch {
    return []
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(state.cart))
  } catch {
    toast('Não foi possível persistir o carrinho neste navegador.', 'error')
  }
}

function money(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function cartCount() {
  return state.cart.reduce((sum, item) => sum + item.quantity, 0)
}

function cartTotal() {
  return state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

function pizzaById(id) {
  return state.pizzas.find(pizza => pizza.id === id)
}

function addToCart(pizzaId) {
  const pizza = pizzaById(pizzaId)
  if (!pizza) return

  const existing = state.cart.find(item => item.pizza_id === pizzaId)
  if (existing) {
    if (existing.quantity >= MAX_QUANTITY_PER_ITEM) return toast('Limite de quantidade atingido.', 'error')
    existing.quantity += 1
  } else {
    if (state.cart.length >= MAX_CART_LINES) return toast('Seu carrinho atingiu o limite de itens.', 'error')
    state.cart.push({ pizza_id: pizza.id, name: pizza.name, price: Number(pizza.price), quantity: 1, observations: '' })
  }

  saveCart()
  render()
  openCart()
}

function updateQuantity(pizzaId, delta) {
  const item = state.cart.find(entry => entry.pizza_id === pizzaId)
  if (!item) return
  item.quantity = Math.min(MAX_QUANTITY_PER_ITEM, item.quantity + delta)
  if (item.quantity <= 0) state.cart = state.cart.filter(entry => entry.pizza_id !== pizzaId)
  saveCart()
  render()
}

function updateObservation(pizzaId, value) {
  const item = state.cart.find(entry => entry.pizza_id === pizzaId)
  if (!item) return
  item.observations = value.slice(0, 240)
  saveCart()
}

function clearCart() {
  state.cart = []
  localStorage.removeItem(CART_KEY)
}

function minDateTime() {
  const date = new Date(Date.now() + MIN_LEAD_MINUTES * 60_000)
  date.setMinutes(Math.ceil(date.getMinutes() / 5) * 5, 0, 0)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}

function toast(message, type = 'success') {
  const node = document.createElement('div')
  node.className = `toast toast--${type}`
  node.textContent = message
  document.body.appendChild(node)
  requestAnimationFrame(() => node.classList.add('toast--show'))
  setTimeout(() => {
    node.classList.remove('toast--show')
    setTimeout(() => node.remove(), 220)
  }, 3600)
}

function render() {
  app.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#" aria-label="Forno e Brasa início">
        <span class="brand__mark">✦</span>
        <span><strong>Forno</strong> & Brasa</span>
      </a>
      <button class="cart-button" id="open-cart" type="button" aria-label="Abrir carrinho">
        <span>Seu pedido</span>
        <b>${cartCount()}</b>
      </button>
    </header>

    <main>
      <section class="hero">
        <div class="hero__content">
          <span class="eyebrow">Pizza artesanal • forno quente • entrega rápida</span>
          <h1>Pizza boa começa<br /><em>com ingredientes de verdade.</em></h1>
          <p>Escolha seus sabores, monte seu pedido e confirme tudo pelo WhatsApp.</p>
          <button class="cta" id="hero-cta" type="button">Montar meu pedido <span>→</span></button>
        </div>
        <div class="hero__visual" aria-hidden="true">
          <div class="pizza-art">🍕</div>
          <div class="hero__badge"><strong>Quentinha</strong><span>e feita na hora</span></div>
        </div>
      </section>

      <section class="catalog" id="catalog">
        <div class="section-heading">
          <div><span class="eyebrow">Nosso cardápio</span><h2>Escolha sua pizza</h2></div>
          <span class="catalog-count">${state.pizzas.length} sabores</span>
        </div>
        ${state.loadingCatalog
          ? '<div class="state-card"><div class="spinner"></div><p>Buscando sabores fresquinhos…</p></div>'
          : state.error
            ? `<div class="state-card"><span class="state-icon">!</span><p>Não conseguimos carregar o cardápio.</p><button class="text-button" id="retry">Tentar novamente</button></div>`
            : state.pizzas.length === 0
              ? '<div class="state-card"><span class="state-icon">🍕</span><p>Nenhuma pizza disponível no momento.</p></div>'
              : `<div class="pizza-grid">${state.pizzas.map(pizza => `
                  <article class="pizza-card">
                    <div class="pizza-card__image">
                      <img src="${escapeHtml(pizza.image_url || '')}" alt="${escapeHtml(pizza.name)}" loading="lazy" />
                      <span>${money(pizza.price)}</span>
                    </div>
                    <div class="pizza-card__body">
                      <h3>${escapeHtml(pizza.name)}</h3>
                      <p>${escapeHtml(pizza.description)}</p>
                      <button class="add-button" data-add="${pizza.id}" type="button">Adicionar <span>+</span></button>
                    </div>
                  </article>
                `).join('')}</div>`}
      </section>
    </main>

    <footer><span>© Forno & Brasa</span><span>Feito com carinho, servido quente.</span></footer>

    <div class="overlay" id="overlay" hidden></div>
    <aside class="drawer" id="drawer" aria-label="Seu pedido" aria-hidden="true">
      <div class="drawer__header"><div><span class="eyebrow">Seu pedido</span><h2>Quase lá!</h2></div><button class="icon-button" id="close-cart" type="button" aria-label="Fechar">×</button></div>
      <div id="cart-content"></div>
    </aside>

    <div class="modal" id="order-modal" hidden>
      <div class="modal__card">
        <div class="drawer__header"><div><span class="eyebrow">Finalização</span><h2>Como entregamos?</h2></div><button class="icon-button" id="close-modal" type="button" aria-label="Fechar">×</button></div>
        <form id="order-form">
          <label>Nome<input name="customer_name" required minlength="2" maxlength="120" autocomplete="name" placeholder="Seu nome" /></label>
          <label>Telefone<input name="customer_phone" required maxlength="30" inputmode="tel" autocomplete="tel" placeholder="(00) 00000-0000" /></label>
          <label>Horário desejado<input name="delivery_time" required type="datetime-local" min="${minDateTime()}" /></label>
          <label>Pagamento
            <select name="payment_method" required>
              <option value="pix">PIX</option><option value="card">Cartão</option><option value="cash">Dinheiro</option>
            </select>
          </label>
          <label class="checkbox"><input type="checkbox" name="terms" required /> <span>Confirmo que os dados do pedido estão corretos.</span></label>
          <div class="form-total"><span>Total</span><strong>${money(cartTotal())}</strong></div>
          <button class="cta cta--full" id="submit-order" type="submit"><span>Enviar pedido pelo WhatsApp</span><span>→</span></button>
          <p class="form-note">Seu pedido é salvo para a pizzaria e o WhatsApp abre com a mensagem pronta. O pagamento acontece fora deste site.</p>
        </form>
      </div>
    </div>
  `

  bindEvents()
  renderCart()
}

function renderCart() {
  const content = document.querySelector('#cart-content')
  if (!content) return

  if (!state.cart.length) {
    content.innerHTML = '<div class="empty-cart"><div class="empty-cart__icon">🛒</div><h3>Seu carrinho está vazio</h3><p>Escolha uma pizza para começar.</p><button class="text-button" id="back-catalog">Ver cardápio</button></div>'
    return
  }

  content.innerHTML = `
    <div class="cart-items">
      ${state.cart.map(item => `
        <article class="cart-item">
          <div class="cart-item__top"><div><strong>${escapeHtml(item.name)}</strong><span>${money(item.price)} cada</span></div><button class="remove-item" data-remove="${item.pizza_id}" type="button">×</button></div>
          <div class="cart-item__bottom">
            <div class="qty"><button data-qty="-1" data-id="${item.pizza_id}" type="button">−</button><b>${item.quantity}</b><button data-qty="1" data-id="${item.pizza_id}" type="button">+</button></div>
            <strong>${money(item.price * item.quantity)}</strong>
          </div>
          <input class="observation" data-observation="${item.pizza_id}" value="${escapeHtml(item.observations)}" maxlength="240" placeholder="Observação (opcional)" aria-label="Observação para ${escapeHtml(item.name)}" />
        </article>
      `).join('')}
    </div>
    <div class="cart-summary"><div><span>Subtotal</span><strong>${money(cartTotal())}</strong></div><p>Entrega e cobrança são combinadas pelo WhatsApp.</p></div>
    <button class="cta cta--full" id="checkout" type="button">Continuar <span>→</span></button>
    <button class="text-button text-button--danger" id="cancel-cart" type="button">Cancelar pedido</button>
  `
}

function bindEvents() {
  document.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => addToCart(button.dataset.add)))
  document.querySelector('#open-cart')?.addEventListener('click', openCart)
  document.querySelector('#hero-cta')?.addEventListener('click', () => document.querySelector('#catalog')?.scrollIntoView({ behavior: 'smooth' }))
  document.querySelector('#retry')?.addEventListener('click', fetchPizzas)
  document.querySelector('#close-cart')?.addEventListener('click', closeCart)
  document.querySelector('#overlay')?.addEventListener('click', closeCart)
  document.querySelector('#back-catalog')?.addEventListener('click', closeCart)
  document.querySelector('#close-modal')?.addEventListener('click', closeModal)
  document.querySelector('#checkout')?.addEventListener('click', openOrderModal)
  document.querySelector('#cancel-cart')?.addEventListener('click', () => { clearCart(); closeCart(); render(); toast('Carrinho limpo.') })
  document.querySelector('#order-form')?.addEventListener('submit', submitOrder)
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return
    if (!document.querySelector('#order-modal')?.hidden) closeModal()
    else closeCart()
  })

  document.querySelectorAll('[data-qty]').forEach(button => button.addEventListener('click', () => updateQuantity(button.dataset.id, Number(button.dataset.qty))))
  document.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => updateQuantity(button.dataset.remove, -999)))
  document.querySelectorAll('[data-observation]').forEach(input => input.addEventListener('input', event => updateObservation(input.dataset.observation, event.target.value)))
}

function openCart() {
  const drawer = document.querySelector('#drawer')
  const overlay = document.querySelector('#overlay')
  if (!drawer || !overlay) return
  renderCart()
  overlay.hidden = false
  drawer.classList.add('drawer--open')
  drawer.setAttribute('aria-hidden', 'false')
  document.body.classList.add('no-scroll')
}

function closeCart() {
  document.querySelector('#drawer')?.classList.remove('drawer--open')
  const overlay = document.querySelector('#overlay')
  if (overlay) overlay.hidden = true
  document.body.classList.remove('no-scroll')
}

function openOrderModal() {
  if (!state.cart.length) return toast('Adicione pelo menos uma pizza.', 'error')
  closeCart()
  const modal = document.querySelector('#order-modal')
  modal.hidden = false
  document.body.classList.add('no-scroll')
}

function closeModal() {
  document.querySelector('#order-modal').hidden = true
  document.body.classList.remove('no-scroll')
}

function formatDateForWhatsApp(value) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function normalizePhone(phone) {
  return phone.replace(/[^0-9+]/g, '')
}

function validatePhone(phone) {
  return /^[0-9+(). -]{8,30}$/.test(phone)
}

function buildWhatsAppMessage(order) {
  const lines = [
    '🍕 *NOVO PEDIDO — FORNO & BRASA*',
    '',
    `Cliente: ${order.customer_name}`,
    `Telefone: ${order.customer_phone}`,
    `Horário: ${formatDateForWhatsApp(order.delivery_time)}`,
    `Pagamento: ${({ pix: 'PIX', card: 'Cartão', cash: 'Dinheiro' })[order.payment_method]}`,
    '',
    '*Itens:*',
    ...order.items.map(item => `• ${item.quantity}x ${item.name} — ${money(item.unit_price)}${item.observations ? `\\n  Obs.: ${item.observations}` : ''}`),
    '',
    `*Total: ${money(order.total_amount)}*`
  ]
  return lines.join('\\n')
}

async function submitOrder(event) {
  event.preventDefault()
  if (state.submitting || !state.cart.length) return

  const form = event.currentTarget
  const data = new FormData(form)
  const customerName = String(data.get('customer_name') || '').trim()
  const customerPhone = String(data.get('customer_phone') || '').trim()
  const deliveryTime = String(data.get('delivery_time') || '')
  const paymentMethod = String(data.get('payment_method') || '')

  if (customerName.length < 2) return toast('Informe seu nome.', 'error')
  if (!validatePhone(customerPhone)) return toast('Informe um telefone válido.', 'error')
  if (!deliveryTime || new Date(deliveryTime).getTime() < Date.now() + MIN_LEAD_MINUTES * 60_000) return toast('Escolha um horário com pelo menos 30 minutos de antecedência.', 'error')

  state.submitting = true
  const button = document.querySelector('#submit-order')
  button.disabled = true
  button.querySelector('span').textContent = 'Enviando pedido…'

  const orderItems = state.cart.map(item => ({
    pizza_id: item.pizza_id,
    quantity: item.quantity,
    observations: item.observations
  }))

  const whatsappWindow = window.open('about:blank', '_blank')
  if (whatsappWindow) whatsappWindow.opener = null

  const payload = {
    customer_name: customerName,
    customer_phone: normalizePhone(customerPhone),
    items: orderItems,
    total_amount: Number(cartTotal().toFixed(2)),
    delivery_time: new Date(deliveryTime).toISOString(),
    payment_method: paymentMethod,
    status: 'pending'
  }

  if (!supabase) {
    state.submitting = false
    button.disabled = false
    button.querySelector('span').textContent = 'Enviar pedido pelo WhatsApp'
    return toast('Supabase não configurado. Confira as variáveis de ambiente.', 'error')
  }

  const { error } = await supabase.from('orders').insert(payload)

  if (error) {
    whatsappWindow?.close()
    state.submitting = false
    button.disabled = false
    button.querySelector('span').textContent = 'Enviar pedido pelo WhatsApp'
    console.error(error)
    return toast('Falha ao enviar pedido. Tente novamente.', 'error')
  }

  const whatsappItems = state.cart.map(item => ({
    ...item,
    unit_price: item.price
  }))
  const message = buildWhatsAppMessage({ ...payload, items: whatsappItems })
  const url = `https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`

  clearCart()
  closeModal()
  state.submitting = false
  render()
  toast('Pedido salvo! Abrindo o WhatsApp…')
  if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.location.href = url
  else window.location.assign(url)
}

async function fetchPizzas() {
  state.loadingCatalog = true
  state.error = ''
  render()

  if (!supabase) {
    state.loadingCatalog = false
    state.error = 'missing-config'
    render()
    return
  }

  const { data, error } = await supabase
    .from('pizzas')
    .select('id,name,description,price,image_url')
    .eq('is_available', true)
    .order('created_at', { ascending: true })

  if (error) {
    console.error(error)
    state.loadingCatalog = false
    state.error = 'catalog'
    render()
    return
  }

  state.pizzas = data || []
  state.loadingCatalog = false
  render()
}

render()
fetchPizzas()
