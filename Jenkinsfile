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
                sshagent(['terraform-key-v2']) {
                sh "ssh -o StrictHostKeyChecking=no ec2-user@${EC2_IP} hostname"
                }
            }
        }

        stage('Wait for EC2 SSH') {
        steps {
            sshagent(['terraform-key-v2']) {
            sh "ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 ec2-user@${EC2_IP} echo SSH Ready"
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
                    cd app/to-do-list || cd to-do-list
                    # Normalize folder names
                    if [ -d Backend ]; then mv Backend backend; fi
                    if [ -d Frontend ]; then mv Frontend frontend; fi

                    ls -l
                    docker-compose down || true
                    docker-compose up -d --build
                    '
                    """
                }
            }
        }

    }
}
