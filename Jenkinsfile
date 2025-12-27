pipeline {
    agent {
        docker {
            image 'hashicorp/terraform:1.6'
            args '-u root'
        }
    }

    environment {
        AWS_DEFAULT_REGION = "ap-south-1"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Terraform Init') {
            steps {
                sh 'cd envs/dev && terraform init'
            }
        }

        stage('Terraform Plan') {
            steps {
                sh 'cd envs/dev && terraform plan'
            }
        }

        stage('Terraform Apply') {
            steps {
                sh 'cd envs/dev && terraform apply -auto-approve'
            }
        }
    }
}
