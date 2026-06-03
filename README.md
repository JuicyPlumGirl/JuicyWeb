# JuicyTTS — Marketing Site

Public showcase and commission intake site for the **JuicyTTS** voice-clone TTS service.

Deployed to GitHub Pages automatically on every push to `main` that touches files in `website/`.

---

## Drag-and-drop launch checklist

This site is designed to deploy with **zero terminal commands** after a one-time GitHub setup.

### 1. Push the contents to a new GitHub repo
> **Important:** put the **contents** of this folder at the **root** of the repo —
> i.e. `index.html`, `_data/`, `assets/`, and the hidden `.github/` folder must all sit
> at the top level. Do **not** nest everything inside a `website/` subfolder, or the
> deploy workflow (`.github/workflows/deploy-website.yml`) won't run — GitHub only reads
> workflows from `.github/workflows/` at the repo root.

Easiest path with the GitHub web UI:
1. Create the empty repo on GitHub.
2. On the repo page, click **Add file → Upload files**, then drag in everything from
   this folder. The web uploader includes the hidden `.github/` folder; if your file
   explorer hides dotfiles, enable "show hidden files" first so `.github/` is selected.
3. Commit. (`git push` from this folder also works if you prefer the terminal.)

### 2. Enable Pages
Repo → **Settings → Pages** → under "Build and deployment", set **Source = GitHub Actions**.
That's it — `.github/workflows/deploy-website.yml` handles the rest. The next push to `main` deploys.

> **Note on `.nojekyll`:** because this deploys via **GitHub Actions** (not the classic
> "deploy from a branch" mode), Jekyll is never run, so the `_data/` folder publishes
> as-is. The workflow also creates `.nojekyll` automatically on every deploy, so you
> never have to worry about that file uploading correctly.

### 3. (Optional) Custom domain
1. Rename `website/CNAME.example` to **`website/CNAME`** and put your domain inside (one line, e.g. `juicytts.com`).
2. At your DNS provider, add records pointing to GitHub Pages:
   - `A` records for the apex domain → `185.199.108.153`, `.109.153`, `.110.153`, `.111.153`
   - or `CNAME` for `www` → `<your-user>.github.io`
3. Repo → **Settings → Pages → Custom domain** → paste the same domain, tick **Enforce HTTPS** once the cert provisions.
4. Update the `<loc>` lines in `website/sitemap.xml` and the `Sitemap:` line in `website/robots.txt` to match the new domain.

### 4. Wire up the CMS (so a non-dev can edit copy)
1. Open `website/admin/config.yml` and change `repo: your-github-user/your-repo-name` to your actual repo slug.
2. Register the repo at **https://decapbridge.com** (free OAuth proxy; no server to run).
3. Push. Visit `https://your-domain/admin/` and log in with GitHub.

### Files that make this work
| File | Purpose |
|---|---|
| `.github/workflows/deploy-website.yml` | GitHub Actions workflow that deploys to Pages. **Must sit at the repo root** (`.github/workflows/...`) or GitHub ignores it. |
| `.nojekyll` | Stops GitHub Pages running Jekyll so the `_data/` folder isn't skipped. With Actions deploy it's auto-created by the workflow, so you don't need to upload it manually. |
| `CNAME.example` → `CNAME` | Custom domain. Rename and put your domain inside. |
| `404.html` | Branded not-found page that Pages serves on missing routes. |
| `robots.txt` | Allows crawlers, blocks `/admin/`, points at the sitemap. |
| `sitemap.xml` | SEO. Update hostnames after picking a domain. |
| `favicon.svg` | Browser tab icon. |
| `admin/config.yml` | Decap CMS schema (collections, fields). |
| `admin/index.html` | Mounts the CMS UI. |

---

## Quick preview (local)

No build step needed — it's plain HTML.

```
cd website
python -m http.server 8080
# Open http://localhost:8080
```

Or use any static server (VS Code Live Server, `npx serve`, etc.).

---

## How content editing works

### Option A — Edit YAML directly (GitHub web UI)

Every editable piece of content has a YAML source file under `website/_data/`:

| File | What it controls |
|---|---|
| `_data/site.yml` | Brand name, hero tagline, contact email, Discord URL |
| `_data/tiers/voice_pack.yml` | Voice Pack ($35 base bundle) pricing, features, pitch |
| `_data/tiers/starter.yml` | Starter Voice pricing, features, pitch |
| `_data/tiers/expressive.yml` | Expressive Voice pricing, features, pitch |
| `_data/tiers/professional.yml` | Professional pricing, features, pitch |
| `_data/voices/*.yml` | Audition panel voice names, tags, sample clips |
| `_data/faq/*.yml` | FAQ questions and answers |
| `_data/integrations/*.yml` | Integration card text and pills |

**Important caveat:** The site is static HTML. `index.html` was hand-authored to display the correct pricing content at launch. If you change a value in `_data/tiers/*.yml`, you **also need to update the matching section in `index.html`** to reflect it. See "Keeping HTML and YAML in sync" below.

### Option B — Decap CMS web UI

Once the site is live at `/admin/`, your business partner can edit content through a form-based UI without touching any files.

**Setup required first** — see "CMS setup" section below.

---

## Keeping HTML and YAML in sync

The site uses **static HTML** (no static site generator). This was chosen because:
- Zero build tooling, zero dependencies
- Immediate deploy without compiling
- The design is already pixel-perfect from the design pass

**Trade-off:** When pricing or FAQ content changes, two places need updating: the YAML file (source of truth for the CMS) and the corresponding HTML in `index.html`.

**Recommended workflow for the business partner:**
1. Edit the YAML via GitHub web UI or Decap CMS — this keeps the CMS records accurate
2. Also edit the matching HTML in `website/index.html` (Ctrl+F for the tier name or question to find the right spot)
3. Commit both files in the same commit

If this two-step process becomes a friction point, the site can be migrated to **Eleventy** (a lightweight static site generator that reads YAML and renders HTML templates). That migration is straightforward — mention it to the developer when you're ready.

---

## Deploying

Push any change to `main`. The GitHub Action (`.github/workflows/deploy-website.yml`) handles the rest.

### One-time setup: enable GitHub Pages

1. Go to your GitHub repo
2. **Settings → Pages**
3. Under "Build and deployment", set Source to **GitHub Actions**
4. Save. The next push will trigger a deploy.

Your site will be live at:
`https://<your-github-username>.github.io/<repo-name>/`

To use a custom domain (e.g. `juicytts.com`), add a `CNAME` file inside `website/` containing your domain, then configure DNS per [GitHub's docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

---

## CMS setup (Decap CMS)

The CMS lives at `/admin/` on the deployed site. It requires OAuth to authenticate with GitHub.

### Easiest option: DecapBridge (recommended)

DecapBridge is a free OAuth proxy — no server to run, works with GitHub Pages.

1. Register your repo at **https://decapbridge.com**
2. Open `website/admin/config.yml`
3. Change `repo: your-github-user/your-repo-name` to your actual GitHub user and repo
4. The `base_url: https://decapbridge.com` line is already set — leave it
5. Commit and push
6. Visit `https://your-site.github.io/admin/` and log in with GitHub

### Alternative: run locally with decap-server (no OAuth needed)

Useful for the partner editing offline or before the site is deployed:

```bash
npm install -g decap-server
# In the project root:
decap-server
# Then open http://localhost:8080/admin/
```

See [Decap local backend docs](https://decapcms.org/docs/working-with-a-local-git-repository/) for details.

### Alternative: Netlify Identity

If you choose to host on Netlify instead of GitHub Pages:
1. In `website/admin/config.yml`, change the backend to:
   ```yaml
   backend:
     name: git-gateway
   ```
2. Enable Identity in your Netlify site dashboard
3. Invite your business partner as a user

---

## File map

```
website/   ← these become the REPO ROOT when you upload to GitHub
├── .github/
│   └── workflows/
│       └── deploy-website.yml  # GitHub Pages deploy (must be at repo root)
├── .nojekyll               # Disables Jekyll (also auto-created by the workflow)
├── index.html              # Main marketing landing page
├── player.html             # Desktop player UI preview (linked from features section)
├── admin/
│   ├── index.html          # Decap CMS mount point (do not edit)
│   └── config.yml          # CMS collections config — EDIT repo name here
├── assets/
│   ├── styles.css          # All design tokens + marketing styles
│   ├── main.js             # Waveform animation, FAQ accordion, audition player
│   ├── player.css          # Player UI styles
│   └── media/              # Upload demo audio + screenshots here
│                           # (git-ignored; CMS uploads land here)
└── _data/
    ├── site.yml            # Contact email, Discord URL, tagline
    ├── tiers/
    │   ├── starter.yml     # Tier 1 pricing + features
    │   ├── expressive.yml  # Tier 2 pricing + features
    │   └── professional.yml# Tier 3 pricing + features
    ├── voices/             # Audition panel voice entries (name, tag, clip path)
    ├── faq/                # FAQ items (question + answer)
    └── integrations/       # Integration card text
```

---

## Things to fill in before launch

- [ ] Replace `contact@juicytts.com` in `index.html` and `_data/site.yml` with your real email
- [ ] Replace `discord.gg/juicytts` with your real Discord invite link
- [ ] Update `admin/config.yml` — set `repo:` to your actual GitHub user/repo
- [ ] Add real demo audio files to `assets/media/` and update `_data/voices/*.yml` to point to them
- [ ] Replace placeholder social links in the footer (Twitter/X, Showreel, Changelog)
- [ ] Set up DecapBridge or your chosen OAuth backend
- [ ] Enable GitHub Pages (Settings → Pages → Source: GitHub Actions)
- [ ] (Optional) Add a `CNAME` file for a custom domain
