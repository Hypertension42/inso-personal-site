---
source: "User request 2026-10-14: research a globally influential portfolio and recreate its distinctive interaction as Inso's personal homepage"
status: ready
slices:
  - id: P-001
    status: done
    depends: []
  - id: P-002
    status: done
    depends: [P-001]
  - id: P-003
    status: done
    depends: [P-002]
---
# Inso / Purple Signal

## Goal And Boundaries
User revised the direction: no heavy 3D experience; build a lightweight flat cyberpunk dark-purple page. Visual reference is Antoine Wodniack's 2025 Webby-winning homepage: oversized typography, generative line art and project index. Independently implement CSS/SVG/native JS; no copied assets, no runtime framework. Preserve truthful projects and accessible contact. Latest explicit dark-purple choice supersedes the previous white-purple default; retain a light theme option and remember choices made in the new design. Existing GitHub Pages publication remains the deployment target.

## P-001 Flat visual experience and factual content
Deliver a distinctive full-width typographic hero, original SVG signal artwork, numbered project index and responsive layout. Preserve all five project facts. Resources are local and lightweight.

> writes: `index.html`, `assets/site.css`, `assets/app.js`, `assets/content.mjs`, `assets/signal.svg`
> anchors: recent portfolio reference; flat cyberpunk dark purple; limited engineering effort; personal content
> verify: syntax checks; desktop/mobile render; no external or 3D dependencies

## P-002 Accessible content and lightweight interactions
Deliver project switcher, details, about and email/GitHub actions. All core content exists as HTML; keyboard, touch and reduced motion are supported. Theme defaults to dark for the new design, with explicit light choice retained.

> writes: `assets/app.js`, `assets/site.css`, `index.html`, `tests/*`, `README.md`
> anchors: understandable personal introduction; real links; mobile access; dark-purple latest preference
> verify: Python suite, Node theme tests, browser tabs/dialog/theme/reduced-motion and viewport checks
> review: exact-diff review for content scopes, accessibility and local deployment

## P-003 Verified public deployment
Publish the reviewed result to the existing repository. Check the deployment succeeds and online HTML and assets match the local build. Keep original history recoverable in Git.

> writes: `docs/loopx/plans/2026-10-14-workshop-portfolio.md`, repository commit/deployment
> anchors: completed personal homepage in the current published website
> verify: GitHub Pages deployment success; HTTP 200 for HTML and local assets; live browser render

## Integration And Final Verification
- All five projects preserve personal/team/metric/prototype boundaries.
- Content is usable with keyboard and without JavaScript; no invented product screenshots.
- New dark default and theme persistence verified; resources all served locally.
- Project URLs and contact work under the GitHub Pages project prefix.

## Handoff And Residual Risks
- Blockers: none.
- Residual risks: GitHub Pages mainland access varies by network.
- Resume note: 3D work stopped by user; unused dependency artifacts preserved under /tmp/inso-abandoned-3d and excluded from publication. Root owns HTML/CSS/JS/tests; content agent supplied factual module; researcher supplies final review.

## Completion Evidence

2026-10-15: five Python checks and Node theme cases passed; browser checks passed all project panels, source links, Escape/focus, keyboard wrap, two themes at five widths, reduced motion and no-JS summaries. Independent review finding for light-theme toast contrast was fixed and rechecked. Pages run 38661516836 succeeded; live HTML/CSS/JS/SVG returned HTTP 200 and matched local bytes. Live browser rendered the new dark design and switched projects correctly.
