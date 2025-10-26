// Minimal injector: safely replaces About, Timeline and Team leads/drivers
// It is intentionally non-destructive: does nothing if /data/site.json is missing.
// Add <script src="assets/js/site-data-injector.js"></script> before </body> in index.html

(async function(){
  async function safeFetchJSON(path){
    try {
      const r = await fetch(path, {cache: 'no-store'});
      if (!r.ok) return null;
      return await r.json();
    } catch (e) {
      console.warn('site-data-injector: failed to load', e);
      return null;
    }
  }

  function setInnerHTMLSafe(el, html){
    if (!el) return false;
    try { el.innerHTML = html; return true; }
    catch (e) { try { el.textContent = html; return true; } catch (_) { return false; } }
  }

  function renderTimeline(container, timeline){
    if (!container) return;
    // Preserve existing .timeline DOM structure (items use .timeline-item)
    container.innerHTML = '';
    timeline.forEach((ev) => {
      const item = document.createElement('div');
      item.className = 'timeline-item';
      if (ev.description) item.setAttribute('data-info', ev.description);
      const dateP = document.createElement('p');
      dateP.className = 'timeline-date';
      dateP.innerHTML = ev.date || ev.year || '';
      const textP = document.createElement('p');
      textP.className = 'timeline-text';
      textP.innerHTML = ev.title || '';
      item.appendChild(dateP);
      item.appendChild(textP);
      container.appendChild(item);
    });
  }

  function renderTeamGridFromData(teamGridEl, leadership){
    if (!teamGridEl || !leadership) return;
    // Replace content with cards similar to existing structure
    teamGridEl.innerHTML = '';
    // We create logical groupings similar to your existing site layout.
    const groups = [
      { team: 'Design Team', role: 'Lead', members: leadership.leads || [] },
      { team: 'Mechanical Team', role: 'Lead', members: leadership.leads || [] },
      { team: 'Electrical Team', role: 'Lead', members: leadership.leads || [] },
      { team: 'Programming Team', role: 'Lead', members: leadership.leads || [] },
      { team: 'Drive Team', role: 'Driver', members: leadership.drivers || [] }
    ];
    groups.forEach(g => {
      const card = document.createElement('div');
      card.className = 'card';
      const icon = document.createElement('div');
      icon.className = 'card-icon';
      // keep icon empty to preserve styling (original SVGs are decorative)
      const h3 = document.createElement('h3');
      h3.textContent = g.team;
      card.appendChild(icon);
      card.appendChild(h3);
      (g.members || []).forEach(m => {
        const p = document.createElement('p');
        p.innerHTML = `<strong>${g.role}:</strong> ${m}`;
        card.appendChild(p);
      });
      teamGridEl.appendChild(card);
    });
  }

  // Run after DOM loaded
  if (document.readyState === 'loading') {
    await new Promise(r => document.addEventListener('DOMContentLoaded', r));
  }

  const data = await safeFetchJSON('/data/site.json');
  if (!data) return; // do nothing if file missing

  // Title
  if (data.title) document.title = data.title;
  const titleEl = document.querySelector('header h1');
  if (titleEl && data.title) titleEl.textContent = data.title;

  // About
  const aboutContainer = document.getElementById('about');
  if (aboutContainer && data.about) {
    // update heading if present
    const h = aboutContainer.querySelector('h2');
    if (h && data.about.heading) h.textContent = data.about.heading;
    // update body - content is allowed to contain HTML
    const paragraphs = data.about.content || '';
    setInnerHTMLSafe(aboutContainer, `<h2>${data.about.heading || (h ? h.textContent : 'About')}</h2>${paragraphs}`);
  }

  // Timeline
  const timelineEl = document.querySelector('.timeline');
  if (timelineEl && Array.isArray(data.timeline)) {
    renderTimeline(timelineEl, data.timeline);
  }

  // Team grid (leads/drivers)
  const teamGridEl = document.querySelector('.team-grid');
  if (teamGridEl && data.leadership) {
    renderTeamGridFromData(teamGridEl, data.leadership);
  }

})();
