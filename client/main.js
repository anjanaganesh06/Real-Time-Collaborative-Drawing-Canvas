// client/main.js
import WSClient from './websocket.js';
import CanvasManager from './canvas.js';

const base = document.getElementById('base-canvas');
const overlay = document.getElementById('overlay-canvas');
const color = document.getElementById('color');
const widthEl = document.getElementById('width');
const penBtn = document.getElementById('penBtn');               // added

const toolBrush = document.getElementById('tool-brush');
const toolEraser = document.getElementById('tool-eraser');
const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');
const status = document.getElementById('status');
const userListEl = document.getElementById('user-list');

// ✅ Create WebSocket and Canvas manager
const socket = new WSClient(
  (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws',
  {}
);
const cm = new CanvasManager(base, overlay, sendOpToServer);

// ---- Toolbar Logic ----
let tool = 'brush';
penBtn.onclick = () => {
  tool = 'pen';
  penBtn.style.background = '#ddd';
  toolBrush.style.background = '';
  toolEraser.style.background = '';
};
toolBrush.onclick = () => {
  tool = 'brush';
  toolBrush.style.background = '#ddd';
  toolEraser.style.background = '';
};

toolEraser.onclick = () => {
  tool = 'eraser';
  toolEraser.style.background = '#ddd';
  toolBrush.style.background = '';
};

undoBtn.onclick = () => {
  console.log('Undo clicked');
  cm.localUndo();
};

redoBtn.onclick = () => {
  console.log('Redo clicked');
  cm.localRedo();
};

// ---- Drawing Handlers ----
let drawing = false;

overlay.addEventListener('pointerdown', startPointer);
overlay.addEventListener('pointermove', movePointer);
window.addEventListener('pointerup', endPointer);

function getPos(e) {
  const rect = overlay.getBoundingClientRect();
  const p = e.touches ? e.touches[0] : e;
  return { x: p.clientX - rect.left, y: p.clientY - rect.top };
}

function startPointer(e) {
  e.preventDefault();
  drawing = true;

  const meta = {
    tool,
    color: color.value,
    width: Number(widthEl.value),
    userId: 'local',
  };

  cm.beginStroke(meta);
   const pos = getPos(e);
  cm.beginStroke(meta, pos); // ✅ Correct call
}

function movePointer(e) {
  if (!drawing) return;
  cm.addPoint(getPos(e));
}

function endPointer(e) {
  if (!drawing) return;
  drawing = false;
  cm.finishStroke();
}

function sendOpToServer(op) {
  // For now, just log — replace with socket.send() later
  console.log('Sending stroke to server:', op);
}

// ---- Debug ----
console.log('✅ main.js loaded, toolbar wired.');
