# Class timer icons

Edited with the built-in imagegen tool. Original: `public/icons/source.png`.
Transparent master: `public/icons/logo-transparent.png`.

Prompt:

Use case: background-extraction. Edit target: supplied stopwatch and open-book app logo. Preserve the exact existing blue stopwatch, yellow clock hand, blue and turquoise book silhouette and white internal clock face and book separators. Remove only the exterior pale blue rounded tile and white exterior backdrop, replacing the exterior with genuine alpha transparency (not checkerboard pixels). Center the intact logo on a square transparent canvas with only 4% margin top and bottom, maximize size without cropping. Clean crisp edges suitable for a favicon. No text, no added shapes, no shadow, no redesign.

Exports use Sharp for sizing and PNG/ICO encoding. Browser icons retain alpha.
Installed icons and the 180px Apple icon use an opaque `#e8f4ff` background.
Regular icons use 94% of the transparent master canvas; maskable sizing fits
visible artwork (alpha > 32) within a centered radius of 39% of the final width.
Manifest icon URLs carry `v=2` to distinguish this revision.
