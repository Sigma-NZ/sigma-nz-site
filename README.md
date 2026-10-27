# sigma-nz.com

Static site for Sigma NZ, hosted on Cloudflare Pages.

- `public/` is the whole site. Cloudflare Pages settings: framework **None**, build command **empty**, output directory **`public`**.
- Every push to `main` deploys automatically.
- `public/_headers` holds the security headers (HSTS, CSP and others). Any new third-party script or form endpoint must be added to the CSP there, or the browser will block it.
- `public/main.js` handles the invitation form (Web3Forms) and saves `?ref=` and `utm_*` link tags with each request.
- Fonts are self-hosted (Plus Jakarta Sans, SIL Open Font License, see `public/fonts/OFL.txt`), so no visitor data goes to Google Fonts.

## Tagging links in outreach

Add `?ref=<company-slug>` to any link sent to a prospect, for example `https://sigma-nz.com/?ref=acme-engineering`. If they request an invitation, the ref arrives with their details.
