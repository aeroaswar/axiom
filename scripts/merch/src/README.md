# Merch photography

One square studio photograph per product, named for its catalogue slug:

| File | Product |
|---|---|
| `training-hoodie.jpg` | Training Hoodie |
| `performance-tee.jpg` | Performance Tee |
| `logo-cap.jpg` | Logo Cap |
| `gym-duffel.jpg` | Gym Duffel |

`.jpg`, `.png` and `.webp` are all read. A photograph that is not square is centre-cropped.

Then:

    python3 scripts/merch/build.py

Each becomes `public/products/<slug>-{400,800,1280}.webp` and the slug is listed under `photos` in
`public/products/manifest.json`. The storefront serves the photograph on the card, the product page
and the thumbnail from that moment; a slug without one keeps the tile the row draws for itself.
