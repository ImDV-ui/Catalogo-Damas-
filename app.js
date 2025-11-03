
// Minimal robust app.js

const fmtEUR = (n) => new Intl.NumberFormat("es-ES", {style:"currency", currency:"EUR"}).format(n ?? 0);
const state = { products: [], filtered: [], category:"all", search:"", sort:"name-asc", cart:{} };

function $(s){ return document.querySelector(s); }
function readEmbeddedProducts(){
  const tag = document.getElementById("products-data");
  if(!tag) return [];
  try{ const data = JSON.parse(tag.textContent||"[]"); return Array.isArray(data)?data:[]; }catch(_){ return []; }
}

function ensurePrices(){
  state.products = (state.products||[]).map(p=>{
    const price = Number(p.price||0);
    if(!price) p.price = 1.00;
    return p;
  });
}

function hydrateChips(items){
  const host = document.getElementById("catChips"); if(!host) return;
  host.innerHTML = "";
  const cats = Array.from(new Set(items.map(p=>p.category))).filter(Boolean).sort();
  const mk = (cat,label,active)=>{ const b=document.createElement("button"); b.className="chip"+(active?" active":""); b.dataset.cat=cat; b.textContent=label; b.onclick=()=>{ host.querySelectorAll(".chip").forEach(x=>x.classList.remove("active")); b.classList.add("active"); state.category=cat; applyFilters(); }; host.appendChild(b); };
  mk("all","Todas",true); cats.forEach(c=> mk(c, c.charAt(0).toUpperCase()+c.slice(1)));
}

function buildCard(p){
  const el=document.createElement("article"); el.className="card product-card";
  el.innerHTML=`
    <div class="thumb"><img src="${p.image || 'assets/img/default-product.svg'}" alt="${p.name}" onerror="this.src='assets/img/default-product.svg'"></div>
    <div class="nb">
      <span class="badge">${p.category||""}</span>
      <h3>${p.name||""}</h3>
      <p class="muted">${p.desc||""}</p>
      <div><strong>${fmtEUR(p.price)}</strong></div>
      <button class="btn" data-id="${p.id}">Añadir</button>
    </div>`;
  el.querySelector(".btn").addEventListener("click", ()=> addToCart(p.id));
  return el;
}

function renderGrid(list){
  const grid = document.getElementById("grid"); if(!grid) return;
  grid.innerHTML=""; const f=document.createDocumentFragment(); list.forEach(p=> f.appendChild(buildCard(p))); grid.appendChild(f);
}

function applyFilters(){
  let list=[...state.products];
  if(state.category!=="all") list=list.filter(p=>p.category===state.category);
  state.filtered=list; renderGrid(list);
}

// --- CART ---
function updateCartCount(){
  const count = Object.values(state.cart||{}).reduce((a,b)=>a+b,0);
  const c = document.getElementById("cartCount"); if(c) c.textContent = count;
  try{ localStorage.setItem("cart", JSON.stringify(state.cart||{})); }catch(_){}
}
function renderCart(){
  const listEl = document.getElementById("cartList"); const totalEl = document.querySelector("#cartTotal, [data-cart-total]");
  if(!listEl || !totalEl) return;
  const map = new Map((state.products||[]).map(p=>[p.id,p]));
  listEl.innerHTML=""; let total=0;
  Object.entries(state.cart||{}).forEach(([id,qty])=>{
    const p = map.get(id); if(!p) return; total += (p.price||0)*qty;
    const item=document.createElement("div"); item.className="cart-item";
    item.innerHTML=`
      <img src="${p.image || 'assets/img/default-product.svg'}" alt="${p.name}">
      <div>
        <h4>${p.name}</h4>
        <div class="cart-qty">
          <button class="qty-btn" data-op="dec" data-id="${id}">−</button>
          <span class="qty">${qty}</span>
          <button class="qty-btn" data-op="inc" data-id="${id}">+</button>
          <button class="qty-btn" data-op="del" data-id="${id}" title="Eliminar">🗑</button>
        </div>
      </div>
      <div><strong>${fmtEUR((p.price||0)*qty)}</strong></div>`;
    listEl.appendChild(item);
  });
  totalEl.textContent = fmtEUR(total);
  const checkout=document.getElementById("cartCheckout"); if(checkout) checkout.toggleAttribute("disabled", total<=0);
  updateCartCount();
}
function addToCart(id){ state.cart[id]=(state.cart[id]||0)+1; renderCart(); }
function attachCartUI(){
  try{ state.cart=JSON.parse(localStorage.getItem("cart")||"{}")||{}; }catch(_){ state.cart={}; }
  updateCartCount();
  document.getElementById("cartBtn")?.addEventListener("click", ()=> document.getElementById("cartDrawer")?.classList.add("open"));
  document.getElementById("cartClose")?.addEventListener("click", ()=> document.getElementById("cartDrawer")?.classList.remove("open"));
  document.getElementById("cartBackdrop")?.addEventListener("click", ()=> document.getElementById("cartDrawer")?.classList.remove("open"));
  document.getElementById("cartClear")?.addEventListener("click", ()=> { state.cart={}; renderCart(); });
  document.getElementById("cartList")?.addEventListener("click", (e)=>{
    const btn = e.target.closest(".qty-btn"); if(!btn) return;
    const id=btn.dataset.id; const op=btn.dataset.op;
    if(op==="inc") state.cart[id]=(state.cart[id]||0)+1;
    if(op==="dec"){ state.cart[id]=Math.max(0,(state.cart[id]||0)-1); if(state.cart[id]===0) delete state.cart[id]; }
    if(op==="del") delete state.cart[id];
    renderCart();
  });
  document.getElementById("cartCheckout")?.addEventListener("click", ()=>{
    const map = new Map((state.products||[]).map(p=>[p.id,p])); let lines=[], total=0;
    Object.entries(state.cart||{}).forEach(([id,qty])=>{ const p=map.get(id); if(!p) return; total+=(p.price||0)*qty; lines.push(`${qty} x ${p.name}`); });
    const msg = encodeURIComponent(`Pedido Damas:\\n${lines.join("\\n")}\\n\\nTotal: ${fmtEUR(total)}`);
    window.open("https://wa.me/?text="+msg,"_blank");
  });
  renderCart();
}

// --- Boot ---
function boot(){
  state.products = readEmbeddedProducts(); ensurePrices();
  hydrateChips(state.products); applyFilters();
}

document.addEventListener("DOMContentLoaded", ()=>{ boot(); attachCartUI(); });
