const api = typeof chrome !== "undefined" ? chrome : browser;

// Select elements
const limitEl = document.getElementById('dailyLimit');
const s0_icon = document.getElementById('s0_icon'), s0_color = document.getElementById('s0_color'), s0_sound = document.getElementById('s0_sound');
const s1_time = document.getElementById('s1_time'), s1_icon = document.getElementById('s1_icon'), s1_color = document.getElementById('s1_color'), s1_sound = document.getElementById('s1_sound');
const s2_time = document.getElementById('s2_time'), s2_icon = document.getElementById('s2_icon'), s2_color = document.getElementById('s2_color'), s2_sound = document.getElementById('s2_sound');
const s3_icon = document.getElementById('s3_icon'), s3_color = document.getElementById('s3_color'), s3_sound = document.getElementById('s3_sound');

// --- NEW: Audio Preview Function ---
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
        console.log("Audio preview failed.", e);
    }
}

// --- NEW: Add Event Listeners for Sound Preview ---
[s0_sound, s1_sound, s2_sound, s3_sound].forEach(selectElement => {
    selectElement.addEventListener('change', (e) => {
        playSound(e.target.value);
    });
});
// ------------------------------------

// Load saved settings
api.storage.local.get(['userConfig'], (result) => {
    if (result.userConfig) {
        const conf = result.userConfig;
        limitEl.value = conf.dailyLimitSeconds / 60;
        
        s0_icon.value = conf.stages[0].icon; s0_color.value = conf.stages[0].color; s0_sound.value = conf.stages[0].sound;
        
        s1_time.value = conf.stages[1].threshold / 60; s1_icon.value = conf.stages[1].icon; 
        s1_color.value = conf.stages[1].color; s1_sound.value = conf.stages[1].sound;

        s2_time.value = conf.stages[2].threshold / 60; s2_icon.value = conf.stages[2].icon; 
        s2_color.value = conf.stages[2].color; s2_sound.value = conf.stages[2].sound;

        s3_icon.value = conf.stages[3].icon; s3_color.value = conf.stages[3].color; s3_sound.value = conf.stages[3].sound;
    }
});

// Save Button Event
document.getElementById('saveBtn').addEventListener('click', () => {
    const dailyLimitSecs = parseInt(limitEl.value) * 60;
    
    const newConfig = {
        dailyLimitSeconds: dailyLimitSecs,
        stages: [
            { threshold: 0, icon: s0_icon.value, color: s0_color.value, sound: s0_sound.value },
            { threshold: parseInt(s1_time.value) * 60, icon: s1_icon.value, color: s1_color.value, sound: s1_sound.value },
            { threshold: parseInt(s2_time.value) * 60, icon: s2_icon.value, color: s2_color.value, sound: s2_sound.value },
            { threshold: dailyLimitSecs, icon: s3_icon.value, color: s3_color.value, sound: s3_sound.value }
        ]
    };

    api.storage.local.set({ userConfig: newConfig }, () => {
        const msg = document.getElementById('statusMsg');
        msg.style.display = 'block';
        setTimeout(() => { msg.style.display = 'none'; }, 2000);
    });
});