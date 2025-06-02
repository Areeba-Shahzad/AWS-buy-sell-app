from fastapi import APIRouter, HTTPException, Depends,Query
from fastapi.responses import JSONResponse
from db.db import get_connection # Assuming this provides necessary connection details or objects
import stripe
import uuid
import boto3 # Although imported, boto3 is not used in the provided routes
import json
from typing import List, Optional, Dict, Any
from sqlalchemy import Column, TIMESTAMP, Integer, String, text, Float, create_engine, ForeignKey # Import ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy import and_
import logging

stripe.api_key = "STRIPE_API"

router = APIRouter()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database setup
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
        product_id = Column(Integer, ForeignKey("Products.product_id"), nullable=False) # Links to Products.product_id, not nullable
        status = Column(String) # Status column
        created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP')) # Timestamp with default

    # Define the Product model
    class Product(Base):
        __tablename__ = "Products" # Matches the table name

        product_id = Column(Integer, primary_key=True, index=True) # Primary key
        name = Column(String, nullable=False) # Not nullable
        category = Column(String) # Category column
        price = Column(Float, nullable=False) # Not nullable
        seller_id = Column(String, nullable=False) # Not nullable
        image_key = Column(String) # Image key column
        status = Column(String, server_default=text("'unsold'")) # Status with default 'unsold'

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

@router.post("/create-checkout-session")
async def create_checkout_session(
    buyer_id: str,
    seller_id: str,
    product_id: int,
    db: Session = Depends(get_db)
):
    logger.info(f"Trying to create session - Buyer Id: {buyer_id}, Seller Id: {seller_id}, Product Id: {product_id}")
    try:
        product = db.query(Product).filter(
            Product.product_id == product_id
            # Uncomment below line to only allow checkout for unsold items
            # Product.status == 'unsold'
        ).first()

        if not product:
            logger.warning(f"Product {product_id} not found.")
            raise HTTPException(404, "Product not found")
        # If the status check is commented out, you might want to add a check here
        # if product.status != 'unsold':
        #     logger.warning(f"Product {product_id} is not available for purchase (status: {product.status}).")
        #     raise HTTPException(400, "Product not available for purchase")


        logger.info(f"[DEBUG] Found product: {product.name} at price {product.price} at status {product.status}")

        # Create Stripe checkout session
        # Ensure product.name is clean and does not contain problematic characters
        # A simple cleaning example (consider more robust methods if needed):
        product_name_safe = ''.join(c for c in product.name if ord(c) < 128 or c in ' .,-') # Keep ASCII, space, comma, period, hyphen

        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    # Use the potentially cleaned product name
                    "product_data": {"name": product_name_safe},
                    "unit_amount": int(product.price * 100),  # Stripe expects amount in cents
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=(
                # f"https://d2ihswn7xidcr6.cloudfront.net/ordersuccess"
                # f"?buyer_id={buyer_id}&seller_id={seller_id}&product_id={product_id}"
                f"http://localhost:5173/ordersuccess"
                f"?buyer_id={buyer_id}&seller_id={seller_id}&product_id={product_id}"
            ),
            cancel_url="http://localhost:5173/ordercancel",
        )

        logger.info(f"[DEBUG] Stripe session created: {session.url}")
        return JSONResponse({"checkout_url": session.url})

    except Exception as e:
        logger.error("[ERROR creating checkout session]:", exc_info=True)
        # Provide a generic error message to the client for security
        raise HTTPException(500, "Failed to create Stripe checkout session")


# -------------------------------
# FINALIZE ORDER
# -------------------------------

@router.post("/finalize-order")
async def finalize_order(
    buyer_id: str,
    seller_id: str,
    product_id: int,
    db: Session = Depends(get_db)
):
    try:
        # Check if product is available (status is 'unsold')
        product = db.query(Product).filter(
            and_(Product.product_id == product_id)
        ).first()

        if not product:
            logger.warning(f"Product {product_id} not found or not available for sale.")
            raise HTTPException(404, "Product not available or already sold")

        # Create a new transaction
        transaction = Transaction(
            buyer_id=buyer_id,
            seller_id=seller_id,
            product_id=product_id,
            status='completed' # Set status to completed
        )
        db.add(transaction)
        db.commit() # Commit the new transaction first
        logger.info(f"Transaction created: {transaction.transaction_id}")
        db.refresh(transaction) # Refresh the transaction object to get its ID and creation time

        # Update the product status to 'sold'
        product.status = 'sold'
        logger.info(f"Updating product {product_id} status to 'sold'")
        # --- ADDED: Commit the product status change to the database ---
        db.commit()
        logger.info(f"Product {product_id} status committed to 'sold'")
        db.refresh(product) # Optional: Refresh the product object from the DB after commit

        return {"message": "✅ Order completed and product marked as sold.", "transaction_id": transaction.transaction_id}

    except Exception as e:
        logger.error("[ERROR in finalize_order]:", exc_info=True)
        db.rollback() # Rollback changes in case of error
        # Provide a generic error message to the client for security
        raise HTTPException(500, "Failed to finalize order")

# -------------------------------
# GET USER ORDERS
# -------------------------------

@router.get("/")
async def get_user_orders(
    buyer_id: str = Query(None),
    seller_id: str = Query(None),
    userRole: str = Query(...),
    db: Session = Depends(get_db)
):
    print("----- DEBUG START -----")
    print("User Role:", userRole)
    print("Buyer ID:", buyer_id)
    print("Seller ID:", seller_id)

    try:
        print("Setting up base query...")
        query = db.query(
            Transaction.transaction_id,
            Transaction.created_at,
            Product.name,
            Product.category,
            Product.price,
            Transaction.status
        ).join(Product, Transaction.product_id == Product.product_id)

        if userRole == "buyer":
            print("User is a buyer. Applying buyer_id filter...")
            if not buyer_id:
                raise HTTPException(status_code=400, detail="buyer_id is required for userRole='buyer'")
            query = query.filter(Transaction.buyer_id == buyer_id)

        elif userRole == "seller":
            print("User is a seller. Applying seller_id filter...")
            query = query.filter(Transaction.seller_id == buyer_id)

        else:
            print("Invalid userRole provided.")
            raise HTTPException(status_code=400, detail="Invalid userRole. Must be 'buyer' or 'seller'.")

        print("Executing query to fetch orders...")
        orders = query.order_by(Transaction.created_at.desc()).all()
        print(f"Total orders fetched: {len(orders)}")

        results = []
        for order in orders:
            print("Fetched Order:", order)
            results.append({
                "transaction_id": order.transaction_id,
                "created_at": order.created_at,
                "name": order.name,
                "category": order.category,
                "price": order.price,
                "status": order.status
            })

        print("Returning response.")
        print("----- DEBUG END -----")
        return results

    except Exception as e:
        print("[EXCEPTION OCCURRED]", str(e))
        logger.error("[ERROR in get_user_orders]:", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch orders")

# @router.get("/")
# async def get_user_orders(
#     buyer_id: str,
#     db: Session = Depends(get_db)
# ):
#     try:
#         # Join Transactions with Products to get order details
#         orders = db.query(
#             Transaction.transaction_id,
#             Transaction.created_at,
#             Product.name,
#             Product.category,
#             Product.price,
#             Transaction.status # Get transaction status
#         ).join(Product, Transaction.product_id == Product.product_id # Join condition
#         ).filter(Transaction.buyer_id == buyer_id # Filter by buyer_id
#         ).order_by(Transaction.created_at.desc() # Order by creation time
#         ).all()

#         # Serialize results into a list of dictionaries
#         results = []
#         for order in orders:
#             results.append({
#                 "transaction_id": order.transaction_id,
#                 "created_at": order.created_at,
#                 "name": order.name,
#                 "category": order.category,
#                 "price": order.price,
#                 "status": order.status
#             })

#         return results

#     except Exception as e:
#         logger.error("[ERROR in get_user_orders]:", exc_info=True)
#         raise HTTPException(500, "Failed to fetch orders")

# @router.get("/")
# async def get_user_orders(
#     id: str = Query(...),
#     userRole: str = Query(...),
#     db: Session = Depends(get_db)
# ):
#     print("ID : ",id)
#     print("User Role",userRole)
#     print("DB : ",db)
#     try:
#         query = db.query(
#             Transaction.transaction_id,
#             Transaction.created_at,
#             Product.name,
#             Product.category,
#             Product.price,
#             Transaction.status
#         ).join(Product, Transaction.product_id == Product.product_id)

#         # Apply filter based on userRole
#         if userRole == "buyer":
#             query = query.filter(Transaction.buyer_id == id)
#         elif userRole == "seller":
#             query = query.filter(Transaction.seller_id == id)
#         else:
#             raise HTTPException(status_code=400, detail="Invalid userRole. Must be 'buyer' or 'seller'.")

#         # Finalize query
#         orders = query.order_by(Transaction.created_at.desc()).all()

#         # Serialize results
#         results = []
#         for order in orders:
#             results.append({
#                 "transaction_id": order.transaction_id,
#                 "created_at": order.created_at,
#                 "name": order.name,
#                 "category": order.category,
#                 "price": order.price,
#                 "status": order.status
#             })

#         return results

#     except Exception as e:
#         logger.error("[ERROR in get_user_orders]:", exc_info=True)
#         raise HTTPException(status_code=500, detail="Failed to fetch orders")