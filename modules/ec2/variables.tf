variable "subnet_id" {

    description = "Subnet where EC2 will be launched"
    type = string
}

variable "instance_type" {
  description = "EC2 instance size"
  type = string
  default = "t3.micro"
}

variable "vpc_id" {
  type = string
}

