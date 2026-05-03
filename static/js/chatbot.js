// chatbot.js - chatbot page helpers.

function getCurrentTime() {
    const now = new Date();
    return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function scrollToBottom() {
    const chatArea = document.getElementById('chat-messages-area');
    if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
}

function handleEnter(event) {
    if (event.key === 'Enter') sendMessage();
}

function escapeMessage(message) {
    return String(message)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('\n', '<br>');
}

function appendMessage(role, message) {
    const chatList = document.getElementById('chat-list');
    if (!chatList) return;

    const isUser = role === 'user';
    const row = document.createElement('div');
    const safeMessage = escapeMessage(message);
    const intro = document.querySelector('.chat-intro');
    if (intro) intro.classList.add('hidden');

    row.className = `message-row ${isUser ? 'user-row' : 'bot-row'}`;
    row.innerHTML = isUser
        ? `
            <div class="message-content">
                <div class="bubble user-bubble">${safeMessage}</div>
                <div class="time">${getCurrentTime()}</div>
            </div>
            <div class="avatar user-avatar">사용자</div>
        `
        : `
            <div class="avatar bot-avatar">
                <img src="/static/images/helpmet.png" alt="Bot" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
            </div>
            <div class="message-content">
                <div class="bubble bot-bubble">${safeMessage}</div>
                <div class="time">${getCurrentTime()}</div>
            </div>
        `;
    chatList.appendChild(row);
    scrollToBottom();
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input?.value.trim();
    if (!message) return;

    appendMessage('user', message);
    input.value = '';

    try {
        const formData = new FormData();
        formData.append('message', message);

        const response = await fetch('/chatbot/ask/', {
            method: 'POST',
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
            body: formData,
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || '챗봇 응답 생성에 실패했습니다.');
        }

        appendMessage('bot', result.data?.answer || '');
    } catch (error) {
        appendMessage('bot', error.message);
    }
}
