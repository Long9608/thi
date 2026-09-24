from contextlib import closing
from database import get_connection
from app.services.catalog import CATALOG, PAID
from app.services.scope import access, scope_clause
from app.services.domain_search import serial

ACTIVE="c.StatusID IN (2,5) AND CAST(GETDATE() AS date) BETWEEN c.StartDate AND c.EndDate"
VALID="i.StatusID<>4 AND i.WorkflowStatus<>'DRAFT'"
OVERDUE="DueDate<CAST(GETDATE() AS date) AND RemainingAmount>0"

def query(cursor, sql, params):
    cursor.execute(sql,*params)
    names=[d[0] for d in cursor.description]
    return [{k:serial(v) for k,v in zip(names,row)} for row in cursor.fetchall()]

def statistics(user, modules=None, resident_id=None):
    result={}; trend=[]
    with closing(get_connection()) as connection:
        cursor=connection.cursor()
        def allowed(module): return access(user,module)!='none' and (modules is None or module in modules)
        def aggregate(kind, columns, condition='1=1'):
            s=CATALOG[kind];scope,params=scope_clause(cursor,user,s)
            return query(cursor,f"SELECT {columns} FROM {s['source']} WHERE ({scope}) AND ({condition})",params)[0]
        if allowed('RESIDENT'): result.update(aggregate('RESIDENT','COUNT(*) activeResidents','r.Status=1'))
        if allowed('APARTMENT'):
            scope,params=scope_clause(cursor,user,CATALOG['APARTMENT'])
            values=query(cursor,f"""SELECT COUNT(*) totalApartments,ISNULL(SUM(occupied),0) occupiedApartments FROM
                (SELECT CASE WHEN EXISTS(SELECT 1 FROM Contract c WHERE c.ApartmentID=a.ApartmentID AND {ACTIVE}) THEN 1 ELSE 0 END occupied
                 FROM Apartment a WHERE {scope}) rooms""",params)[0]
            values['vacantApartments']=values['totalApartments']-values['occupiedApartments']
            values['occupancyRate']=round(values['occupiedApartments']/values['totalApartments']*100,2) if values['totalApartments'] else 0
            result.update(values)
        if allowed('CONTRACT'):
            columns=['COUNT(*) activeContracts']+[f"ISNULL(SUM(CASE WHEN c.EndDate<=DATEADD(day,{days},CAST(GETDATE() AS date)) THEN 1 ELSE 0 END),0) expiring{days}" for days in (30,60,90)]
            result.update(aggregate('CONTRACT',','.join(columns),ACTIVE))
        if allowed('VEHICLE'): result.update(aggregate('VEHICLE','COUNT(*) activeVehicles','v.Status=1'))
        if allowed('PARKING'):
            result.update(aggregate('PARKING_CARD','COUNT(*) activeParkingCards',"pc.Status=1 AND (pc.ExpiredDate IS NULL OR pc.ExpiredDate>=CAST(GETDATE() AS date))"))
            result.update(aggregate('PARKING_SLOT','COUNT(*) parkingSlots,ISNULL(SUM(CAST(ps.IsOccupied AS int)),0) occupiedParkingSlots'))
        if allowed('TICKET'):
            result.update(aggregate('MAINTENANCE',"""COUNT(*) maintenanceTotal,
                ISNULL(SUM(CASE WHEN mr.StatusID=1 THEN 1 ELSE 0 END),0) maintenanceNew,
                ISNULL(SUM(CASE WHEN mr.StatusID=2 THEN 1 ELSE 0 END),0) maintenanceInProgress,
                ISNULL(SUM(CASE WHEN mr.StatusID IN (1,2) AND mr.DueDate<CAST(GETDATE() AS date) THEN 1 ELSE 0 END),0) maintenanceOverdue,
                SUM(CASE WHEN mr.StatusID IN (1,2) AND mr.DueDate IS NULL THEN 1 ELSE 0 END) maintenanceWithoutDeadline,
                AVG(CASE WHEN mr.CompletedAt>=mr.RequestDate THEN DATEDIFF(minute,mr.RequestDate,mr.CompletedAt)/60.0 END) averageMaintenanceHours"""))
        if allowed('SERVICE'): result.update(aggregate('SERVICE_REGISTRATION','COUNT(*) activeServiceRegistrations',"sr.Status=1 AND (sr.EndDate IS NULL OR sr.EndDate>=CAST(GETDATE() AS date))"))
        if allowed('FEEDBACK'): result.update(aggregate('FEEDBACK',"COUNT(*) feedbackCount,SUM(CASE WHEN f.Reply IS NULL OR f.Reply='' THEN 1 ELSE 0 END) unansweredFeedback"))
        if allowed('NOTIFICATION'): result.update(aggregate('NOTIFICATION','COUNT(*) notificationCount'))
        if allowed('INVOICE'):
            s=CATALOG['INVOICE'];scope,params=scope_clause(cursor,user,s)
            if resident_id is not None:
                scope+=' AND (c.OwnerID=? OR EXISTS(SELECT 1 FROM ContractResident cr WHERE cr.ContractID=c.ContractID AND cr.ResidentID=? AND (cr.MoveOutDate IS NULL OR cr.MoveOutDate>=CAST(GETDATE() AS date))))'
                params += [resident_id,resident_id]
            cte=f"WITH bills AS (SELECT i.*,{PAID} PaidAmount,i.TotalAmount-{PAID} RemainingAmount,a.ApartmentCode FROM {s['source']} WHERE ({scope}) AND {VALID})"
            result.update(query(cursor,cte+f""" SELECT COUNT(*) invoiceCount,ISNULL(SUM(TotalAmount),0) totalBilled,
                ISNULL(SUM(CASE WHEN RemainingAmount>0 THEN RemainingAmount ELSE 0 END),0) outstanding,
                ISNULL(SUM(CASE WHEN {OVERDUE} THEN 1 ELSE 0 END),0) overdueInvoices,
                ISNULL(SUM(CASE WHEN {OVERDUE} THEN RemainingAmount ELSE 0 END),0) overdueAmount,
                ISNULL(SUM(CASE WHEN InvoiceMonth=MONTH(GETDATE()) AND InvoiceYear=YEAR(GETDATE()) THEN 1 ELSE 0 END),0) currentMonthInvoices,
                ISNULL(SUM(CASE WHEN InvoiceMonth=MONTH(GETDATE()) AND InvoiceYear=YEAR(GETDATE()) THEN TotalAmount ELSE 0 END),0) currentMonthBilled,
                ISNULL(SUM(CASE WHEN InvoiceMonth=MONTH(GETDATE()) AND InvoiceYear=YEAR(GETDATE()) THEN PaidAmount ELSE 0 END),0) currentMonthInvoicePayments
                FROM bills""",params)[0])
            paid_scope,paid_params=scope_clause(cursor,user,CATALOG['PAYMENT'])
            if resident_id is not None:
                paid_scope+=' AND (c.OwnerID=? OR EXISTS(SELECT 1 FROM ContractResident cr WHERE cr.ContractID=c.ContractID AND cr.ResidentID=? AND (cr.MoveOutDate IS NULL OR cr.MoveOutDate>=CAST(GETDATE() AS date))))';paid_params += [resident_id,resident_id]
            result.update(query(cursor,f"SELECT ISNULL(SUM(pay.Amount),0) collected,ISNULL(SUM(CASE WHEN MONTH(pay.PaymentDate)=MONTH(GETDATE()) AND YEAR(pay.PaymentDate)=YEAR(GETDATE()) THEN pay.Amount ELSE 0 END),0) currentMonthCollected FROM {CATALOG['PAYMENT']['source']} WHERE ({paid_scope}) AND pay.StatusID=2 AND {VALID}",paid_params)[0])
            result['collectionRate']=round(result['currentMonthInvoicePayments']/result['currentMonthBilled']*100,2) if result['currentMonthBilled'] else None
            # Calendar months, including empty months; collected is grouped by PaymentDate.
            trend=query(cursor,f"""WITH months AS (SELECT DATEFROMPARTS(YEAR(GETDATE()),MONTH(GETDATE()),1) period,0 n
                UNION ALL SELECT DATEADD(month,-1,period),n+1 FROM months WHERE n<5),
                bills AS (SELECT i.* FROM {s['source']} WHERE ({scope}) AND {VALID}),
                receipts AS (SELECT pay.* FROM {CATALOG['PAYMENT']['source']} WHERE ({paid_scope}) AND pay.StatusID=2 AND {VALID})
                SELECT YEAR(m.period) year,MONTH(m.period) month,
                 (SELECT COUNT(*) FROM bills b WHERE b.InvoiceMonth=MONTH(m.period) AND b.InvoiceYear=YEAR(m.period)) invoiceCount,
                 (SELECT ISNULL(SUM(b.TotalAmount),0) FROM bills b WHERE b.InvoiceMonth=MONTH(m.period) AND b.InvoiceYear=YEAR(m.period)) totalBilled,
                 (SELECT ISNULL(SUM(p.Amount),0) FROM receipts p WHERE p.PaymentDate>=m.period AND p.PaymentDate<DATEADD(month,1,m.period)) collected
                FROM months m ORDER BY m.period""",params+paid_params)
    return {'success':True,'data':{'overview':result,'billingTrend':trend,'billingInsight':insight(trend),'mode':'DETERMINISTIC_ANALYTICS'}}

def insight(trend):
    if len(trend)<2: return {'insight':'Không có dữ liệu thanh toán trong phạm vi quyền.','changePercent':None,'direction':'UNKNOWN'}
    current,previous=trend[-1],trend[-2]
    change=round((current['collected']-previous['collected'])/previous['collected']*100,2) if previous['collected'] else None
    return {'previousPeriod':previous,'currentPeriod':current,'changePercent':change,'direction':'UNKNOWN' if change is None else 'UP' if change>0 else 'DOWN' if change<0 else 'STABLE',
        'isCurrentMonthIncomplete':True,'insight':f"Đã thu tháng này: {current['collected']:,.0f} đ; tháng trước: {previous['collected']:,.0f} đ. Tháng hiện tại chưa kết thúc."}

def domain_report(user, kind, report, days=30):
    s=CATALOG[kind]
    with closing(get_connection()) as connection:
        cursor=connection.cursor();scope,params=scope_clause(cursor,user,s)
        if report=='top_debt':
            sql=f"WITH debt AS (SELECT a.ApartmentID,a.ApartmentCode,i.TotalAmount-{PAID} remaining FROM {s['source']} WHERE ({scope}) AND {VALID}) SELECT TOP 10 ApartmentID,ApartmentCode,SUM(remaining) outstanding FROM debt WHERE remaining>0 GROUP BY ApartmentID,ApartmentCode ORDER BY outstanding DESC"
        elif report=='popular_services':
            sql=f"SELECT TOP 10 s.ServiceID,s.ServiceName,COUNT(*) registrations FROM {s['source']} WHERE ({scope}) AND sr.Status=1 GROUP BY s.ServiceID,s.ServiceName ORDER BY registrations DESC"
        else:
            condition={'expiring':f'{ACTIVE} AND c.EndDate<=DATEADD(day,?,CAST(GETDATE() AS date))','pending':'mr.StatusID IN (1,2)',
                'equipment':"EXISTS(SELECT 1 FROM MaintenanceRequest mr WHERE mr.ContractEquipmentID=ce.ContractEquipmentID AND mr.StatusID IN (1,2)) OR ce.EquipmentStatus<>'operational'"}[report]
            if report=='expiring':params.append(days)
            sql=f"SELECT {s['data']} FROM {s['source']} WHERE ({scope}) AND ({condition}) ORDER BY {s['id']} OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY"
        return query(cursor,sql,params)

def resident_apartments(user,resident_id):
    with closing(get_connection()) as connection:
        cursor=connection.cursor();scope,params=scope_clause(cursor,user,CATALOG['APARTMENT'])
        return query(cursor,f"""SELECT a.ApartmentID,a.ApartmentCode FROM Apartment a WHERE ({scope}) AND EXISTS(
          SELECT 1 FROM Contract c WHERE c.ApartmentID=a.ApartmentID AND {ACTIVE} AND
          (c.OwnerID=? OR EXISTS(SELECT 1 FROM ContractResident cr WHERE cr.ContractID=c.ContractID AND cr.ResidentID=?
            AND (cr.MoveInDate IS NULL OR cr.MoveInDate<=CAST(GETDATE() AS date)) AND (cr.MoveOutDate IS NULL OR cr.MoveOutDate>=CAST(GETDATE() AS date)))))""",params+[resident_id,resident_id])
