# Copilot Instructions: Army Recruitment Landing Page

## Architecture

This is a **modular single-page website** with a client-side partial loading pattern. The site splits HTML and CSS into small modules (<100 lines each) for maintainability.

### File Structure
```
index.html          # Shell that loads partials via data-include attributes
script.js           # Partial loader + interaction handlers
styles.css          # Main stylesheet (imports only)
html/               # HTML partials (header, hero, story, contact, footer, etc.)
css/                # CSS modules (base, layout, components, sections, etc.)
```

### Key Patterns

**1. HTML Partial Loading**
- `index.html` uses `<div data-include="html/hero.html"></div>` to load partials
- `script.js` fetches and injects partials on DOMContentLoaded
- After partials load, `setupAskQuestionGlow()` wires up interactions
- **Important**: When adding new sections, include them in `index.html` AND update nav in `html/header.html`

**2. CSS Import Chain**
- `styles.css` imports top-level modules (base, layout, components, sections)
- Each CSS file is under 100 lines
- Flat structure in `css/` folder (no nested directories like `css/components/`)
- Import paths are relative: `@import url("css/base.css");` from `styles.css`

**3. Interactive Elements**
- Use `.js-*` classes for JavaScript hooks (e.g., `.js-ask-question`)
- Glow effects use temporary CSS classes added/removed via setTimeout
- Example: "Ask a Question" button highlights the contact form with `.glow` class

**4. Design System**
- CSS variables in `css/base.css`: `--accent`, `--bg`, `--text`, `--muted`, etc.
- Dark theme with orange accent (`#f59e0b`) and green secondary (`#22c55e`)
- Scrollbar hidden via CSS for clean mobile experience
- Cards use gradient backgrounds and subtle shadows

## Developer Workflows

**Local Development**
- Open `index.html` in a browser with a local server (e.g., `python -m http.server` or Live Server extension)
- Partials load via fetch, so file:// protocol won't work—use HTTP server

**Adding a New Section**
1. Create `html/newsection.html` (keep under 100 lines)
2. Add `<div data-include="html/newsection.html"></div>` to `index.html`
3. If navigation is needed, add link to `html/header.html`
4. Create section-specific CSS in `css/` if needed and import in `styles.css`

**Adding Interactions**
1. Add a `.js-*` class to the element in the HTML partial
2. Create a setup function in `script.js` (e.g., `setupFeatureName()`)
3. Call the setup function from `loadHtml()` after partials are injected

## Project Conventions

- **100-line limit**: Each HTML partial and CSS module must be under 100 lines
- **No inline styles/scripts**: Keep styles in CSS files and scripts in `script.js`
- **Semantic HTML**: Use `<section>`, `<aside>`, `<nav>`, etc. appropriately
- **Mobile-first**: Use responsive grids and `clamp()` for fluid typography
- **Accessibility**: Include proper ARIA labels, focus states, and keyboard navigation

## Critical Context

- **Purpose**: Personal Army recruitment landing page for PFC Sage to earn referral accolades
- **Legal compliance**: Footer disclaimer states this is NOT an official DoD site
- **Referral tracking**: Primary CTA links to goarmy.com with tracking parameters
- **Target audience**: Potential Army recruits on mobile devices
- **Tone**: Authentic, professional, non-salesy

## Common Tasks

**Update referral link**: Edit `html/hero.html` and any other CTAs with the official goarmy.com URL

**Change color scheme**: Update CSS variables in `css/base.css` (`:root` block)

**Add a new CTA button**: Use `.btn-primary` (orange) or `.btn-secondary` (dark) classes from `css/buttons.css`

**Remove a section**: Delete from `index.html`, remove nav link from `html/header.html`, optionally delete the HTML file

**Debug partial loading**: Check browser console for fetch errors; ensure paths match folder structure
