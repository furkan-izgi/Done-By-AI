const api = typeof chrome !== "undefined" ? chrome : browser;

let CONFIG = {
    dailyLimitSeconds: 7200,
    stages: [
        { threshold: 0, icon: '🟢', color: '#2ecc71', sound: 'none' },
        { threshold: 900, icon: '🟡', color: '#f1c40f', sound: 'chime' },
        { threshold: 1800, icon: '🟠', color: '#e67e22', sound: 'warning' },
        { threshold: 3600, icon: '🔴', color: '#e74c3c', sound: 'siren' }
    ]
};

let audioCtx = null;
let totalSeconds = 0, currentStageIndex = 0, isMinimized = false;
const host = window.location.hostname;
const todayString = new Date().toISOString().split('T')[0];

const unlockAudio = () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
};
window.addEventListener('click', unlockAudio, { once: true });

function playSound(soundType) {
    if (!soundType || soundType === 'none') return;
    unlockAudio(); if (!audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        const tone = (f, s, d, t='sine', v=0.15) => {
            const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
            o.type = t; o.frequency.setValueAtTime(f, s);
            g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(v, s + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, s + d);
            o.connect(g); g.connect(audioCtx.destination); o.start(s); o.stop(s + d);
        };
        if (soundType === 'chime') { tone(523, now, 0.8); tone(659, now+0.2, 0.8); }
        else if (soundType === 'warning') { tone(440, now, 0.4); tone(349, now+0.2, 0.4); }
        else if (soundType === 'radar') { for(let i=0; i<3; i++) tone(1200, now+(i*0.15), 0.1); }
        else if (soundType === 'success') { tone(523, now, 0.1); tone(659, now+0.1, 0.1); tone(783, now+0.2, 0.1); tone(1046, now+0.3, 0.3); }
        else if (soundType === 'siren') {
            const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
            o.type = 'sawtooth'; o.frequency.setValueAtTime(400, now);
            o.frequency.linearRampToValueAtTime(800, now+0.3); o.frequency.linearRampToValueAtTime(400, now+0.6);
            g.gain.setValueAtTime(0.1, now); g.gain.linearRampToValueAtTime(0, now+0.6);
            o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(now+0.6);
        }
    } catch(e) {}
}

function formatTime(s) {
    const h = Math.floor(s/3600), m = String(Math.floor((s%3600)/60)).padStart(2,'0'), sec = String(s%60).padStart(2,'0');
    return h > 0 ? `${String(h).padStart(2,'0')}:${m}:${sec}` : `${m}:${sec}`;
}

function updateUI() {
    if (!document.getElementById('time-keeper-container')) createUI();
    const container = document.getElementById('time-keeper-container'), textEl = document.getElementById('time-keeper-text');
    const progressEl = document.getElementById('time-keeper-progress'), iconEl = document.getElementById('time-keeper-icon');
    if (!container) return;

    const formatted = formatTime(totalSeconds);
    container.setAttribute('data-time', formatted);
    if (!isMinimized) textEl.innerText = `You've spent ${formatted} on this site today.`;

    let perc = (totalSeconds / CONFIG.dailyLimitSeconds) * 100;
    progressEl.style.width = `${Math.min(perc, 100)}%`;

    let idx = 0;
    for (let i=0; i<CONFIG.stages.length; i++) if (totalSeconds >= CONFIG.stages[i].threshold) idx = i;
    
    if (idx > currentStageIndex) {
        currentStageIndex = idx;
        if (CONFIG.stages[idx].sound !== 'none') playSound(CONFIG.stages[idx].sound);
    }
    progressEl.style.backgroundColor = CONFIG.stages[idx].color;
    iconEl.innerText = CONFIG.stages[idx].icon;
}

function createUI() {
    const style = document.createElement('style');
    style.innerHTML = `#time-keeper-container { position: fixed; bottom: 24px; left: 24px; z-index: 999999; font-family: sans-serif; background: rgba(20,20,20,0.75); backdrop-filter: blur(12px); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); color: white; display: flex; flex-direction: column; cursor: pointer; transition: all 0.4s; overflow: visible; }
    #time-keeper-container.minimized { border-radius: 50%; width: 50px; height: 50px; }
    #time-keeper-container.minimized::after { content: attr(data-time); position: absolute; bottom: 60px; left: 50%; transform: translateX(-50%); background: #000; padding: 6px 12px; border-radius: 8px; opacity: 0; visibility: hidden; transition: 0.2s; white-space: nowrap; }
    #time-keeper-container.minimized:hover::after { opacity: 1; visibility: visible; }
    #time-keeper-content { display: flex; align-items: center; padding: 12px 20px; gap: 12px; }
    .minimized #time-keeper-content { padding: 0; justify-content: center; height: 100%; }
    .minimized #time-keeper-text { display: none; }
    #time-keeper-progress-bg { width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 0 0 16px 16px; overflow: hidden; }
    .minimized #time-keeper-progress-bg { display: none; }
    #time-keeper-progress { height: 100%; transition: width 1s linear; }`;
    document.head.appendChild(style);

    const c = document.createElement('div'); c.id = 'time-keeper-container';
    c.innerHTML = `<div id="time-keeper-content"><span id="time-keeper-icon"></span><span id="time-keeper-text"></span></div><div id="time-keeper-progress-bg"><div id="time-keeper-progress"></div></div>`;
    document.body.appendChild(c);
    c.onclick = () => { isMinimized = !isMinimized; c.classList.toggle('minimized', isMinimized); updateUI(); };
}

api.storage.local.get([host, 'userConfig'], (r) => {
    if (r.userConfig) CONFIG = r.userConfig;
    const stored = r[host];
    if (stored && stored.date === todayString) totalSeconds = stored.time;
    updateUI();
    setInterval(() => { if (!document.hidden) { totalSeconds++; updateUI(); if (totalSeconds % 10 === 0) api.storage.local.set({ [host]: { date: todayString, time: totalSeconds } }); } }, 1000);
});