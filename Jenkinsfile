pipeline {
    agent any

    environment {
        AWS_DEFAULT_REGION = "ap-south-1"
        TF_IN_AUTOMATION = "true"
    }

    stages {

        stage('Checkout') {
            steps {
                git credentialsId: 'github-creds',
                    url: 'https://github.com/Prasadb21/devops-terraform-jenkins.git',
                    branch: 'main'
            }
        }

        stage('Terraform Init') {
            steps {
                sh '''
                    cd envs/dev
                    terraform init
                '''
            }
        }

        stage('Terraform Plan') {
            steps {
                sh '''
                    cd envs/dev
                    terraform plan
                '''
            }
        }

        stage('Terraform Apply') {
            steps {
                sh '''
                    cd envs/dev
                    terraform apply -auto-approve
                '''
            }
        }
    }
}
