// Configuration
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzgL-Gpq0Jg3BFz7Ku-KGREyMmrLNRVRjFrbQ0YY8MTEQJGHtmae1VNdR0FV2MiIgB-/exec';

// Predefined trainee for this task (as requested in the prompt)
const DEFAULT_TRAINEE = {
    id: 'user01',
    name: 'あなたの名前'
};

// State
let isWorking = localStorage.getItem('isWorking') === 'true';
let traineeData = JSON.parse(localStorage.getItem('traineeData')) || DEFAULT_TRAINEE;

// DOM Elements
const timeDisplay = document.getElementById('time-display');
const dateDisplay = document.getElementById('date-display');
const userNameDisplay = document.getElementById('user-name');
const statusBadge = document.getElementById('work-status');
const btnClockIn = document.getElementById('btn-clock-in');
const btnClockOut = document.getElementById('btn-clock-out');
const btnComplete = document.getElementById('btn-complete');
const loadingOverlay = document.getElementById('loading');
const toastEl = document.getElementById('toast');

// Initialize
function init() {
    updateClock();
    setInterval(updateClock, 1000);

    userNameDisplay.textContent = traineeData.name;
    updateStatusUI();

    // Add Event Listeners
    btnClockIn.addEventListener('click', () => handleAction('clockIn'));
    btnClockOut.addEventListener('click', () => handleAction('clockOut'));
    btnComplete.addEventListener('click', () => handleAction('complete'));

    // Check if GAS_URL is set
    if (GAS_URL === 'YOUR_GAS_WEB_APP_URL') {
        showToast('⚠ GAS_URLをscript.jsに設定してください');
    }
}

function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    timeDisplay.textContent = `${h}:${m}:${s}`;

    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    dateDisplay.textContent = `${y}/${mo}/${d} (${days[now.getDay()]})`;
}

function updateStatusUI() {
    if (isWorking) {
        statusBadge.textContent = '勤務中';
        statusBadge.classList.add('working');
        btnClockIn.disabled = true;
        btnClockOut.disabled = false;
    } else {
        statusBadge.textContent = '勤務外';
        statusBadge.classList.remove('working');
        btnClockIn.disabled = false;
        btnClockOut.disabled = true;
    }
}

async function handleAction(action) {
    if (GAS_URL === 'YOUR_GAS_WEB_APP_URL') {
        alert('先にGoogle Apps Scriptをデプロイし、そのURLをscript.jsのGAS_URLに設定してください。');
        return;
    }

    showLoading(true);

    const payload = {
        action: action,
        traineeId: traineeData.id,
        traineeName: traineeData.name,
        appUrl: window.location.href
    };

    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors', // GAS often requires no-cors for simple POSTs
            body: JSON.stringify(payload)
        });

        // Note: With no-cors, we can't read the response body.
        // We assume success if no error is thrown by fetch.

        if (action === 'clockIn') {
            isWorking = true;
            localStorage.setItem('isWorking', 'true');
            showToast('✅ 出勤を記録しました');
        } else if (action === 'clockOut') {
            isWorking = false;
            localStorage.setItem('isWorking', 'false');
            showToast('✅ 退勤を記録しました');
        } else if (action === 'complete') {
            showToast('🎉 課題完了を報告しました！');
        }

        updateStatusUI();
    } catch (error) {
        console.error('Error:', error);
        showToast('❌ エラーが発生しました');
    } finally {
        showLoading(false);
    }
}

function showLoading(show) {
    loadingOverlay.classList.toggle('hidden', !show);
}

function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.remove('hidden');
    setTimeout(() => {
        toastEl.classList.add('hidden');
    }, 3000);
}

document.addEventListener('DOMContentLoaded', init);
