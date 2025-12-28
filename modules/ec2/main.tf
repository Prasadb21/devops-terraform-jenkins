resource "aws_instance" "this" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [aws_security_group.ssh.id]
  key_name               = "terraform-key-v2"

  user_data = <<EOF
#!/bin/bash
yum update -y
amazon-linux-extras install docker -y
systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user
curl -L "https://github.com/docker/compose/releases/download/2.25.0/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
EOF

  lifecycle {
    ignore_changes = [
      public_ip,
      public_dns
    ]
  }

  tags = {
    Name = "terraform-ec2"
  }
}
