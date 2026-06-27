WORDSTRIKE logo asset pack

Recommended repository layout:
assets/
  branding/
    wordstrike-logo.png
    wordstrike-logo.webp
    wordstrike-emblem.png
    wordstrike-emblem.webp
  icons/
    favicon.ico
    favicon-64.png
    apple-touch-icon.png
    icon-192.png
    icon-512.png

Use the full logo on the main menu:
<img
  class="brand-logo"
  src="./assets/branding/wordstrike-logo.webp"
  alt="WORDSTRIKE"
  width="360"
  height="360"
  decoding="async"
  fetchpriority="high"
/>

Suggested CSS:
.brand-logo {
  display: block;
  width: min(72vw, 360px);
  height: auto;
  margin: 0 auto 1rem;
  object-fit: contain;
  filter: drop-shadow(0 0 18px rgba(30, 238, 255, 0.24));
}

Add to <head>:
<link rel="icon" href="./assets/icons/favicon.ico" sizes="any">
<link rel="icon" type="image/png" href="./assets/icons/favicon-64.png">
<link rel="apple-touch-icon" href="./assets/icons/apple-touch-icon.png">

For the web app manifest, use:
./assets/icons/icon-192.png
./assets/icons/icon-512.png

The favicon and PWA icons use the emblem-only crop so the W remains readable at small sizes.
