import psycopg2
from sqlalchemy import (
    Column, Integer, String, Float, ForeignKey, TIMESTAMP,
    create_engine, text, inspect, MetaData, Table
)
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from urllib.parse import urlparse
# Your DATABASE_URL
DATABASE_URL = "DB_URL"

# Parse the DATABASE_URL
url = urlparse(DATABASE_URL)

# 1) Re-create the Products table via SQLAlchemy (already exists, but ensuring it's created)
# Base = declarative_base()
# engine = create_engine(DATABASE_URL)
# SessionLocal = sessionmaker(bind=engine)
# meta = MetaData()
# meta.reflect(bind=engine)


# for table_name in ['transactions', 'Products']:
#     if table_name in meta.tables:
#         Table(table_name, meta).drop(engine, checkfirst=True)
#         print(f"🗑️ Dropped existing table '{table_name}'.")

# class Product(Base):
#     __tablename__ = "Products"
#     product_id     = Column(Integer, primary_key=True, index=True)
#     name           = Column(String, nullable=False)
#     category       = Column(String)
#     price          = Column(Float, nullable=False)
#     seller_id      = Column(String, nullable=False)
#     image_key      = Column(String)
#     status         = Column(String, server_default=text("'unsold'"))


# class Transaction(Base):
#     __tablename__ = "transactions"
#     transaction_id = Column(Integer, primary_key=True, index=True)
#     buyer_id = Column(String, nullable=False)
#     seller_id = Column(String, nullable=False)
#     product_id = Column(Integer, ForeignKey("Products.product_id"), nullable=False)  # Ensure correct table name
#     status = Column(String)
#     created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))

# Base.metadata.create_all(bind=engine)
# print("✅ Tables recreated successfully.")

# Check table contents
conn = psycopg2.connect(
    dbname=url.path[1:], user=url.username, password=url.password,
    host=url.hostname, port=url.port
)
cur = conn.cursor()

for table in ['Products', 'transactions']:
    cur.execute(f'SELECT * FROM "{table}";')
    rows = cur.fetchall()
    if not rows:
        print(f"📭 '{table}' table is empty.")
    else:
        print(f"📄 '{table}' table has {len(rows)} rows:")
        for row in rows:
            print(row)

cur.close()
conn.close()
