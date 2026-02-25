// Configuration
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzgL-Gpq0Jg3BFz7Ku-KGREyMmrNLRVRjFrbQ0YY8MTEQJGHtmae1VNdR0FV2MiIgB-/exec';

// State
let isWorking = localStorage.getItem('isWorking') === 'true';
let traineeData = JSON.parse(localStorage.getItem('traineeData')) || null;

// DOM Elements
const timeDisplay = document.getElementById('time-display');
const dateDisplay = document.getElementById('date-display');
const userNameDisplay = document.getElementById('user-name');
const statusBadge = document.getElementById('work-status');
const btnClockIn = document.getElementById('btn-clock-in');
const btnClockOut = document.getElementById('btn-clock-out');
const btnComplete = document.getElementById('btn-complete');
const btnEditUser = document.getElementById('btn-edit-user');
const loadingOverlay = document.getElementById('loading');
const toastEl = document.getElementById('toast');

// Modal Elements
const modalRegistration = document.getElementById('modal-registration');
const inputTraineeId = document.getElementById('input-trainee-id');
const inputTraineeName = document.getElementById('input-trainee-name');
const btnSaveUser = document.getElementById('btn-save-user');

// Initialize
function init() {
    updateClock();
    setInterval(updateClock, 1000);

    if (!traineeData || traineeData.name === 'あなたの名前') {
        showRegistrationModal();
    } else {
        userNameDisplay.textContent = traineeData.name;
    }

    updateStatusUI();

    // Add Event Listeners
    btnClockIn.addEventListener('click', () => handleAction('clockIn'));
    btnClockOut.addEventListener('click', () => handleAction('clockOut'));
    btnComplete.addEventListener('click', () => handleAction('complete'));
    btnEditUser.addEventListener('click', showRegistrationModal);
    btnSaveUser.addEventListener('click', saveTraineeData);

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

function showRegistrationModal() {
    if (traineeData) {
        inputTraineeId.value = traineeData.id;
        inputTraineeName.value = traineeData.name;
    }
    modalRegistration.classList.remove('hidden');
}

function saveTraineeData() {
    const id = inputTraineeId.value.trim();
    const name = inputTraineeName.value.trim();

    if (!id || !name) {
        alert('IDと名前を入力してください');
        return;
    }

    traineeData = { id, name };
    localStorage.setItem('traineeData', JSON.stringify(traineeData));
    userNameDisplay.textContent = name;
    modalRegistration.classList.add('hidden');
    showToast('✅ プロフィールを保存しました');
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
    if (!traineeData) {
        showRegistrationModal();
        return;
    }

    showLoading(true);

    const payload = {
        action: action,
        traineeId: traineeData.id,
        traineeName: traineeData.name,
        appUrl: window.location.href.split('?')[0].split('#')[0]
    };

    try {
        // GAS handles POST with no-cors but it's tricky to get result.
        // We use the default POST and assume success if no error.
        await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

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
    }, 3000);
}

document.addEventListener('DOMContentLoaded', init);
