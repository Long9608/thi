import os
import pyodbc
from dotenv import load_dotenv

load_dotenv()

DB_SERVER = os.getenv("DB_SERVER")
DB_DATABASE = os.getenv("DB_DATABASE")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")


def get_connection():
    connection_string = (
        "DRIVER={ODBC Driver 17 for SQL Server};"
        f"SERVER={DB_SERVER};"
        f"DATABASE={DB_DATABASE};"
        f"UID={DB_USER};"
        f"PWD={DB_PASSWORD};"
        "Encrypt=no;"
        "TrustServerCertificate=yes;"
    )

    return pyodbc.connect(connection_string)


def test_connection():
    connection = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute("""
            SELECT
                DB_NAME() AS DatabaseName,
                @@SERVERNAME AS ServerName
        """)

        row = cursor.fetchone()

        return {
            "success": True,
            "database": row.DatabaseName,
            "server": row.ServerName
        }

    except Exception as error:
        return {
            "success": False,
            "message": str(error)
        }

    finally:
        if connection:
            connection.close()