// Lightweight enhancements for the description editor and checklist persistence
// Keeps the rest of the page unchanged.

import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

function setupDescriptionEditor(editor, toolbar) {
  if (!editor || !toolbar) return;

  toolbar.addEventListener("click", (e) => {
    const btn = e.target.closest(".format-btn");
    if (!btn) return;
    const fmt = btn.dataset.format;
    if (fmt === "checklist-add") {
      e.preventDefault();
      insertChecklistLine(editor);
    } else if (fmt === "checklist-toggle") {
      e.preventDefault();
      toggleChecklistLineInEditor(editor);
    }
  });

  editor.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    const block = getCurrentBlock(editor);
    if (!block) return;
    const text = (block.textContent || "").trimStart();
    if (/^[-]\s*\[[ xX]\]\s*/.test(text)) {
      e.preventDefault();
      insertChecklistLine(editor, block);
    }
  });
}

function getCurrentBlock(editor) {
  const sel = document.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node = sel.anchorNode;
  if (!node) return null;
  while (node && node !== editor && node.parentNode !== editor) node = node.parentNode;
  if (node === editor) return null;
  return node;
}

function placeCaretAtEnd(el) {
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function insertChecklistLine(editor, afterBlock = null) {
  const line = document.createElement("div");
  line.textContent = "- [ ] ";
  if (afterBlock && afterBlock.parentNode === editor) {
    afterBlock.insertAdjacentElement("afterend", line);
  } else {
    const block = getCurrentBlock(editor);
    if (block && block.parentNode === editor) block.insertAdjacentElement("afterend", line);
    else editor.appendChild(line);
  }
  placeCaretAtEnd(line);
}

function toggleChecklistLineInEditor(editor) {
  const block = getCurrentBlock(editor);
  if (!block) return;
  const original = block.textContent || "";
  const m = original.match(/^(\s*-\s*\[)([ xX])(\]\s*)(.*)$/);
  if (m) {
    const newMark = m[2].toLowerCase() === "x" ? " " : "x";
    block.textContent = `${m[1]}${newMark}${m[3]}${m[4]}`;
  } else {
    block.textContent = `- [ ] ${original.replace(/^\s+/, "")}`;
  }
  placeCaretAtEnd(block);
}

// Persist checklist toggles from task cards to Firestore
// These checkboxes are rendered by tasks.html from description text lines
// and include data-task-id and data-line-index attributes

document.addEventListener("change", async (e) => {
  const cb = e.target;
  if (!(cb instanceof HTMLInputElement)) return;
  if (!cb.classList.contains("desc-checkbox")) return;

  const taskId = cb.getAttribute("data-task-id");
  const lineIndexStr = cb.getAttribute("data-line-index");
  if (!taskId || lineIndexStr == null) return;
  const lineIndex = parseInt(lineIndexStr, 10);
  if (Number.isNaN(lineIndex)) return;

  try {
    const db = window.firestoreDB; // already exposed in tasks.html
    if (!db) return;
    const ref = doc(db, "tasks", taskId);
    const snap = await getDoc(ref);
    const cur = snap.exists() ? (snap.data().description || "") : "";

    const toggleFn = window.toggleChecklistLine || toggleChecklistLineLocal;
    const next = toggleFn(cur, lineIndex);

    await setDoc(ref, { description: next }, { merge: true });

    if (typeof window.renderBoard === "function") setTimeout(() => window.renderBoard(), 0);
  } catch (err) {
    console.error("Failed to persist checklist toggle:", err);
  }
});

function toggleChecklistLineLocal(desc, lineIndex) {
  const lines = String(desc || "").split(/\r?\n/);
  if (lineIndex < 0 || lineIndex >= lines.length) return desc;
  const line = lines[lineIndex];
  const m = line.match(/^(\s*-\s*\[)([ xX])(\]\s*)(.*)$/);
  if (!m) return desc;
  const newMark = m[2].toLowerCase() === "x" ? " " : "x";
  lines[lineIndex] = `${m[1]}${newMark}${m[3]}${m[4]}`;
  return lines.join("\n");
}

(function autoInit() {
  const editor = document.getElementById("newDescription");
  const toolbar = document.getElementById("newDescToolbar");
  setupDescriptionEditor(editor, toolbar);
})();
