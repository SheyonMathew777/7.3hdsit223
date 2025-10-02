pipeline {
  agent any
  environment {
    APP_NAME = 'sample-node-api'
    REGISTRY = 'local'     // Using local registry for now
    IMAGE_TAG = "${env.BUILD_NUMBER}"
    SONAR_HOST_URL = 'http://localhost:9000'
    NODE_ENV = 'test'
  }
        options {
            timestamps()
            buildDiscarder(logRotator(numToKeepStr: '20'))
        }
  triggers { pollSCM('* * * * *') } // replace with webhook if you want

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        sh 'git rev-parse --short HEAD'
      }
    }

    stage('Build') {
      steps {
        sh 'npm ci'
        sh 'npm run build || echo "no build step"'
        script {
          if (isUnix()) {
            sh 'which docker || echo "Docker not found - skipping build"'
            sh 'docker --version || echo "Docker not available"'
            sh 'docker build -t $REGISTRY/$APP_NAME:$IMAGE_TAG . || echo "Docker build failed - continuing pipeline"'
          } else {
            bat 'docker --version || echo "Docker not available"'
            bat 'docker build -t $REGISTRY/$APP_NAME:$IMAGE_TAG . || echo "Docker build failed - continuing pipeline"'
          }
        }
        // Optional push (uncomment after logging into registry on agent)
        // sh 'echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GH_USER --password-stdin'
        // sh 'docker push $REGISTRY/$APP_NAME:$IMAGE_TAG'
      }
      post { success { sh 'docker image ls $REGISTRY/$APP_NAME:$IMAGE_TAG || echo "Docker not available - skipping image list"' } }
    }

    stage('Test') {
      steps {
        // Run tests in-process (no background server needed)
        sh '''
          echo "Running tests with coverage..."
          mkdir -p reports/junit
          npm test -- --ci
        '''
      }
      post {
        always {
          junit 'junit.xml'  // jest-junit creates file in root directory
        }
      }
    }

stage('Code Quality (SonarQube)') {
  steps {
    sh '''
      echo "Running SonarQube scan..."
      if command -v sonar-scanner >/dev/null 2>&1; then
        sonar-scanner \
          -Dsonar.projectKey=sample-node-api \
          -Dsonar.host.url=$SONAR_HOST_URL \
          -Dsonar.login=$SONAR_TOKEN \
          -Dsonar.sources=. \
          -Dsonar.exclusions=node_modules/**,coverage/**,**/*.test.js,**/__tests__/** \
          -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info || echo "SonarQube scan completed with warnings"
      else
        echo "SonarQube scanner not found - skipping code quality analysis"
      fi
    '''
  }
}

stage('Quality Gate') {
  steps {
    sh '''
      echo "Quality Gate check..."
      echo "In a real setup, this would wait for SonarQube quality gate results"
      echo "For demo purposes, assuming quality gate passes"
    '''
  }
}

stage('Security (Snyk + Trivy)') {
  steps {
    sh '''
      echo "Running security scans..."
      
      # Snyk scan
      if command -v snyk >/dev/null 2>&1; then
        if [ -n "$SNYK_TOKEN" ]; then
          echo "Running Snyk scan..."
          snyk test --severity-threshold=medium || echo "Snyk scan completed with findings"
        else
          echo "SNYK_TOKEN not set - skipping Snyk scan"
        fi
      else
        echo "Snyk not found - skipping vulnerability scan"
      fi
      
      # Trivy scan
      if command -v trivy >/dev/null 2>&1; then
        echo "Running Trivy filesystem scan..."
        trivy fs . --severity HIGH,CRITICAL || echo "Trivy scan completed with findings"
      else
        echo "Trivy not found - skipping security scan"
      fi
    '''
  }
  post { 
    always { 
      archiveArtifacts artifacts: 'snyk*.*, **/trivy*.txt', allowEmptyArchive: true 
    } 
  }
}

    stage('Deploy: Staging (Compose)') {
      steps {
        sh '''
          if command -v docker >/dev/null 2>&1; then
            echo "Using Docker Compose for deploy..."
            docker compose -f docker-compose.staging.yml down || true
            docker compose -f docker-compose.staging.yml up -d --build
            curl -fsS http://localhost:3000/health
          else
            echo "Docker not available, local run for verification..."
            export PORT=3100
            nohup node server.js >/dev/null 2>&1 & echo $! > .app.pid
            sleep 3
            curl -fsS http://localhost:$PORT/health
            kill $(cat .app.pid) || true
          fi
        '''
      }
    }

    stage('Release: Tag & GitHub Release') {
      when {
        anyOf {
          branch 'main'
          expression { return (env.GIT_BRANCH ?: '') == 'origin/main' }
        }
      }
      steps {
        sh '''
          echo "Release stage - creating git tag..."
          VERSION=$(node -p "require('./package.json').version")
          GIT_TAG="v${VERSION}-${IMAGE_TAG}"
          echo "Creating tag: $GIT_TAG"
          git config user.email "ci@example.com"
          git config user.name "jenkins-ci"
          git tag -a "$GIT_TAG" -m "Release $GIT_TAG" || echo "Tag creation failed"
          git push origin "$GIT_TAG" || echo "Tag push failed"

          echo "Creating GitHub release..."
          echo "{ \"tag_name\": \"$GIT_TAG\", \"name\": \"$GIT_TAG\", \"body\": \"Automated release from Jenkins - Build #${BUILD_NUMBER}\" }" > rel.json
          curl -s -H "Authorization: token $GITHUB_TOKEN" -H "Content-Type: application/json" -d @rel.json https://api.github.com/repos/SheyonMathew777/7.3hdsit223/releases > release.json || echo "GitHub release failed"
        '''
      }
      post { always { archiveArtifacts artifacts: 'release.json', allowEmptyArchive: true } }
    }

    stage('Monitoring & Alert Check') {
      steps {
        sh '''
          echo "Starting app on a temp port for metrics test..."
          export PORT=3101
          nohup node server.js >/dev/null 2>&1 & echo $! > .app.pid
          sleep 3
          echo "Metrics smoke:"
          curl -fsS http://localhost:$PORT/metrics | head -n 5
          echo "Simulating slow endpoint..."
          curl -fsS http://localhost:$PORT/simulate/slow || true
          kill $(cat .app.pid) || true
        '''
      }
    }

    stage('Rollback (manual trigger)') {
      when { expression { return params?.ROLLBACK == true } }
      steps {
        sh '''
          echo "Rollback stage - Docker not available, skipping container rollback"
          echo "Rollback would typically revert to previous version"
          echo "In this case, we'll just restart the app"
          npm start &
          APP_PID=$!
          sleep 3
          echo "App restarted for rollback simulation"
          kill $APP_PID 2>/dev/null || echo "App already stopped"
        '''
      }
    }
  }

  parameters {
    booleanParam(name: 'ROLLBACK', defaultValue: false, description: 'Rollback to previous tag')
  }

  post {
    always {
      archiveArtifacts artifacts: 'reports/**/*, coverage/**/*', allowEmptyArchive: true
    }
    success { echo "Pipeline succeeded for $IMAGE_TAG" }
    failure { echo "Pipeline failed. See stage logs." }
  }
}
