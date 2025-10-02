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
      post { success { sh 'docker image ls $REGISTRY/$APP_NAME:$IMAGE_TAG' } }
    }

    stage('Test') {
      steps {
        // Ensure the app is running for integration tests hitting localhost:3000
        sh 'docker compose -f docker-compose.staging.yml up -d app || echo "Docker Compose not available - skipping deployment"'
        sh 'npm test -- --ci'
      }
      post {
        always {
          junit 'reports/junit/*.xml'
          sh 'docker compose -f docker-compose.staging.yml down || echo "Docker Compose not available"'
        }
      }
    }

    stage('Code Quality (SonarQube)') {
      environment { SCANNER_HOME = tool 'sonar-scanner' }
      steps {
        withSonarQubeEnv('SonarQubeServer') {
          sh '''
            $SCANNER_HOME/bin/sonar-scanner                 -Dsonar.projectKey=sample-node-api                 -Dsonar.host.url=$SONAR_HOST_URL                 -Dsonar.login=$SONAR_TOKEN
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
        sh '''
          export SNYK_TOKEN=$SNYK_TOKEN
          npx snyk test --severity-threshold=medium || true
          docker run --rm aquasec/trivy:latest image $REGISTRY/$APP_NAME:$IMAGE_TAG --severity HIGH,CRITICAL || true
        '''
      }
      post {
        always { archiveArtifacts artifacts: 'snyk*.*, **/trivy*.txt', allowEmptyArchive: true }
      }
    }

    stage('Deploy: Staging (Compose)') {
      steps {
        sh '''
          export IMAGE_TAG=$IMAGE_TAG
          docker compose -f docker-compose.staging.yml down || echo "Docker Compose not available"
          docker compose -f docker-compose.staging.yml up -d || echo "Docker Compose not available" --build || echo "Docker Compose not available"
          sleep 5
          curl -fsS http://localhost:3000/health
        '''
      }
    }

    stage('Release: Tag & GitHub Release') {
      when { branch 'main' }
      steps {
        sh '''
          VERSION=$(node -p "require('./package.json').version")
          GIT_TAG="v${VERSION}-${IMAGE_TAG}"
          git config user.email "ci@example.com"
          git config user.name "jenkins-ci"
          git tag -a "$GIT_TAG" -m "Release $GIT_TAG" || true
          git push origin "$GIT_TAG" || true

          echo "{ \"tag_name\": \"$GIT_TAG\", \"name\": \"$GIT_TAG\", \"body\": \"Automated release\" }" > rel.json
          curl -s -H "Authorization: token $GITHUB_TOKEN"                  -H "Content-Type: application/json"                  -d @rel.json                  https://api.github.com/repos/yourusername/yourrepo/releases > release.json || true
        '''
      }
      post { always { archiveArtifacts artifacts: 'release.json', allowEmptyArchive: true } }
    }

    stage('Monitoring & Alert Check') {
      steps {
        sh '''
          # Bring up full stack (app + prometheus + grafana)
          docker compose -f docker-compose.staging.yml up -d || echo "Docker Compose not available"
          sleep 5
          curl -fsS http://localhost:3000/metrics | head -n 5
          # Simulate slow to create latency spike for alert demo
          curl -fsS http://localhost:3000/simulate/slow || true
        '''
      }
    }

    stage('Rollback (manual trigger)') {
      when { expression { return params?.ROLLBACK == true } }
      steps {
        sh '''
          PREV_TAG=$(git tag --sort=-creatordate | sed -n '2p')
          if [ -z "$PREV_TAG" ]; then echo "No previous tag"; exit 1; fi
          export IMAGE_TAG=${PREV_TAG#v*-}  # assumes v<ver>-<sha>
          docker compose -f docker-compose.staging.yml down || echo "Docker Compose not available"
          docker compose -f docker-compose.staging.yml up -d || echo "Docker Compose not available"
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
