resource "aws_s3_bucket" "product_images" {
  bucket = "buying-selling-app-marm"

  tags = {
    Name = "product-images"
  }
}
