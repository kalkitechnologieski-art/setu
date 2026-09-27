# Setu Kalki — Deployment Guide

Zero-cost, zero-card deployment. Every service runs on a managed free tier.

## Prerequisites

- Node.js 18.18 or later
- npm 10 or later
- GitHub account (for Vercel + Supabase login)
- Vercel CLI: `npm i -g vercel`

## Environment Variables

Run `./phase2.sh add-keys` to populate `.env.local`, or set these in
Vercel → Project Settings → Environment Variables.

| Variable | Required | Source |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Yes | Supabase → Connect |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Yes | Supabase → API keys |
| SUPABASE_SERVICE_ROLE_KEY | Yes | Supabase → API keys (server-only) |
| NEXT_PUBLIC_APP_URL | Yes | Your deploy URL |
| GROQ_API_KEY | Recommended | console.groq.com (primary LLM) |
| GEMINI_API_KEY | Recommended | aistudio.google.com (fallback) |
| OPENROUTER_API_KEY | Optional | openrouter.ai (fallback 2) |
| RESEND_API_KEY | Optional | resend.com |
| AGENTCALL_API_KEY | Optional | agentcall.co |
| GOOGLE_ADS_CLIENT_ID | Optional | Google Cloud Console |
| GOOGLE_ADS_CLIENT_SECRET | Optional | Google Cloud Console |
| META_ADS_CLIENT_ID | Optional | Meta App Dashboard |
| META_ADS_CLIENT_SECRET | Optional | Meta App Dashboard |
| CRON_SECRET | Yes | `openssl rand -hex 32` |

At least one LLM provider is required. The router chains Groq to Gemini to OpenRouter.

## Deploy

### First time

    ./phase8-fix.sh                     # polish pass
    ./predeploy.sh                      # 8-check verification gate
    ./phase3.sh push                    # apply migrations
    vercel login
    ./phase4.sh deploy                  # push env vars + deploy

### Subsequent deploys

    git push
    # Vercel auto-deploys on push to main

## Post-Deploy Verification

    curl -s https://your-app.vercel.app/api/health | jq
    curl -s https://your-app.vercel.app/robots.txt
    curl -s https://your-app.vercel.app/sitemap.xml

Expected health response:

    {
      "ok": true,
      "status": "healthy",
      "checks": {
        "env": { "ok": true, "missingRequired": [] },
        "database": { "ok": true, "latencyMs": 45 }
      }
    }

## Supabase Configuration

In Supabase Dashboard → Authentication → URL Configuration:

- Site URL: your production URL
- Redirect URLs:
  - https://your-app.vercel.app/callback
  - https://*-your-team.vercel.app/callback  (Vercel preview deploys)
  - http://localhost:3000/callback           (local dev)

## Platform OAuth Redirect URIs

Register in each provider console:

| Provider | Console | Redirect URI |
|---|---|---|
| Google Ads | Google Cloud Console → Credentials | /api/oauth/google_ads/callback |
| YouTube | Same Google Cloud project | /api/oauth/youtube/callback |
| Meta | Meta App Dashboard → Facebook Login | /api/oauth/meta_ads/callback |

Prefix each path with your full production URL.

**Google note:** if the OAuth consent screen is in Testing mode, refresh
tokens expire every 7 days. Publish the app to receive long-lived tokens.

## Cron Jobs

`vercel.json` registers `/api/cron/refresh-tokens` running every 6 hours.
Vercel auto-sends `Authorization: Bearer ${CRON_SECRET}`. Set CRON_SECRET
in Vercel before deploying.

## Migration History

| File | Contents |
|---|---|
| 001_init.sql | 9 core tables + RLS + functions |
| 002_seed.sql | Dev seed (idempotent) |
| 003_phase5.sql | Approvals, signals, agent_costs |
| 004_vault_rpc.sql | Vault wrappers |
| 005_auth_platforms.sql | platform_connections, auth_events |
| 006_vault_rpc.sql | Admin Vault RPCs |
| 007_ops_center.sql | Agent registry, chains, metrics, governance |

## Rollback

Vercel: instant rollback from the dashboard — Deployments → Promote any
previous deploy.

Database: Supabase daily backups (Pro plan) or local reset via
`supabase db reset`.

## Monitoring

- Health: GET /api/health — wire to UptimeRobot or BetterStack
- Errors: client errors land in governance_events (severity=warning)
- Costs: /ops cost donut reads agent_metrics.cost_usd
- Audit: /ops/governance — immutable event ledger

## Support

Logs:

- Vercel: `vercel logs https://your-app.vercel.app`
- Supabase: Dashboard → Logs → Postgres / API / Auth
- Local: `~/.setu/logs/`

---

## Netlify Secrets Scanner

Netlify's build pipeline runs a secrets scanner after every build. It
searches the compiled output for the literal values of every environment
variable. If a value is found, the build fails:

    Secrets scanning found secrets in build.
    Secret env var "NEXT_PUBLIC_SUPABASE_URL"'s value detected:
      found value at line 110 in .netlify/edge-functions/...
      /___netlify-edge-handler-middleware/server/middleware.js

### Why this happens

Next.js **inlines every `NEXT_PUBLIC_*` variable** at build time. The
values end up inside client bundles and inside the middleware edge
function. That's by design — those variables are meant to be shipped to
browsers.

Netlify's scanner cannot distinguish public-by-design variables from true
secrets. It flags any env var value it finds in build output.

### The fix

`netlify.toml` includes a whitelist of the three public variables:

    [build.environment]
      SECRETS_SCAN_ENABLED = "true"
      SECRETS_SCAN_OMIT_KEYS = "NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,NEXT_PUBLIC_APP_URL"

The scanner still runs — it just ignores those specific keys. Real secrets
(SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY, RESEND_API_KEY, AGENTCALL_API_KEY,
MARKIFACT_API_KEY, LANGSMITH_API_KEY, CRON_SECRET, GOOGLE_ADS_CLIENT_SECRET,
META_ADS_CLIENT_SECRET) do not have the NEXT_PUBLIC_ prefix, are never
inlined, and remain fully subject to the scanner.

### If you deploy via Netlify UI

The same variable can be set manually:

**Site configuration → Build & deploy → Environment variables:**

    SECRETS_SCAN_OMIT_KEYS = NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,NEXT_PUBLIC_APP_URL

Then trigger **Deploys → Trigger deploy → Clear cache and deploy site**.

### Other scanner controls

| Variable | Purpose |
|---|---|
| `SECRETS_SCAN_ENABLED` | Set to `"false"` to disable scanning entirely (not recommended) |
| `SECRETS_SCAN_OMIT_KEYS` | Comma-separated env var **names** to skip |
| `SECRETS_SCAN_OMIT_PATHS` | Glob patterns of file paths to skip |
| `SECRETS_SCAN_SMART_DETECTION_ENABLED` | Set to `"false"` to disable heuristic detection |

Use `SECRETS_SCAN_OMIT_KEYS` — never disable scanning globally.
