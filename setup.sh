#!/bin/bash

# Jenkins HD Starter - Setup Script
# This script installs all prerequisites for the Jenkins CI/CD pipeline demo

echo "🚀 Setting up Jenkins HD Starter prerequisites..."

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script is designed for macOS. Please install prerequisites manually."
    exit 1
fi

# Install Homebrew if not present
if ! command -v brew &> /dev/null; then
    echo "📦 Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install Node.js 20
echo "📦 Installing Node.js 20..."
brew install node@20
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Install Docker and Docker Compose
echo "🐳 Installing Docker..."
brew install --cask docker
echo "Please start Docker Desktop manually after installation."

# Install Prometheus and Grafana
echo "📊 Installing Prometheus and Grafana..."
brew install prometheus grafana

# Install SonarQube Scanner
echo "🔍 Installing SonarQube Scanner..."
brew install sonar-scanner

# Install Snyk
echo "🔒 Installing Snyk..."
npm install -g snyk

# Install Trivy
echo "🛡️ Installing Trivy..."
brew install trivy

# Install Jenkins (via Docker)
echo "🏗️ Setting up Jenkins..."
docker pull jenkins/jenkins:lts

# Create necessary directories
echo "📁 Creating monitoring directories..."
mkdir -p monitoring/grafana-datasources
mkdir -p monitoring/grafana-dashboards

# Install project dependencies
echo "📦 Installing project dependencies..."
npm ci

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start Docker Desktop"
echo "2. Run Jenkins: docker run -p 8080:8080 -p 50000:50000 -v jenkins:/var/jenkins_home jenkins/jenkins:lts"
echo "3. Configure Jenkins with required plugins and credentials"
echo "4. Update Jenkinsfile with your GitHub repository details"
echo "5. Run the demo: docker compose -f docker-compose.staging.yml up -d"
echo ""
echo "Demo endpoints:"
echo "- App: http://localhost:3000"
echo "- Prometheus: http://localhost:9090"
echo "- Grafana: http://localhost:3001 (admin/admin)"

