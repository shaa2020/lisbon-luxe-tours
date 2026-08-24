# AI Tour Builder (inside existing Tours admin)

Add an AI assistant that turns a pasted, rough itinerary into a filled-in tour form. No new admin panel, no new tours table, no change to existing pricing, publishing or auth.

## Flow

```text
Admin > Tours  ->  [+ Create Tour with AI]
   -> opens the existing "New tour" page with the AI panel open
   -> paste rough itinerary  ->  Generate Tour
   -> review the AI output (editable preview)
   -> Import into Tour  ->  fields land in the existing form
   -> existing Save / Publish controls
```

## What gets added

1. **Button on the Tours list** — "+ Create Tour with AI" next to the existing "+ New tour" button. It opens `/admin/tours/new` with the AI panel expanded.
2. **AI panel inside the existing tour form** (collapsible card at the top of the New/Edit page, not a separate form):
   - Large "Paste your itinerary" textarea, plus optional duration hint.
   - "Generate Tour" button with a loading state.
   - Result preview: title, slug, category, duration, tagline, description, highlights (add/edit/delete/reorder), itinerary rows (time | title | detail, with a MANDATORY STOP badge), included / not included.
   - Buttons: Regenerate, Import into Tour, Cancel. Saving/publishing stays with the form's existing buttons — no duplicates.
3. **"Tell AI what to change" box** in the preview — a one-line command ("make the description shorter", "fit exactly 90 minutes"). It re-runs the model with the current draft and only alters the section asked for.
4. **Import into Tour** maps every generated field onto the existing form state (title, slug, category, duration, tagline, description, highlights, itinerary, included, not included). Price fields are never touched by AI.

## Rules encoded in the prompt

- Understand misspellings and informal notes; never invent attractions.
- Never invent a price — price and sale price stay untouched; "Priced per person" keeps its existing default.
- No "private" or "hotel pickup" claims unless the input says so.
- Category suggested from the existing category list only; admin can change it in the existing dropdown.
- Timing distributed realistically: starts at `00:00`, ends exactly at the stated duration (1h -> 01:00, 90 min -> 01:30, 2h -> 02:00).
- Mandatory stops flagged from phrases like "Senhora do Monte mandatory stop".

## Technical notes

- New server function `src/lib/ai-tour.functions.ts` (`generateTourDraft`, `reviseTourDraft`) using `createServerFn` with the existing `requireSupabaseAuth` middleware plus an admin-role check, calling Lovable AI on the server with structured JSON output. The API key stays server-side; no key in browser code.
- Reuses the existing `TourForm` state, `tourCategories`, `slugify`, and the existing save handler in `src/routes/admin.tours.$id.tsx`. Nothing about the current save payload changes except itinerary rows may carry an optional `mandatory` flag.
- Itinerary text format stays `time | title | detail`; a mandatory stop is stored with an extra `mandatory` flag in the existing `itinerary` JSON and shown as a badge. Existing tours without the flag are unaffected.
- No database migration required.
