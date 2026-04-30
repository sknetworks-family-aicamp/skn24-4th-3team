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
    navigateTo('tbm-recording.html');
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

    const position = await getCurrentPositionSafe();
    if (position) {
        formData.append('lat', position.lat);
        formData.append('lon', position.lon);
    }

    const workData = localStorage.getItem('tbmWorkData');
    if (workData) {
        try {
            const data = JSON.parse(workData);
            if (data.locationCity) formData.append('sido', data.locationCity);
            if (data.locationDistrict) formData.append('sigungu', data.locationDistrict);
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
        navigateTo('tbm-draft.html');
    } catch (error) {
        alert(error.message);
    }
}

function populateDraftPage() {
    const raw = sessionStorage.getItem('tbmDraftResult');
    if (!raw) return;

    try {
        const data = JSON.parse(raw);
        const draftContent = document.getElementById('draft-content');
        const referencesContent = document.getElementById('draft-references');
        const duration = document.getElementById('recording-duration');

        if (draftContent && data.draft) draftContent.textContent = data.draft;
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
        if (duration) duration.textContent = sessionStorage.getItem('tbmRecordingDuration') || duration.textContent;
    } catch (error) {}
}

function editDraft() { navigateTo('tbm-edit.html'); }
function completeDraft() { showPopup('popup-save-complete'); }
function confirmCancelEdit() { showPopup('popup-cancel-edit'); }
function cancelEdit() { closePopup('popup-cancel-edit'); goBack(); }
function confirmDeleteTBM() { showPopup('popup-delete-tbm'); }
function deleteTBM() { closePopup('popup-delete-tbm'); alert('TBM이 삭제되었습니다.'); navigateTo('main.html'); }
function saveEditedTBM() { showPopup('popup-save-complete'); }
function confirmSaveComplete() { closePopup('popup-save-complete'); navigateTo('main.html'); }
function viewTBMDetail(date) { navigateTo('tbm-detail.html'); }
function changePage(direction) {}
function confirmDeleteTBMDetail() { showPopup('popup-delete-detail'); }
function deleteTBMDetail() { closePopup('popup-delete-detail'); navigateTo('main.html'); }
function editTBMDetail() { navigateTo('tbm-edit.html'); }

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
