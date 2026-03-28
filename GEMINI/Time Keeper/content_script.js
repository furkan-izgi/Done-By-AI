// API for browser compatibility
const api = typeof chrome !== "undefined" ? chrome : browser;

// Default Configuration (Used if user hasn't saved anything in popup yet)
let CONFIG = {
    dailyLimitSeconds: 3600,
    stages: [
        { threshold: 0,    icon: '🟢', color: '#2ecc71', sound: 'none' },
        { threshold: 900,  icon: '⏱️', color: '#f1c40f', sound: 'chime' },   // 15 mins
        { threshold: 1800, icon: '⚠️', color: '#e67e22', sound: 'warning' }, // 30 mins
        { threshold: 3600, icon: '🛑', color: '#e74c3c', sound: 'siren' }    // 60 mins
    ]
};

const host = window.location.hostname;
const dateObj = new Date();
const todayString = `${dateObj.getFullYear()}-${dateObj.getMonth() + 1}-${dateObj.getDate()}`;

let totalSeconds = 0;
let currentStageIndex = 0; 
let isMinimized = false;   

const textPrefix = "Time Keeper: You've spent ";
const textSuffix = " on this site today.";

// Helper function to convert seconds to HH:MM:SS format
function formatTime(seconds) {
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

// Function to generate and play sounds
function playSound(soundType) {
    if (!soundType || soundType === 'none') return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        const now = ctx.currentTime;
        
        if (soundType === 'chime') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.2);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.3, now + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
            osc.start(now);
            osc.stop(now + 0.8);
        } else if (soundType === 'warning') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.setValueAtTime(400, now + 0.2);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        } else if (soundType === 'siren') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.linearRampToValueAtTime(800, now + 0.3);
            osc.frequency.linearRampToValueAtTime(400, now + 0.6);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.6);
            osc.start(now);
            osc.stop(now + 0.6);
        } else if (soundType === 'beep') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        }
    } catch (e) {
        console.log("Time Keeper: Audio playback blocked or failed.", e);
    }
}

// Function to determine the correct stage
function getStageIndex(seconds) {
    let index = 0;
    for (let i = 0; i < CONFIG.stages.length; i++) {
        if (seconds >= CONFIG.stages[i].threshold) {
            index = i;
        }
    }
    return index;
}

// Create UI
function createUI() {
    if (document.getElementById('time-keeper-container')) return;

    const style = document.createElement('style');
    style.id = 'time-keeper-styles';
    style.innerHTML = `
        #time-keeper-container {
            position: fixed;
            bottom: 24px;
            left: 24px;
            z-index: 999999;
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: rgba(20, 20, 20, 0.75);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: white;
            overflow: hidden;
            transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
            display: flex;
            flex-direction: column;
            cursor: pointer;
            user-select: none;
            max-width: 600px;
            box-sizing: border-box; /* EKLENDI: Kutu modelini netleştirir */
        }
        #time-keeper-container:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
            background: rgba(30, 30, 30, 0.85);
        }
        /* FIXED: Centering logic for minimized state */
        #time-keeper-container.minimized {
            border-radius: 50%;
            width: 50px;
            height: 50px;
            padding: 0;
            justify-content: center;
            align-items: center;
        }
        #time-keeper-content {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 12px 20px;
            gap: 12px;
            white-space: nowrap;
            width: 100%;
            height: 100%;
            box-sizing: border-box;
        }
        .minimized #time-keeper-content {
            padding: 0;
            gap: 0;
        }
        #time-keeper-icon {
            font-size: 20px;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 0;
        }
        #time-keeper-text {
            font-size: 14px;
            font-weight: 500;
            letter-spacing: 0.3px;
        }
        /* FIXED: Completely hide text to prevent flexbox offset */
        .minimized #time-keeper-text {
            display: none !important; 
        }
        #time-keeper-progress-bg {
            width: 100%;
            height: 4px;
            background: rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;
        }
        .minimized #time-keeper-progress-bg {
            display: none;
        }
        #time-keeper-progress {
            height: 100%;
            width: 0%;
            background: ${CONFIG.stages[0].color};
            transition: width 1s linear, background-color 0.5s ease;
        }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.id = 'time-keeper-container';
    container.title = "Click to minimize/maximize";
    
    const content = document.createElement('div');
    content.id = 'time-keeper-content';
    
    const icon = document.createElement('span');
    icon.id = 'time-keeper-icon';
    icon.innerText = CONFIG.stages[0].icon;

    const text = document.createElement('span');
    text.id = 'time-keeper-text';

    content.appendChild(icon);
    content.appendChild(text);

    const progressBg = document.createElement('div');
    progressBg.id = 'time-keeper-progress-bg';
    
    const progress = document.createElement('div');
    progress.id = 'time-keeper-progress';
    
    progressBg.appendChild(progress);

    container.appendChild(content);
    container.appendChild(progressBg);
    document.body.appendChild(container);

    container.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); 
        isMinimized = !isMinimized;
        api.storage.local.set({ isMinimizedSetting: isMinimized }); 
        updateUI(); 
    });
}

// Update UI
function updateUI() {
    createUI(); 

    const container = document.getElementById('time-keeper-container');
    const textEl = document.getElementById('time-keeper-text');
    const progressEl = document.getElementById('time-keeper-progress');
    const iconEl = document.getElementById('time-keeper-icon');
    
    if (!container || !textEl || !progressEl || !iconEl) return;

    if (isMinimized) {
        container.classList.add('minimized');
        iconEl.style.fontSize = '24px';
    } else {
        container.classList.remove('minimized');
        iconEl.style.fontSize = '20px';
    }

    textEl.innerText = `${textPrefix}${formatTime(totalSeconds)}${textSuffix}`;

    let percentage = (totalSeconds / CONFIG.dailyLimitSeconds) * 100;
    if (percentage > 100) percentage = 100;
    progressEl.style.width = `${percentage}%`;

    const newStageIndex = getStageIndex(totalSeconds);
    
    if (newStageIndex > currentStageIndex) {
        currentStageIndex = newStageIndex; 
        
        if (CONFIG.stages[currentStageIndex].sound !== 'none') {
            playSound(CONFIG.stages[currentStageIndex].sound);
        }
    }

    progressEl.style.backgroundColor = CONFIG.stages[currentStageIndex].color;
    iconEl.innerText = CONFIG.stages[currentStageIndex].icon;
}

// Save time to storage
function saveData() {
    const dataToSave = {};
    dataToSave[host] = { date: todayString, time: totalSeconds };
    api.storage.local.set(dataToSave);
}

// Listen for settings changes from Popup
api.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.userConfig) {
        CONFIG = changes.userConfig.newValue;
        currentStageIndex = getStageIndex(totalSeconds); // Re-calculate stage
        updateUI();
    }
});

// Init
api.storage.local.get([host, 'isMinimizedSetting', 'userConfig'], (result) => {
    
    if (result.userConfig) {
        CONFIG = result.userConfig;
    }

    if (result.isMinimizedSetting !== undefined) {
        isMinimized = result.isMinimizedSetting;
    }

    const data = result[host];
    if (data && data.date === todayString) {
        totalSeconds = data.time;
    } else {
        totalSeconds = 0; 
    }

    currentStageIndex = getStageIndex(totalSeconds);
    updateUI();

    setInterval(() => {
        if (!document.hidden) {
            totalSeconds++;
            updateUI();
            saveData();
        }
    }, 1000);
});

window.addEventListener("beforeunload", () => {
    saveData();
});