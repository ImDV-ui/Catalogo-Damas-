
const € = (n) => new Intl.NumberFormat('es-ES',{style:'currency', currency:'EUR'}).format(n);

// ---------- STATE ----------
const state = {
  products: [],
  filtered: [],
  category: 'all',
  search: '',
  sort: 'name-asc',
  cart: {} // {id: { ...product, qty }}
};

// ---------- ELEMENTS ----------
const els = {
  grid: document.getElementById('grid'),
  category: document.getElementById('category'),
  search: document.getElementById('search'),
  sort: document.getElementById('sort'),
  year: document.getElementById('year'),
  toTop: document.getElementById('toTop'),
  newsGrid: document.getElementById('newsGrid'),
  // cart
  cartBtn: document.getElementById('cartBtn'),
  cartCount: document.getElementById('cartCount'),
  drawer: document.getElementById('drawer'),
  overlay: document.getElementById('overlay'),
  drawerClose: document.getElementById('drawerClose'),
  cartItems: document.getElementById('cartItems'),
  cartTotal: document.getElementById('cartTotal'),
  clearCart: document.getElementById('clearCart'),
  checkout: document.getElementById('checkout'),
};

els.year.textContent = new Date().getFullYear();
els.toTop.addEventListener('click', e => { e.preventDefault(); window.scrollTo({top:0, behavior:'smooth'}); });

// ---------- LOAD DATA ----------

// --- Banner de estado ---
function showBanner(msg, type='warn'){
  let b = document.getElementById('statusBanner');
  if(!b){
    b = document.createElement('div');
    b.id = 'statusBanner';
    b.style.position='sticky'; b.style.top='0'; b.style.zIndex='30';
    b.style.padding='10px 14px'; b.style.margin='0 0 10px';
    b.style.borderRadius='12px'; b.style.fontWeight='700';
    b.style.width='min(1100px,92vw)'; b.style.marginInline='auto';
    document.body.prepend(b);
  }
  b.style.background = type==='error' ? '#fee2e2' : '#fef9c3';
  b.style.color = '#111827';
  b.textContent = msg;
}

Promise.all([
  fetch('data/products.json')
    .then(r => {
      if(!r.ok) throw new Error('HTTP '+r.status);
      return r.json();
    })
]).then(([data]) => {
  if(!Array.isArray(data) || !data.length){
    showBanner('JSON cargado pero vacío. Usando datos de ejemplo.', 'warn');
    data = [{"id": "f001", "name": "Pringles Original", "price": 2.1, "image": "https://picsum.photos/seed/pringles-fallback/800/600", "category": "snacks", "tags": "pringles patatas original"}, {"id": "f010", "name": "Doritos Tex-Mex", "price": 1.8, "image": "https://picsum.photos/seed/doritos-fallback/800/600", "category": "snacks", "tags": "doritos"}, {"id": "f020", "name": "Prime Tropical Punch", "price": 2.9, "image": "https://picsum.photos/seed/prime-fallback/800/600", "category": "bebidas", "tags": "prime energy tropical"}, {"id": "f030", "name": "Kinder Bueno", "price": 1.6, "image": "https://picsum.photos/seed/kinder-fallback/800/600", "category": "chocolates", "tags": "kinder bueno"}];
  } else {
    showBanner('Catálogo cargado correctamente.');
  }

  state.products = data.map((p, i) => ({ id: p.id || String(i+1), ...p }));
  hydrateCategoryFilter(state.products);
  loadCart();
  renderCart();
  hydrateNews();
  applyFilters();
}).catch(err => { showBanner('No se pudo cargar data/products.json ('+err.message+'). Usando datos de prueba.', 'error');
  console.error('Error cargando JSON', err);
  // Fallback a datos de ejemplo
  state.products = [{"id": "f001", "name": "Pringles Original", "price": 2.1, "image": "https://picsum.photos/seed/pringles-fallback/800/600", "category": "snacks", "tags": "pringles patatas original"}, {"id": "f010", "name": "Doritos Tex-Mex", "price": 1.8, "image": "https://picsum.photos/seed/doritos-fallback/800/600", "category": "snacks", "tags": "doritos"}, {"id": "f020", "name": "Prime Tropical Punch", "price": 2.9, "image": "https://picsum.photos/seed/prime-fallback/800/600", "category": "bebidas", "tags": "prime energy tropical"}, {"id": "f030", "name": "Kinder Bueno", "price": 1.6, "image": "https://picsum.photos/seed/kinder-fallback/800/600", "category": "chocolates", "tags": "kinder bueno"}];
  hydrateCategoryFilter(state.products);
  renderCart();
  hydrateNews();
  applyFilters();
});

function hydrateCategoryFilter(items){
  const cats = Array.from(new Set(items.map(i => i.category))).sort();
  cats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
    els.category.appendChild(opt);
  });
}

function hydrateNews(){
  const news = state.products.filter(p => p.isNew).slice(0,3);
  els.newsGrid.innerHTML = '';
  if(!news.length){
    els.newsGrid.innerHTML = '<p>Pronto publicaremos novedades.</p>';
    return;
  }
  const frag = document.createDocumentFragment();
  news.forEach(n => {
    const card = document.createElement('article');
    card.className = 'news-card';
    card.innerHTML = `
      <img src="${n.image}" alt="${n.name}">
      <div class="nb">
        <span class="badge">${n.category}</span>
        <h3>${n.name}</h3>
        <p class="muted">${n.desc || ''}</p>
        <div><strong>${€(n.price)}</strong></div>
        <button class="btn" data-id="${n.id}">Añadir</button>
      </div>
    `;
    card.querySelector('.btn').addEventListener('click', () => addToCart(n.id));
    frag.appendChild(card);
  });
  els.newsGrid.appendChild(frag);
}

// ---------- EVENTS ----------
els.category.addEventListener('change', () => { state.category = els.category.value; applyFilters(); });
els.search.addEventListener('input', () => { state.search = els.search.value; applyFilters(); });
els.sort.addEventListener('change', () => { state.sort = els.sort.value; applyFilters(); });

// Drawer open/close
els.cartBtn.addEventListener('click', openDrawer);
els.drawerClose.addEventListener('click', closeDrawer);
els.overlay.addEventListener('click', closeDrawer);

function openDrawer(){ els.drawer.classList.add('open'); els.overlay.hidden = false; els.drawer.setAttribute('aria-hidden','false'); }
function closeDrawer(){ els.drawer.classList.remove('open'); els.overlay.hidden = true; els.drawer.setAttribute('aria-hidden','true'); }

// Cart actions
els.clearCart.addEventListener('click', () => { state.cart = {}; saveCart(); renderCart(); });
els.checkout.addEventListener('click', () => {
  alert('Checkout de demostración. Integraremos método real más adelante.');
});

// ---------- FILTERING ----------
function applyFilters(){
  let list = [...state.products];

  if(state.category !== 'all'){
    list = list.filter(p => p.category === state.category);
  }

  const q = state.search.trim().toLowerCase();
  if(q){
    list = list.filter(p => (p.name + ' ' + (p.tags||'')).toLowerCase().includes(q));
  }

  const [field, dir] = state.sort.split('-');
  list.sort((a,b) => {
    if(field === 'name') return dir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    if(field === 'price') return dir === 'asc' ? a.price - b.price : b.price - a.price;
    return 0;
  });

  state.filtered = list;
  render();
}

// ---------- RENDER GRID ----------
function render(){
  els.grid.innerHTML = '';
  if(!state.filtered.length){
    els.grid.innerHTML = '<p>No hay productos que coincidan.</p>';
    return;
  }
  const frag = document.createDocumentFragment();
  state.filtered.forEach(p => frag.appendChild(card(p)));
  els.grid.appendChild(frag);
}

function card(p){
  const article = document.createElement('article');
  article.className = 'card';
  article.innerHTML = `
    <img class="thumb" src="${p.image}" alt="${p.name}">
    <div class="body">
      <div class="meta">
        <span class="badge">${p.category}</span>
        <span class="price">${€(p.price)}</span>
      </div>
      <h3 class="name">${p.name}</h3>
      <button class="add-btn" type="button" data-id="${p.id}">Añadir</button>
    </div>
  `;
  article.querySelector('.add-btn').addEventListener('click', () => addToCart(p.id));
  return article;
}

// ---------- CART ----------
function loadCart(){
  try{
    const raw = localStorage.getItem('damas_cart');
    if(raw) state.cart = JSON.parse(raw) || {};
  }catch(e){ state.cart = {}; }
  updateCount();
}
function saveCart(){
  localStorage.setItem('damas_cart', JSON.stringify(state.cart));
  updateCount();
}
function updateCount(){
  const count = Object.values(state.cart).reduce((a, it) => a + it.qty, 0);
  els.cartCount.textContent = String(count);
}
function addToCart(id){
  const prod = state.products.find(p => p.id === id);
  if(!prod) return;
  if(!state.cart[id]) state.cart[id] = { ...prod, qty: 0 };
  state.cart[id].qty++;
  saveCart();
  renderCart();
  openDrawer();
}
function changeQty(id, delta){
  if(!state.cart[id]) return;
  state.cart[id].qty += delta;
  if(state.cart[id].qty <= 0) delete state.cart[id];
  saveCart();
  renderCart();
}
function removeItem(id){
  delete state.cart[id];
  saveCart();
  renderCart();
}
function renderCart(){
  const items = Object.values(state.cart);
  if(!items.length){
    els.cartItems.innerHTML = '<p>Tu carrito está vacío.</p>';
    els.cartTotal.textContent = €(0);
    return;
  }
  els.cartItems.innerHTML = '';
  const frag = document.createDocumentFragment();
  let total = 0;
  items.forEach(it => {
    total += it.price * it.qty;
    const row = document.createElement('div');
    row.className = 'cart-row';
    row.innerHTML = `
      <img src="${it.image}" alt="${it.name}">
      <div>
        <div class="name">${it.name}</div>
        <div class="price-sm">${€(it.price)}</div>
        <button class="rm-btn" aria-label="Eliminar">Eliminar</button>
      </div>
      <div class="qty">
        <button aria-label="Disminuir">−</button>
        <strong>${it.qty}</strong>
        <button aria-label="Aumentar">+</button>
      </div>
    `;
    const [minus, plus] = row.querySelectorAll('.qty button');
    const rm = row.querySelector('.rm-btn');
    minus.addEventListener('click', () => changeQty(it.id, -1));
    plus.addEventListener('click', () => changeQty(it.id, +1));
    rm.addEventListener('click', () => removeItem(it.id));
    frag.appendChild(row);
  });
  els.cartItems.appendChild(frag);
  els.cartTotal.textContent = €(total);
}
