resource "aws_instance" "this" {
  ami = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [aws_security_group.ssh.id]
  key_name               = "terraform-key-v2"

  lifecycle {
  create_before_destroy = true
    }


  tags = {
    Name = "terraform-ec2"
  }
}
