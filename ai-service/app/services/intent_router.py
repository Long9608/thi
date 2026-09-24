import re
import unicodedata

def normalize(text):
    text=''.join(c for c in unicodedata.normalize('NFD',str(text).lower().replace('đ','d')) if unicodedata.category(c)!='Mn')
    return re.sub(r'\s+',' ',text).strip()

DOMAINS=[('PARKING_CARD',['the xe','parking card']),('PARKING_SLOT',['bai xe','cho dau','cho do']),
 ('EQUIPMENT',['thiet bi']),('MAINTENANCE',['bao tri','sua chua','yeu cau ho tro']),
 ('SERVICE_REGISTRATION',['dang ky dich vu','dich vu dang ky']),('SERVICE',['dich vu']),('FEEDBACK',['phan anh','gop y']),
 ('NOTIFICATION',['thong bao']),('INVOICE',['hoa don','cong no','con no','chua thu','thu duoc','doanh thu','con bao nhieu tien','no nhieu']),
 ('PAYMENT',['thanh toan','da thu']),('VEHICLE',['xe','bien so','phuong tien']),('CONTRACT',['hop dong']),
 ('APARTMENT',['can ho','can trong','can dang trong','can dang thue']),('RESIDENT',['cu dan','nguoi dan'])]

def detect(message):
    text=normalize(message)
    kind=next((kind for kind,terms in DOMAINS if any(t in text for t in terms)),None)
    if any(t in text for t in ['chu y hom nay','van hanh','van de nao']): return 'attention',None
    if any(t in text for t in ['xu huong','so sanh']): return 'trend','INVOICE'
    if 'top' in text and any(t in text for t in ['no','chua thu']): return 'top_debt','INVOICE'
    if 'dich vu' in text and any(t in text for t in ['nhieu nhat','pho bien']): return 'popular_services','SERVICE_REGISTRATION'
    if kind=='CONTRACT' and any(t in text for t in ['sap het','het han trong']): return 'expiring',kind
    if kind=='EQUIPMENT' and any(t in text for t in ['cho','bao tri','hong']): return 'equipment',kind
    if kind=='MAINTENANCE' and any(t in text for t in ['chua hoan thanh','chua xong','dang cho']): return 'pending',kind
    if re.search(r'\b(tim|tra cuu|bien so)\b',text) or '#' in text: return 'search',kind or 'RESIDENT'
    if any(t in text for t in ['bao nhieu','thong ke','tong','ty le','tinh trang']): return 'statistics',kind
    if re.search(r'\btoi\b',text) and kind: return 'search',kind
    if kind in ('EQUIPMENT','FEEDBACK','NOTIFICATION','SERVICE'): return 'search',kind
    return ('statistics',kind) if kind else ('help',None)

def keyword(message):
    text=normalize(message)
    text=re.sub(r'^(tim kiem|tim|tra cuu|kiem tra)\s+','',text)
    text=re.sub(r'^(cu dan|nguoi|xe|phuong tien|hoa don|hop dong|can ho)\s*','',text)
    text=re.sub(r'^(ten|bien so|cua)\s+','',text)
    return text.strip(' ?!.,;#')
