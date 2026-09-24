from pathlib import Path
p=Path('backend/controllers/notificationController.js');s=p.read_text(encoding='utf-8');start=s.index('exports.createNotification =');end=s.index('exports.markAsRead =',start)
s=s[:start]+'''exports.createNotification = async (req, res, next) => {
    try {
        if (req.body.scheduledDate || req.body.scheduledAt) return res.status(409).json({success:false,message:'Chưa hỗ trợ lịch gửi'});
        const data=await require('../services/notificationDeliveryService').createDelivery(await getPool(),req.userId,req.body);
        res.status(201).json({success:true,data,message:'Đã xử lý gửi thông báo'});
    } catch(error) { next(error); }
};

'''+s[end:];p.write_text(s,encoding='utf-8')
p=Path('backend/controllers/invoiceController.js');s=p.read_text(encoding='utf-8')
metadata='''
                CASE WHEN i.DueDate<CAST(GETDATE() AS date) AND i.StatusID NOT IN (2,4) AND i.WorkflowStatus<>'DRAFT'
                  AND i.TotalAmount>ISNULL((SELECT SUM(Amount) FROM Payment WHERE InvoiceID=i.InvoiceID AND StatusID=2),0) THEN 1 ELSE 0 END IsOverdue,
                (SELECT RequestID FROM InvoiceDueDateExtensionRequest WHERE InvoiceID=i.InvoiceID AND Status='PENDING') PendingExtensionID,
'''
s=s.replace('                i.InvoiceID,','                i.InvoiceID,'+metadata,1)
s=s.replace('                    i.*,','                    i.*,'+metadata+" (SELECT SubmittedAt FROM InvoicePaymentSubmission WHERE InvoiceID=i.InvoiceID AND ConfirmedAt IS NULL) PaymentSubmittedAt,",1)
p.write_text(s,encoding='utf-8')
p=Path('frontend/src/api.js');s=p.read_text(encoding='utf-8');s=s.replace('export const invoiceAPI = {', '''export const invoiceAPI = {
  getExtensions: id => request(`/invoices/${id}/extensions`),
  requestExtension: (id,data) => request(`/invoices/${id}/extensions`, {method:'POST',body:JSON.stringify(data)}),
  reviewExtension: (id,data) => request(`/invoices/${id}/extensions/review`, {method:'POST',body:JSON.stringify(data)}),''');p.write_text(s,encoding='utf-8')
p=Path('frontend/src/pages/SendNotification.jsx');s=p.read_text(encoding='utf-8');s=s.replace("  const [loading, setLoading]", "  const [channels, setChannels] = useState(['WEB']);\n  const [summary, setSummary] = useState(null);\n  const [loading, setLoading]")
s=s.replace('    setLoading(true);', "    if (!channels.length) { flash?.('Chọn ít nhất một kênh gửi'); return; }\n    setLoading(true);",1)
s=s.replace('targetScope: form.targetScope','channels,\n        targetScope: form.targetScope',1)
s=s.replace('      setSentCount(', '      setSummary(res?.data);\n      setSentCount(',1)
s=s.replace('          {/* Title */}', '''          <fieldset className="flex gap-5"><legend className="font-semibold mb-2">Kênh gửi</legend>
            {[['WEB','Thông báo trên hệ thống'],['EMAIL','Email']].map(([value,label])=><label key={value}><input type="checkbox" checked={channels.includes(value)} onChange={e=>setChannels(prev=>e.target.checked?[...prev,value]:prev.filter(c=>c!==value))}/> {label}</label>)}
          </fieldset>
          {summary && <p role="status">Người nhận: {summary.targetCount} · Web: {summary.webDelivered} · Email gửi: {summary.emailSent} · Email lỗi: {summary.emailFailed} · Thiếu email: {summary.missingEmail}</p>}
          {/* Title */}''');p.write_text(s,encoding='utf-8')
