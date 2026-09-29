# Design QA — Tita Mars Apricot Market Theme

Date: 2026-09-29

## Source and comparison setup

- Source visual truth: `C:/Users/icaru/.codex/generated_images/01a09612-5d61-7231-936c-eac9ec605efd/exec-dfaa4cb6-7330-4b36-b995-16184427ff6a.png`
- Source pixels: 1488 × 1058. The source is a single presentation image with light mode in its upper half and dark mode in its lower half.
- Implementation screenshots:
  - `C:/Users/icaru/OneDrive/Documents/ChatGPT/TITAMARS/qa-apricot-light.png`
  - `C:/Users/icaru/OneDrive/Documents/ChatGPT/TITAMARS/qa-apricot-dark.png`
- Implementation pixels and CSS viewport: 1440 × 1000 at device pixel ratio 1.
- Route/state: customer home, light and dark themes, desktop viewport.
- Responsive evidence: `qa-home-mobile-light.png` and `qa-home-mobile-dark.png` at 390 × 844 CSS pixels; `qa-owner-dark.png` at 1440 × 1000.
- Density normalization: none required. The source composite was judged by its individual light/dark halves; the implementation modes were captured separately at device pixel ratio 1.

## Full-view comparison evidence

The selected source and both final implementation screenshots were opened in the same visual comparison input. The implementation preserves the source's dominant apricot/espresso split, edge-framed Filipino food photography, orange controls, tinted content surfaces, compact two-column home composition, and dark-mode lighting. The generated background assets retain quiet central space so real UI content stays readable.

## Focused comparison evidence

Separate crops were not required because the original-resolution views made the key fidelity regions readable: header/logo/search/theme controls, hero copy and food crop, product card image/name/price/action stack, category cards, simple-steps row, and page-edge background subjects. Mobile captures were inspected separately for hero crop, bottom navigation, product columns, and text contrast.

## Findings

No actionable P0, P1, or P2 visual differences remain.

- The implementation intentionally keeps the existing working page proportions rather than copying tiny text from the generated concept literally.
- The generated source's light and dark halves are a presentation board; the real app exposes each mode as a full viewport through the existing theme toggle.
- The owner dashboard uses the same background family with more opaque operational panels for table and chart readability.

## Required fidelity surfaces

| Surface | Result |
| --- | --- |
| Fonts and typography | Poppins headings and Inter body text preserve the established Tita Mars hierarchy. Weights, wrapping, small labels, and button copy remain readable in both modes. |
| Spacing and layout rhythm | The desktop home uses an 1160px customer content maximum to expose the photographic page edges. Existing responsive breakpoints remain intact; desktop, tablet, and mobile routes have no horizontal page overflow. |
| Colors and visual tokens | Light mode uses apricot, peach-sand, caramel, burnt orange, cocoa, and terracotta borders with no pure-white page surfaces. Dark mode uses espresso, smoked brown, copper borders, warm ivory type, and luminous orange actions. |
| Image quality and asset fidelity | Dedicated 1672 × 942 raster backgrounds were generated for light and dark modes with matched edge composition. Vite fingerprints both assets for reliable GitHub Pages loading. Existing real product and hero images remain sharp and unchanged. |
| Copy and content | Existing customer, staff, and owner content is preserved. All 22 approved product names and prices remain unchanged. |

## Comparison history

1. The first rendered comparison had no actionable visual P0/P1/P2 findings. The background composition, mode colors, content contrast, and responsive structure matched the selected concept closely enough to pass.
2. A non-visual build warning for fixed public asset paths was removed by moving both backgrounds into the Vite asset pipeline. The post-change production build resolved and fingerprinted both images successfully, with no visible design change.

## Primary interactions and browser checks

- Theme toggle and persisted light/dark selection.
- Exact 22-product catalog, search/category reset, favorites, and supplier-separated Banana Loaf entries.
- Cart quantity persistence, delivery and pickup checkout, confirmations, and order history.
- Owner/staff navigation, order status flow, completed-order inventory deduction, restock, archive/restore, availability, and staff account flow.
- Customer registration, profile, completed-order review, and all customer routes.
- Desktop, tablet, and mobile overflow checks.
- Browser page errors checked: none.
- Automated result: all 20 browser QA check groups passed.
- Unit tests: 6 passed.
- Production build: passed.

## Follow-up polish

- P3: the two full-resolution background files are intentionally high quality; future WebP/AVIF variants could reduce transfer size for slower mobile connections.

final result: passed
