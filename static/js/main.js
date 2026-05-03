// main.js - dashboard page helpers.

const [todayYear, todayMonth, todayDay] = TODAY.split('-').map(Number);

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('calendar-body')) return;
    generateCalendar(CURRENT_YEAR, CURRENT_MONTH, calendarTbmDates);
    // 오늘 날짜 자동 선택
    const todayEl = document.querySelector('.calendar-day.today');
    if (todayEl) {
        const todayStr = TODAY;
        todayEl.classList.add('selected');
        loadTbmList(todayStr, `${todayMonth}월 ${todayDay}일 기록`);
    }
});

// ── 사이드바 / 공통 ────────────────────────────────────────────────────────────

function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('active');
    document.getElementById('sidebar-overlay')?.classList.toggle('active');
}

function logout() {
    if (confirm('로그아웃 하시겠습니까?')) window.location.href = '/account/logout/';
}

function startTBM() {
    window.location.href = '/tbm/create/';
}

// ── 달력 ──────────────────────────────────────────────────────────────────────

function syncTbmListHeight() {
    requestAnimationFrame(() => {
        const calendarEl = document.querySelector('.calendar');
        const tbmList    = document.getElementById('tbm-list');
        if (!calendarEl || !tbmList) return;
        tbmList.style.height = calendarEl.offsetHeight + 'px';
    });
}

function generateCalendar(year, month, tbmDates) {
    const calendarBody = document.getElementById('calendar-body');
    if (!calendarBody) return;

    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay    = new Date(year, month - 1, 1).getDay();
    const isThisMonth = (year === todayYear && month === todayMonth);

    calendarBody.innerHTML = '';

    // 빈 칸 채우기 (월요일 시작 기준)
    const startOffset = (firstDay === 0 ? 6 : firstDay - 1);
    for (let i = 0; i < startOffset; i++) calendarBody.appendChild(document.createElement('div'));

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const el = document.createElement('div');
        el.className = 'calendar-day';
        el.textContent = day;

        const isFuture = year > todayYear
            || (year === todayYear && month > todayMonth)
            || (isThisMonth && day > todayDay);

        if (isThisMonth && day === todayDay) el.classList.add('today');
        if (isFuture) {
            el.classList.add('disabled');
        } else {
            if (tbmDates.includes(dateStr)) el.classList.add('has-record');
            // element를 직접 파라미터로 전달 (event.currentTarget 의존 제거)
            el.onclick = (e) => selectDate(e.currentTarget, year, month, day, dateStr);
        }

        calendarBody.appendChild(el);
    }
    syncTbmListHeight();
}

async function onMonthYearChange() {
    const year  = parseInt(document.getElementById('year-select').value);
    const month = parseInt(document.getElementById('month-select').value);

    // 즉시 달력 렌더링 (TBM 점 없이) — 지연 없이 바로 반영
    generateCalendar(year, month, []);
    document.getElementById('selected-date-label').textContent = '날짜를 선택하세요';
    document.getElementById('tbm-list').innerHTML = '<div class="tbm-empty"><div class="empty-icon">📋+</div><p>기록이 없습니다.</p></div>';
    updateStartBtn(null);

    // AJAX로 해당 월 TBM 날짜 가져와서 파란 점만 업데이트
    try {
        const res  = await fetch(`/core/tbm-dates-by-month/?year=${year}&month=${month}`);
        const data = await res.json();
        calendarTbmDates = data.success ? data.dates : [];
        if (calendarTbmDates.length) generateCalendar(year, month, calendarTbmDates);
    } catch (_) {
        calendarTbmDates = [];
    }
}

// ── TBM 목록 ──────────────────────────────────────────────────────────────────

function updateStartBtn(dateStr) {
    const btn = document.querySelector('.tbm-start-btn');
    if (btn) btn.style.display = (dateStr === TODAY) ? '' : 'none';
}

function selectDate(el, year, month, day, dateStr) {
    document.querySelectorAll('.calendar-day.selected').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');
    loadTbmList(dateStr, `${month}월 ${day}일 기록`);
}

async function loadTbmList(dateStr, label) {
    document.getElementById('selected-date-label').textContent = label;
    updateStartBtn(dateStr);
    try {
        const res  = await fetch(`/core/tbm-by-date/?date=${dateStr}`);
        const data = await res.json();
        renderTbmCards(data.success ? data.drafts : []);
    } catch (_) {
        renderTbmCards([]);
    }
}

function goToToday() {
    document.getElementById('year-select').value  = todayYear;
    document.getElementById('month-select').value = todayMonth;
    generateCalendar(todayYear, todayMonth, calendarTbmDates);
    const todayEl = document.querySelector('.calendar-day.today');
    if (todayEl) {
        todayEl.classList.add('selected');
        loadTbmList(TODAY, `${todayMonth}월 ${todayDay}일 기록`);
    }
}

function renderTbmCards(drafts) {
    const tbmList = document.getElementById('tbm-list');
    if (!tbmList) return;

    if (!drafts.length) {
        tbmList.innerHTML = '<div class="tbm-empty"><div class="empty-icon">📋+</div><p>기록이 없습니다.</p></div>';
        return;
    }

    tbmList.innerHTML = drafts.map(d => {
        const duration = formatDuration(d.recording_duration_sec);

        return `
        <div class="tbm-card" onclick="window.location.href='/tbm/detail/${d.draft_id}/'">
            <div class="card-header">
                <span class="card-date">🔨 ${d.task_name || '(작업명 없음)'}</span>
            </div>
            <div class="card-body">
                <div class="card-info">
                    <span class="icon">📍</span>
                    <span class="text">${d.region_large || '-'} - ${d.region_middle || '-'}</span>
                </div>
                <div class="card-info">
                    <span class="icon">🕐</span>
                    <span class="text">${duration}</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

function formatDuration(sec) {
    if (!sec) return '00:00';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
