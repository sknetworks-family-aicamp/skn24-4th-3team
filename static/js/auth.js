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

    // 05_01 회원가입 수정 - 유효한 이메일 형식 입력 시 발송 버튼 활성화
    const registerEmail = document.getElementById('register-email');
    if (registerEmail) {
        registerEmail.addEventListener('input', function() {
            // 05_01 회원가입 수정 - 이메일 정규식 강화
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            const sendBtn = document.getElementById('check-email-btn');
            if (sendBtn) sendBtn.disabled = !emailRegex.test(this.value.trim());
            sessionStorage.removeItem('registerEmailVerified');
            hideError('register-email', 'register-email-error');
            hideSuccess('register-email-success');
            hideError('register-verification-code', 'register-code-error');
            hideSuccess('register-code-success');
        });
        // 05_01 회원가입 수정 - 코드 발송 후 이메일 클릭 시 수정 확인 모달 표시
        registerEmail.addEventListener('click', function() {
            if (isCodeSent) {
                this.blur();
                openConfirm('인증 중 이메일 주소를 수정하면 현재 발송된 인증번호는 더이상 유효하지 않습니다. 수정하시겠습니까?', confirmEmailReset, '확인', '취소');
            }
        });
    }

    // 05_01 회원가입 수정 - 인증번호 6자리 입력 시 확인 버튼 활성화
    const verifyCodeInput = document.getElementById('register-verification-code');
    if (verifyCodeInput) {
        verifyCodeInput.addEventListener('input', function() {
            const confirmBtn = document.getElementById('verify-register-code-btn');
            if (confirmBtn) confirmBtn.disabled = this.value.trim().length !== 6;
        });
    }

    // 05_01 회원가입 수정 - 비밀번호 실시간 유효성 검사
    const registerPassword = document.getElementById('register-password');
    if (registerPassword) {
        registerPassword.addEventListener('input', function() {
            validateRegisterPassword();
            checkRegisterFormComplete();
        });
    }

    // 05_01 회원가입 수정 - 비밀번호 확인 실시간 검사
    const registerPasswordConfirm = document.getElementById('register-password-confirm');
    if (registerPasswordConfirm) {
        registerPasswordConfirm.addEventListener('input', function() {
            validateRegisterPasswordConfirm();
            checkRegisterFormComplete();
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
            openAlert('비밀번호를 5회 잘못 입력하였습니다.\n10분 후 다시 시도해 주세요.');
        }
        showError('login-password', 'password-error', error.message || '로그인에 실패했습니다.');
    }
}

let verificationTimer;
let registerVerificationTimer;
// 05_01 회원가입 수정 - 인증번호 발송 후 이메일 수정 감지용 플래그
let isCodeSent = false;
let isVerifyingRegisterCode = false;
let isVerifyingFindCode = false;

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
            // 05_01 회원가입 수정 - 타이머 만료 시 확인 버튼 비활성화
            const confirmBtn = document.getElementById('verify-register-code-btn');
            if (confirmBtn) confirmBtn.disabled = true;
        }
        timeLeft--;
    }, 1000);
}

function handleFindEmailClick() {
    if (isFindCodeSent && !isFindCodeVerified) {
        document.getElementById('find-email').blur();
        openConfirm('인증 중 이메일 주소를 수정하면 현재 발송된 인증번호는 더이상 유효하지 않습니다. 수정하시겠습니까?', confirmFindEmailReset, '확인', '취소');
    }
}

function confirmFindEmailReset() {
    isFindCodeSent     = false;
    isFindCodeVerified = false;
    clearInterval(verificationTimer);

    const emailInput = document.getElementById('find-email');
    if (emailInput) { emailInput.readOnly = false; emailInput.focus(); }

    const codeInput = document.getElementById('verification-code');
    if (codeInput) { codeInput.value = ''; codeInput.disabled = false; }

    const sendBtn = document.getElementById('send-code-btn');
    if (sendBtn) { sendBtn.textContent = '인증번호 발송'; sendBtn.disabled = false; }

    const confirmBtn = document.getElementById('verify-code-btn');
    if (confirmBtn) confirmBtn.disabled = true;

    const timer = document.getElementById('verification-timer');
    if (timer) { timer.style.display = 'none'; timer.textContent = '05:00'; }

    const emailSuccess = document.getElementById('find-email-success');
    if (emailSuccess) { emailSuccess.textContent = ''; emailSuccess.classList.remove('show'); }

    const codeSuccess = document.getElementById('code-success');
    if (codeSuccess) { codeSuccess.textContent = ''; codeSuccess.classList.remove('show'); }

    checkFindFormComplete();
}

async function sendVerificationCode() {
    const email = document.getElementById('find-email')?.value.trim();
    if (!email) {
        showError('find-email', 'find-email-error', '이메일을 입력해주세요.');
        return;
    }

    try {
        const result = await postJson('/account/send-verification-code/', { email, for_find: true });
        hideError('find-email', 'find-email-error');
        const msg = result.debug_code
            ? `[개발] 인증번호: ${result.debug_code}`
            : '인증번호가 발송되었습니다.';
        showSuccess('find-email-success', msg);
        clearInterval(verificationTimer);
        verificationTimer = startTimerForElement('verification-timer', 300);
        const sendBtn = document.getElementById('send-code-btn');
        if (sendBtn) sendBtn.textContent = '재전송';
        isFindCodeSent = true;
        document.getElementById('find-email').readOnly = true;
    } catch (error) {
        showError('find-email', 'find-email-error', error.message || '인증번호 발송에 실패했습니다.');
    }
}

async function verifyCode() {
    if (isVerifyingFindCode) return;

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
        isVerifyingFindCode = true;
        const verifyBtn = document.getElementById('verify-code-btn');
        if (verifyBtn) verifyBtn.disabled = true;
        await postJson('/account/verify-certification-code/', { email, code });
        hideError('verification-code', 'code-error');
        showSuccess('code-success', '인증번호가 확인되었습니다.');
        clearInterval(verificationTimer);
        // 인증 완료 후 입력창/버튼 비활성화, 타이머 숨기기
        isFindCodeVerified = true;
        document.getElementById('find-email').disabled = true;
        document.getElementById('verification-code').disabled = true;
        document.getElementById('send-code-btn').disabled = true;
        document.getElementById('verify-code-btn').disabled = true;
        const timer = document.getElementById('verification-timer');
        if (timer) timer.style.display = 'none';
        checkFindFormComplete();
    } catch (error) {
        const verifyBtn = document.getElementById('verify-code-btn');
        if (verifyBtn) verifyBtn.disabled = code.length !== 6;
        showError('verification-code', 'code-error', error.message || '인증번호가 일치하지 않습니다.');
    } finally {
        isVerifyingFindCode = false;
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
        openAlert('비밀번호가 성공적으로 재설정되었습니다.\n로그인 페이지로 이동합니다.');
        setTimeout(() => {
            window.location.href = result.redirect_url || '/account/login/';
        }, 1200);
    } catch (error) {
        showError('confirm-password', 'confirm-password-error', error.message || '비밀번호 재설정에 실패했습니다.');
    }
}

// 05_01 회원가입 수정 - 모두 동의 클릭 시 5개 개별 체크박스 일괄 처리
function toggleAllTerms() {
    const agreeAll = document.getElementById('agree-all');
    if (!agreeAll) return;
    ['agree-terms1', 'agree-terms2', 'agree-terms3', 'agree-terms4', 'agree-terms5'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.checked = agreeAll.checked;
    });
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) nextBtn.disabled = !agreeAll.checked;
}

// 05_01 회원가입 수정 - 개별 체크박스 변경 시 모두 동의 상태 및 다음 버튼 갱신
function checkAllAgreed() {
    const ids = ['agree-terms1', 'agree-terms2', 'agree-terms3', 'agree-terms4', 'agree-terms5'];
    const allChecked = ids.every(id => {
        const el = document.getElementById(id);
        return el ? el.checked : true;
    });
    const agreeAll = document.getElementById('agree-all');
    if (agreeAll) agreeAll.checked = allChecked;
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) nextBtn.disabled = !allChecked;
}

async function checkEmailDuplicate() {
    const email = document.getElementById('register-email')?.value.trim();
    if (!email) {
        showError('register-email', 'register-email-error', '이메일을 입력해주세요.');
        return;
    }

    try {
        const result = await postJson('/account/send-verification-code/', { email });
        hideError('register-email', 'register-email-error');
        const msg = result.debug_code
            ? `[개발] 인증번호: ${result.debug_code}`
            : '인증번호가 발송되었습니다.';
        showSuccess('register-email-success', msg);
        openAlert('인증번호 발송이 완료되었습니다.\n5분 이내에 인증번호를 입력해주세요');
        clearInterval(registerVerificationTimer);
        registerVerificationTimer = startTimerForElement('register-verification-timer', 300);
        const sendBtn = document.getElementById('check-email-btn');
        if (sendBtn) sendBtn.textContent = '재전송';
        isCodeSent = true;
        sessionStorage.removeItem('registerEmailVerified');
        document.getElementById('register-email').readOnly = true;
    } catch (error) {
        hideSuccess('register-email-success');
        showError('register-email', 'register-email-error', error.message || '인증번호 발송에 실패했습니다.');
    }
}

async function verifyRegisterCode() {
    if (isVerifyingRegisterCode) return;

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
        isVerifyingRegisterCode = true;
        const verifyBtn = document.getElementById('verify-register-code-btn');
        if (verifyBtn) verifyBtn.disabled = true;
        await postJson('/account/verify-certification-code/', { email, code });
        hideError('register-verification-code', 'register-code-error');
        showSuccess('register-code-success', '인증번호가 확인되었습니다.');
        clearInterval(registerVerificationTimer);
        sessionStorage.setItem('registerEmailVerified', 'true');
        // 05_01 회원가입 수정 - 인증 완료 후 입력창/버튼 비활성화, 타이머 숨기기
        isCodeSent = false;
        document.getElementById('register-email').disabled = true;
        document.getElementById('register-verification-code').disabled = true;
        document.getElementById('check-email-btn').disabled = true;
        document.getElementById('verify-register-code-btn').disabled = true;
        const timer = document.getElementById('register-verification-timer');
        if (timer) timer.style.display = 'none';
        checkRegisterFormComplete();
    } catch (error) {
        const verifyBtn = document.getElementById('verify-register-code-btn');
        if (verifyBtn) verifyBtn.disabled = code.length !== 6;
        showError('register-verification-code', 'register-code-error', error.message || '인증번호가 일치하지 않습니다.');
    } finally {
        isVerifyingRegisterCode = false;
    }
}

// 05_01 회원가입 수정 - 이메일 수정 확인 모달에서 확인 클릭 시 상태 초기화
function confirmEmailReset() {
    isCodeSent = false;
    clearInterval(registerVerificationTimer);

    const emailInput = document.getElementById('register-email');
    if (emailInput) { emailInput.readOnly = false; emailInput.focus(); }

    const codeInput = document.getElementById('register-verification-code');
    if (codeInput) { codeInput.value = ''; codeInput.disabled = false; }

    const sendBtn = document.getElementById('check-email-btn');
    if (sendBtn) { sendBtn.textContent = '인증번호 발송'; sendBtn.disabled = false; }

    const confirmBtn = document.getElementById('verify-register-code-btn');
    if (confirmBtn) confirmBtn.disabled = true;

    const timer = document.getElementById('register-verification-timer');
    if (timer) { timer.style.display = 'none'; timer.textContent = '05:00'; }

    const emailSuccess = document.getElementById('register-email-success');
    if (emailSuccess) { emailSuccess.textContent = ''; emailSuccess.classList.remove('show'); }

    const codeSuccess = document.getElementById('register-code-success');
    if (codeSuccess) { codeSuccess.textContent = ''; codeSuccess.classList.remove('show'); }

    sessionStorage.removeItem('registerEmailVerified');
    checkRegisterFormComplete();
}

// 비밀번호 찾기 - 플래그
let isFindCodeSent     = false;
let isFindCodeVerified = false;

// 비밀번호 찾기 - 비밀번호 유효성 검사
function validateFindPassword() {
    const password = document.getElementById('new-password')?.value || '';
    const errorEl = document.getElementById('new-password-error');
    if (!password) {
        if (errorEl) { errorEl.textContent = ''; errorEl.classList.remove('show'); }
        return false;
    }
    const errors = [];
    if (password.length < 8 || password.length > 16) errors.push('8~16자');
    if (!/[A-Z]/.test(password)) errors.push('영문 대문자');
    if (!/[a-z]/.test(password)) errors.push('영문 소문자');
    if (!/[0-9]/.test(password)) errors.push('숫자');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('특수문자');
    if (errors.length > 0) {
        if (errorEl) { errorEl.textContent = `${errors.join(', ')}를 포함해야 합니다.`; errorEl.classList.add('show'); }
        return false;
    }
    if (errorEl) { errorEl.textContent = ''; errorEl.classList.remove('show'); }
    return true;
}

// 비밀번호 찾기 - 비밀번호 확인 검사
function validateFindPasswordConfirm() {
    const password  = document.getElementById('new-password')?.value || '';
    const confirm   = document.getElementById('confirm-password')?.value || '';
    const errorEl   = document.getElementById('confirm-password-error');
    const successEl = document.getElementById('confirm-password-success');
    if (!confirm) {
        if (errorEl)   { errorEl.textContent = '';   errorEl.classList.remove('show'); }
        if (successEl) { successEl.textContent = ''; successEl.classList.remove('show'); }
        return false;
    }
    if (password !== confirm) {
        if (errorEl)   { errorEl.textContent = '비밀번호가 일치하지 않습니다.'; errorEl.classList.add('show'); }
        if (successEl) { successEl.textContent = ''; successEl.classList.remove('show'); }
        return false;
    }
    if (errorEl)   { errorEl.textContent = '';              errorEl.classList.remove('show'); }
    if (successEl) { successEl.textContent = '비밀번호가 일치합니다.'; successEl.classList.add('show'); }
    return true;
}

// 비밀번호 찾기 - 다음 버튼 활성화 조건 체크 (인증 완료 + 비밀번호 유효 + 확인 일치)
function checkFindFormComplete() {
    const nextBtn = document.getElementById('find-next-btn');
    if (!nextBtn) return;
    const pwValid      = validateFindPassword();
    const confirmValid = validateFindPasswordConfirm();
    nextBtn.disabled   = !(isFindCodeVerified && pwValid && confirmValid);
}

// 05_01 회원가입 수정 - 비밀번호 실시간 유효성 검사 (대소문자, 숫자, 특수문자, 8~16자)
function validateRegisterPassword() {
    const password = document.getElementById('register-password')?.value || '';
    const errorEl = document.getElementById('register-password-error');
    if (!password) {
        if (errorEl) { errorEl.textContent = ''; errorEl.classList.remove('show'); }
        return false;
    }
    const errors = [];
    if (password.length < 8 || password.length > 16) errors.push('8~16자');
    if (!/[A-Z]/.test(password)) errors.push('영문 대문자');
    if (!/[a-z]/.test(password)) errors.push('영문 소문자');
    if (!/[0-9]/.test(password)) errors.push('숫자');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('특수문자');
    if (errors.length > 0) {
        if (errorEl) { errorEl.textContent = `${errors.join(', ')}를 포함해야 합니다.`; errorEl.classList.add('show'); }
        return false;
    }
    if (errorEl) { errorEl.textContent = ''; errorEl.classList.remove('show'); }
    return true;
}

// 05_01 회원가입 수정 - 비밀번호 확인 실시간 검사
function validateRegisterPasswordConfirm() {
    const password = document.getElementById('register-password')?.value || '';
    const confirm = document.getElementById('register-password-confirm')?.value || '';
    const errorEl = document.getElementById('register-password-confirm-error');
    const successEl = document.getElementById('register-password-confirm-success');
    if (!confirm) {
        if (errorEl) { errorEl.textContent = ''; errorEl.classList.remove('show'); }
        if (successEl) { successEl.textContent = ''; successEl.classList.remove('show'); }
        return false;
    }
    if (password !== confirm) {
        if (errorEl) { errorEl.textContent = '비밀번호가 일치하지 않습니다.'; errorEl.classList.add('show'); }
        if (successEl) { successEl.textContent = ''; successEl.classList.remove('show'); }
        return false;
    }
    if (errorEl) { errorEl.textContent = ''; errorEl.classList.remove('show'); }
    if (successEl) { successEl.textContent = '비밀번호가 일치합니다.'; successEl.classList.add('show'); }
    return true;
}

// 05_01 회원가입 수정 - 다음 버튼 활성화 조건 체크 (이메일 인증 + 비밀번호 유효 + 확인 일치)
function checkRegisterFormComplete() {
    const nextBtn = document.getElementById('register-next-btn');
    if (!nextBtn) return;
    const emailVerified = sessionStorage.getItem('registerEmailVerified') === 'true';
    const passwordValid = validateRegisterPassword();
    const passwordConfirmValid = validateRegisterPasswordConfirm();
    nextBtn.disabled = !(emailVerified && passwordValid && passwordConfirmValid);
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
