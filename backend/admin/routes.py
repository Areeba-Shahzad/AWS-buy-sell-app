from fastapi import APIRouter, HTTPException
import uuid
import boto3
import json # Import the json module
from typing import List, Optional, Dict
# Make sure Request is imported from fastapi
from fastapi import APIRouter, HTTPException, Depends, Form, Body, Request
from fastapi import UploadFile, File, Form
from sqlalchemy import Column, Integer, String, Float, text,create_engine, ForeignKey, TIMESTAMP
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from datetime import datetime, timedelta
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

# # --- Database setup (remains the same) ---
# engine = create_engine(DATABASE_URL)
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# Base = declarative_base()
try:
    # Assuming config.py exists and contains DATABASE_URL
    from config import DATABASE_URL

    Base = declarative_base()

    # Define the Transaction model
    class Transaction(Base):
        __tablename__ = "transactions" # Matches the table name

        transaction_id = Column(Integer, primary_key=True, index=True) # Primary key
        buyer_id = Column(String, nullable=False) # Not nullable
        seller_id = Column(String, nullable=False) # Not nullable
        # Foreign key linking to the Product table
        product_id = Column(Integer, ForeignKey("Products.product_id"), nullable=False) # Links to Products.product_id, not nullable
        status = Column(String) # Status column
        created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP')) # Timestamp with default
        

        

    
    # Create database engine and session factory
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # Dependency to get database session
    def get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

except ImportError as e:
    logger.error(f"Could not import necessary modules (e.g., config). Error: {e}")
    # Re-raise the exception to stop the application if config is missing
    raise
except Exception as e:
    logger.error(f"Database setup failed: {e}", exc_info=True)
    # Re-raise the exception if database setup fails
    raise

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
# --- Add after your existing code ---

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Cognito Setup
USER_POOL_ID = "us-east-1_IPqipLOoX"  # Your pool ID
AWS_REGION = "us-east-1"              # Region (already imported earlier)
cognito_client = boto3.client('cognito-idp', region_name=AWS_REGION)

# Bearer auth scheme
bearer_scheme = HTTPBearer()

@router.get("/users")
async def list_users(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    token = credentials.credentials

    try:
        response = cognito_client.list_users(
            UserPoolId=USER_POOL_ID,
            Limit=60  # Fetch up to 60 users at a time
        )

        users = []
        for user in response['Users']:
            attributes = {attr['Name']: attr['Value'] for attr in user['Attributes']}
            user_data = {
                'id': user['Username'],                # Cognito Username = unique id
                'email': attributes.get('email', ''),   # Get email if exists
                'role': attributes.get('custom:role', '') # Get custom role if exists
            }
            users.append(user_data)

        logger.info(f"Fetched {len(users)} users from Cognito.")
        return users

    except cognito_client.exceptions.NotAuthorizedException as e:
        logger.warning(f"Unauthorized access attempt: {e}")
        raise HTTPException(status_code=401, detail="Unauthorized")
    except Exception as e:
        logger.error(f"Error fetching users: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")



Base.metadata.create_all(bind=engine) # Creates the table if it doesn't exist
@router.delete('/{id}')
async def delete_product(id: int):
    logger.info(f"Attempting to delete product with ID {id}")
    
    db: Session = next(get_db())
    product: Product = db.query(Product).get(id)
    
    if not product:
        logger.warning(f"Delete failed: Product with ID {id} not found.")
        raise HTTPException(404, "Product not found")

    # Optional: Delete image from S3 if the product has an image key
    if product.image_key:
        try:
            s3.delete_object(Bucket=AWS_S3_BUCKET, Key=product.image_key)
            logger.info(f"Deleted S3 object: {product.image_key}")
        except Exception as e:
            logger.error(f"Failed to delete S3 object {product.image_key}: {e}", exc_info=True)
            # Proceed without raising an error, as it's optional

    # Delete the product from the database
    db.delete(product)
    db.commit()

    logger.info(f"Product {id} deleted successfully.")
    return {"message": f"Product {id} deleted successfully"}

@router.get("/transactions/last_week")
async def get_transactions_last_week(db: Session = Depends(get_db)):
    try:
        one_week_ago = datetime.utcnow() - timedelta(days=7)
        
        transactions = db.query(Transaction).filter(Transaction.created_at >= one_week_ago).all()
        
        if not transactions:
            raise HTTPException(status_code=404, detail="No transactions found in the last week.")
        
        transactions_list = [
            {
                "transaction_id": transaction.transaction_id,
                "buyer_id": transaction.buyer_id,
                "seller_id": transaction.seller_id,
                "product_id": transaction.product_id,
                "status": transaction.status,
                "created_at": transaction.created_at.isoformat(),
                "buyer_username": transaction.buyer_id,  # use buyer_id directly
                "seller_username": transaction.seller_id, # use seller_id directly
                "product_name": transaction.product_id,  # use product_id directly
            }
            for transaction in transactions
        ]
        
        logger.info(f"Retrieved {len(transactions_list)} transactions from the past week.")
        
        return {"transactions": transactions_list}
    
    except Exception as e:
        logger.error(f"Error fetching transactions from the last week: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")