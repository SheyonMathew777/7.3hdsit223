# Sample Node API - DevOps Pipeline

A Node.js API with complete CI/CD pipeline for High HD submission.

## Features

- Express.js API with health checks and metrics
- 100% test coverage with Jest
- Docker containerization
- Jenkins CI/CD pipeline
- Prometheus monitoring
- Grafana dashboards
- Security scanning with Snyk/Trivy
- Code quality with SonarQube

## Quick Start

```bash
npm install
npm test
npm start
```

## API Endpoints

- `GET /` - Welcome message
- `GET /health` - Health check
- `GET /api/hello` - Main API endpoint
- `GET /metrics` - Prometheus metrics
- `GET /simulate/slow` - Slow response for testing

## Pipeline

7-stage Jenkins pipeline:
1. Build
2. Test (100% coverage)
3. Code Quality (SonarQube)
4. Security (Snyk/Trivy)
5. Deploy (Docker Compose)
6. Release (GitHub)
7. Monitoring (Prometheus/Grafana)
