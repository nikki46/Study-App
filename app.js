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

/* ============ MUSIC PLAYER (YouTube iframe embed) ============ */
const DEFAULT_TRACKS = [
  { title: 'lofi hip hop radio – beats to relax/study to', artist: 'Lofi Girl', id: 'jfKfPfyJRdk' },
  { title: '1 A.M Study Session – lofi hip hop/chill beats', artist: 'Lofi Girl', id: 'lTRiuFIWV54' },
  { title: '2 A.M Study Session – lofi hip hop/chill beats', artist: 'Lofi Girl', id: 'zhJirel6t-E' },
  { title: 'Chillhop Essentials – Fall 2021', artist: 'Chillhop Music', id: 'GfKs2tQLMEY' },
  { title: 'Coffee Shop Ambience – lofi jazz', artist: 'Calmed by Nature', id: 'h2zkV-l_TbY' },
  { title: 'Rainy Day Coffee Shop – 3hr lofi mix', artist: 'the bootleg boy', id: '2gliGzb2_1I' },
  { title: 'Coffee Shop Radio – lofi & jazzy hip-hop', artist: 'STEEZYASFUCK', id: '-5KAN9_CzSA' },
];

// Load custom tracks from localStorage or use defaults
let TRACKS = JSON.parse(localStorage.getItem('lofi-tracks') || 'null') || [...DEFAULT_TRACKS];

function saveTrackList() {
  localStorage.setItem('lofi-tracks', JSON.stringify(TRACKS));
}

const trackListEl = document.getElementById('trackList');
const nowPlaying = document.getElementById('nowPlaying');
const ytFrame = document.getElementById('ytFrame');
const addTrackForm = document.getElementById('addTrackForm');
const ytUrlInput = document.getElementById('ytUrlInput');

let currentIdx = -1;

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
      <button class="track-del-btn" data-track-del="${i}" title="Remove track">×</button>
    `;
    div.querySelector('.track-title').textContent = t.title;
    div.querySelector('.track-artist').textContent = t.artist;
    div.addEventListener('click', (e) => {
      if (e.target.closest('[data-track-del]')) return;
      loadTrack(i);
    });
    trackListEl.appendChild(div);
  });
}
renderTracks();

trackListEl.addEventListener('click', (e) => {
  const del = e.target.closest('[data-track-del]');
  if (!del) return;
  const idx = parseInt(del.dataset.trackDel, 10);
  TRACKS.splice(idx, 1);
  if (currentIdx === idx) currentIdx = -1;
  else if (currentIdx > idx) currentIdx--;
  saveTrackList();
  renderTracks();
});

function loadTrack(i) {
  if (i < 0 || i >= TRACKS.length) return;
  currentIdx = i;
  const t = TRACKS[i];
  nowPlaying.textContent = `${t.title} — ${t.artist}`;
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube.com/embed/${t.id}?autoplay=1&rel=0&modestbranding=1`;
  iframe.allow = 'autoplay; encrypted-media';
  iframe.allowFullscreen = true;
  ytFrame.innerHTML = '';
  ytFrame.appendChild(iframe);
  renderTracks();
}


/* ----- Add custom YouTube track ----- */
function extractYouTubeId(input) {
  // Handle various YouTube URL formats and plain IDs
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const p of patterns) {
    const m = input.trim().match(p);
    if (m) return m[1];
  }
  return null;
}

addTrackForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const val = ytUrlInput.value.trim();
  if (!val) return;
  const id = extractYouTubeId(val);
  if (!id) {
    ytUrlInput.value = '';
    ytUrlInput.placeholder = 'Invalid URL — try again';
    setTimeout(() => { ytUrlInput.placeholder = 'Paste YouTube URL to add a track'; }, 2000);
    return;
  }
  TRACKS.push({ title: `Custom track`, artist: 'YouTube', id });
  ytUrlInput.value = '';
  saveTrackList();
  renderTracks();
  loadTrack(TRACKS.length - 1);
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
