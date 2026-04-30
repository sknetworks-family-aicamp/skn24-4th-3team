// main.js - dashboard page helpers.

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('calendar-body')) {
        generateCalendar();
        const today = new Date().getDate();
        selectDate(today);
    }
});



function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('active');
}

function logout() {
    if (confirm('로그아웃 하시겠습니까?')) navigateTo('/account/logout/');
}

function generateCalendar() {
    const calendarBody = document.getElementById('calendar-body');
    if (!calendarBody) return;

    const now = new Date();
    const today = now.getDate();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    calendarBody.innerHTML = '';
    for (let i = 0; i < firstDay; i++) calendarBody.appendChild(document.createElement('div'));

    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        if (day === today) dayElement.classList.add('today');
        if (day > today) dayElement.classList.add('disabled');
        else dayElement.onclick = () => selectDate(day);
        calendarBody.appendChild(dayElement);
    }
}

function selectDate(day) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const selectedDateEl = document.getElementById('selected-date');
    if (selectedDateEl) selectedDateEl.textContent = `${month}월 ${day}일 기록`;
    updateTBMList(day);
}

function updateTBMList(day) {
    const tbmList = document.getElementById('tbm-list');
    if (!tbmList) return;

    tbmList.innerHTML = `
        <div class="tbm-empty">
            <div class="empty-icon">📋+</div>
            <p>기록이 없습니다.</p>
        </div>
    `;
}

function changeMonth() {}
function changeYear() {}
function startTBM() { navigateTo('tbm-create.html'); }
function viewTBMDetail() { navigateTo('tbm-detail.html'); }
