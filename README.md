# Study Hub

1. All study content is in `/data/`: one JSON file per subject, plus `plan-rules.json` (daily plan) and `schedule.json` (assessment dates).
2. To fix a card or question, edit its text in the matching file. Search for its `id`, for example `re-fc-04`. Keep `"source"` on every item.
3. Before publishing, run `node scripts/validate.mjs --review` to check the content and refresh `CONTENT_REVIEW.md`.
4. Publish with `git commit -am "Update content"` then `git push`. GitHub Pages updates in about a minute.
5. If you add or remove a file, list it in `sw.js` and change `VERSION` there. The tablet then picks up the new version on its second visit.
