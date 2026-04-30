// mypage.js - 留덉씠?섏씠吏 ?꾩슜

let currentMypageTab = 'info';
let mypageModified = false;

document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('#tab-info input, #tab-password input');
    inputs.forEach(input => input.addEventListener('input', () => { mypageModified = true; }));
    
    const withdrawalInput = document.getElementById('withdrawal-confirm');
    const withdrawalBtn = document.getElementById('withdrawal-btn');
    if (withdrawalInput && withdrawalBtn) {
        withdrawalInput.addEventListener('input', () => {
            withdrawalBtn.disabled = withdrawalInput.value !== '?뚯썝?덊눜';
        });
    }
});

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
    if (mypageModified && currentMypageTab !== 'withdrawal') showPopup('popup-mypage-back');
    else navigateTo('main.html');
}

function confirmLeaveMypage() {
    closePopup('popup-mypage-back');
    mypageModified = false;
    navigateTo('main.html');
}

function saveMypageChanges() {
    if (currentMypageTab === 'info') saveInfoChanges();
    else if (currentMypageTab === 'password') savePasswordChanges();
}

function saveInfoChanges() {
    const name = document.getElementById('info-name').value.trim();
    const company = document.getElementById('info-company').value.trim();
    const position = document.getElementById('info-position').value.trim();
    
    hideError('info-name', 'info-name-error'); hideError('info-company', 'info-company-error'); hideError('info-position', 'info-position-error');
    
    let isValid = true;
    if (!name) { showError('info-name', 'info-name-error', '?깅챸???낅젰?댁＜?몄슂.'); isValid = false; }
    if (!company) { showError('info-company', 'info-company-error', '?낆껜紐낆쓣 ?낅젰?댁＜?몄슂.'); isValid = false; }
    if (!position) { showError('info-position', 'info-position-error', '吏곸콉???낅젰?댁＜?몄슂.'); isValid = false; }
    
    if (!isValid) return;
    mypageModified = false;
    showPopup('popup-info-saved');
}

function savePasswordChanges() {
    const currentPw = document.getElementById('current-password').value;
    const newPw = document.getElementById('new-password').value;
    const confirmPw = document.getElementById('new-password-confirm').value;
    
    let isValid = true;
    if (!currentPw) { showError('current-password', 'current-password-error', '?꾩옱 鍮꾨?踰덊샇瑜??낅젰?댁＜?몄슂.'); isValid = false; }
    if (!newPw) { showError('new-password', 'new-password-error', '??鍮꾨?踰덊샇瑜??낅젰?댁＜?몄슂.'); isValid = false; }
    if (!confirmPw) { showError('new-password-confirm', 'new-password-confirm-error', '鍮꾨?踰덊샇 ?뺤씤???낅젰?댁＜?몄슂.'); isValid = false; }
    else if (newPw !== confirmPw) { showError('new-password-confirm', 'new-password-confirm-error', '鍮꾨?踰덊샇媛 ?쇱튂?섏? ?딆뒿?덈떎.'); isValid = false; }
    
    if (!isValid) return;
    mypageModified = false;
    showPopup('popup-info-saved');
}

function confirmWithdrawal() { showPopup('popup-withdrawal-confirm'); }
function proceedWithdrawal() { closePopup('popup-withdrawal-confirm'); navigateTo('login.html'); }