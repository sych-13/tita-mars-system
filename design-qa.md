# Design QA — Tita Mars
Date: 2026-09-15

final result: passed

## Findings

No actionable P0/P1/P2 issues remain for the local responsive frontend. This accepts the implemented design and local demonstration flows, not production backend readiness.

## Source and comparison setup

Source visual truth:

- D:/Downloads/Tita Mars Eatery & Bakery UI Kit.png — 1536 × 1024 pixels.
- D:/Downloads/Tita Mars Food App UI Showcase.png — 1536 × 1024 pixels.
- D:/Downloads/Tita Mars E-Commerce System Flow Infographic.png — 1536 × 1024 pixels.
- D:/Downloads/Tita Mars Bakery Logo.png — supplied brand reference.

Implementation: http://127.0.0.1:4173/. Project and evidence root: C:/Users/icaru/OneDrive/Documents/ChatGPT/TITAMARS/.

The sources are multi-screen design boards, not native browser captures. Comparison excluded device bezels, surrounding infographic labels, palette swatches and technology-stack diagrams. App-owned content regions were compared proportionally at their displayed scale. No claim of pixel-identical source viewport dimensions or numerical pixel-diff score is made.

Browser evidence uses 1440 × 1000 desktop and 390 × 844 mobile CSS pixels, at devicePixelRatio 1. Responsive checks additionally used 768 × 1024. Screenshot pixel dimensions equal CSS viewport dimensions; no density downsampling was necessary. The existing responsive Vite app is retained, not a phone-frame template.

State matching: home/catalog were compared in light and dark modes; product order and prices match the approved catalog. Dashboards use actual isolated-test orders, not the design board's invented sales totals. Screenshots with no orders intentionally show empty states. Test cart counts, customer names and dates differ from illustrative source content.

## Full-view and focused comparison evidence

The source boards and browser screenshots were opened together in the same visual-comparison inputs, then re-compared after corrections.

- UI Kit with qa-final-home-light.png and qa-owner-dark.png: hero-left/popular-right composition, six-card 3 × 2 desktop arrangement, navbar, category row, dashboard sidebar, metric cards and chart/table arrangement.
- Food App Showcase with qa-home-mobile-dark.png and qa-final-catalog-light.png: mobile stacked hero/category/cards and persistent bottom navigation; desktop supplier sidebar and four-column menu.
- System Flow Infographic with qa-checkout-light.png, qa-staff-mobile-dark.png and qa-owner-mobile-dark.png: checkout controls, order summary, staff queue, owner overview and responsive information hierarchy.
- Additional inspected captures: qa-home-mobile-light.png, qa-final-home-dark.png, qa-cart-desktop.png, qa-confirmation.png, qa-products-dark.png, qa-products-mobile.png, qa-products-mobile-dark.png, qa-login-dark.png, qa-staff-dark.png, qa-staff-reports-dark.png, qa-register-dark.png, qa-settings-mobile.png.

Focused review used the original-resolution combined inputs: header wordmark/control alignment; hero text/photo boundary; supplier/name/price/status/button card stack; checkout label/input/radio alignment; sidebar active state; table image/ID/supplier columns; mobile logo/theme/nav arrangement. These regions were legible at the opened resolution, so separate enlarged raster crops were not required.

## Required fidelity surfaces

| Surface | Result |
| --- | --- |
| Fonts/typography | Poppins headings and Inter body/UI are bundled locally. Hero uses bold display weight; compact controls preserve the source density. Heading hierarchy was corrected for catalog cards and mobile login. Hero wrapping no longer collides with food imagery. |
| Spacing/layout rhythm | Desktop 1320px maximum content width, 22px major grid gaps, thin borders, restrained 8–16px radii. Hero/popular columns become stacked on smaller screens; mobile cards stay two columns. Admin tables scroll inside their panels without widening the page. |
| Colors/tokens | Orange brand, cream/light surfaces and charcoal dark surfaces match the reference direction. Orange text/button and green stock tokens were darkened where necessary for contrast; dark primary buttons use dark foreground text. Semantic order/stock states are distinct. |
| Images/assets/icons | Existing real raster food assets and transparent horizontal wordmark are used. Product photos are sharp, consistently cropped and intentionally illustrative. No additional generation after the user's stop request. Phosphor library icons replace custom-drawn art; charts draw real local-order values, not decorative illustrations. |
| Copy/content | All 22 approved names/prices are unchanged. The two Banana Loaf records remain supplier-separated. Copy describes actual controls and local-preview limitations, without leaking implementation prompts into customer content. |

## Comparison and repair history

1. **P1 — Mobile header order.** Initial mobile capture placed search/theme before a right-aligned logo. Explicit flex ordering restores the logo at left with utility controls at right. Rechecked: qa-home-mobile-light.png and qa-home-mobile-dark.png.
2. **P2 — Hero text over food.** Early large headline intersected the bowl on mobile and at a desktop boundary. Reduced the responsive headline scale and widened the mobile image crop to keep readable negative space behind copy. Rechecked against the UI Kit and Showcase: qa-final-home-light.png and qa-home-mobile-dark.png.
3. **P2 — Mobile admin header/table collisions.** Inherited sidebar order put navigation above branding, and product IDs collided with supplier cells. Reordered the sidebar header and gave tables an intentional horizontally scrollable minimum width. Rechecked: qa-products-mobile.png.
4. **P2 — Grid panels widened mobile dashboards.** Wider data tables and a canvas forced staff/owner panels beyond the viewport. Added min-width:0 to cards/chart containers and max-width:100% to canvas; kept table scrolling inside its region. Empty states now stack vertically. Rechecked: qa-staff-mobile-dark.png and qa-owner-mobile-dark.png; all nine staff/owner routes fit both mobile and tablet widths.
5. **P2 — Readability and keyboard semantics.** Axe found low-contrast small orange/green copy, an empty table header, missing mobile login H1 and non-focusable scrolling regions. Adjusted tokens, named the action column, added headings and keyboard-focusable table regions; made the workspace topbar a landmark. Post-fix scans of home, catalog, checkout, login, owner/products and settings reported zero automated violations in tested states.
6. **P2 — Order modal URL/state mismatch.** Closing an updated order left the old selected-order URL, so repeat navigation could fail to reopen it. Modal selection now follows the route and close clears the order parameter. Repeated status transitions pass.
7. **P2 — Unavailable display ambiguity.** A manually disabled stocked product incorrectly read “Out of stock.” The card now distinguishes manual unavailability from zero inventory. Verified through owner editing and customer catalog.

Historical errors in the long-lived development browser came from hot-reloading rewritten context modules during formatting. A full reload restores that session. Acceptance tests ran in fresh isolated browsers and returned an empty page-error array.

## Functional and responsive verification

The reusable scripts/browser-qa.mjs passed all 19 check groups:

- Exact 22-product catalog, unique IDs, initial stock 20, local images.
- Supplier-separated Banana Loaf search and favorites.
- Theme persistence and mobile header/overflow.
- Cart quantity persistence on refresh.
- Delivery checkout with ₱20 fee; persistent thank-you confirmation and history.
- A separate second pickup order with zero delivery fee.
- First-owner setup and role navigation.
- Nine staff/owner routes at 390px and 768px.
- No inventory deduction for Confirmed, Preparing or Out for Delivery; Completed deducts once and locks, including refresh.
- Out-of-stock ordering prevention and owner restock.
- Archive/restore and manual availability.
- Staff account creation/login and UI role restrictions.
- Completed-order review and customer registration/profile.
- Nine customer routes at 1440px, 768px and 390px.
- No uncaught browser errors in the fresh acceptance session.

Production build: npm run build passed.

Axe incomplete checks were reviewed separately: text over raster backgrounds needs visual review; offscreen content in intentionally scrolling navigation/tables is not automatically contrast-tested; empty-table header/data association checks need real rows. These are not represented as a blanket accessibility certification.

## Intentional constraints and open questions

- The reference's Beverages tile is replaced by Favorites because the approved catalog contains no beverages. No unapproved product was added.
- Accurate supplier labels and visible availability add small information not shown on every design-board card.
- Backend technology logos in the infographic are reference annotations, not evidence of an implemented service. This repository remains a local React/Vite prototype with browser-local persistence.
- Role previews are intentionally accessible; there is no production server authorization, cross-device sync, multi-tab transactional inventory, automated payments or email reset service.
- Real customer/order data was not touched. Tests used separate disposable browser sessions and reserved .example test accounts.

## Implementation checklist

- [x] Preserve approved catalog and stock rules.
- [x] Customer, staff and owner screens implemented with consistent themes.
- [x] Desktop/mobile visual comparisons and targeted repairs completed.
- [x] Working primary flows and responsive routes browser-tested.
- [x] Build succeeds and local server stays running.
- [x] Local-only limitations documented in README.md.

## Follow-up polish (P3)

- Replace illustrative food photos with the owner's final product photographs when supplied.
- Optional future image encoding and icon/font bundle pruning for slower connections.
- Fine-tune minor text density against a native-resolution single-screen mock if one becomes available.

