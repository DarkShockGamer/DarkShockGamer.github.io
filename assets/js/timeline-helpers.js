/* Interactive timeline builder
   - Drag bars to move
   - Drag handles to resize
   - Double-click a bar to edit its label
   - Saves to localStorage
   - Exports JSON/PNG
*/

const WEEKS = ["1","2","3","4","5","6","7","8+"]; // 8+ mapped to index 8 internally
const STORAGE_KEY = "build-season-timeline-v1";

const DEFAULT_ACTIVITIES = [
  { label: "Initial Strategy", note: "First 2–3 days", blocks: [{ start: 1, end: 2 }] },
  { label: "Mechanism Brainstorming + Choosing concepts", note: "≈2 days", blocks: [{ start: 1, end: 2 }] },
  { label: "Prototyping", note: "", blocks: [{ start: 3, end: 4 }] },
  { label: "Detailed Design", note: "", blocks: [{ start: 2, end: 4 }] },
  { label: "Mechanism Fabrication", note: "", blocks: [{ start: 4, end: 6 }] },
  { label: "Assembly (includes wiring)", note: "", blocks: [{ start: 4, end: 6 }] },
  { label: "Initial Programming", note: "", blocks: [{ start: 3, end: 6 }] },
  { label: "Test and Finalize Programming", note: "", blocks: [{ start: 5, end: 7 }] },
  { label: "Practice/Testing", note: "", blocks: [{ start: 5, end: 7 }] },
  { label: "Iterating", note: "", blocks: [{ start: 7, end: 8 }] },
];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_ACTIVITIES);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return structuredClone(DEFAULT_ACTIVITIES);
    return parsed;
  } catch {
    return structuredClone(DEFAULT_ACTIVITIES);
  }
}
function saveState(activities) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
  const el = document.getElementById("saveIndicator");
  el.classList.add("show");
  clearTimeout(saveState._t);
  saveState._t = setTimeout(() => el.classList.remove("show"), 1200);
}

let activities = loadState();

const board = document.getElementById("timelineBoard");
const resetBtn = document.getElementById("resetBtn");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const exportPngBtn = document.getElementById("exportPngBtn");

resetBtn.addEventListener("click", () => {
  activities = structuredClone(DEFAULT_ACTIVITIES);
  render();
  saveState(activities);
});
exportJsonBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(activities, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "build-season-timeline.json";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
});
exportPngBtn.addEventListener("click", async () => {
  // Simple DOM-to-canvas export via html2canvas if available, else prompt to use browser screenshot
  if (window.html2canvas) {
    const canvas = await html2canvas(board, { backgroundColor: null, scale: window.devicePixelRatio });
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "build-season-timeline.png";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });
  } else {
    alert("To export PNG, include html2canvas or use your browser's screenshot tool.");
  }
});

function renderHeader() {
  const headerRow = board.querySelector(".board-header");
  headerRow.innerHTML = "";
  const activityHead = document.createElement("div");
  activityHead.className = "cell cell-activity-head";
  activityHead.textContent = "ACTIVITY";
  headerRow.appendChild(activityHead);

  for (const w of WEEKS) {
    const cell = document.createElement("div");
    cell.className = "cell cell-week";
    cell.textContent = w;
    headerRow.appendChild(cell);
  }
}

function render() {
  board.innerHTML = `
    <div class="board-row board-header" role="row">
      <div class="cell cell-activity-head" role="columnheader">ACTIVITY</div>
      ${WEEKS.map(w => `<div class="cell cell-week" role="columnheader">${w}</div>`).join("")}
    </div>
  `;
  const colCount = 1 + WEEKS.length;

  activities.forEach((act, rowIdx) => {
    const row = document.createElement("div");
    row.className = "board-row activity-row";
    row.setAttribute("role", "row");

    // Activity label cell
    const labelCell = document.createElement("div");
    labelCell.className = "cell activity-label";
    labelCell.textContent = act.label;
    row.appendChild(labelCell);

    // Week cells
    const weekCells = [];
    for (let i = 0; i < WEEKS.length; i++) {
      const weekCell = document.createElement("div");
      weekCell.className = "cell week-cell";
      weekCell.dataset.week = i + 1;
      weekCell.style.position = "relative";
      row.appendChild(weekCell);
      weekCells.push(weekCell);
    }

    // Render blocks for the activity
    for (const block of act.blocks) {
      const bar = createBar(act, block, weekCells);
      // Attach to the cell at block.start
      weekCells[block.start - 1].appendChild(bar);
      // Position and size across cells
      positionBar(bar, block, weekCells);
    }

    board.appendChild(row);
  });
}

function positionBar(bar, block, weekCells) {
  const startIdx = Math.max(1, Math.min(WEEKS.length, block.start)) - 1;
  const endIdx = Math.max(1, Math.min(WEEKS.length, block.end)) - 1;

  const firstCell = weekCells[startIdx].getBoundingClientRect();
  const lastCell = weekCells[endIdx].getBoundingClientRect();
  const parentRect = weekCells[startIdx].getBoundingClientRect();

  const left = 8; // inset from the cell
  const rightEdge = (lastCell.right - parentRect.left) - 8;

  bar.style.left = `${left}px`;
  bar.style.width = `${rightEdge - left}px`;
}

function createBar(activity, block, weekCells) {
  const bar = document.createElement("div");
  bar.className = "bar";
  bar.setAttribute("role", "button");
  bar.setAttribute("aria-label", `${activity.label} from week ${block.start} to ${block.end}`);
  bar.tabIndex = 0;

  const label = document.createElement("div");
  label.className = "label";
  label.textContent = activity.label;

  const note = document.createElement("div");
  note.className = "note";
  note.textContent = activity.note || "";

  const handleStart = document.createElement("div");
  handleStart.className = "handle start";
  const handleEnd = document.createElement("div");
  handleEnd.className = "handle end";

  bar.appendChild(label);
  bar.appendChild(note);
  bar.appendChild(handleStart);
  bar.appendChild(handleEnd);

  // Ripple on click
  bar.addEventListener("pointerdown", (e) => {
    bar.setPointerCapture(e.pointerId);
    makeRipple(bar, e);
  });

  // Dragging state
  const state = { dragging: false, resizing: null, startX: 0, startStart: block.start, startEnd: block.end };

  bar.addEventListener("pointerdown", (e) => {
    state.startX = e.clientX;
    state.startStart = block.start;
    state.startEnd = block.end;
    // Determine if resizing
    if (e.target === handleStart) state.resizing = "start";
    else if (e.target === handleEnd) state.resizing = "end";
    else state.dragging = true;

    bar.classList.add("dragging");
  });

  window.addEventListener("pointermove", (e) => {
    if (!state.dragging && !state.resizing) return;
    // Calculate movement across columns
    const dx = e.clientX - state.startX;
    const colWidth = weekCells[0].getBoundingClientRect().width;
    const deltaCols = Math.round(dx / colWidth); // snap as you move

    if (state.dragging) {
      const newStart = clamp(1, WEEKS.length, state.startStart + deltaCols);
      const span = state.startEnd - state.startStart;
      block.start = newStart;
      block.end = clamp(1, WEEKS.length, newStart + span);
    } else if (state.resizing === "start") {
      const tentative = clamp(1, WEEKS.length, state.startStart + deltaCols);
      block.start = Math.min(tentative, block.end); // prevent inversion
    } else if (state.resizing === "end") {
      const tentative = clamp(1, WEEKS.length, state.startEnd + deltaCols);
      block.end = Math.max(tentative, block.start);
    }

    // Reposition bar
    positionBar(bar, block, weekCells);
  });

  window.addEventListener("pointerup", () => {
    if (!state.dragging && !state.resizing) return;
    state.dragging = false; state.resizing = null;
    bar.classList.remove("dragging");
    saveState(activities);
  });

  // Keyboard support
  bar.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { block.start = clamp(1, WEEKS.length, block.start - 1); block.end = clamp(block.start, WEEKS.length, block.end - 1); }
    if (e.key === "ArrowRight") { block.start = clamp(1, WEEKS.length, block.start + 1); block.end = clamp(block.start, WEEKS.length, block.end + 1); }
    if (e.key === "Enter") { editLabel(activity, label); }
    positionBar(bar, block, weekCells);
    saveState(activities);
  });

  // Double-click to edit label
  bar.addEventListener("dblclick", () => editLabel(activity, label));

  return bar;
}

function editLabel(activity, labelEl) {
  const prev = activity.label;
  const next = prompt("Edit activity label:", prev);
  if (next && next.trim() && next !== prev) {
    activity.label = next.trim();
    labelEl.textContent = activity.label;
    saveState(activities);
  }
}

function makeRipple(el, e) {
  const rect = el.getBoundingClientRect();
  const ripple = document.createElement("span");
  ripple.className = "ripple";
  ripple.style.left = `${e.clientX - rect.left}px`;
  ripple.style.top = `${e.clientY - rect.top}px`;
  el.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
}

function clamp(min, max, v) { return Math.max(min, Math.min(max, v)); }

function onResizeRepositionAll() {
  // Recompute bar positions on resize to keep widths aligned
  const rows = board.querySelectorAll(".activity-row");
  rows.forEach((row, rowIdx) => {
    const weekCells = Array.from(row.querySelectorAll(".week-cell"));
    const act = activities[rowIdx];
    act.blocks.forEach((block, i) => {
      const bar = weekCells[block.start - 1].querySelector(".bar");
      if (bar) positionBar(bar, block, weekCells);
    });
  });
}

window.addEventListener("resize", onResizeRepositionAll);

// Initial render
render();

/* Optional: expose a minimal API for future customization */
window.BuildSeasonTimeline = {
  getData: () => structuredClone(activities),
  setData: (data) => { activities = structuredClone(data); render(); saveState(activities); },
  weeks: WEEKS.slice(),
};
