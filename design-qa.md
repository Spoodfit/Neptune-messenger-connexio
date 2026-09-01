# Design QA — Radar dense locations

## Scope

- Reference: the supplied 393 × 852 mobile capture with three avatars expanded inside a large opaque radial zone.
- Implementation: PR #49, `fix/radar-dense-location-hubs`.
- Goal: preserve geographic context when many members share one location while keeping the location actionable.

## Visual comparison

| Check | Result | Evidence |
| --- | --- | --- |
| Map visibility | Passed | The former radial zone is replaced by one 132 × 58 px hub. |
| Density | Passed | A synthetic location with 100 members renders exactly three preview faces and the exact numeric count `100`. |
| Legibility | Passed | The count and `en visio` remain fully visible without ellipsis at 393 × 852. |
| Zoom stability | Passed | Exact-coordinate members stay aggregated through maximum map zoom; the hub never expands radially. |
| Event coexistence | Passed | Event dates retain their independent marker, touch target, geographic anchor, and collision offset. |
| Interaction | Passed | Tapping a hub opens the existing member/action sheet; tapping an event opens its CTA sheet. |
| Accessibility | Passed | Full localized member/event labels remain in Leaflet titles, tooltips, and cluster ARIA labels. |
| Responsive coverage | Passed | CI covers 280 × 568, 320 × 568, 393 × 852, 430 × 720, 768 × 1024, and 1024 × 768. |
| Regression coverage | Passed | Unit scenarios cover 1, 2, 5, 10, 25, 50, and 100 members; Product Audit renders and captures 100. |

## Verification

- Local: `npm run verify` passed — 171 tests, 89.10% line coverage, security, workflow, contrast, i18n, and locale audits.
- GitHub: CI, Web Preview, and Product Audit passed on commit `39687b9cda2c53bda83b83e4cfc4318356225b0c`.
- Human visual review: the final `radar-dense-100.png` capture was compared side-by-side with the supplied radial reference; no blocking circle, truncation, collision, or stray expanded sheet remains.

final result: passed
