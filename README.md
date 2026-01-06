# DarkShockGamer Robotics Team Website

Welcome to the repository for our robotics team public website, hosted via **GitHub Pages** at [https://darkshockgamer.github.io](https://darkshockgamer.github.io).

This site presents our robots, competition seasons, engineering process, outreach, and resources for new and returning team members.

> Tech Breakdown: **HTML ~80.7% · JavaScript ~15.0% · CSS ~4.3%**

---
## Table of Contents
- [Team Mission](#team-mission)
- [What This Repository Contains](#what-this-repository-contains)
- [Task Board Features](#task-board-features)
- [Season Content Structure](#season-content-structure)
- [Tech & Tooling](#tech--tooling)
- [Repository Structure](#repository-structure)
- [Adding / Updating Content](#adding--updating-content)
- [Development Workflow](#development-workflow)
- [Design & Branding Guidelines](#design--branding-guidelines)
- [Contributing Roles](#contributing-roles)
- [Roadmap Ideas](#roadmap-ideas)
- [Licensing / Media Use](#licensing--media-use)
- [Contact](#contact)

---
## Team Mission
We build competitive, reliable, and innovative robots while growing engineering skills, teamwork, and STEM outreach. This website documents:
- Current robot and subsystem summaries
- Past seasons (strategy, design iterations, lessons learned)
- Software stack (control code, autonomy logic, simulation tooling)
- CAD renders, prototypes, and progression photos
- Outreach events and community engagement

---
## What This Repository Contains
Static site assets only (no backend). Content is organized into HTML pages, shared CSS, and small JavaScript helpers for navigation, tabs, filtering, and any interactive visualizations.

If/When robot control code exists, it will live in a separate repository to keep this site lightweight.

---
## Task Board Features
The task board (`/tasks/index.html`) includes Firebase-powered task management with the following capabilities:

### Access Restriction
The task board is protected with client-side access control to prevent accidental access:
- **Authentication required**: Users must sign in with Google to access the task board
- **Authorization check**: Only authorized email addresses can access the board:
  - Team members listed in `/assets/data/team-members.json` (managed via Developer Console)
  - Or specific override emails configured in `/assets/js/auth-config.js`
- **Automatic redirect**: Unauthenticated users are redirected to the home page and returned to the task board after successful login
- **Restricted access page**: Unauthorized users see a friendly message explaining access requirements

**Managing Team Member Access**:
Team member access is managed through the Developer Console (`/developer`):
1. Sign in as a developer
2. Navigate to the "Team Member Access Management" section
3. Add or remove team member emails
4. Click "Push Team Member List to GitHub" to save changes

The following core team members cannot be removed:
- `blackshocktrooper@gmail.com`
- `palm4215@wths.net`

**Configuration**: To add override emails (bypass allowlist), edit the `allowedEmails` array in `/assets/js/auth-config.js`:
```javascript
// Example: Allow site owner or specific users to override allowlist
allowedEmails: ['owner@example.com', 'admin@example.com']
```

**Protected pages**:
- `/tasks` - Task board
- `/ui-lab` - UI Motion & Sound Lab
- `/developer` - Developer content editor
- `/telemetry` - Site telemetry and monitoring

All protected pages use a shared authorization guard (`/assets/js/auth-guard.js`) that implements consistent access control.

**Note**: This is a soft, client-side protection intended to prevent accidental access. It is not a substitute for server-side security.

### File Attachments
- **Upload files**: Team members can attach up to 5 files per task (max 10MB each)
- **Authentication required**: Users must be signed in with Google to upload, view, or delete attachments
- **Supported file types**: All file types are supported (images, PDFs, documents, etc.)
- **Image compression**: When tasks are archived, images are automatically compressed to WebP/JPEG format (max 1200px width) to conserve storage
- **Secure storage**: Files are stored in Firebase Storage with security rules enforcing authentication and size limits

### Usage Guidelines
- **File size limit**: 10MB per file
- **Maximum attachments**: 5 files per task
- **Storage**: Free tier usage is limited; please use attachments judiciously
- **Archive behavior**: Completed tasks and their attachments are automatically archived after 1-7 days (depending on due date status)

### Firebase Configuration
To deploy with attachment support:
1. Ensure Firebase Storage is enabled in your Firebase project
2. Deploy the security rules from `storage.rules`:
   ```bash
   firebase deploy --only storage
   ```
3. Verify that team members can authenticate via Google Sign-In

---
## Season Content Structure
Each season (e.g., `2025-season/`) can include:
- `overview.html` – Game challenge summary & strategic priorities
- `robot.html` – Final robot specs (drivebase, manipulator, sensors, control layers)
- `engineering.html` – Subsystem breakdowns, iterations, failure analysis
- `software.html` – Architecture diagrams, autonomous flow, libraries used
- `timeline.html` – Milestones (kickoff, prototyping, integration, competition)
- `media/` – Photos, CAD screenshots, match highlights (compressed images)

You can adapt naming or merge pages if the site should stay simpler.

---
## Tech & Tooling
| Area | Choice | Notes |
|------|--------|-------|
| Hosting | GitHub Pages | Auto-deploy on push to default branch |
| Markup | HTML5 | Simple static rendering |
| Styling | CSS (custom) | Keep selectors semantic; avoid heavy frameworks |
| Scripting | Vanilla JS | Prefer small utilities over large libraries |
| Images | PNG/JPEG/WebP | Optimize (TinyPNG or similar) before commit |
| CAD | External (Onshape/Fusion/etc.) | Export lightweight screenshots only |

Future Enhancements (Optional):
- Lightweight search (client-side index)
- Dark mode toggle
- Simple JSON-driven season data
- Interactive subsystem diagrams (SVG)

---
## Repository Structure
```
/
├── index.html            # Landing page: highlights current season & robot
├── seasons/              # Folder containing season subdirectories
│   └── 2025-season/      # Example season content (see structure above)
├── assets/               # Logos, icons, shared imagery
├── media/                # General team media (non-season specific)
├── css/                  # Stylesheets (e.g., base.css, layout.css, theme.css)
├── js/                   # Small JS utilities (navigation, tabs, filtering)
├── data/                 # (Optional) JSON data files (e.g., awards, events)
└── README.md             # This file
```
Adjust paths if your current site differs; update this README to match.

---
## Adding / Updating Content
1. Clone repository:
   ```sh
git clone https://github.com/DarkShockGamer/DarkShockGamer.github.io.git
cd DarkShockGamer.github.io
```
2. Create or update HTML pages (copy existing structure for consistency).
3. Add optimized images to appropriate `assets/` or season `media/` folders.
4. Keep CSS modular (base vs. component vs. theme).
5. Test locally by opening `index.html` in a browser (or run a lightweight server):
   ```sh
python3 -m http.server 8080
# Visit http://localhost:8080
```
6. Commit & push:
   ```sh
git add .
git commit -m "feat: add 2025 season robot overview"
git push
```
7. Wait for GitHub Pages to update (usually under 2 minutes).

---
## Testing Guidelines

### Local Testing
**⚠️ Important:** Always test using a local HTTP server, not by opening files directly with `file://` protocol.

The site uses `fetch()` to load JSON data files (e.g., `data/site.json`, `assets/data/developers.json`). These requests will fail with CORS errors when using `file://` protocol.

**Recommended testing approach:**

1. **Start a local HTTP server:**
   ```sh
   # Python 3 (recommended)
   python3 -m http.server 8080
   
   # Python 2 (fallback)
   python -m SimpleHTTPServer 8080
   
   # Node.js (if available)
   npx http-server -p 8080
   ```

2. **Open in browser:**
   ```
   http://localhost:8080
   ```

3. **Test key pages:**
   - `/` - Home page
   - `/developer/` - Developer editor (requires authentication)
   - `/sponsors/` - Sponsors page

4. **Verify in browser DevTools:**
   - **Console tab:** Should show no JavaScript errors
   - **Network tab:** All JSON files should load with 200 status
   - **Application tab:** Check for any storage/cache issues

### Testing the Developer Page

The developer page (`/developer/index.html`) is the primary JSON-driven page and requires special attention:

1. **Access the page:**
   ```
   http://localhost:8080/developer/
   ```

2. **Check for data loading:**
   - Page should show "Loading site data..." briefly
   - All sections should populate with content from `data/site.json`
   - Developer list should load from `assets/data/developers.json`

3. **Verify error handling:**
   - If JSON files are missing or invalid, errors should display in:
     - Browser console (with detailed error messages)
     - Page status bar (user-friendly message)
     - Toast notifications (optional)

4. **Common issues and solutions:**
   
   | Issue | Symptom | Solution |
   |-------|---------|----------|
   | No data renders | Empty sections, no timeline/leaders/sponsors | Check console for fetch errors; verify JSON files exist |
   | 404 on JSON files | Network tab shows 404 errors | Ensure `data/site.json` and `assets/data/developers.json` exist |
   | JSON parse errors | "Invalid JSON" message | Validate JSON files with `jq` or online validator |
   | CORS errors | "CORS policy" error in console | Use local HTTP server, not `file://` protocol |

### Testing on GitHub Pages

After pushing changes:

1. **Wait for deployment** (usually < 2 minutes)
   - Check Actions tab for deployment status

2. **Test live site:**
   ```
   https://darkshockgamer.github.io/
   https://darkshockgamer.github.io/developer/
   ```

3. **Verify:**
   - Open browser DevTools → Network tab
   - Refresh page with cache cleared (Ctrl+Shift+R / Cmd+Shift+R)
   - Confirm all JSON files return 200 status with `application/json` MIME type
   - Check console for any errors

4. **Test from different paths:**
   - Access via `/developer` (no trailing slash)
   - Access via `/developer/` (with trailing slash)
   - Access via `/developer/index.html` (explicit file)
   - All should work identically

### Debugging Tips

1. **Enable verbose logging:**
   - Open browser DevTools Console
   - Look for `[Developer Page]` prefixed messages
   - These show detailed loading progress and errors

2. **Check JSON file validity:**
   ```sh
   # Validate JSON syntax
   python3 -m json.tool data/site.json
   jq . data/site.json
   
   # Check file permissions
   ls -la data/site.json
   ls -la assets/data/developers.json
   ```

3. **Clear browser cache:**
   - The page uses cache-busting (`?_=timestamp`) but sometimes manual clearing helps
   - Chrome: DevTools → Network tab → Disable cache (checkbox)
   - Firefox: about:preferences#privacy → Clear Data

4. **Test in multiple browsers:**
   - Chrome/Edge (Chromium)
   - Firefox
   - Safari (if on macOS)

---
## Development Workflow
Recommended steps for major updates:
- Plan: Outline page purpose & required assets.
- Draft: Create basic HTML structure & placeholder sections.
- Style: Apply or extend existing CSS classes (avoid inline styles).
- Integrate Media: Use compressed images; keep aspect ratios consistent.
- Review: Cross-browser check (Chrome, Firefox, Edge, Mobile Safari).
- Validate: Run HTML validator (optional) to catch stray tags.
- Optimize: Remove unused CSS/JS before merging.

Accessibility Checklist:
- Use semantic elements (`<main>`, `<nav>`, `<section>`, `<figure>`)
- Provide `alt` text for images (especially robot subsystem photos)
- Ensure color contrast meets WCAG AA
- Maintain keyboard navigability for interactive components

---
## Design & Branding Guidelines
- Logo usage: Maintain clear space; do not distort.
- Color palette: Define core HEX values in `css/theme.css` (e.g., team primary, accent, neutral grays).
- Typography: Use system fonts or a single web font (avoid excessive loads).
- Imagery: Favor CAD renders with neutral backgrounds or clean photo angles.
- Consistency: Use consistent heading hierarchy (`h1` only once per page).

---
## Contributing Roles
| Role | Typical Contributions |
|------|-----------------------|
| Mechanical | Subsystem specs, CAD images, iteration notes |
| Electrical | Wiring diagrams, sensor layout, control interface notes |
| Software | Architecture, autonomous strategy, code examples (link external repos) |
| Media | Photos, editing, video highlight reels |
| Strategy | Game analysis, scoring breakdown, timeline planning |
| Outreach | Event summaries, community impact metrics |

When adding content, include attribution at page bottom if appropriate.

---
## Roadmap Ideas
- Season archive index page
- Award & ranking historical table
- Interactive drivetrain calculator (JS)
- Autonomous path visualizer (SVG + JSON)
- FAQ page for new members

Open issues or discussions before implementing large features.

---
## Licensing / Media Use
Unless otherwise stated, textual content and images are team-owned. If releasing under a license (e.g., CC BY-NC for media, MIT for code samples), add a `LICENSE` file and reference it here.

Do NOT upload raw proprietary CAD files or sensitive internal documents.

---
## Contact
For questions, updates, or corrections:
- Create an Issue or Pull Request in this repository.
- Reach out via GitHub: **@DarkShockGamer**

---

Focused on robotics excellence—thanks for helping build and document our journey!

---
## Modern UI Enhancements

The website now includes a comprehensive set of modern UI enhancements focused on accessibility, personalization, and visual appeal.

### Theme System

**8 Available Themes:**
1. **Light** - Clean, bright interface with blue accents
2. **Dark** - Modern dark mode with indigo accents
3. **High Contrast Light** - Maximum contrast for accessibility (white/black)
4. **High Contrast Dark** - Maximum contrast dark mode (black/white)
5. **Neon** - Vibrant cyberpunk aesthetic with neon colors
6. **OLED** - Pure black background optimized for OLED displays
7. **Paper** - Warm, paper-like aesthetic for comfortable reading
8. **Retro CRT** - Vintage computer terminal look with green monospace text

**Features:**
- All themes persist in `localStorage`
- Automatic color scheme detection
- CSS custom properties allow themes to coexist with existing styles
- Easy to switch between themes via Settings page

### Accent Color Customization

Users can personalize the site's accent color to match their preferences:
- Color picker interface in Settings → Appearance
- Live preview of color changes
- Persists across sessions via `localStorage`
- Affects buttons, highlights, and interactive elements
- Reset button to restore default color

### Accessibility Panel

A floating accessibility panel (accessible from any page) provides:

**Font Size Adjustment:**
- Slider to scale base font size (12px - 24px)
- Affects all text proportionally
- Persists across sessions

**Reduced Motion Toggle:**
- Minimizes or disables animations and transitions
- Respects system `prefers-reduced-motion` preference
- Can be manually overridden
- Affects scroll reveals, page transitions, and cursor glow

**Dyslexia-Friendly Font:**
- Switches to easier-to-read font stack
- Uses Comic Sans MS, Arial, and Verdana
- Increases letter spacing and line height
- Persists across sessions

**Cursor Glow Effect:**
- Soft glow follows mouse cursor
- Automatically disabled on touch devices
- Respects reduced motion settings
- Can be toggled on/off

### Scroll Reveal Animations

Subtle entrance animations for content as you scroll:
- Elements fade in and slide up when entering viewport
- Stagger animations for groups (e.g., team cards)
- Automatically disabled for reduced motion preferences
- Implemented via CSS classes: `.scroll-reveal` and `.scroll-reveal-stagger`

### Page Transitions

Smooth transitions between pages using modern web APIs:
- Uses **View Transitions API** when available
- Graceful fallback for browsers without support
- Only intercepts same-origin internal links
- Preserves external links, hash links, and downloads
- Respects reduced motion preferences
- Doesn't break modifier key behaviors (Ctrl+click, etc.)

### Implementation Details

**CSS Files:**
- `/assets/css/adaptive-themes.css` - Original theme system
- `/assets/css/modern-ui.css` - New themes, scroll reveal, accessibility styles

**JavaScript Modules:**
- `/assets/js/theme.js` - Extended theme management
- `/assets/js/modern-ui.js` - Accent color, font size, reduced motion, dyslexia font, cursor glow
- `/assets/js/page-transitions.js` - View Transitions API implementation
- `/assets/js/accessibility-panel.js` - Floating accessibility panel component

**Storage Keys:**
- `site-theme` - Base theme preference
- `site-adaptive-theme` - Specific theme variant
- `ui-accent-color` - Custom accent color
- `ui-font-size` - Base font size
- `ui-reduced-motion` - Reduced motion preference
- `ui-dyslexia-font` - Dyslexia-friendly font toggle
- `ui-cursor-glow` - Cursor glow effect toggle

### Browser Compatibility

- **CSS Custom Properties:** All modern browsers
- **View Transitions API:** Chrome/Edge 111+, Safari 18+ (with fallback)
- **IntersectionObserver:** All modern browsers
- **LocalStorage:** All browsers

### Performance Considerations

- Scroll reveal uses IntersectionObserver for efficiency
- Cursor glow uses requestAnimationFrame throttling
- All animations respect `prefers-reduced-motion`
- CSS variables minimize style recalculation overhead
- Pure CSS themes with minimal JavaScript overhead

