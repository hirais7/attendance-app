// Configuration
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzgL-Gpq0Jg3BFz7Ku-KGREyMmrNLRVRjFrbQ0YY8MTEQJGHtmae1VNdR0FV2MiIgB-/exec';

// State
let isWorking = localStorage.getItem('isWorking') === 'true';

// DOM Elements
const timeDisplay = document.getElementById('time-display');
const dateDisplay = document.getElementById('date-display');
const statusBadge = document.getElementById('work-status');
const btnClockIn = document.getElementById('btn-clock-in');
const btnClockOut = document.getElementById('btn-clock-out');
const btnComplete = document.getElementById('btn-complete');
const loadingOverlay = document.getElementById('loading');
const toastEl = document.getElementById('toast');

// Main Info Elements
const mainTraineeId = document.getElementById('main-trainee-id');
const mainTraineeName = document.getElementById('main-trainee-name');

// Initialize
function init() {
    updateClock();
    setInterval(updateClock, 1000);

    // Pre-fill from localStorage if available (optional convenience)
    const savedData = JSON.parse(localStorage.getItem('traineeData'));
    if (savedData) {
        mainTraineeId.value = savedData.id || '';
        mainTraineeName.value = savedData.name || '';
    }

    updateStatusUI();

    // Add Event Listeners
    btnClockIn.addEventListener('click', () => handleAction('clockIn'));
    btnClockOut.addEventListener('click', () => handleAction('clockOut'));
    btnComplete.addEventListener('click', () => handleAction('complete'));

    if (GAS_URL.includes('YOUR_GAS')) {
        showToast('⚠ GAS_URLを設定してください');
    }
}

function updateClock() {
    const now = new Date();
    timeDisplay.textContent = now.toLocaleTimeString('ja-JP', { hour12: false });
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' };
    dateDisplay.textContent = now.toLocaleDateString('ja-JP', options);
}

function updateStatusUI() {
    // Shared device mode: buttons are usually both enabled 
    // because we don't know the status of the "next" person.
    // However, we can keep the visual indicator for the last action.
    if (isWorking) {
        statusBadge.textContent = '前回の操作: 出勤';
        statusBadge.classList.add('working');
    } else {
        statusBadge.textContent = '前回: 完了/退勤';
        statusBadge.classList.remove('working');
    }

    // In collaborative mode, we keep both buttons primary/enabled
    btnClockIn.disabled = false;
    btnClockOut.disabled = false;
}

async function handleAction(action) {
    const id = mainTraineeId.value.trim();
    const name = mainTraineeName.value.trim();

    if (!id || !name) {
        showToast('❌ IDと名前を入力してください');
        mainTraineeName.focus();
        return;
    }

    showLoading(true);

    // Save to localStorage for convenience (pre-fills for next time)
    localStorage.setItem('traineeData', JSON.stringify({ id, name }));

    const payload = {
        action: action,
        traineeId: id,
        traineeName: name,
        appUrl: window.location.href.split('?')[0].split('#')[0]
    };

    try {
        await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (action === 'clockIn') {
            isWorking = true;
            localStorage.setItem('isWorking', 'true');
            showToast(`✅ ${name}さん：出勤しました`);
        } else if (action === 'clockOut') {
            isWorking = false;
            localStorage.setItem('isWorking', 'false');
            showToast(`✅ ${name}さん：退勤しました`);
        } else if (action === 'complete') {
            showToast(`🎉 ${name}さん：課題完了を報告！`);
        }

        updateStatusUI();
    } catch (error) {
        console.error('Error:', error);
        showToast('❌ 通信エラーが発生しました');
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
    }, 4000);
}

document.addEventListener('DOMContentLoaded', init);

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
