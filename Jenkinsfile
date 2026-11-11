
pipeline {
    agent any

    tools {
        jdk 'JDK-21'
        nodejs 'NodeJS-22'
    }

    environment {
        SCANNER_HOME = tool 'SonarScanner'

        AWS_REGION = 'eu-north-1'
        EKS_CLUSTER_NAME = 'zomato-eks-cluster'
        ECR_REPOSITORY = 'zomato-app'

        NODEGROUP_NAME = 'zomato-worker-nodes'
        NODE_INSTANCE_TYPE = 't3.medium'
    }

    stages {

        stage('Clean Workspace') {
            steps {
                cleanWs()
                echo 'Workspace cleaned successfully'
            }
        }

        stage('Checkout from GitHub') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/gowthamipalem/zomato-devsecops-project.git'
            }
        }

        stage('Verify Tools') {
            steps {
                sh '''
                    java -version
                    node --version
                    npm --version
                    docker --version
                    aws --version
                    kubectl version --client
                    trivy --version
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('NPM Security Audit') {
            steps {
                sh '''
                    npm audit --json > npm-audit-report.json || true
                '''
                archiveArtifacts artifacts: 'npm-audit-report.json',
                    allowEmptyArchive: true
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh '''
                        "$SCANNER_HOME/bin/sonar-scanner" \
                        -Dsonar.projectName=Zomato \
                        -Dsonar.projectKey=Zomato \
                        -Dsonar.sources=src \
                        -Dsonar.exclusions=**/node_modules/**,**/dist/**
                    '''
                }
            }
        }

        stage('SonarQube Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    script {
                        def qg = waitForQualityGate()
                        if (qg.status != 'OK') {
                            error "SonarQube Quality Gate failed: ${qg.status}"
                        }
                    }
                }
            }
        }

        stage('Build React Application') {
            steps {
                sh 'npm run build'
            }
        }

        stage('OWASP Dependency Check') {
            steps {
                dependencyCheck(
                    additionalArguments: '--scan ./ --disableYarnAudit --disableNodeAudit',
                    odcInstallation: 'DP-Check'
                )

                dependencyCheckPublisher(
                    pattern: '**/dependency-check-report.xml'
                )
            }
        }

        stage('Trivy Filesystem Scan') {
            steps {
                sh '''
                    trivy fs \
                    --format table \
                    --output trivy-fs-report.txt \
                    .
                '''
                archiveArtifacts artifacts: 'trivy-fs-report.txt',
                    allowEmptyArchive: true
            }
        }

        stage('Docker Build') {
            steps {
                sh '''
                    docker build \
                    -t zomato-app:${BUILD_NUMBER} \
                    -t zomato-app:latest .
                '''
            }
        }

        stage('Trivy Docker Image Scan') {
            steps {
                sh '''
                    trivy image \
                    --format table \
                    --output trivy-image-report.txt \
                    zomato-app:${BUILD_NUMBER}
                '''
                archiveArtifacts artifacts: 'trivy-image-report.txt',
                    allowEmptyArchive: true
            }
        }

        stage('Push Docker Image to AWS ECR') {
            steps {
                sh '''
                    ACCOUNT_ID=$(aws sts get-caller-identity \
                    --query Account --output text)

                    ECR_URI=${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}

                    aws ecr describe-repositories \
                    --repository-names ${ECR_REPOSITORY} \
                    --region ${AWS_REGION} || \
                    aws ecr create-repository \
                    --repository-name ${ECR_REPOSITORY} \
                    --region ${AWS_REGION}

                    aws ecr get-login-password \
                    --region ${AWS_REGION} | \
                    docker login \
                    --username AWS \
                    --password-stdin ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

                    docker tag zomato-app:${BUILD_NUMBER} ${ECR_URI}:${BUILD_NUMBER}

                    docker push ${ECR_URI}:${BUILD_NUMBER}
                '''
            }
        }

        stage('Install eksctl') {
            steps {
                sh '''
                    mkdir -p "$WORKSPACE/.bin"

                    curl -fsSL \
                    https://github.com/eksctl-io/eksctl/releases/download/0.231.0/eksctl_Linux_amd64.tar.gz \
                    -o /tmp/eksctl.tar.gz

                    tar -xzf /tmp/eksctl.tar.gz -C "$WORKSPACE/.bin"

                    chmod +x "$WORKSPACE/.bin/eksctl"

                    "$WORKSPACE/.bin/eksctl" version

                    rm -f /tmp/eksctl.tar.gz
                '''
            }
        }

        stage('Create AWS EKS Cluster') {
            steps {
                sh '''
                    echo "Checking whether EKS cluster already exists..."

                    if aws eks describe-cluster \
                       --name ${EKS_CLUSTER_NAME} \
                       --region ${AWS_REGION} >/dev/null 2>&1
                    then
                        echo "EKS cluster already exists. Skipping creation."
                    else
                        echo "Creating EKS cluster..."

                        "$WORKSPACE/.bin/eksctl" create cluster \
                        --name ${EKS_CLUSTER_NAME} \
                        --region ${AWS_REGION} \
                        --managed \
                        --nodegroup-name ${NODEGROUP_NAME} \
                        --node-type ${NODE_INSTANCE_TYPE} \
                        --nodes 1 \
                        --nodes-min 1 \
                        --nodes-max 1 \
                        --node-volume-size 20 \
                        --timeout 40m
                    fi

                    echo "EKS cluster creation/check completed."
                '''
            }
        }

        stage('Configure EKS Access') {
            steps {
                sh '''
                    aws eks update-kubeconfig \
                    --region ${AWS_REGION} \
                    --name ${EKS_CLUSTER_NAME}

                    kubectl get nodes
                '''
            }
        }

        stage('Deploy to AWS EKS') {
            steps {
                sh '''
                    ACCOUNT_ID=$(aws sts get-caller-identity \
                    --query Account --output text)

                    ECR_URI=${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}

                    mkdir -p k8s

                    cat > k8s/deployment.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zomato-deployment
spec:
  replicas: 2
  selector:
    matchLabels:
      app: zomato
  template:
    metadata:
      labels:
        app: zomato
    spec:
      containers:
      - name: zomato-container
        image: ${ECR_URI}:${BUILD_NUMBER}
        ports:
        - containerPort: 80
EOF

                    cat > k8s/service.yaml <<EOF
apiVersion: v1
kind: Service
metadata:
  name: zomato-service
spec:
  type: LoadBalancer
  selector:
    app: zomato
  ports:
  - port: 80
    targetPort: 80
EOF

                    kubectl apply -f k8s/
                '''
            }
        }

        stage('Verify EKS Deployment') {
            steps {
                sh '''
                    kubectl rollout status \
                    deployment/zomato-deployment \
                    --timeout=300s

                    kubectl get deployments
                    kubectl get pods -o wide
                    kubectl get services
                '''
            }
        }
    }

    post {
        success {
            echo 'Zomato DevSecOps Pipeline completed successfully!'
        }

        failure {
            echo 'Pipeline failed. Check Jenkins Console Output.'
        }

        always {
            echo 'Zomato Pipeline execution finished.'
        }
    }
}
