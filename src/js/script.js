const CV = document.getElementById("c");
const G = CV.getContext("2d");
const W = 760,
    H = 520;
// Render at native device pixel density so the board stays crisp even
// when scaled up to fill large desktop/tablet screens. All game logic
// still works in logical 760x520 units — only the backing store and a
// single G.scale() call below are affected.
const DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
CV.width = W * DPR;
CV.height = H * DPR;
G.scale(DPR, DPR);

// ── DOM refs ──
const startScreenEl = document.getElementById("start-screen");
const modeSelectEl = document.getElementById("mode-select");
const difficultySelectEl = document.getElementById("difficulty-select");
const pvpInfoEl = document.getElementById("pvp-info");
const pauseScreenEl = document.getElementById("pause-screen");
const gameoverEl = document.getElementById("gameover-screen");
const goWho = document.getElementById("go-who");
const goFinal = document.getElementById("go-final");
const goWinsEl = document.getElementById("go-wins");
const nameLeftEl = document.getElementById("name-left");
const nameRightEl = document.getElementById("name-right");
const footerLeftEl = document.getElementById("footer-left");
const footerRightEl = document.getElementById("footer-right");

const DOM = {
    scoreP: document.getElementById("score-p"),
    scoreCPU: document.getElementById("score-cpu"),
    pStreak: document.getElementById("stat-p-streak"),
    pSpeed: document.getElementById("stat-p-speed"),
    pPower: document.getElementById("stat-p-power"),
    cpuStreak: document.getElementById("stat-cpu-streak"),
    cpuSpeed: document.getElementById("stat-cpu-speed"),
    cpuPower: document.getElementById("stat-cpu-power")
};

// ── Audio Engine ──
let audioCtx = null;
let muted = true;
function getAudio() {
    if (!audioCtx)
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
}
function mkNoise(ctx, dur) {
    const b = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource();
    s.buffer = b;
    return s;
}
function playSound(type, speed = 1) {
    if (muted) return;
    const ctx = getAudio();
    const t = ctx.currentTime;
    const out = ctx.destination;
    if (type === "hit") {
        const n = mkNoise(ctx, 0.07);
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 900 + speed * 180 + Math.random() * 400;
        bp.Q.value = 2 + Math.random() * 3;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.5 + Math.min(speed / 18, 0.35), t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        n.connect(bp);
        bp.connect(g);
        g.connect(out);
        n.start(t);
        n.stop(t + 0.07);
    }
    if (type === "wall") {
        const n = mkNoise(ctx, 0.04);
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 1400 + Math.random() * 600;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.28, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        n.connect(hp);
        hp.connect(g);
        g.connect(out);
        n.start(t);
        n.stop(t + 0.04);
    }
    if (type === "goal") {
        const sub = ctx.createOscillator(),
            sg = ctx.createGain();
        sub.type = "sine";
        sub.frequency.setValueAtTime(60, t);
        sub.frequency.exponentialRampToValueAtTime(28, t + 0.25);
        sg.gain.setValueAtTime(0.6, t);
        sg.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        sub.connect(sg);
        sg.connect(out);
        sub.start(t);
        sub.stop(t + 0.3);
        [
            [0, "sawtooth", 233],
            [0.01, "sawtooth", 220],
            [0.02, "sawtooth", 246]
        ].forEach(([dt, wv, f]) => {
            const o = ctx.createOscillator(),
                g = ctx.createGain();
            o.type = wv;
            o.frequency.value = f;
            g.gain.setValueAtTime(0.15, t + dt);
            g.gain.setValueAtTime(0.15, t + 0.5);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
            o.connect(g);
            g.connect(out);
            o.start(t + dt);
            o.stop(t + 0.71);
        });
    }
    if (type === "victory") {
        [
            [0, 392, 0.12],
            [0.13, 392, 0.12],
            [0.26, 392, 0.12],
            [0.39, 523, 0.45],
            [0.58, 494, 0.18],
            [0.77, 440, 0.18],
            [0.96, 523, 0.6]
        ].forEach(([dt, f, dur]) => {
            [-4, 0, 4].forEach((cents) => {
                const o = ctx.createOscillator(),
                    g = ctx.createGain();
                o.type = "sawtooth";
                o.frequency.value = f * Math.pow(2, cents / 1200);
                const lp = ctx.createBiquadFilter();
                lp.type = "lowpass";
                lp.frequency.value = 1800;
                g.gain.setValueAtTime(0, t + dt);
                g.gain.linearRampToValueAtTime(0.08, t + dt + 0.02);
                g.gain.setValueAtTime(0.08, t + dt + dur - 0.03);
                g.gain.exponentialRampToValueAtTime(0.001, t + dt + dur);
                o.connect(lp);
                lp.connect(g);
                g.connect(out);
                o.start(t + dt);
                o.stop(t + dt + dur + 0.01);
            });
        });
    }
    if (type === "speedup") {
        const n = mkNoise(ctx, 0.4);
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.Q.value = 5;
        bp.frequency.setValueAtTime(300, t);
        bp.frequency.exponentialRampToValueAtTime(3000, t + 0.38);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
        n.connect(bp);
        bp.connect(g);
        g.connect(out);
        n.start(t);
        n.stop(t + 0.4);
    }
    if (type === "slomo_in") {
        const o = ctx.createOscillator(),
            g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(100, t);
        o.frequency.exponentialRampToValueAtTime(36, t + 0.65);
        g.gain.setValueAtTime(0.2, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
        o.connect(g);
        g.connect(out);
        o.start(t);
        o.stop(t + 0.7);
    }
    if (type === "click") {
        const o = ctx.createOscillator(),
            g = ctx.createGain();
        o.type = "square";
        o.frequency.setValueAtTime(520, t);
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        o.connect(g);
        g.connect(out);
        o.start(t);
        o.stop(t + 0.08);
    }
}

// ── Mute button ──
const muteBtn = document.getElementById("mute-btn");
function updateMuteIcon() {
    muteBtn.classList.toggle("is-muted", muted);
    muteBtn.innerHTML = muted
        ? '<i class="fa-solid fa-volume-xmark"></i>'
        : '<i class="fa-solid fa-volume-high"></i>';
    muteBtn.setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound");
}
updateMuteIcon();
function toggleMute() {
    muted = !muted;
    if (!muted) getAudio().resume();
    updateMuteIcon();
}
muteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMute();
});

// ── Pause button ──
const pauseBtn = document.getElementById("pause-btn");
let paused = false;
function setPaused(v) {
    if (state !== "play" && state !== "goal") return;
    paused = v;
    pauseScreenEl.classList.toggle("on", paused);
    pauseBtn.innerHTML = paused
        ? '<i class="fa-solid fa-play"></i>'
        : '<i class="fa-solid fa-pause"></i>';
}
pauseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    setPaused(!paused);
});
document.getElementById("btn-resume").onclick = () => setPaused(false);
document.getElementById("btn-quit-to-menu").onclick = () => goToMainMenu();

// ── Confetti ──
const confetti = [];
const CONF_COLORS = [
    "#00d4ff",
    "#ff2d55",
    "#ffc940",
    "#ffffff",
    "#a855f7",
    "#22c55e",
    "#fb923c"
];
function spawnConfetti() {
    for (let i = 0; i < 160; i++) {
        confetti.push({
            x: Math.random() * W,
            y: -10 - Math.random() * 120,
            vx: (Math.random() - 0.5) * 5,
            vy: 2 + Math.random() * 4,
            rot: Math.random() * Math.PI * 2,
            rotV: (Math.random() - 0.5) * 0.22,
            w: 6 + Math.random() * 8,
            h: 3 + Math.random() * 4,
            col: CONF_COLORS[Math.floor(Math.random() * CONF_COLORS.length)],
            life: 1
        });
    }
}
function updateConfetti() {
    for (let i = confetti.length - 1; i >= 0; i--) {
        const c = confetti[i];
        c.x += c.vx;
        c.y += c.vy;
        c.vy += 0.08;
        c.vx *= 0.99;
        c.rot += c.rotV;
        if (c.y > H + 20) c.life -= 0.05;
        if (c.life <= 0) confetti.splice(i, 1);
    }
}
function drawConfetti() {
    confetti.forEach((c) => {
        G.save();
        G.globalAlpha = c.life;
        G.translate(c.x, c.y);
        G.rotate(c.rot);
        G.fillStyle = c.col;
        G.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        G.restore();
    });
}

// ── Slo-mo state ──
let sloMo = false;
let sloMoAlpha = 0;
let sloMoIntro = 0;
let confettiInterval = null;
let showSadFace = false;
let sloMoLabelTimer = 0;
const TABLE_X = 30,
    TABLE_Y = 30,
    TABLE_W = W - 60,
    TABLE_H = H - 60;
const CX = W / 2,
    CY = H / 2;
const GOAL_W = 160,
    GOAL_DEPTH = 20;
const GOAL_Y1 = CY - GOAL_W / 2,
    GOAL_Y2 = CY + GOAL_W / 2;
const PUCK_R = 14;
const MALLET_R = 24;
const MAX_SCORE = 7;
const FRICTION = 0.995;
const WALL_BOUNCE = 0.82;

// ── Game mode ──
// 'cpu' = single player vs AI, 'pvp' = local 2 player
let mode = "cpu";
let difficulty = "normal";

// CPU difficulty presets
const DIFFICULTIES = {
    easy: { speed: 3.5, react: 0.46, errorY: 42, mistakeChance: 0.045 },
    normal: { speed: 4.6, react: 0.62, errorY: 26, mistakeChance: 0.018 },
    hard: { speed: 5.7, react: 0.8, errorY: 12, mistakeChance: 0.006 }
};
let CPU_SPEED = DIFFICULTIES.normal.speed;
let CPU_REACT = DIFFICULTIES.normal.react;
let CPU_ERROR_Y = DIFFICULTIES.normal.errorY;
let CPU_MISTAKE_CHANCE = DIFFICULTIES.normal.mistakeChance;
const CPU_MISTAKE_DUR = 42;
function applyDifficulty(name) {
    const d = DIFFICULTIES[name] || DIFFICULTIES.normal;
    CPU_SPEED = d.speed;
    CPU_REACT = d.react;
    CPU_ERROR_Y = d.errorY;
    CPU_MISTAKE_CHANCE = d.mistakeChance;
    difficulty = name;
}

// Keyboard movement speed (px/frame at ts=1) for both players
const KEY_SPEED = 7.8;

// ── State ──
let state = "menu"; // 'menu' | 'play' | 'goal' | 'over'
let tick = 0;
let shakeX = 0,
    shakeY = 0,
    shakeAmt = 0;
let goalFlash = 0,
    goalWho = "";
let goalMsgScale = 0;
let puckSpeedMult = 1.0;
let lastSpeedUpAt = 0;
let speedUpMsg = "";
let speedUpTimer = 0;

// ── Match stats ──
const stats = {
    p: { goals: 0, streak: 0, bestStreak: 0, topSpeed: 0, powerHits: 0 },
    cpu: { goals: 0, streak: 0, bestStreak: 0, topSpeed: 0, powerHits: 0 },
    rallyHits: 0,
    totalHits: 0
};
function resetStats() {
    stats.p = { goals: 0, streak: 0, bestStreak: 0, topSpeed: 0, powerHits: 0 };
    stats.cpu = { goals: 0, streak: 0, bestStreak: 0, topSpeed: 0, powerHits: 0 };
    stats.rallyHits = 0;
    stats.totalHits = 0;
}

// ── Score ──
const score = { p: 0, cpu: 0 };

// ── Puck ──
const puck = { x: CX, y: CY, vx: 0, vy: 0, r: PUCK_R };
const trail = [];

// ── Mallets ──
const player = {
    x: TABLE_X + 130,
    y: CY,
    tx: TABLE_X + 130,
    ty: CY,
    r: MALLET_R,
    pvx: 0,
    pvy: 0
};
// `cpu` mallet is either AI-controlled (mode 'cpu') or human-controlled
// as Player 2 (mode 'pvp'). Fields vx/vy are used by the AI branch,
// pvx/pvy are used by the human-control branch.
const cpu = {
    x: W - TABLE_X - 130,
    y: CY,
    r: MALLET_R,
    vx: 0,
    vy: 0,
    pvx: 0,
    pvy: 0,
    mistakeTimer: 0,
    errorY: 0,
    hitCool: 0
};

// ── Particles ──
const particles = [];
function burst(x, y, col1, col2, n = 22) {
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2,
            s = 2 + Math.random() * 7;
        particles.push({
            x,
            y,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s,
            life: 1,
            col: Math.random() > 0.5 ? col1 : col2,
            size: 2 + Math.random() * 4,
            glow: Math.random() > 0.4,
            gravity: 0.08 + Math.random() * 0.12
        });
    }
}
function sparkLine(x1, y1, x2, y2, col, n = 8) {
    for (let i = 0; i < n; i++) {
        const t = Math.random();
        const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 10;
        const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 10;
        const a = Math.random() * Math.PI * 2,
            s = 1 + Math.random() * 3;
        particles.push({
            x,
            y,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s,
            life: 1,
            col,
            size: 1.5 + Math.random() * 2,
            glow: true,
            gravity: 0.1
        });
    }
}

// ── Input: Player 1 (left / blue) — mouse, touch-left, WASD ──
let rawMouseX = TABLE_X + 120,
    rawMouseY = H / 2;
let prevRawX = TABLE_X + 120,
    prevRawY = H / 2;
let mouseVX = 0,
    mouseVY = 0;

// ── Input: Player 2 (right / red) — arrow keys, touch-right (pvp only) ──
let raw2X = W - TABLE_X - 120,
    raw2Y = H / 2;
let prevRaw2X = W - TABLE_X - 120,
    prevRaw2Y = H / 2;
let mouseV2X = 0,
    mouseV2Y = 0;

function pointerToP1(clientX, clientY) {
    const r = CV.getBoundingClientRect();
    const scaleX = W / r.width,
        scaleY = H / r.height;
    const nx = (clientX - r.left) * scaleX;
    const ny = (clientY - r.top) * scaleY;
    rawMouseX = clamp(nx, TABLE_X + MALLET_R + 2, CX - 10);
    rawMouseY = clamp(
        ny,
        TABLE_Y + MALLET_R + 2,
        TABLE_Y + TABLE_H - MALLET_R - 2
    );
}
function pointerToP2(clientX, clientY) {
    const r = CV.getBoundingClientRect();
    const scaleX = W / r.width,
        scaleY = H / r.height;
    const nx = (clientX - r.left) * scaleX;
    const ny = (clientY - r.top) * scaleY;
    raw2X = clamp(nx, CX + 10, TABLE_X + TABLE_W - MALLET_R - 2);
    raw2Y = clamp(
        ny,
        TABLE_Y + MALLET_R + 2,
        TABLE_Y + TABLE_H - MALLET_R - 2
    );
}

// Mouse always drives Player 1, from anywhere on the page
document.addEventListener("mousemove", (e) => pointerToP1(e.clientX, e.clientY));

// Touch: each finger is assigned to a side (left/right of the canvas
// midline) at touchstart, and keeps controlling that side until lifted.
const touchAssign = {};
function handleTouchStart(e) {
    e.preventDefault();
    const r = CV.getBoundingClientRect();
    for (const t of e.changedTouches) {
        const side = t.clientX - r.left < r.width / 2 ? "p1" : "p2";
        touchAssign[t.identifier] = side;
        if (side === "p1") pointerToP1(t.clientX, t.clientY);
        else pointerToP2(t.clientX, t.clientY);
    }
}
function handleTouchMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
        const side = touchAssign[t.identifier];
        if (side === "p1") pointerToP1(t.clientX, t.clientY);
        else if (side === "p2") pointerToP2(t.clientX, t.clientY);
    }
}
function handleTouchEnd(e) {
    for (const t of e.changedTouches) delete touchAssign[t.identifier];
}
CV.addEventListener("touchstart", handleTouchStart, { passive: false });
CV.addEventListener("touchmove", handleTouchMove, { passive: false });
CV.addEventListener("touchend", handleTouchEnd, { passive: false });
CV.addEventListener("touchcancel", handleTouchEnd, { passive: false });

// Keyboard
const keyState = {};
const PREVENT_KEYS = new Set([
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Space",
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD"
]);
document.addEventListener("keydown", (e) => {
    keyState[e.code] = true;
    if (PREVENT_KEYS.has(e.code)) e.preventDefault();
    if (e.code === "Space" && state === "over") startGame();
    if (e.code === "Escape") setPaused(!paused);
});
document.addEventListener("keyup", (e) => {
    keyState[e.code] = false;
});

const WASD_KEYS = { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD" };
const ARROW_KEYS = {
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight"
};

function applyKeyboardMovement(m, keys, speed, minX, maxX, minY, maxY, ts) {
    let dx = 0,
        dy = 0;
    if (keyState[keys.up]) dy -= 1;
    if (keyState[keys.down]) dy += 1;
    if (keyState[keys.left]) dx -= 1;
    if (keyState[keys.right]) dx += 1;
    if (dx === 0 && dy === 0) return false;
    const len = Math.hypot(dx, dy) || 1;
    const stepX = (dx / len) * speed * ts;
    const stepY = (dy / len) * speed * ts;
    const prevX = m.x,
        prevY = m.y;
    m.x = clamp(m.x + stepX, minX, maxX);
    m.y = clamp(m.y + stepY, minY, maxY);
    m.pvx = m.x - prevX;
    m.pvy = m.y - prevY;
    return true;
}

// ── Menu / navigation flow ──
function showMenuStep(step) {
    [modeSelectEl, difficultySelectEl, pvpInfoEl].forEach((el) =>
        el.classList.remove("on")
    );
    step.classList.add("on");
}
document.getElementById("btn-mode-cpu").onclick = () => {
    playSound("click");
    showMenuStep(difficultySelectEl);
};
document.getElementById("btn-mode-pvp").onclick = () => {
    playSound("click");
    showMenuStep(pvpInfoEl);
};
document.getElementById("btn-back-cpu").onclick = () => {
    playSound("click");
    showMenuStep(modeSelectEl);
};
document.getElementById("btn-back-pvp").onclick = () => {
    playSound("click");
    showMenuStep(modeSelectEl);
};
document.querySelectorAll(".diff-btn").forEach((btn) => {
    btn.onclick = () => {
        playSound("click");
        applyDifficulty(btn.dataset.difficulty);
        beginMatch("cpu");
    };
});
document.getElementById("btn-pvp-start").onclick = () => {
    playSound("click");
    beginMatch("pvp");
};
document.getElementById("btn-again").onclick = () => {
    playSound("click");
    startGame();
};
document.getElementById("btn-main-menu").onclick = () => {
    playSound("click");
    goToMainMenu();
};

function beginMatch(m) {
    mode = m;
    nameLeftEl.textContent = mode === "cpu" ? "YOU" : "PLAYER 1";
    nameRightEl.textContent = mode === "cpu" ? "CPU" : "PLAYER 2";
    footerLeftEl.textContent = `FIRST TO ${MAX_SCORE} WINS`;
    footerRightEl.textContent = `FIRST TO ${MAX_SCORE} WINS`;
    startScreenEl.classList.remove("on");
    startGame();
}

function goToMainMenu() {
    state = "menu";
    paused = false;
    pauseScreenEl.classList.remove("on");
    gameoverEl.classList.remove("on", "lose-state");
    showMenuStep(modeSelectEl);
    startScreenEl.classList.add("on");
    if (confettiInterval) {
        clearInterval(confettiInterval);
        confettiInterval = null;
    }
    confetti.length = 0;
}

// ── Game flow ──
function startGame() {
    score.p = 0;
    score.cpu = 0;
    resetStats();
    puckSpeedMult = 1.0;
    lastSpeedUpAt = 0;
    speedUpMsg = "";
    speedUpTimer = 0;
    sloMo = false;
    sloMoAlpha = 0;
    sloMoIntro = 0;
    sloMoLabelTimer = 0;
    confetti.length = 0;
    if (confettiInterval) {
        clearInterval(confettiInterval);
        confettiInterval = null;
    }
    showSadFace = false;
    paused = false;
    pauseScreenEl.classList.remove("on");
    pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    resetRound("p");
    state = "play";
    startScreenEl.classList.remove("on");
    gameoverEl.classList.remove("on", "lose-state");
    particles.length = 0;
    updateStatDOM();
}

function resetRound(server) {
    trail.length = 0;
    puck.x = CX;
    puck.y = CY;
    puck.vx = 0;
    puck.vy = 0;
    player.x = TABLE_X + 120;
    player.y = CY;
    player.pvx = 0;
    player.pvy = 0;
    rawMouseX = player.x;
    rawMouseY = player.y;
    prevRawX = player.x;
    prevRawY = player.y;
    cpu.x = W - TABLE_X - 120;
    cpu.y = CY;
    cpu.vx = 0;
    cpu.vy = 0;
    cpu.pvx = 0;
    cpu.pvy = 0;
    cpu.mistakeTimer = 0;
    raw2X = cpu.x;
    raw2Y = cpu.y;
    prevRaw2X = cpu.x;
    prevRaw2Y = cpu.y;
    stats.rallyHits = 0;
    if (server === "p") {
        puck.vx = -(3.5 + Math.random() * 1.5) * puckSpeedMult;
        puck.vy = (Math.random() - 0.5) * 3.5 * puckSpeedMult;
    } else {
        puck.vx = (3.5 + Math.random() * 1.5) * puckSpeedMult;
        puck.vy = (Math.random() - 0.5) * 3.5 * puckSpeedMult;
    }
}

function goalScored(who) {
    if (state !== "play") return;
    state = "goal";
    goalWho = who;
    goalFlash = 160;
    goalMsgScale = 0;

    const ws = stats[who],
        ls = stats[who === "p" ? "cpu" : "p"];
    ws.goals++;
    ws.streak++;
    ws.bestStreak = Math.max(ws.bestStreak, ws.streak);
    ls.streak = 0;

    score[who]++;
    const totalGoals = score.p + score.cpu;
    if (totalGoals % 2 === 0 && totalGoals > lastSpeedUpAt) {
        lastSpeedUpAt = totalGoals;
        puckSpeedMult = Math.min(puckSpeedMult + 0.14, 2.0);
        const msgs = [
            "SPEEDING UP!",
            "FASTER!!",
            "KICK IT UP!",
            "NO MERCY!",
            "LIGHT SPEED!",
            "HOLD ON!!"
        ];
        speedUpMsg = msgs[Math.min(Math.floor(totalGoals / 2 - 1), msgs.length - 1)];
        speedUpTimer = 130;
    }
    if (who === "p") burst(TABLE_X, CY, "#00d4ff", "#ffffff", 40);
    else burst(W - TABLE_X, CY, "#ff2d55", "#ffffff", 40);
    burst(puck.x, puck.y, "#ffc940", "#ffffff", 30);
    shake(8);

    updateStatDOM();

    const newP = score.p,
        newCPU = score.cpu;
    if ((newP === MAX_SCORE - 1 || newCPU === MAX_SCORE - 1) && !sloMo) {
        sloMo = true;
        sloMoIntro = 80;
        sloMoLabelTimer = 80 + 90;
    }

    setTimeout(() => {
        if (score.p >= MAX_SCORE || score.cpu >= MAX_SCORE) {
            state = "over";
            const pWon = score.p >= MAX_SCORE;

            if (mode === "cpu") {
                goWho.textContent = pWon ? "YOU WIN" : "CPU WINS";
                goWho.style.color = pWon ? "#00d4ff" : "#ff2d55";
                goWho.style.textShadow = pWon
                    ? "0 0 30px #00d4ff, 0 0 60px rgba(0,212,255,0.4)"
                    : "0 0 30px #ff2d55, 0 0 60px rgba(255,45,85,0.4)";
                goWinsEl.textContent = pWon
                    ? "GAME · SET · MATCH"
                    : "BETTER LUCK NEXT TIME";
                document.getElementById("go-face").textContent = pWon ? "😄" : "😢";
                gameoverEl.classList.remove("lose-state");
                if (!pWon) gameoverEl.classList.add("lose-state");
                if (pWon) {
                    playSound("victory");
                    spawnConfetti();
                    setTimeout(spawnConfetti, 400);
                    setTimeout(spawnConfetti, 800);
                    setTimeout(spawnConfetti, 1400);
                    confettiInterval = setInterval(spawnConfetti, 1400);
                }
            } else {
                // Local 2-player: celebrate whichever side won, no "lose" framing
                goWho.textContent = pWon ? "PLAYER 1 WINS" : "PLAYER 2 WINS";
                goWho.style.color = pWon ? "#00d4ff" : "#ff2d55";
                goWho.style.textShadow = pWon
                    ? "0 0 30px #00d4ff, 0 0 60px rgba(0,212,255,0.4)"
                    : "0 0 30px #ff2d55, 0 0 60px rgba(255,45,85,0.4)";
                goWinsEl.textContent = "GAME · SET · MATCH";
                document.getElementById("go-face").textContent = "😄";
                gameoverEl.classList.remove("lose-state");
                playSound("victory");
                spawnConfetti();
                setTimeout(spawnConfetti, 400);
                setTimeout(spawnConfetti, 800);
                setTimeout(spawnConfetti, 1400);
                confettiInterval = setInterval(spawnConfetti, 1400);
            }

            goFinal.textContent = `${score.p} – ${score.cpu}`;
            burst(CX, CY, "#ffc940", "#ffffff", 80);
            gameoverEl.classList.add("on");
        } else {
            resetRound(who === "p" ? "cpu" : "p");
            state = "play";
        }
    }, 1500);
}

function shake(amt) {
    shakeAmt = Math.max(shakeAmt, amt);
}

// ── Update stat DOM ──
function updateStatDOM() {
    DOM.scoreP.textContent = score.p;
    DOM.scoreCPU.textContent = score.cpu;
    DOM.pStreak.textContent = stats.p.bestStreak;
    DOM.pSpeed.textContent = stats.p.topSpeed;
    DOM.pPower.textContent = stats.p.powerHits;
    DOM.cpuStreak.textContent = stats.cpu.bestStreak;
    DOM.cpuSpeed.textContent = stats.cpu.topSpeed;
    DOM.cpuPower.textContent = stats.cpu.powerHits;
}

// ── CPU AI ──
function updateCPU(ts = 1) {
    const halfW = W / 2;
    const homeX = W - TABLE_X - 110;
    const minX = halfW + 10,
        maxX = W - TABLE_X - cpu.r - 2;
    const minY = TABLE_Y + cpu.r + 2,
        maxY = TABLE_Y + TABLE_H - cpu.r - 2;

    if (
        Math.random() < CPU_MISTAKE_CHANCE &&
        cpu.mistakeTimer === 0 &&
        puck.vx > 0
    ) {
        cpu.mistakeTimer = CPU_MISTAKE_DUR;
        cpu.errorY = (Math.random() - 0.5) * CPU_ERROR_Y * 2;
    }
    if (cpu.mistakeTimer > 0) cpu.mistakeTimer--;
    if (cpu.hitCool > 0) cpu.hitCool--;

    const err = cpu.mistakeTimer > 0 ? cpu.errorY : 0;
    const puckOnMySide = puck.x > halfW;
    const puckHeadingToMe = puck.vx > 0;

    const nearTopWall = cpu.y < minY + 20;
    const nearBottomWall = cpu.y > maxY - 20;
    const nearSideWall = cpu.x > maxX - 20;
    const cornered = (nearTopWall || nearBottomWall) && nearSideWall;
    const farFromHome = Math.hypot(cpu.x - homeX, cpu.y - CY) > 150;

    let tx, ty;

    if (cornered || (farFromHome && !puckHeadingToMe)) {
        tx = homeX;
        ty = CY;
    } else if (puckOnMySide && puckHeadingToMe) {
        const frames = Math.max(
            1,
            Math.min((cpu.x - puck.x) / Math.max(0.5, puck.vx), 60)
        );
        tx = clamp(puck.x + puck.vx * frames * CPU_REACT, minX, maxX);
        ty = clamp(puck.y + puck.vy * frames * CPU_REACT + err, minY, maxY);
    } else if (puckOnMySide) {
        tx = clamp(puck.x - 8, minX, maxX - 30);
        ty = clamp(puck.y + err, minY, maxY);
    } else {
        tx = homeX;
        ty = clamp(puck.y * 0.5 + CY * 0.5 + err * 0.3, minY, maxY);
    }

    const prevX = cpu.x,
        prevY = cpu.y;
    const dx = tx - cpu.x,
        dy = ty - cpu.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.1) {
        const step = Math.min(dist, CPU_SPEED * ts);
        cpu.x += (dx / dist) * step;
        cpu.y += (dy / dist) * step;
    }
    cpu.x = clamp(cpu.x, minX, maxX);
    cpu.y = clamp(cpu.y, minY, maxY);
    cpu.vx = cpu.x - prevX;
    cpu.vy = cpu.y - prevY;
}

// ── Physics ──
function updatePuck() {
    if (state !== "play") return;

    const spd = Math.hypot(puck.vx, puck.vy);
    trail.push({ x: puck.x, y: puck.y, spd });
    if (trail.length > 18) trail.shift();

    if (spd < 0.8) {
        puck.vx += (Math.random() - 0.5) * 0.18;
        puck.vy += (Math.random() - 0.5) * 0.18;
    } else if (spd < 2.5) {
        puck.vx += (Math.random() - 0.5) * 0.06;
        puck.vy += (Math.random() - 0.5) * 0.06;
    }

    puck.x += puck.vx;
    puck.y += puck.vy;
    puck.vx *= FRICTION;
    puck.vy *= FRICTION;

    const tx = TABLE_X,
        ty = TABLE_Y,
        tw = TABLE_W,
        th = TABLE_H;

    if (puck.y - puck.r < ty) {
        puck.y = ty + puck.r;
        puck.vy = Math.abs(puck.vy) * WALL_BOUNCE;
        sparkLine(puck.x - 20, ty, puck.x + 20, ty, "#00d4ff");
    }
    if (puck.y + puck.r > ty + th) {
        puck.y = ty + th - puck.r;
        puck.vy = -Math.abs(puck.vy) * WALL_BOUNCE;
        sparkLine(puck.x - 20, ty + th, puck.x + 20, ty + th, "#00d4ff");
    }
    if (puck.x - puck.r < tx) {
        if (puck.y > GOAL_Y1 && puck.y < GOAL_Y2) {
            goalScored("cpu");
            return;
        }
        puck.x = tx + puck.r;
        puck.vx = Math.abs(puck.vx) * WALL_BOUNCE;
        sparkLine(tx, puck.y - 20, tx, puck.y + 20, "#ff2d55");
    }
    if (puck.x + puck.r > tx + tw) {
        if (puck.y > GOAL_Y1 && puck.y < GOAL_Y2) {
            goalScored("p");
            return;
        }
        puck.x = tx + tw - puck.r;
        puck.vx = -Math.abs(puck.vx) * WALL_BOUNCE;
        sparkLine(tx + tw, puck.y - 20, tx + tw, puck.y + 20, "#ff2d55");
    }

    circleMalletCollide(puck, player, "p", true);
    circleMalletCollide(puck, cpu, "cpu", mode === "pvp");
}

function circleMalletCollide(pk, mallet, sideKey, isHuman) {
    const dx = pk.x - mallet.x,
        dy = pk.y - mallet.y;
    const dist = Math.hypot(dx, dy);
    const minDist = pk.r + mallet.r;
    if (dist >= minDist || dist < 0.01) return;

    // AI hit cooldown — prevents corner spam loop (human mallets skip this)
    if (sideKey === "cpu" && !isHuman && cpu.hitCool > 0) {
        const nx2 = dx / dist,
            ny2 = dy / dist;
        pk.x += nx2 * (minDist - dist);
        pk.y += ny2 * (minDist - dist);
        return;
    }

    const nx = dx / dist,
        ny = dy / dist;
    pk.x += nx * (minDist - dist);
    pk.y += ny * (minDist - dist);

    const mvx = isHuman ? mallet.pvx * 1.8 : mallet.vx;
    const mvy = isHuman ? mallet.pvy * 1.8 : mallet.vy;

    const relVX = pk.vx - mvx;
    const relVY = pk.vy - mvy;
    const dot = relVX * nx + relVY * ny;
    if (dot >= 0) return;

    const restitution = isHuman ? 1.3 : 1.1;
    const impulse = -(1 + restitution) * dot;
    pk.vx += impulse * nx;
    pk.vy += impulse * ny;

    const spd = Math.hypot(pk.vx, pk.vy);
    const cap = (isHuman ? 20 : 16) * puckSpeedMult;
    if (spd > cap) {
        pk.vx = (pk.vx / spd) * cap;
        pk.vy = (pk.vy / spd) * cap;
    }

    if (sideKey === "cpu" && !isHuman) cpu.hitCool = 20;

    stats.rallyHits++;
    const mphSpd = Math.round(spd * 4);
    if (mphSpd > stats[sideKey].topSpeed) stats[sideKey].topSpeed = mphSpd;
    if (spd > 14) stats[sideKey].powerHits++;
    updateStatDOM();

    if (spd > 3) {
        const col = sideKey === "p" ? "#00d4ff" : "#ff2d55";
        burst(pk.x, pk.y, col, "#ffffff", Math.floor(spd * 1.5));
        if (spd > 19) shake(Math.min((spd - 19) * 0.4, 3));
        playSound("hit", spd);
    }
}

function updatePlayer(ts = 1) {
    const bMinX = TABLE_X + MALLET_R + 2,
        bMaxX = CX - 10,
        bMinY = TABLE_Y + MALLET_R + 2,
        bMaxY = TABLE_Y + TABLE_H - MALLET_R - 2;

    const movedByKeyboard = applyKeyboardMovement(
        player,
        WASD_KEYS,
        KEY_SPEED,
        bMinX,
        bMaxX,
        bMinY,
        bMaxY,
        ts
    );

    if (movedByKeyboard) {
        rawMouseX = player.x;
        rawMouseY = player.y;
        prevRawX = rawMouseX;
        prevRawY = rawMouseY;
        mouseVX = player.pvx;
        mouseVY = player.pvy;
        return;
    }

    const dx = rawMouseX - prevRawX;
    const dy = rawMouseY - prevRawY;
    mouseVX = mouseVX * 0.4 + dx * 0.6;
    mouseVY = mouseVY * 0.4 + dy * 0.6;
    prevRawX = rawMouseX;
    prevRawY = rawMouseY;

    if (ts === 1) {
        player.x = rawMouseX;
        player.y = rawMouseY;
    } else {
        player.x += (rawMouseX - player.x) * ts * 3;
        player.y += (rawMouseY - player.y) * ts * 3;
        player.x = clamp(player.x, bMinX, bMaxX);
        player.y = clamp(player.y, bMinY, bMaxY);
    }

    player.pvx = mouseVX * ts;
    player.pvy = mouseVY * ts;
}

// ── Right mallet: AI (cpu mode) or human Player 2 (pvp mode) ──
function updateRightMallet(ts = 1) {
    if (mode !== "pvp") {
        updateCPU(ts);
        return;
    }

    const bMinX = CX + 10,
        bMaxX = W - TABLE_X - cpu.r - 2,
        bMinY = TABLE_Y + cpu.r + 2,
        bMaxY = TABLE_Y + TABLE_H - cpu.r - 2;

    const movedByKeyboard = applyKeyboardMovement(
        cpu,
        ARROW_KEYS,
        KEY_SPEED,
        bMinX,
        bMaxX,
        bMinY,
        bMaxY,
        ts
    );

    if (movedByKeyboard) {
        raw2X = cpu.x;
        raw2Y = cpu.y;
        prevRaw2X = raw2X;
        prevRaw2Y = raw2Y;
        mouseV2X = cpu.pvx;
        mouseV2Y = cpu.pvy;
        return;
    }

    const dx = raw2X - prevRaw2X;
    const dy = raw2Y - prevRaw2Y;
    mouseV2X = mouseV2X * 0.4 + dx * 0.6;
    mouseV2Y = mouseV2Y * 0.4 + dy * 0.6;
    prevRaw2X = raw2X;
    prevRaw2Y = raw2Y;

    if (ts === 1) {
        cpu.x = raw2X;
        cpu.y = raw2Y;
    } else {
        cpu.x += (raw2X - cpu.x) * ts * 3;
        cpu.y += (raw2Y - cpu.y) * ts * 3;
        cpu.x = clamp(cpu.x, bMinX, bMaxX);
        cpu.y = clamp(cpu.y, bMinY, bMaxY);
    }

    cpu.pvx = mouseV2X * ts;
    cpu.pvy = mouseV2Y * ts;
}

// ══════════════════════════════════════
//  RENDERING
// ══════════════════════════════════════

function grd(x, y, r0, r1, c0, c1) {
    const g = G.createRadialGradient(x, y, r0, x, y, r1);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    return g;
}
function lgrad(x0, y0, x1, y1, stops) {
    const g = G.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([t, c]) => g.addColorStop(t, c));
    return g;
}

function drawTable() {
    const tx = TABLE_X,
        ty = TABLE_Y,
        tw = TABLE_W,
        th = TABLE_H;

    G.save();
    G.shadowColor = "rgba(0,180,255,0.2)";
    G.shadowBlur = 28;
    G.strokeStyle = "rgba(0,180,255,0.25)";
    G.lineWidth = 3;
    G.beginPath();
    G.roundRect(tx - 4, ty - 4, tw + 8, th + 8, 14);
    G.stroke();
    G.restore();

    G.fillStyle = lgrad(tx, ty, tx, ty + th, [
        [0, "#0a1a2e"],
        [0.5, "#071422"],
        [1, "#0a1a2e"]
    ]);
    G.beginPath();
    G.roundRect(tx, ty, tw, th, 10);
    G.fill();

    G.save();
    G.globalAlpha = 0.055;
    G.fillStyle = "#4af";
    for (let gx = tx + 18; gx < tx + tw - 10; gx += 18)
        for (let gy = ty + 18; gy < ty + th - 10; gy += 18) {
            G.beginPath();
            G.arc(gx, gy, 1.8, 0, Math.PI * 2);
            G.fill();
        }
    G.restore();

    G.save();
    G.strokeStyle = "rgba(0,212,255,0.16)";
    G.lineWidth = 2;
    G.setLineDash([6, 6]);
    G.beginPath();
    G.arc(CX, CY, 60, 0, Math.PI * 2);
    G.stroke();
    G.setLineDash([]);
    G.restore();

    G.save();
    G.strokeStyle = "rgba(0,212,255,0.12)";
    G.lineWidth = 2;
    G.setLineDash([8, 8]);
    G.beginPath();
    G.moveTo(CX, ty + 2);
    G.lineTo(CX, ty + th - 2);
    G.stroke();
    G.setLineDash([]);
    G.restore();

    G.save();
    G.shadowColor = "rgba(0,212,255,0.5)";
    G.shadowBlur = 8;
    G.fillStyle = "rgba(0,212,255,0.4)";
    G.beginPath();
    G.arc(CX, CY, 5, 0, Math.PI * 2);
    G.fill();
    G.restore();

    const rt = lgrad(0, ty, 0, ty + 12, [
        [0, "#1a4a6e"],
        [0.6, "#0e2a40"],
        [1, "#0a1a2e"]
    ]);
    G.fillStyle = rt;
    G.fillRect(tx, ty, tw, 8);
    const rb = lgrad(0, ty + th - 8, 0, ty + th, [
        [0, "#0a1a2e"],
        [0.4, "#0e2a40"],
        [1, "#1a4a6e"]
    ]);
    G.fillStyle = rb;
    G.fillRect(tx, ty + th - 8, tw, 8);

    G.save();
    G.shadowColor = "#00d4ff";
    G.shadowBlur = 10;
    G.strokeStyle = "rgba(0,212,255,0.7)";
    G.lineWidth = 2;
    G.beginPath();
    G.moveTo(tx + 2, ty + 2);
    G.lineTo(tx + tw - 2, ty + 2);
    G.stroke();
    G.beginPath();
    G.moveTo(tx + 2, ty + th - 2);
    G.lineTo(tx + tw - 2, ty + th - 2);
    G.stroke();
    G.restore();

    G.save();
    G.shadowColor = "#00d4ff";
    G.shadowBlur = 14;
    G.strokeStyle = "rgba(0,212,255,0.7)";
    G.lineWidth = 2.5;
    G.beginPath();
    G.moveTo(tx, GOAL_Y1);
    G.lineTo(tx - GOAL_DEPTH, GOAL_Y1);
    G.stroke();
    G.beginPath();
    G.moveTo(tx, GOAL_Y2);
    G.lineTo(tx - GOAL_DEPTH, GOAL_Y2);
    G.stroke();
    G.strokeStyle = "rgba(0,212,255,0.3)";
    G.lineWidth = 1.5;
    G.beginPath();
    G.moveTo(tx - GOAL_DEPTH, GOAL_Y1);
    G.lineTo(tx - GOAL_DEPTH, GOAL_Y2);
    G.stroke();
    G.restore();

    G.save();
    G.shadowColor = "#ff2d55";
    G.shadowBlur = 14;
    G.strokeStyle = "rgba(255,45,85,0.7)";
    G.lineWidth = 2.5;
    G.beginPath();
    G.moveTo(tx + tw, GOAL_Y1);
    G.lineTo(tx + tw + GOAL_DEPTH, GOAL_Y1);
    G.stroke();
    G.beginPath();
    G.moveTo(tx + tw, GOAL_Y2);
    G.lineTo(tx + tw + GOAL_DEPTH, GOAL_Y2);
    G.stroke();
    G.strokeStyle = "rgba(255,45,85,0.3)";
    G.lineWidth = 1.5;
    G.beginPath();
    G.moveTo(tx + tw + GOAL_DEPTH, GOAL_Y1);
    G.lineTo(tx + tw + GOAL_DEPTH, GOAL_Y2);
    G.stroke();
    G.restore();

    [GOAL_Y1, GOAL_Y2].forEach((gy) => {
        G.save();
        G.shadowColor = "#00d4ff";
        G.shadowBlur = 12;
        G.fillStyle = "#00d4ff";
        G.beginPath();
        G.arc(tx, gy, 5, 0, Math.PI * 2);
        G.fill();
        G.restore();
        G.save();
        G.shadowColor = "#ff2d55";
        G.shadowBlur = 12;
        G.fillStyle = "#ff2d55";
        G.beginPath();
        G.arc(tx + tw, gy, 5, 0, Math.PI * 2);
        G.fill();
        G.restore();
    });
}

function drawPuck() {
    trail.forEach((t, i) => {
        const prog = i / trail.length;
        const r = prog * 9 * Math.min(t.spd / 6, 1);
        if (r < 0.5) return;
        G.save();
        G.globalAlpha = prog * 0.55 * Math.min(t.spd / 5, 1);
        G.fillStyle = grd(t.x, t.y, 0, r * 2, "rgba(0,212,255,0.9)", "transparent");
        G.beginPath();
        G.arc(t.x, t.y, r * 2.2, 0, Math.PI * 2);
        G.fill();
        G.restore();
    });

    const bx = puck.x,
        by = puck.y,
        br = puck.r;
    const spd = Math.hypot(puck.vx, puck.vy);

    G.save();
    G.shadowColor = "#00d4ff";
    G.shadowBlur = 24 + spd * 1.5;
    G.fillStyle = grd(bx, by, 0, br + 8, "rgba(0,212,255,0.18)", "transparent");
    G.beginPath();
    G.arc(bx, by, br + 14, 0, Math.PI * 2);
    G.fill();
    G.restore();

    G.fillStyle = grd(
        bx - br * 0.3,
        by - br * 0.3,
        br * 0.1,
        br,
        "#ffffff",
        "#cccccc"
    );

    G.beginPath();
    G.arc(bx, by, br, 0, Math.PI * 2);
    G.fill();

    G.save();
    G.shadowColor = "#00d4ff";
    G.shadowBlur = 8;
    G.strokeStyle = "#00d4ff";
    G.lineWidth = 2.5;
    G.beginPath();
    G.arc(bx, by, br - 1, 0, Math.PI * 2);
    G.stroke();
    G.restore();

    G.strokeStyle = "rgba(0,212,255,0.32)";
    G.lineWidth = 1;
    G.beginPath();
    G.arc(bx, by, br * 0.55, 0, Math.PI * 2);
    G.stroke();

    G.fillStyle = "rgba(255,255,255,0.17)";
    G.beginPath();
    G.ellipse(
        bx - br * 0.28,
        by - br * 0.3,
        br * 0.38,
        br * 0.22,
        -0.4,
        0,
        Math.PI * 2
    );
    G.fill();
}

function drawMallet(m, col, glowCol) {
    const mx = m.x,
        my = m.y,
        mr = m.r;

    G.save();
    G.shadowColor = glowCol;
    G.shadowBlur = 32;
    const halo = G.createRadialGradient(mx, my, mr * 0.6, mx, my, mr + 18);
    halo.addColorStop(0, "transparent");
    halo.addColorStop(0.6, `${glowCol}22`);
    halo.addColorStop(1, "transparent");
    G.fillStyle = halo;
    G.beginPath();
    G.arc(mx, my, mr + 18, 0, Math.PI * 2);
    G.fill();
    G.restore();

    G.save();
    G.globalAlpha = 0.45;
    G.fillStyle = "rgba(0,0,0,0.7)";
    G.beginPath();
    G.ellipse(mx + 3, my + 4, mr, mr * 0.85, 0, 0, Math.PI * 2);
    G.fill();
    G.restore();

    const skirtG = G.createRadialGradient(
        mx - mr * 0.2,
        my - mr * 0.2,
        mr * 0.1,
        mx,
        my,
        mr
    );
    skirtG.addColorStop(0, lighten(col, 0.12));
    skirtG.addColorStop(0.65, col);
    skirtG.addColorStop(1, darken(col, 0.45));
    G.fillStyle = skirtG;
    G.beginPath();
    G.arc(mx, my, mr, 0, Math.PI * 2);
    G.fill();

    G.save();
    G.shadowColor = glowCol;
    G.shadowBlur = 12;
    G.strokeStyle = glowCol;
    G.lineWidth = 2.5;
    G.beginPath();
    G.arc(mx, my, mr - 1.5, 0, Math.PI * 2);
    G.stroke();
    G.restore();

    const grooveR = mr * 0.72;
    G.strokeStyle = `rgba(0,0,0,0.55)`;
    G.lineWidth = 3;
    G.beginPath();
    G.arc(mx, my, grooveR, 0, Math.PI * 2);
    G.stroke();
    G.strokeStyle = `rgba(255,255,255,0.08)`;
    G.lineWidth = 1;
    G.beginPath();
    G.arc(mx, my, grooveR + 1.5, 0, Math.PI * 2);
    G.stroke();

    const domeR = mr * 0.62;
    const domeG = G.createRadialGradient(
        mx - domeR * 0.3,
        my - domeR * 0.35,
        0,
        mx,
        my,
        domeR
    );
    domeG.addColorStop(0, lighten(col, 0.35));
    domeG.addColorStop(0.5, lighten(col, 0.1));
    domeG.addColorStop(1, darken(col, 0.2));
    G.fillStyle = domeG;
    G.beginPath();
    G.arc(mx, my, domeR, 0, Math.PI * 2);
    G.fill();

    G.save();
    G.shadowColor = glowCol;
    G.shadowBlur = 14;
    G.fillStyle = glowCol;
    G.beginPath();
    G.arc(mx, my, 4.5, 0, Math.PI * 2);
    G.fill();
    G.restore();

    G.fillStyle = "rgba(255,255,255,0.28)";
    G.beginPath();
    G.ellipse(
        mx - domeR * 0.3,
        my - domeR * 0.32,
        domeR * 0.32,
        domeR * 0.18,
        -0.5,
        0,
        Math.PI * 2
    );
    G.fill();

    G.fillStyle = "rgba(255,255,255,0.12)";
    G.beginPath();
    G.ellipse(
        mx - domeR * 0.15,
        my - domeR * 0.5,
        domeR * 0.14,
        domeR * 0.08,
        -0.3,
        0,
        Math.PI * 2
    );
    G.fill();
}

function darken(hex, amt) {
    const r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.max(0, (r - amt * 255) | 0)},${Math.max(
        0,
        (g - amt * 255) | 0
    )},${Math.max(0, (b - amt * 255) | 0)})`;
}

function drawParticles() {
    particles.forEach((p) => {
        G.save();
        G.globalAlpha = Math.pow(p.life, 1.4) * 0.9;
        if (p.glow) {
            G.shadowColor = p.col;
            G.shadowBlur = 10;
        }
        G.fillStyle = p.col;
        G.beginPath();
        G.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        G.fill();
        G.restore();
    });
}
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.96;
        p.life -= 0.028;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawGoalFlash() {
    if (goalFlash <= 0 || state !== "goal") return;
    const prog = goalFlash / 160,
        isP = goalWho === "p";
    G.save();
    G.globalAlpha = Math.min(prog * 3, 0.16);
    G.fillStyle = isP ? "#00d4ff" : "#ff2d55";
    G.fillRect(0, 0, W, H);
    G.restore();

    goalMsgScale = Math.min(goalMsgScale + 0.12, 1);
    const ease = 1 - Math.pow(1 - goalMsgScale, 3);
    G.save();
    G.globalAlpha = Math.min(1, prog * 3) * Math.min(1, goalFlash / 40);
    G.translate(W / 2, H / 2);
    G.scale(ease, ease);
    G.textAlign = "center";
    G.font = '900 64px "Orbitron"';
    G.fillStyle = isP ? "#00d4ff" : "#ff2d55";
    G.shadowColor = isP ? "#00d4ff" : "#ff2d55";
    G.shadowBlur = 40;
    G.fillText("GOAL!", 0, -10);
    G.shadowBlur = 0;
    G.font = '500 13px "Rajdhani"';
    G.letterSpacing = "6px";
    G.fillStyle = isP ? "rgba(0,212,255,0.75)" : "rgba(255,45,85,0.75)";
    const scoreMsg =
        mode === "cpu"
            ? isP
                ? "YOU SCORE"
                : "CPU SCORES"
            : isP
            ? "PLAYER 1 SCORES"
            : "PLAYER 2 SCORES";
    G.fillText(scoreMsg, 0, 22);
    G.restore();
    goalFlash--;
}

function updatePuckScaled(ts) {
    if (ts !== 1) {
        puck.vx *= ts;
        puck.vy *= ts;
    }
    updatePuck();
    if (ts !== 1 && state === "play") {
        puck.vx /= ts;
        puck.vy /= ts;
    }
}

// ── Utils ──
function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}
function lighten(hex, amt) {
    const r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${clamp((r + amt * 255) | 0, 0, 255)},${clamp(
        (g + amt * 255) | 0,
        0,
        255
    )},${clamp((b + amt * 255) | 0, 0, 255)})`;
}

// ── Main Loop ──
function drawSadFace() {
    const cx = W / 2,
        cy = H / 2 - 30;
    const r = 52;
    const pulse = 0.85 + Math.sin(tick * 0.05) * 0.15;
    G.save();
    G.globalAlpha = 0.82 * pulse;

    G.fillStyle = "#1a0a0a";
    G.beginPath();
    G.arc(cx, cy, r, 0, Math.PI * 2);
    G.fill();
    G.strokeStyle = "#ff2d55";
    G.lineWidth = 3;
    G.shadowColor = "#ff2d55";
    G.shadowBlur = 18;
    G.beginPath();
    G.arc(cx, cy, r, 0, Math.PI * 2);
    G.stroke();
    G.shadowBlur = 0;

    G.strokeStyle = "#ff2d55";
    G.lineWidth = 3.5;
    G.lineCap = "round";
    [
        [-18, -12],
        [18, -12]
    ].forEach(([ex, ey]) => {
        G.beginPath();
        G.moveTo(cx + ex - 7, cy + ey - 7);
        G.lineTo(cx + ex + 7, cy + ey + 7);
        G.stroke();
        G.beginPath();
        G.moveTo(cx + ex + 7, cy + ey - 7);
        G.lineTo(cx + ex - 7, cy + ey + 7);
        G.stroke();
    });

    G.strokeStyle = "#ff2d55";
    G.lineWidth = 3.5;
    G.beginPath();
    G.arc(cx, cy + 28, 20, Math.PI * 0.15, Math.PI * 0.85, false);
    G.stroke();

    G.restore();
}

function loop() {
    tick++;
    G.clearRect(0, 0, W, H);
    G.fillStyle = "#04060a";
    G.fillRect(0, 0, W, H);

    if (sloMo) sloMoAlpha = Math.min(sloMoAlpha + 0.055, 1);
    else sloMoAlpha = Math.max(sloMoAlpha - 0.07, 0);
    if (sloMoIntro > 0) sloMoIntro--;
    if (sloMoLabelTimer > 0) sloMoLabelTimer--;

    const timeScale = sloMo ? 0.55 : 1;

    if (shakeAmt > 0.3) {
        shakeX = (Math.random() - 0.5) * shakeAmt * 2;
        shakeY = (Math.random() - 0.5) * shakeAmt * 2;
        shakeAmt *= 0.72;
    } else {
        shakeX = 0;
        shakeY = 0;
        shakeAmt = 0;
    }

    G.save();
    G.translate(shakeX, shakeY);

    drawTable();

    if ((state === "play" || state === "goal") && !paused) {
        updatePlayer(timeScale);
        updateRightMallet(timeScale);
        updatePuckScaled(timeScale);
        updateParticles();
    }
    if (!paused) updateConfetti();

    drawParticles();
    drawPuck();
    drawMallet(cpu, "#2a0a0a", "#ff2d55");
    drawMallet(player, "#0a1a2a", "#00d4ff");
    drawGoalFlash();
    drawSpeedUpMsg();
    drawConfetti();
    if (showSadFace) drawSadFace();

    if (sloMoAlpha > 0) {
        const vig = G.createRadialGradient(
            W / 2,
            H / 2,
            H * 0.15,
            W / 2,
            H / 2,
            H * 0.75
        );
        vig.addColorStop(0, "transparent");
        vig.addColorStop(1, `rgba(0,0,0,${0.65 * sloMoAlpha})`);
        G.fillStyle = vig;
        G.fillRect(0, 0, W, H);

        const barH = 32 * sloMoAlpha;
        G.fillStyle = `rgba(0,0,0,${0.88 * sloMoAlpha})`;
        G.fillRect(0, 0, W, barH);
        G.fillRect(0, H - barH, W, barH);

        G.save();
        G.globalAlpha = 0.15 * sloMoAlpha;
        G.fillStyle = "#ff0040";
        G.fillRect(0, 0, 5, H);
        G.fillRect(W - 5, 0, 5, H);
        G.fillStyle = "#0080ff";
        G.fillRect(5, 0, 5, H);
        G.fillRect(W - 10, 0, 5, H);
        G.restore();

        if (sloMoLabelTimer > 0) {
            const fadeIn = Math.min(sloMoLabelTimer / 20, 1);
            const fadeOut = sloMoLabelTimer < 30 ? sloMoLabelTimer / 30 : 1;
            const alpha = fadeIn * fadeOut * sloMoAlpha;
            const pulse = 0.88 + Math.sin(tick * 0.12) * 0.12;

            G.save();
            G.globalAlpha = alpha * pulse;
            G.textAlign = "center";
            G.font = '900 16px "Orbitron"';
            G.fillStyle = "rgba(0,0,0,0.5)";
            G.fillText("⚡  GAME POINT  ⚡", W / 2 + 1, barH * 0.72 + 1);
            G.fillStyle = "#ffc940";
            G.shadowColor = "#ffc940";
            G.shadowBlur = 14;
            G.fillText("⚡  GAME POINT  ⚡", W / 2, barH * 0.72);
            G.shadowBlur = 0;
            G.restore();
        }
    }

    G.restore();
    requestAnimationFrame(loop);
}

function drawSpeedUpMsg() {
    if (speedUpTimer <= 0) return;
    const t = speedUpTimer / 130;
    const scale = t > 0.85 ? 0.5 + (1 - (t - 0.85) / 0.15) * 0.5 : 1;
    const alpha = t < 0.2 ? t / 0.2 : 1;
    G.save();
    G.globalAlpha = alpha;
    G.translate(W / 2, H / 2 - 60);
    G.scale(scale, scale);
    G.textAlign = "center";
    G.font = '900 34px "Orbitron"';
    G.fillStyle = "#000";
    G.fillText(speedUpMsg, 2, 2);
    const grd2 = G.createLinearGradient(-100, -30, 100, 10);
    grd2.addColorStop(0, "#ffc940");
    grd2.addColorStop(1, "#ff6820");
    G.fillStyle = grd2;
    G.shadowColor = "#ffc940";
    G.shadowBlur = 24;
    G.fillText(speedUpMsg, 0, 0);
    G.restore();
    speedUpTimer--;
}

// ── Responsive scaling: fit #outer to the viewport on any screen ──
const outerEl = document.getElementById("outer");
function fitOuter() {
    outerEl.style.transform = "scale(1)";
    const rect = outerEl.getBoundingClientRect();
    const margin = 12;
    const availW = window.innerWidth - margin * 2;
    const availH = window.innerHeight - margin * 2;
    const scale = Math.min(availW / rect.width, availH / rect.height, 2.5);
    outerEl.style.transform = `scale(${scale})`;
}
window.addEventListener("resize", fitOuter);
window.addEventListener("orientationchange", () => setTimeout(fitOuter, 60));
if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", fitOuter);
}

loop();
fitOuter();
setTimeout(fitOuter, 200);
