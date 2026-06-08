# MathStudy.in — Pre-Launch Security Audit

Audit of the Node/Express e-book shop before go-live. Each item lists the finding
and its status.

## Fixed in this pass

| # | Severity | Area | Finding → Fix |
|---|----------|------|----------------|
| 1 | High     | Dependencies | `nodemailer` had SMTP-injection/DoS CVEs → upgraded to **8.0.10**. |
| 2 | Moderate | Dependencies | `uuid` had a CVE and was **unused** → removed. `npm audit` now reports **0 vulnerabilities**. |
| 3 | High     | Sessions | `secure` cookie was set but `trust proxy` wasn't → cookies wouldn't set behind Cloudflare/Nginx. **Added `app.set('trust proxy', 1)`.** |
| 4 | Medium   | Sessions | Dev fallback `SESSION_SECRET` could run in prod (session forgery) → **app now refuses to start in production without `SESSION_SECRET`.** |
| 5 | Medium   | CSRF | No CSRF tokens → **added `sameSite: 'lax'`** to the session cookie (blocks cross-site state-changing POSTs in modern browsers). |
| 6 | Low      | Open redirect | Login `next` accepted `//evil.com` → **`safeNext()`** now allows only same-site `/path` (rejects `//`, `/\`, absolute URLs). |
| 7 | High     | Auth | Passwords were SHA-256; default admin password was in the repo → **bcrypt (cost 12)** + no hardcoded default + change-password page (earlier commit). |

## Audited — no action needed (already safe)

- **SQL injection:** all queries are parameterised; the two dynamic column
  references are whitelisted (`['is_published','is_featured']`) or hardcoded
  literals — not user input.
- **Access control:** admin routes gated by `requireAdmin` (role check); download
  links scoped to `user_id` + expiry + use-count (no IDOR); order approve/reject
  links gated by a per-order random token and are idempotent.
- **XSS:** user-supplied content (reviews, names) is HTML-escaped (`<%= %>`). Only
  admin-authored product descriptions / blog bodies render raw HTML (trusted).
- **File uploads:** admin-only, type-filtered (image/PDF), size-limited (5/50 MB),
  filenames sanitised; paid PDFs stored outside the web root (`data/ebooks`).
- **Headers:** Helmet enabled — CSP set (no `unsafe-eval`), HSTS on,
  `X-Powered-By` removed, `nosniff`, frame protection.
- **Rate limiting:** `/auth` 30/15min (brute-force), `/download` 20/hr, `/api` 200/15min.
- **Error handling:** error pages never leak stack traces or paths to the browser.
- **Secrets:** no real `.env` or credentials committed; `.env`, PDFs and the secret
  Drive-links file are git-ignored.
- **Dangerous calls:** no `eval` / `child_process` / dynamic `Function`.

## Recommended next (optional, not blockers)

- **CSRF tokens** on forms (defence-in-depth beyond SameSite) — e.g. `csurf` or a
  double-submit token. SameSite=lax already covers the common cases.
- **MySQL-backed session store** (`express-mysql-session`) so logins survive app
  restarts and scale beyond one instance (currently in-memory).
- **Admin 2FA** for the dashboard.
- **Origin firewall:** restrict the VPS to Cloudflare IPs (see `MIGRATION.md` Appendix B).
- Keep `npm audit` clean: re-run before each deploy.

_Last audited: pre-launch. Re-run `npm audit --omit=dev` and these checks before each release._
