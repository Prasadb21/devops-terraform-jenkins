module "network" {

    source = "../../modules/network"

}

module "ec2" {

    source = "../../modules/ec2"
    subnet_id = module.network.public_subnet_id
    vpc_id = module.network.vpc_id

}
