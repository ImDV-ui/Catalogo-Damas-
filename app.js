const fmtEUR = (n) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n ?? 0);
const state = { products: [], filtered: [], category: "all", search: "", sort: "name-asc", cart: {} };

function $(s) { return document.querySelector(s); }

function readEmbeddedProducts() {
  const tag = document.getElementById("products-data");
  if (!tag) return [];
  try { const data = JSON.parse(tag.textContent || "[]"); return Array.isArray(data) ? data : []; } catch (_) { return []; }
}

function ensurePrices() {
  state.products = (state.products || []).map(p => {
    const price = Number(p.price || 0);
    if (!price) p.price = 1.00;
    return p;
  });
}

async function loadProductData() {
  try {
    const res = await fetch("data/products.json", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json) && json.length) {
        state.products = json;
        ensurePrices();
        return;
      }
    }
  } catch (_) { }
  state.products = readEmbeddedProducts();
  ensurePrices();
}

function hydrateChips(items) {
  const host = $("#catChips"); if (!host) return;
  host.innerHTML = "";
  const cats = Array.from(new Set(items.map(p => p.category))).filter(Boolean).sort();
  const mk = (cat, label, active) => {
    const b = document.createElement("button");
    b.className = "chip" + (active ? " active" : "");
    b.dataset.cat = cat;
    b.textContent = label;
    b.onclick = () => {
      host.querySelectorAll(".chip").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      state.category = cat; applyFilters();
    };
    host.appendChild(b);
  };
  mk("all", "Todas", true);
  cats.forEach(c => mk(c, c.charAt(0).toUpperCase() + c.slice(1)));
}

function buildCard(p) {
  const el = document.createElement("article"); el.className = "card product-card";
  el.innerHTML = `
    <div class="thumb"><img src="${p.image || 'assets/img/default-product.svg'}" alt="${p.name}" onerror="this.src='assets/img/default-product.svg'"></div>
    <div class="body">
      <div class="meta">
        <span class="badge">${p.category || ""}</span>
        <span class="price">${fmtEUR(p.price)}</span>
      </div>
      <h3 class="name">${p.name || ""}</h3>
      <p class="muted">${p.desc || ""}</p>
      <button class="add-btn" data-id="${p.id}">Añadir</button>
    </div>`;
  const btn = el.querySelector(".add-btn");
  btn.addEventListener("click", () => { addToCart(p.id); });
  return el;
}

function renderGrid(list) {
  const grid = $("#grid"); if (!grid) return;
  grid.innerHTML = "";
  if (list.length === 0) { grid.innerHTML = `<div class="no-results"><h3>No se encontraron productos</h3><p>Prueba a cambiar los filtros o el término de búsqueda.</p></div>`; return; }
  const f = document.createDocumentFragment();
  list.forEach(p => f.appendChild(buildCard(p)));
  grid.appendChild(f);
}

function applyFilters() {
  let list = [...(state.products || [])];
  if (state.category !== "all") list = list.filter(p => p.category === state.category);
  if (state.search) {
    const s = state.search.toLowerCase();
    list = list.filter(p => (p.name || "").toLowerCase().includes(s));
  }
  const sort = state.sort;
  if (sort === "name-asc") list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  if (sort === "name-desc") list.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
  if (sort === "price-asc") list.sort((a, b) => (a.price || 0) - (b.price || 0));
  if (sort === "price-desc") list.sort((a, b) => (b.price || 0) - (a.price || 0));
  state.filtered = list;
  renderGrid(list);
}

// --- LÓGICA DE LA CESTA ---

function updateCartCount() {
  const count = Object.values(state.cart || {}).reduce((a, b) => a + b, 0);
  const c = $("#cartCount");
  if (c) {
    c.textContent = count;
    // Trigger bounce animation
    c.classList.remove('updated');
    void c.offsetWidth; // Force reflow
    c.classList.add('updated');
    setTimeout(() => c.classList.remove('updated'), 500);
  }
  try { localStorage.setItem("cart", JSON.stringify(state.cart || {})); } catch (_) { }
}

function addToCart(id) {
  state.cart[id] = (state.cart[id] || 0) + 1;
  updateCartCount();

  if ($("#cartDrawer").classList.contains("open")) {
    renderCart();
  }

  const btn = document.querySelector(`.add-btn[data-id="${id}"]`);
  if (btn) {
    btn.textContent = "¡Añadido!";
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = "Añadir";
      btn.disabled = false;
    }, 1200);
  }
}

function changeCartQuantity(id, amount) {
  if (!state.cart[id]) return;
  state.cart[id] += amount;
  if (state.cart[id] <= 0) {
    delete state.cart[id];
  }
  updateCartCount();
  renderCart();
}

function removeFromCart(id) {
  if (state.cart[id]) {
    delete state.cart[id];
    updateCartCount();
    renderCart();
  }
}

function renderCart() {
  const cartList = $("#cartList");
  const cartTotalEl = $("#cartTotal");
  const checkoutBtn = $("#cartCheckout");
  if (!cartList || !cartTotalEl) return;

  cartList.innerHTML = "";
  let total = 0;
  const cartItems = Object.entries(state.cart);

  if (cartItems.length === 0) {
    cartList.innerHTML = `<p style="padding: 2rem 1rem; text-align: center; color: var(--muted);">Tu carrito está vacío.</p>`;
    checkoutBtn.disabled = true;
    const clearBtn = $("#cartClear");
    if (clearBtn) clearBtn.remove();
  } else {
    const f = document.createDocumentFragment();
    for (const [id, qty] of cartItems) {
      const product = state.products.find(p => p.id === id);
      if (!product) continue;

      total += (product.price || 0) * qty;

      const itemEl = document.createElement("div");
      itemEl.className = "cart-item";
      itemEl.innerHTML = `
        <img src="${product.image || 'assets/img/default-product.svg'}" alt="${product.name}" onerror="this.src='assets/img/default-product.svg'">
        <div>
          <h4>${product.name}</h4>
          <span class="price-sm">${fmtEUR(product.price)}</span>
        </div>
        <div class="cart-qty">
          <button class="qty-btn" data-id="${id}" data-op="-1" aria-label="Disminuir cantidad">–</button>
          <span>${qty}</span>
          <button class="qty-btn" data-id="${id}" data-op="1" aria-label="Aumentar cantidad">+</button>
          <button class="rm-btn" data-id="${id}" aria-label="Eliminar producto">✖</button>
        </div>`;
      f.appendChild(itemEl);
    }
    cartList.appendChild(f);
    checkoutBtn.disabled = false;

    // Add Clear Cart button if not exists
    if (!$("#cartClear")) {
      const clearBtn = document.createElement("button");
      clearBtn.id = "cartClear";
      clearBtn.className = "btn btn-outline";
      clearBtn.textContent = "Vaciar carrito";
      clearBtn.style.marginTop = "0.5rem";
      clearBtn.onclick = () => {
        if (confirm("¿Estás seguro de que quieres vaciar el carrito?")) {
          state.cart = {};
          updateCartCount();
          renderCart();
        }
      };
      checkoutBtn.parentNode.insertBefore(clearBtn, checkoutBtn.nextSibling);
    }
  }
  cartTotalEl.textContent = fmtEUR(total);
}

function initCart() {
  try {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      state.cart = JSON.parse(savedCart);
      updateCartCount();
    }
  } catch (_) {
    state.cart = {};
  }

  const cartDrawer = $("#cartDrawer");
  const cartBtn = $("#cartBtn");
  const cartClose = $("#cartClose");
  const cartBackdrop = $("#cartBackdrop");

  const toggleCart = (open) => {
    const shouldOpen = typeof open === 'boolean' ? open : !cartDrawer.classList.contains("open");
    if (shouldOpen) {
      renderCart();
      cartDrawer.classList.add("open");
      cartDrawer.setAttribute('aria-hidden', 'false');
    } else {
      cartDrawer.classList.remove("open");
      cartDrawer.setAttribute('aria-hidden', 'true');
    }
  };

  cartBtn.addEventListener("click", () => toggleCart(true));
  cartClose.addEventListener("click", () => toggleCart(false));
  cartBackdrop.addEventListener("click", () => toggleCart(false));

  $("#cartList").addEventListener("click", (e) => {
    const target = e.target.closest("button");
    if (!target) return;
    const id = target.dataset.id;
    if (target.matches(".qty-btn")) {
      const op = parseInt(target.dataset.op, 10);
      changeCartQuantity(id, op);
    }
    if (target.matches(".rm-btn")) {
      removeFromCart(id);
    }
  });

  $("#cartCheckout").addEventListener("click", () => {
    if (Object.keys(state.cart).length === 0) return;

    const cartItems = Object.entries(state.cart);
    let message = "Hola, quiero hacer un pedido:\n\n";
    let total = 0;

    for (const [id, qty] of cartItems) {
      const product = state.products.find(p => p.id === id);
      if (product) {
        const subtotal = (product.price || 0) * qty;
        total += subtotal;
        message += `- ${qty}x ${product.name} (${fmtEUR(subtotal)})\n`;
      }
    }

    message += `\nTotal: ${fmtEUR(total)}`;

    // Número de teléfono del HTML
    const phone = "34603535204";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
  });
}

// --- TEMA (DARK MODE) ---
function initTheme() {
  const btn = document.getElementById("darkModeToggle");
  if (!btn) return;

  const icon = btn.querySelector(".theme-icon");
  const html = document.documentElement;

  // Cargar preferencia guardada o usar preferencia del sistema
  const saved = localStorage.getItem("theme");
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (saved === "dark" || (!saved && systemDark)) {
    html.classList.add("dark");
    icon.textContent = "☀️";
  } else {
    html.classList.remove("dark");
    icon.textContent = "🌙";
  }

  btn.addEventListener("click", () => {
    html.classList.toggle("dark");
    const isDark = html.classList.contains("dark");
    icon.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
}

// --- INICIALIZACIÓN ---

function boot() {
  initTheme();
  loadProductData().then(() => {
    // Elimina productos duplicados por nombre antes de renderizar
    const uniqueProducts = [];
    const seenNames = new Set();
    for (const product of state.products) {
      const productName = (product.name || "").trim().toLowerCase();
      if (!seenNames.has(productName)) {
        uniqueProducts.push(product);
        seenNames.add(productName);
      }
    }
    state.products = uniqueProducts;

    hydrateChips(state.products);
    applyFilters();
    initCart();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  boot();

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => { state.search = e.target.value; applyFilters(); });
  }

  const sortSelect = document.getElementById("sort");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => { state.sort = e.target.value; applyFilters(); });
  }

  const yearSpan = document.getElementById('year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  const toTopButton = document.getElementById('toTop');
  if (toTopButton) {
    // Mostrar/ocultar botón según scroll
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        toTopButton.style.opacity = '1';
        toTopButton.style.pointerEvents = 'auto';
        toTopButton.style.transform = 'translateY(0)';
      } else {
        toTopButton.style.opacity = '0';
        toTopButton.style.pointerEvents = 'none';
        toTopButton.style.transform = 'translateY(10px)';
      }
    });

    // Estilo inicial
    toTopButton.style.opacity = '0';
    toTopButton.style.transition = 'opacity 0.3s, transform 0.3s';

    toTopButton.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
});