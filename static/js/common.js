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


function showCommonModal(
        { 
        modalId = "modal-" + Date.now(), // ID 중복 방지를 위해 타임스탬프 활용
        title = "", 
        message = "", 
        btn1Text = "확인", 
        btn2Text = null, 
        btn1Callback = null, 
        btn2Callback = null 
    }
) {

    
    // 1. 모달 HTML 구조 생성 (문자열 템플릿)
    const modalHtml = `
        <div class="popup-overlay" id="${modalId}">
            <div class="popup-box">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="popup-buttons">
                    <button class="btn btn-primary" id="${modalId}-btn1" >${btn1Text}</button>
                    ${btn2Text == null ? '' : `<button class="btn btn-secondary" id="${modalId}-btn2">${btn2Text}</button>`}
                </div>
            </div>
        </div>
    `;

    // 2. 기존에 같은 ID가 있다면 제거 (방어 코드)
    const existingModal = document.getElementById(modalId);
    if (existingModal) existingModal.remove();
    
    // 3. body에 삽입
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // 4. 버튼 이벤트 리스너 연결
    const modal = document.getElementById(modalId);
    setTimeout(() => modal.classList.add('active'), 10);
    
    // btn1 클릭 시
    document.getElementById(modalId+'-btn1').onclick = function() {
        if (btn1Callback) btn1Callback();    // 콜백 실행
        closeModal(modalId);
    };

    // btn2 버튼 클릭 시
    const btn2 = document.getElementById(modalId+'-btn2');
    if(btn2) {
        btn2.onclick = function() {
            if (btn2Callback) btn2Callback();    // 콜백 실행
            closeModal(modalId);
        };

    }

}


function closeModal(modalId) {
    document.getElementById(modalId).remove();
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
