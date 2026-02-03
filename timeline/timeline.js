/**
 * Interactive Timeline - Build Season Planning
 * Provides resizable activity bars with slider-style controls and localStorage persistence
 * Resize-only model: no dragging, only resize handles on both ends
 */

(function() {
  'use strict';

  // Default activities matching the design requirements
  const DEFAULT_ACTIVITIES = [
    { id: 1, name: 'Initial Strategy', note: '(First 2–3 days)', startWeek: 1, duration: 1 },
    { id: 2, name: 'Mechanism Brainstorming + Choosing concepts', note: '(≈2 days)', startWeek: 1, duration: 2 },
    { id: 3, name: 'Prototyping', note: '', startWeek: 1, duration: 2 },
    { id: 4, name: 'Detailed Design', note: '', startWeek: 2, duration: 2 },
    { id: 5, name: 'Mechanism Fabrication', note: '', startWeek: 3, duration: 3 },
    { id: 6, name: 'Assembly', note: '(includes wiring)', startWeek: 5, duration: 2 },
    { id: 7, name: 'Initial Programming', note: '', startWeek: 4, duration: 2 },
    { id: 8, name: 'Test and Finalize Programming', note: '', startWeek: 6, duration: 2 },
    { id: 9, name: 'Practice/Testing', note: '', startWeek: 7, duration: 2 },
    { id: 10, name: 'Iterating', note: '', startWeek: 5, duration: 4 }
  ];

  const WEEKS = ['1', '2', '3', '4', '5', '6', '7', '8+'];
  const STORAGE_KEY = 'timeline-data-v1';
  
  let activities = [];
  let selectedBarId = null;
  let resizeState = null;
  let activeHandle = null; // Track which handle was last used for keyboard control

  // Initialize
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    loadData();
    renderBoard();
    attachEventListeners();
    setupKeyboardNav();
  }

  // Load data from localStorage or use defaults
  function loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        activities = JSON.parse(stored);
      } else {
        activities = JSON.parse(JSON.stringify(DEFAULT_ACTIVITIES));
        saveData();
      }
    } catch (e) {
      console.error('Failed to load timeline data:', e);
      activities = JSON.parse(JSON.stringify(DEFAULT_ACTIVITIES));
    }
  }

  // Save data to localStorage
  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
      showSaveStatus('Saved');
    } catch (e) {
      console.error('Failed to save timeline data:', e);
      showSaveStatus('Save failed', true);
    }
  }

  // Show save status message
  function showSaveStatus(message, isError = false) {
    const status = document.getElementById('saveStatus');
    if (!status) return;
    
    status.textContent = message;
    status.style.color = isError ? '#ef4444' : '#10b981';
    
    setTimeout(() => {
      status.textContent = '';
    }, 2000);
  }

  // Render the timeline board
  function renderBoard() {
    const board = document.getElementById('timelineBoard');
    if (!board) return;

    board.innerHTML = '';

    // Add headers
    const activityHeader = createHeader('ACTIVITY', true);
    board.appendChild(activityHeader);
    
    WEEKS.forEach(week => {
      const weekHeader = createHeader(week, false);
      board.appendChild(weekHeader);
    });

    // Add activity rows
    activities.forEach(activity => {
      renderActivityRow(activity, board);
    });
  }

  function createHeader(text, isFirst) {
    const header = document.createElement('div');
    header.className = 'timeline-header';
    header.textContent = text;
    header.setAttribute('role', 'columnheader');
    if (!isFirst) {
      header.setAttribute('aria-label', `Week ${text}`);
    }
    return header;
  }

  function renderActivityRow(activity, board) {
    // Activity label cell
    const label = document.createElement('div');
    label.className = 'activity-label';
    label.setAttribute('role', 'rowheader');
    const nameText = document.createTextNode(activity.name + ' ');
    label.appendChild(nameText);
    if (activity.note) {
      const noteSpan = document.createElement('span');
      noteSpan.className = 'activity-note';
      noteSpan.textContent = activity.note;
      label.appendChild(noteSpan);
    }
    label.title = 'Click to edit activity name';
    label.addEventListener('click', () => editActivityName(activity));
    board.appendChild(label);

    // Week cells
    for (let week = 1; week <= WEEKS.length; week++) {
      const cell = document.createElement('div');
      cell.className = 'week-cell';
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('data-week', week);
      cell.setAttribute('data-activity-id', activity.id);
      cell.setAttribute('aria-label', `Week ${WEEKS[week - 1]} for ${activity.name}`);

      // Add bar if this activity spans this week
      if (week >= activity.startWeek && week < activity.startWeek + activity.duration) {
        if (week === activity.startWeek) {
          const bar = createActivityBar(activity);
          cell.appendChild(bar);
        }
      }

      board.appendChild(cell);
    }
  }

  function createActivityBar(activity) {
    const bar = document.createElement('div');
    bar.className = 'activity-bar';
    bar.setAttribute('data-activity-id', activity.id);
    bar.setAttribute('role', 'button');
    bar.setAttribute('tabindex', '0');
    bar.setAttribute('aria-label', `${activity.name} bar spanning ${activity.duration} week(s) starting at week ${activity.startWeek}. Use resize handles to adjust. Press L or R to switch active handle, Arrow keys to resize, Enter to edit.`);
    bar.textContent = activity.name;
    
    // Calculate width based on duration
    const widthPercent = activity.duration * 100;
    bar.style.width = `${widthPercent}%`;
    bar.style.left = '0';

    // Add resize handles
    const leftHandle = document.createElement('div');
    leftHandle.className = 'resize-handle left';
    leftHandle.setAttribute('aria-label', 'Resize bar from left');
    leftHandle.setAttribute('data-direction', 'left');
    bar.appendChild(leftHandle);

    const rightHandle = document.createElement('div');
    rightHandle.className = 'resize-handle right';
    rightHandle.setAttribute('aria-label', 'Resize bar from right');
    rightHandle.setAttribute('data-direction', 'right');
    bar.appendChild(rightHandle);

    // Attach event listeners
    attachBarEventListeners(bar, activity);

    return bar;
  }

  function attachBarEventListeners(bar, activity) {
    // Click on bar body for selection (not for dragging)
    bar.addEventListener('click', (e) => {
      if (!e.target.classList.contains('resize-handle') && !resizeState) {
        selectBar(activity.id);
      }
    });

    // Pointer events for resize handles only
    bar.addEventListener('pointerdown', (e) => {
      if (e.target.classList.contains('resize-handle')) {
        e.preventDefault();
        e.stopPropagation();
        const direction = e.target.getAttribute('data-direction');
        startResize(e, activity, direction, e.target);
      }
    });

    // Keyboard support
    bar.addEventListener('keydown', (e) => {
      handleBarKeydown(e, activity);
    });

    // Focus selection
    bar.addEventListener('focus', () => {
      selectBar(activity.id);
    });
  }

  function startResize(e, activity, direction, handleElement) {
    const bar = handleElement.closest('.activity-bar');
    bar.setPointerCapture(e.pointerId);
    bar.classList.add('resizing');
    
    // Track active handle for keyboard control
    activeHandle = direction;
    
    resizeState = {
      activity,
      bar,
      pointerId: e.pointerId,
      direction,
      startX: e.clientX,
      startWeek: activity.startWeek,
      startDuration: activity.duration
    };

    document.addEventListener('pointermove', handleResizeMove);
    document.addEventListener('pointerup', handleResizeEnd);
  }

  function handleResizeMove(e) {
    if (!resizeState) return;
    
    const board = document.getElementById('timelineBoard');
    const cells = board.querySelectorAll(`.week-cell[data-activity-id="${resizeState.activity.id}"]`);
    const cellWidth = cells[0].getBoundingClientRect().width;
    
    const deltaX = e.clientX - resizeState.startX;
    const deltaWeeks = Math.round(deltaX / cellWidth);
    
    if (resizeState.direction === 'left') {
      // Resize from left - adjust start week
      const newStartWeek = Math.max(1, resizeState.startWeek + deltaWeeks);
      const newDuration = resizeState.startDuration - (newStartWeek - resizeState.startWeek);
      
      if (newDuration >= 1 && newStartWeek + newDuration - 1 <= WEEKS.length) {
        resizeState.activity.startWeek = newStartWeek;
        resizeState.activity.duration = newDuration;
        renderBoard();
        selectBar(resizeState.activity.id);
      }
    } else {
      // Resize from right - adjust duration
      const newDuration = Math.max(1, resizeState.startDuration + deltaWeeks);
      
      if (resizeState.activity.startWeek + newDuration - 1 <= WEEKS.length) {
        resizeState.activity.duration = newDuration;
        renderBoard();
        selectBar(resizeState.activity.id);
      }
    }
  }

  function handleResizeEnd(e) {
    if (!resizeState) return;
    
    const bar = resizeState.bar;
    bar.releasePointerCapture(resizeState.pointerId);
    bar.classList.remove('resizing');
    
    // Add elastic animation
    bar.classList.add('animate-resize');
    setTimeout(() => {
      const currentBar = document.querySelector(`.activity-bar[data-activity-id="${resizeState.activity.id}"]`);
      if (currentBar) {
        currentBar.classList.remove('animate-resize');
      }
    }, 400);
    
    document.removeEventListener('pointermove', handleResizeMove);
    document.removeEventListener('pointerup', handleResizeEnd);
    
    saveData();
    resizeState = null;
  }

  function selectBar(activityId) {
    selectedBarId = activityId;
    
    document.querySelectorAll('.activity-bar').forEach(bar => {
      bar.classList.remove('selected');
    });
    
    const bar = document.querySelector(`.activity-bar[data-activity-id="${activityId}"]`);
    if (bar) {
      bar.classList.add('selected');
      bar.focus();
    }
  }

  function handleBarKeydown(e, activity) {
    if (e.key === 'Enter') {
      e.preventDefault();
      editActivityName(activity);
      return;
    }

    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      return;
    }

    e.preventDefault();
    
    // Default to right handle if no active handle
    const handle = activeHandle || 'right';
    const step = e.shiftKey ? 2 : 1; // Shift for faster resize

    if (e.key === 'ArrowLeft') {
      if (handle === 'left') {
        // Expand from left (move start earlier)
        const newStartWeek = Math.max(1, activity.startWeek - step);
        const actualStep = activity.startWeek - newStartWeek;
        activity.startWeek = newStartWeek;
        activity.duration += actualStep;
      } else {
        // Shrink from right
        const newDuration = Math.max(1, activity.duration - step);
        activity.duration = newDuration;
      }
    } else if (e.key === 'ArrowRight') {
      if (handle === 'left') {
        // Shrink from left (move start later)
        const maxShrink = Math.min(step, activity.duration - 1);
        activity.startWeek += maxShrink;
        activity.duration -= maxShrink;
      } else {
        // Expand from right
        const maxExpansion = WEEKS.length - activity.startWeek + 1 - activity.duration;
        const actualStep = Math.min(step, maxExpansion);
        activity.duration += actualStep;
      }
    }
    
    renderBoard();
    saveData();
    selectBar(activity.id);
  }

  function editActivityName(activity) {
    const newName = prompt('Edit activity name:', activity.name);
    if (newName && newName.trim()) {
      activity.name = newName.trim();
      renderBoard();
      saveData();
    }
  }

  function setupKeyboardNav() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        selectedBarId = null;
        activeHandle = null;
        document.querySelectorAll('.activity-bar').forEach(bar => {
          bar.classList.remove('selected');
        });
      }
      
      // Tab/L to switch to left handle, Tab/R to switch to right handle
      if (selectedBarId && (e.key === 'l' || e.key === 'L')) {
        activeHandle = 'left';
        showSaveStatus('Left handle active');
      } else if (selectedBarId && (e.key === 'r' || e.key === 'R')) {
        activeHandle = 'right';
        showSaveStatus('Right handle active');
      }
    });
  }

  function attachEventListeners() {
    // Reset button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset timeline to default activities? This will erase all changes.')) {
          activities = JSON.parse(JSON.stringify(DEFAULT_ACTIVITIES));
          saveData();
          renderBoard();
          showSaveStatus('Reset to defaults');
        }
      });
    }

    // Export JSON button
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', exportJSON);
    }

    // Export PNG button
    const exportPngBtn = document.getElementById('exportPngBtn');
    if (exportPngBtn) {
      exportPngBtn.addEventListener('click', exportPNG);
    }
  }

  function exportJSON() {
    const data = {
      version: 1,
      exportDate: new Date().toISOString(),
      weeks: WEEKS,
      activities: activities
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeline-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showSaveStatus('JSON exported');
  }

  async function exportPNG() {
    // Check if html2canvas is available
    if (typeof html2canvas === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      
      script.onload = () => {
        performPNGExport();
      };
      
      script.onerror = () => {
        alert('Could not load html2canvas library. Please check your internet connection and try again.');
      };
      
      document.head.appendChild(script);
    } else {
      performPNGExport();
    }
  }

  async function performPNGExport() {
    const board = document.getElementById('timelineBoard');
    if (!board) return;

    showSaveStatus('Generating PNG...');

    try {
      const canvas = await html2canvas(board, {
        backgroundColor: null,
        scale: 2,
        logging: false
      });

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timeline-${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showSaveStatus('PNG exported');
      }, 'image/png');
    } catch (error) {
      console.error('PNG export failed:', error);
      showSaveStatus('PNG export failed', true);
    }
  }

  // Expose minimal API for customization
  window.Timeline = {
    getActivities: () => JSON.parse(JSON.stringify(activities)),
    setActivities: (newActivities) => {
      activities = newActivities;
      saveData();
      renderBoard();
    },
    reset: () => {
      activities = JSON.parse(JSON.stringify(DEFAULT_ACTIVITIES));
      saveData();
      renderBoard();
    }
  };

})();
