from pathlib import Path
p=Path('ai-service/main.py')
p.write_text('''import os
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
''',encoding='utf-8')
p=Path('ai-service/database.py');p.write_text('''import os
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
''',encoding='utf-8')
for name,target in [('chat_service','data_chat'),('search_service','domain_search')]:
 Path(f'ai-service/app/services/{name}.py').write_text(f'"""Compatibility import for the permission-aware service."""\nfrom app.services.{target} import *\n',encoding='utf-8')
p=Path('ai-service/app/services/statistics_service.py');p.write_text('''from app.services.domain_statistics import statistics
def get_statistics_dashboard(user):return statistics(user)
def get_overview_statistics(user):return {'success':True,'data':statistics(user)['data']['overview']}
def get_monthly_billing_trend(user):return {'success':True,'data':statistics(user,['INVOICE'])['data']['billingTrend']}
def get_billing_insight(user):return {'success':True,'data':statistics(user,['INVOICE'])['data']['billingInsight']}
''',encoding='utf-8')
p=Path('frontend/src/api.js');s=p.read_text(encoding='utf-8');s=s[:s.index('export const aiAPI =')]+'''const AI_BASE_URL = (import.meta.env.VITE_AI_API_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '')).replace(/\\/$/, '');
async function aiRequest(path, body) {
  if (!AI_BASE_URL) throw new Error('Chưa cấu hình địa chỉ dịch vụ AI');
  const response = await fetch(`${AI_BASE_URL}${path}`, {method:body?'POST':'GET',headers:{Authorization:`Bearer ${getAuthToken()}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const result = await response.json();
  if (!response.ok || result.success === false) throw new Error(typeof result.detail==='string'?result.detail:result.message||`Dịch vụ AI: ${response.status}`);
  return result;
}
export const aiAPI = {
  getStatisticsDashboard: () => aiRequest('/ai/statistics/dashboard'),
  getPredictionDashboard: () => aiRequest('/ai/prediction/dashboard'),
  search: (q,page=1,limit=30) => aiRequest(`/ai/search?${new URLSearchParams({q,page,limit})}`),
  chat: (message,history=[]) => aiRequest('/ai/chat',{message,history:history.slice(-10).map(({role,content})=>({role,content:content.slice(0,4000)}))})
};
''';p.write_text(s,encoding='utf-8')
p=Path('frontend/src/pages/AIChat.jsx');s=p.read_text(encoding='utf-8').replace('function AIChat()', 'function AIChat({ onNavigate })').replace('        content\n      );','        content, messages\n      );').replace('data: response?.data || null','data: response?.data || null,\n        actions: response?.actions || []').replace('...prev,','...prev.slice(-19),').replace('message={message}','message={message}\n              onNavigate={onNavigate}').replace('  message\n})','  message, onNavigate\n})').replace('{message.content}', '''{message.content}
          {message.actions?.map((action,index)=><button key={index} className="block mt-2 text-indigo-600 underline" onClick={()=>onNavigate?.(action.page,action.params)}>{action.label}</button>)}''').replace("'Vui lòng kiểm tra FastAPI đang chạy ở cổng 8000.'","(error.message || 'Vui lòng thử lại sau.')")
p.write_text(s,encoding='utf-8')
p=Path('frontend/src/pages/AISearch.jsx');s=p.read_text(encoding='utf-8').replace('function AISearch()', 'function AISearch({ onNavigate })');s=s.replace("  const [keyword,", "  const [page,setPage]=useState(1),[total,setTotal]=useState(0),[query,setQuery]=useState('');\n  const [keyword,")
s=s.replace('const handleSearch = async (e) => {','const handleSearch = async (e, nextPage=1) => {').replace('e.preventDefault();','e?.preventDefault();',1)
s=s.replace('aiAPI.search(', 'aiAPI.search(') # replace actual call below
s=s.replace('await aiAPI.search(query)', 'await aiAPI.search(query, nextPage)')
s=s.replace('await aiAPI.search(keyword)', 'await aiAPI.search(keyword, nextPage)')
s=s.replace('setResults(response.data', 'setPage(nextPage); setTotal(response.total || 0); setQuery(query);\n      setResults(response.data')
s=s.replace('Tìm thấy {results.length}', 'Tìm thấy {total}')
s=s.replace('                    {/* Card header */}', '''                    <button className="text-indigo-600 underline mb-2" onClick={()=>onNavigate?.(item.targetPage,item.params)}>Mở chi tiết</button>
                    {/* Card header */}''')
s=s.replace('      {/* Error */}', '''      {total>30 && <div className="flex gap-3"><button disabled={page<=1||loading} onClick={e=>handleSearch(e,page-1)}>Trang trước</button><span>Trang {page} / {Math.ceil(total/30)}</span><button disabled={page*30>=total||loading} onClick={e=>handleSearch(e,page+1)}>Trang sau</button></div>}
      {/* Error */}''');p.write_text(s,encoding='utf-8')
p=Path('frontend/src/AppRedesign.jsx');s=p.read_text(encoding='utf-8').replace('<AIChat />','<AIChat onNavigate={onNavigate} />').replace('<AISearch />','<AISearch onNavigate={onNavigate} />');s=s.replace("'apartmentId'];","'apartmentId', 'residentId', 'vehicleId', 'cardId', 'slotId', 'serviceId', 'registrationId', 'notificationId'];");p.write_text(s,encoding='utf-8')
p=Path('frontend/src/redesign/navigation.jsx');s=p.read_text(encoding='utf-8');s=s.replace("permissions: ['AI_CHAT'], audience: ['staff']","permissions: ['AI_CHAT'], audience: ['staff', 'resident']").replace("permissions: ['AI_SEARCH'], audience: ['staff']","permissions: ['AI_SEARCH'], audience: ['staff', 'resident']");p.write_text(s,encoding='utf-8')
