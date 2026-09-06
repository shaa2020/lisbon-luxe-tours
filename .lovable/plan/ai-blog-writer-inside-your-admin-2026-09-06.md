# AI Blog Writer — inside your admin

The Journal and Destinations builders already exist in the admin sidebar. This plan adds the missing piece: an AI Blog Writer that drafts journal posts for you, with you always in control before anything goes live.

## What you'll get

New admin page: **Admin → AI Writer** (`/admin/ai-writer`), next to Journal in the sidebar.

1. **Brief form** — you give: topic, primary keyword, secondary keywords, intent (informational / booking-focused), audience, length (short ~600 / medium ~1200 / long ~2000 words), tone (friendly / professional / storytelling).

2. **AI draft** — generated server-side via the Lovable AI gateway (no keys in the browser). Returns:
   - SEO title, meta description, slug suggestion
   - H1 + introduction
   - Section headings with body copy
   - FAQ block (3–5 questions)
   - Suggested internal links (only to your real published tours, destinations, and guide pages)
   - Image suggestion notes

3. **Review & edit screen** — every field editable. Buttons: **Save as draft** (creates an unpublished journal post you finish in the Journal editor), **Regenerate section**, **Discard**. Nothing publishes automatically — the post goes live only when you flip "Published" in the Journal editor.

## Safety rules (built in, not optional)

- The AI may only reference **published tours and destinations from your real database**, plus facts you keep in a **Business Knowledge** box (new admin page: pickup policy, prices-from, contact, cancellation rules). It is instructed never to invent tours, prices, reviews, or claims.
- Anything the AI is unsure about gets a "verify this" flag with a field for a source link.
- **Auto-publish does not exist** — manual review is the only path to live.
- **Usage caps**: max 10 drafts/day, 40/month, with a generation log (who, when, topic, words) visible on the AI Writer page.

## Technical notes

- New server function `src/lib/ai-blog.functions.ts` using the existing gateway pattern from `ai-tour.functions.ts` (Gemini flash via `LOVABLE_API_KEY`, JSON-schema structured output, zod validation).
- New migration: `business_knowledge` table already exists from the SEO migration; add `ai_generation_log` table (id, user_id, topic, keywords, word_count, post_id, created_at) with RLS (`content.manage` permission) + grants.
- Draft posts are inserted into the existing `blog_posts` table with `published = false`, `author_name = "AI draft"` — zero changes to public journal routes.
- Sidebar entry added under the Content group with permission `content.manage`.

## Build order

1. Migration (generation log) + server function + business-knowledge fetch.
2. AI Writer page: brief form → draft preview/edit → save-as-draft.
3. Business Knowledge editor box (simple key/value facts list).
4. Usage log display + caps enforcement.
