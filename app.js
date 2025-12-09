// ตั้งค่าตัวแปรและ Key สำหรับ LocalStorage
const STORAGE_KEY = 'simpleExpenseData';
let expenseData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};

// DOM Elements
const currentDateDisplay = document.getElementById('currentDateDisplay');
const todayTotalDisplay = document.getElementById('todayTotalDisplay');
const amountInput = document.getElementById('amountInput');
const remarkInput = document.getElementById('remarkInput');
const expenseForm = document.getElementById('expenseForm');
const todayListContainer = document.getElementById('todayListContainer');
const historyListContainer = document.getElementById('historyListContainer');
const todayDetailModal = document.getElementById('todayDetailModal');
const historyModal = document.getElementById('historyModal');

// --- Helper Functions ---

// ดึงวันที่ปัจจุบันในรูปแบบ YYYY-MM-DD (สำหรับใช้เป็น Key ของข้อมูล)
function getTodayKey() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

// แปลงวันที่จาก YYYY-MM-DD เป็น DD/MM/YYYY (สำหรับแสดงผล)
function formatDateDisplay(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

// สร้าง ID ไม่ซ้ำสำหรับแต่ละรายการ
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// บันทึกข้อมูลลง LocalStorage
function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenseData));
    updateUI();
}

// คำนวณยอดรวมของวันที่ระบุ
function calculateTotal(dateKey) {
    const expenses = expenseData[dateKey] || [];
    return expenses.reduce((sum, item) => sum + parseFloat(item.amount), 0);
}

// --- Core Functions ---

// อัปเดตหน้าจอหลัก (วันที่และยอดรวมวันนี้)
function updateUI() {
    const todayKey = getTodayKey();
    const now = new Date();
    // แสดงวันที่แบบไทย
    currentDateDisplay.textContent = now.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    
    // แสดงยอดรวมวันนี้
    const total = calculateTotal(todayKey);
    todayTotalDisplay.textContent = total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// เพิ่มรายการใหม่
function addExpense(amount, remark) {
    const todayKey = getTodayKey();
    if (!expenseData[todayKey]) {
        expenseData[todayKey] = [];
    }

    const newExpense = {
        id: generateId(),
        amount: parseFloat(amount),
        remark: remark || 'ไม่มีหมายเหตุ',
        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute:'2-digit'})
    };

    expenseData[todayKey].unshift(newExpense); // เพิ่มรายการใหม่ไว้บนสุด
    saveToStorage();
    expenseForm.reset();
    amountInput.focus();
}

// ลบรายการ
function deleteExpense(dateKey, id) {
    if (confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) {
        expenseData[dateKey] = expenseData[dateKey].filter(item => item.id !== id);
        saveToStorage();
        renderTodayList(); // รีเฟรชรายการใน Modal
    }
}

// แก้ไขรายการ (ใช้ SweetAlert2 เพื่อความง่ายในการรับค่าใหม่)
async function editExpense(dateKey, id) {
    const item = expenseData[dateKey].find(i => i.id === id);
    if (!item) return;

    // ใช้ SweetAlert2 สร้างฟอร์ม popup ง่ายๆ
    const { value: formValues } = await Swal.fire({
        title: 'แก้ไขรายการ',
        html:
          `<input id="swal-amount" type="number" class="swal2-input" placeholder="ราคา" value="${item.amount}" step="0.01">` +
          `<input id="swal-remark" type="text" class="swal2-input" placeholder="หมายเหตุ" value="${item.remark}">`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'บันทึก',
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
        renderTodayList(); // รีเฟรชรายการใน Modal
      }
}


// แสดงรายการใน Modal วันนี้
function renderTodayList() {
    const todayKey = getTodayKey();
    const expenses = expenseData[todayKey] || [];
    todayListContainer.innerHTML = '';

    if (expenses.length === 0) {
        todayListContainer.innerHTML = '<li class="list-group-item text-center text-muted">ยังไม่มีรายการวันนี้</li>';
        return;
    }

    expenses.forEach(item => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.innerHTML = `
            <div class="expense-info overflow-hidden me-2">
                <div class="fw-bold text-primary">${parseFloat(item.amount).toLocaleString()} ฿</div>
                <small class="text-muted text-truncate d-block">${item.time} - ${item.remark}</small>
            </div>
            <div class="expense-actions btn-group" role="group">
                <button class="btn btn-outline-warning btn-sm btn-edit" data-id="${item.id}"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-outline-danger btn-sm btn-delete" data-id="${item.id}"><i class="bi bi-trash"></i></button>
            </div>
        `;
        
        // Event Listeners สำหรับปุ่มแก้ไขและลบ
        li.querySelector('.btn-edit').addEventListener('click', () => editExpense(todayKey, item.id));
        li.querySelector('.btn-delete').addEventListener('click', () => deleteExpense(todayKey, item.id));

        todayListContainer.appendChild(li);
    });
}


// แสดงรายการประวัติย้อนหลัง
function renderHistoryList() {
    historyListContainer.innerHTML = '';
    // ดึง Key ทั้งหมด (วันที่) มาเรียงจากใหม่ไปเก่า
    const sortedKeys = Object.keys(expenseData).sort().reverse();

    if (sortedKeys.length === 0) {
        historyListContainer.innerHTML = '<li class="list-group-item text-center text-muted">ยังไม่มีประวัติ</li>';
        return;
    }

    sortedKeys.forEach(dateKey => {
        // ไม่แสดงวันนี้ในประวัติ (เพราะดูที่ปุ่มขวาบนแล้ว)
        if (dateKey === getTodayKey()) return; 

        const total = calculateTotal(dateKey);
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `
            <span>${formatDateDisplay(dateKey)}</span>
            <span class="fw-bold">${total.toLocaleString()} ฿</span>
        `;
        historyListContainer.appendChild(li);
    });
}


// --- Event Listeners ---

// เมื่อ Submit ฟอร์ม
expenseForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const amount = amountInput.value;
    const remark = remarkInput.value;
    if (amount > 0) {
        addExpense(amount, remark);
    }
});

// เมื่อเปิด Modal รายการวันนี้ ให้โหลดข้อมูล
todayDetailModal.addEventListener('show.bs.modal', renderTodayList);

// เมื่อเปิด Modal ประวัติ ให้โหลดข้อมูล
historyModal.addEventListener('show.bs.modal', renderHistoryList);


// --- Initialization ---
// เริ่มต้นทำงานเมื่อโหลดหน้าเว็บ
updateUI();
amountInput.focus(); // โฟกัสที่ช่องใส่เงินทันที

// --- PWA Service Worker Registration ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then(reg => console.log('Service Worker registered', reg))
        .catch(err => console.log('Service Worker registration failed', err));
    });
  }