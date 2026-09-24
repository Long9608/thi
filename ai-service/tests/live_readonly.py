"""Actual FastAPI HTTP + Express JWT authority + SQL reads. No business mutations."""
import json,sys,os,socket,threading,time
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import uvicorn
from main import app
from app.services.data_chat import chat_with_ai
from app.services.domain_search import search_all
from fastapi import HTTPException

tokens=json.load(sys.stdin)
sock=socket.socket();sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
server=uvicorn.Server(uvicorn.Config(app,log_level='error'))
thread=threading.Thread(target=lambda:server.run(sockets=[sock]),daemon=True);thread.start()
for _ in range(100):
    if server.started:break
    time.sleep(.05)
checks=[]
def call(path,role='admin',body=None,expected=200):
    request=Request(f'http://127.0.0.1:{port}{path}',headers={'Authorization':'Bearer '+tokens[role],'Content-Type':'application/json'},data=json.dumps(body).encode() if body else None)
    try:
        with urlopen(request,timeout=30) as response:status=response.status;data=json.load(response)
    except HTTPError as error:status=error.code;data=json.load(error)
    assert status==expected,(path,status,data)
    if expected==200:assert data.get('success'),(path,data)
    checks.append((role,path,status));return data
try:
    call('/health');assert call('/health/database')['success']
    dashboard=call('/ai/statistics/dashboard');assert 'currentMonthCollected' in dashboard['data']['overview']
    for message in ['Hiện có bao nhiêu cư dân?','Có bao nhiêu căn đang trống?','Tháng này đã thu được bao nhiêu tiền?','Còn bao nhiêu tiền chưa thu?',
      'Có bao nhiêu hóa đơn quá hạn?','Top căn hộ nợ nhiều nhất?','Hóa đơn #88 còn nợ bao nhiêu?',
      'Tìm cư dân Nguyễn Văn A','Tìm xe biển số 60A','Thiết bị nào đang chờ bảo trì?','Có bao nhiêu yêu cầu bảo trì chưa hoàn thành?',
      'Dịch vụ nào được đăng ký nhiều nhất?','Tình trạng bãi xe hiện tại?','Hợp đồng nào sắp hết hạn trong 30 ngày?',
      'Phân tích xu hướng doanh thu 6 tháng','So sánh doanh thu tháng này với tháng trước','Có vấn đề nào cần Ban quản lý chú ý hôm nay?']:
        data=call('/ai/chat',body={'message':message});assert data['answer']
    for kind in ['RESIDENT','APARTMENT','CONTRACT','INVOICE','PAYMENT','VEHICLE','PARKING_CARD','PARKING_SLOT','EQUIPMENT','MAINTENANCE','SERVICE','SERVICE_REGISTRATION','FEEDBACK','NOTIFICATION']:
        data=call('/ai/search?type='+kind+'&limit=1');assert 'total' in data
        if data['data']:
            row=data['data'][0];assert row['targetPage'] and row['params']
            call('/ai/record?type='+kind+'&id='+str(row['id']))
    own=call('/ai/search?type=RESIDENT','resident');assert own['total']==1
    resident=own['data'][0]
    call('/ai/chat','resident',{'message':'Còn nợ bao nhiêu?','history':[{'role':'user','content':'Tìm '+resident['title']}]})
    other=next((r for r in call('/ai/search?type=RESIDENT&limit=100')['data'] if r['id']!=resident['id']),None)
    if other:call('/ai/record?type=RESIDENT&id='+str(other['id']),'resident',expected=404)
    for message in ['Hóa đơn của tôi','Tổng tiền tôi còn nợ','Căn hộ của tôi','Hợp đồng của tôi','Thiết bị căn hộ tôi','Yêu cầu bảo trì của tôi','Xe của tôi','Thẻ xe của tôi','Dịch vụ tôi đăng ký','Thông báo của tôi']:
        call('/ai/chat','resident',{'message':message})
    for kind in ['INVOICE','VEHICLE','CONTRACT','MAINTENANCE']:
        rows=call('/ai/search?type='+kind+'&limit=100')['data'];ownids={r['id'] for r in call('/ai/search?type='+kind+'&limit=100','resident')['data']}
        outsider=next((r for r in rows if r['id'] not in ownids),None)
        if outsider:call('/ai/record?type='+kind+'&id='+str(outsider['id']),'resident',expected=404)
    with urlopen(Request(os.environ['AUTH_API_URL'],headers={'Authorization':'Bearer '+tokens['admin']})) as response:user=json.load(response)['data']
    limited={**user,'permissions':['AI_CHAT','AI_SEARCH','VEHICLE_VIEW_ALL']}
    assert chat_with_ai('Có bao nhiêu xe?',limited)['success']
    try:search_all('',limited,entity_type='INVOICE');raise AssertionError('Missing module permission leaked invoice')
    except HTTPException as error:assert error.status_code==403
    all_search=search_all('',limited);assert all(row['type']=='VEHICLE' for row in all_search['data'])
    call('/ai/prediction/dashboard')
    print(json.dumps({'passed':len(checks)+3,'mode':'read-only actual SQL and HTTP','checks':checks},ensure_ascii=False))
finally:
    server.should_exit=True;thread.join(timeout=10);sock.close()
