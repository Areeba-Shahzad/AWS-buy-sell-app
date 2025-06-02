# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# import the routers you defined
from orders.routes   import router as order_router
from products.routes import router as product_router
from search.routes import router as search_router
from admin.routes    import router as admin_router

app = FastAPI(
  title="AWSBuySell API",
  version="0.1.0",
)

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

app.include_router(product_router, prefix="/api/products", tags=["Products"])
app.include_router(search_router, prefix="/api/search", tags=["Search"])
app.include_router(order_router,   prefix="/api/orders",  tags=["Orders"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
# In your main.py, right after all include_router() calls:
import pprint
pprint.pprint([route.path for route in app.router.routes])
# http://localhost:8000/docs