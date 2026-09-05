# GitHub Actions Learning Project — Deployment Plan

## What We're Building

A pnpm monorepo with a minimal React app and Express API, deployed as Docker containers via GitHub Actions. The apps are intentionally simple — the learning goal is the CI workflow, not the code.

- **React (Vite)** → multi-stage Docker build → nginx serves static files
- **Express** → single-stage Docker build → Node.js container
- **GitHub Actions** → builds both images and pushes to ghcr.io

## Directory Structure

```
GitHub-Actions/
├── .github/
│   └── workflows/
│       └── ci.yml                  # The main learning artifact
├── apps/
│   ├── client/                        # React (Vite) — served via nginx container
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── vite-env.d.ts
│   │   ├── index.html
│   │   ├── Dockerfile              # Multi-stage: node build → nginx serve
│   │   ├── nginx.conf
│   │   ├── .dockerignore
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   └── server/                        # Express — Node.js container
│       ├── src/
│       │   └── index.ts
│       ├── Dockerfile              # Single-stage Node.js
│       ├── .dockerignore
│       ├── package.json
│       └── tsconfig.json
├── docs/
│   └── deployment.md               # This file
├── docker-compose.yml
├── package.json                    # Root workspace (private, no deps)
├── pnpm-workspace.yaml
└── .gitignore
```

## Implementation Order

### Phase 1: Scaffolding

1. Root `package.json` (private, workspace scripts)
2. `pnpm-workspace.yaml` (`packages: ["apps/*"]`)
3. `.gitignore` (node_modules, dist, .env)
4. `git init`

### Phase 2: Minimal Apps

5. `apps/client/` — Vite + React hello-world
6. `apps/server/` — Express health endpoint
7. `pnpm install` at root
8. Verify both build: `pnpm --filter client build`, `pnpm --filter server build`

### Phase 3: Dockerfiles

9. `apps/client/nginx.conf` — listen 80, SPA fallback (`try_files $uri $uri/ /index.html`)
10. `apps/client/Dockerfile` — Stage 1: `node:20-alpine` + pnpm, install, build. Stage 2: `nginx:alpine`, copy dist
11. `apps/server/Dockerfile` — `node:20-alpine`, pnpm, install, build, `CMD ["node", "dist/index.js"]`
12. `.dockerignore` for both apps
13. `docker-compose.yml` — web on :3000→80, api on :4000→4000
14. Verify locally: `docker compose up --build`

### Phase 4: GitHub Actions Workflow (core learning)

15. `.github/workflows/ci.yml` — two parallel jobs (build-client, build-server), each:
    - `runs-on: ubuntu-latest`
    - `permissions: { contents: read, packages: write }`
    - Steps: checkout → docker login → metadata-action → setup-buildx → build-push-action
    - All actions pinned to full commit SHA (not version tags)
    - Docker context set to `.` (repo root) so Dockerfiles can access the full monorepo
    - Cache via `cache-from: type=gha`

### Phase 5: Push and Validate

16. Create GitHub repo, push to main, watch Actions tab, verify images in Packages tab

---

## GitLab CI/CD → GitHub Actions Mapping

| GitLab CI/CD                   | GitHub Actions                          | Notes                                                    |
| ------------------------------ | --------------------------------------- | -------------------------------------------------------- |
| `.gitlab-ci.yml`               | `.github/workflows/*.yml`               | GitHub supports multiple workflow files                  |
| `stages:`                      | Job dependency via `needs:`             | Jobs run in parallel by default; `needs:` sequences them |
| `job:` (top-level key)         | `jobs.<job_id>:`                        | Conceptually identical                                   |
| `script:`                      | `steps:` with `run:`                    | `run:` = shell command, `uses:` = reusable action        |
| `image:`                       | `runs-on:` + `container:`               | `runs-on` picks the VM; `container:` runs inside Docker  |
| `services:`                    | `services:`                             | Nearly identical — sidecar containers                    |
| `before_script:`               | No equivalent                           | Use early steps in `steps:` array                        |
| `variables:`                   | `env:` (workflow/job/step)              | Also `vars.*` and `secrets.*` from repo settings         |
| `$CI_COMMIT_SHA`               | `${{ github.sha }}`                     | GitHub uses `${{ }}` expression syntax                   |
| `$CI_COMMIT_REF_NAME`          | `${{ github.ref_name }}`                |                                                          |
| `$CI_REGISTRY_IMAGE`           | `ghcr.io/${{ github.repository }}`      | GitHub Container Registry                                |
| `artifacts:`                   | `actions/upload-artifact`               | Uploaded/downloaded via actions, not declared inline     |
| `cache:`                       | `actions/cache`                         | More explicit; many setup actions have built-in caching  |
| `rules:` / `only:` / `except:` | `on:` triggers + `if:` conditions       | `on: push`, `on: pull_request`, path/branch filters      |
| `include:`                     | Reusable workflows or composite actions | Separate concepts in GitHub                              |
| `needs:` (DAG)                 | `needs:`                                | Same keyword, same concept                               |
| `environment:`                 | `environment:`                          | GitHub adds protection rules and required reviewers      |
| GitLab Runner                  | GitHub-hosted or self-hosted runner     | Hosted = managed VMs (ubuntu-latest, windows-latest)     |
| Runner executor                | Runner type + `container:`              | Hosted runners are always VM-based                       |
| CI/CD Variables                | Repository Secrets and Variables        | Secrets = masked/encrypted; Variables = plaintext        |
| `$CI_JOB_TOKEN`                | `${{ secrets.GITHUB_TOKEN }}`           | Auto-provisioned per run; scoped via `permissions:`      |
| `tags:` (runner selection)     | `runs-on:` labels                       | `runs-on: [self-hosted, linux]`                          |
| `retry:`                       | No built-in per-step retry              | Use community actions for retry logic                    |
| `timeout:`                     | `timeout-minutes:`                      | Job level                                                |

## Image Versioning Strategy

Images are tagged using git context, handled by `docker/metadata-action`:

| Trigger        | Tags generated          | Example                                                               |
| -------------- | ----------------------- | --------------------------------------------------------------------- |
| Push to `main` | `latest`, `sha-<short>` | `ghcr.io/<owner>/client:latest`, `ghcr.io/<owner>/client:sha-a1b2c3d` |
| Git tag `v*`   | `<version>`, `latest`   | `ghcr.io/<owner>/client:v1.2.0`, `ghcr.io/<owner>/client:latest`      |

The workflow triggers on both pushes to `main` and version tags:

```yaml
on:
  push:
    branches: [main]
    tags: ["v*"] # triggers on v1.0.0, v2.1.3, etc.
```

The `metadata-action` automatically generates the right tags based on what triggered the run:

```yaml
- uses: docker/metadata-action@902fa8220c4fe723b5e0576479ee1cdc90bba48d
  with:
    images: ghcr.io/${{ github.repository }}/client
    tags: |
      type=sha,prefix=sha-
      type=semver,pattern={{version}}
      type=raw,value=latest,enable={{is_default_branch}}
```

**GitLab equivalent**: In GitLab you'd manually construct tags using `$CI_COMMIT_SHA`, `$CI_COMMIT_TAG`, and `$CI_COMMIT_REF_SLUG`. The metadata-action automates this.

---

## Key Design Decisions

**Docker build context**: Set `context: .` (repo root) with `file: ./apps/client/Dockerfile` so the Dockerfile can access the root lockfile. This mirrors how GitLab CI works with the repo as build context.

**Two explicit jobs vs matrix**: Two separate jobs are clearer for learning. A matrix alternative is a good follow-up exercise.

**Reusable actions**: Uses `docker/login-action`, `docker/metadata-action`, `docker/setup-buildx-action`, `docker/build-push-action` — the standard GitHub-native approach. In GitLab you'd write raw `docker build` / `docker push` in `script:`.

## Gotchas (for someone coming from GitLab)

1. **Checkout is explicit** — GitLab runners clone the repo automatically. In GitHub Actions you must use `actions/checkout@v4`. Forgetting this is the #1 mistake for GitLab migrants.

2. **No shared filesystem between jobs** — In GitLab, artifacts pass between stages. In GitHub Actions, use `actions/upload-artifact` / `download-artifact`, or make each job self-contained.

3. **GITHUB_TOKEN permissions** — The token exists automatically but has limited default permissions. Declare what you need in the `permissions:` block. GitLab's `CI_JOB_TOKEN` has broader defaults.

4. **Expression syntax** — GitHub uses `${{ }}` for expressions in YAML fields, but `$VARIABLE` in shell `run:` steps. This dual access pattern is confusing at first.

5. **Action versioning** — We pin all actions to full commit SHAs with a version comment (e.g. `uses: actions/checkout@<sha> # v4`). This prevents supply chain attacks via tag mutation. The `# v4` comment keeps it readable.

6. **Docker build context in monorepos** — The `context` in `docker/build-push-action` determines what files Docker can see. Set it to `.` (repo root) when your Dockerfile needs files outside its own directory.

## Follow-Up Exercises

After the basic workflow works:

- Add a `test` job that runs before build jobs (introduces `needs:`)
- Add `on: pull_request` trigger (introduces PR workflows, status checks)
- Add path filters (`paths: ['apps/client/**']`) so only changed apps rebuild
- Convert the two build jobs into a matrix strategy
- Add a reusable workflow for the Docker build pattern
- Add environment protection rules for a future deploy step
- Add `concurrency:` to cancel in-progress runs on new pushes

## Verification Checklist

- [ ] `pnpm install` succeeds at root
- [ ] Both apps build: `pnpm --filter client build` and `pnpm --filter server build`
- [ ] `docker compose up --build` — web on :3000, api health on :4000/health
- [ ] Push to GitHub → Actions tab shows successful run → images in Packages tab
