/* ============ CLOCK ============ */
const clockEl = document.getElementById('clock');
const clockToggle = document.getElementById('clockToggle');
let is24h = localStorage.getItem('is24h') !== 'false'; // default true

function tickClock() {
  const d = new Date();
  let h = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (is24h) {
    clockEl.textContent = `${String(h).padStart(2, '0')}:${mm}`;
  } else {
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    clockEl.textContent = `${h}:${mm} ${period}`;
  }
  clockToggle.textContent = is24h ? '24h' : '12h';
}
clockToggle.addEventListener('click', () => {
  is24h = !is24h;
  localStorage.setItem('is24h', is24h);
  tickClock();
});
tickClock();
setInterval(tickClock, 1000);

/* ============ TIMER ============ */
const timeText = document.getElementById('timeText');
const ringFg = document.getElementById('ringFg');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const skipBtn = document.getElementById('skipBtn');
const cyclesDone = document.getElementById('cyclesDone');
const modeTabs = document.getElementById('modeTabs');
const customMins = document.getElementById('customMins');
const setCustom = document.getElementById('setCustom');

const RING_CIRCUM = 2 * Math.PI * 90;
ringFg.setAttribute('stroke-dasharray', RING_CIRCUM);

let totalSeconds = 25 * 60;
let remaining = totalSeconds;
let intervalId = null;
let running = false;
let cycles = parseInt(localStorage.getItem('cycles') || '0', 10);
cyclesDone.textContent = cycles;

function fmt(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function render() {
  timeText.textContent = fmt(remaining);
  const pct = remaining / totalSeconds;
  ringFg.setAttribute('stroke-dashoffset', RING_CIRCUM * (1 - pct));
  document.title = running ? `${fmt(remaining)} • lofi study` : 'lofi study';
}

function start() {
  if (running) {
    clearInterval(intervalId);
    running = false;
    startBtn.textContent = 'Start';
    render();
    return;
  }
  running = true;
  startBtn.textContent = 'Pause';
  intervalId = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(intervalId);
      running = false;
      startBtn.textContent = 'Start';
      cycles++;
      localStorage.setItem('cycles', cycles);
      cyclesDone.textContent = cycles;
      remaining = 0;
      render();
      ding();
      return;
    }
    render();
  }, 1000);
}

function reset() {
  clearInterval(intervalId);
  running = false;
  startBtn.textContent = 'Start';
  remaining = totalSeconds;
  render();
}

function setMins(mins) {
  totalSeconds = mins * 60;
  remaining = totalSeconds;
  customMins.value = mins;
  reset();
}

startBtn.addEventListener('click', start);
resetBtn.addEventListener('click', reset);
skipBtn.addEventListener('click', () => {
  clearInterval(intervalId);
  running = false;
  startBtn.textContent = 'Start';
  remaining = 0;
  render();
});

modeTabs.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  modeTabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  setMins(parseInt(btn.dataset.mins, 10));
});

setCustom.addEventListener('click', () => {
  const v = Math.max(1, Math.min(180, parseInt(customMins.value, 10) || 25));
  modeTabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  setMins(v);
});

function ding() {
  // Soft beep using WebAudio
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.18, 0.36].forEach((delay) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 660;
      o.type = 'sine';
      g.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.5);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + 0.55);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch (e) { /* silent */ }
}

render();

/* ============ TASKS ============ */
const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const taskList = document.getElementById('taskList');
const taskCount = document.getElementById('taskCount');
const clearDone = document.getElementById('clearDone');

let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');

function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

function sortTasks() {
  // Stable sort: active tasks keep their relative order, done tasks fall to the bottom.
  tasks.sort((a, b) => Number(a.done) - Number(b.done));
}

function renderTasks() {
  sortTasks();
  taskList.innerHTML = '';
  tasks.forEach((t, i) => {
    const li = document.createElement('li');
    li.className = 'task-item' + (t.done ? ' done' : '');
    li.draggable = !t.done; // only active tasks are draggable
    li.dataset.i = i;
    li.innerHTML = `
      <div class="task-grip" title="Drag to reorder">⋮⋮</div>
      <div class="task-check" data-i="${i}"></div>
      <div class="task-text" data-i="${i}"></div>
      <button class="task-del" data-del="${i}" title="Delete">×</button>
    `;
    li.querySelector('.task-text').textContent = t.text;
    taskList.appendChild(li);
  });
  const done = tasks.filter(t => t.done).length;
  taskCount.textContent = `${done} / ${tasks.length}`;
}

taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const v = taskInput.value.trim();
  if (!v) return;
  // Insert new tasks at the end of the active group (before any done tasks)
  const firstDone = tasks.findIndex(t => t.done);
  const newTask = { text: v, done: false };
  if (firstDone === -1) tasks.push(newTask);
  else tasks.splice(firstDone, 0, newTask);
  taskInput.value = '';
  saveTasks();
  renderTasks();
});

taskList.addEventListener('click', (e) => {
  const del = e.target.closest('[data-del]');
  if (del) {
    tasks.splice(parseInt(del.dataset.del, 10), 1);
    saveTasks();
    renderTasks();
    return;
  }
  const toggle = e.target.closest('[data-i]');
  if (toggle) {
    const i = parseInt(toggle.dataset.i, 10);
    tasks[i].done = !tasks[i].done;
    saveTasks();
    renderTasks();
  }
});

clearDone.addEventListener('click', () => {
  tasks = tasks.filter(t => !t.done);
  saveTasks();
  renderTasks();
});

/* ----- drag & drop reorder (active tasks only) ----- */
let dragSrcIdx = null;

taskList.addEventListener('dragstart', (e) => {
  const li = e.target.closest('.task-item');
  if (!li || !li.draggable) return;
  dragSrcIdx = parseInt(li.dataset.i, 10);
  li.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  // Firefox needs data set to start drag
  e.dataTransfer.setData('text/plain', String(dragSrcIdx));
});

taskList.addEventListener('dragend', (e) => {
  const li = e.target.closest('.task-item');
  if (li) li.classList.remove('dragging');
  taskList.querySelectorAll('.drop-before, .drop-after')
    .forEach(el => el.classList.remove('drop-before', 'drop-after'));
  dragSrcIdx = null;
});

taskList.addEventListener('dragover', (e) => {
  if (dragSrcIdx === null) return;
  const li = e.target.closest('.task-item');
  if (!li || tasks[parseInt(li.dataset.i, 10)].done) return; // can't drop onto done items
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  taskList.querySelectorAll('.drop-before, .drop-after')
    .forEach(el => el.classList.remove('drop-before', 'drop-after'));
  const rect = li.getBoundingClientRect();
  const before = (e.clientY - rect.top) < rect.height / 2;
  li.classList.add(before ? 'drop-before' : 'drop-after');
});

taskList.addEventListener('drop', (e) => {
  if (dragSrcIdx === null) return;
  const li = e.target.closest('.task-item');
  if (!li) return;
  const targetIdx = parseInt(li.dataset.i, 10);
  if (tasks[targetIdx].done || targetIdx === dragSrcIdx) return;
  e.preventDefault();

  const rect = li.getBoundingClientRect();
  const before = (e.clientY - rect.top) < rect.height / 2;
  let insertAt = before ? targetIdx : targetIdx + 1;

  const [moved] = tasks.splice(dragSrcIdx, 1);
  if (dragSrcIdx < insertAt) insertAt--; // account for removal shift
  tasks.splice(insertAt, 0, moved);

  saveTasks();
  renderTasks();
});

renderTasks();

/* ============ MUSIC PLAYER (HTML5 audio) ============ */
// SomaFM streams — free, listener-supported, CORS-friendly internet radio.
// Genres curated for studying / chill focus.
const TRACKS = [
  { title: 'Groove Salad', artist: 'SomaFM · downtempo & chill', url: 'https://ice1.somafm.com/groovesalad-128-mp3' },
  { title: 'Drone Zone', artist: 'SomaFM · ambient / space music', url: 'https://ice1.somafm.com/dronezone-128-mp3' },
  { title: 'Deep Space One', artist: 'SomaFM · deep ambient electronic', url: 'https://ice1.somafm.com/deepspaceone-128-mp3' },
  { title: 'Lush', artist: 'SomaFM · sensuous vocals & chill', url: 'https://ice1.somafm.com/lush-128-mp3' },
  { title: 'Space Station Soma', artist: 'SomaFM · ambient / space-out', url: 'https://ice1.somafm.com/spacestation-128-mp3' },
  { title: 'Secret Agent', artist: 'SomaFM · spy-jazz & lounge', url: 'https://ice1.somafm.com/secretagent-128-mp3' },
  { title: 'Sonic Universe', artist: 'SomaFM · adventurous jazz', url: 'https://ice1.somafm.com/sonicuniverse-128-mp3' },
  { title: 'DEF CON Radio', artist: 'SomaFM · electronic for hackers', url: 'https://ice1.somafm.com/defcon-128-mp3' },
  { title: 'Fluid', artist: 'SomaFM · drown in liquid trip-hop', url: 'https://ice1.somafm.com/fluid-128-mp3' },
  { title: 'Beat Blender', artist: 'SomaFM · deep house & breakbeats', url: 'https://ice1.somafm.com/beatblender-128-mp3' },
];

const trackListEl = document.getElementById('trackList');
const nowPlaying = document.getElementById('nowPlaying');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const volume = document.getElementById('volume');
const audio = document.getElementById('audio');

let currentIdx = -1;
let isPlaying = false;

function renderTracks() {
  trackListEl.innerHTML = '';
  TRACKS.forEach((t, i) => {
    const div = document.createElement('div');
    div.className = 'track' + (i === currentIdx ? ' active' : '');
    div.innerHTML = `
      <div class="track-num">${String(i + 1).padStart(2, '0')}</div>
      <div class="track-info">
        <div class="track-title"></div>
        <div class="track-artist"></div>
      </div>
    `;
    div.querySelector('.track-title').textContent = t.title;
    div.querySelector('.track-artist').textContent = t.artist;
    div.addEventListener('click', () => loadTrack(i, true));
    trackListEl.appendChild(div);
  });
}
renderTracks();

const PLAY_SVG = '<path d="M8 5v14l11-7z"/>';
const PAUSE_SVG = '<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>';

function setPlayIcon(playing) {
  playIcon.innerHTML = playing ? PAUSE_SVG : PLAY_SVG;
  isPlaying = playing;
}

function loadTrack(i, autoplay = true) {
  currentIdx = i;
  const t = TRACKS[i];
  nowPlaying.textContent = `${t.title} — ${t.artist}`;
  audio.src = t.url;
  audio.volume = parseInt(volume.value, 10) / 100;
  renderTracks();
  if (autoplay) {
    audio.play().catch(err => {
      console.warn('Playback failed:', err);
      nowPlaying.textContent = `${t.title} — click play to start`;
    });
  }
}

audio.addEventListener('playing', () => setPlayIcon(true));
audio.addEventListener('pause', () => setPlayIcon(false));
audio.addEventListener('ended', () => loadTrack((currentIdx + 1) % TRACKS.length));
audio.addEventListener('error', () => {
  if (currentIdx === -1) return;
  nowPlaying.textContent = 'Stream unreachable, trying next…';
  setTimeout(() => loadTrack((currentIdx + 1) % TRACKS.length), 800);
});

playBtn.addEventListener('click', () => {
  if (currentIdx === -1) { loadTrack(0); return; }
  if (isPlaying) audio.pause();
  else audio.play().catch(() => {});
});

prevBtn.addEventListener('click', () => {
  if (currentIdx === -1) return loadTrack(TRACKS.length - 1);
  loadTrack((currentIdx - 1 + TRACKS.length) % TRACKS.length);
});

nextBtn.addEventListener('click', () => {
  if (currentIdx === -1) return loadTrack(0);
  loadTrack((currentIdx + 1) % TRACKS.length);
});

volume.addEventListener('input', () => {
  audio.volume = parseInt(volume.value, 10) / 100;
});

/* ============ THEME ============ */
const themeToggle = document.getElementById('themeToggle');
const themePanel = document.getElementById('themePanel');
const closeTheme = document.getElementById('closeTheme');
const resetTheme = document.getElementById('resetTheme');

const PRESETS = {
  midnight: {
    '--bg': '#14151f', '--surface': '#1c1d2a', '--surface-2': '#252739',
    '--text': '#ecedf5', '--muted': '#8b8fa8',
    '--accent': '#b491ff', '--accent-2': '#8be7d8', '--border': '#2d2f44'
  },
  sakura: {
    '--bg': '#fbf3f5', '--surface': '#ffffff', '--surface-2': '#fde9ef',
    '--text': '#3a2a2f', '--muted': '#9c7a82',
    '--accent': '#e7689b', '--accent-2': '#f3b6cf', '--border': '#f0d4dd'
  },
  forest: {
    '--bg': '#0f1a16', '--surface': '#172621', '--surface-2': '#1f3129',
    '--text': '#e0ebe5', '--muted': '#7e9a90',
    '--accent': '#7fd1a8', '--accent-2': '#c9e88f', '--border': '#2a3d35'
  },
  sunset: {
    '--bg': '#1d1320', '--surface': '#291a2f', '--surface-2': '#3a2440',
    '--text': '#f5ecef', '--muted': '#a48aac',
    '--accent': '#ff9974', '--accent-2': '#ffd66e', '--border': '#3f2c47'
  },
  paper: {
    '--bg': '#f5f1e8', '--surface': '#ffffff', '--surface-2': '#ebe4d3',
    '--text': '#2a2820', '--muted': '#8a8470',
    '--accent': '#c08a4a', '--accent-2': '#7a9c6a', '--border': '#ddd5c1'
  },
  mocha: {
    '--bg': '#1e1814', '--surface': '#2a221d', '--surface-2': '#3a2e27',
    '--text': '#f0e6dc', '--muted': '#a3927f',
    '--accent': '#e8b27a', '--accent-2': '#d49b8a', '--border': '#43352d'
  }
};

const colorInputs = document.querySelectorAll('.color-rows input[type="color"]');

function applyTheme(theme) {
  Object.entries(theme).forEach(([k, v]) => {
    document.documentElement.style.setProperty(k, v);
  });
  syncColorInputs();
  localStorage.setItem('theme', JSON.stringify(theme));
}

function syncColorInputs() {
  colorInputs.forEach(inp => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(inp.dataset.var).trim();
    if (v) inp.value = toHex(v);
  });
}

function toHex(c) {
  if (c.startsWith('#')) return c.length === 7 ? c : '#' + c.slice(1).padEnd(6, '0');
  // rgb(a) → hex
  const m = c.match(/\d+/g);
  if (!m) return '#000000';
  return '#' + m.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
}

themeToggle.addEventListener('click', () => {
  syncColorInputs();
  themePanel.hidden = false;
});
closeTheme.addEventListener('click', () => themePanel.hidden = true);
themePanel.addEventListener('click', (e) => {
  if (e.target === themePanel) themePanel.hidden = true;
});

document.querySelectorAll('.preset').forEach(btn => {
  btn.addEventListener('click', () => applyTheme(PRESETS[btn.dataset.preset]));
});

colorInputs.forEach(inp => {
  inp.addEventListener('input', () => {
    document.documentElement.style.setProperty(inp.dataset.var, inp.value);
    const current = {};
    colorInputs.forEach(i => current[i.dataset.var] = i.value);
    localStorage.setItem('theme', JSON.stringify(current));
  });
});

resetTheme.addEventListener('click', () => applyTheme(PRESETS.midnight));

// Load saved theme on startup
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  try { applyTheme(JSON.parse(savedTheme)); } catch (e) { syncColorInputs(); }
} else {
  syncColorInputs();
}
