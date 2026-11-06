
pipeline {
    agent any

    stages {
        stage('Install Dependencies') {
            steps {
                bat 'npm.cmd install'
            }
        }

        stage('Run Unit Tests') {
            steps {
                bat 'npm.cmd test'
            }
        }
    }

    post {
        success {
            echo 'Library pipeline completed successfully!'
        }

        failure {
            echo 'Pipeline failed. Please inspect the console logs.'
        }

        always {
            echo 'Jenkins pipeline execution finished.'
        }
    }
}
