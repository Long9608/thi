from contextlib import closing
from decimal import Decimal
from datetime import date, datetime
from fastapi import HTTPException
from database import get_connection
from app.services.catalog import CATALOG
from app.services.scope import access, scope_clause

def serial(value):
    if isinstance(value, Decimal): return float(value)
    if isinstance(value, (date,datetime)): return value.isoformat()
    return value

def search_all(keyword, user, page=1, limit=30, entity_type=None, entity_id=None):
    if entity_type and entity_type not in CATALOG: raise HTTPException(400,'Loại dữ liệu không hợp lệ')
    selected = {entity_type:CATALOG[entity_type]} if entity_type else CATALOG
    total, results, offset = 0, [], (page-1)*limit
    pattern = '%' + keyword.replace('[','[[]').replace('%','[%]').replace('_','[_]') + '%'
    with closing(get_connection()) as connection:
        cursor=connection.cursor()
        for kind,s in selected.items():
            if access(user,s['module'])=='none':
                if entity_type: raise HTTPException(403,'Không có quyền đọc nghiệp vụ này')
                continue
            scope,params=scope_clause(cursor,user,s)
            match=' OR '.join(f"{column} COLLATE Latin1_General_100_CI_AI LIKE ?" for column in s['search'])
            where=f'({scope}) AND ({match})'
            values=params+[pattern]*len(s['search'])
            if entity_id is not None: where+=f" AND {s['id']}=?";values.append(entity_id)
            cursor.execute(f"SELECT COUNT(*) FROM {s['source']} WHERE {where}",*values)
            count=cursor.fetchone()[0];total+=count
            if offset>=count: offset-=count;continue
            room=limit-len(results)
            if room<=0: continue
            cursor.execute(f"SELECT {s['id']} EntityID,{s['title']} Title,{s['subtitle']} Subtitle,{s['data']} FROM {s['source']} WHERE {where} ORDER BY {s['id']} OFFSET ? ROWS FETCH NEXT ? ROWS ONLY",*(values+[offset,room]))
            names=[d[0] for d in cursor.description]
            for row in cursor.fetchall():
                record={k:serial(v) for k,v in zip(names,row)}
                id=record.pop('EntityID');title=record.pop('Title');subtitle=record.pop('Subtitle')
                linked=record['InvoiceID'] if kind=='PAYMENT' else record['ContractID'] if kind=='EQUIPMENT' else id
                params={s['param']:linked}
                page=s['page']
                if kind not in ('INVOICE','PAYMENT','CONTRACT','MAINTENANCE','FEEDBACK'):
                    page='ai-record';params={'entityType':kind,'recordId':id}
                results.append(dict(type=kind,id=id,title=title,subtitle=subtitle,data=record,targetPage=page,params=params,deepLink=params))
            offset=0
    return dict(success=True,query=keyword,data=results,count=len(results),total=total,pagination=dict(page=page,limit=limit,total=total,totalPages=(total+limit-1)//limit))
