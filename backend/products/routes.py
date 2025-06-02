import uuid
import boto3
import json # Import the json module
from typing import List, Optional, Dict
# Make sure Request is imported from fastapi
from fastapi import APIRouter, HTTPException, Depends, Form, Body, Request
from fastapi import UploadFile, File, Form
from sqlalchemy import Column, Integer, String, Float, text,create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
# Assuming config.py is in the same directory or accessible via PYTHONPATH
from config import AWS_REGION, AWS_S3_BUCKET, DATABASE_URL
import logging # Use logging module

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


router = APIRouter()
logger.info(f"AWS region: {AWS_REGION}")
logger.info(f"S3 bucket: {AWS_S3_BUCKET}")
logger.info(f"Database Url: {DATABASE_URL}")

# --- Database setup (remains the same) ---
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- S3 client (remains the same) ---
s3 = boto3.client("s3", region_name=AWS_REGION)

# --- Models (remains the same) ---
class Product(Base):
    __tablename__ = "Products"
    # Define your columns matching the create_product parameters
    product_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String) # Consider adding description if needed
    price = Column(Float, nullable=False)
    seller_id = Column(String, nullable=False)  # <-- change Integer ➔ String
    image_key = Column(String)
    status     = Column(String, server_default=text("'unsold'"))
    # quantity = Column(Integer) # Add if you want to store quantity


Base.metadata.create_all(bind=engine) # Creates the table if it doesn't exist

# --- Endpoints ---


@router.get('/upload-url')
def get_upload_url(filename: str) -> Dict[str, str]:
    logger.info(f"Received request for upload URL for filename: {filename}")
    try:
        ext = filename.split('.')[-1]
        key = f"products/{uuid.uuid4()}.{ext}" # Define the key structure in S3
        logger.info(f"Generated S3 key: {key}")
        upload_url = s3.generate_presigned_url(
            'put_object',
            Params={'Bucket': AWS_S3_BUCKET, 'Key': key, 'ContentType': f'image/{ext}'}, # Add ContentType for direct browser upload
            ExpiresIn=3600 # URL valid for 1 hour
        )
        logger.info(f"Generated presigned URL successfully for key: {key}")
        return {"upload_url": upload_url, "key": key}
    except Exception as e:
        logger.error(f"Error generating presigned URL: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not generate upload URL")


@router.post('/create-product')
# Add Request to access raw request data for debugging
async def create_product(
    request: Request, # Inject Request object
    name: str = Form(...),
    category: Optional[str] = Form(None),
    price: float = Form(...),
    seller_id: str = Form(...),
    image_keys: List[str] = Form([]),
    db: Session = Depends(get_db)
) -> Dict[str, int]:
    # --- Debugging: Log Headers and Form Data ---
    print("--- Received request for /create-product ---")
    logger.info(f"Headers: {request.headers}")
    try:
        # Reading the form data here for logging *before* validation
        form_data = await request.form()
        logger.info(f"Raw Form Data Received: {form_data}")
    except Exception as e:
        logger.error(f"Error reading raw form data: {e}")
    # --- End Debugging ---

    logger.info(f"Validated Form Data: name={name}, category={category}, price={price}, seller_id={seller_id}, image_keys={image_keys}")

    try:
        image_key_to_save = image_keys[0] if image_keys else None
        logger.info(f"Using image key for DB: {image_key_to_save}")

        product = Product(
            name=name,
            category=category,
            price=price,
            seller_id=seller_id,
            image_key=image_key_to_save,
            status="unsold"
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        logger.info(f"Successfully created product with ID: {product.product_id}")
        return {"product_id": product.product_id}
    except Exception as e:
        logger.error(f"Error creating product in DB: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create product in database.")


@router.get('/')
def list_products(
    category: Optional[str] = None,
    db: Session = Depends(get_db)
) -> List[Dict]:
    logger.info(f"Received request for list_products with category: {category}")
    try:
        query = db.query(Product)
        if category:
            logger.info(f"Filtering by category: {category}")
            query = query.filter(Product.category == category)
        products = query.all()
        logger.info(f"Found {len(products)} products.")
        result_list = [
            {
                # Map DB model fields to frontend expectations
                "ProductID": p.product_id,
                "title": p.name,
                "price": p.price,
                "status":p.status,
                # Assuming quantity is not in DB, or default to 1. Add DB column if needed.
                "quantity": 1,
                # Mapping category to description for now. Add description column to DB if needed.
                "description": p.category,
                "imageKey": p.image_key,
                "seller_id": p.seller_id # Include seller_id for frontend checks/actions
            }
            for p in products
            # print("All Products: ",products)
        ]
        return result_list
    except Exception as e:
        logger.error(f"Error fetching products: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch products.")


@router.get('/{id}')
def get_product(id: int, db: Session = Depends(get_db)): # Change id type to int
    logger.info(f"Received request for get_product with ID: {id}")
    try:
        product = db.query(Product).filter(Product.product_id == id).first()
        if not product:
            logger.warning(f"Product with ID {id} not found.")
            raise HTTPException(status_code=404, detail="Product not found")
        # Map DB model to frontend expected structure
        result = {
            "ProductID": product.product_id,
            "title": product.name,
            "price": product.price,
             "quantity": 1, # Default or fetch if column exists
            "description": product.category, # Or add description column
            "imageKey": product.image_key,
            "seller_id": product.seller_id
        }
        logger.info(f"Found product: {result}")
        return result
    except Exception as e:
        logger.error(f"Error fetching product by ID {id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch product by ID.")


@router.put('/{id}')
async def update_product(
    id: int,
    seller_id: str = Form(...),
    # Accept updates as a stringified JSON form field
    updates_json_string: str = Form(...)
):
    logger.info(f"Attempting update: product={id}, seller={seller_id}, updates_json_string={updates_json_string}")
    db: Session = next(get_db())
    product: Product = db.query(Product).get(id)
    if not product:
        logger.warning(f"Update failed: Product with ID {id} not found.")
        raise HTTPException(404, "Product not found")

    if product.seller_id != seller_id:
        logger.warning(f"Update failed for product {id}: Seller ID mismatch (provided: {seller_id}, owner: {product.seller_id})")
        raise HTTPException(403, "You may only update your own products")

    # Parse the JSON string into a dictionary
    try:
        updates = json.loads(updates_json_string)
        logger.info(f"Parsed updates: {updates}")
    except json.JSONDecodeError:
        logger.error(f"Failed to parse updates JSON string: {updates_json_string}")
        raise HTTPException(400, "Invalid JSON format for updates")

    # Apply updates - *Warning: This is potentially unsafe if fields aren't validated*
    allowed_update_fields = ['name', 'category', 'price', 'image_key'] # Define allowed fields
    applied_updates = {}
    for field, val in updates.items():
        if field in allowed_update_fields:
            # Optional: Add type checking/validation here based on the expected type of each field
            setattr(product, field, val)
            applied_updates[field] = val
            logger.info(f"Applied update: {field} = {val}")
        else:
            logger.warning(f"Attempted to update disallowed field: {field}")
            # Optionally raise HTTPException or ignore
            # raise HTTPException(400, f"Invalid field '{field}' for update")

    if not applied_updates:
        logger.info("No valid fields provided for update.")
        # Optionally return a message indicating nothing was updated
        # return {"updated": False, "detail": "No valid fields provided for update"}

    db.commit()
    db.refresh(product)
    logger.info(f"Successfully updated product {id}.")

    # Return the updated product details in the structure the frontend expects
    return {
        "updated": True,
        "product": {
            "ProductID": product.product_id,
            "title": product.name,
            "price": product.price,
            "quantity": 1, # Default or fetch if column exists
            "description": product.category, # Or add description column
            "imageKey": product.image_key,
            "seller_id": product.seller_id
        }
    }

@router.delete('/{id}')
async def delete_product(
    id: int,
    seller_id: str = Form(...) # Expect seller_id as form data
):
    logger.info(f"Attempting delete: product={id}, seller={seller_id}")
    db: Session = next(get_db())
    product: Product = db.query(Product).get(id)
    if not product:
        logger.warning(f"Delete failed: Product with ID {id} not found.")
        raise HTTPException(404, "Product not found")

    if product.seller_id != seller_id:
        logger.warning(f"Delete failed for product {id}: Seller ID mismatch (provided: {seller_id}, owner: {product.seller_id})")
        raise HTTPException(403, "You may only delete your own products")

    # Optional: Delete image from S3
    if product.image_key:
        try:
            s3.delete_object(Bucket=AWS_S3_BUCKET, Key=product.image_key)
            logger.info(f"Deleted S3 object: {product.image_key}")
        except Exception as e:
            logger.error(f"Failed to delete S3 object {product.image_key}: {e}", exc_info=True)
            # Decide if you want to raise an error or just log it
            # raise HTTPException(500, "Failed to delete product image")


    db.delete(product)
    db.commit()
    logger.info(f"Successfully deleted product {id}.")
    return {"deleted": True}