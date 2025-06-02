import uuid
import boto3
import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query # Import Query
from sqlalchemy import Column, Integer, String, text,Float, create_engine, and_
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
try:
    from config import DATABASE_URL
    Base = declarative_base()
    class Product(Base):
        __tablename__ = "Products"
        product_id = Column(Integer, primary_key=True, index=True)
        name = Column(String, nullable=False)
        category = Column(String) # Consider adding description if needed
        price = Column(Float, nullable=False)
        seller_id = Column(String, nullable=False)  # <-- change Integer ➔ String
        image_key = Column(String)
        status     = Column(String, server_default=text("'unsold'"))
        # quantity = Column(Integer) # Add if you have this column

    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

except ImportError as e:
    logger.error(f"Could not import necessary modules (e.g., config). Error: {e}")
    raise
except Exception as e:
    logger.error(f"Database setup failed: {e}", exc_info=True)
    raise


# --- Router ---
router = APIRouter()

# --- Search Endpoint ---

@router.get('/')
def search_products(
    product_id: Optional[int] = Query(None, description="Search by Product ID"),
    name: Optional[str] = Query(None, description="Search by product name (partial match)"),
    category: Optional[str] = Query(None, description="Search by category (partial match)"),
    seller_id: Optional[str] = Query(None, description="Search by Seller ID (exact match)"),
    min_price: Optional[float] = Query(None, description="Minimum price for price range search"),
    max_price: Optional[float] = Query(None, description="Maximum price for price range search"),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    print("Empty list",Product)
    """
    Searches for products based on various criteria.
    Returns all products if no search criteria are provided.

    Args:
        product_id: Optional. Search for a specific product by its ID.
        name: Optional. Search by product name using partial, case-insensitive matching.
        category: Optional. Search by category using partial, case-insensitive matching.
        seller_id: Optional. Search for products by a specific seller ID (exact match).
        min_price: Optional. Include products with a price greater than or equal to this value.
        max_price: Optional. Include products with a price less than or equal to this value.
        db: Database session dependency.

    Returns:
        A list of dictionaries, where each dictionary represents a product matching the criteria.
    """
    logger.info(f"Received search request with params: product_id={product_id}, name='{name}', category='{category}', seller_id='{seller_id}', min_price={min_price}, max_price={max_price}")

    try:
        query = db.query(Product)

        if product_id is not None:
            logger.info(f"Applying filter: product_id = {product_id}")
            query = query.filter(Product.product_id == product_id)

        if name is not None and name.strip():
            logger.info(f"Applying filter: name ilike '%{name.strip()}%'")
            query = query.filter(Product.name.ilike(f"%{name.strip()}%"))

        if category is not None and category.strip():
            logger.info(f"Applying filter: category ilike '%{category.strip()}%'")
            query = query.filter(Product.category.ilike(f"%{category.strip()}%"))

        if seller_id is not None and seller_id.strip():
             logger.info(f"Applying filter: seller_id = '{seller_id.strip()}'")
             query = query.filter(Product.seller_id == seller_id.strip())

        # Handle price range
        if min_price is not None and max_price is not None:
            logger.info(f"Applying filter: price between {min_price} and {max_price}")
            # Check for min > max here as a backend safeguard, though frontend validates this
            if min_price > max_price:
                 logger.warning(f"Received invalid price range: min_price={min_price} > max_price={max_price}")
                 pass # Let the query handle it (it won't match anything if min > max)
            else:
                query = query.filter(and_(Product.price >= min_price, Product.price <= max_price))
        elif min_price is not None:
            logger.info(f"Applying filter: price >= {min_price}")
            query = query.filter(Product.price >= min_price)
        elif max_price is not None:
            logger.info(f"Applying filter: price <= {max_price}")
            query = query.filter(Product.price <= max_price)
        products = query.all()
        logger.info(f"Found {len(products)} products after filtering.")
        result_list = [
            {
                "ProductID": p.product_id,
                "title": p.name,
                "price": p.price,
                "quantity": 1, # Default or fetch if you added a column
                "description": p.category, # Using category for description as per products/routes.py logic
                "imageKey": p.image_key,
                "seller_id": p.seller_id,
                "status":p.status
            }
            for p in products
        ]
        print("RETURNED LIST",result_list)
        return result_list

    except Exception as e:
        logger.error(f"Error during product search: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to perform search: An unexpected error occurred.")
