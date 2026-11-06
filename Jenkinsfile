pipeline {
  agent any
  stages {
    stage('Checkout') { steps { checkout scm } }
    stage('Install') { steps { bat 'npm.cmd install' } }
    stage('Unit tests') { steps { bat 'npm.cmd test' } }
    stage('Docker build') { steps { bat 'docker build -t online-library-management:latest .' } }
  }
  post { success { echo 'Library pipeline completed.' } failure { echo 'Pipeline failed; inspect logs.' } }
}
