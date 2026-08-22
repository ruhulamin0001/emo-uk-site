# earningmoneyonline.co.uk

Custom HTML/CSS site. No framework, no build step, no login.
Owner: Ruhul Amin. Managed via Claude Cowork + Chrome extension.

## Structure
- index.html — homepage
- css/style.css — single stylesheet
- categories/ — 5 pillar pages
- articles/ — one HTML file per article
- images/ — cover photos
- studio/ — content studio (open locally, not linked from site)
- data/articles.json — article registry
- PROJECT-DECISIONS.md — locked decisions, READ FIRST in every new session

## Publish flow
Studio (QA score >= 25/50) → Ruhul approve → commit to main → Hostinger auto-deploy.

## Lead generation (private, not part of the site)
- leadgen/ — finds Hertfordshire car and bike mechanics, scores how badly they
  need an AI receptionist, and writes the outreach. See leadgen/README.md.
  Output lives in leadgen/data/ and is git-ignored; the folder is blocked from
  the web root by leadgen/.htaccess and robots.txt.
