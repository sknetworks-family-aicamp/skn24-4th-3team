// auth.js - login, registration, terms, password reset page helpers.

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('focus', function() {
            this.classList.remove('error');
            const errorMsg = this.parentElement?.nextElementSibling;
            if (errorMsg && errorMsg.classList.contains('error-message')) {
                errorMsg.classList.remove('show');
            }
        });
    });
});

function handleLogin() {
    const email = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value;

    if (!email) {
        showError('login-email', 'email-error', '이메일을 입력해주세요.');
        return;
    }
    if (!password) {
        showError('login-password', 'password-error', '비밀번호를 입력해주세요.');
        return;
    }

    document.getElementById('login-form').submit();
}

let verificationTimer;
let registerVerificationTimer;

function startTimerForElement(elementId, duration) {
    const timerElement = document.getElementById(elementId);
    if (!timerElement) return null;

    let timeLeft = duration;
    timerElement.style.display = 'block';

    return setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        if (timeLeft <= 0) {
            timerElement.textContent = '시간이 만료되었습니다.';
            clearInterval(verificationTimer);
            clearInterval(registerVerificationTimer);
        }
        timeLeft--;
    }, 1000);
}

function sendVerificationCode() {
    const email = document.getElementById('find-email')?.value.trim();
    if (!email) {
        showError('find-email', 'find-email-error', '이메일을 입력해주세요.');
        return;
    }

    hideError('find-email', 'find-email-error');
    showSuccess('find-email-success', '인증번호가 발송되었습니다.');
    clearInterval(verificationTimer);
    verificationTimer = startTimerForElement('verification-timer', 300);
}

function verifyCode() {
    const code = document.getElementById('verification-code')?.value.trim();
    if (!code) {
        showError('verification-code', 'code-error', '인증번호를 입력해주세요.');
        return;
    }

    hideError('verification-code', 'code-error');
    showSuccess('code-success', '인증번호가 확인되었습니다.');
    clearInterval(verificationTimer);
}

function completePasswordReset() {
    const newPassword = document.getElementById('new-password')?.value;
    const confirmPassword = document.getElementById('confirm-password')?.value;

    if (!newPassword || !confirmPassword) {
        alert('비밀번호를 입력해주세요.');
        return;
    }
    if (newPassword !== confirmPassword) {
        showError('confirm-password', 'confirm-password-error', '비밀번호가 일치하지 않습니다.');
        return;
    }

    openPopup('success-popup');
    setTimeout(() => navigateTo('login.html'), 1500);
}

function toggleAllTerms() {
    const agreeAll = document.getElementById('agree-all');
    const agreePrivacy = document.getElementById('agree-privacy');
    if (agreeAll && agreePrivacy) {
        agreePrivacy.checked = agreeAll.checked;
        checkAllAgreed();
    }
}

function checkAllAgreed() {
    const agreeAll = document.getElementById('agree-all');
    const agreePrivacy = document.getElementById('agree-privacy');
    const nextBtn = document.getElementById('next-btn');
    if (!agreeAll || !agreePrivacy || !nextBtn) return;

    agreeAll.checked = agreePrivacy.checked;
    nextBtn.disabled = !agreePrivacy.checked;
}

function checkEmailDuplicate() {
    const email = document.getElementById('register-email')?.value.trim();
    if (!email) {
        showError('register-email', 'register-email-error', '이메일을 입력해주세요.');
        return;
    }

    hideError('register-email', 'register-email-error');
    showSuccess('register-email-success', '사용 가능한 이메일입니다.');
    sendRegisterVerificationCode();
}

function sendRegisterVerificationCode() {
    clearInterval(registerVerificationTimer);
    registerVerificationTimer = startTimerForElement('register-verification-timer', 300);
    openPopup('verification-modal-popup');
}

function verifyRegisterCode() {
    const code = document.getElementById('register-verification-code')?.value.trim();
    if (!code) {
        showError('register-verification-code', 'register-code-error', '인증번호를 입력해주세요.');
        return;
    }

    hideError('register-verification-code', 'register-code-error');
    showSuccess('register-code-success', '인증번호가 확인되었습니다.');
    clearInterval(registerVerificationTimer);
}

function completeRegistration() {
    const email = document.getElementById('register-email')?.value.trim();
    const password = document.getElementById('register-password')?.value;
    const confirmPassword = document.getElementById('register-password-confirm')?.value;

    if (!email || !password || !confirmPassword) {
        alert('모든 필드를 입력해주세요.');
        return;
    }
    if (password !== confirmPassword) {
        showError('register-password-confirm', 'register-password-confirm-error', '비밀번호가 일치하지 않습니다.');
        return;
    }

    navigateTo('register-user-info.html');
}

function validateTextField(fieldId, maxLength) {
    const input = document.getElementById(fieldId);
    if (!input) return;

    const errorId = `${fieldId}-error`;
    const value = input.value.trim();
    if (value.length > maxLength) {
        showError(fieldId, errorId, '최대 글자 수를 초과했습니다.');
    } else {
        hideError(fieldId, errorId);
    }

    checkUserInfoComplete();
}

function checkUserInfoComplete() {
    const name = document.getElementById('user-name');
    const company = document.getElementById('company-name');
    const position = document.getElementById('position');
    const completeBtn = document.getElementById('complete-btn');
    if (!name || !company || !position || !completeBtn) return;

    completeBtn.disabled = !(name.value.trim() && company.value.trim() && position.value.trim());
}

function completeUserRegistration() {
    navigateTo('register-complete.html');
}
