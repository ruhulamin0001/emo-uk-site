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

## bd-voice-stack/ (separate product, not part of the website)
FreePBX + AI receptionist stack for aiagent.jagatitlimited.com. It has its own README and CLAUDE.md.
The folder ships a `.htaccess` (Require all denied) so Hostinger never serves it. Move it to its own
repository before the first production deploy.
