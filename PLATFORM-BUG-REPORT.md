# Platform Bug: Apps published via `fas publish` return 404

## Summary

`fas publish` succeeds ("Provisioned!") but the app is never actually deployed. Visiting the live URL returns `404 - Not Found: pdfreader. has no asset at this path.`

The host worker is running and the D1 route exists, but the R2 bucket has no files because the deploy workflow's org-level secrets were never set.

## Steps to reproduce

```bash
cp -r templates/template-standalone apps/pdfreader
cd apps/pdfreader
# ... build the app ...
fas publish --yes --name pdfreader --category utilities --type standalone \
  --oneliner "Dark mode PDF reader"
git push origin main
# Visit https://pdfreader.freeappstore.online → 404
```

## Root cause

The Path B deploy pipeline has three components:

| Component | Status | Evidence |
|-----------|--------|----------|
| Host worker (`*.freeappstore.online` → R2) | Working | `curl` returns `Not Found: pdfreader. has no asset at this path.` (worker-style response, not CF generic error) |
| D1 route insert (`fas publish` → admin) | Working | Publish succeeds, slug resolves to host worker |
| R2 upload (`deploy.yml` → `aws s3 sync`) | **Broken** | Org secrets not set |

The template has `.github/workflows/deploy.yml` that uploads `web/dist/` to R2 via S3 API. It requires three org-level GitHub secrets:

- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_ACCOUNT_ID`

**These secrets were never set on the `freeappstore-online` GitHub org.**

### Proof

The deploy workflow has been attempted on `template-standalone` and failed both times:

```
gh run view 26262125986 -R freeappstore-online/template-standalone

JOBS
X deploy
  ✓ Build
  ✓ Verify build output
  X Upload to R2          ← FAILS HERE
```

From the job logs:
```
AWS_ACCESS_KEY_ID:
AWS_SECRET_ACCESS_KEY:
AWS_DEFAULT_REGION: auto
```

Both values are empty — the org secrets don't exist.

### Secondary issue: deploy.yml missing from new apps

The `deploy.yml` is in the template but `pdfreader` (and likely other recently published apps) doesn't have it. This happens when:
- The app was scaffolded before `deploy.yml` was added to the template
- Or the app repo was created by `fas publish` (empty repo) and the user pushed their own code without the workflow

Apps created by the VibeCode agent bypass this entirely — the agent creates CF Pages projects via API and never touches R2.

## What works vs what doesn't

| App creation path | Deploy mechanism | Status |
|---|---|---|
| VibeCode agent (`create.freeappstore.online`) | CF Pages project via API | Works |
| Legacy apps (timer, weather, etc.) | CF Pages via `wrangler pages deploy` in deploy.yml | Works |
| `fas publish` (CLI, Path B) | R2 via `aws s3 sync` in deploy.yml | **Broken** |

## Fix required

1. **Set the three org secrets** on `freeappstore-online`:
   - `R2_ACCESS_KEY_ID` — from CF dashboard → R2 → Manage R2 API Tokens
   - `R2_SECRET_ACCESS_KEY` — same
   - `R2_ACCOUNT_ID` — `c1089bfcc43c1c6c2aa89e584e86f0bc` (already in wrangler.toml files)

2. **Ensure `deploy.yml` is present** in new app repos. Either:
   - `fas publish` should push the workflow file when creating the repo, OR
   - The template copy step in `fas init` should verify all workflows are included

3. **For pdfreader specifically:** Add `.github/workflows/deploy.yml` from the template and push. Once org secrets are set, it will auto-deploy.

## Affected apps

Any app published via `fas publish` that doesn't have a legacy CF Pages deploy workflow. This includes all apps created after Path B was introduced that went through the CLI publish flow.

Working apps (kanban, facer, artout, whenly, etc.) were all deployed by VibeCode agent using the CF Pages path, which is why they work despite having no `deploy.yml`.
