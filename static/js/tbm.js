// tbm.js - TBM create, recording, draft, edit, list, detail helpers.

const districtData = {
    seoul: ['강남구', '강동구', '강북구', '강서구', '금천구', '구로구', '마포구', '서초구', '송파구', '영등포구', '종로구', '중구'],
    busan: ['강서구', '금정구', '동구', '부산진구', '사상구', '해운대구'],
    daegu: ['남구', '달서구', '동구', '북구', '수성구', '중구'],
    incheon: ['계양구', '남동구', '동구', '미추홀구', '부평구', '서구', '연수구', '중구'],
    gwangju: ['광산구', '남구', '동구', '북구', '서구'],
    daejeon: ['대덕구', '동구', '서구', '유성구', '중구'],
    ulsan: ['남구', '동구', '북구', '울주군', '중구'],
    sejong: ['세종시'],
    gyeonggi: ['고양시', '광명시', '김포시', '부천시', '성남시', '수원시', '안양시', '용인시', '화성시'],
    gangwon: ['강릉시', '동해시', '속초시', '원주시', '춘천시'],
    chungbuk: ['제천시', '청주시', '충주시'],
    chungnam: ['공주시', '논산시', '보령시', '아산시', '천안시'],
    jeonbuk: ['군산시', '익산시', '전주시', '정읍시'],
    jeonnam: ['광양시', '나주시', '목포시', '순천시', '여수시'],
    gyeongbuk: ['경산시', '경주시', '구미시', '김천시', '안동시', '포항시'],
    gyeongnam: ['거제시', '김해시', '사천시', '양산시', '진주시', '창원시'],
    jeju: ['서귀포시', '제주시'],
};

let recordingTimer = null;
let recordingSeconds = 0;
let mediaRecorder = null;
let recordedChunks = [];
let recordedBlob = null;
let currentStream = null;
const MIN_RECORDING_SECONDS = 60;

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('work-name')) restoreTBMWorkData();
});

// ── 공통 헬퍼 ─────────────────────────────────────────────────────────────────

function getCsrfToken() {
    const name = 'csrftoken';
    for (let cookie of document.cookie.split(';')) {
        cookie = cookie.trim();
        if (cookie.startsWith(name + '=')) return decodeURIComponent(cookie.substring(name.length + 1));
    }
    return '';
}

function showLoading() {
    let overlay = document.getElementById('tbm-loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'tbm-loading-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;';
        overlay.innerHTML = '<div style="color:#fff;font-size:20px;font-weight:600;margin-bottom:12px;">초안 생성 중...</div><div style="color:#ccc;font-size:14px;">잠시만 기다려주세요.</div>';
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('tbm-loading-overlay');
    if (overlay) overlay.style.display = 'none';
}

async function postJson(url) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'X-CSRFToken': getCsrfToken() },
    });
    return response;
}

// ── TBM 폼 ────────────────────────────────────────────────────────────────────

function updateDistricts() {
    const citySelect = document.getElementById('work-location-city');
    const districtSelect = document.getElementById('work-location-district');
    if (!citySelect || !districtSelect) return;

    const selectedCity = citySelect.value;
    districtSelect.innerHTML = '<option value="" disabled selected>구/군</option>';
    if (!selectedCity || !districtData[selectedCity]) return;

    districtData[selectedCity].forEach(district => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district;
        districtSelect.appendChild(option);
    });
}

function goToNextStep() {
    const workName = document.getElementById('work-name');
    const city = document.getElementById('work-location-city');
    const district = document.getElementById('work-location-district');

    hideError('work-name', 'work-name-error');
    hideError('work-location-city', 'work-location-error');

    let isValid = true;
    if (!workName?.value.trim()) {
        showError('work-name', 'work-name-error', '*작업명 필수');
        isValid = false;
    }
    if (!city?.value || !district?.value) {
        showError('work-location-city', 'work-location-error', '*작업 장소 필수');
        isValid = false;
    }
    if (!isValid) return;

    localStorage.setItem('tbmWorkData', JSON.stringify({
        workName: workName.value.trim(),
        locationCity: city.value,
        locationDistrict: district.value,
    }));
    window.location.href = '/tbm/recording/';
}

function applyWorkLocation(cityKey, districtName) {
    const city     = document.getElementById('work-location-city');
    const district = document.getElementById('work-location-district');
    if (!city || !cityKey) return;
    city.value = cityKey;
    updateDistricts();
    setTimeout(() => {
        if (district && districtName) district.value = districtName;
    }, 100);
}

async function restoreTBMWorkData() {
    const savedData = localStorage.getItem('tbmWorkData');
    if (savedData) {
        // 현재 세션 데이터 복원 (녹음 페이지에서 돌아온 경우)
        try {
            const data = JSON.parse(savedData);
            const workName = document.getElementById('work-name');
            if (workName && data.workName) workName.value = data.workName;
            applyWorkLocation(data.locationCity, data.locationDistrict);
        } catch (_) {}
        return;
    }
    // localStorage 없으면 DB에서 가장 최근 작업 장소 불러오기
    try {
        const res  = await fetch('/tbm/last-location/');
        const data = await res.json();
        if (data.success) {
            const workName = document.getElementById('work-name');
            if (workName && data.task_name) workName.value = data.task_name;
            applyWorkLocation(data.region_large, data.region_middle);
        }
    } catch (_) {}
}

// ── 녹음 ──────────────────────────────────────────────────────────────────────

function changeRecordingState(state) {
    document.querySelectorAll('.recording-state').forEach(el => {
        el.style.display = 'none';
    });
    const activeState = document.getElementById(`state-${state}`);
    if (activeState) activeState.style.display = 'flex';

    const micCircle = document.getElementById('mic-circle');
    if (!micCircle) return;
    micCircle.classList.remove('recording', 'paused');
    if (state === 'recording') micCircle.classList.add('recording');
    if (state === 'paused') micCircle.classList.add('paused');
}

function updateTimer() {
    recordingSeconds++;
    const timer = document.getElementById('timer');
    if (!timer) return;
    const mins = Math.floor(recordingSeconds / 60);
    const secs = recordingSeconds % 60;
    timer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

async function startRecording() {
    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recordedChunks = [];
        recordedBlob = null;
        mediaRecorder = new MediaRecorder(currentStream);

        mediaRecorder.ondataavailable = event => {
            if (event.data && event.data.size > 0) recordedChunks.push(event.data);
        };
        mediaRecorder.onstop = () => {
            recordedBlob = new Blob(recordedChunks, { type: 'audio/webm' });
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
                currentStream = null;
            }
        };

        recordingSeconds = 0;
        const timer = document.getElementById('timer');
        if (timer) { timer.style.display = 'block'; timer.textContent = '00:00'; }

        if (recordingTimer) clearInterval(recordingTimer);
        recordingTimer = setInterval(updateTimer, 1000);
        mediaRecorder.start();
        changeRecordingState('recording');
    } catch (error) {
        alert('마이크 권한을 확인해주세요.');
    }
}

function pauseRecording() {
    if (recordingTimer) clearInterval(recordingTimer);
    if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.pause();
    changeRecordingState('paused');
}

function resumeRecording() {
    if (mediaRecorder && mediaRecorder.state === 'paused') mediaRecorder.resume();
    if (recordingTimer) clearInterval(recordingTimer);
    recordingTimer = setInterval(updateTimer, 1000);
    changeRecordingState('recording');
}

function showStopPopup() { showPopup('popup-stop'); }
function showDeletePopup() { showPopup('popup-delete'); }
function showHelpPopup() { showPopup('popup-help'); }

function stopRecording() {
    if (recordingSeconds < MIN_RECORDING_SECONDS) {
        closePopup('popup-stop');
        showShortRecordingPopup();
        return;
    }

    if (recordingTimer) clearInterval(recordingTimer);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    closePopup('popup-stop');
    changeRecordingState('completed');
}

function showShortRecordingPopup() {
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
    if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.pause();

    const message = document.getElementById('short-recording-message');
    if (message) {
        message.textContent = `최소 녹음 시간 : 60초 / 현재 녹음 시간 : ${recordingSeconds}초`;
    }
    showPopup('popup-short-recording');
}

async function restartShortRecording() {
    closePopup('popup-short-recording');
    discardRecordingData();
    await startRecording();
}

function discardRecordingData() {
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
    const recorderToDiscard = mediaRecorder;
    mediaRecorder = null;
    if (recorderToDiscard && recorderToDiscard.state !== 'inactive') {
        recorderToDiscard.ondataavailable = null;
        recorderToDiscard.onstop = null;
        recorderToDiscard.stop();
    }
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    recordingSeconds = 0;
    recordedChunks = [];
    recordedBlob = null;
    const timer = document.getElementById('timer');
    if (timer) timer.textContent = '00:00';
}

function deleteRecording() {
    discardRecordingData();
    const timer = document.getElementById('timer');
    if (timer) timer.style.display = 'none';
    closePopup('popup-delete');
    changeRecordingState('ready');
}

function confirmStop() {
    const readyState = document.getElementById('state-ready');
    if (readyState && readyState.style.display !== 'none') goBack();
    else showPopup('popup-cancel');
}

function cancelRecording() {
    if (recordingTimer) clearInterval(recordingTimer);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    closePopup('popup-cancel');
    goBack();
}

function getCurrentPositionSafe() {
    return new Promise(resolve => {
        if (!navigator.geolocation) { resolve(null); return; }
        navigator.geolocation.getCurrentPosition(
            pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            () => resolve(null),
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
        );
    });
}

// ── 초안 생성 ─────────────────────────────────────────────────────────────────

async function createDraft() {
    if (!recordedBlob) {
        alert('녹음 완료 후 초안을 생성해주세요.');
        return;
    }

    showLoading();

    const formData = new FormData();
    formData.append('audio_file', recordedBlob, 'tbm-recording.webm');
    formData.append('recording_duration_sec', recordingSeconds);

    const position = await getCurrentPositionSafe();
    if (position) {
        formData.append('lat', position.lat);
        formData.append('lon', position.lon);
    }

    try {
        const workData = JSON.parse(localStorage.getItem('tbmWorkData') || '{}');
        if (workData.workName)        formData.append('task_name',    workData.workName);
        if (workData.locationCity)    formData.append('region_large', workData.locationCity);
        if (workData.locationDistrict) formData.append('region_middle', workData.locationDistrict);
    } catch (_) {}

    try {
        const response = await fetch('/tbm/create/', {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCsrfToken(),
            },
            body: formData,
        });
        const result = await response.json();

        if (!response.ok || !result.success) throw new Error(result.error || 'TBM 초안 생성에 실패했습니다.');

        localStorage.removeItem('tbmWorkData');
        window.location.href = `/tbm/draft/${result.draft_id}/`;
    } catch (error) {
        hideLoading();
        alert(error.message);
    }
}

// ── 초안 확인 (tbm_draft) ─────────────────────────────────────────────────────

function editDraft() {
    window.location.href = `/tbm/edit/${DRAFT_ID}/`;
}

function completeDraft() {
    window.location.href = '/core/dashboard/';
}

// ── 편집 (tbm_edit) ───────────────────────────────────────────────────────────

function confirmCancelEdit() { openConfirm('TBM 수정을 취소하시겠습니까?\n수정하신 모든 내용이 삭제됩니다.', cancelEdit, '예', '아니오'); }
function cancelEdit() { 
    window.location.href = '/core/dashboard/'; 
}
function confirmDeleteTBM() { openConfirm('TBM 내역을 삭제하시겠습니까?\n삭제된 내용은 복구할 수 없습니다.', deleteTBM, '예', '아니오'); }

async function deleteTBM() {
    try {
        const response = await postJson(`/tbm/delete/${DRAFT_ID}/`);
        if (response.ok) window.location.href = '/core/dashboard/';
        else alert('삭제에 실패했습니다.');
    } catch {
        alert('네트워크 오류로 삭제에 실패했습니다.');
    }
}

// ── 상세 (tbm_detail) ─────────────────────────────────────────────────────────

function confirmDeleteTBMDetail() { openConfirm('TBM 내역을 삭제하시겠습니까?\n삭제된 내용은 복구할 수 없습니다.', deleteTBMDetail, '예', '아니오'); }

async function deleteTBMDetail() {
    try {
        const response = await postJson(`/tbm/delete/${DRAFT_ID}/`);
        if (response.ok) window.location.href = '/core/dashboard/';
        else alert('삭제에 실패했습니다.');
    } catch {
        alert('네트워크 오류로 삭제에 실패했습니다.');
    }
}

function editTBMDetail() {
    window.location.href = `/tbm/edit/${DRAFT_ID}/`;
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) targetTab.classList.add('active');

    const buttons = document.querySelectorAll('.tab-btn');
    if (tabName === 'draft' && buttons[0]) buttons[0].classList.add('active');
    if (tabName === 'transcript' && buttons[1]) buttons[1].classList.add('active');

    const detailButtons = document.querySelector('.detail-buttons');
    if (detailButtons) detailButtons.style.display = tabName === 'draft' ? 'flex' : 'none';
}
