# Verify MoroccanMusings
Marq - immersive interactive narrative exploring Moroccan themes (vite, vanilla JS, generative art, procedural audio).
## Launch
npm install, then npm run dev or npm run build && npm run preview.
## Doctor
`python3 .cursor/skills/verify-moroccan-musings/verify.py`
## Drive
Builds with vite and renders the built app in headless Chromium asserting the boot marker, splash screen, and zero JS console errors.
## Evidence
`.cursor/skills/verify-moroccan-musings/evidence.json`
## Cleanup
Static/streamlit server terminated after the render.
## Known boundaries
Render smoke only; scene quality unverified. Playwright e2e configs are not exercised (chromium-only sandbox).
