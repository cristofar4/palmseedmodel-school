# Brand assets

The school mark, exactly as the school supplied it. It is never redrawn,
recoloured or traced in code, so replacing a file here updates every surface at
once.

| File | Used by | Notes |
| --- | --- | --- |
| `palmseed-logo.jpg` | Nothing directly | The supplied artwork, byte for byte, kept as the source of truth. 1017 by 970. |
| `palmseed-logo.png` | Website, dashboards, email templates, browser tab | The same artwork with a transparent background. 512 by 488. |

## What was done to the PNG, and what was not

The supplied file is a JPEG, and a JPEG cannot carry transparency, so the mark
came on a white sheet. On the dark surfaces that sheet would show as a white
rectangle around the crest.

The PNG clears only background pixels that are connected to the outer edge of
the image, found by flooding inward from the border. A plain colour key would
have punched out the white inner ring, the seed speckles and the motto
lettering as well, and changed how the mark reads.

No pixel of the mark itself is altered. Nothing is redrawn, recoloured, moved
or traced. If you would rather ship the artwork on its original white sheet,
point `src/components/brand/Logo.tsx` back at `palmseed-logo.jpg`.

## If a vector original exists

Send it. An SVG stays sharp at any size, which matters most for the small
header lockup where the ring lettering is close to its legibility limit. Save
it as `palmseed-logo.svg` and point the Logo component at it.
