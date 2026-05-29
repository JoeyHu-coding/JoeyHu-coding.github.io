# Personal Academic Website

A local-first static website for an English academic and design-oriented personal homepage.

Public URL target:

```text
https://joeyhu-coding.github.io/
```

## Pages

- `index.html` - Home
- `about.html` - About
- `research.html` - Research
- `publications.html` - Publications
- `projects.html` - Projects
- `portfolio.html` - Portfolio
- `archive.html` - Archive
- `photo.html` - local profile photo cropper

## How to preview locally

Open `index.html` directly in a browser, or run a simple local server:

```powershell
python -m http.server 8080
```

Then visit `http://localhost:8080`.

## Where to put files

- Keep CV files out of the public site until you are ready to publish one.
- Put profile images in `assets/profile/`.
- Use `photo.html` to crop a large portrait to the homepage frame, then export `profile.jpg`.
- Put research figures in `assets/research/`.
- Put publication figures in `assets/publications/`.
- Put project images in `assets/projects/`.
- Put portfolio images in `assets/portfolio/`.
- Put archive images in `assets/archive/`.
- See `assets/IMAGE_GUIDE.md` before replacing image placeholders.
- Replace or refine page text as your academic profile changes.

## Public hosting options

This site is prepared for GitHub Pages at `https://joeyhu-coding.github.io/`. A custom domain can be added later if needed.
