// ======================================
// CanvasManager
// Handles:
// - Static (base) + Live (overlay) layers
// - Smooth drawing with quadratic curves
// - Undo/Redo
// - Real-time operation sending
// - Remote op application
// - Throttled input + efficient redraw
// ======================================

export default class CanvasManager {
  constructor(baseCanvas, overlayCanvas, sendOpCallback, socket = null) {
    this.baseCanvas = baseCanvas;
    this.overlayCanvas = overlayCanvas;
    this.ctxBase = baseCanvas.getContext("2d");
    this.ctxOverlay = overlayCanvas.getContext("2d");
    this.sendOp = sendOpCallback;
    this.socket = socket; // optional WebSocket

    // Drawing state
    this.currentStroke = null;
    this.committedOps = [];
    this.undoneOps = [];
    this.userId = null;
    this.drawing = false;

    // High-frequency handling
    this.lastTime = 0;
    this.throttleDelay = 16; // ~60fps
    this.pointBuffer = [];
    this.sendInterval = 30; // ms

    // Initialize
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.startDrawLoop();
    this.startBatchSender();
  }

  // -----------------------
  // Canvas Management
  // -----------------------

  resize() {
    [this.baseCanvas, this.overlayCanvas].forEach(c => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    });
    this.redrawAll();
  }

  setUserId(id) {
    this.userId = id;
  }

  // -----------------------
  // Drawing Lifecycle
  // -----------------------

  beginStroke(meta, pos) {
    this.drawing = true;
    this.currentStroke = {
      opId: crypto.randomUUID(),
      userId: meta.userId,
      tool: meta.tool,
      color: meta.color,
      width: meta.width,
      points: [pos]
    };
  }

  addPoint(pos) {
    if (!this.drawing || !this.currentStroke) return;

    const now = performance.now();
    if (now - this.lastTime < this.throttleDelay) return; // throttle
    this.lastTime = now;

    // Skip points too close
    const pts = this.currentStroke.points;
    const last = pts[pts.length - 1];
    const dx = pos.x - last.x, dy = pos.y - last.y;
    if (dx * dx + dy * dy < 4) return;

    pts.push(pos);
    this.pointBuffer.push(pos);
  }

  finishStroke() {
    if (!this.currentStroke) return;
    this.drawing = false;

    // Commit locally
    this.committedOps.push(this.currentStroke);
    this.redrawAll();

    // Send to server
    this.sendOp(this.currentStroke);

    // Reset
    this.currentStroke = null;
    this.undoneOps = [];
  }

  // -----------------------
  // Rendering
  // -----------------------

  redrawCurrent() {
    const ctx = this.ctxOverlay;
    ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    if (this.currentStroke && this.currentStroke.points.length > 1) {
      this.drawSmoothPath(ctx, this.currentStroke);
    }
  }

  redrawAll() {
    const ctx = this.ctxBase;
    ctx.clearRect(0, 0, this.baseCanvas.width, this.baseCanvas.height);
    for (const op of this.committedOps) {
      this.drawSmoothPath(ctx, op);
    }
  }

  drawSmoothPath(ctx, op) {
    const pts = op.points;
    if (pts.length < 2) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = op.width;

    if (op.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = op.color;
      if (op.tool === "brush") ctx.lineWidth = op.width * 2;
    }

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);

    for (let i = 1; i < pts.length - 1; i++) {
      const midX = (pts[i].x + pts[i + 1].x) / 2;
      const midY = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
    }

    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
  }

  // -----------------------
  // Undo / Redo
  // -----------------------

  localUndo() {
    if (!this.committedOps.length) return;
    const last = this.committedOps.pop();
    this.undoneOps.push(last);
    this.redrawAll();
  }

  localRedo() {
    if (!this.undoneOps.length) return;
    const op = this.undoneOps.pop();
    this.committedOps.push(op);
    this.redrawAll();
  }

  // -----------------------
  // Remote Ops (from WebSocket)
  // -----------------------

  applyRemoteOp(op) {
    if (this.committedOps.find(o => o.opId === op.opId)) return;
    this.committedOps.push(op);
    this.redrawAll();
  }

  // -----------------------
  // Real-time Optimization
  // -----------------------

  startDrawLoop() {
    const loop = () => {
      if (this.drawing && this.currentStroke?.points.length > 1) {
        this.ctxOverlay.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        this.redrawCurrent();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  startBatchSender() {
    setInterval(() => {
      if (this.pointBuffer.length > 0 && this.socket) {
        const chunk = {
          type: "strokeChunk",
          userId: this.userId,
          points: this.pointBuffer
        };
        this.socket.send(JSON.stringify(chunk));
        this.pointBuffer = [];
      }
    }, this.sendInterval);
  }

  // -----------------------
  // Optional: Remote Cursor
  // -----------------------

  drawCursor(userId, pos, color = "blue") {
    const ctx = this.ctxOverlay;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

console.log("✅ Optimized CanvasManager loaded");
