import psycopg2
import os
from dotenv import load_dotenv
from urllib.parse import urlparse


load_dotenv()
DATABASE_URL = "DB_URL_HERE"
url = urlparse(DATABASE_URL)

def get_connection():
    return psycopg2.connect(
    dbname=url.path[1:],
    user=url.username,
    password=url.password,
    host=url.hostname,
    port=url.port
)