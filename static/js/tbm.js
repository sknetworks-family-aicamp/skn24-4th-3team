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

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('work-name')) restoreTBMWorkData();
    populateDraftPage();
});

// =====================
// 공통 유틸
// =====================

function showPopup(popupId) {
    const popup = document.getElementById(popupId);
    if (popup) popup.style.display = 'flex';
}

function closePopup(popupId) {
    const popup = document.getElementById(popupId);
    if (popup) popup.style.display = 'none';
}

function goBack() {
    history.back();
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        document.cookie.split(';').forEach(cookie => {
            const c = cookie.trim();
            if (c.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(c.substring(name.length + 1));
            }
        });
    }
    return cookieValue;
}

// =====================
// create 페이지
// =====================

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
    const detailLocation = document.getElementById('work-detail-location');

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
        locationDetail: detailLocation?.value.trim() || '',
    }));
    location.href = '/tbm/recording/';
}

function restoreTBMWorkData() {
    const savedData = localStorage.getItem('tbmWorkData');
    if (!savedData) return;

    try {
        const data = JSON.parse(savedData);
        const workName = document.getElementById('work-name');
        const city = document.getElementById('work-location-city');
        const district = document.getElementById('work-location-district');

        if (workName && data.workName) workName.value = data.workName;
        if (city && data.locationCity) {
            city.value = data.locationCity;
            updateDistricts();
            setTimeout(() => {
                if (district && data.locationDistrict) district.value = data.locationDistrict;
            }, 100);
        }
    } catch (error) {}
}

// =====================
// recording 페이지
// =====================

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
        if (timer) {
            timer.style.display = 'block';
            timer.textContent = '00:00';
        }

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
    if (recordingTimer) clearInterval(recordingTimer);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    closePopup('popup-stop');
    changeRecordingState('completed');
}

function deleteRecording() {
    recordingSeconds = 0;
    recordedChunks = [];
    recordedBlob = null;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();

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
        if (!navigator.geolocation) {
            resolve(null);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            position => resolve({
                lat: position.coords.latitude,
                lon: position.coords.longitude,
            }),
            () => resolve(null),
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
        );
    });
}

async function createDraft() {
    if (!recordedBlob) {
        alert('녹음 완료 후 초안을 생성해주세요.');
        return;
    }

    const formData = new FormData();
    formData.append('audio_file', recordedBlob, 'tbm-recording.webm');
    formData.append('recording_duration_sec', recordingSeconds);

    const position = await getCurrentPositionSafe();
    if (position) {
        formData.append('lat', position.lat);
        formData.append('lon', position.lon);
    }

    const workData = localStorage.getItem('tbmWorkData');
    if (workData) {
        try {
            const data = JSON.parse(workData);
            if (data.workName) formData.append('task_name', data.workName);
            if (data.locationCity) formData.append('sido', data.locationCity);
            if (data.locationDistrict) formData.append('sigungu', data.locationDistrict);
            if (data.locationDetail) formData.append('detail', data.locationDetail);
        } catch (error) {}
    }

    try {
        const response = await fetch('/tbm/create/', {
            method: 'POST',
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
            body: formData,
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || 'TBM 초안 생성에 실패했습니다.');
        }

        sessionStorage.setItem('tbmDraftResult', JSON.stringify(result.data));
        sessionStorage.setItem('tbmRecordingDuration', document.getElementById('timer')?.textContent || '');
        sessionStorage.setItem('tbmDraftId', result.draft_id);
        location.href = '/tbm/draft/';
    } catch (error) {
        alert(error.message);
    }
}

// =====================
// draft 페이지
// =====================

function populateDraftPage() {
    const raw = sessionStorage.getItem('tbmDraftResult');
    if (!raw) return;

    try {
        const data = JSON.parse(raw);

        // TBM 초안
        const draftContent = document.getElementById('draft-content');
        if (draftContent && data.draft) draftContent.textContent = data.draft;

        // 참조 출처 (기존 코드 유지)
        const referencesContent = document.getElementById('draft-references');
        if (referencesContent) {
            const references = Array.isArray(data.references) ? data.references : [];
            referencesContent.innerHTML = '';
            if (!references.length) {
                referencesContent.textContent = '참조 출처가 없습니다.';
            } else {
                const list = document.createElement('ul');
                list.className = 'draft-reference-list';
                references.forEach((item) => {
                    const listItem = document.createElement('li');
                    listItem.textContent = item;
                    list.appendChild(listItem);
                });
                referencesContent.appendChild(list);
            }
        }

        // 녹음 시간
        const duration = document.getElementById('recording-duration');
        if (duration) duration.textContent = sessionStorage.getItem('tbmRecordingDuration') || '--:--';

        // 날짜
        const workDate = document.getElementById('work-date');
        if (workDate) workDate.value = new Date().toLocaleDateString('ko-KR');

        // 날씨 파싱
        const weatherText = data.weather_text || '';
        if (weatherText) {
            const temperature   = weatherText.match(/기온\s*([\d.]+)도/);
            const humidity      = weatherText.match(/습도\s*(\d+)%/);
            const windSpeed     = weatherText.match(/풍속\s*([\d.]+)m\/s/);
            const precipitation = weatherText.match(/강수량\s*([\d.]+)mm/);
            const status        = weatherText.match(/날씨\s*(.+?)(?:,|$)/);

            const el = (id) => document.getElementById(id);
            if (el('weather-status'))        el('weather-status').textContent        = status        ? status[1].trim()        : '-';
            if (el('weather-temperature'))   el('weather-temperature').textContent   = temperature   ? temperature[1] + '℃'   : '-';
            if (el('weather-humidity'))      el('weather-humidity').textContent      = humidity      ? humidity[1] + '%'       : '-';
            if (el('weather-precipitation')) el('weather-precipitation').textContent = precipitation ? precipitation[1] + 'mm' : '-';
            if (el('weather-wind'))          el('weather-wind').textContent          = windSpeed     ? windSpeed[1] + 'm/s'    : '-';
        }

    } catch (error) {}
}

function editDraft() {
    const draftId = sessionStorage.getItem('tbmDraftId');
    if (draftId) {
        location.href = `/tbm/edit/${draftId}/`;
    } else {
        alert('초안 정보를 찾을 수 없습니다.');
    }
}

function completeDraft() {
    showPopup('popup-save-complete');
}

function confirmSaveComplete() {
    closePopup('popup-save-complete');
    sessionStorage.removeItem('tbmDraftResult');
    sessionStorage.removeItem('tbmRecordingDuration');
    sessionStorage.removeItem('tbmDraftId');
    location.href = '/tbm/list/';
}

// =====================
// list 페이지
// =====================

function viewTBMDetail(draftId) {
    location.href = `/tbm/detail/${draftId}/`;
}

function changePage(direction) {}

// =====================
// detail 페이지
// =====================

function confirmDeleteTBMDetail(draftId) {
    document.getElementById('btn-delete-confirm').setAttribute('data-draft-id', draftId);
    showPopup('popup-delete-detail');
}

function deleteTBMDetail() {
    const draftId = document.getElementById('btn-delete-confirm').getAttribute('data-draft-id');

    fetch(`/tbm/delete/${draftId}/`, {
        method: 'DELETE',
        headers: { 'X-CSRFToken': getCookie('csrftoken') }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            closePopup('popup-delete-detail');
            location.href = '/tbm/list/';
        } else {
            alert(data.error || '삭제에 실패했습니다.');
        }
    })
    .catch(() => alert('삭제 요청 중 오류가 발생했습니다.'));
}

function editTBMDetail(draftId) {
    location.href = `/tbm/edit/${draftId}/`;
}

// =====================
// edit 페이지
// =====================

function confirmDeleteTBM(draftId) {
    document.getElementById('btn-delete-tbm-confirm').setAttribute('data-draft-id', draftId);
    showPopup('popup-delete-tbm');
}

function deleteTBM() {
    const draftId = document.getElementById('btn-delete-tbm-confirm').getAttribute('data-draft-id');
    fetch(`/tbm/delete/${draftId}/`, {
        method: 'DELETE',
        headers: { 'X-CSRFToken': getCookie('csrftoken') }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            closePopup('popup-delete-tbm');
            location.href = '/tbm/list/';
        } else {
            alert(data.error || '삭제에 실패했습니다.');
        }
    })
    .catch(() => alert('삭제 요청 중 오류가 발생했습니다.'));
}

function saveEditedTBM(draftId) {
    const draftText = document.getElementById('edit-draft-content').value;

    fetch(`/tbm/update/${draftId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `draft_text=${encodeURIComponent(draftText)}`
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showPopup('popup-save-complete');
        } else {
            alert(data.error || '저장에 실패했습니다.');
        }
    })
    .catch(() => alert('저장 요청 중 오류가 발생했습니다.'));
}

function cancelEdit(draftId) {
    closePopup('popup-cancel-edit');
    location.href = `/tbm/detail/${draftId}/`;
}

// =====================
// 탭 전환
// =====================

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