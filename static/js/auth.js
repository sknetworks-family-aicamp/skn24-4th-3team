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
    if (!response.ok || result.success === false) {
        throw result;
    }
    return result;
}

async function handleLogin() {
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

    try {
        const result = await postJson('/account/login/', { email, password });
        window.location.href = result.redirect_url || '/core/dashboard/';
    } catch (error) {
        if (error.locked) {
            openPopup('error-popup');
        }
        showError('login-password', 'password-error', error.message || '로그인에 실패했습니다.');
    }
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

async function sendVerificationCode() {
    const email = document.getElementById('find-email')?.value.trim();
    if (!email) {
        showError('find-email', 'find-email-error', '이메일을 입력해주세요.');
        return;
    }

    try {
        await postJson('/account/send-verification-code/', { email });
        hideError('find-email', 'find-email-error');
        showSuccess('find-email-success', '인증번호가 발송되었습니다.');
        clearInterval(verificationTimer);
        verificationTimer = startTimerForElement('verification-timer', 300);
    } catch (error) {
        showError('find-email', 'find-email-error', error.message || '인증번호 발송에 실패했습니다.');
    }
}

async function verifyCode() {
    const email = document.getElementById('find-email')?.value.trim();
    const code = document.getElementById('verification-code')?.value.trim();

    if (!email) {
        showError('find-email', 'find-email-error', '이메일을 입력해주세요.');
        return;
    }
    if (!code) {
        showError('verification-code', 'code-error', '인증번호를 입력해주세요.');
        return;
    }

    try {
        await postJson('/account/verify-certification-code/', { email, code });
        hideError('verification-code', 'code-error');
        showSuccess('code-success', '인증번호가 확인되었습니다.');
        clearInterval(verificationTimer);
    } catch (error) {
        showError('verification-code', 'code-error', error.message || '인증번호 확인에 실패했습니다.');
    }
}

async function completePasswordReset() {
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

    try {
        const result = await postJson('/account/password/find/', {
            new_password: newPassword,
            new_password_confirm: confirmPassword,
        });
        openPopup('success-popup');
        setTimeout(() => {
            window.location.href = result.redirect_url || '/account/login/';
        }, 1200);
    } catch (error) {
        showError('confirm-password', 'confirm-password-error', error.message || '비밀번호 재설정에 실패했습니다.');
    }
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

async function checkEmailDuplicate() {
    const email = document.getElementById('register-email')?.value.trim();
    if (!email) {
        showError('register-email', 'register-email-error', '이메일을 입력해주세요.');
        return;
    }

    try {
        await postJson('/account/send-verification-code/', { email });
        hideError('register-email', 'register-email-error');
        showSuccess('register-email-success', '인증번호가 발송되었습니다.');
        clearInterval(registerVerificationTimer);
        registerVerificationTimer = startTimerForElement('register-verification-timer', 300);
        openPopup('verification-modal-popup');
    } catch (error) {
        showError('register-email', 'register-email-error', error.message || '인증번호 발송에 실패했습니다.');
    }
}

async function verifyRegisterCode() {
    const email = document.getElementById('register-email')?.value.trim();
    const code = document.getElementById('register-verification-code')?.value.trim();

    if (!email) {
        showError('register-email', 'register-email-error', '이메일을 입력해주세요.');
        return;
    }
    if (!code) {
        showError('register-verification-code', 'register-code-error', '인증번호를 입력해주세요.');
        return;
    }

    try {
        await postJson('/account/verify-certification-code/', { email, code });
        hideError('register-verification-code', 'register-code-error');
        showSuccess('register-code-success', '인증번호가 확인되었습니다.');
        clearInterval(registerVerificationTimer);
        sessionStorage.setItem('registerEmailVerified', 'true');
    } catch (error) {
        showError('register-verification-code', 'register-code-error', error.message || '인증번호 확인에 실패했습니다.');
    }
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

    sessionStorage.setItem('registerEmail', email);
    sessionStorage.setItem('registerPassword', password);
    sessionStorage.setItem('registerPasswordConfirm', confirmPassword);
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

async function completeUserRegistration() {
    const email = sessionStorage.getItem('registerEmail');
    const password = sessionStorage.getItem('registerPassword');
    const passwordConfirm = sessionStorage.getItem('registerPasswordConfirm');
    const name = document.getElementById('user-name')?.value.trim();
    const company = document.getElementById('company-name')?.value.trim();
    const position = document.getElementById('position')?.value.trim();

    if (!email || !password || !passwordConfirm) {
        navigateTo('register-form.html');
        return;
    }
    if (!name || !company || !position) {
        alert('모든 필드를 입력해주세요.');
        return;
    }

    try {
        const result = await postJson('/account/register/form/', {
            email,
            password,
            password_confirm: passwordConfirm,
            name,
            company,
            position,
        });
        sessionStorage.removeItem('registerEmail');
        sessionStorage.removeItem('registerPassword');
        sessionStorage.removeItem('registerPasswordConfirm');
        sessionStorage.removeItem('registerEmailVerified');
        window.location.href = result.redirect_url || '/account/register/complete/';
    } catch (error) {
        alert(error.message || '회원가입에 실패했습니다.');
    }
}
