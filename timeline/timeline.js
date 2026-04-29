/**
 * Build Season Timeline — Date-based Gantt Chart
 *
 * Features:
 *  - Sub-teams displayed as color-coded rows with a single work-window bar
 *  - Drag handles on bar edges to resize start/end dates
 *  - Keyboard-accessible editing (arrow keys, Enter, Escape)
 *  - Edit panel with date pickers, name + color inputs, delete
 *  - Season date range + zoom level (Full / 8w / 4w / 2w)
 *  - Today indicator line
 *  - LocalStorage persistence; Reset to defaults; Export/Import JSON
 *  - Multi-theme support via html.theme-* classes
 */
(function () {
  'use strict';

  // ── Constants ───────────────────────────────────────────────────────────────

  const STORAGE_KEY  = 'timeline-gantt-v2';
  const MIN_BAR_DAYS = 1;

  /** Default FRC build-season window (adjust year as needed). */
  const DEFAULT_SEASON = { start: '2025-01-04', end: '2025-02-17' };

  /** Default sub-team roster with overlapping windows. */
  const DEFAULT_SUBTEAMS = [
    { id: 1, name: 'CAD / Design',    color: '#3b82f6', start: '2025-01-04', end: '2025-01-24' },
    { id: 2, name: 'Mechanical',      color: '#ef4444', start: '2025-01-11', end: '2025-02-14' },
    { id: 3, name: 'Electrical',      color: '#f59e0b', start: '2025-01-18', end: '2025-02-14' },
    { id: 4, name: 'Programming',     color: '#8b5cf6', start: '2025-01-11', end: '2025-02-17' },
    { id: 5, name: 'Drive Practice',  color: '#10b981', start: '2025-01-25', end: '2025-02-17' },
    { id: 6, name: 'Outreach',        color: '#ec4899', start: '2025-01-04', end: '2025-02-17' },
  ];

  // ── State ───────────────────────────────────────────────────────────────────

  let state = {
    season:     { ...DEFAULT_SEASON },
    zoom:       'full',
    subteams:   [],
    selectedId: null,
    nextId:     DEFAULT_SUBTEAMS.length + 1,
  };

  /** Active pointer-resize interaction. */
  let resizeState = null;

  // ── Sync state ──────────────────────────────────────────────────────────────

  /** Timer handle for debounced Firestore saves. */
  let _saveDebounceTimer = null;

  /**
   * Stable hash of the sync-relevant state fields.
   * Used to detect whether an incoming snapshot is our own committed write.
   */
  let _lastPushedHash = null;

  /** Returns a canonical JSON string of the fields that are synced. */
  function hashState(s) {
    return JSON.stringify({ season: s.season, zoom: s.zoom, subteams: s.subteams, nextId: s.nextId });
  }

  // ── Date Helpers ────────────────────────────────────────────────────────────

  /**
   * Parse "YYYY-MM-DD" → integer days since UTC epoch.
   * Using UTC avoids DST-induced off-by-one errors.
   */
  function dateToDays(str) {
    if (!str) return 0;
    const [y, m, d] = str.split('-').map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  }

  /** Integer days since UTC epoch → "YYYY-MM-DD". */
  function daysToDate(days) {
    const d = new Date(days * 86400000);
    return [
      d.getUTCFullYear(),
      String(d.getUTCMonth() + 1).padStart(2, '0'),
      String(d.getUTCDate()).padStart(2, '0'),
    ].join('-');
  }

  /** Format a "YYYY-MM-DD" string as "Jan 4" (short) or "Jan 4, 2025". */
  function fmtDate(str, short = false) {
    if (!str) return '';
    const [y, m, d] = str.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    const opts = { month: 'short', day: 'numeric', timeZone: 'UTC' };
    if (!short) opts.year = 'numeric';
    return dt.toLocaleDateString('en-US', opts);
  }

  /** Today as "YYYY-MM-DD" in local time. */
  function todayStr() {
    const n = new Date();
    return [
      n.getFullYear(),
      String(n.getMonth() + 1).padStart(2, '0'),
      String(n.getDate()).padStart(2, '0'),
    ].join('-');
  }

  // ── View Range ──────────────────────────────────────────────────────────────

  function getViewRange() {
    const sd = dateToDays(state.season.start);
    const ed = dateToDays(state.season.end);
    if (state.zoom === 'full') return { s: sd, e: ed };
    const weeks = state.zoom === '8w' ? 8 : state.zoom === '4w' ? 4 : 2;
    return { s: sd, e: sd + weeks * 7 };
  }

  // ── Persistence ─────────────────────────────────────────────────────────────

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Merge carefully so new fields get defaults
        state = Object.assign(state, parsed);
        // Recompute nextId to avoid collisions
        state.nextId = state.subteams.reduce((mx, t) => Math.max(mx, t.id + 1), state.nextId);
      } else {
        state.subteams = clone(DEFAULT_SUBTEAMS);
        saveState(false);
      }
    } catch (e) {
      console.warn('[Timeline] Load error:', e);
      state.subteams = clone(DEFAULT_SUBTEAMS);
    }
  }

  function saveState(notify = true) {
    // Always persist to localStorage for instant offline fallback
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('[Timeline] localStorage save error:', e);
    }

    if (notify) showSaveStatus('Saving…');

    // Debounce remote save so rapid edits (drag, keyboard) don't flood Firestore
    clearTimeout(_saveDebounceTimer);
    _saveDebounceTimer = setTimeout(async () => {
      const sync = window._timelineSync;
      if (!sync?.isAvailable) {
        if (notify) showSaveStatus('Saved locally ✓');
        return;
      }
      try {
        const payload = {
          season:    state.season,
          zoom:      state.zoom,
          subteams:  state.subteams,
          nextId:    state.nextId,
          updatedAt: new Date().toISOString(),
        };
        _lastPushedHash = hashState(state);
        await sync.save(payload);
        if (notify) showSaveStatus('Synced ✓');
      } catch (err) {
        console.error('[Timeline] Firestore save error:', err);
        if (notify) showSaveStatus('Saved locally ✓');
      }
    }, 1500);
  }

  function showSaveStatus(msg, isError = false) {
    const el = document.getElementById('saveStatus');
    if (!el) return;
    el.textContent = msg;
    el.style.color = isError ? '#ef4444' : '#10b981';
    clearTimeout(showSaveStatus._t);
    // Persist error messages; transient success/status messages fade after 2 s
    if (!isError) {
      showSaveStatus._t = setTimeout(() => { el.textContent = ''; }, 2000);
    }
  }

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  // ── Render Entry Point ──────────────────────────────────────────────────────

  function render() {
    syncControlInputs();
    renderDateAxis();
    renderBody();
    renderLegend();
    syncEditPanel();
  }

  // ── Sync controls → reflect current state ──────────────────────────────────

  function syncControlInputs() {
    setVal('seasonStart', state.season.start);
    setVal('seasonEnd',   state.season.end);
    setVal('zoomSelect',  state.zoom);
  }

  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  // ── Date Axis ───────────────────────────────────────────────────────────────

  function renderDateAxis() {
    const axis = document.getElementById('ganttDateAxis');
    if (!axis) return;
    axis.innerHTML = '';

    const { s: vs, e: ve } = getViewRange();
    const total = ve - vs;
    if (total <= 0) return;

    // Choose tick interval based on total days
    const tickDays = total <= 14 ? 1 : total <= 60 ? 7 : 14;

    // Align first tick to a clean multiple of tickDays from epoch
    const firstTick = tickDays === 1
      ? vs
      : Math.ceil(vs / tickDays) * tickDays;

    // Today line inside the axis
    addTodayLine(axis, vs, total, true);

    // Tick lines + labels
    for (let t = firstTick; t <= ve; t += tickDays) {
      const pct = ((t - vs) / total) * 100;

      // Gridline (also extends into body rows via CSS)
      const line = document.createElement('div');
      line.className = 'gantt-tick-line';
      line.style.left = `${pct}%`;
      axis.appendChild(line);

      // Label
      const lbl = document.createElement('div');
      lbl.className = 'gantt-date-tick';
      lbl.style.left = `${pct}%`;
      lbl.textContent = fmtDate(daysToDate(t), true);
      axis.appendChild(lbl);
    }
  }

  /** Create a today-indicator line and append it to `container`. */
  function addTodayLine(container, viewStart, totalDays, inAxis) {
    const td = dateToDays(todayStr());
    if (td < viewStart || td > viewStart + totalDays) return;
    const pct = ((td - viewStart) / totalDays) * 100;
    const el = document.createElement('div');
    el.className = 'gantt-today-line';
    el.style.left = `${pct}%`;
    if (inAxis) el.setAttribute('data-in-axis', 'true');
    el.setAttribute('aria-label', `Today: ${fmtDate(todayStr())}`);
    el.title = `Today: ${fmtDate(todayStr())}`;
    container.appendChild(el);
  }

  // ── Body Rows ────────────────────────────────────────────────────────────────

  function renderBody() {
    const body = document.getElementById('ganttBody');
    if (!body) return;
    body.innerHTML = '';

    if (state.subteams.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'gantt-empty';
      empty.textContent = 'No sub-teams yet — click "+ Add Team" to get started.';
      body.appendChild(empty);
      return;
    }

    const { s: vs, e: ve } = getViewRange();
    const total = ve - vs;
    if (total <= 0) return;

    state.subteams.forEach(team => {
      const isSelected = team.id === state.selectedId;

      // ── Row ──
      const row = document.createElement('div');
      row.className = 'gantt-row' + (isSelected ? ' selected' : '');
      row.dataset.id = team.id;
      row.setAttribute('role', 'row');

      // ── Label cell ──
      const label = document.createElement('div');
      label.className = 'gantt-label-col gantt-label-cell';
      label.setAttribute('role', 'rowheader');
      label.setAttribute('tabindex', '0');
      label.setAttribute('aria-label', `${team.name}: click to edit`);
      label.title = `${team.name}\n${fmtDate(team.start)} → ${fmtDate(team.end)}`;

      const swatch = document.createElement('span');
      swatch.className = 'gantt-color-swatch';
      swatch.style.background = team.color;
      swatch.setAttribute('aria-hidden', 'true');

      const nameEl = document.createElement('span');
      nameEl.textContent = team.name;

      label.appendChild(swatch);
      label.appendChild(nameEl);

      label.addEventListener('click', () => selectTeam(team.id));
      label.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectTeam(team.id);
        }
      });

      // ── Track cell ──
      const track = document.createElement('div');
      track.className = 'gantt-track-col gantt-track';
      track.setAttribute('role', 'gridcell');

      // Today line in this row's track
      addTodayLine(track, vs, total, false);

      // ── Bar ──
      const startD = dateToDays(team.start);
      const endD   = dateToDays(team.end);

      // Clamp to view: don't render if entirely outside
      if (endD >= vs && startD <= ve) {
        const leftPct  = Math.max(0, (startD - vs) / total * 100);
        const rightPct = Math.min(100, (endD   - vs) / total * 100);
        const widthPct = Math.max(0, rightPct - leftPct);

        const bar = document.createElement('div');
        bar.className = 'gantt-bar';
        bar.dataset.id = team.id;
        bar.style.left       = `${leftPct}%`;
        bar.style.width      = `${widthPct}%`;
        bar.style.background = team.color;
        bar.setAttribute('role', 'button');
        bar.setAttribute('tabindex', '0');
        setBarAria(bar, team);

        // Set neon glow CSS variable
        bar.style.setProperty('--bar-glow', hexToGlow(team.color));

        // Label inside bar
        const barLbl = document.createElement('span');
        barLbl.className = 'gantt-bar-label';
        barLbl.textContent = team.name;
        bar.appendChild(barLbl);

        // Left resize handle
        const lh = document.createElement('div');
        lh.className = 'gantt-handle gantt-handle-left';
        lh.setAttribute('aria-label', `Drag to change ${team.name} start date`);
        lh.setAttribute('tabindex', '-1');
        bar.appendChild(lh);

        // Right resize handle
        const rh = document.createElement('div');
        rh.className = 'gantt-handle gantt-handle-right';
        rh.setAttribute('aria-label', `Drag to change ${team.name} end date`);
        rh.setAttribute('tabindex', '-1');
        bar.appendChild(rh);

        // Pointer events
        bar.addEventListener('click', e => {
          if (!resizeState) { e.stopPropagation(); selectTeam(team.id); }
        });
        bar.addEventListener('focus', () => { if (!resizeState) selectTeam(team.id); });
        bar.addEventListener('keydown', e => handleBarKeydown(e, team));
        lh.addEventListener('pointerdown', e => startResize(e, team, 'left',  track));
        rh.addEventListener('pointerdown', e => startResize(e, team, 'right', track));

        track.appendChild(bar);
      }

      row.appendChild(label);
      row.appendChild(track);
      body.appendChild(row);
    });
  }

  function setBarAria(bar, team) {
    bar.setAttribute('aria-label',
      `${team.name}: ${fmtDate(team.start)} to ${fmtDate(team.end)}. ` +
      'Press Enter to edit. Arrow keys adjust end date.');
    bar.title = `${team.name}\n${fmtDate(team.start)} → ${fmtDate(team.end)}`;
  }

  /** Convert a hex color to an rgba glow string for CSS custom property. */
  function hexToGlow(hex) {
    try {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},0.65)`;
    } catch { return 'rgba(255,255,255,0.4)'; }
  }

  // ── Legend ───────────────────────────────────────────────────────────────────

  function renderLegend() {
    const el = document.getElementById('teamLegend');
    if (!el) return;
    el.innerHTML = '';
    state.subteams.forEach(team => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'tl-legend-item';
      item.setAttribute('aria-label', `Select ${team.name}`);
      item.style.color = team.color;

      const sw = document.createElement('span');
      sw.className = 'tl-legend-swatch';
      sw.style.background = team.color;

      item.appendChild(sw);
      item.appendChild(document.createTextNode(team.name));
      item.addEventListener('click', () => selectTeam(team.id));
      el.appendChild(item);
    });
  }

  // ── Selection ────────────────────────────────────────────────────────────────

  function selectTeam(id) {
    state.selectedId = id;
    // Update row CSS
    document.querySelectorAll('.gantt-row').forEach(row => {
      row.classList.toggle('selected', Number(row.dataset.id) === id);
    });
    syncEditPanel();
    // Scroll edit panel into view
    const pw = document.getElementById('editPanelWrapper');
    if (pw && !pw.hidden) {
      requestAnimationFrame(() => pw.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    }
  }

  // ── Edit Panel ───────────────────────────────────────────────────────────────

  function syncEditPanel() {
    const pw = document.getElementById('editPanelWrapper');
    const team = state.subteams.find(t => t.id === state.selectedId);
    if (!team) {
      if (pw) pw.hidden = true;
      return;
    }
    if (pw) pw.hidden = false;

    const errorEl = document.getElementById('editError');
    if (errorEl) errorEl.textContent = '';

    setVal('editName',  team.name);
    setVal('editColor', team.color);
    setVal('editStart', team.start);
    setVal('editEnd',   team.end);
  }

  function handleEditSubmit(e) {
    e.preventDefault();
    const errEl = document.getElementById('editError');
    if (errEl) errEl.textContent = '';

    const team = state.subteams.find(t => t.id === state.selectedId);
    if (!team) return;

    const name  = (document.getElementById('editName')?.value  ?? '').trim();
    const color = document.getElementById('editColor')?.value  ?? team.color;
    const start = document.getElementById('editStart')?.value  ?? '';
    const end   = document.getElementById('editEnd')?.value    ?? '';

    if (!name)  { showFieldError(errEl, 'Name cannot be empty.'); return; }
    if (!start || !end) { showFieldError(errEl, 'Start and end dates are required.'); return; }
    if (dateToDays(end) < dateToDays(start)) {
      showFieldError(errEl, 'End date must be on or after start date.'); return;
    }

    team.name  = name;
    team.color = color;
    team.start = start;
    team.end   = end;

    saveState();
    render();
  }

  function showFieldError(el, msg) {
    if (el) el.textContent = msg;
  }

  // ── Drag Resize ──────────────────────────────────────────────────────────────

  function startResize(e, team, direction, trackEl) {
    e.preventDefault();
    e.stopPropagation();

    const bar = trackEl.querySelector(`.gantt-bar[data-id="${team.id}"]`);
    if (!bar) return;

    bar.setPointerCapture(e.pointerId);
    bar.classList.add('resizing');

    const { s: vs, e: ve } = getViewRange();
    const trackRect = trackEl.getBoundingClientRect();

    resizeState = {
      team,
      direction,
      startX:       e.clientX,
      origStart:    team.start,
      origEnd:      team.end,
      trackWidth:   trackRect.width,
      viewStart:    vs,
      viewTotalDays: ve - vs,
      pointerId:    e.pointerId,
      bar,
    };

    document.addEventListener('pointermove', onResizeMove, { passive: false });
    document.addEventListener('pointerup',   onResizeEnd);
  }

  function onResizeMove(e) {
    if (!resizeState) return;
    e.preventDefault();

    const { team, direction, startX, origStart, origEnd,
            trackWidth, viewStart, viewTotalDays, bar } = resizeState;

    const deltaX    = e.clientX - startX;
    const deltaDays = Math.round((deltaX / trackWidth) * viewTotalDays);

    if (direction === 'left') {
      const origSD  = dateToDays(origStart);
      const origED  = dateToDays(origEnd);
      const newSD   = Math.min(origSD + deltaDays, origED - MIN_BAR_DAYS);
      team.start = daysToDate(newSD);
    } else {
      const origSD  = dateToDays(origStart);
      const origED  = dateToDays(origEnd);
      const newED   = Math.max(origED + deltaDays, origSD + MIN_BAR_DAYS);
      team.end = daysToDate(newED);
    }

    // Live-update bar position (no full re-render for smoothness)
    const { s: vs, e: ve } = getViewRange();
    const total     = ve - vs;
    const sd        = dateToDays(team.start);
    const ed        = dateToDays(team.end);
    const leftPct   = Math.max(0, (sd - vs) / total * 100);
    const rightPct  = Math.min(100, (ed - vs) / total * 100);
    const widthPct  = Math.max(0, rightPct - leftPct);

    bar.style.left  = `${leftPct}%`;
    bar.style.width = `${widthPct}%`;
    setBarAria(bar, team);
  }

  function onResizeEnd() {
    if (!resizeState) return;
    const { bar, pointerId } = resizeState;
    try { bar.releasePointerCapture(pointerId); } catch (_) {}
    bar.classList.remove('resizing');

    document.removeEventListener('pointermove', onResizeMove);
    document.removeEventListener('pointerup',   onResizeEnd);

    resizeState = null;
    saveState();
    render(); // full re-render so edit panel & legend update
  }

  // ── Keyboard ─────────────────────────────────────────────────────────────────

  function handleBarKeydown(e, team) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectTeam(team.id);
      requestAnimationFrame(() => document.getElementById('editName')?.focus());
      return;
    }

    const step = e.shiftKey ? 7 : 1;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      team.end = daysToDate(dateToDays(team.end) + step);
      saveState();
      render();
      requestAnimationFrame(() => document.querySelector(`.gantt-bar[data-id="${team.id}"]`)?.focus());
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const newEnd = dateToDays(team.end) - step;
      if (newEnd >= dateToDays(team.start) + MIN_BAR_DAYS) {
        team.end = daysToDate(newEnd);
        saveState();
        render();
        requestAnimationFrame(() => document.querySelector(`.gantt-bar[data-id="${team.id}"]`)?.focus());
      }
    }
  }

  // ── Add / Delete Team ────────────────────────────────────────────────────────

  function addTeam() {
    const palette = [
      '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6',
      '#10b981', '#ec4899', '#f97316', '#06b6d4',
      '#84cc16', '#a78bfa',
    ];
    const color = palette[state.subteams.length % palette.length];
    const newTeam = {
      id:    state.nextId++,
      name:  `New Team ${state.subteams.length + 1}`,
      color,
      start: state.season.start,
      end:   state.season.end,
    };
    state.subteams.push(newTeam);
    saveState();
    render();
    selectTeam(newTeam.id);
    requestAnimationFrame(() => document.getElementById('editName')?.focus());
  }

  function deleteSelectedTeam() {
    if (!state.selectedId) return;
    const team = state.subteams.find(t => t.id === state.selectedId);
    if (!team) return;
    if (!confirm(`Delete sub-team "${team.name}"?`)) return;
    state.subteams = state.subteams.filter(t => t.id !== state.selectedId);
    state.selectedId = null;
    saveState();
    render();
  }

  // ── Export / Import JSON ─────────────────────────────────────────────────────

  function exportJSON() {
    const payload = {
      version:    2,
      exportDate: new Date().toISOString(),
      season:     state.season,
      zoom:       state.zoom,
      subteams:   state.subteams,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `timeline-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSaveStatus('JSON exported');
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!Array.isArray(data.subteams)) throw new Error('Missing "subteams" array.');
        state.subteams    = data.subteams;
        if (data.season)  state.season = data.season;
        if (data.zoom)    state.zoom   = data.zoom;
        state.selectedId  = null;
        state.nextId      = state.subteams.reduce((mx, t) => Math.max(mx, t.id + 1), 1);
        saveState();
        render();
        showSaveStatus('Imported ✓');
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  // ── Event Wiring ─────────────────────────────────────────────────────────────

  function wireEvents() {
    // Season controls
    on('seasonStart', 'change', e => {
      state.season.start = e.target.value;
      saveState(); render();
    });
    on('seasonEnd', 'change', e => {
      state.season.end = e.target.value;
      saveState(); render();
    });
    on('zoomSelect', 'change', e => {
      state.zoom = e.target.value;
      saveState(); render();
    });

    // Buttons
    on('addTeamBtn',    'click', addTeam);
    on('exportJsonBtn', 'click', exportJSON);
    on('resetBtn',      'click', () => {
      if (!confirm('Reset timeline to defaults? All changes will be lost.')) return;
      state.subteams    = clone(DEFAULT_SUBTEAMS);
      state.season      = { ...DEFAULT_SEASON };
      state.zoom        = 'full';
      state.selectedId  = null;
      state.nextId      = DEFAULT_SUBTEAMS.length + 1;
      saveState();
      render();
    });

    // Import
    on('importJsonInput', 'change', e => {
      if (e.target.files.length) {
        importJSON(e.target.files[0]);
        e.target.value = '';
      }
    });

    // Edit form
    document.getElementById('editForm')?.addEventListener('submit', handleEditSubmit);
    on('deleteTeamBtn', 'click', deleteSelectedTeam);
    on('closeEditBtn',  'click', () => {
      state.selectedId = null;
      document.querySelectorAll('.gantt-row').forEach(r => r.classList.remove('selected'));
      const pw = document.getElementById('editPanelWrapper');
      if (pw) pw.hidden = true;
    });

    // Deselect on body background click
    document.getElementById('ganttBody')?.addEventListener('click', e => {
      if (!e.target.closest('.gantt-bar') && !e.target.closest('.gantt-label-cell')) {
        clearSelection();
      }
    });

    // Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') clearSelection();
    });

    // Re-render on window resize for accurate label positions
    window.addEventListener('resize', () => {
      clearTimeout(wireEvents._resizeTimer);
      wireEvents._resizeTimer = setTimeout(render, 120);
    });
  }

  function clearSelection() {
    state.selectedId = null;
    document.querySelectorAll('.gantt-row').forEach(r => r.classList.remove('selected'));
    const pw = document.getElementById('editPanelWrapper');
    if (pw) pw.hidden = true;
  }

  /** Shorthand: attach event listener by element id. */
  function on(id, evt, handler) {
    document.getElementById(id)?.addEventListener(evt, handler);
  }

  // ── Bootstrap ────────────────────────────────────────────────────────────────

  /**
   * Called once the Firebase sync module signals readiness.
   * Subscribes to real-time Firestore updates and applies any remote state
   * that differs from the locally-loaded snapshot.
   */
  function setupSync() {
    const sync = window._timelineSync;
    if (!sync?.isAvailable) {
      showSaveStatus('Offline – local only', true);
      return;
    }

    showSaveStatus('Connecting…');

    sync.subscribe((remoteData, meta) => {
      // hasPendingWrites = true means this is our own in-flight write; skip it.
      if (meta?.hasPendingWrites) return;

      // No remote document yet – keep local defaults and mark as ready.
      if (!remoteData) {
        showSaveStatus('Synced ✓');
        return;
      }

      const remoteHash = JSON.stringify({
        season:   remoteData.season,
        zoom:     remoteData.zoom,
        subteams: remoteData.subteams,
        nextId:   remoteData.nextId,
      });

      // Skip if this snapshot matches the last payload we pushed (our own commit).
      if (remoteHash === _lastPushedHash) {
        showSaveStatus('Synced ✓');
        return;
      }

      // A genuine remote change – apply it and re-render.
      if (remoteData.season && typeof remoteData.season === 'object')
        state.season   = remoteData.season;
      if (Array.isArray(remoteData.subteams))
        state.subteams = remoteData.subteams;
      if (typeof remoteData.zoom === 'string' && remoteData.zoom)
        state.zoom     = remoteData.zoom;
      if (typeof remoteData.nextId === 'number')
        state.nextId   = remoteData.nextId;
      state.selectedId = null; // clear any stale selection

      // Keep localStorage in sync with the latest remote state.
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}

      _lastPushedHash = remoteHash;
      render();
      showSaveStatus('Synced ✓');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    wireEvents();
    render();

    // Set up Firebase real-time sync.
    // The module script in index.html dispatches 'timeline-sync-ready' once
    // Firebase is initialised (or fails).  Handle both orderings: the module
    // may have finished before or after DOMContentLoaded.
    if (window._timelineSync !== undefined) {
      setupSync();
    } else {
      document.addEventListener('timeline-sync-ready', setupSync, { once: true });
    }
  });

  // Minimal public API for console-level customisation
  window.Timeline = {
    getSubteams:  () => clone(state.subteams),
    setSubteams:  teams => { state.subteams = teams; saveState(); render(); },
    getState:     () => clone(state),
    reset:        () => {
      state.subteams   = clone(DEFAULT_SUBTEAMS);
      state.season     = { ...DEFAULT_SEASON };
      state.selectedId = null;
      saveState(); render();
    },
  };

})();
