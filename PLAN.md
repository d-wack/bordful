# Bordful — Project Plan & Expansion Roadmap

> A planning document that inventories the current Bordful codebase and lays out a
> step-by-step roadmap to evolve it from a read-only, config-driven job board
> *starter kit* into a fully-featured, multi-tenant job board *product* with
> authentication, self-service employer posting, payments, and applicant tracking.

**Status:** Planning · **Last updated:** 2026-06-27 · **Current version:** `0.1.0` (package) / `v0.1.60` (changelog)

---

## 1. Executive Summary

Bordful today is a **modern, statically-generated job board front end** built on
Next.js 15 (App Router), React 19, Tailwind CSS, and **Airtable as the data
backend**. It is deliberately a *starter kit*: there is no application database,
no authentication, and no write path inside the app. Content is managed entirely
through Airtable's UI (the "admin dashboard"), and the site renders it with
Incremental Static Regeneration (ISR), client-side search/filtering, rich SEO
(schema.org `JobPosting`), RSS/Atom/JSON feeds, OG image generation, and a deeply
configurable theme.

This plan does two things:

1. **Inventories** the current modules, architecture, file structure, and data model.
2. **Designs a roadmap** (7 phases) to expand Bordful into a full product: user
   accounts and roles, an employer portal for self-service job posting, Stripe
   payments, an applicant tracking flow, a first-class database, search at scale,
   and an admin back office — without throwing away the things Bordful already
   does well (SEO, configurability, performance).

---

## 2. Current State — Inventory

### 2.1 Tech Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15.5** (App Router) | RSC + ISR; `revalidate` per route |
| Runtime/UI | **React 19.1** | Server Components by default |
| Language | **TypeScript 5.9** | `ignoreBuildErrors: true` in `next.config.ts` ⚠️ |
| Package manager / runtime | **Bun** | `bun --bun next ...`, Turbopack dev |
| Styling | **Tailwind CSS 3.4** | `@tailwindcss/forms`, `@tailwindcss/typography` |
| Component primitives | **Radix UI** + **shadcn/ui** | `components/ui/*`, `components.json` |
| Icons | **lucide-react** | |
| Data backend | **Airtable** (`airtable` SDK) | single `Jobs` table; admin = Airtable UI |
| URL state | **nuqs** | search/filter/pagination synced to query string |
| Markdown | **react-markdown** + remark stack | job descriptions, FAQ rich text |
| SEO structured data | **schema-dts** | typed JSON-LD |
| Feeds | **feed** | RSS/Atom/JSON |
| Email | custom provider abstraction | Encharge implemented; others stubbed |
| Lint/format | **Biome** via **Ultracite** | strict a11y + complexity rules (`AGENTS.md`) |
| Fonts | `geist`, `@fontsource/inter`, `@fontsource/ibm-plex-serif` | configurable |

### 2.2 High-Level Architecture

```
                Airtable (Jobs table)  ◄── content managed by board owner
                       │  read-only (Personal Access Token)
                       ▼
   lib/db/airtable.server.ts   ── server-only, React cache(), normalizers
                       │  returns typed Job[]
                       ▼
   App Router pages (RSC)  ── ISR (revalidate: 300s), generateMetadata, JSON-LD
                       │
        ┌──────────────┼─────────────────────────┐
        ▼              ▼                          ▼
  Server render   Client islands            Route handlers
  (job lists,     (JobSearch, filters,      (/feed.xml, /atom.xml,
   detail, SEO)    pagination via nuqs)      /feed.json, /api/og/*,
                                             /api/subscribe, sitemap, robots)
                       │
                       ▼
            config/config.ts  ── single source of truth for branding,
            (merges over          nav, footer, hero, pricing, FAQ, theme,
             config.example.ts)    currency, email, jobs pages, etc.
```

**Key architectural properties**

- **No application database, no write path.** The app only *reads* from Airtable.
  All mutations (creating/editing jobs) happen in Airtable's own UI. The site is
  effectively a static publishing layer.
- **`server-only` data boundary.** `lib/db/airtable.server.ts` is the single
  server-side gateway. It is wrapped in React `cache()` for per-request memoization
  and aggressively **normalizes** messy Airtable values into a strict `Job` type.
- **Config-as-code.** `config/config.example.ts` (~1400 lines) defines a typed
  `Config`. Users copy it to `config/config.ts`; `config/index.ts` shallow-merges
  the override on top. Almost every visual/structural aspect is config-driven.
- **Client-side search & filtering.** Jobs are fetched once server-side, then
  filtered/sorted/paginated in the browser with state mirrored to the URL via
  `nuqs` (`lib/hooks/*`, `lib/utils/filter-jobs.ts`).
- **SEO-first.** Every page emits `generateMetadata`, JSON-LD via `schema-dts`,
  dynamic OG images (`/api/og`), sitemap, robots, and feeds.

### 2.3 Directory / Module Map

```
app/                         # Next.js App Router
  page.tsx                   # Home
  layout.tsx                 # Root layout, fonts, nav, footer
  jobs/
    page.tsx                 # Jobs index / category hub (ISR 300s)
    [slug]/page.tsx          # Job detail (+ JSON-LD, similar jobs)
    type/[type]/             # Taxonomy: job type
    level/[level]/           # Taxonomy: career level
    language/[language]/     # Taxonomy: language
    location/[location]/     # Taxonomy: location
    {types,levels,languages,locations}/  # Taxonomy index pages
    not-found.tsx
  job-alerts/page.tsx        # Email subscription form
  {about,contact,faq,pricing,changelog,privacy,terms}/page.tsx  # Static/config pages
  api/
    og/route.tsx             # Dynamic OG image (default)
    og/jobs/[slug]/route.tsx # Per-job OG image
    subscribe/route.ts       # Job-alert signup (rate-limited)
  feed.xml / atom.xml / feed.json   # Syndication feeds
  sitemap.ts / robots.ts     # SEO infra

components/
  ui/                        # shadcn/Radix primitives + domain UI (schemas, nav, footer, filters)
  jobs/                      # JobCard, JobListings, JobSearch, JobsLayout, Compact* variants
  home/HomePage.tsx
  contact/, job-alerts/      # Page-specific composites

config/
  config.example.ts          # Typed default Config (source of truth)
  config.ts                  # User override (git-ignored in real installs)
  index.ts                   # Merge loader

lib/
  db/
    airtable.ts              # Domain types (Job, Salary) + salary formatters
    airtable.server.ts       # server-only fetchers + normalizers
  config/routes.ts           # Route registry + matcher (for breadcrumbs)
  constants/                 # career-levels, countries, currencies, job-types,
                             #   languages, locations, workplace, defaults
  email/                     # Provider abstraction (types + Encharge impl)
  hooks/                     # useJobSearch, useJobsPerPage, usePagination, useSortOrder
  utils/                     # colors, fonts, metadata, markdown, rss, slugify,
                             #   filter-jobs, og-*, image-utils, job-validation
hooks/use-toast.ts

docs/                        # Extensive end-user documentation (getting-started,
                             #   guides, reference, integrations, advanced)
```

### 2.4 Current Data Model (`lib/db/airtable.ts`)

The single domain entity is **`Job`**. There is no `Company`, `User`, or
`Application` entity — companies are denormalized strings on the job.

```ts
type Job = {
  id: string;                 // Airtable record id
  title: string;
  company: string;            // denormalized name only
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Freelance';
  salary: Salary | null;      // { min, max, currency, unit }
  description: string;        // markdown
  benefits: string | null;
  application_requirements: string | null;
  apply_url: string;          // external apply (off-site)
  posted_date: string;
  valid_through?: string | null;
  job_identifier?, job_source_name?: string | null;
  status: 'active' | 'inactive';
  career_level: CareerLevel[];        // 18-value enum
  visa_sponsorship: 'Yes' | 'No' | 'Not specified';
  featured: boolean;
  workplace_type: WorkplaceType;      // On-site | Hybrid | Remote | Not specified
  remote_region: RemoteRegion;
  timezone_requirements, workplace_city, workplace_country: string | null;
  languages: LanguageCode[];
  // schema.org enrichment:
  skills?, qualifications?, education_requirements?,
  experience_requirements?, industry?, occupational_category?,
  responsibilities?: string | null;
};
```

Supporting types: `Salary` (multi-currency, multi-unit with USD normalization for
sorting via `normalizeAnnualSalary`), `CareerLevel` (18 levels), `SalaryUnit`.

### 2.5 What Works Well Today (keep / build on)

- Strong **SEO** (JSON-LD, OG images, feeds, sitemap, robots).
- Deep **configurability** without code changes.
- **Performance** via ISR + static generation + client filtering.
- Clean **server/client boundary** and value **normalization**.
- **Provider abstraction** pattern for email (a template for future integrations).
- Excellent **documentation** culture (`docs/`).

### 2.6 Gaps vs. a "Fully-Featured Job Board"

| Capability | Today | Needed |
|---|---|---|
| User accounts | ❌ none | Auth + sessions |
| Roles/permissions | ❌ none | Job seeker / Employer / Admin |
| Self-service posting | ❌ Airtable only | Employer dashboard + form |
| Payments | ❌ static pricing page | Stripe checkout for paid posts |
| Applications | ❌ external `apply_url` only | On-site apply + ATS inbox |
| Company profiles | ❌ string field | First-class entity + pages |
| Database | ⚠️ Airtable (read-only) | Relational DB w/ writes |
| Search at scale | ⚠️ client-side, all-in-memory | Server/index-based search |
| Saved jobs / alerts per user | ⚠️ anonymous email only | Per-user saved jobs + alerts |
| Admin moderation | ❌ Airtable UI | In-app moderation queue |
| Notifications | ⚠️ marketing email only | Transactional email |

---

## 3. Design Decisions for the Expansion

These are the foundational decisions the roadmap depends on. Each notes the
trade-off and the recommendation.

### D1. Database: keep Airtable or move to Postgres?

- **Recommendation:** Introduce **PostgreSQL** (via **Prisma** ORM) as the system
  of record for all *new* write-heavy entities (users, companies, applications,
  orders), while keeping an **Airtable adapter** behind a repository interface so
  existing read-only deployments keep working.
- **Why:** Airtable's API rate limits (5 req/s/base), lack of transactions, and
  weak relational integrity make it unsuitable for user data, payments, and
  applications. Postgres gives ACID, joins, and full-text search.
- **Migration strategy:** define a `JobRepository` interface; ship two
  implementations (`AirtableJobRepository`, `PrismaJobRepository`) selectable by
  config/env. This preserves backward compatibility and a clean cutover path.

### D2. Authentication

- **Recommendation:** **Auth.js (NextAuth v5)** with Prisma adapter. Support
  email magic links + OAuth (Google, GitHub, LinkedIn). LinkedIn OAuth is
  especially valuable for job seekers (profile import).
- **Why:** First-class App Router support, session management, CSRF protection,
  and a large provider ecosystem without building auth from scratch.

### D3. Payments

- **Recommendation:** **Stripe Checkout + Webhooks** for paid job postings and
  featured upgrades; the existing `pricing` config drives the plan catalog.
- **Why:** Lowest-friction PCI-compliant path; webhook-driven order fulfillment
  fits the ISR model (mark job paid → publish → revalidate).

### D4. Search

- **Phase 1:** keep client-side filtering (works to ~1–2k jobs).
- **At scale:** move to **Postgres full-text search** (`tsvector`) first, then an
  optional **Typesense/Meilisearch** adapter for faceted instant search if volume
  demands it. Keep the same `filter-jobs` facet model on the UI side.

### D5. Rendering strategy

- **Keep ISR** for public, cacheable pages (job lists, detail, taxonomy).
- **Use dynamic / server actions** for authenticated surfaces (dashboards, apply
  flow, admin). Public pages stay fast and SEO-friendly; private pages are
  always-fresh.
- On every write that affects public content, call `revalidatePath` /
  `revalidateTag` to refresh ISR caches immediately.

### D6. Authorization model

- **Roles:** `JOB_SEEKER`, `EMPLOYER`, `ADMIN` (+ implicit `GUEST`).
- Enforce in a single `lib/auth/authorize.ts` guard used by server actions and
  route handlers; never trust the client. Company-scoped resources check
  membership (`CompanyMember` join), not just role.

### D7. Keep config-as-code

- New features must remain **toggleable via `config.ts`** (e.g.
  `config.auth.enabled`, `config.payments.enabled`). A deployer who wants the
  classic read-only Airtable board should be able to keep it by leaving the new
  modules disabled. This is Bordful's core value proposition — don't break it.

---

## 4. Target Data Model (Postgres / Prisma)

New and evolved entities. The current denormalized `Job.company` string becomes a
relation to a `Company`.

```
User (id, email, name, image, role, hashedPassword?, emailVerified, createdAt)
  ├─ Account / Session            # Auth.js
  ├─ companyMemberships  → CompanyMember[]
  ├─ applications        → Application[]   (as job seeker)
  ├─ savedJobs           → SavedJob[]
  └─ jobAlerts           → JobAlert[]

Company (id, name, slug, logoUrl, website, description, location, size, verified)
  ├─ members  → CompanyMember[]   (user ↔ company, role: OWNER|ADMIN|RECRUITER)
  ├─ jobs     → Job[]
  └─ orders   → Order[]

Job (… existing fields …, companyId FK, status, postedById, planId,
     publishedAt, expiresAt, moderationState: DRAFT|PENDING|APPROVED|REJECTED)
  ├─ applications → Application[]
  └─ savedBy      → SavedJob[]

Application (id, jobId, userId?, applicantName, email, resumeUrl, coverLetter,
             answers Json, status: NEW|REVIEWED|SHORTLISTED|REJECTED|HIRED, createdAt)

SavedJob (userId, jobId, createdAt)            # bookmark
JobAlert (id, userId?, email, query Json, frequency, lastSentAt, active)
Order (id, companyId, jobId?, stripeSessionId, planId, amount, currency,
       status: PENDING|PAID|REFUNDED, createdAt)   # payments
Plan (id, name, price, billingTerm, features[])    # mirrors config.pricing
```

**Backward-compat note:** the public `Job` shape consumed by the UI stays the
same; the repository layer maps DB rows (with joined `Company`) into the existing
`Job` type so components don't change.

---

## 5. API Surface (new)

Mix of **Server Actions** (preferred for form mutations) and **Route Handlers**
(for webhooks, REST-ish needs, and third-party callbacks).

### Public

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/jobs` | Paginated/filtered job query (JSON; for future SPA/mobile) |
| GET | `/api/jobs/[slug]` | Single job |
| GET | `/api/companies/[slug]` | Company profile + open roles |
| POST | `/api/subscribe` | *(exists)* anonymous job-alert signup |

### Auth (Auth.js)

| Method | Path | Purpose |
|---|---|---|
| ALL | `/api/auth/[...nextauth]` | Sign in/out, OAuth callbacks, sessions |

### Job seeker (role: JOB_SEEKER)

| Action / Path | Purpose |
|---|---|
| `applyToJob(jobId, formData)` | Submit application (resume upload → storage) |
| `toggleSaveJob(jobId)` | Bookmark/unbookmark |
| `upsertJobAlert(query)` | Personalized alerts |
| `/dashboard` | Saved jobs, applications, alerts |

### Employer (role: EMPLOYER / company member)

| Action / Path | Purpose |
|---|---|
| `/employer` | Company dashboard |
| `createJob` / `updateJob` / `closeJob` | Manage postings (→ moderation queue) |
| `POST /api/checkout` | Create Stripe Checkout session for a paid post |
| `/employer/jobs/[id]/applicants` | ATS inbox; update `Application.status` |
| `updateCompany` | Company profile + branding |

### Payments

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/webhooks/stripe` | Fulfill orders on `checkout.session.completed`; publish job + `revalidatePath` |

### Admin (role: ADMIN)

| Path | Purpose |
|---|---|
| `/admin` | Overview metrics |
| `/admin/moderation` | Approve/reject pending jobs |
| `/admin/users`, `/admin/companies` | Management |

---

## 6. User Roles & Permissions

| Capability | Guest | Job Seeker | Employer | Admin |
|---|:--:|:--:|:--:|:--:|
| Browse / search jobs | ✅ | ✅ | ✅ | ✅ |
| View job detail, feeds | ✅ | ✅ | ✅ | ✅ |
| Save jobs / personalized alerts | — | ✅ | ✅ | ✅ |
| Apply on-site | — | ✅ | ✅ | ✅ |
| Create / edit own company's jobs | — | — | ✅ | ✅ |
| Pay for / feature a posting | — | — | ✅ | ✅ |
| View applicants for own jobs | — | — | ✅ | ✅ |
| Moderate any job / manage users | — | — | — | ✅ |

Authorization is centralized and resource-scoped (an employer may only touch jobs
belonging to a company they are a member of).

---

## 7. Roadmap (Phased)

Each phase is independently shippable and gated behind a config flag.

### Phase 0 — Foundation & Hygiene (1 sprint)
- Re-enable TypeScript build errors (`ignoreBuildErrors: false`) and fix fallout.
- Add a test harness (Vitest + React Testing Library + Playwright e2e).
- Introduce the **`JobRepository` interface** and refactor
  `lib/db/airtable.server.ts` to implement it (no behavior change).
- Add CI (typecheck, `ultracite check`, tests, build).
- **Exit:** green CI, repository abstraction in place, zero UX change.

### Phase 1 — Database & Auth (2 sprints)
- Stand up **Postgres + Prisma**; implement `PrismaJobRepository`.
- One-time **Airtable → Postgres importer**; `Company` extracted from `Job.company`.
- Wire **Auth.js** (magic link + Google/GitHub/LinkedIn); `User`/`Account`/`Session`.
- Build sign-in/up UI and session-aware nav.
- Config flags: `config.database.provider`, `config.auth.enabled`.
- **Exit:** users can register/sign in; jobs read from Postgres; Airtable mode still selectable.

### Phase 2 — Job Seeker Features (1–2 sprints)
- `/dashboard` with **saved jobs**, **personalized alerts** (upgrade anonymous
  `/api/subscribe` to optionally attach to a user), and application history.
- "Save" affordance on `JobCard`/detail.
- **Exit:** logged-in seekers can bookmark jobs and manage alerts.

### Phase 3 — Employer Portal & Self-Service Posting (2–3 sprints)
- `/employer` dashboard; **company creation + membership** (`CompanyMember`).
- Multi-step **job posting form** (reusing the `Job` field set + markdown editor).
- New jobs enter the **moderation queue** (`moderationState`).
- First-class **company profile pages** (`/companies/[slug]`) + JSON-LD `Organization`.
- **Exit:** an employer can self-register, create a company, and submit a job (free/pending).

### Phase 4 — Payments (1–2 sprints)
- **Stripe Checkout** for paid posts and **featured** upgrades; plans sourced from
  `config.pricing` synced to `Plan`.
- `/api/webhooks/stripe` → mark `Order` paid → publish job → `revalidatePath`.
- Billing history in employer dashboard.
- Config flag: `config.payments.enabled` (+ Stripe keys in env).
- **Exit:** employer pays, job auto-publishes, feeds/sitemap refresh.

### Phase 5 — On-Site Applications / Lightweight ATS (2 sprints)
- Toggle per job: external `apply_url` **or** on-site apply form.
- Resume upload to object storage (S3/R2/UploadThing); custom screening questions.
- Employer **applicant inbox** with status pipeline + transactional email
  (extend the email provider abstraction with a transactional sender).
- **Exit:** candidates apply on-site; employers triage applicants in-app.

### Phase 6 — Admin Back Office & Search at Scale (1–2 sprints)
- `/admin` moderation queue, user/company management, basic analytics.
- Migrate search to **Postgres FTS**; optional Typesense/Meilisearch adapter.
- **Exit:** admins moderate in-app; search no longer loads all jobs into memory.

### Phase 7 — Polish & Growth (ongoing)
- Email digests / weekly alert cron (Vercel Cron or Inngest).
- Analytics dashboard for employers (views, applies, conversion).
- i18n of the UI (the data model already carries `languages`).
- Accessibility & performance audits; keep Ultracite green.

---

## 8. Cross-Cutting Concerns

- **Security:** server-side authz on every mutation; validate all input with
  **Zod**; rate-limit (generalize the in-memory limiter in `/api/subscribe` to a
  shared Redis/Upstash limiter); signed Stripe webhooks; CSRF via Auth.js;
  least-privilege DB access. Remove `ignoreBuildErrors`.
- **Observability:** structured logging, Sentry, Stripe/webhook audit log.
- **Caching/ISR discipline:** every write that changes public content must
  `revalidatePath`/`revalidateTag`. Keep public pages static; keep private pages dynamic.
- **Backward compatibility:** the classic "Airtable read-only board" must remain a
  supported deployment mode via config flags and the repository interface.
- **Migrations:** Prisma Migrate; the Airtable importer is idempotent and re-runnable.
- **Docs:** mirror the existing `docs/` quality — every new module ships a guide.

## 9. Suggested Dependencies (new)

`prisma` / `@prisma/client`, `next-auth@5` + `@auth/prisma-adapter`, `stripe`,
`zod`, `@upstash/ratelimit` + `@upstash/redis`, an upload lib (`uploadthing` or
`@aws-sdk/client-s3`), `vitest` + `@testing-library/react` + `@playwright/test`,
and optionally `typesense`/`meilisearch` for Phase 6.

## 10. Risks & Open Questions

- **Dual data backend complexity** — mitigated by the repository interface, but
  adds maintenance surface. Decide whether Airtable mode is a long-term commitment
  or a deprecation path.
- **Payments/tax/refund policy** — out of scope here; needs product input.
- **Moderation policy & spam** — self-service posting invites abuse; Phase 3 must
  ship with at least manual moderation before Phase 4 opens paid posting.
- **Resume PII** — storage, retention, and GDPR/CCPA handling for applications.
- **Search scale threshold** — confirm the client-side ceiling before investing in
  an external search engine (Phase 6 is conditional on real volume).

---

### Appendix A — Phase → Module Touchpoints (quick reference)

| Phase | Primary new/changed areas |
|---|---|
| 0 | `lib/db/*` (repo interface), `next.config.ts`, CI, tests |
| 1 | `prisma/`, `lib/auth/`, `lib/db/prisma.*`, importer script |
| 2 | `app/dashboard/`, `components/jobs/` (save button), alerts |
| 3 | `app/employer/`, `app/companies/`, posting form, moderation state |
| 4 | `app/api/checkout`, `app/api/webhooks/stripe`, `lib/payments/`, `Order`/`Plan` |
| 5 | `app/jobs/[slug]/apply`, `app/employer/.../applicants`, storage + transactional email |
| 6 | `app/admin/`, search adapter (`lib/search/`) |
| 7 | cron jobs, analytics, i18n, audits |
