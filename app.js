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
        currentMode: 'idle', // 'idle', 'prepare', 'work', 'rest', 'round-rest', 'finished'
        currentExercise: 1,
        currentRound: 1,
        isHalfwayAnnounced: false, // 追蹤 "halfway" 是否已播報
    };

    // --- 輔助函式 ---

    /**
     * 動態填充時間選單 (Work, Rest, Round Reset)
     */
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

    /**
     * 動態填充數量選單 (Exercises, Rounds)
     */
    function populateCountSelects() {
        // 填充 Exercises 選單 (1-20)
        for (let i = 1; i <= 20; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            exercisesCountInput.appendChild(option);
        }
        exercisesCountInput.value = '8'; // 預設值

        // 填充 Rounds 選單 (1-20)
        for (let i = 1; i <= 20; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i}x`; // 顯示為 "1x", "2x"
            roundsCountInput.appendChild(option);
        }
        roundsCountInput.value = '1'; // 預設值
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

    /**
     * 將秒數格式化為 "mm:ss"
     */
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }

    /**
     * 計算並更新總時間 (包含準備時間)
     */
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
            // 加上第一次的準備時間
            totalSeconds += roundRestSec;
        }
        
        if (totalSeconds < 0) totalSeconds = 0;

        mainTimerEl.textContent = formatTime(totalSeconds);
        currentStateEl.textContent = "Press Start";
    }

    // --- 核心計時器控制 ---

    function toggleTimer() {
        if (state.isRunning) {
            pauseTimer();
        } else {
            // 第一次點擊時，先"解鎖"音訊權限
            if (state.currentMode === 'idle' || state.currentMode === 'finished') {
                const dummySound = new Audio();
                dummySound.play().catch(e => console.error("Audio unlock failed", e));
            }
            startTimer();
        }
    }

    function startTimer() {
        // 計時器從 'prepare' 狀態開始
        if (state.currentMode === 'idle' || state.currentMode === 'finished') {
            state.currentMode = 'prepare';
            state.currentRound = 1;
            state.currentExercise = 1;
            state.totalSeconds = parseInt(roundResetTimeInput.value, 10);
            speak('Get Ready');
        }

        state.isRunning = true;
        state.isHalfwayAnnounced = false; // 重置 halfway 標記
        updateDisplay();
        startPauseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="48" height="48"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`; // Pause icon
        if (timerId) clearInterval(timerId);
        timerId = setInterval(tick, 1000);
    }

    function pauseTimer() {
        state.isRunning = false;
        clearInterval(timerId);
        timerId = null;
        currentStateEl.textContent = "PAUSED";
        startPauseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="48" height="48"><path d="M8 5v14l11-7z"/></svg>`; // Play icon
    }
    
    function resetTimer() {
        clearInterval(timerId);
        timerId = null;
        state.isRunning = false;
        state.currentMode = 'idle';
        state.currentRound = 1;
        state.currentExercise = 1;
        state.isHalfwayAnnounced = false;
        updateTotalTimerDisplay();
        startPauseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="48" height="48"><path d="M8 5v14l11-7z"/></svg>`; // Play icon
    }

    function tick() {
        state.totalSeconds--;
        updateDisplay();

        // 處理倒數和中點提示
        if (state.totalSeconds > 0 && state.totalSeconds <= 3) {
            speak(state.totalSeconds.toString());
        }

        // 處理 "Halfway there" 提示
        if (state.currentMode === 'work') {
            const workDuration = parseInt(workTimeInput.value, 10);
            const halfwayPoint = Math.floor(workDuration / 2);
            if (state.totalSeconds === halfwayPoint && !state.isHalfwayAnnounced) {
                speak('Halfway there');
                state.isHalfwayAnnounced = true; // 標記已播報，避免重複
            }
        }

        if (state.totalSeconds <= 0) {
            moveToNextState();
        }
    }

    function moveToNextState() {
        state.isHalfwayAnnounced = false; // 進入新狀態前，重置 halfway 標記

        const exercises = parseInt(exercisesCountInput.value);
        const rounds = parseInt(roundsCountInput.value);
        
        // 播放狀態轉換音效
        try {
            const beepSound = new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3');
            beepSound.play();
        } catch (e) { console.error("Could not play beep sound:", e); }

        // 狀態轉換邏輯
        if (state.currentMode === 'prepare') {
            state.currentMode = 'work';
            state.totalSeconds = parseInt(workTimeInput.value, 10);
            speak('Work');
        } else if (state.currentMode === 'work') {
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

        if (state.isRunning) {
            if (state.currentMode === 'prepare') {
                currentStateEl.textContent = 'GET READY';
            } else if (state.currentMode === 'work') {
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
        if (state.currentMode === 'finished') {
            resetTimer();
        } else {
            toggleTimer();
        }
    });

    [workTimeInput, restTimeInput, roundResetTimeInput, exercisesCountInput, roundsCountInput].forEach(input => {
        input.addEventListener('change', updateTotalTimerDisplay);
    });

    // 頁面載入時，先填充選單，再初始化顯示
    populateTimeSelects();
    populateCountSelects(); // 新增的函式呼叫
    updateTotalTimerDisplay();
});