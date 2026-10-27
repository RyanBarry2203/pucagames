# Púca Games website

The studio site for Púca Games: plain HTML, CSS and JavaScript, no build step. Hosted free on GitHub Pages at
<https://pucagames.com>.

## Layout

| Path | What |
|---|---|
| `index.html` | the whole one-page site, including all vector art as SVG `<symbol>`s at the top of `<body>` |
| `404.html` | "Lost in the Mist" page GitHub Pages shows for bad links |
| `assets/css/style.css` | all styles; colours and fonts are tokens at the top in `:root` |
| `assets/js/main.js` | entry point: starts every module |
| `assets/js/core/ticker.js` | the one shared animation loop, scroll/pointer state, motion setting |
| `assets/js/modules/` | one file per effect: hero parallax (`scene`), night sky (`sky`), team section (`shapeshifter`), cursor, tilt, magnetic buttons, marquee, lore word reveal, header, reveal, title split, motion toggle |
| `assets/img/` | logo, favicons, game key art, social share image (`og-image.jpg`) |
| `CNAME` | the custom domain |

## How the art works

- The animals (`#hound`, `#boar`, `#fox`) are Pictish-style line art in a 400×300 box. Every path has
  `pathLength="1"`, so `stroke-dashoffset: var(--draw)` draws it from 0 to 100%. `--draw` is registered with
  `@property` so CSS can animate it.
- The hero is separate layers (moon, Benbulben, stones, mist, foreground). `data-depth` sets how far a layer follows
  the pointer and `data-speed` how much it lags the scroll.
- Animations follow the visitor's "reduce motion" system setting, and the footer switch overrides it
  (`html[data-motion]`, saved in `localStorage`).

## Editing

- New game: copy one `<article class="game-card">` block in `index.html` and swap the image, text and badge.
- News post: copy one `<article class="news-card">`.
- Team member: edit the `<article class="member">` blocks in the "The Púca" section.
- Images: keep key art 16:9 JPG at its native size, under ~200 KB.

Preview locally with any static server from the repo root (the site uses ES modules, so opening the file directly
won't work).

## Going live (one-off)

1. Push this repo to GitHub (an organisation called `PucaGames` works best, so the whole team can be added).
2. Repo **Settings → Pages**: Source = *Deploy from a branch*, Branch = `main`, folder `/ (root)`.
3. Buy `pucagames.com` at Cloudflare Registrar (at-cost pricing, no markup on renewal, free WHOIS privacy).
4. In Cloudflare **DNS → Records**, add (all with proxy status **DNS only**, the grey cloud):

   | Type | Name | Content |
   |---|---|---|
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | CNAME | `www` | `<github-account>.github.io` |

5. Back in **Settings → Pages**, set Custom domain to `pucagames.com`, wait for the DNS check, then tick
   **Enforce HTTPS**.
6. Email: Zoho Mail (Forever Free, EU data centre) hosts `developmentteam@pucagames.com`. Sign in at
   <https://mail.zoho.eu>; manage users and domains at <https://mailadmin.zoho.eu>.
