// --- CONFIGURATION ---
const STORAGE_KEY = 'AKfycbxDi_-3ubJwncqrwLWTpu3tzXxuNbQxFII2VS1RryizbVfTFOV0HM9UuPQuRXb-3yL1ew';
// ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ แก้ไขบรรทัดนี้ ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxDi_-3ubJwncqrwLWTpu3tzXxuNbQxFII2VS1RryizbVfTFOV0HM9UuPQuRXb-3yL1ew/exec';
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ ตัวอย่าง: 'https://script.google.com/macros/s/AKfycbx.../exec'

// --- STATE MANAGEMENT ---
let expenseData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};

// --- DOM ELEMENTS ---
const currentDateDisplay = document.getElementById('currentDateDisplay');
const todayTotalDisplay = document.getElementById('todayTotalDisplay');
const amountInput = document.getElementById('amountInput');
const remarkInput = document.getElementById('remarkInput');
const expenseForm = document.getElementById('expenseForm');
const todayListContainer = document.getElementById('todayListContainer');
const historyListContainer = document.getElementById('historyListContainer');
const todayDetailModal = document.getElementById('todayDetailModal');
const historyModal = document.getElementById('historyModal');

// --- HELPER FUNCTIONS ---

function getTodayKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateDisplay(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenseData));
    updateUI();
}

function calculateTotal(dateKey) {
    const expenses = expenseData[dateKey] || [];
    return expenses.reduce((sum, item) => sum + parseFloat(item.amount), 0);
}

// --- GOOGLE SHEETS INTEGRATION ---

// ฟังก์ชันส่งข้อมูลไปยัง Google Apps Script
async function sendDataToGoogleSheets(expenseItem) {
    // ถ้าไม่ได้ใส่ URL มา หรือไม่มีเน็ต ก็ไม่ต้องทำอะไร
    if (GOOGLE_SCRIPT_URL.includes('วาง_URL') || !navigator.onLine) {
        console.warn('ไม่ได้ตั้งค่า URL หรือไม่มีอินเทอร์เน็ต ข้อมูลบันทึกลงเครื่องเท่านั้น');
        return;
    }

    try {
        // ใช้ fetch ส่งข้อมูลแบบ POST ไปที่ URL ของ Script
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // สำคัญมากสำหรับการส่งไป Apps Script แบบง่าย
            headers: {
                'Content-Type': 'application/json',
            },
            // แปลงข้อมูลเป็น JSON String เพื่อส่งไป
            body: JSON.stringify(expenseItem)
        });
        console.log('ส่งข้อมูลไปยัง Google Sheet สำเร็จ (แบบ no-cors)');
        // หมายเหตุ: mode 'no-cors' จะทำให้เราไม่รู้ status ที่แท้จริงว่าสำเร็จหรือไม่
        // แต่เป็นวิธีที่ง่ายที่สุดในการส่งข้อมูลทางเดียวไปที่ Apps Script
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการส่งข้อมูลไป Google Sheet:', error);
        // ในอนาคตอาจเพิ่มการแจ้งเตือนผู้ใช้ตรงนี้
    }
}


// --- CORE FUNCTIONS ---

function updateUI() {
    const todayKey = getTodayKey();
    const now = new Date();
    currentDateDisplay.textContent = now.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    
    const total = calculateTotal(todayKey);
    todayTotalDisplay.textContent = total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ฟังก์ชันเพิ่มรายการ (แก้ไขใหม่ให้ส่งข้อมูลด้วย)
async function addExpense(amount, remark) {
    const todayKey = getTodayKey();
    if (!expenseData[todayKey]) {
        expenseData[todayKey] = [];
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute:'2-digit'});

    const newExpense = {
        id: generateId(),
        date: todayKey, // เพิ่มวันที่เข้าไปใน object เพื่อส่งไป Sheet
        time: timeStr,
        amount: parseFloat(amount),
        remark: remark || 'ไม่มีหมายเหตุ'
    };

    // 1. บันทึกลงในเครื่องก่อน (เพื่อให้แอปเร็วและทำงานออฟไลน์ได้)
    expenseData[todayKey].unshift(newExpense); 
    saveToStorage();
    
    // 2. พยายามส่งข้อมูลไปยัง Google Sheets (ทำอยู่เบื้องหลัง)
    sendDataToGoogleSheets(newExpense);

    // รีเซ็ตฟอร์ม
    expenseForm.reset();
    amountInput.focus();
    
    // แจ้งเตือนเล็กน้อย (Optional)
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true
    });
    Toast.fire({
        icon: 'success',
        title: 'บันทึกเรียบร้อย'
    });
}

function deleteExpense(dateKey, id) {
    Swal.fire({
        title: 'ยืนยันการลบ?',
        text: "รายการนี้จะถูกลบจากในเครื่องเท่านั้น (ถ้าส่งไป Sheet แล้วต้องไปลบใน Sheet เอง)",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'ใช่, ลบเลย!',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            expenseData[dateKey] = expenseData[dateKey].filter(item => item.id !== id);
            saveToStorage();
            renderTodayList();
            Swal.fire('ลบแล้ว!', 'รายการถูกลบออกจากเครื่องแล้ว', 'success');
        }
    });
}

async function editExpense(dateKey, id) {
    const item = expenseData[dateKey].find(i => i.id === id);
    if (!item) return;

    const { value: formValues } = await Swal.fire({
        title: 'แก้ไขรายการ',
        html:
          `<div class="mb-3"><label class="form-label">ราคา</label><input id="swal-amount" type="number" class="form-control form-control-lg text-center" value="${item.amount}" step="0.01"></div>` +
          `<div class="mb-3"><label class="form-label">หมายเหตุ</label><input id="swal-remark" type="text" class="form-control text-center" value="${item.remark}"></div>` +
          `<small class="text-muted">การแก้ไขจะมีผลเฉพาะในเครื่องเท่านั้น</small>`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'บันทึกการแก้ไข',
        cancelButtonText: 'ยกเลิก',
        preConfirm: () => {
          return [
            document.getElementById('swal-amount').value,
            document.getElementById('swal-remark').value
          ]
        }
      });

      if (formValues) {
        const [newAmount, newRemark] = formValues;
        if (!newAmount) return;

        item.amount = parseFloat(newAmount);
        item.remark = newRemark || 'ไม่มีหมายเหตุ';
        saveToStorage();
        renderTodayList();
      }
}

function renderTodayList() {
    const todayKey = getTodayKey();
    const expenses = expenseData[todayKey] || [];
    todayListContainer.innerHTML = '';

    if (expenses.length === 0) {
        todayListContainer.innerHTML = '<li class="list-group-item text-center text-muted border-0 py-4">ยังไม่มีรายการวันนี้</li>';
        return;
    }

    expenses.forEach(item => {
        const li = document.createElement('li');
        li.className = 'list-group-item border-0 border-bottom py-3';
        li.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div class="expense-info overflow-hidden me-3">
                    <div class="fw-bold fs-5 text-dark">${parseFloat(item.amount).toLocaleString(undefined, {minimumFractionDigits: 2})} ฿</div>
                    <small class="text-muted text-truncate d-block" style="max-width: 200px;">${item.time} - ${item.remark}</small>
                </div>
                <div class="expense-actions btn-group shadow-sm" role="group">
                    <button class="btn btn-light btn-sm text-secondary btn-edit" data-id="${item.id}"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn btn-light btn-sm text-danger btn-delete" data-id="${item.id}"><i class="bi bi-trash3-fill"></i></button>
                </div>
            </div>
        `;
        
        li.querySelector('.btn-edit').addEventListener('click', () => editExpense(todayKey, item.id));
        li.querySelector('.btn-delete').addEventListener('click', () => deleteExpense(todayKey, item.id));

        todayListContainer.appendChild(li);
    });
}


function renderHistoryList() {
    historyListContainer.innerHTML = '';
    const sortedKeys = Object.keys(expenseData).sort().reverse();

    if (sortedKeys.length === 0 || (sortedKeys.length === 1 && sortedKeys[0] === getTodayKey())) {
        historyListContainer.innerHTML = '<li class="list-group-item text-center text-muted border-0 py-4">ยังไม่มีประวัติย้อนหลัง</li>';
        return;
    }

    sortedKeys.forEach(dateKey => {
        if (dateKey === getTodayKey()) return; 

        const total = calculateTotal(dateKey);
        const li = document.createElement('li');
        li.className = 'list-group-item border-0 border-bottom d-flex justify-content-between align-items-center py-3';
        li.innerHTML = `
            <span class="fs-5">${formatDateDisplay(dateKey)}</span>
            <span class="fw-bold text-primary fs-5">${total.toLocaleString(undefined, {minimumFractionDigits: 2})} ฿</span>
        `;
        historyListContainer.appendChild(li);
    });
}


// --- EVENT LISTENERS ---

expenseForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const amount = amountInput.value;
    const remark = remarkInput.value;
    if (amount > 0) {
        addExpense(amount, remark);
    }
});

todayDetailModal.addEventListener('show.bs.modal', renderTodayList);
historyModal.addEventListener('show.bs.modal', renderHistoryList);

// --- INITIALIZATION ---
updateUI();
amountInput.focus();

// Register Service Worker (ถ้ามีไฟล์ service-worker.js)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then(reg => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker registration failed', err));
    });
}