# Guide assets and visual references

Reference repository: https://github.com/yz4f/Maed-by-yas

Imported scope:
- `lib/guide-library.ts`: written guide articles, adapted to the existing SpooFX types.
- `public/videos/product-guide-1016.mp4`: product walkthrough.
- `public/guides/`: network, timer and WRP videos with their thumbnails.
- Existing `spoofer-list-fix` and Visual C++ illustrations were checked against the reference.
- Vazirmatn Variable typography via the same `@fontsource-variable/vazirmatn` dependency used by the reference. Font license is included in that package.
- Navigation spacing and Lucide icon choices adapted to SpooFX, with local RTL/LTR and theme support.

The source app's authentication, database, customer records, branding, product archives and server configuration were not imported. Local media are loaded on demand; videos do not preload until opened. The original SpooFX product downloads and license API remain the source of account data.
