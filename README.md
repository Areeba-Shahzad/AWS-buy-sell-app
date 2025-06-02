# 🛒 Cloud-Native Buy & Sell Marketplace

A fully serverless, scalable, and secure buying & selling platform inspired by OLX, built using AWS services, Terraform, FastAPI, and React. Users can register, list products, search/filter items, and complete transactions — all deployed with Infrastructure as Code.

![Architecture](./Architectural%20Diagram_Group3.png)

---

## 🚀 Features

- User authentication with AWS Cognito (JWT-based)
- Product listings with image uploads via S3
- Advanced filtering with OpenSearch (name, price, category)
- Stripe-based transaction simulation
- Role-based dashboards (Admin, Buyer, Seller)
- CloudFront CDN for image delivery
- Admin panel to monitor listings
- Infrastructure provisioned using Terraform
- CloudWatch monitoring & cost estimation

---

## 🧰 Tech Stack

| Layer            | Technology                               |
|------------------|-------------------------------------------|
| Frontend         | React (Vite)                              |
| Backend          | FastAPI (Python 3.9+)                     |
| Authentication   | AWS Cognito                               |
| Storage          | Amazon S3                                 |
| Database         | Amazon RDS (PostgreSQL), DynamoDB         |
| Search           | Amazon OpenSearch                         |
| Monitoring       | AWS CloudWatch                            |
| Infra as Code    | Terraform                                 |

---

## 📦 Architecture Overview

The platform uses an ALB to distribute traffic to auto-scaling EC2 backend instances. Images are stored in encrypted S3 buckets, delivered via CloudFront. Cognito handles user roles and JWTs for secure APIs. Transactions and search are handled through RDS and OpenSearch. Infrastructure is deployed via Terraform and monitored with CloudWatch.

---

## 💸 AWS Cost Estimation

| Service      | Monthly Cost (USD) |
|--------------|--------------------|
| EC2          | $6.86              |
| RDS          | $115.71            |
| S3           | $0.12              |
| Lambda       | $0.00              |
| CloudFront   | $1.10              |
| Cognito      | $0.00              |
| **Total**    | **≈ $122.69**      |

🔗 [View AWS Calculator Estimate](https://calculator.aws/#/estimate?id=1d4628b308521dea393922c02561d2c2367a47bb)

---

## 🧑‍💻 Setup & Deployment

```bash
# Move into terraform project
cd terraform/

# Initialize Terraform
terraform init

# Show resources to be created
terraform plan

# Deploy infrastructure
terraform apply -auto-approve

# Setup frontend
cd ../frontend/
npm install
npm run build
aws s3 sync ./dist s3://frontend-bucket --delete

# Setup backend
cd ../backend/
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate (Windows)
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000

## Live Frontend URL
http://d1cuu1n5c09f1t.cloudfront.net
