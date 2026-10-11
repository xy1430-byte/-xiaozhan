const products = [
  { id: 'cookie', name: 'Choc-chip cookie', subtitle: 'Soft, chewy & loaded', price: 2.00, category: 'sweet', tag: 'Best seller', bg: '#f5d7aa', art: cookieArt },
  { id: 'fizz', name: 'Berry fizz', subtitle: 'Cold, pink & bubbly', price: 2.50, category: 'sips', tag: 'New sip', bg: '#f5b6c9', art: fizzArt },
  { id: 'nachos', name: 'Nacho cup', subtitle: 'Crunch + cheese dip', price: 3.50, category: 'savoury', tag: 'Crowd fave', bg: '#f7cd67', art: nachoArt },
  { id: 'brownie', name: 'Brownie bite', subtitle: 'Fudgy little square', price: 2.75, category: 'sweet', tag: 'Rich & fudgy', bg: '#c5b5e7', art: brownieArt },
  { id: 'cereal', name: 'Crispy cereal bar', subtitle: 'Golden, gooey & crispy', price: 1.75, category: 'sweet', tag: 'Pocket-friendly', bg: '#a8dcd2', art: cerealArt },
  { id: 'mango', name: 'Mango pop', subtitle: 'Tropical, tangy & cold', price: 2.25, category: 'sips', tag: 'Zero fuss', bg: '#f6a86c', art: mangoArt }
];

const money = (amount) => `$${amount.toFixed(2)}`;
let cart = loadCart();
let activeFilter = 'all';
let toastTimer;

const menuGrid = document.querySelector('#menu-grid');
const emptyMenu = document.querySelector('#empty-menu');
const cartPanel = document.querySelector('#cart-panel');
const cartBackdrop = document.querySelector('#cart-backdrop');
const cartContent = document.querySelector('#cart-content');
const cartFooter = document.querySelector('#cart-footer');

function loadCart() {
  try { return JSON.parse(localStorage.getItem('snack-shack-cart')) || {}; }
  catch { return {}; }
}

function saveCart() {
  localStorage.setItem('snack-shack-cart', JSON.stringify(cart));
}

function productById(id) { return products.find((product) => product.id === id); }

function cartQuantity() { return Object.values(cart).reduce((total, quantity) => total + quantity, 0); }

function cartTotal() {
  return Object.entries(cart).reduce((total, [id, quantity]) => total + productById(id).price * quantity, 0);
}

function renderMenu() {
  const visibleProducts = products.filter((product) => activeFilter === 'all' || product.category === activeFilter);
  emptyMenu.hidden = visibleProducts.length !== 0;
  menuGrid.innerHTML = visibleProducts.map((product) => {
    const quantity = cart[product.id] || 0;
    return `<article class="snack-card ${quantity ? 'just-added' : ''}" data-product-id="${product.id}">
      <div class="snack-visual" style="background: ${product.bg}">
        <span class="card-tag">${product.tag}</span>
        ${product.art()}
      </div>
      <div class="snack-info">
        <h3>${product.name}</h3>
        <p class="snack-subtitle">${product.subtitle}</p>
        <div class="snack-bottom">
          <span class="price">${money(product.price)}</span>
          ${quantity ? stepperMarkup(product.id, quantity) : `<button class="buy-button" type="button" data-action="add" data-id="${product.id}">Buy <span aria-hidden="true">+</span></button>`}
        </div>
      </div>
    </article>`;
  }).join('');
}

function stepperMarkup(id, quantity) {
  return `<div class="stepper" aria-label="Choose quantity">
    <button type="button" data-action="decrease" data-id="${id}" aria-label="Remove one">−</button>
    <output>${quantity}</output>
    <button type="button" data-action="increase" data-id="${id}" aria-label="Add one">+</button>
  </div>`;
}

function renderCart() {
  const count = cartQuantity();
  const total = cartTotal();
  document.querySelector('#cart-count').textContent = count;
  document.querySelector('#header-total').textContent = money(total);
  document.querySelector('#cart-total').textContent = money(total);
  document.querySelector('#cart-item-copy').textContent = `(${count} ${count === 1 ? 'item' : 'items'})`;
  document.querySelector('#place-order').disabled = count === 0;

  if (!count) {
    cartContent.innerHTML = `<div class="cart-empty"><div><div class="empty-icon">✦</div><h3>Your order is empty</h3><p>Pick a snack above and it’ll show up here.</p></div></div>`;
    return;
  }

  cartContent.innerHTML = Object.entries(cart).map(([id, quantity]) => {
    const product = productById(id);
    return `<div class="cart-line">
      <div class="cart-thumb" style="background: ${product.bg}">${product.art()}</div>
      <div><h3>${product.name}</h3><p>${money(product.price)} each</p>${miniStepperMarkup(id, quantity)}</div>
      <strong class="cart-line-price">${money(product.price * quantity)}</strong>
    </div>`;
  }).join('');
}

function miniStepperMarkup(id, quantity) {
  return `<div class="mini-stepper"><button type="button" data-action="decrease" data-id="${id}" aria-label="Remove one">−</button><output>${quantity}</output><button type="button" data-action="increase" data-id="${id}" aria-label="Add one">+</button></div>`;
}

function changeQuantity(id, delta) {
  cart[id] = (cart[id] || 0) + delta;
  if (cart[id] <= 0) delete cart[id];
  saveCart();
  renderMenu();
  renderCart();
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2300);
}

function openCart() {
  cartPanel.hidden = false;
  cartBackdrop.hidden = false;
  document.body.classList.add('no-scroll');
  document.querySelector('#close-cart').focus();
}

function closeCart() {
  cartPanel.hidden = true;
  cartBackdrop.hidden = true;
  document.body.classList.remove('no-scroll');
  cartFooter.hidden = false;
  renderCart();
}

function placeOrder() {
  if (!cartQuantity()) return;
  const orderNumber = `SS-${String(Math.floor(100 + Math.random() * 900))}`;
  const summary = Object.entries(cart).map(([id, quantity]) => `${quantity} × ${productById(id).name}`).join('<br>');
  cartContent.innerHTML = `<div class="confirmation"><div class="confirmation-icon">✓</div><h3>Order locked in!</h3><p>Your preorder <strong>${orderNumber}</strong> is ready. We’ll have it packed for lunch.</p><div class="pickup-reminder"><strong>Pickup at lunch</strong><br>Student lounge by the library · 12:10–12:40 PM<br><br>${summary}</div><button class="button button-dark" id="close-confirmation" type="button">Keep browsing <span aria-hidden="true">→</span></button></div>`;
  cartFooter.hidden = true;
  cart = {};
  saveCart();
  renderMenu();
  renderCartHeaderOnly();
  document.querySelector('#close-confirmation').addEventListener('click', () => { cartFooter.hidden = false; closeCart(); });
}

function renderCartHeaderOnly() {
  document.querySelector('#cart-count').textContent = '0';
  document.querySelector('#header-total').textContent = '$0.00';
  document.querySelector('#cart-total').textContent = '$0.00';
  document.querySelector('#cart-item-copy').textContent = '(0 items)';
}

document.querySelector('#menu-grid').addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === 'add' || action === 'increase') { changeQuantity(id, 1); showToast(`${productById(id).name} added to your order`); }
  if (action === 'decrease') changeQuantity(id, -1);
});

document.querySelector('.filter-row').addEventListener('click', (event) => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll('.filter-button').forEach((item) => item.classList.toggle('active', item === button));
  renderMenu();
});

cartContent.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  changeQuantity(button.dataset.id, button.dataset.action === 'increase' ? 1 : -1);
});

document.querySelector('#open-cart').addEventListener('click', openCart);
document.querySelector('#close-cart').addEventListener('click', closeCart);
cartBackdrop.addEventListener('click', closeCart);
document.querySelector('#place-order').addEventListener('click', placeOrder);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !cartPanel.hidden) closeCart(); });

renderMenu();
renderCart();

function cookieArt() { return `<svg viewBox="0 0 260 205" aria-hidden="true"><circle cx="130" cy="111" r="64" fill="#c97c44" stroke="#8d4b2a" stroke-width="5"/><circle cx="109" cy="88" r="8" fill="#663724"/><circle cx="153" cy="86" r="7" fill="#663724"/><circle cx="98" cy="124" r="7" fill="#663724"/><circle cx="143" cy="128" r="9" fill="#663724"/><circle cx="173" cy="112" r="6" fill="#663724"/><path d="M80 155c25 18 64 25 97 6" fill="none" stroke="#e4a06a" stroke-width="8" stroke-linecap="round" opacity=".65"/><path d="M101 57c22-17 54-18 75 0" fill="none" stroke="#f5bb82" stroke-width="5" stroke-linecap="round" opacity=".7"/></svg>`; }
function fizzArt() { return `<svg viewBox="0 0 260 205" aria-hidden="true"><path d="M93 45h74l-7 122H100L93 45Z" fill="#fff8e8" stroke="#18323b" stroke-width="4"/><path d="M97 97h66v68h-59l-7-68Z" fill="#ef789d"/><path d="M91 46h78" stroke="#18323b" stroke-width="8" stroke-linecap="round"/><path d="M129 45c-7-21 2-29 12-39" fill="none" stroke="#18323b" stroke-width="4" stroke-linecap="round"/><path d="M124 123c-18-16-15-32 2-38 17 6 20 22 2 38-2 3-2 3-4 0Z" fill="#f8c848"/><circle cx="116" cy="113" r="3" fill="#fffdf8"/><circle cx="143" cy="140" r="4" fill="#fffdf8"/><circle cx="132" cy="155" r="3" fill="#fffdf8"/><path d="M78 76c-8-11-1-19 9-19m85 28c7-10 15-7 18 1" fill="none" stroke="#7965d7" stroke-width="4" stroke-linecap="round"/></svg>`; }
function nachoArt() { return `<svg viewBox="0 0 260 205" aria-hidden="true"><path d="M65 72h130l-14 89H79L65 72Z" fill="#ff705d" stroke="#18323b" stroke-width="4"/><path d="m85 75 16 72 18-72 18 72 18-72 13 72" fill="none" stroke="#f7cd67" stroke-width="22" stroke-linejoin="round"/><path d="M105 74h50v28h-50Z" fill="#f7e5ad" stroke="#18323b" stroke-width="4"/><path d="M113 76c0-17 15-25 25-12 10-13 25-5 25 12" fill="#f4e3a6" stroke="#18323b" stroke-width="4"/><circle cx="74" cy="55" r="7" fill="#7965d7"/><circle cx="189" cy="45" r="5" fill="#ff705d"/><path d="M58 38l3 15m-8-7 15-2" stroke="#18323b" stroke-width="3" stroke-linecap="round"/></svg>`; }
function brownieArt() { return `<svg viewBox="0 0 260 205" aria-hidden="true"><path d="M65 77 183 53l16 86-118 24-16-86Z" fill="#8e5037" stroke="#18323b" stroke-width="5"/><path d="m83 79 85-17 10 68-85 18-10-69Z" fill="#70402f"/><path d="M83 79 168 62M93 105l82-17M99 130l81-17" stroke="#b76c48" stroke-width="5" opacity=".75"/><path d="m61 159 118-24 9 12-118 24Z" fill="#f8c848" stroke="#18323b" stroke-width="4"/><circle cx="113" cy="98" r="4" fill="#f8c848"/><circle cx="143" cy="119" r="4" fill="#f8c848"/><path d="M61 58l-4-10m14 8 4-11m96 11 6-10" stroke="#ff705d" stroke-width="4" stroke-linecap="round"/></svg>`; }
function cerealArt() { return `<svg viewBox="0 0 260 205" aria-hidden="true"><path d="M66 74h128l-9 89H75l-9-89Z" fill="#f8c848" stroke="#18323b" stroke-width="5"/><path d="M78 86h103v62H78Z" fill="#f6e9a9"/><path d="M81 87h99" stroke="#fffdf8" stroke-width="9"/><path d="M100 117c18-18 24 16 42-3 18-19 25 17 40-1" fill="none" stroke="#bd7544" stroke-width="17" stroke-linecap="round"/><path d="M92 113c18-18 24 16 42-3 18-19 25 17 40-1" fill="none" stroke="#fff5c4" stroke-width="7" stroke-linecap="round"/><path d="M110 60c6-12 14-16 23-9m-2 14c11-14 21-13 29-3" fill="none" stroke="#18323b" stroke-width="4" stroke-linecap="round"/><circle cx="65" cy="51" r="6" fill="#ff705d"/></svg>`; }
function mangoArt() { return `<svg viewBox="0 0 260 205" aria-hidden="true"><path d="M95 37h72l-4 125H98L95 37Z" fill="#fff8e8" stroke="#18323b" stroke-width="4"/><path d="M100 87h62v72h-60Z" fill="#f5a240"/><path d="M100 112h62v47h-60Z" fill="#f7c948"/><path d="M95 39h73" stroke="#18323b" stroke-width="8" stroke-linecap="round"/><path d="M126 38c-5-16 3-27 14-36" fill="none" stroke="#18323b" stroke-width="4" stroke-linecap="round"/><path d="M114 117c18-17 33 8 47-10" fill="none" stroke="#fff7d4" stroke-width="5" stroke-linecap="round"/><path d="M79 83c-10-9-10-19-3-25m103 31c10-9 9-19 2-25" fill="none" stroke="#7965d7" stroke-width="4" stroke-linecap="round"/></svg>`; }
