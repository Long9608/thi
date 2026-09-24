import re
from app.services.intent_router import detect,normalize,keyword
from app.services.domain_search import search_all
from app.services.domain_statistics import statistics,domain_report,resident_apartments
from app.services.catalog import CATALOG

def reply(answer, data=None, actions=None, type='STATISTICS'):
    return dict(success=True,mode='DETERMINISTIC_DATA_ASSISTANT',type=type,answer=answer,data=data,actions=actions or [])

def chat_with_ai(message,user,history=None):
    intent,kind=detect(message);text=normalize(message)
    # History is merely a search hint. Re-resolve every entity under current JWT scope.
    resident_id=None
    location=re.search(r'^(?:cu dan\s+)?(.+?)\s+(?:dang\s+)?o can(?: ho)? nao',text)
    if location and location[1] not in ('nguoi do','ho'):
        found=search_all(location[1],user,entity_type='RESIDENT',limit=2)
        if found['total']!=1:return reply('Không xác định được một cư dân duy nhất trong phạm vi của bạn.',found,type='SEARCH')
        resident_id=found['data'][0]['id']
    if any(t in text for t in ['con no','con bao nhieu','o can nao','nguoi do']):
        for previous in reversed((history or [])[-10:]):
            if previous.get('role')=='user' and detect(previous.get('content',''))==('search','RESIDENT'):
                resolved=search_all(keyword(previous['content']),user,limit=2,entity_type='RESIDENT')
                if resolved['total']==1: resident_id=resolved['data'][0]['id']
                else: return reply('Bạn cần xác định rõ một cư dân trước khi hỏi tiếp.',type='HELP')
                break
    if location:
        if resident_id is None:return reply('Bạn muốn hỏi căn hộ của cư dân nào?',type='HELP')
        rooms=resident_apartments(user,resident_id)
        return reply('Căn hộ đang ở: '+(', '.join(r['ApartmentCode'] for r in rooms) or 'Không có trong phạm vi dữ liệu hiện tại'),rooms,
            [dict(label=r['ApartmentCode'],page='ai-record',params={'entityType':'APARTMENT','recordId':r['ApartmentID']}) for r in rooms])
    if intent=='search':
        id_match=re.search(r'#\s*(\d+)',text)
        own=bool(re.search(r'\btoi\b',text))
        result=search_all('' if id_match or own else keyword(message),user,entity_type=kind,entity_id=int(id_match[1]) if id_match else None)
        rows=result['data']
        lines=[f"{r['title']} — {r['subtitle'] or ''}"+(f"; còn nợ {max(0,r['data']['RemainingAmount']):,.0f} đ" if 'RemainingAmount' in r['data'] else '') for r in rows[:10]]
        return reply(f"Tìm thấy {result['total']} kết quả trong phạm vi của bạn.\n"+'\n'.join(lines),result,
            [dict(label=r['title'],page=r['targetPage'],params=r['params']) for r in rows[:10]],'SEARCH')
    if intent in ('top_debt','popular_services','expiring','pending','equipment'):
        days_match=re.search(r'(\d+)\s*ngay',text);days=min(365,int(days_match[1])) if days_match else 30
        rows=domain_report(user,kind,intent,days)
        return reply(f"Kết quả {intent} (tối đa 100 bản ghi; toàn bộ dữ liệu có thể xem tại trang nghiệp vụ):\n"+'\n'.join(' · '.join(f'{k}: {v}' for k,v in row.items()) for row in rows[:15]),rows,[dict(label='Mở danh sách',page=CATALOG[kind]['page'],params={})])
    if intent in ('statistics','trend','attention') or resident_id is not None:
        if resident_id is not None:kind='INVOICE'
        modules=[CATALOG[kind]['module']] if kind else None
        report=statistics(user,modules,resident_id);data=report['data'];overview=data['overview']
        if not overview:return reply('Bạn không có quyền đọc nghiệp vụ này.',type='HELP')
        if intent=='trend':return reply(data['billingInsight']['insight'],data)
        labels={'activeResidents':'Cư dân hoạt động','totalApartments':'Tổng căn hộ','occupiedApartments':'Căn đang thuê','vacantApartments':'Căn trống','occupancyRate':'Tỷ lệ lấp đầy (%)',
          'activeContracts':'Hợp đồng hoạt động','expiring30':'Hết hạn trong 30 ngày','expiring60':'Hết hạn trong 60 ngày','expiring90':'Hết hạn trong 90 ngày',
          'invoiceCount':'Tổng hóa đơn','totalBilled':'Tổng giá trị đã lập hóa đơn','currentMonthInvoices':'Hóa đơn tháng này','currentMonthBilled':'Giá trị hóa đơn tháng này',
          'currentMonthCollected':'Tiền thực thu tháng này','collected':'Tổng tiền thực thu','outstanding':'Công nợ còn lại','overdueInvoices':'Hóa đơn quá hạn','overdueAmount':'Tiền quá hạn',
          'collectionRate':'Tỷ lệ thu hóa đơn tháng (%)','activeVehicles':'Xe hoạt động','activeParkingCards':'Thẻ xe hoạt động','parkingSlots':'Chỗ đậu','occupiedParkingSlots':'Chỗ đã dùng',
          'maintenanceNew':'Bảo trì mới','maintenanceInProgress':'Bảo trì đang xử lý','maintenanceOverdue':'Bảo trì quá hạn theo DueDate','averageMaintenanceHours':'Giờ xử lý trung bình','activeServiceRegistrations':'Đăng ký dịch vụ đang hoạt động'}
        return reply('\n'.join(f"{labels[k]}: {v:,.2f}" if isinstance(v,(float,int)) else f"{labels[k]}: chưa đủ dữ liệu" for k,v in overview.items() if k in labels),data,
            [dict(label='Mở nghiệp vụ',page=CATALOG[kind]['page'],params={})] if kind else [])
    return reply('Tôi là trợ lý dữ liệu theo quy tắc, không phải LLM. Bạn có thể tìm cư dân, xe, hóa đơn; hỏi công nợ, tiền thực thu, bảo trì, thiết bị, dịch vụ hoặc hợp đồng sắp hết hạn. Hãy nêu rõ nghiệp vụ cần tra cứu.',type='HELP')
