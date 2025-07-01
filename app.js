document.addEventListener('DOMContentLoaded', () => {
    // 1. 獲取所有 DOM 元素
    const mainTimerEl = document.getElementById('main-timer');
    const currentStateEl = document.getElementById('current-state');
    const startPauseBtn = document.getElementById('start-pause-btn');

    const workTimeInput = document.getElementById('work-time');
    const restTimeInput = document.getElementById('rest-time');
    const roundResetTimeInput = document.getElementById('round-reset-time');

    const exercisesCountInput = document.getElementById('exercises-count');
    const roundsCountInput = document.getElementById('rounds-count');

    // 2. 計時器狀態變數
    let timerId = null;
    let state = {
        totalSeconds: 0,
        isRunning: false,
        currentMode: 'idle',
        currentExercise: 1,
        currentRound: 1,
    };

    /**
     * 動態填充時間選單
     */
    function populateTimeSelects() {
        const timeSelects = [workTimeInput, restTimeInput, roundResetTimeInput];

        timeSelects.forEach(select => {
            for (let i = 5; i <= 180; i += 5) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `${i} sec`;
                select.appendChild(option);
            }
        });

        workTimeInput.value = '30';
        restTimeInput.value = '10';
        roundResetTimeInput.value = '10';
    }

    /**
     * 使用瀏覽器內建語音說出文字
     */
    function speak(text) {
        if (!window.speechSynthesis) {
            console.warn("Browser does not support Speech Synthesis.");
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    }

    // 將秒數格式化為 "mm:ss"
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }

    // 計算並更新總時間 (僅用於顯示)
    function updateTotalTimerDisplay() {
        if (state.isRunning) return;

        const workSec = parseInt(workTimeInput.value, 10);
        const restSec = parseInt(restTimeInput.value, 10);
        const exercises = parseInt(exercisesCountInput.value) || 0;
        const rounds = parseInt(roundsCountInput.value) || 0;
        const roundRestSec = parseInt(roundResetTimeInput.value, 10);

        const totalWorkTime = workSec * exercises * rounds;
        const totalRestTime = exercises > 1 ? restSec * (exercises - 1) * rounds : 0;
        const totalRoundRestTime = rounds > 1 ? roundRestSec * (rounds - 1) : 0;

        const totalSeconds = totalWorkTime + totalRestTime + totalRoundRestTime;
        mainTimerEl.textContent = formatTime(totalSeconds);
        currentStateEl.textContent = "Press Start";
    }
    
    // --- 完整的計時器控制函式 (之前被省略的部分) ---

    function toggleTimer() {
        if (state.isRunning) {
            pauseTimer();
        } else {
            if (state.currentMode === 'finished') {
                resetTimer();
            } else {
                startTimer();
            }
        }
    }

    function startTimer() {
        if (state.currentMode === 'idle') {
            state.currentMode = 'work';
            state.currentRound = 1;
            state.currentExercise = 1;
            state.totalSeconds = parseInt(workTimeInput.value, 10);
            speak('Work');
        }

        state.isRunning = true;
        updateDisplay();
        startPauseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="48" height="48"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
        timerId = setInterval(tick, 1000);
    }

    function pauseTimer() {
        state.isRunning = false;
        clearInterval(timerId);
        timerId = null;
        startPauseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="48" height="48"><path d="M8 5v14l11-7z"/></svg>`;
    }

    function resetTimer() {
        state.currentMode = 'idle';
        state.currentRound = 1;
        state.currentExercise = 1;
        updateTotalTimerDisplay();
        startPauseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="48" height="48"><path d="M8 5v14l11-7z"/></svg>`;
    }

    function tick() {
        state.totalSeconds--;
        updateDisplay();

        if (state.totalSeconds > 0 && state.totalSeconds <= 3) {
            speak(state.totalSeconds.toString());
        }

        if (state.totalSeconds <= 0) {
            moveToNextState();
        }
    }

    function moveToNextState() {
        const exercises = parseInt(exercisesCountInput.value);
        const rounds = parseInt(roundsCountInput.value);

        const beepSound = new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3');
        beepSound.play();

        if (state.currentMode === 'work') {
            if (state.currentExercise < exercises) {
                state.currentMode = 'rest';
                state.totalSeconds = parseInt(restTimeInput.value, 10);
                speak('Rest');
            } else {
                if (state.currentRound < rounds) {
                    state.currentMode = 'round-rest';
                    state.totalSeconds = parseInt(roundResetTimeInput.value, 10);
                    speak('Round Complete. Rest.');
                } else {
                    finishTimer();
                    return;
                }
            }
        } else if (state.currentMode === 'rest') {
            state.currentExercise++;
            state.currentMode = 'work';
            state.totalSeconds = parseInt(workTimeInput.value, 10);
            speak('Work');
        } else if (state.currentMode === 'round-rest') {
            state.currentRound++;
            state.currentExercise = 1;
            state.currentMode = 'work';
            state.totalSeconds = parseInt(workTimeInput.value, 10);
            speak('Work');
        }

        updateDisplay();
    }

    function updateDisplay() {
        mainTimerEl.textContent = formatTime(state.totalSeconds);
        const exercises = parseInt(exercisesCountInput.value);
        const rounds = parseInt(roundsCountInput.value);

        if (state.currentMode === 'work') {
            currentStateEl.textContent = `WORK ${state.currentExercise}/${exercises} (Round ${state.currentRound}/${rounds})`;
        } else if (state.currentMode === 'rest') {
            currentStateEl.textContent = 'REST';
        } else if (state.currentMode === 'round-rest') {
            currentStateEl.textContent = 'ROUND REST';
        } else if (state.currentMode === 'finished') {
            currentStateEl.textContent = "FINISHED!";
        }
    }

    function finishTimer() {
        clearInterval(timerId);
        state.isRunning = false;
        state.currentMode = 'finished';
        updateDisplay();
        speak('Workout Complete');

        startPauseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="48" height="48"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>`;
    }

    // --- 初始化 ---

    // 4. 事件監聽
    startPauseBtn.addEventListener('click', toggleTimer);

    // 監聽任何設定的變更
    [workTimeInput, restTimeInput, roundResetTimeInput, exercisesCountInput, roundsCountInput].forEach(input => {
        input.addEventListener('input', updateTotalTimerDisplay);
    });

    // 頁面載入時，先填充選單，再初始化顯示
    populateTimeSelects();
    updateTotalTimerDisplay();
});
