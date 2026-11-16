# dev folder

Reference only. Not needed to run the site.

- `src/`: pieces the previous session used to generate `app/app.js` (string-replacement scripts). Treat the deployed `app/` files as the source of truth and edit them directly.
- `build4.py`: old build script (paths point at the previous sandbox; it also expects downloaded zip.js / 7z-wasm packages).
- `vendor-src/`: npm entries used to bundle CodeMirror, marked/highlight.js/DOMPurify, SheetJS/JSZip/docx-preview and pdf-lib with esbuild (`npx esbuild entries/X.js --bundle --minify --format=iife --outfile=out/X.js`). Run `npm install` first. The built bundles are already in `app/vendor/`.
- `test/`: Playwright harness with a mock GitHub API (see HANDOFF_PROMPT.md, "Testing").
- `fx/`: small fixtures. `mkpdf.py` makes large noise PDFs for the split tests.
