terraform {
  backend "s3" {
    bucket         = "prasad-terraform-state-001"
    key            = "dev/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
