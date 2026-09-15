const colorPalette = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500'
];

let products = [];
let bills = [];
let cart = []; 
let currentTab = 'pos';
let alertCallback = null;
let currentCheckoutTotal = 0;
let currentPaymentMethod = 'cash';
let salesChartInstance = null;
let isNoQueue = false; // สถานะใช้งานคิว

function initApp() {
    document.getElementById('summary-date').value = getTodayDateStr();
    setupEventListeners();
    renderColorPicker();
    subscribeRealtimeData();
}

/* --- Real-time Sync with Firebase --- */
function subscribeRealtimeData() {
    const statusEl = document.getElementById('cloud-status');
    
    // Listen to Products changes
    db.collection("products").onSnapshot((snapshot) => {
        products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProductsInPOS();
        renderProductsTable();
        
        statusEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-green-400"></span> เชื่อมต่อคลาวด์แล้ว';
        statusEl.className = 'flex items-center gap-1.5 text-xs bg-green-800 text-green-200 px-2.5 py-1 rounded-full ml-2';
    }, (error) => {
        console.error("Firestore Error:", error);
        statusEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-red-400"></span> เชื่อมต่อล้มเหลว';
        statusEl.className = 'flex items-center gap-1.5 text-xs bg-red-800 text-red-200 px-2.5 py-1 rounded-full ml-2';
        customAlert("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาตรวจสอบ Firebase Rules", "error");
    });

    // Listen to Sales Bills changes
    db.collection("bills").onSnapshot((snapshot) => {
        bills = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (currentTab === 'summary') {
            loadSummaryData();
        }
    });
}

function setupEventListeners() {
    document.getElementById('pos-search').addEventListener('input', (e) => renderProductsInPOS(e.target.value));
    document.getElementById('manage-search').addEventListener('input', (e) => renderProductsTable(e.target.value));
    document.getElementById('cash-received').addEventListener('input', calculateChange);
}

/* --- ฟังก์ชันสลับการใช้งานคิว (ใช้ ปุ่มกด แทน Checkbox) --- */
function toggleNoQueue(forcedState) {
    if (typeof forcedState === 'boolean') {
        isNoQueue = forcedState;
    } else {
        isNoQueue = !isNoQueue;
    }

    const queueInput = document.getElementById('queue-number');
    const btnNoQueue = document.getElementById('btn-no-queue');

    if (isNoQueue) {
        queueInput.disabled = true;
        queueInput.classList.add('bg-gray-100', 'text-gray-400', 'cursor-not-allowed');
        queueInput.classList.remove('bg-white', 'text-blue-600');

        // ปรับสไตล์ปุ่มเมื่อเปิดโหมด "ไม่ใช้คิว"
        btnNoQueue.className = 'px-2.5 py-1 text-xs font-semibold rounded-md transition-all bg-red-500 text-white border border-red-600 shadow-sm active:scale-95 select-none flex items-center gap-1 hover:bg-red-600';
        btnNoQueue.innerHTML = '<i class="fas fa-times-circle"></i> ไม่ใช้คิว (เปิดอยู่)';
    } else {
        queueInput.disabled = false;
        queueInput.classList.remove('bg-gray-100', 'text-gray-400', 'cursor-not-allowed');
        queueInput.classList.add('bg-white', 'text-blue-600');

        // ปรับสไตล์ปุ่มปกติ
        btnNoQueue.className = 'px-2.5 py-1 text-xs font-semibold rounded-md border transition-all bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200 active:scale-95 select-none shadow-sm flex items-center gap-1';
        btnNoQueue.innerHTML = '<i class="fas fa-ban"></i> ไม่ใช้คิว';
    }
}

function formatCurrency(amount) {
    return '฿' + parseFloat(amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getTodayDateStr() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function switchTab(tabId) {
    currentTab = tabId;
    ['pos', 'products', 'summary'].forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        const view = document.getElementById(`view-${t}`);
        if (t === tabId) {
            btn.classList.add('bg-blue-700', 'font-medium');
            btn.classList.remove('hover:bg-blue-700');
            view.classList.remove('opacity-0', 'pointer-events-none');
            view.classList.add('opacity-100');
            view.style.zIndex = '10';
        } else {
            btn.classList.remove('bg-blue-700', 'font-medium');
            btn.classList.add('hover:bg-blue-700');
            view.classList.remove('opacity-100');
            view.classList.add('opacity-0', 'pointer-events-none');
            view.style.zIndex = '0';
        }
    });

    if (tabId === 'summary') loadSummaryData();
    else if (tabId === 'products') renderProductsTable();
    else if (tabId === 'pos') renderProductsInPOS();
}

function renderProductsInPOS(searchQuery = '') {
    const grid = document.getElementById('pos-product-grid');
    grid.innerHTML = '';
    const query = searchQuery.toLowerCase().trim();
    const filtered = products.filter(p => p.name.toLowerCase().includes(query));

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400">ไม่พบสินค้าในระบบ</div>`;
        return;
    }

    filtered.forEach(product => {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl shadow-sm border border-gray-100 p-2 flex flex-col items-center justify-between cursor-pointer hover:scale-105 transition-transform active:scale-95 aspect-square';
        card.onclick = () => addToCart(product.id);
        
        let mediaHtml = product.image 
            ? `<div class="w-full flex-1 rounded overflow-hidden bg-gray-50 flex items-center justify-center my-1"><img src="${product.image}" class="w-full h-full object-cover"></div>`
            : `<div class="w-full flex-1 rounded ${product.color || 'bg-blue-500'} text-white flex items-center justify-center text-3xl font-bold my-1">${product.name.charAt(0)}</div>`;

        card.innerHTML = `
            ${mediaHtml}
            <div class="text-center w-full mt-1">
                <h3 class="font-medium text-gray-800 truncate text-xs mb-0.5">${product.name}</h3>
                <p class="text-blue-600 font-bold text-xs">${formatCurrency(product.price)}</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.product.id === productId);
    if (existingItem) {
        existingItem.quantity += 1;
        existingItem.total = existingItem.quantity * existingItem.product.price;
    } else {
        cart.push({ product, quantity: 1, total: product.price });
    }
    renderCart();
}

function updateCartQuantity(productId, delta) {
    const index = cart.findIndex(i => i.product.id === productId);
    if (index > -1) {
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) cart.splice(index, 1);
        else cart[index].total = cart[index].quantity * cart[index].product.price;
        renderCart();
    }
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.product.id !== productId);
    renderCart();
}

function clearCart() {
    if (cart.length === 0) return;
    customConfirm("ล้างรายการ", "ต้องการล้างรายการสินค้าในตะกร้าทั้งหมดใช่หรือไม่?", () => {
        cart = [];
        renderCart();
    });
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    const emptyMsg = document.getElementById('empty-cart-msg');
    const totalQtyEl = document.getElementById('cart-total-qty');
    const totalPriceEl = document.getElementById('cart-total-price');
    const checkoutBtn = document.getElementById('btn-checkout');

    if (cart.length === 0) {
        container.innerHTML = '';
        emptyMsg.style.display = 'flex';
        totalQtyEl.textContent = '0';
        totalPriceEl.textContent = '฿0.00';
        checkoutBtn.disabled = true;
        return;
    }

    emptyMsg.style.display = 'none';
    container.innerHTML = '';
    let totalQty = 0, totalPrice = 0;

    cart.forEach(item => {
        totalQty += item.quantity;
        totalPrice += item.total;
        const itemEl = document.createElement('div');
        itemEl.className = 'bg-white p-3 mb-2 rounded-lg border border-gray-100 shadow-sm flex flex-col gap-2';
        itemEl.innerHTML = `
            <div class="flex justify-between items-start">
                <span class="font-medium text-gray-800 text-sm w-3/4 truncate">${item.product.name}</span>
                <button onclick="removeFromCart('${item.product.id}')" class="text-red-400 hover:text-red-600"><i class="fas fa-times"></i></button>
            </div>
            <div class="flex justify-between items-center mt-1">
                <div class="flex items-center border border-gray-200 rounded-md bg-gray-50">
                    <button onclick="updateCartQuantity('${item.product.id}', -1)" class="w-8 h-8 font-bold">-</button>
                    <span class="w-8 text-center font-medium text-sm">${item.quantity}</span>
                    <button onclick="updateCartQuantity('${item.product.id}', 1)" class="w-8 h-8 font-bold">+</button>
                </div>
                <span class="font-bold text-gray-700">${formatCurrency(item.total)}</span>
            </div>
        `;
        container.appendChild(itemEl);
    });

    totalQtyEl.textContent = totalQty;
    totalPriceEl.textContent = formatCurrency(totalPrice);
    checkoutBtn.disabled = false;
}

function openCheckoutModal() {
    if (cart.length === 0) return;
    currentCheckoutTotal = cart.reduce((sum, item) => sum + item.total, 0);
    document.getElementById('checkout-total-display').textContent = formatCurrency(currentCheckoutTotal);
    document.getElementById('cash-received').value = '';
    document.getElementById('change-display-container').classList.add('hidden');
    setPaymentMethod('cash');
    openModal('modal-checkout');
}

function setPaymentMethod(method) {
    currentPaymentMethod = method;
    const btnCash = document.getElementById('btn-pay-cash');
    const btnPromptpay = document.getElementById('btn-pay-promptpay');
    const secCash = document.getElementById('section-pay-cash');
    const secPromptpay = document.getElementById('section-pay-promptpay');

    if (method === 'cash') {
        btnCash.className = 'flex-1 py-2 rounded-md bg-white shadow-sm font-medium text-gray-800 text-sm';
        btnPromptpay.className = 'flex-1 py-2 rounded-md font-medium text-gray-500 text-sm';
        secCash.classList.remove('hidden');
        secPromptpay.classList.add('hidden');
    } else {
        btnPromptpay.className = 'flex-1 py-2 rounded-md bg-white shadow-sm font-medium text-gray-800 text-sm';
        btnCash.className = 'flex-1 py-2 rounded-md font-medium text-gray-500 text-sm';
        secPromptpay.classList.remove('hidden');
        secCash.classList.add('hidden');
    }
}

function calculateChange() {
    const cashInput = parseFloat(document.getElementById('cash-received').value) || 0;
    const container = document.getElementById('change-display-container');
    const display = document.getElementById('change-amount-display');

    if (cashInput >= currentCheckoutTotal) {
        container.classList.remove('hidden');
        display.textContent = formatCurrency(cashInput - currentCheckoutTotal);
    } else {
        container.classList.add('hidden');
    }
}

async function processCheckout() {
    let cashReceived = currentCheckoutTotal;
    let change = 0;

    if (currentPaymentMethod === 'cash') {
        const inputVal = document.getElementById('cash-received').value;
        cashReceived = inputVal === '' ? currentCheckoutTotal : parseFloat(inputVal);
        if (isNaN(cashReceived) || cashReceived < currentCheckoutTotal) {
            customAlert("ข้อผิดพลาด", "จำนวนเงินที่รับมาไม่เพียงพอ", "error");
            return;
        }
        change = cashReceived - currentCheckoutTotal;
    }

    const queueInput = document.getElementById('queue-number');
    let queueNo = isNoQueue ? "-" : (parseInt(queueInput.value) || 1);

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newBill = {
        queue: queueNo,
        date: dateStr,
        time: timeStr,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        items: cart.map(i => ({ name: i.product.name, qty: i.quantity, total: i.total })),
        total: currentCheckoutTotal,
        paymentMethod: currentPaymentMethod === 'promptpay' ? 'พร้อมเพย์' : 'เงินสด',
        cashReceived,
        change
    };

    try {
        await db.collection("bills").add(newBill);
        cart = [];
        renderCart();
        closeModal('modal-checkout');

        if (!isNoQueue) {
            let currentQueue = parseInt(queueInput.value) || 1;
            currentQueue = currentQueue >= 50 ? 1 : currentQueue + 1;
            queueInput.value = currentQueue;
        }

        showToast(`ชำระเงินสำเร็จ ${formatCurrency(currentCheckoutTotal)}`, 'success');
    } catch (error) {
        console.error("Save Bill Error:", error);
        customAlert("ข้อผิดพลาด", "ไม่สามารถบันทึกบิลได้", "error");
    }
}

function renderProductsTable(searchQuery = '') {
    const tbody = document.getElementById('products-table-body');
    tbody.innerHTML = '';
    const query = searchQuery.toLowerCase().trim();
    const filtered = products.filter(p => p.name.toLowerCase().includes(query));

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-400">ไม่พบข้อมูลสินค้า</td></tr>`;
        return;
    }

    filtered.forEach((p, idx) => {
        const tr = document.createElement('tr');
        const mediaHtml = p.image 
            ? `<div class="h-10 w-10 border border-gray-200 overflow-hidden bg-gray-50"><img src="${p.image}" class="w-full h-full object-cover"></div>`
            : `<div class="h-10 w-10 ${p.color || 'bg-blue-500'} text-white flex items-center justify-center font-bold text-xs">${p.name.charAt(0)}</div>`;

        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#${String(idx + 1).padStart(3, '0')}</td>
            <td class="px-6 py-4 whitespace-nowrap"><div class="flex items-center gap-3">${mediaHtml}<span class="text-sm font-medium text-gray-900">${p.name}</span></div></td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">${formatCurrency(p.price)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-center">
                <button onclick="editProduct('${p.id}')" class="text-blue-600 bg-blue-50 px-2 py-1 rounded mr-2"><i class="fas fa-edit"></i> แก้ไข</button>
                <button onclick="deleteProduct('${p.id}')" class="text-red-600 bg-red-50 px-2 py-1 rounded"><i class="fas fa-trash-alt"></i> ลบ</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('prod-image-base64').value = e.target.result;
        document.getElementById('prod-img-preview').innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover">`;
    };
    reader.readAsDataURL(file);
}

function renderColorPicker() {
    const container = document.getElementById('color-picker-container');
    container.innerHTML = '';
    colorPalette.forEach(c => {
        const div = document.createElement('div');
        div.className = `w-8 h-8 cursor-pointer border-2 border-transparent hover:scale-110 ${c}`;
        div.onclick = () => {
            document.getElementById('prod-color').value = c;
            Array.from(container.children).forEach(child => child.classList.remove('border-gray-800'));
            div.classList.add('border-gray-800');
        };
        container.appendChild(div);
    });
}

function openAddProductModal() {
    document.getElementById('modal-product-title').textContent = 'เพิ่มสินค้าใหม่';
    document.getElementById('form-product').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-image-base64').value = '';
    document.getElementById('prod-img-preview').innerHTML = `<i class="fas fa-image text-2xl"></i>`;
    document.getElementById('prod-color').value = 'bg-blue-500';
    openModal('modal-product');
}

function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    document.getElementById('modal-product-title').textContent = 'แก้ไขสินค้า';
    document.getElementById('prod-id').value = product.id;
    document.getElementById('prod-name').value = product.name;
    document.getElementById('prod-price').value = product.price;
    document.getElementById('prod-image-base64').value = product.image || '';
    document.getElementById('prod-color').value = product.color || 'bg-blue-500';
    document.getElementById('prod-img-preview').innerHTML = product.image 
        ? `<img src="${product.image}" class="w-full h-full object-cover">` 
        : `<i class="fas fa-image text-2xl"></i>`;
    openModal('modal-product');
}

async function saveProduct(event) {
    event.preventDefault();
    const id = document.getElementById('prod-id').value;
    const name = document.getElementById('prod-name').value.trim();
    const price = parseFloat(document.getElementById('prod-price').value);
    const color = document.getElementById('prod-color').value;
    const image = document.getElementById('prod-image-base64').value;

    if (!name || isNaN(price) || price < 0) return;

    const productData = { name, price, color, image };

    try {
        if (id) {
            await db.collection("products").doc(id).update(productData);
            showToast(`แก้ไข ${name} แล้ว`, 'success');
        } else {
            await db.collection("products").add(productData);
            showToast(`เพิ่ม ${name} แล้ว`, 'success');
        }
        closeModal('modal-product');
    } catch (err) {
        console.error("Save Product Error:", err);
        customAlert("ข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้", "error");
    }
}

function deleteProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    customConfirm("ยืนยันการลบ", `ต้องการลบ "${product.name}" ใช่หรือไม่?`, async () => {
        try {
            await db.collection("products").doc(productId).delete();
            showToast(`ลบ ${product.name} แล้ว`, 'info');
        } catch (err) {
            customAlert("ข้อผิดพลาด", "ไม่สามารถลบสินค้าได้", "error");
        }
    }, true);
}

function loadSummaryData() {
    const selectedDate = document.getElementById('summary-date').value;
    
    // 1. กรองบิลเฉพาะวันที่เลือก
    let filteredBills = bills.filter(b => b.date === selectedDate);

    // 2. แปลงเวลาของทุกบิลให้เป็น ตัวเลข Timestamp เสมอ (แก้ปัญหารูปแบบเวลาไม่ตรงกัน)
    const getBillTimestamp = (bill) => {
        if (bill.createdAt && typeof bill.createdAt.seconds === 'number') {
            return bill.createdAt.seconds * 1000;
        }
        if (bill.date && bill.time) {
            let timeStr = bill.time.trim();
            if (timeStr.split(':').length === 2) timeStr += ':00';
            const parsedDate = new Date(`${bill.date}T${timeStr}`);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate.getTime();
            }
        }
        return 0;
    };

    // 3. เรียงจาก มากไปน้อย (เวลาล่าสุดขึ้นก่อนเสมอ)
    filteredBills.sort((a, b) => getBillTimestamp(b) - getBillTimestamp(a));

    let totalRev = 0, totalCash = 0, totalPromptpay = 0, totalItems = 0;
    const itemMap = {};

    filteredBills.forEach(b => {
        totalRev += b.total || 0;
        if (b.paymentMethod === 'พร้อมเพย์') totalPromptpay += b.total || 0;
        else totalCash += b.total || 0;

        (b.items || []).forEach(i => {
            totalItems += i.qty || 0;
            if (!itemMap[i.name]) itemMap[i.name] = { name: i.name, qty: 0, total: 0 };
            itemMap[i.name].qty += i.qty;
            itemMap[i.name].total += i.total;
        });
    });

    document.getElementById('sum-total-revenue').textContent = formatCurrency(totalRev);
    document.getElementById('sum-total-cash').textContent = formatCurrency(totalCash);
    document.getElementById('sum-total-promptpay').textContent = formatCurrency(totalPromptpay);
    document.getElementById('sum-total-bills').textContent = filteredBills.length;
    document.getElementById('sum-total-items').textContent = totalItems;

    const itemsArray = Object.values(itemMap).sort((a, b) => b.qty - a.qty);
    renderSummaryItems(itemsArray);
    renderSummaryBills(filteredBills);
    renderChart(itemsArray);
}

function renderSummaryItems(itemsArray) {
    const tbody = document.getElementById('summary-items-body');
    const emptyState = document.getElementById('summary-items-empty');
    tbody.innerHTML = '';

    if (itemsArray.length === 0) {
        tbody.parentElement.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    tbody.parentElement.classList.remove('hidden');
    emptyState.classList.add('hidden');

    itemsArray.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-5 py-3 text-sm text-gray-800 font-medium">${item.name}</td>
            <td class="px-5 py-3 text-sm text-gray-600 text-right">${item.qty}</td>
            <td class="px-5 py-3 text-sm text-blue-600 font-medium text-right">${formatCurrency(item.total)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderSummaryBills(filteredBills) {
    const container = document.getElementById('summary-bills-container');
    const emptyState = document.getElementById('summary-bills-empty');
    container.innerHTML = '';

    if (filteredBills.length === 0) {
        container.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    container.classList.remove('hidden');
    emptyState.classList.add('hidden');

    filteredBills.forEach((b) => {
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-lg shadow-sm border border-gray-100 text-sm hover:border-gray-200 transition-colors';
        
        let itemsListHtml = '<ul class="mt-2 mb-2 text-xs text-gray-600 border-l-2 border-gray-200 pl-2 space-y-1">';
        (b.items || []).forEach(i => {
            itemsListHtml += `<li>${i.qty}x ${i.name} <span class="float-right text-gray-500">${formatCurrency(i.total)}</span></li>`;
        });
        itemsListHtml += '</ul>';

        const queueText = (b.queue && b.queue !== '-') ? `คิว ${b.queue}` : 'ไม่ใช้คิว';

        card.innerHTML = `
            <div class="flex justify-between items-center mb-1 border-b border-dashed border-gray-200 pb-2">
                <div class="flex items-center gap-2">
                    <span class="font-bold text-gray-700">${queueText}</span>
                    <span class="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-medium">${b.paymentMethod || 'เงินสด'}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-500 font-mono"><i class="far fa-clock mr-1"></i>${b.time || ''}</span>
                    <button onclick="deleteBill('${b.id}')" class="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors" title="ลบบิลนี้">
                        <i class="fas fa-trash-alt text-xs"></i>
                    </button>
                </div>
            </div>
            ${itemsListHtml}
            <div class="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                <span class="text-gray-500 text-xs">${b.paymentMethod === 'พร้อมเพย์' ? '<i class="fas fa-qrcode text-blue-500 mr-1"></i>พร้อมเพย์' : '<i class="fas fa-money-bill-wave text-green-500 mr-1"></i>เงินสด'}</span>
                <span class="font-bold text-blue-600 text-base">${formatCurrency(b.total)}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

function deleteBill(billId) {
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;

    const queueText = (bill.queue && bill.queue !== '-') ? `คิวที่ <b>${bill.queue}</b>` : '<b>ไม่ใช้คิว</b>';

    customConfirm(
        "ยืนยันการลบบิล", 
        `คุณต้องการลบบิล${queueText} (เวลา ${bill.time || ''} - ยอด ${formatCurrency(bill.total)}) ใช่หรือไม่?`, 
        async () => {
            try {
                await db.collection("bills").doc(billId).delete();
                showToast("ลบบิลประวัติการขายเรียบร้อยแล้ว", "info");
            } catch (err) {
                console.error("Delete Bill Error:", err);
                customAlert("ข้อผิดพลาด", "ไม่สามารถลบบิลได้", "error");
            }
        }, 
        true
    );
}

function renderChart(itemsArray) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    const emptyMsg = document.getElementById('chart-empty-msg');

    if (itemsArray.length === 0) {
        emptyMsg.classList.remove('hidden');
        if (salesChartInstance) salesChartInstance.destroy();
        return;
    }
    emptyMsg.classList.add('hidden');

    if (salesChartInstance) salesChartInstance.destroy();
    salesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: itemsArray.map(i => i.name),
            datasets: [{
                label: 'จำนวนสินค้า (ชิ้น)',
                data: itemsArray.map(i => i.qty),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
            plugins: { legend: { display: false } }
        }
    });
}

function downloadDailyCSV() {
    const selectedDate = document.getElementById('summary-date').value;
    const filtered = bills.filter(b => b.date === selectedDate);
    if (filtered.length === 0) {
        customAlert("ไม่มีข้อมูล", "ไม่พบข้อมูลการขายในวันที่เลือก", "info");
        return;
    }

    let csv = "\uFEFFเลขบิล,คิว,เวลา,รายการสินค้า,ช่องทางชำระเงิน,ยอดรวม (บาท)\n";
    filtered.forEach((b, idx) => {
        const itemsDesc = (b.items || []).map(i => `${i.qty}x ${i.name}`).join(' | ');
        csv += `บิล #${idx + 1},${b.queue || '-'},${b.time || '-'},"${itemsDesc}",${b.paymentMethod},${b.total}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_report_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("ดาวน์โหลดไฟล์ CSV สำเร็จ", "success");
}

function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
    document.getElementById(id).classList.add('flex');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
    document.getElementById(id).classList.remove('flex');
}

function customAlert(title, message, type = 'info') {
    document.getElementById('alert-title').innerHTML = title;
    document.getElementById('alert-message').innerHTML = message;
    document.getElementById('alert-buttons').innerHTML = `
        <button onclick="closeModal('modal-alert')" class="bg-blue-600 text-white px-4 py-2 rounded-md font-medium">ตกลง</button>
    `;
    openModal('modal-alert');
}

function customConfirm(title, message, onConfirm, isDanger = false) {
    document.getElementById('alert-title').innerHTML = title;
    document.getElementById('alert-message').innerHTML = message;
    document.getElementById('alert-buttons').innerHTML = `
        <button onclick="closeModal('modal-alert')" class="bg-gray-100 text-gray-700 px-4 py-2 rounded-md font-medium">ยกเลิก</button>
        <button id="btn-alert-confirm" class="${isDanger ? 'bg-red-600' : 'bg-blue-600'} text-white px-4 py-2 rounded-md font-medium">ตกลง</button>
    `;
    document.getElementById('btn-alert-confirm').onclick = () => {
        closeModal('modal-alert');
        onConfirm();
    };
    openModal('modal-alert');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `p-4 rounded-lg text-white shadow-lg flex items-center gap-3 toast-enter ${type === 'error' ? 'bg-red-600' : 'bg-gray-800'}`;
    toast.innerHTML = `<i class="fas fa-check-circle text-green-400"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

document.addEventListener('DOMContentLoaded', initApp);
