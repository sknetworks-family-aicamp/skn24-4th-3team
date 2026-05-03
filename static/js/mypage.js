// mypage.js - my page helpers.

let currentMypageTab = 'info';
let mypageModified = false;
let currentPasswordValid = false;
let currentPasswordCheckTimer = null;
let currentPasswordRequestSeq = 0;

const INFO_FIELD_RULES = {
    'info-name': {
        maxLength: 20,
        pattern: /^[가-힣a-zA-Z\s]*$/,
        errorMessage: '문자만 입력 가능합니다',
        successMessage: '사용 가능한 이름입니다.',
    },
    'info-company': {
        maxLength: 50,
        pattern: /^[가-힣a-zA-Z0-9\s]*$/,
        errorMessage: '한글, 영어, 숫자만 입력 가능합니다.',
        successMessage: '사용 가능합니다.',
    },
    'info-position': {
        maxLength: 50,
        pattern: /^[가-힣a-zA-Z0-9\s]*$/,
        errorMessage: '한글, 영어, 숫자만 입력 가능합니다.',
        successMessage: '사용 가능합니다.',
    },
};

document.addEventListener('DOMContentLoaded', () => {
    Object.keys(INFO_FIELD_RULES).forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;
        input.addEventListener('beforeinput', event => enforceMaxLength(event, input, INFO_FIELD_RULES[id]));
        input.addEventListener('input', () => {
            mypageModified = true;
            validateInfoField(id);
            updateSaveButtonState();
        });
    });

    const currentPassword = document.getElementById('current-password');
    if (currentPassword) {
        currentPassword.addEventListener('input', () => {
            mypageModified = true;
            currentPasswordValid = false;
            validatePasswordForm();
            scheduleCurrentPasswordCheck();
            updateSaveButtonState();
        });
    }

    ['new-password', 'new-password-confirm'].forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;
        input.addEventListener('input', () => {
            mypageModified = true;
            validatePasswordForm();
            updateSaveButtonState();
        });
    });

    const withdrawalInput = document.getElementById('withdrawal-confirm');
    const withdrawalBtn = document.getElementById('withdrawal-btn');
    if (withdrawalInput && withdrawalBtn) {
        withdrawalInput.addEventListener('input', () => {
            withdrawalBtn.disabled = withdrawalInput.value.trim() !== '회원탈퇴';
        });
    }

    updateSaveButtonState();
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

async function postJson(url, payload) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok || !result.success) throw result;
    return result;
}

function setFieldMessage(inputId, type, message) {
    const errorEl = document.getElementById(`${inputId}-error`);
    const successEl = document.getElementById(`${inputId}-success`);
    const input = document.getElementById(inputId);

    if (errorEl) {
        errorEl.textContent = type === 'error' ? message : '';
        errorEl.classList.toggle('show', type === 'error' && Boolean(message));
    }
    if (successEl) {
        successEl.textContent = type === 'success' ? message : '';
        successEl.classList.toggle('show', type === 'success' && Boolean(message));
    }
    if (input) input.classList.toggle('error', type === 'error' && Boolean(message));
}

function hasInfoChanged(input) {
    return input.value.trim() !== (input.dataset.original || '').trim();
}

function enforceMaxLength(event, input, rule) {
    if (!event.data) return;

    const selectionLength = input.selectionEnd - input.selectionStart;
    const nextLength = input.value.length - selectionLength + event.data.length;
    if (nextLength > rule.maxLength) {
        event.preventDefault();
        mypageModified = true;
        setFieldMessage(input.id, 'error', '더 이상 타이핑 할 수 없습니다.');
    }
}

function validateInfoField(inputId) {
    const input = document.getElementById(inputId);
    const rule = INFO_FIELD_RULES[inputId];
    if (!input || !rule) return false;

    const value = input.value.trim();
    const changed = hasInfoChanged(input);

    if (!changed) {
        setFieldMessage(inputId, null, '');
        return true;
    }

    if (value.length > rule.maxLength) {
        setFieldMessage(inputId, 'error', '더 이상 타이핑 할 수 없습니다.');
        return false;
    }

    if (!value) {
        setFieldMessage(inputId, 'error', '필수 항목입니다.');
        return false;
    }

    if (!rule.pattern.test(value)) {
        setFieldMessage(inputId, 'error', rule.errorMessage);
        return false;
    }

    setFieldMessage(inputId, 'success', rule.successMessage);
    return true;
}

function validateInfoForm() {
    const changed = Object.keys(INFO_FIELD_RULES).some(id => {
        const input = document.getElementById(id);
        return input && hasInfoChanged(input);
    });
    const valid = Object.keys(INFO_FIELD_RULES).every(validateInfoField);
    return changed && valid;
}

function scheduleCurrentPasswordCheck() {
    clearTimeout(currentPasswordCheckTimer);
    const currentPw = document.getElementById('current-password')?.value || '';

    if (!currentPw) {
        currentPasswordValid = false;
        setFieldMessage('current-password', null, '');
        updateSaveButtonState();
        return;
    }

    currentPasswordCheckTimer = setTimeout(() => {
        checkCurrentPassword(currentPw);
    }, 350);
}

async function checkCurrentPassword(currentPw) {
    const seq = ++currentPasswordRequestSeq;

    try {
        await postJson('/account/verify-current-password/', { current_password: currentPw });
        if (seq !== currentPasswordRequestSeq) return;
        currentPasswordValid = true;
        setFieldMessage('current-password', 'success', '현재 비밀번호가 일치합니다.');
    } catch (error) {
        if (seq !== currentPasswordRequestSeq) return;
        currentPasswordValid = false;
        setFieldMessage('current-password', 'error', error.message || '현재 비밀번호가 일치하지 않습니다.');
    } finally {
        if (seq === currentPasswordRequestSeq) {
            validatePasswordForm();
            updateSaveButtonState();
        }
    }
}

function getPasswordValidationMessage(password) {
    if (!password) return '';
    const errors = [];
    if (password.length < 8 || password.length > 16) errors.push('8~16자');
    if (!/[A-Z]/.test(password)) errors.push('영문 대문자');
    if (!/[a-z]/.test(password)) errors.push('영문 소문자');
    if (!/[0-9]/.test(password)) errors.push('숫자');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('특수문자');
    return errors.length ? `${errors.join(', ')}를 포함해야 합니다.` : '';
}

function validatePasswordForm() {
    const currentPw = document.getElementById('current-password')?.value || '';
    const newPw = document.getElementById('new-password')?.value || '';
    const confirmPw = document.getElementById('new-password-confirm')?.value || '';

    let valid = Boolean(currentPw && currentPasswordValid);

    const passwordError = getPasswordValidationMessage(newPw);
    if (passwordError) {
        setFieldMessage('new-password', 'error', passwordError);
        valid = false;
    } else if (newPw && currentPw && currentPw === newPw) {
        setFieldMessage('new-password', 'error', '현재 비밀번호와 동일합니다');
        valid = false;
    } else {
        setFieldMessage('new-password', null, '');
        if (!newPw) valid = false;
    }

    if (!confirmPw) {
        setFieldMessage('new-password-confirm', null, '');
        valid = false;
    } else if (newPw !== confirmPw) {
        setFieldMessage('new-password-confirm', 'error', '비밀번호가 일치하지 않습니다.');
        valid = false;
    } else if (!passwordError && newPw && currentPw !== newPw) {
        setFieldMessage('new-password-confirm', 'success', '비밀번호가 일치합니다.');
    }

    return valid;
}

function updateSaveButtonState() {
    const saveBtn = document.getElementById('save-btn');
    if (!saveBtn) return;

    if (currentMypageTab === 'info') {
        saveBtn.disabled = !validateInfoForm();
    } else if (currentMypageTab === 'password') {
        saveBtn.disabled = !validatePasswordForm();
    } else {
        saveBtn.disabled = true;
    }
}

function switchMypageTab(tabName) {
    currentMypageTab = tabName;

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    const saveBtn = document.getElementById('save-btn');
    const withdrawalBtnArea = document.getElementById('withdrawal-btn-area');
    const targetContent = document.getElementById(`tab-${tabName}`);
    if (targetContent) targetContent.classList.add('active');

    if (tabName === 'withdrawal') {
        if (saveBtn?.parentElement) saveBtn.parentElement.style.display = 'none';
        if (withdrawalBtnArea) withdrawalBtnArea.style.display = 'flex';
    } else {
        if (saveBtn?.parentElement) saveBtn.parentElement.style.display = 'flex';
        if (withdrawalBtnArea) withdrawalBtnArea.style.display = 'none';
    }

    updateSaveButtonState();
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
    if (!validateInfoForm()) return;

    const name = document.getElementById('info-name').value.trim();
    const company = document.getElementById('info-company').value.trim();
    const position = document.getElementById('info-position').value.trim();

    try {
        const result = await postJson('/account/mypage/', {
            action: 'update_info',
            name,
            company,
            position,
        });

        ['info-name', 'info-company', 'info-position'].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.dataset.original = input.value.trim();
            setFieldMessage(id, null, '');
        });

        mypageModified = false;
        updateSaveButtonState();
        openAlert(result.message || '개인정보가 성공적으로 변경되었습니다.');
    } catch (error) {
        openAlert(error.message || '개인정보 수정에 실패했습니다.');
    }
}

async function savePasswordChanges() {
    if (!validatePasswordForm()) return;

    const currentPw = document.getElementById('current-password').value;
    const newPw = document.getElementById('new-password').value;
    const confirmPw = document.getElementById('new-password-confirm').value;

    try {
        const result = await postJson('/account/mypage/', {
            action: 'change_password',
            current_password: currentPw,
            new_password: newPw,
            new_password_confirm: confirmPw,
        });

        mypageModified = false;
        currentPasswordValid = false;
        ['current-password', 'new-password', 'new-password-confirm'].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = '';
            setFieldMessage(id, null, '');
        });
        updateSaveButtonState();
        openAlert(result.message || '비밀번호가 변경되었습니다.');
    } catch (error) {
        if (error.message === '현재 비밀번호가 일치하지 않습니다') {
            setFieldMessage('current-password', 'error', error.message);
            updateSaveButtonState();
            return;
        }
        if (error.message === '현재 비밀번호와 동일합니다') {
            setFieldMessage('new-password', 'error', error.message);
            updateSaveButtonState();
            return;
        }
        openAlert(error.message || '비밀번호 변경에 실패했습니다.');
    }
}

function confirmWithdrawal() {
    openAlert('그동안 이용해주셔서 감사합니다.', proceedWithdrawal);
}

async function proceedWithdrawal() {
    const confirmText = document.getElementById('withdrawal-confirm').value.trim();

    try {
        const result = await postJson('/account/mypage/', {
            action: 'withdraw',
            confirm_text: confirmText,
        });

        window.location.href = result.redirect_url || '/account/login/';
    } catch (error) {
        openAlert(error.message || '회원 탈퇴에 실패했습니다.');
    }
}
