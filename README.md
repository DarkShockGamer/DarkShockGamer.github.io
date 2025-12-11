# DarkShockGamer Robotics Team Website

Welcome to the repository for our robotics team public website, hosted via **GitHub Pages** at [https://darkshockgamer.github.io](https://darkshockgamer.github.io).

This site presents our robots, competition seasons, engineering process, outreach, and resources for new and returning team members.

> Tech Breakdown: **HTML ~83.3% · JavaScript ~12.6% · CSS ~4.1%**

---
## Table of Contents
- [Team Mission](#team-mission)
- [What This Repository Contains](#what-this-repository-contains)
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
