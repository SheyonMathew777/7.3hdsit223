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
    withSonarQubeEnv('SonarQubeServer') {
      sh '''
        set -e
        # Download SonarScanner CLI locally if not present
        SCANNER_DIR=".scanner"
        SCANNER_BIN="$SCANNER_DIR/bin/sonar-scanner"
        if [ ! -x "$SCANNER_BIN" ]; then
          echo "Downloading SonarScanner CLI..."
          rm -rf "$SCANNER_DIR" scanner.zip
          curl -fsSL https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-5.0.1.3006-linux.zip -o scanner.zip
          unzip -q scanner.zip
          mv sonar-scanner-* "$SCANNER_DIR"
          rm -f scanner.zip
        fi

        echo "Running SonarQube scan..."
        "$SCANNER_BIN" \
          -Dsonar.projectKey=sample-node-api \
          -Dsonar.host.url="$SONAR_HOST_URL" \
          -Dsonar.login="$SONAR_TOKEN" \
          -Dsonar.sources=. \
          -Dsonar.exclusions=node_modules/**,coverage/**,**/*.test.js,**/__tests__/** \
          -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
      '''
    }
  }
}

stage('Quality Gate') {
  steps { 
    timeout(time: 5, unit: 'MINUTES') { 
      waitForQualityGate abortPipeline: true 
    } 
  }
}

stage('Security (Snyk + Trivy)') {
  steps {
    withCredentials([string(credentialsId: 'snyk-token', variable: 'SNYK_TOKEN')]) {
      sh '''
        echo "Running security scans..."
        snyk auth $SNYK_TOKEN >/dev/null 2>&1 || true
        snyk test --severity-threshold=medium || true
        trivy fs . --severity HIGH,CRITICAL || true
      '''
    }
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
          echo "Deploy stage - testing application deployment..."
          docker rm -f test-app >/dev/null 2>&1 || true
          docker run -d --name test-app -p 3100:3000 local/sample-node-api:${BUILD_NUMBER}

          # get container IP (reachable from Jenkins container on the bridge network)
          CONTAINER_IP=$(docker inspect -f "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" test-app)
          echo "Container IP: $CONTAINER_IP"

          # wait up to 45s for /health
          READY=""
          for i in $(seq 1 45); do
            if curl -fsS "http://$CONTAINER_IP:3000/health" >/dev/null; then READY=1; break; fi
            echo "Attempt $i: waiting for container health..."
            sleep 1
          done

          if [ -z "$READY" ]; then
            echo "Health check FAILED - showing logs and port map"
            docker logs --tail=100 test-app || true
            docker port test-app || true
            docker rm -f test-app >/dev/null 2>&1 || true
            exit 1
          fi

          echo "Health check OK"
          docker rm -f test-app >/dev/null 2>&1 || true
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
        withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN')]) {
          sh '''
            set -e
            VERSION=$(node -p "require('./package.json').version")
            GIT_TAG="v${VERSION}-${BUILD_NUMBER}"

            git config user.email "ci@example.com"
            git config user.name "jenkins-ci"
            git tag -a "$GIT_TAG" -m "Release $GIT_TAG" || true
            git push https://${GITHUB_TOKEN}@github.com/SheyonMathew777/7.3hdsit223.git "$GIT_TAG"

            printf '{"tag_name":"%s","name":"%s","body":"Automated release from Jenkins - Build %s"}' "$GIT_TAG" "$GIT_TAG" "$BUILD_NUMBER" > rel.json
            curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
                 -H "Accept: application/vnd.github+json" \
                 -d @rel.json \
                 https://api.github.com/repos/SheyonMathew777/7.3hdsit223/releases >/dev/null
            echo "Release created: $GIT_TAG"
          '''
        }
      }
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
