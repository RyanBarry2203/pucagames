# Púca Games website

The studio site for Púca Games: plain HTML, CSS and JavaScript, no build step. Hosted free on GitHub Pages at
<https://pucagames.com>.

## Layout

| Path | What |
|---|---|
| `index.html` | the whole one-page site |
| `404.html` | "Lost in the Mist" page GitHub Pages shows for bad links |
| `assets/css/style.css` | all styles; colours and fonts are tokens at the top in `:root` |
| `assets/js/main.js` | mobile menu, sticky header, scroll reveals, lore parallax, hero embers |
| `assets/img/` | logo, favicons, hero art, game key art, social share image (`og-image.jpg`) |
| `CNAME` | the custom domain (added when the domain is connected) |

## Editing

- New game: copy one `<article class="game-card">` block in `index.html` and swap the image, text and badge.
- News post: copy one `<article class="news-card">`.
- Images: keep key art 16:9 and around 960×540 JPG so the page stays fast.

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
