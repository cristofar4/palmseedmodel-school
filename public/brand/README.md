# Brand assets

## Installing the real Palmseed logo

The official logo was not supplied when this project was built, so
`palmseed-logo.svg` is currently a plain placeholder monogram. It is not a
redrawing or reinterpretation of the school mark, it is a neutral stand in so
that no surface renders a broken image.

Replace these two files with the official artwork. No code changes are needed.

| File | Used by | Notes |
| --- | --- | --- |
| `palmseed-logo.svg` | Website navigation, authentication pages, dashboards | Vector. Square artboard reads best. |
| `palmseed-logo.png` | Email templates | Raster is required. Most mail clients do not render SVG. Supply at 176 by 176 pixels or larger, with a transparent or white background. |

Once `palmseed-logo.png` is added, the masthead in every email template picks
it up automatically through `NEXT_PUBLIC_SITE_URL`.

## Palette

Taken from the school logo.

| Token | Value |
| --- | --- |
| Red | `#E51F2B` |
| Black | `#0B0B0C` |
| Warm white | `#F6F1EA` |
| White | `#FFFFFF` |

These are defined once in `src/app/globals.css` under `@theme`, and mirrored
for email in `src/lib/school.ts` as `BRAND`.
