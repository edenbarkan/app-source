# MyApp - Application Source

This repository contains the application code and CI/CD pipelines.

## 🏗️ Application Stack

- **Runtime**: Node.js 18 (Alpine)
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
│   └── package.json       # Dependencies
├── Dockerfile             # Multi-stage build
├── .dockerignore         # Docker ignore rules
└── .github/
    └── workflows/
        ├── ci.yaml                    # Build, test, push to ECR
        ├── promote-staging.yaml       # Promote to staging
        └── promote-production.yaml    # Promote to production
```

## 🚀 Application Endpoints

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `GET /` | Main endpoint | JSON with version and environment |
| `GET /health` | Liveness probe | `{"status": "healthy"}` |
| `GET /ready` | Readiness probe | `{"status": "ready"}` |

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
   - Builds Docker image
   - Runs Trivy security scan
   - Pushes to ECR with `sha-xxxxx` tag
   - Updates `helm-charts` repo (dev overlay)
3. ArgoCD auto-syncs to dev namespace

### Manual Promotion (Staging)

1. Go to GitHub Actions → "Promote to Staging"
2. Click "Run workflow"
3. Enter the image tag from dev (e.g., `sha-abc1234`)
4. ArgoCD auto-syncs to staging namespace

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

For GitHub Actions to push to ECR without AWS credentials:

```bash
# Create trust policy
cat > github-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:edenbarkan/*:*"
        }
      }
    }
  ]
}
EOF

# Create IAM role
aws iam create-role \
  --role-name github-actions-role \
  --assume-role-policy-document file://github-trust-policy.json

# Attach ECR permissions
aws iam attach-role-policy \
  --role-name github-actions-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser
```

## 🧪 Local Development

```bash
# Install dependencies
cd src
npm install

# Run locally
npm start

# Test endpoints
curl http://localhost:8080/
curl http://localhost:8080/health
curl http://localhost:8080/ready
```

## 📊 Image Tagging Strategy

| Environment | Tag Format | Example | Updated By |
|-------------|------------|---------|------------|
| **Dev** | `sha-{commit}` | `sha-a1b2c3d` | CI (automatic) |
| **Staging** | `sha-{commit}` | `sha-a1b2c3d` | Manual promotion |
| **Production** | `v{semver}` | `v1.0.0` | Manual promotion |

## 🔒 Security Features

**Container Security:**
- Non-root user (UID 1000)
- Read-only root filesystem (via Kubernetes)
- Dropped capabilities (ALL)
- Multi-stage build (no build tools in final image)

**CI/CD Security:**
- Trivy vulnerability scanning
- OIDC authentication (no long-lived credentials)
- Image signing (optional, can add Cosign)

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

### 2. Promote to Staging

1. Check the image tag from the CI run
2. Go to Actions → "Promote to Staging"
3. Enter the image tag
4. Watch ArgoCD auto-sync

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
