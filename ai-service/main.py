import os
from typing import Literal
from fastapi import FastAPI,Query,Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel,Field
import pyodbc
from database import test_connection
from auth import require_permissions
from app.services.data_chat import chat_with_ai
from app.services.domain_search import search_all
from app.services.domain_statistics import statistics
from app.services.prediction_service import get_prediction_readiness,get_prediction_dashboard
from app.services.scope import access
from fastapi import HTTPException

app=FastAPI(title="Đức Vũ Tower Data Assistant",version="2.0.0")
origins=[s.strip() for s in os.getenv('CORS_ORIGINS','http://localhost:5173,http://127.0.0.1:5173').split(',') if s.strip()]
app.add_middleware(CORSMiddleware,allow_origins=origins,allow_credentials=True,allow_methods=['GET','POST'],allow_headers=['Authorization','Content-Type'])
class HistoryMessage(BaseModel):
    role: Literal['user','assistant']
    content: str=Field(max_length=4000)
class ChatRequest(BaseModel):
    message: str=Field(min_length=1,max_length=2000)
    history: list[HistoryMessage]=Field(default_factory=list,max_length=10)

@app.exception_handler(pyodbc.Error)
async def database_error(request,error):
    return JSONResponse(status_code=503,content={'success':False,'message':'Không thể đọc database. Vui lòng kiểm tra cấu hình và migration.'})
@app.get('/')
@app.get('/health')
def health():return {'success':True,'status':'running','mode':'DETERMINISTIC_DATA_ASSISTANT'}
@app.get('/health/database')
def database_health(user=Depends(require_permissions('SYSTEM_SETTING'))):return test_connection()
@app.get('/ai/search')
def search(q:str=Query('',max_length=200),page:int=Query(1,ge=1),limit:int=Query(30,ge=1,le=100),type:str|None=None,user=Depends(require_permissions('AI_SEARCH'))):
    return search_all(q,user,page,limit,type)
@app.post('/ai/chat')
def chat(body:ChatRequest,user=Depends(require_permissions('AI_CHAT'))):
    return chat_with_ai(body.message,user,[m.model_dump() for m in body.history])
@app.get('/ai/record')
def record(type:str,id:int=Query(...,ge=1),user=Depends(require_permissions())):
    if not {'AI_CHAT','AI_SEARCH'}.intersection(user.get('permissions',[])):raise HTTPException(403,'Không có quyền AI')
    result=search_all('',user,limit=1,entity_type=type,entity_id=id)
    if not result['data']:raise HTTPException(404,'Không tìm thấy bản ghi trong phạm vi của bạn')
    return {'success':True,'data':result['data'][0]}
@app.get('/ai/statistics/dashboard')
def dashboard(user=Depends(require_permissions('AI_STATISTIC'))):return statistics(user)
@app.get('/ai/statistics/overview')
def overview(user=Depends(require_permissions('AI_STATISTIC'))):return {'success':True,'data':statistics(user)['data']['overview']}
@app.get('/ai/statistics/billing-trend')
def trend(user=Depends(require_permissions('AI_STATISTIC'))):return {'success':True,'data':statistics(user,['INVOICE'])['data']['billingTrend']}
@app.get('/ai/statistics/insight')
def insight(user=Depends(require_permissions('AI_STATISTIC'))):return {'success':True,'data':statistics(user,['INVOICE'])['data']['billingInsight']}
def risk_authority(user):
    if any(access(user,m)!='all' for m in ['CONTRACT','INVOICE','RESIDENT']):raise HTTPException(403,'Risk Scoring cần quyền xem các dữ liệu hợp đồng, hóa đơn và cư dân')
@app.get('/ai/prediction/readiness')
def readiness(user=Depends(require_permissions('AI_PREDICT'))):
    risk_authority(user);return get_prediction_readiness()
@app.get('/ai/prediction/dashboard')
def prediction(user=Depends(require_permissions('AI_PREDICT'))):
    risk_authority(user);return get_prediction_dashboard()
