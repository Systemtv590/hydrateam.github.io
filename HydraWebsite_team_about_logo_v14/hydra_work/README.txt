HYDRA TEAM WEBSITE
==================

Open index.html in a browser.

This version includes:
- English content
- Floating navigation bar
- Dark / light theme toggle with local preference storage
- Compact team cards so profile images stay sharper
- Compact project cards so low-resolution artwork is not over-stretched
- User-provided Minecraft artwork used as a transparent background layer
- Colored geometric particles, parallax, hover and scroll transitions
- Guides and Workflow sections removed
- Rebuilt Contact section with animated platform icons
- Links: YouTube, Discord, CurseForge, MCPEDL and MCModels
- Favicon included

Main files:
- index.html
- styles.css
- script.js
- assets/images/

To change the background image, replace:


LIVE STATS
----------
The home statistics animate from 0 to their final values.

Current fallback values live in:
  data/stats.json

If this site is hosted from GitHub, the included workflow:
  .github/workflows/update-stats.yml

runs once per day and calls:
  tools/update-stats.mjs

The updater reads the public Hydra Team pages on CurseForge and MCModels and refreshes:
- CurseForge downloads
- CurseForge project count
- MCModels sales
- MCModels product count

Important: these are public-page scrapes rather than official authenticated APIs, so either site can change its HTML or block automated requests. If that happens, the previous values remain usable and can still be edited manually in data/stats.json.

Hero visual: assets/images/hero-visual.png (provided render)
