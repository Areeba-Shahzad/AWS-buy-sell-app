variable "vpc_id" {
  description = "VPC ID for networking resources"
  type        = string
}

variable "db_password" {
  description = "Password for the RDS database instance"
  type        = string
  sensitive   = true
}

variable "subnet_ids" {
  description = "List of public subnet IDs"
  type        = list(string)
}

variable "backend_ami" {
  description = "AMI ID for the backend EC2 instance"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
}

variable "key_pair_name" {
  description = "Key pair name for EC2 SSH access"
  type        = string
}
