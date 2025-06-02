# backend/models.py

from sqlalchemy import Column, Integer, String, Float, create_engine, TIMESTAMP
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.orm import relationship
from datetime import datetime
from config import DATABASE_URL

Base = declarative_base()

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Product(Base):
    __tablename__ = "Products"

    product_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String)
    price = Column(Float, nullable=False)
    location = Column(String)
    seller_id = Column(String, nullable=False)
    seller_rating = Column(Float)
    image_key = Column(String)
    
class Transaction(Base):
        __tablename__ = "transactions" # Matches the table name

        transaction_id = Column(Integer, primary_key=True, index=True) # Primary key
        buyer_id = Column(String, nullable=False) # Not nullable
        seller_id = Column(String, nullable=False) # Not nullable
        # Foreign key linking to the Product table
        product_id = Column(Integer, ForeignKey("Products.product_id"), nullable=False) # Links to Products.product_id, not nullable
        status = Column(String) # Status column
        created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP')) # Timestamp with default