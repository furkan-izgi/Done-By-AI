const api = typeof chrome !== "undefined" ? chrome : browser;

const getEl = (id) => document.getElementById(id);
const inputs = {
    limit: getEl('dailyLimit'),
    s0: { icon: getEl('s0_icon'), color: getEl('s0_color'), sound: getEl('s0_sound') },
    s1: { time: getEl('s1_time'), icon: getEl('s1_icon'), color: getEl('s1_color'), sound: getEl('s1_sound') },
    s2: { time: getEl('s2_time'), icon: getEl('s2_icon'), color: getEl('s2_color'), sound: getEl('s2_sound') },
    s3: { icon: getEl('s3_icon'), color: getEl('s3_color'), sound: getEl('s3_sound') }
};

function playSoundPreview(soundType) {
    if (!soundType || soundType === 'none') return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const now = ctx.currentTime;
        const tone = (f, s, d, t='sine', v=0.2) => {
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.type = t; o.frequency.setValueAtTime(f, s);
            g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(v, s + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, s + d);
            o.connect(g); g.connect(ctx.destination); o.start(s); o.stop(s + d);
        };
        if (soundType === 'chime') { tone(523, now, 0.8); tone(659, now+0.2, 0.8); }
        else if (soundType === 'warning') { tone(440, now, 0.4); tone(349, now+0.2, 0.4); }
        else if (soundType === 'radar') { for(let i=0; i<3; i++) tone(1200, now+(i*0.15), 0.1); }
        else if (soundType === 'success') { tone(523, now, 0.1); tone(659, now+0.1, 0.1); tone(783, now+0.2, 0.1); tone(1046, now+0.3, 0.3); }
        else if (soundType === 'siren') {
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.type = 'sawtooth'; o.frequency.setValueAtTime(400, now);
            o.frequency.linearRampToValueAtTime(800, now+0.3); o.frequency.linearRampToValueAtTime(400, now+0.6);
            g.gain.setValueAtTime(0.1, now); g.gain.linearRampToValueAtTime(0, now+0.6);
            o.connect(g); g.connect(ctx.destination); o.start(); o.stop(now+0.6);
        }
    } catch(e) {}
}

[inputs.s0.sound, inputs.s1.sound, inputs.s2.sound, inputs.s3.sound].forEach(s => {
    s.addEventListener('change', (e) => playSoundPreview(e.target.value));
});

api.storage.local.get(['userConfig'], (r) => {
    if (r.userConfig) {
        const c = r.userConfig;
        inputs.limit.value = c.dailyLimitSeconds / 60;
        inputs.s0.icon.value = c.stages[0].icon; inputs.s0.color.value = c.stages[0].color; inputs.s0.sound.value = c.stages[0].sound;
        inputs.s1.time.value = c.stages[1].threshold / 60; inputs.s1.icon.value = c.stages[1].icon; inputs.s1.color.value = c.stages[1].color; inputs.s1.sound.value = c.stages[1].sound;
        inputs.s2.time.value = c.stages[2].threshold / 60; inputs.s2.icon.value = c.stages[2].icon; inputs.s2.color.value = c.stages[2].color; inputs.s2.sound.value = c.stages[2].sound;
        inputs.s3.icon.value = c.stages[3].icon; inputs.s3.color.value = c.stages[3].color; inputs.s3.sound.value = c.stages[3].sound;
    }
});

getEl('saveBtn').addEventListener('click', () => {
    const lim = parseInt(inputs.limit.value) * 60;
    const config = {
        dailyLimitSeconds: lim,
        stages: [
            { threshold: 0, icon: inputs.s0.icon.value, color: inputs.s0.color.value, sound: inputs.s0.sound.value },
            { threshold: parseInt(inputs.s1.time.value)*60, icon: inputs.s1.icon.value, color: inputs.s1.color.value, sound: inputs.s1.sound.value },
            { threshold: parseInt(inputs.s2.time.value)*60, icon: inputs.s2.icon.value, color: inputs.s2.color.value, sound: inputs.s2.sound.value },
            { threshold: lim, icon: inputs.s3.icon.value, color: inputs.s3.color.value, sound: inputs.s3.sound.value }
        ]
    };
    api.storage.local.set({ userConfig: config }, () => {
        const m = getEl('statusMsg'); m.style.display='block'; setTimeout(()=>m.style.display='none', 2000);
    });
});