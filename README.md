# u alright mate?

A cute, non-medical virtual pet for dumping scattered ideas, turning them into sparks, and exporting the result into social posts or workspaces.

## Run locally

Open `index.html` in a browser, or serve the folder:

```powershell
python -m http.server 4173
```

Then visit `http://localhost:4173`.

## Deploy to Vercel

From this folder:

```powershell
vercel --prod
```

The app is static: `index.html`, `styles.css`, and `app.js` are the whole product.

## Product notes

- The pet is intentionally non-human and non-medical.
- The app formulates idea dumps into sparks, action buckets, and copy-ready exports.
- Integration adapters live in `app.js` under `integrations`; these are ready to swap for authenticated Notion, Google Workspace, or social publishing APIs later.
- Everything is saved in browser `localStorage`; no server data collection is required for this prototype.
