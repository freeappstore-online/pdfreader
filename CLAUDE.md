# VibeCode

The VibeCode React app — AI-powered app builder for FreeAppStore. Users describe an app, the agent builds it, deploys it to freeappstore.online.

- Subdomain: `create.freeappstore.online`
- Dev: `pnpm install && pnpm dev`
- Build: `pnpm build`
- Deploy: `git push origin main` (auto-deploys via Cloudflare Pages)

Free, MIT-licensed, no tracking. For platform conventions, read
https://raw.githubusercontent.com/freeappstore-online/freeappstore/main/SKILLS.md
before writing or changing anything.

> Repo-name caveat: this repo is `freeappstore-online/template-standalone` for historical reasons, but the contents are not a template — it's the VibeCode app. The package.json name is `freeappstore-create`. A future rename to `freeappstore-online/create` (or similar) would be cleaner.

---

## Structure

```
create/
├── web/
│   ├── src/
│   │   ├── App.tsx                 ← Router (/ = Create, /profile = Profile)
│   │   ├── main.tsx
│   │   ├── index.css               ← Tailwind + brand CSS variables
│   │   ├── components/
│   │   │   └── Nav.tsx             ← Header nav + mobile hamburger
│   │   ├── pages/
│   │   │   ├── Create.tsx          ← VibeCode chat + preview + deploy
│   │   │   └── Profile.tsx         ← User profile + account management
│   │   ├── hooks/
│   │   │   ├── useAuth.ts          ← Auth context (GitHub OAuth)
│   │   │   └── useAgent.ts         ← SSE streaming, projects, chat state
│   │   └── lib/
│   │       └── api.ts              ← API client (auth, agent URLs)
│   ├── public/
│   │   ├── manifest.json
│   │   └── _redirects              ← SPA routing for CF Pages
│   └── package.json
├── package.json
└── CLAUDE.md
```

## Deployment specifics

This app deviates from the standard `git push → CF Pages auto-build` because of the build-output path:

- Build command: `npx pnpm@10 install && npx pnpm@10 build`
- Build output: `web/dist`

These need to be configured in the Cloudflare Pages project settings (one-time).

## Auth

Uses the same `.freeappstore.online` cookie as the store site. GitHub OAuth via `api.freeappstore.online/auth/*`. The `useAuth` hook checks `/auth/me` on load and provides user context.

## Agent

Calls `agent.freeappstore.online/session/:id/*` for chat. The `useAgent` hook handles SSE streaming, tool-call rendering, project management (localStorage), and deploy-status tracking.
