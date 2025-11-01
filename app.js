
// ---- Currency formatter ----
const fmtEUR = (n) => new Intl.NumberFormat('es-ES',{style:'currency', currency:'EUR'}).format(n);

// ---- State ----
const state = {
  products: [],
  filtered: [],
  category: 'all',
  search: '',
  sort: 'name-asc',
  cart: {}
};

// ---- Elements ----
const els = {
  grid: document.getElementById('grid'),
  category: document.getElementById('category'),
  search: document.getElementById('search'),
  sort: document.getElementById('sort'),
  year: document.getElementById('year'),
  toTop: document.getElementById('toTop'),
  newsGrid: document.getElementById('newsGrid'),
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

if(els.year) els.year.textContent = new Date().getFullYear();
if(els.toTop) els.toTop.addEventListener('click', e => { e.preventDefault(); window.scrollTo({top:0, behavior:'smooth'}); });

// ---- Load data (fetch + fallback) ----
fetch('data/products.json')
  .then(r => { if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
  .then(data => {
    if(!Array.isArray(data) || !data.length) {
      console.warn('[DAMAS] JSON vacío; usando datos de ejemplo.');
      data = [{"id": "f001", "name": "Pringles Sour Cream & Onion", "price": 2.3, "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Pringles-165g-to-134g.jpg", "category": "snacks", "desc": "Sabor crema agria y cebolla", "isNew": true}, {"id": "f010", "name": "Doritos Tex-Mex", "price": 1.8, "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Doritos%20bag.jpg", "category": "snacks", "desc": "Crujientes con toque picante", "isNew": true}, {"id": "f020", "name": "Red Bull 250ml", "price": 2.1, "image": "https://commons.wikimedia.org/wiki/Special:FilePath/8.4_floz_can_of_Red_Bull_Energy_Drink.jpg", "category": "bebidas", "desc": "Clásico energy 250ml", "isNew": true}];
    } else {
      console.info('[DAMAS] Catálogo cargado correctamente.');
    }
    state.products = data.map((p,i) => ({ id: p.id || String(i+1), ...p }));
    hydrateCategoryFilter(state.products);
    renderChips?.(state.products);
    renderChips?.(state.products);
    loadCart(); renderCart();
    hydrateNews();
    applyFilters();
  })
  .catch(err => {
    console.error('[DAMAS] No se pudo cargar data/products.json ('+err.message+'). Usando datos de prueba.');
    state.products = [{"id": "f001", "name": "Pringles Sour Cream & Onion", "price": 2.3, "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Pringles-165g-to-134g.jpg", "category": "snacks", "desc": "Sabor crema agria y cebolla", "isNew": true}, {"id": "f010", "name": "Doritos Tex-Mex", "price": 1.8, "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Doritos%20bag.jpg", "category": "snacks", "desc": "Crujientes con toque picante", "isNew": true}, {"id": "f020", "name": "Red Bull 250ml", "price": 2.1, "image": "https://commons.wikimedia.org/wiki/Special:FilePath/8.4_floz_can_of_Red_Bull_Energy_Drink.jpg", "category": "bebidas", "desc": "Clásico energy 250ml", "isNew": true}];
    hydrateCategoryFilter(state.products);
    renderChips?.(state.products);
    renderChips?.(state.products);
    loadCart(); renderCart();
    hydrateNews();
    applyFilters();
  });

// ---- Helpers ----
function hydrateCategoryFilter(items){
  if(!els.category) return;
  const cats = Array.from(new Set(items.map(i => i.category))).sort();
  els.category.innerHTML = '<option value="all">Todas las categorías</option>';
  cats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat; opt.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
    els.category.appendChild(opt);
  });

function renderChips(items){
  const host = document.getElementById('catChips');
  if(!host) return;
  const cats = Array.from(new Set(items.map(i => i.category))).sort();
  host.innerHTML = '';

  const all = document.createElement('button');
  all.className = 'chip' + (state.category === 'all' ? ' active' : '');
  all.dataset.cat = 'all';
  all.textContent = 'Todas';
  host.appendChild(all);

  cats.forEach(cat => {
    const b = document.createElement('button');
    b.className = 'chip' + (state.category === cat ? ' active' : '');
    b.dataset.cat = cat;
    b.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
    host.appendChild(b);
  });
}
}

function hydrateNews(){
  if(!els.newsGrid) return;
  const news = state.products.filter(p => p.isNew).slice(0,3);
  els.newsGrid.innerHTML = '';
  if(!news.length) return;
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
        <div><strong>${fmtEUR(n.price)}</strong></div>
        <button class="btn" data-id="${n.id}">Añadir</button>
      </div>`;
    card.querySelector('.btn').addEventListener('click', () => addToCart(n.id));
    frag.appendChild(card);
  });
  els.newsGrid.appendChild(frag);
}

// ---- Events ----
if(els.category) els.category.addEventListener('change', () => { state.category = els.category.value; renderChips?.(state.products); applyFilters(); });
if(els.search) els.search.addEventListener('input', () => { state.search = els.search.value; applyFilters(); });
if(els.sort) els.sort.addEventListener('change', () => { state.sort = els.sort.value; applyFilters(); });

if(els.cartBtn) els.cartBtn.addEventListener('click', openDrawer);
if(els.drawerClose) els.drawerClose.addEventListener('click', closeDrawer);
if(els.overlay) els.overlay.addEventListener('click', closeDrawer);

function openDrawer(){ if(els.drawer){ els.drawer.classList.add('open'); if(els.overlay) els.overlay.hidden = false; els.drawer.setAttribute('aria-hidden','false'); } }
function closeDrawer(){ if(els.drawer){ els.drawer.classList.remove('open'); if(els.overlay) els.overlay.hidden = true; els.drawer.setAttribute('aria-hidden','true'); } }

if(els.clearCart) els.clearCart.addEventListener('click', () => { state.cart = {}; saveCart(); renderCart(); });
if(els.checkout) els.checkout.addEventListener('click', () => { alert('Checkout de demostración.'); });

// ---- Filtering ----
function applyFilters(){
  if(!els.grid) return;
  let list = [...state.products];
  if(state.category !== 'all') list = list.filter(p => p.category === state.category);
  const q = (state.search||'').trim().toLowerCase();
  if(q) list = list.filter(p => (p.name + ' ' + (p.tags||'')).toLowerCase().includes(q));
  const [field, dir] = state.sort.split('-');
  list.sort((a,b) => {
    if(field === 'name') return dir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    if(field === 'price') return dir === 'asc' ? a.price - b.price : b.price - a.price;
    return 0;
  });
  state.filtered = list;
  render();
}

// ---- Render grid ----
function render(){
  els.grid.innerHTML = '';
  if(!state.filtered.length){ els.grid.innerHTML = '<p>No hay productos que coincidan.</p>'; return; }
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
        <span class="price">${fmtEUR(p.price)}</span>
      </div>
      <h3 class="name">${p.name}</h3>
      <button class="add-btn" type="button" data-id="${p.id}">Añadir</button>
    </div>`;
  article.querySelector('.add-btn').addEventListener('click', () => addToCart(p.id));
  return article;
}

// ---- Cart ----
function loadCart(){
  try{ const raw = localStorage.getItem('damas_cart'); if(raw) state.cart = JSON.parse(raw) || {}; }catch(e){ state.cart = {}; }
  updateCount();
}
function saveCart(){
  localStorage.setItem('damas_cart', JSON.stringify(state.cart));
  updateCount();
}
function updateCount(){
  if(!els.cartCount) return;
  const count = Object.values(state.cart).reduce((a, it) => a + it.qty, 0);
  els.cartCount.textContent = String(count);
}
function addToCart(id){
  const prod = state.products.find(p => p.id === id);
  if(!prod) return;
  if(!state.cart[id]) state.cart[id] = { ...prod, qty: 0 };
  state.cart[id].qty++;
  saveCart(); renderCart(); openDrawer();
}
function changeQty(id, delta){
  if(!state.cart[id]) return;
  state.cart[id].qty += delta;
  if(state.cart[id].qty <= 0) delete state.cart[id];
  saveCart(); renderCart();
}
function removeItem(id){
  delete state.cart[id]; saveCart(); renderCart();
}
function renderCart(){
  if(!els.cartItems || !els.cartTotal) return;
  const items = Object.values(state.cart);
  if(!items.length){ els.cartItems.innerHTML = '<p>Tu carrito está vacío.</p>'; els.cartTotal.textContent = fmtEUR(0); return; }
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
        <div class="price-sm">${fmtEUR(it.price)}</div>
        <button class="rm-btn" aria-label="Eliminar">Eliminar</button>
      </div>
      <div class="qty">
        <button aria-label="Disminuir">−</button>
        <strong>${it.qty}</strong>
        <button aria-label="Aumentar">+</button>
      </div>`;
    const [minus, plus] = row.querySelectorAll('.qty button');
    const rm = row.querySelector('.rm-btn');
    minus.addEventListener('click', () => changeQty(it.id, -1));
    plus.addEventListener('click', () => changeQty(it.id, +1));
    rm.addEventListener('click', () => removeItem(it.id));
    frag.appendChild(row);
  });
  els.cartItems.appendChild(frag);
  els.cartTotal.textContent = fmtEUR(total);
}


document.addEventListener('click', (e) => {
  if (e.target.matches('.badge')) {
    const cat = e.target.textContent.trim();
    state.category = cat;
    if (els.category) els.category.value = cat;
    renderChips?.(state.products);
    applyFilters();
    document.getElementById('grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (e.target.matches('.chip')) {
    const cat = e.target.dataset.cat;
    state.category = cat;
    if (els.category) els.category.value = cat;
    renderChips?.(state.products);
    applyFilters();
    document.getElementById('grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});
