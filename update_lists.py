from pathlib import Path
import re
for name in ['Fees','VehicleManagement','ParkingCardManagement']:
 p=Path(f'frontend/src/pages/{name}.jsx'); s=p.read_text(encoding='utf-8')
 s="import { fetchAllPages } from '../utils/fetchAllPages';\n"+s
 if name=='Fees':
  s=re.sub(r'await invoiceAPI.getAll\(\s*statusFilter,\s*monthFilter,\s*yearFilter,\s*page,\s*20\s*\)', 'await fetchAllPages((p, limit) => invoiceAPI.getAll(statusFilter, monthFilter, yearFilter, p, limit))',s)
  s=s.replace('return contractNumber.includes(q)', 'return String(inv.InvoiceID).includes(q) || contractNumber.includes(q)')
  start=s.index('  // Stats'); end=s.index('  const chargeTypeLabels',start)
  s=s[:start]+'''  const stats = useMemo(() => ({
    total: filteredInvoices.length,
    totalAmount: filteredInvoices.reduce((s, i) => s + Number(i.TotalAmount || 0), 0),
    unpaid: filteredInvoices.filter(i => i.StatusID !== 4 && i.WorkflowStatus !== 'DRAFT').reduce((s, i) => s + Number(i.RemainingAmount || 0), 0),
    paid: filteredInvoices.reduce((s, i) => s + Number(i.PaidAmount || 0), 0),
    overdue: filteredInvoices.filter(i => i.IsOverdue).length,
    paidCount: filteredInvoices.filter(i => i.IsPaid).length
  }), [filteredInvoices]);

'''+s[end:]
 elif name=='VehicleManagement':
  s=re.sub(r'await vehicleAPI.getAll\(\s*\x27\x27, // residentId.*?\n\s*20\s*\)', "await fetchAllPages((p, limit) => vehicleAPI.getAll('', typeFilter || '', statusFilter, p, limit))",s,flags=re.S)
 else:
  s=s.replace("await vehicleAPI.getAll('', '', '', page, 20)","await fetchAllPages((p, limit) => vehicleAPI.getParkingCards('', p, limit))")
  s=s.replace('const withCards = allVehicles.filter(v => v.CardID);','const withCards = allVehicles.map(c => ({ ...c, CardIssueDate: c.IssueDate, CardExpiredDate: c.ExpiredDate }));')
  s=s.replace("await vehicleAPI.getAll('', '', '', 1, 999)","await fetchAllPages((p, limit) => vehicleAPI.getAll('', '', '', p, limit))")
 p.write_text(s,encoding='utf-8')
p=Path('backend/migrations/20260921_add_rbac_scoped_view_permissions.sql'); s=p.read_text(encoding='utf-8'); s=re.sub(r'^USE ApartmentManagement;\s*GO\s*','',s); p.write_text(s,encoding='utf-8')
