// Common JavaScript - navigation and popup helpers.

const ROUTE_MAP = {
    'login.html': '/account/login/',
    'password-find.html': '/account/password/find/',
    'register-terms.html': '/account/register/terms/',
    'register-form.html': '/account/register/form/',
    'register-user-info.html': '/account/register/user-info/',
    'register-complete.html': '/account/register/complete/',
    'main.html': '/core/dashboard/',
    'mypage.html': '/account/mypage/',
    'chatbot.html': '/core/chatbot/',
    'tbm-create.html': '/tbm/create/',
    'tbm-recording.html': '/tbm/recording/',
    'tbm-draft.html': '/tbm/draft/',
    'tbm-edit.html': '/tbm/edit/',
    'tbm-list.html': '/tbm/list/',
    'tbm-detail.html': '/tbm/detail/',
};

function navigateTo(page) {
    window.location.href = ROUTE_MAP[page] || page;
}

function openPopup(popupId) {
    const popup = document.getElementById(popupId);
    if (popup) popup.classList.add('show');
}

function showPopup(popupId) {
    openPopup(popupId);
}

function closePopup(popupId) {
    const popup = document.getElementById(popupId);
    if (popup) popup.classList.remove('show');
}

function showError(inputId, messageId, message) {
    const input = document.getElementById(inputId);
    const errorMsg = document.getElementById(messageId);

    if (input) input.classList.add('error');
    if (errorMsg) {
        errorMsg.textContent = message;
        errorMsg.classList.add('show');
    }
}

function hideError(inputId, messageId) {
    const input = document.getElementById(inputId);
    const errorMsg = document.getElementById(messageId);

    if (input) input.classList.remove('error');
    if (errorMsg) errorMsg.classList.remove('show');
}

function showSuccess(messageId, message) {
    const successMsg = document.getElementById(messageId);
    if (successMsg) {
        successMsg.textContent = message;
        successMsg.classList.add('show');
    }
}

function hideSuccess(messageId) {
    const successMsg = document.getElementById(messageId);
    if (successMsg) successMsg.classList.remove('show');
}

function goBack() {
    window.history.back();
}
