# Tita Mars project structure

## Frontend

- `src/components/` — customer pages, auth screens, owner/staff screens, and reusable UI
- `src/context/` — cart, products, orders, sessions, theme, shop settings, and activity state
- `src/layouts/` — customer and workspace layouts
- `src/data/` — approved product image mapping and catalog data
- `src/hooks/` — shared React hooks
- `src/lib/` — Firebase client and optional Storage helpers
- `src/utils/` — formatting, local storage, order rules, business hours, and email links
- `src/styles/` — base, reference, and Apricot theme styles
- `public/assets/` — product, logo, favicon, hero, and storefront assets
- `index.html`, `vite.config.js`, `package.json` — Vite frontend entry and build configuration

## Firebase backend and security

- `firestore.rules` — active free-plan Firestore rules
- `storage.rules` — Storage rules for the optional paid Storage setup
- `functions/` — prepared callable Cloud Functions for trusted backend processing
- `firestore.trusted.rules` and `firebase.trusted.json` — optional trusted-backend deployment configuration
- `firestore.indexes.json` — Firestore indexes

## Deployment

- `.github/workflows/deploy.yml` — GitHub Pages build and deployment workflow
- `.firebaserc` and `firebase.json` — Firebase project and Hosting configuration
- `.env.example` — safe configuration template; `.env.local` stays private and is ignored

## Testing and documentation

- `tests/` — business-hours, order-flow, formatter, email-link, session, and Firestore rule tests
- `scripts/browser-qa.mjs` — browser smoke-test script
- `audits/` — saved QA screenshots and reports
- `README.md`, `design-qa.md`, `docs/` — setup, feature, and project documentation

## Generated files kept out of Git

These are recreated when needed and should not be committed:

- `dist/` — Vite production output
- `node_modules/` — installed dependencies
- `.firebase/`, `.pages-build/`, `tmp/` — local tool caches and temporary work
- `firebase-debug.log`, `firestore-debug.log` — local CLI logs
