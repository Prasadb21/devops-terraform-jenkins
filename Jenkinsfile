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

        stage('Test SSH') {
            steps {
                sshagent(['ec2-user']) {
                sh "ssh -o StrictHostKeyChecking=no ec2-user@${EC2_IP} hostname"
                }
            }
        }

        stage('Wait for EC2 SSH') {
            steps {
                script {
                    sh """
                    for i in {1..30}; do
                    echo "Waiting for EC2 SSH..."
                    ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 ec2-user@${EC2_IP} 'echo SSH Ready' && exit 0
                    sleep 10
                    done
                    echo "EC2 did not become ready in time"
                    exit 1
                    """
                }
            }
        }



        stage('Deploy To EC2') {
            steps {
                sshagent(['terraform-key-v2']) {
                    sh """
                    ssh -o StrictHostKeyChecking=no ec2-user@${EC2_IP} '
                    sudo yum install git -y
                    if [ ! -d app ]; then
                        git clone https://github.com/Prasadb21/devops-terraform-jenkins.git app
                    else
                        cd app && git pull
                    fi
                    cd app
                    docker-compose down || true
                    docker-compose up -d --build
                    '
                    """
                }
            }
        }

    }
}
