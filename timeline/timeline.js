/**
 * Interactive Timeline - Build Season Planning
 * Provides draggable, resizable activity bars with localStorage persistence
 */

(function() {
  'use strict';

  // Default activities matching the design requirements
  const DEFAULT_ACTIVITIES = [
    { id: 1, name: 'Initial Strategy', note: '(First 2–3 days)', startWeek: 1, duration: 1 },
    { id: 2, name: 'Mechanism Brainstorming + Choosing concepts', note: '(≈2 days)', startWeek: 1, duration: 1 },
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
  let dragState = null;
  let resizeState = null;

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
    label.innerHTML = `${activity.name} ${activity.note ? `<span style="color: #94a3b8; font-weight: 400;">${activity.note}</span>` : ''}`;
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
    bar.setAttribute('aria-label', `${activity.name} bar spanning ${activity.duration} week(s) starting at week ${activity.startWeek}`);
    bar.textContent = activity.name;
    
    // Calculate width based on duration
    const widthPercent = activity.duration * 100;
    bar.style.width = `${widthPercent}%`;
    bar.style.left = '0';

    // Add resize handles
    const leftHandle = document.createElement('div');
    leftHandle.className = 'resize-handle left';
    leftHandle.setAttribute('aria-label', 'Resize bar from left');
    bar.appendChild(leftHandle);

    const rightHandle = document.createElement('div');
    rightHandle.className = 'resize-handle right';
    rightHandle.setAttribute('aria-label', 'Resize bar from right');
    bar.appendChild(rightHandle);

    // Attach event listeners
    attachBarEventListeners(bar, activity);

    return bar;
  }

  function attachBarEventListeners(bar, activity) {
    // Pointer events for drag
    bar.addEventListener('pointerdown', (e) => {
      if (e.target.classList.contains('resize-handle')) {
        startResize(e, activity, e.target.classList.contains('left') ? 'left' : 'right');
      } else {
        startDrag(e, activity, bar);
      }
    });

    // Click for selection
    bar.addEventListener('click', (e) => {
      if (!dragState && !resizeState) {
        selectBar(activity.id);
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

  function startDrag(e, activity, bar) {
    e.preventDefault();
    e.stopPropagation();
    
    // Create ripple effect
    createRipple(e, bar);
    
    bar.classList.add('dragging');
    bar.setPointerCapture(e.pointerId);
    
    const cell = bar.closest('.week-cell');
    const cellRect = cell.getBoundingClientRect();
    
    dragState = {
      activity,
      bar,
      pointerId: e.pointerId,
      startX: e.clientX,
      startWeek: activity.startWeek,
      offsetX: e.clientX - cellRect.left
    };

    document.addEventListener('pointermove', handleDragMove);
    document.addEventListener('pointerup', handleDragEnd);
  }

  function handleDragMove(e) {
    if (!dragState) return;
    
    const board = document.getElementById('timelineBoard');
    const cells = board.querySelectorAll(`.week-cell[data-activity-id="${dragState.activity.id}"]`);
    
    // Find which cell the pointer is over
    let targetWeek = dragState.startWeek;
    cells.forEach((cell, index) => {
      const rect = cell.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right) {
        targetWeek = index + 1;
      }
    });

    // Update visual position
    const deltaWeeks = targetWeek - dragState.activity.startWeek;
    if (deltaWeeks !== 0) {
      dragState.activity.startWeek = targetWeek;
      renderBoard();
      
      // Reattach drag state to new bar
      const newBar = board.querySelector(`.activity-bar[data-activity-id="${dragState.activity.id}"]`);
      if (newBar) {
        newBar.classList.add('dragging');
        dragState.bar = newBar;
      }
    }
  }

  function handleDragEnd(e) {
    if (!dragState) return;
    
    dragState.bar.classList.remove('dragging');
    dragState.bar.releasePointerCapture(dragState.pointerId);
    
    document.removeEventListener('pointermove', handleDragMove);
    document.removeEventListener('pointerup', handleDragEnd);
    
    saveData();
    dragState = null;
  }

  function startResize(e, activity, direction) {
    e.preventDefault();
    e.stopPropagation();
    
    const bar = e.target.closest('.activity-bar');
    bar.setPointerCapture(e.pointerId);
    
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
      const newStartWeek = Math.max(1, resizeState.startWeek + deltaWeeks);
      const newDuration = resizeState.startDuration - (newStartWeek - resizeState.startWeek);
      
      if (newDuration >= 1 && newStartWeek + newDuration - 1 <= WEEKS.length) {
        resizeState.activity.startWeek = newStartWeek;
        resizeState.activity.duration = newDuration;
        renderBoard();
      }
    } else {
      const newDuration = Math.max(1, resizeState.startDuration + deltaWeeks);
      
      if (resizeState.activity.startWeek + newDuration - 1 <= WEEKS.length) {
        resizeState.activity.duration = newDuration;
        renderBoard();
      }
    }
  }

  function handleResizeEnd(e) {
    if (!resizeState) return;
    
    resizeState.bar.releasePointerCapture(resizeState.pointerId);
    
    document.removeEventListener('pointermove', handleResizeMove);
    document.removeEventListener('pointerup', handleResizeEnd);
    
    saveData();
    resizeState = null;
  }

  function createRipple(e, element) {
    const rect = element.getBoundingClientRect();
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    
    element.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
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

    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      return;
    }

    e.preventDefault();

    switch (e.key) {
      case 'ArrowLeft':
        if (activity.startWeek > 1) {
          activity.startWeek--;
          renderBoard();
          saveData();
          selectBar(activity.id);
        }
        break;
      case 'ArrowRight':
        if (activity.startWeek + activity.duration - 1 < WEEKS.length) {
          activity.startWeek++;
          renderBoard();
          saveData();
          selectBar(activity.id);
        }
        break;
      case 'ArrowUp':
        if (activity.duration < WEEKS.length - activity.startWeek + 1) {
          activity.duration++;
          renderBoard();
          saveData();
          selectBar(activity.id);
        }
        break;
      case 'ArrowDown':
        if (activity.duration > 1) {
          activity.duration--;
          renderBoard();
          saveData();
          selectBar(activity.id);
        }
        break;
    }
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
        document.querySelectorAll('.activity-bar').forEach(bar => {
          bar.classList.remove('selected');
        });
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
      // Try to load html2canvas from CDN
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
