// Small helpers for the timeline page

// Add keyboard shortcuts for selected segment (by last clicked)
(function() {
  let lastSeg = null;
  document.addEventListener('click', (e) => {
    const seg = e.target.closest('.segment');
    if (seg) lastSeg = seg;
  });

  document.addEventListener('keydown', (e) => {
    const grid = document.getElementById('timelineGrid');
    if (!grid || !lastSeg) return;
    const row = parseInt(lastSeg.dataset.row);
    const sIdx = parseInt(lastSeg.dataset.seg);
    const rows = window.timelineGetRows?.() || null;
    if (!rows) return;

    const seg = rows[row].segments[sIdx];
    const step = e.shiftKey ? 0.5 : 1;

    if (['ArrowLeft','ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const dir = e.key === 'ArrowLeft' ? -1 : 1;
      seg.start = Math.max(1, Math.min(9, seg.start + dir*step));
      seg.end   = Math.max(seg.start + step, Math.min(9, seg.end + dir*step));
      window.timelineSetRows(rows);
    } else if (e.key === 'Delete') {
      e.preventDefault();
      rows[row].segments.splice(sIdx,1);
      window.timelineSetRows(rows);
      lastSeg = null;
    } else if (e.key.toLowerCase() === 'd') {
      e.preventDefault();
      rows[row].segments.splice(sIdx+1,0,JSON.parse(JSON.stringify(seg)));
      window.timelineSetRows(rows);
    }
  });

  // Optional API for main page to share state
  window.timelineGetRows = () => {
    const year = window.timelineCurrentYear?.();
    if (!year) return null;
    return window.timelineMemory?.get(year) || null;
  };
})();
