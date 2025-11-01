
const € = (n) => new Intl.NumberFormat('es-ES',{style:'currency', currency:'EUR'}).format(n);

const state = {
  products: [],
  filtered: [],
  category: 'all',
  search: '',
  sort: 'name-asc',
};

const els = {
  grid: document.getElementById('grid'),
  category: document.getElementById('category'),
  search: document.getElementById('search'),
  sort: document.getElementById('sort'),
  year: document.getElementById('year'),
  toTop: document.getElementById('toTop'),
};

els.year.textContent = new Date().getFullYear();
els.toTop.addEventListener('click', e => { e.preventDefault(); window.scrollTo({top:0, behavior:'smooth'}); });

// Leer JSON con fetch
fetch('data/products.json')
  .then(r => r.json())
  .then(data => {
    state.products = data;
    hydrateCategoryFilter(data);
    applyFilters();
  })
  .catch(err => {
    console.error('Error cargando JSON', err);
    els.grid.innerHTML = '<p>No se pudo cargar el catálogo.</p>';
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

// Listeners
els.category.addEventListener('change', () => { state.category = els.category.value; applyFilters(); });
els.search.addEventListener('input', () => { state.search = els.search.value; applyFilters(); });
els.sort.addEventListener('change', () => { state.sort = els.sort.value; applyFilters(); });

function applyFilters(){
  let list = [...state.products];

  // categoría
  if(state.category !== 'all'){
    list = list.filter(p => p.category === state.category);
  }

  // búsqueda
  const q = state.search.trim().toLowerCase();
  if(q){
    list = list.filter(p => (p.name + ' ' + (p.tags||'')).toLowerCase().includes(q));
  }

  // orden
  const [field, dir] = state.sort.split('-');
  list.sort((a,b) => {
    if(field === 'name') return dir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    if(field === 'price') return dir === 'asc' ? a.price - b.price : b.price - a.price;
    return 0;
  });

  state.filtered = list;
  render();
}

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
      <button class="add-btn" type="button">Añadir</button>
    </div>
  `;
  article.querySelector('.add-btn').addEventListener('click', () => {
    alert(\`Añadido: ${p.name} — ${€(p.price)}\n(Ejemplo sin carrito real)\`);
  });
  return article;
}
