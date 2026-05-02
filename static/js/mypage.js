// mypage.js - 마이페이지 전용

let currentMypageTab = 'info';
let mypageModified = false;

document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('#tab-info input, #tab-password input');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            mypageModified = true;
        });
    });

    const withdrawalInput = document.getElementById('withdrawal-confirm');
    const withdrawalBtn = document.getElementById('withdrawal-btn');

    if (withdrawalInput && withdrawalBtn) {
        withdrawalInput.addEventListener('input', () => {
            withdrawalBtn.disabled = withdrawalInput.value.trim() !== '회원탈퇴';
        });
    }
});

function getCsrfToken() {
    const name = 'csrftoken';
    const cookies = document.cookie.split(';');

    for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(name + '=')) {
            return decodeURIComponent(cookie.substring(name.length + 1));
        }
    }
    return '';
}

function switchMypageTab(tabName) {
    currentMypageTab = tabName;

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    const saveBtn = document.getElementById('save-btn');
    const withdrawalBtnArea = document.getElementById('withdrawal-btn-area');

    if (tabName === 'info') {
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('tab-info').classList.add('active');
        saveBtn.parentElement.style.display = 'flex';
        if (withdrawalBtnArea) withdrawalBtnArea.style.display = 'none';
    } else if (tabName === 'password') {
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('tab-password').classList.add('active');
        saveBtn.parentElement.style.display = 'flex';
        if (withdrawalBtnArea) withdrawalBtnArea.style.display = 'none';
    } else if (tabName === 'withdrawal') {
        document.querySelector('.tab-btn:nth-child(3)').classList.add('active');
        document.getElementById('tab-withdrawal').classList.add('active');
        saveBtn.parentElement.style.display = 'none';
        if (withdrawalBtnArea) withdrawalBtnArea.style.display = 'flex';
    }
}

function confirmBackMypage() {
    if (mypageModified && currentMypageTab !== 'withdrawal') {
        openConfirm('수정 중인 내용이 저장되지 않습니다.\n나가시겠습니까?', confirmLeaveMypage, '확인', '취소');
    } else {
        window.location.href = '/core/dashboard/';
    }
}

function confirmLeaveMypage() {
    mypageModified = false;
    window.location.href = '/core/dashboard/';
}

function saveMypageChanges() {
    if (currentMypageTab === 'info') {
        saveInfoChanges();
    } else if (currentMypageTab === 'password') {
        savePasswordChanges();
    }
}

async function saveInfoChanges() {
    const name = document.getElementById('info-name').value.trim();
    const company = document.getElementById('info-company').value.trim();
    const position = document.getElementById('info-position').value.trim();

    hideError('info-name', 'info-name-error');
    hideError('info-company', 'info-company-error');
    hideError('info-position', 'info-position-error');

    let isValid = true;

    if (!name) {
        showError('info-name', 'info-name-error', '성명을 입력해주세요.');
        isValid = false;
    }
    if (!company) {
        showError('info-company', 'info-company-error', '업체명을 입력해주세요.');
        isValid = false;
    }
    if (!position) {
        showError('info-position', 'info-position-error', '직책을 입력해주세요.');
        isValid = false;
    }
    if (!isValid) return;

    try {
        const response = await fetch('/account/mypage/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                action: 'update_info',
                name,
                company,
                position,
            }),
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            alert(result.message || '개인정보 수정에 실패했습니다.');
            return;
        }

        mypageModified = false;
        openAlert('개인정보가 성공적으로 변경되었습니다.');
    } catch (error) {
        alert('개인정보 수정 중 오류가 발생했습니다.');
    }
}

async function savePasswordChanges() {
    const currentPw = document.getElementById('current-password').value;
    const newPw = document.getElementById('new-password').value;
    const confirmPw = document.getElementById('new-password-confirm').value;

    hideError('current-password', 'current-password-error');
    hideError('new-password', 'new-password-error');
    hideError('new-password-confirm', 'new-password-confirm-error');

    let isValid = true;

    if (!currentPw) {
        showError('current-password', 'current-password-error', '현재 비밀번호를 입력해주세요.');
        isValid = false;
    }
    if (!newPw) {
        showError('new-password', 'new-password-error', '새 비밀번호를 입력해주세요.');
        isValid = false;
    }
    if (!confirmPw) {
        showError('new-password-confirm', 'new-password-confirm-error', '비밀번호 확인을 입력해주세요.');
        isValid = false;
    } else if (newPw !== confirmPw) {
        showError('new-password-confirm', 'new-password-confirm-error', '비밀번호가 일치하지 않습니다.');
        isValid = false;
    }
    if (!isValid) return;

    try {
        const response = await fetch('/account/mypage/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                action: 'change_password',
                current_password: currentPw,
                new_password: newPw,
                new_password_confirm: confirmPw,
            }),
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            alert(result.message || '비밀번호 변경에 실패했습니다.');
            return;
        }

        mypageModified = false;
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('new-password-confirm').value = '';
        openAlert('개인정보가 성공적으로 변경되었습니다.');
    } catch (error) {
        alert('비밀번호 변경 중 오류가 발생했습니다.');
    }
}

function confirmWithdrawal() {
    openAlert('그동안 이용해주셔서 감사합니다', proceedWithdrawal);
}

async function proceedWithdrawal() {
    const confirmText = document.getElementById('withdrawal-confirm').value.trim();

    try {
        const response = await fetch('/account/mypage/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                action: 'withdraw',
                confirm_text: confirmText,
            }),
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            alert(result.message || '회원 탈퇴에 실패했습니다.');
            return;
        }

        window.location.href = result.redirect_url || '/account/login/';
    } catch (error) {
        alert('회원 탈퇴 중 오류가 발생했습니다.');
    }
}
