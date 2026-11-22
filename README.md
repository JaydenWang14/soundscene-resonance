# Re:Sonance (Sound Scene 2027 page)

Static HTML, no build step. `index.html` is the page; `_shared/` holds the shared header, styles and ripple script.

- Deploys to GitHub Pages on every push to `main` (`.github/workflows/pages.yml`). All paths are relative, so the project sub-path works.
- Cache: local css/js links carry `?v=20261122`. Change that value in `index.html` when you edit a css/js file, otherwise visitors may keep the old copy. Images that change should get a new file name.
- `_shared/site.js`: `PUBLISHED = false` shows a "Draft preview" ribbon. Set it to `true` when the page is ready to be public. `OTHER_URL` is the public URL of the sister page (hidden while empty).
