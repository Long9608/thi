import os
from pathlib import Path
from contextlib import closing
import pyodbc
from dotenv import load_dotenv
load_dotenv(Path(__file__).with_name('.env'))
def quoted(value):return '{'+str(value or '').replace('}','}}')+'}'
def get_connection():
    server=os.getenv('DB_SERVER','localhost');azure='.database.windows.net' in server.lower()
    encrypt='yes' if azure else os.getenv('DB_ENCRYPT','no')
    trust='no' if azure else os.getenv('DB_TRUST_SERVER_CERTIFICATE','yes')
    connection_string=(f"DRIVER={quoted(os.getenv('DB_DRIVER','ODBC Driver 17 for SQL Server'))};"
        f"SERVER={quoted(server)};DATABASE={quoted(os.getenv('DB_DATABASE'))};Encrypt={encrypt};TrustServerCertificate={trust};")
    if os.getenv('DB_TRUSTED_CONNECTION','').lower()=='yes' and not azure:connection_string+='Trusted_Connection=yes;'
    else:connection_string+=f"UID={quoted(os.getenv('DB_USER'))};PWD={quoted(os.getenv('DB_PASSWORD'))};"
    return pyodbc.connect(connection_string,timeout=10)
def test_connection():
    try:
        with closing(get_connection()) as connection:connection.cursor().execute('SELECT 1').fetchone()
        return {'success':True,'status':'connected'}
    except pyodbc.Error:return {'success':False,'message':'Database unavailable; check server configuration'}
