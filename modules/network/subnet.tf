resource "aws_subnet" "public" {

    vpc_id = aws_vpc.this.id
    cidr_block = var.public_subnet_cidr
    map_public_ip_on_launch = true

    tags = {
        Name = "terraform-public-subnet"
    }
}