document.addEventListener('DOMContentLoaded', () => {
    // 1. 獲取所有 DOM 元素 (No changes)
    const mainTimerEl = document.getElementById('main-timer');
    const currentStateEl = document.getElementById('current-state');
    const startPauseBtn = document.getElementById('start-pause-btn');
    const workTimeInput = document.getElementById('work-time');
    const restTimeInput = document.getElementById('rest-time');
    const roundResetTimeInput = document.getElementById('round-reset-time');
    const exercisesCountInput = document.getElementById('exercises-count');
    const roundsCountInput = document.getElementById('rounds-count');

    // 2. 計時器狀態變數 (No changes)
    let timerId = null;
    let state = {
        totalSeconds: 0,
        isRunning: false,
        currentMode: 'idle', // 'idle', 'work', 'rest', 'round-rest', 'finished'
        currentExercise: 1,
        currentRound: 1,
    };

    // --- 輔助函式 --- (No changes to these helpers)

    function populateTimeSelects() {
        const timeSelects = [workTimeInput, restTimeInput, roundResetTimeInput];
        timeSelects.forEach(select => {
            if (select.options.length > 0) return; // 防止重複填充
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

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }

    function updateTotalTimerDisplay() {
        if (state.isRunning) return;

        const workSec = parseInt(workTimeInput.value, 10) || 0;
        const restSec = parseInt(restTimeInput.value, 10) || 0;
        const exercises = parseInt(exercisesCountInput.value, 10) || 0;
        const rounds = parseInt(roundsCountInput.value, 10) || 0;
        const roundRestSec = parseInt(roundResetTimeInput.value, 10) || 0;

        let totalSeconds = 0;
        if (rounds > 0 && exercises > 0) {
            const timePerRound = (workSec * exercises) + (restSec * (exercises - 1));
            totalSeconds = (timePerRound * rounds) + (roundRestSec * (rounds - 1));
        }
        
        // 修正負數時間問題
        if(totalSeconds < 0) totalSeconds = 0;

        mainTimerEl.textContent = formatTime(totalSeconds);
        currentStateEl.textContent = "Press Start";
    }

    // --- 核心計時器控制 ---

    function toggleTimer() {
        if (state.isRunning) {
            pauseTimer();
        } else {
            // 【修改 4】: 第一次點擊時，先"解鎖"音訊權限
            // 這是為了讓 Safari 和 Chrome 等瀏覽器能正常播放聲音
            if (state.currentMode === 'idle' || state.currentMode === 'finished') {
                const dummySound = new Audio();
                dummySound.play().catch(e => console.error("Audio unlock failed", e));
            }
            startTimer();
        }
    }

    function startTimer() {
        if (state.currentMode === 'idle' || state.currentMode === 'finished') {
            state.currentMode = 'work';
            state.currentRound = 1;
            state.currentExercise = 1;
            state.totalSeconds = parseInt(workTimeInput.value, 10);
            speak('Work');
        }

        state.isRunning = true;
        updateDisplay();
        startPauseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="48" height="48"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`; // Pause icon
        if (timerId) clearInterval(timerId); // 清除舊的計時器以防萬一
        timerId = setInterval(tick, 1000);
    }

    function pauseTimer() {
        state.isRunning = false;
        clearInterval(timerId);
        timerId = null;
        currentStateEl.textContent = "PAUSED";
        startPauseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="48" height="48"><path d="M8 5v14l11-7z"/></svg>`; // Play icon
    }
    
    // 【修改 5】: 新增了 resetTimer 函式來處理重置邏輯
    function resetTimer() {
        clearInterval(timerId);
        timerId = null;
        state.isRunning = false;
        state.currentMode = 'idle';
        state.currentRound = 1;
        state.currentExercise = 1;
        updateTotalTimerDisplay();
        startPauseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="48" height="48"><path d="M8 5v14l11-7z"/></svg>`; // Play icon
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

        // 使用 try-catch 來防止音訊播放失敗導致程式崩潰
        try {
            const beepSound = new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3');
            beepSound.play();
        } catch (e) {
            console.error("Could not play beep sound:", e);
        }

        if (state.currentMode === 'work') {
            if (state.currentExercise < exercises) {
                // 進入組間休息
                state.currentMode = 'rest';
                state.totalSeconds = parseInt(restTimeInput.value, 10);
                speak('Rest');
            } else { // 完成一回合的所有組數
                if (state.currentRound < rounds) {
                    // 進入回合間休息
                    state.currentMode = 'round-rest';
                    state.totalSeconds = parseInt(roundResetTimeInput.value, 10);
                    speak('Round Complete. Rest.');
                } else {
                    // 全部完成
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

        if (state.isRunning) {
            if (state.currentMode === 'work') {
                currentStateEl.textContent = `WORK ${state.currentExercise}/${exercises} (R ${state.currentRound}/${rounds})`;
            } else if (state.currentMode === 'rest') {
                currentStateEl.textContent = 'REST';
            } else if (state.currentMode === 'round-rest') {
                currentStateEl.textContent = 'ROUND REST';
            }
        }
    }

    function finishTimer() {
        clearInterval(timerId);
        state.isRunning = false;
        state.currentMode = 'finished';
        mainTimerEl.textContent = "DONE!";
        currentStateEl.textContent = "Workout Complete";
        speak('Workout Complete. Well done!');
        startPauseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="48" height="48"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>`; // Reset icon
    }
    
    // --- 初始化 ---

    startPauseBtn.addEventListener('click', () => {
        // 【修改 6】: 簡化並修正了開始/暫停/重置的邏輯
        if (state.currentMode === 'finished') {
            resetTimer();
        } else {
            toggleTimer();
        }
    });

    [workTimeInput, restTimeInput, roundResetTimeInput, exercisesCountInput, roundsCountInput].forEach(input => {
        input.addEventListener('change', updateTotalTimerDisplay); // 改成 'change' 事件更適合 select
    });

    populateTimeSelects();
    updateTotalTimerDisplay();
});