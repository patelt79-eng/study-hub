# Study Hub: build plan

A static revision hub for a Year 9 student. Assessments run Mon 16 to Wed 25 November 2026. Plain HTML, CSS and ES modules. No build step. Hosted on GitHub Pages.

## 1. File structure

```
study-hub/
  index.html              single page; <meta robots noindex,nofollow>; nav + <main id="app">
  robots.txt              Disallow: /
  manifest.json           "Study Hub", generic book icon, display: standalone
  sw.js                   cache-first app shell + /data/*.json; version string bumps on deploy
  icons/icon.svg, icon-192.png, icon-512.png, apple-touch-icon.png   (plain book glyph)
  css/app.css             tokens (light/dark), layout, focus states, reduced motion
  js/
    app.js                boot, hash router, nav, back button, theme
    store.js              localStorage wrapper (every call try/catch, in-memory fallback)
    dates.js              "today" in Europe/London, day-of-week, "in X days"
    plan.js               daily plan generator (pure function of date + rules)
    speech.js             Web Speech: en-GB / fr-FR voice pick, slow/normal, hidden if unsupported
    data.js               fetch + cache subject JSON
    views/
      today.js  schedule.js  subjects.js  subject.js  progress.js  settings.js
      flashcards.js  quiz.js  worked.js  writing.js  french-tasks.js
  data/
    schedule.json         his 6 papers + full year-group grid (page 3) as data
    plan-rules.json       editable plan rules (see section 4)
    re.json  geography.json  science.json  maths.json  history.json  french.json  english.json
  scripts/
    validate.mjs          JSON checks (see section 7)
    forbidden.local.txt   gitignored: names/school/staff strings to scan for (never committed)
  CONTENT_REVIEW.md       every needs_parent_check item, RE first
  README.md               5 lines: edit /data, push to redeploy
  .gitignore              scripts/forbidden.local.txt, .DS_Store
```

## 2. Routes (hash-based)

| Route | Screen |
|---|---|
| `#/today` (default) | Today: date, next assessment, today's plan |
| `#/schedule` | His papers, editable period/room; toggle for full grid |
| `#/subjects` | Seven subject buttons, in paper order |
| `#/subject/:id` | Fixed-order subject page |
| `#/subject/:id/flashcards[/:set]` | One card per screen |
| `#/subject/:id/quiz[/:set]` | One question per screen; retry missed at end |
| `#/subject/:id/worked/:skill` | Maths worked example, one step per screen |
| `#/subject/:id/practice/:skill` | Maths practice questions with method shown |
| `#/subject/:id/write/:task` | PEE / PEA builder |
| `#/subject/french/tasks/:task` | French booklet tasks (time expressions, reading, sentences, translations) |
| `#/progress` | RAG, quiz history, share, backup/restore |
| `#/settings` | Theme, speech speed, "Not my class?" |

The nav bar (Today, Schedule, Subjects, My Progress) is always visible. Every screen except Today has a Back button at top left. Settings is a small link at the foot of My Progress.

## 3. Subject page: fixed order

The same order on every subject. A section is shown as "Not used for this subject" instead of being hidden, so the page shape never changes.

1. What's on the test (booklet scope, verbatim topic list, paper date and length)
2. Today's task (the session from today's plan for this subject, or "No task for this subject today.")
3. Flashcards (sets listed with card count and "about N minutes")
4. Quiz (sets listed with question count and time)
5. Practise writing (RE: PEE builder; English: PEA builder; French: sentence building and translations; Maths: worked examples and practice; Science, Geography, History: "Not used for this subject")
6. School resources (links)
7. My RAG check (that subject's topics, with R/A/G buttons)

## 4. Daily plan logic (`plan-rules.json`)

`plan(date, rules, papersDone)` is a pure function, so the same date always gives the same plan. There is no randomness. Rotation uses a weighted round-robin indexed by "days since `rotation_start`", so refreshing or opening the app late does not shift anything.

- `rotation_start`: 2026-10-27. `rotation_end`: 2026-11-15.
- Weights: RE, Geography, Science, Maths = 3; History, French, English = 2.
- Sessions: school days 2, weekends 3, about 20 minutes each. Each session has a subject and an activity. The activity cycles per subject: flashcards → quiz → writing/worked example. The button reads, for example, "Session 1: RE key terms flashcards, about 20 min".
- `overrides` by date (each one is a single light flashcards session unless stated):
  - Mon 16: RE · Tue 17: Geography · Wed 18: Science · Thu 19: Maths
  - Fri 20, Sat 21, Sun 22: normal rotation of History, French, English only
  - Mon 23: History + French (2 light sessions) · Tue 24: English only
  - From Wed 25 (after the paper): "All assessments finished."
- Subjects whose paper date has passed are filtered out automatically, in addition to the overrides.
- `non_school_days`: a list of dates treated as weekends (for half-term or INSET days). See question 2.

Ticks are stored per date (`done:2026-10-28 = [0,1]`). When all sessions are ticked, the screen shows "You've finished today's plan." and nothing more.

## 5. Data model (per subject JSON)

```json
{
  "id": "re", "name": "RE", "paper": { "date": "2026-11-17", "length": "…", "notes": "…" },
  "scope": [ { "heading": "Creation and Covenant", "items": ["…"], "source": "booklet" } ],
  "flashcards": [ { "set": "key-terms", "id": "re-fc-01", "front": "Imago Dei", "back": "…",
                    "source": "booklet|generated", "needs_parent_check": true } ],
  "quiz": [ { "set": "…", "id": "…", "q": "…", "options": ["a","b","c","d"], "answer": 2,
              "explain": "…", "source": "generated" } ],
  "writing": [ { "id": "…", "type": "PEE|PEA", "question": "…", "starters": {"P":[…],"E":[…],"X":[…]}, "source": "booklet" } ],
  "resources": [ { "label": "…", "url": "…|null", "note": "…", "source": "booklet" } ],
  "rag_topics": [ { "id": "…", "label": "…", "detail": "Mathswatch clip 102–103", "source": "booklet" } ]
}
```

Maths also has `worked` (skill → steps[]) and `practice` (skill → questions with a `method` array), with each skill tagged `"sets12": true` where the booklet says so. French cards have `lang` fields so the French side is read with a `fr-FR` voice.

Stored progress (`localStorage`, key prefix `sh:`): theme, speech speed, period and room per paper, class selection, plan ticks, RAG ratings, quiz history (last score and date per set), writing drafts. Export and import use a single JSON file containing all of these.

## 6. Design

- System font stack, 18px body, 1.6 line height, left-aligned, max line length about 65 characters.
- Off-white `#FAF8F3` with dark slate text; muted blue accent. A dark theme is available through a toggle (auto, light or dark).
- 48px minimum targets. Thick visible focus ring. No animation beyond instant state changes. `prefers-reduced-motion` is respected anyway.
- Feedback: a tick and "That's right." for a correct answer. For a wrong answer: "The answer is: …" plus one line of explanation, with a neutral colour and no red.
- Every activity begins with "There are N cards. It takes about M minutes. Tap Start." and ends with "Done. That's this session finished."
- A speaker button sits next to every instruction, question, option set, answer and card face.

## 7. Safeguards

- `validate.mjs` checks each quiz question has 4 unique options and exactly one valid `answer` index. It checks every item has a `source`, and every generated RE item has `needs_parent_check: true`. It scans every repo file (not only JSON) for strings listed in `scripts/forbidden.local.txt`. That file is gitignored, so the names it checks for are never published.
- `CONTENT_REVIEW.md` is generated by a flag on the same script (`--review`), so it always matches the data.
- `noindex, nofollow` meta and `robots.txt` Disallow.

## 8. Testing

I'll use the in-app browser at 768×1024, 1024×768 and 375 wide. The checks are:
- the plan is identical across reloads, including with a fixed test date (`?date=2026-11-16`, dev-only)
- offline reload works after the first load
- export, clear, import round-trips
- speech hidden when unsupported
- keyboard tab order

## 9. Deploy

1. `git init` and commit.
2. `gh repo create study-hub --public --source=. --push`
3. Pages from `main` / root via `gh api`.
4. Share the URL.

## Booklet notes that shape the build

- The booklet has 18 pages: pages 17–18 are Spanish and are ignored (he takes French).
- Maths: the page 6 list has items that are not in the page 7 table (arithmetic sequences, negative indices, expanding single/double/triple brackets). I'll use page 7 as the RAG list and add the page 6 extras as sub-skills under the matching row. Expanding single, double and triple brackets map to clips 93, 134 and 178. Negative indices has no clip listed, so it will show "Part of Index laws (131, 154)".
- History: page 14's RAG table has only two rows. The RAG list will use the four page 13 topics.
- French corrections, each marked "Corrected spelling":
  - j'ai mangé
  - sur Netflix
  - les cheveux longs
  - les séries
  - je préfère
  - passé composé
