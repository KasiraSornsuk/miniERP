// =====================================================
// ตั้งค่าการเชื่อมต่อ Supabase ที่นี่
// หาได้จาก Supabase Dashboard > Project Settings > API
// =====================================================
const SUPABASE_URL = 'https://glbacatnvkbhvofyoygu.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsYmFjYXRudmtiaHZvZnlveWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NzA1MDgsImV4cCI6MjA5ODE0NjUwOH0.kFznkE22KqDiGyrZsz2UAe_MMyDvj74bR0OLrx0HNlY';
// =====================================================

let supabase;
if (!SUPABASE_URL.includes('YOUR_SUPABASE')) {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  document.getElementById('setupNotice').classList.remove('hidden');
}

// FORMAT & UTILITY FUNCTIONS
function fmt(n) { 
  return '฿' + (Math.round((n || 0) * 100) / 100).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); 
}

function fmtDate(iso) { 
  const d = new Date(iso); 
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }); 
}

function escapeHtml(s) { 
  return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); 
}

function toast(msg) { 
  const t = document.getElementById('toast'); 
  t.textContent = msg; 
  t.classList.add('show'); 
  setTimeout(() => t.classList.remove('show'), 2200); 
}

// ---------- AUTH SYSTEM ----------
async function checkSession() {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    showApp(data.session.user);
  } else {
    document.getElementById('loginScreen').classList.remove('hidden');
  }
}

document.getElementById('login-btn')?.addEventListener('click', async () => {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errBox = document.getElementById('login-error');
  errBox.textContent = '';
  if (!email || !password) { errBox.textContent = 'กรุณากรอกอีเมลและรหัสผ่าน'; return; }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { errBox.textContent = 'เข้าสู่ระบบไม่สำเร็จ: อีเมลหรือรหัสผ่านไม่ถูกต้อง'; return; }
  showApp(data.user);
});

document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.reload();
});

function showApp(user) {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('userEmail').textContent = user.email;
  loadAll();
}

// ---------- TABS NAVIGATION ----------
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('main section').forEach(s => s.classList.add('hidden'));
    document.getElementById('tab-' + btn.dataset.tab).classList.remove('hidden');
    if (btn.dataset.tab === 'dashboard') renderDashboard();
    if (btn.dataset.tab === 'stock') renderStock();
    if (btn.dataset.tab === 'sell') renderProductSelects();
    if (btn.dataset.tab === 'buy') renderProductSelects();
    if (btn.dataset.tab === 'history') renderHistory();
  });
});

// ---------- DATA CACHE ----------
let PRODUCTS = [], SALES = [], PURCHASES = [];

async function loadAll() {
  await Promise.all([loadProducts(), loadSales(), loadPurchases()]);
  renderDashboard(); renderStock(); renderProductSelects(); renderHistory();
}
async function loadProducts() {
  const { data, error } = await supabase.from('products').select('*').order('name');
  if (!error) PRODUCTS = data;
}
async function loadSales() {
  const { data, error } = await supabase.from('sales').select('*, sale_items(*)').order('created_at', { ascending: false });
  if (!error) SALES = data;
}
async function loadPurchases() {
  const { data, error } = await supabase.from('purchases').select('*, purchase_items(*)').order('created_at', { ascending: false });
  if (!error) PURCHASES = data;
}

// ---------- STOCK MANAGEMENT ----------
function stockStatus(p) {
  if (p.qty <= 0) return { cls: 'out', label: 'หมดสต็อก' };
  if (p.qty <= p.min_qty) return { cls: 'low', label: 'ใกล้หมด' };
  return { cls: 'ok', label: 'ปกติ' };
}

document.getElementById('p-save').addEventListener('click', async () => {
  const name = document.getElementById('p-name').value.trim();
  const sku = document.getElementById('p-sku').value.trim();
  const cost = parseFloat(document.getElementById('p-cost').value) || 0;
  const price = parseFloat(document.getElementById('p-price').value) || 0;
  const qty = parseInt(document.getElementById('p-qty').value) || 0;
  const min_qty = parseInt(document.getElementById('p-min').value) || 0;
  const editId = document.getElementById('p-editId').value;
  if (!name) { toast('กรุณากรอกชื่อสินค้า'); return; }

  if (editId) {
    const { error } = await supabase.from('products').update({ name, sku, cost, price, qty, min_qty }).eq('id', editId);
    if (error) { toast('เกิดข้อผิดพลาด: ' + error.message); return; }
    toast('แก้ไขสินค้าเรียบร้อย');
  } else {
    const { error } = await supabase.from('products').insert({ name, sku, cost, price, qty, min_qty });
    if (error) { toast('เกิดข้อผิดพลาด: ' + error.message); return; }
    toast('เพิ่มสินค้าเรียบร้อย');
  }
  clearProductForm();
  await loadProducts();
  renderStock(); renderProductSelects();
});

document.getElementById('p-cancel').addEventListener('click', clearProductForm);

function clearProductForm() {
  ['p-name', 'p-sku', 'p-cost', 'p-price', 'p-qty', 'p-min', 'p-editId'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('stockFormTitle').textContent = 'เพิ่มสินค้าใหม่';
  document.getElementById('p-cancel').classList.add('hidden');
}

function editProduct(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  document.getElementById('p-name').value = p.name;
  document.getElementById('p-sku').value = p.sku || '';
  document.getElementById('p-cost').value = p.cost;
  document.getElementById('p-price').value = p.price;
  document.getElementById('p-qty').value = p.qty;
  document.getElementById('p-min').value = p.min_qty;
  document.getElementById('p-editId').value = p.id;
  document.getElementById('stockFormTitle').textContent = 'แก้ไขสินค้า: ' + p.name;
  document.getElementById('p-cancel').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteProduct(id) {
  if (!confirm('ลบสินค้านี้ออกจากคลังสินค้า?')) return;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) { toast('ลบไม่ได้: ' + error.message); return; }
  await loadProducts();
  renderStock(); renderProductSelects();
}

function renderStock() {
  const body = document.getElementById('stockTableBody');
  body.innerHTML = '';
  document.getElementById('stockEmpty').classList.toggle('hidden', PRODUCTS.length > 0);
  PRODUCTS.forEach(p => {
    const st = stockStatus(p);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(p.name)}</td>
      <td class="small">${escapeHtml(p.sku || '-')}</td>
      <td>${fmt(p.cost)}</td>
      <td>${fmt(p.price)}</td>
      <td>${p.qty}</td>
      <td><span class="badge ${st.cls}">${st.label}</span></td>
      <td>
        <button class="icon" onclick="editProduct('${p.id}')">แก้ไข</button>
        <button class="icon" onclick="deleteProduct('${p.id}')">ลบ</button>
      </td>`;
    body.appendChild(tr);
  });
}

function renderProductSelects() {
  ['sell-product', 'buy-product'].forEach(id => {
    const sel = document.getElementById(id);
    sel.innerHTML = '';
    if (PRODUCTS.length === 0) {
      sel.innerHTML = '<option value="">-- ยังไม่มีสินค้าในคลัง --</option>';
      return;
    }
    PRODUCTS.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} (คงเหลือ ${p.qty})`;
      sel.appendChild(opt);
    });
  });
}

// ---------- SELLING SYSTEM ----------
let sellCart = [];
document.getElementById('sell-add').addEventListener('click', () => {
  const pid = document.getElementById('sell-product').value;
  const qty = parseInt(document.getElementById('sell-qty').value) || 0;
  const p = PRODUCTS.find(x => x.id === pid);
  if (!p) { toast('กรุณาเลือกสินค้า'); return; }
  if (qty <= 0) { toast('จำนวนต้องมากกว่า 0'); return; }
  const already = sellCart.filter(c => c.productId === pid).reduce((s, c) => s + c.qty, 0);
  if (qty + already > p.qty) { toast(`สต็อกไม่พอ (คงเหลือ ${p.qty})`); return; }
  sellCart.push({ productId: p.id, name: p.name, qty, price: p.price, cost: p.cost });
  renderSellCart();
});

function renderSellCart() {
  const wrap = document.getElementById('sell-cart');
  wrap.innerHTML = '';
  let total = 0;
  sellCart.forEach((c, i) => {
    total += c.qty * c.price;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `<span>${escapeHtml(c.name)} x${c.qty}</span><span>${fmt(c.qty * c.price)} <button class="icon" onclick="removeSellItem(${i})">ลบ</button></span>`;
    wrap.appendChild(div);
  });
  document.getElementById('sell-total').textContent = fmt(total);
}

function removeSellItem(i) { sellCart.splice(i, 1); renderSellCart(); }

document.getElementById('sell-confirm').addEventListener('click', async () => {
  if (sellCart.length === 0) { toast('ยังไม่มีรายการขาย'); return; }
  const { data: { user } } = await supabase.auth.getUser();
  let total = 0, cost = 0;
  sellCart.forEach(c => { total += c.qty * c.price; cost += c.qty * c.cost; });

  const { data: sale, error: saleErr } = await supabase.from('sales')
    .insert({ total, cost, created_by: user.email }).select().single();
  if (saleErr) { toast('บันทึกไม่สำเร็จ: ' + saleErr.message); return; }

  const items = sellCart.map(c => ({ sale_id: sale.id, product_id: c.productId, name: c.name, qty: c.qty, price: c.price }));
  await supabase.from('sale_items').insert(items);

  for (const c of sellCart) {
    const p = PRODUCTS.find(x => x.id === c.productId);
    await supabase.from('products').update({ qty: p.qty - c.qty }).eq('id', c.productId);
  }

  sellCart = [];
  renderSellCart();
  await loadProducts(); await loadSales();
  renderProductSelects();
  toast('บันทึกการขายเรียบร้อย');
});

// ---------- PURCHASING SYSTEM ----------
let buyCart = [];
document.getElementById('buy-product').addEventListener('change', () => {
  const pid = document.getElementById('buy-product').value;
  const p = PRODUCTS.find(x => x.id === pid);
  if (p) document.getElementById('buy-cost').value = p.cost;
});

document.getElementById('buy-add').addEventListener('click', () => {
  const pid = document.getElementById('buy-product').value;
  const qty = parseInt(document.getElementById('buy-qty').value) || 0;
  const cost = parseFloat(document.getElementById('buy-cost').value) || 0;
  const p = PRODUCTS.find(x => x.id === pid);
  if (!p) { toast('กรุณาเลือกสินค้า'); return; }
  if (qty <= 0) { toast('จำนวนต้องมากกว่า 0'); return; }
  buyCart.push({ productId: p.id, name: p.name, qty, cost });
  renderBuyCart();
});

function renderBuyCart() {
  const wrap = document.getElementById('buy-cart');
  wrap.innerHTML = '';
  let total = 0;
  buyCart.forEach((c, i) => {
    total += c.qty * c.cost;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `<span>${escapeHtml(c.name)} x${c.qty}</span><span>${fmt(c.qty * c.cost)} <button class="icon" onclick="removeBuyItem(${i})">ลบ</button></span>`;
    wrap.appendChild(div);
  });
  document.getElementById('buy-total').textContent = fmt(total);
}

function removeBuyItem(i) { buyCart.splice(i, 1); renderBuyCart(); }

document.getElementById('buy-confirm').addEventListener('click', async () => {
  if (buyCart.length === 0) { toast('ยังไม่มีรายการรับซื้อ'); return; }
  const { data: { user } } = await supabase.auth.getUser();
  let total = 0;
  buyCart.forEach(c => { total += c.qty * c.cost; });

  const { data: purchase, error: pErr } = await supabase.from('purchases')
    .insert({ total, created_by: user.email }).select().single();
  if (pErr) { toast('บันทึกไม่สำเร็จ: ' + pErr.message); return; }

  const items = buyCart.map(c => ({ purchase_id: purchase.id, product_id: c.productId, name: c.name, qty: c.qty, cost: c.cost }));
  await supabase.from('purchase_items').insert(items);

  for (const c of buyCart) {
    const p = PRODUCTS.find(x => x.id === c.productId);
    await supabase.from('products').update({ qty: p.qty + c.qty, cost: c.cost }).eq('id', c.productId);
  }

  buyCart = [];
  renderBuyCart();
  await loadProducts(); await loadPurchases();
  renderProductSelects();
  toast('รับเข้าสต็อกเรียบร้อย');
});

// ---------- DASHBOARD RENDERING ----------
function renderDashboard() {
  const stockValue = PRODUCTS.reduce((s, p) => s + p.qty * p.cost, 0);
  document.getElementById('m-stockValue').textContent = fmt(stockValue);

  const tKey = new Date().toDateString();
  const todaySales = SALES.filter(s => new Date(s.created_at).toDateString() === tKey);
  const todayTotal = todaySales.reduce((s, x) => s + Number(x.total), 0);
  const todayCost = todaySales.reduce((s, x) => s + Number(x.cost || 0), 0);
  document.getElementById('m-todaySales').textContent = fmt(todayTotal);
  document.getElementById('m-todayProfit').textContent = fmt(todayTotal - todayCost);

  const low = PRODUCTS.filter(p => p.qty <= p.min_qty);
  document.getElementById('m-lowStock').textContent = low.length;

  const lowBody = document.getElementById('lowStockBody');
  lowBody.innerHTML = '';
  document.getElementById('lowStockEmpty').classList.toggle('hidden', low.length > 0);
  low.forEach(p => {
    const st = stockStatus(p);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(p.name)}</td><td>${p.qty}</td><td>${p.min_qty}</td><td><span class="badge ${st.cls}">${st.label}</span></td>`;
    lowBody.appendChild(tr);
  });

  const recentBody = document.getElementById('recentSalesBody');
  recentBody.innerHTML = '';
  const recent = SALES.slice(0, 8);
  document.getElementById('recentSalesEmpty').classList.toggle('hidden', recent.length > 0);
  recent.forEach(s => {
    const itemsLabel = (s.sale_items || []).map(i => `${i.name} x${i.qty}`).join(', ');
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="small">${fmtDate(s.created_at)}</td><td class="small">${escapeHtml(s.created_by || '-')}</td><td>${escapeHtml(itemsLabel)}</td><td>${fmt(s.total)}</td>`;
    recentBody.appendChild(tr);
  });
}

// ---------- HISTORY LOGS ----------
let historyFilter = 'all';
document.querySelectorAll('.tag-btn').forEach(b => {
  b.addEventListener('click', () => { historyFilter = b.dataset.filter; renderHistory(); });
});

function renderHistory() {
  const body = document.getElementById('historyTableBody');
  body.innerHTML = '';
  let rows = [];
  if (historyFilter !== 'purchase') {
    SALES.forEach(s => rows.push({ date: s.created_at, type: 'sale', by: s.created_by, items: s.sale_items || [], qty: (s.sale_items || []).reduce((a, b) => a + b.qty, 0), amount: s.total }));
  }
  if (historyFilter !== 'sale') {
    PURCHASES.forEach(p => rows.push({ date: p.created_at, type: 'purchase', by: p.created_by, items: p.purchase_items || [], qty: (p.purchase_items || []).reduce((a, b) => a + b.qty, 0), amount: p.total }));
  }
  rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  document.getElementById('historyEmpty').classList.toggle('hidden', rows.length > 0);
  rows.forEach(r => {
    const label = r.items.map(i => `${i.name} x${i.qty}`).join(', ');
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="small">${fmtDate(r.date)}</td><td><span class="badge ${r.type === 'sale' ? 'ok' : 'low'}">${r.type === 'sale' ? 'ขาย' : 'ซื้อ'}</span></td><td class="small">${escapeHtml(r.by || '-')}</td><td>${escapeHtml(label)}</td><td>${r.qty}</td><td>${fmt(r.amount)}</td>`;
    body.appendChild(tr);
  });
}

// ---------- INITIALIZATION ----------
checkSession();
