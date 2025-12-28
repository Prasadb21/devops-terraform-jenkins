pipeline {
    agent any

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

        stage('Get EC2 IP') {
            steps {
                script {
                    EC2_IP = sh(
                        script: "cd envs/dev && terraform output -raw server_ip",
                        returnStdout: true
                    ).trim()
                    env.EC2_IP = EC2_IP
                    echo "EC2 IP: ${EC2_IP}"
                }
            }
        }

        stage('Deploy To EC2') {
            steps {
                sh """
                ssh -o StrictHostKeyChecking=no -i keys/terraform-key-v2.pem ec2-user@${EC2_IP} '
                  sudo yum install git -y
                  git clone https://github.com/Prasadb21/devops-terraform-jenkins.git app || cd app && git pull
                  cd app
                  docker-compose down || true
                  docker-compose up -d --build
                '
                """
            }
        }
    }
}
