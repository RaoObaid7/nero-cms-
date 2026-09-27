# Editorial Guide

This is a guide for editors writing and publishing content in the admin — not
for developers. It covers building a page or article from blocks, how drafts
and preview work, how scheduling works, and how to restore an earlier
version.

If you have used WordPress, Payload's admin will feel familiar: a list of
content types on the left, a document editor in the middle, and a
Draft/Publish workflow on every document.

## 1. Content types

- **Pages** — standalone pages (a home page, an about page, a landing page).
- **Articles** — blog/news style content, with an excerpt, cover image, author,
  categories and tags.
- **Categories** and **Tags** — the taxonomy you attach to articles. An
  article has one primary category, any number of additional categories, and
  any number of tags.
- **Media** — images used across pages, articles and blocks.

## 2. Building a page or article from blocks

Every Page and Article has a **Layout** field. This is where you assemble the
page body from a fixed set of content blocks — click **Add Layout**, pick a
block, fill in its fields, and reorder blocks by dragging the handle on the
left of each block's header.

The available blocks are:

| Block              | What it's for                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hero**           | A page-opening banner: a heading, an optional supporting line, an optional image, and one optional button/link.                             |
| **Rich Text**      | A free-form section of formatted text — paragraphs, headings, lists, links.                                                                 |
| **Image + Text**   | An image next to a block of text, with the image on the left or right.                                                                      |
| **Gallery**        | An ordered set of images, each with an optional caption.                                                                                    |
| **Callout**        | A short highlighted note — either a quotation (with an optional attribution) or an informational aside.                                     |
| **Content Cards**  | A set of linked cards — a title, a short summary, an optional image, and a link. Good for "our packages" or "related pages" style sections. |
| **FAQ**            | A list of question/answer pairs.                                                                                                            |
| **Call to Action** | A heading, a line of body copy, and one or two action buttons.                                                                              |

A few things are deliberately fixed and cannot be changed per block:

- **Headings inside blocks start at "H2".** The page's main heading (H1) is
  owned by the page template, not by any block — this keeps every page's
  heading structure consistent and accessible.
- **Layout options are a fixed dropdown** (e.g. Image + Text's left/right
  choice), not a free-form size or position. This keeps every page visually
  consistent, and is intentional — it is not a missing feature.
- **You cannot paste raw HTML or scripts into any field.** Rich text fields
  only accept the formatting the toolbar offers.

If you need a kind of content block that isn't in this list, ask a developer —
new blocks are something the project can add without you needing to work
around the limitation with rich text.

## 3. Drafts and preview

Every Page and Article has a **Save Draft** and a **Publish changes** button.
Saving a draft never makes content visible on the public site — only
**Publish changes** does that (subject to scheduling — see below).

To see what a draft (or an already-published document with unsaved changes)
will actually look like on the site, use the **Preview** button in the
document's sidebar. This opens the live rendered page in a new tab/panel.
Preview always works, whether the document is a draft or published, because
it carries an authorization token the admin generates for you — you don't
need to do anything to enable it.

Preview pages are marked so they are never indexed by search engines and are
never cached publicly, so it's safe to preview drafts as often as you like
without worrying about early/unpublished content leaking out through a search
engine or a shared cache.

## 4. Scheduling

Every Page and Article has an optional **Publish At** field, near the bottom
of the document. Set a future date and time, then click **Publish changes** —
the document stays in draft (invisible to visitors) until that date/time
arrives.

> **Before you rely on this:** the scheduled-publish job is not yet wired to a
> scheduler on any environment. Until your developer confirms it runs on a
> timer, a scheduled document stays in draft past its date instead of going
> live on its own. Check with them before scheduling anything time-critical.

A few practical notes:

- If you leave **Publish At** empty and click **Publish changes**, the
  document is published immediately, as normal.
- If you set a **Publish At** date in the past (or don't set one) and click
  **Publish changes**, it publishes immediately — **Publish At** only ever
  delays publishing, it never blocks or un-publishes something already live.
- Once the job is wired, scheduled publishing is checked periodically in the
  background; allow a short delay (a few minutes, depending on how the site is
  deployed) between the scheduled time and the change actually appearing live.

## 5. Version history and restore

Every change to a Page or Article is kept as a version. To see the history:

1. Open the document.
2. Open its **Versions** tab (in the document's sidebar/tabs, alongside the
   main edit view).
3. Browse previous versions. Each shows what changed and when.
4. To bring back an earlier version, open it and choose **Restore this
   version**.

Restoring makes that earlier version the current draft/published content
again — exactly as if you had edited the document back to that state and
saved. It does not delete the version history; the version you restore
_from_ is still there afterward, right alongside a new version recording the
restore itself.

## 6. Roles

- **Editors** can create, edit, publish and unpublish Pages, Articles,
  Categories, Tags and Media, and preview drafts.
- **Admins** can additionally manage user accounts and roles.

If a field or action described here is missing or greyed out for you, it's
most likely a role restriction — ask an administrator.
