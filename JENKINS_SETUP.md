# Jenkins Configuration for High HD

## 1. Docker Jenkins Setup

Run the Docker Jenkins setup commands to enable Docker support:

```bash
# Stop existing Jenkins
docker stop jenkins || true && docker rm jenkins || true

# Create Jenkins with Docker socket
docker run -d --name jenkins \
  --restart unless-stopped \
  -p 8080:8080 -p 50000:50000 \
  -v jenkins:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins/jenkins:lts

# Install Docker CLI in Jenkins container
docker exec -u root -it jenkins bash -lc \
  'apt-get update && apt-get install -y docker.io docker-compose-plugin && usermod -aG docker jenkins'

# Restart Jenkins
docker restart jenkins
```

## 2. Jenkins Plugins Installation

In Jenkins UI (http://localhost:8080):

1. **Manage Jenkins → Plugins**
2. Install these plugins:
   - SonarQube Scanner
   - GitHub Integration
   - Docker Pipeline

## 3. Jenkins Tools Configuration

**Manage Jenkins → Tools:**

1. **SonarQube Scanner**:
   - Name: `sonar-scanner`
   - Install automatically

2. **Docker**:
   - Name: `docker`
   - Install automatically

## 4. Jenkins System Configuration

**Manage Jenkins → System:**

1. **SonarQube servers**:
   - Name: `SonarQubeServer`
   - Server URL: `http://localhost:9000`
   - Credentials: `sonar-token`

## 5. Jenkins Credentials

**Manage Jenkins → Credentials:**

Add these credentials:

1. **sonar-token** (Secret text):
   - Get from SonarQube → Administration → Security → Users → Tokens

2. **snyk-token** (Secret text):
   - Get from Snyk.io → Account Settings → API Token

3. **github-token** (Secret text):
   - GitHub → Settings → Developer settings → Personal access tokens

## 6. SonarQube Setup

```bash
# Start SonarQube
docker run -d --name sonar -p 9000:9000 sonarqube:lts-community

# Get admin password
docker exec sonar cat /opt/sonarqube/data/secrets/initialAdminPassword

# Access SonarQube at http://localhost:9000
# Login: admin / <password>
# Create token: Administration → Security → Users → Tokens
```

## 7. Security Tools Installation

```bash
# Install Snyk and Trivy in Jenkins container
docker exec -u root -it jenkins bash -lc 'npm install -g snyk && apt-get update && apt-get install -y trivy'
```

## 8. Quality Gate Configuration

In SonarQube:

1. **Administration → Quality Gates**
2. Create new gate or edit existing
3. Set conditions:
   - Coverage ≥ 80%
   - Maintainability Rating = A
   - Duplicated Lines < 3%
   - Security Rating = A

## 9. Pipeline Execution

After configuration:

1. **Run the pipeline** - all stages should now execute
2. **Docker stages** will build and deploy containers
3. **SonarQube** will perform code quality analysis
4. **Security tools** will scan for vulnerabilities
5. **Release stage** will create GitHub releases

## 10. Monitoring Setup

1. **Prometheus**: http://localhost:9090
2. **Grafana**: http://localhost:3001
3. **Configure Grafana datasource**: `http://prometheus:9090`
4. **Create dashboards** for request rate and latency
5. **Test alerts** by hitting `/simulate/slow` endpoint

## Expected Results

With full configuration, the pipeline will:

- ✅ **Build**: Docker image creation
- ✅ **Test**: 96.66% coverage with JUnit reports
- ✅ **Code Quality**: SonarQube analysis with quality gate
- ✅ **Security**: Snyk + Trivy vulnerability scanning
- ✅ **Deploy**: Docker Compose deployment
- ✅ **Release**: GitHub release creation
- ✅ **Monitoring**: Prometheus metrics and alert testing

**Result: High HD (95-100%) achievement!**
