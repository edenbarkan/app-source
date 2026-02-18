# MyApp - Application Source

This repository contains the application code and CI/CD pipelines.

## 🏗️ Application Stack

- **Runtime**: Node.js 22 (Alpine)
- **Framework**: Express.js
- **Container**: Docker multi-stage build
- **CI/CD**: GitHub Actions
- **Registry**: Amazon ECR
- **Deployment**: ArgoCD (GitOps)

## 📁 Repository Structure

```
app-source/
├── src/
│   ├── index.js           # Express application
│   ├── landing.html       # Browser landing page (served via content negotiation)
│   ├── package.json       # Dependencies
│   ├── .eslintrc.json     # ESLint configuration
│   └── tests/
│       └── index.test.js  # Endpoint tests (Node.js built-in test runner)
├── Dockerfile             # Multi-stage build
├── .dockerignore         # Docker ignore rules
├── .trivyignore          # Suppress base image CVEs
└── .github/
    └── workflows/
        ├── ci.yaml                    # Build, lint, test, scan, deploy
        ├── promote-staging.yaml       # Manual fallback for staging
        └── promote-production.yaml    # Promote to production
```

## 🚀 Application Endpoints

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `GET /` | App info (HTML for browsers, JSON for APIs) | Content negotiation via `Accept` header |
| `GET /health` | Liveness probe | `{"status": "healthy"}` |
| `GET /ready` | Readiness probe | `{"status": "ready"}` |
| `GET /api/status` | Live status (hostname, uptime, secrets) | `{"hostname":"...","uptime":"...","timestamp":"..."}` |
| `GET /api/data` | Protected endpoint | 401 without key, 200 with correct `X-API-Key` header |

## 🐳 Docker Build

The Dockerfile uses multi-stage builds for:
- ✅ **Smaller image size** (alpine base)
- ✅ **Security** (non-root user, UID 1000)
- ✅ **Production deps only** (npm ci --only=production)
- ✅ **Health checks** (built-in container health)

**Build locally:**
```bash
docker build -t myapp:local .
docker run -p 8080:8080 myapp:local
curl http://localhost:8080
```

## 🔄 CI/CD Workflow

### Automatic Flow (Dev)

1. **Push to `develop` branch**
2. GitHub Actions:
   - Lints code (ESLint)
   - Runs tests
   - Builds Docker image
   - Scans with Trivy (blocks build on HIGH/CRITICAL CVEs)
   - Pushes to ECR with short SHA tag
   - Updates `helm-charts` repo (dev overlay)
3. ArgoCD auto-syncs to dev namespace

### Automatic Flow (Staging)

1. **Merge PR from `develop` → `main`**
2. GitHub Actions:
   - Same build + scan pipeline as dev
   - Updates `helm-charts` repo (staging overlay)
3. ArgoCD auto-syncs to staging namespace

> A manual fallback workflow (`promote-staging.yaml`) exists for hotfixes.

### Manual Promotion (Production)

1. Go to GitHub Actions → "Promote to Production"
2. Click "Run workflow"
3. Enter semantic version (e.g., `v1.0.0`)
4. **Manual sync required** in ArgoCD UI

## 🔐 GitHub Secrets Required

Configure these in your GitHub repository settings:

| Secret | Description | Example |
|--------|-------------|---------|
| `AWS_ACCOUNT_ID` | Your AWS account ID | `123456789012` |
| `GH_PAT` | Personal Access Token | `ghp_xxxxx` (repo scope) |

### Creating GitHub PAT

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select `repo` scope
4. Copy token and add to repository secrets

## 🔑 AWS OIDC Setup

The `GitHubActionsECRAccess` IAM role is managed by Terraform in the `infra-live/modules/ecr` module. It uses:
- OIDC trust policy (keyless authentication from GitHub Actions)
- Scoped inline policy (least-privilege ECR push permissions to the `myapp` repository only)

The role is created automatically when you deploy the ECR module with `github_actions_role_enabled = true`.

## 🧪 Local Development

```bash
# Install dependencies
cd src
npm install

# Run tests
npm test

# Run locally
npm start

# Test endpoints
curl http://localhost:8080/
curl http://localhost:8080/health
curl http://localhost:8080/api/status
```

## 📊 Image Tagging Strategy

| Environment | Tag Format | Example | Updated By |
|-------------|------------|---------|------------|
| **Dev** | `{short-sha}` | `a1b2c3d` | CI on `develop` push |
| **Staging** | `{short-sha}` | `e4f5g6h` | CI on `main` merge |
| **Production** | `{short-sha}` | `v1.0.0` | Manual promotion |

## 🔒 Security Features

**Container Security:**
- Non-root user (UID 1000)
- Read-only root filesystem (via Kubernetes)
- Dropped capabilities (ALL)
- Multi-stage build (no build tools in final image)

**CI/CD Security:**
- Trivy vulnerability scanning (blocks build on HIGH/CRITICAL CVEs)
- ESLint static analysis
- OIDC authentication (no long-lived credentials)
- Scoped IAM permissions (Terraform-managed, least privilege)

## 🎯 Testing the Full Pipeline

### 1. Initial Deploy to Dev

```bash
# Create develop branch
git checkout -b develop

# Make a change
echo "console.log('Hello from dev');" >> src/index.js

# Push
git add .
git commit -m "feat: add dev greeting"
git push -u origin develop
```

This will:
- ✅ Build and push image to ECR
- ✅ Update helm-charts dev overlay
- ✅ ArgoCD auto-deploys to dev namespace

### 2. Deploy to Staging

1. Create a PR from `develop` → `main`
2. Merge the PR
3. CI automatically builds, scans, and updates staging overlay
4. ArgoCD auto-syncs to staging namespace

### 3. Promote to Production

1. Go to Actions → "Promote to Production"
2. Enter semantic version (e.g., `v1.0.0`)
3. Go to ArgoCD UI
4. Click "Sync" on the production app

## 🔗 Related Repositories

- **infra-live**: Terraform/Terragrunt infrastructure
- **helm-charts**: Helm charts and ArgoCD configurations

## 🎓 For Your Interview

**Key Points to Discuss:**

1. **Multi-stage Docker builds** - Smaller, more secure images
2. **OIDC vs long-lived credentials** - No AWS keys in GitHub
3. **GitOps workflow** - Git as single source of truth
4. **Environment promotion strategy** - Progressive delivery
5. **Security scanning** - Trivy in CI pipeline
6. **Semantic versioning** - Production releases
7. **Zero-downtime deployments** - Rolling updates via Kubernetes
8. **Separation of concerns** - App code vs manifests in separate repos

## 📝 Next Steps After Deployment

1. ✅ Deploy infrastructure (infra-live)
2. ✅ Push helm-charts to GitHub
3. ✅ Push app-source to GitHub
4. ✅ Configure GitHub secrets
5. ✅ Set up AWS OIDC
6. ✅ Test the full CI/CD pipeline
