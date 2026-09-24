"""Only Express /permissions supplies identity; SQL values are bound parameters."""
from fastapi import HTTPException

def access(user, module):
    permissions = set(user.get('permissions', []))
    resident = 'RESIDENT' in user.get('roleCodes', [])
    if not resident and module + '_VIEW_ALL' in permissions: return 'all'
    if module + '_VIEW_OWN' in permissions: return 'own'
    if module == 'SERVICE' and 'SERVICE_VIEW' in permissions and not any(p in permissions for p in ('SERVICE_VIEW_ALL','SERVICE_VIEW_OWN')):
        return 'own' if resident else 'all'
    return 'none'

def ownership(alias='c'):
    return f"""({alias}.OwnerID=? OR EXISTS(SELECT 1 FROM ContractResident cr WHERE cr.ContractID={alias}.ContractID AND cr.ResidentID=?
        AND (cr.MoveInDate IS NULL OR cr.MoveInDate<=CAST(GETDATE() AS date))
        AND (cr.MoveOutDate IS NULL OR cr.MoveOutDate>=CAST(GETDATE() AS date))))"""

def scope_clause(cursor, user, spec):
    mode = access(user, spec['module'])
    if mode == 'none': raise HTTPException(403, 'Không có quyền đọc nghiệp vụ này')
    if mode == 'all': return '1=1', []
    if spec['kind'] == 'notification':
        return 'EXISTS(SELECT 1 FROM NotificationReceiver nr WHERE nr.NotificationID=n.NotificationID AND nr.UserID=?)', [user['userId']]
    cursor.execute('SELECT ResidentID FROM Resident WHERE UserID=? AND Status=1', user['userId'])
    rows=cursor.fetchall()
    resident_id=rows[0][0] if len(rows)==1 else None
    if resident_id is None:
        if spec['kind'] == 'ticket' and 'RESIDENT' not in user.get('roleCodes', []):
            return '(mr.AssignedEmployeeID IN (SELECT EmployeeID FROM Employee WHERE UserID=? AND Status=1) OR (mr.AssignedEmployeeID IS NULL AND mr.StatusID=1))', [user['userId']]
        raise HTTPException(403, 'Tài khoản chưa liên kết cư dân đang hoạt động')
    kind = spec['kind']
    if kind == 'contract': return ownership(), [resident_id, resident_id]
    if kind == 'apartment':
        return f'EXISTS(SELECT 1 FROM Contract c WHERE c.ApartmentID=a.ApartmentID AND c.StatusID IN (2,5) AND CAST(GETDATE() AS date) BETWEEN c.StartDate AND c.EndDate AND {ownership()})', [resident_id,resident_id]
    if kind == 'service':
        return f'EXISTS(SELECT 1 FROM ServiceRegistration sr JOIN Contract c ON c.ContractID=sr.ContractID WHERE sr.ServiceID=s.ServiceID AND {ownership()})', [resident_id,resident_id]
    if kind == 'slot':
        return 'EXISTS(SELECT 1 FROM ParkingCard pc JOIN Vehicle v ON v.VehicleID=pc.VehicleID WHERE pc.SlotID=ps.SlotID AND v.ResidentID=?)', [resident_id]
    column = {'resident':'r.ResidentID','vehicle':'v.ResidentID','ticket':'mr.ResidentID','feedback':'f.ResidentID'}[kind]
    return column + '=?', [resident_id]
