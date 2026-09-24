import React, { useEffect, useState } from 'react';
import { invoiceAPI } from '../api';
import { createPermissionChecker } from '../permissions';
import { Button, Modal, Input } from './UI';
import { money, formatDateTime } from '../utils/formatters';
import InvoiceExtension from './InvoiceExtension';

export default function InvoicePayment({ invoice, onUpdated }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const { can, roleCodes } = createPermissionChecker(user);
  const resident = roleCodes.includes('RESIDENT');
  const canConfirm = !resident && can('INVOICE_VIEW_ALL') && can('PAYMENT_CREATE');
  const [open, setOpen] = useState(false), [info, setInfo] = useState(null);
  const [paymentSubmitted, setPaymentSubmitted] = useState(Boolean(invoice.PaymentSubmittedAt));
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [done, setDone] = useState('');
  const [methods, setMethods] = useState([]), [methodId, setMethodId] = useState(''), [transactionCode, setTransactionCode] = useState('');
  useEffect(() => {
    setPaymentSubmitted(Boolean(invoice.PaymentSubmittedAt));
  }, [invoice.PaymentSubmittedAt]);
  const pendingSubmission = paymentSubmitted;
  const payable = !invoice.IsPaid && invoice.StatusID !== 4 && invoice.WorkflowStatus !== 'DRAFT' && Number(invoice.RemainingAmount ?? invoice.TotalAmount) > 0;
  const canExtend = !resident && can('INVOICE_VIEW_ALL') && can('INVOICE_DUE_DATE_EXTEND');
  if (payable && invoice.IsOverdue && !pendingSubmission && (resident || canExtend)) return <InvoiceExtension invoice={invoice} resident={resident} onUpdated={onUpdated}/>;
  if (payable && invoice.IsOverdue && !pendingSubmission) return null;
  if ((!resident && !canConfirm) || !payable) return null;
  const show = async () => {
    setOpen(true); setBusy(true); setError(''); setDone(''); setInfo(null);
    try {
      const result = await invoiceAPI.getPaymentInfo(invoice.InvoiceID); setInfo(result.data);
      if (canConfirm) { const rows = (await invoiceAPI.getPaymentMethods()).data || []; setMethods(rows); setMethodId(''); }
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = resident ? await invoiceAPI.submitPayment(invoice.InvoiceID)
        : await invoiceAPI.confirmPayment(invoice.InvoiceID, { methodId: Number(methodId), transactionCode });
      setDone(result.message);
      if (resident) setPaymentSubmitted(true);
      if (resident) setInfo((await invoiceAPI.getPaymentInfo(invoice.InvoiceID)).data);
      else { setOpen(false); await onUpdated?.(); }
    } catch(err) { setError(err.message); } finally { setBusy(false); }
  };
  return <>
    <Button disabled={resident && pendingSubmission} className={resident && pendingSubmission ? 'opacity-50' : ''} onClick={show}>{resident ? (pendingSubmission ? 'Chờ xác nhận' : 'Thanh toán') : 'Xác nhận thanh toán'}</Button>
    <Modal open={open} title={resident ? 'Thanh toán hóa đơn' : 'Xác nhận thanh toán'} onClose={() => !busy && setOpen(false)}>
      {error && <p role="alert" className="mb-3 text-red-600">{error}</p>}
      {done && <p role="status" className="mb-3 text-emerald-700">{done}</p>}
      {busy && !info && <p>Đang tải thông tin thanh toán…</p>}
      {info && <form onSubmit={submit} className="space-y-4">
        <p>Hóa đơn #{invoice.InvoiceID} · Căn {info.invoice.ApartmentCode} · Tháng {info.invoice.InvoiceMonth}/{info.invoice.InvoiceYear}</p>
        <p className="text-xl font-bold">Số tiền: {money(info.invoice.RemainingAmount)}</p>
        <p>Nội dung chuyển khoản: <strong>{info.transferContent}</strong></p>
        {info.invoice.SubmittedAt && <p className="text-amber-700">Cư dân đã báo chuyển khoản lúc {formatDateTime(info.invoice.SubmittedAt)}. Đang chờ kiểm tra.</p>}
        {resident ? <>
          {info.config ? <><p>{info.config.AccountName} · {info.config.AccountNumber} · BIN {info.config.BankBin}</p>
            {info.qrUrl && <img className="mx-auto max-h-80" src={info.qrUrl} alt="QR chuyển khoản thanh toán hóa đơn" onError={() => setError('Không tải được QR. Bạn có thể chuyển khoản bằng thông tin tài khoản và nội dung ở trên.')} />}</>
            : <p className="rounded-xl bg-amber-50 p-3">Ban quản lý chưa cấu hình tài khoản nhận tiền. Vui lòng liên hệ Ban quản lý để lấy thông tin chuyển khoản.</p>}
          {!info.invoice.SubmittedAt && <p className="text-sm text-slate-500">Chỉ xác nhận sau khi bạn đã chuyển khoản thành công.</p>}
        </> : <>
          <p>Kiểm tra giao dịch thực tế trước khi xác nhận. Hệ thống sẽ ghi nhận thu đủ số tiền còn lại.</p>
          <label className="block">Phương thức thanh toán
            <select required value={methodId} onChange={e=>setMethodId(e.target.value)} className="w-full rounded-xl border p-3"><option value="">Chọn phương thức</option>{methods.map(m=><option key={m.MethodID} value={m.MethodID}>{m.MethodName}</option>)}</select>
          </label>
          <Input placeholder="Mã giao dịch / số chứng từ" value={transactionCode} onChange={e=>setTransactionCode(e.target.value)} maxLength={100} />
        </>}
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={busy} onClick={()=>setOpen(false)}>Đóng</Button>
          {(!resident || !info.invoice.SubmittedAt) && <Button type="submit" disabled={busy || (resident && !info.config)}>{busy?'Đang lưu…':resident?'Tôi đã chuyển tiền':'Xác nhận thanh toán'}</Button>}
        </div>
      </form>}
    </Modal>
  </>;
}

export function PaymentConfiguration() {
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [form,setForm]=useState({bankBin:'',accountNumber:'',accountName:''});
  const show=async()=>{setOpen(true);setError('');setBusy(true);try{const {data}=await invoiceAPI.getPaymentConfig();setForm({bankBin:data?.BankBin||'',accountNumber:data?.AccountNumber||'',accountName:data?.AccountName||''});}catch(e){setError(e.message);}finally{setBusy(false);}};
  const save=async e=>{e.preventDefault();setBusy(true);try{await invoiceAPI.savePaymentConfig(form);setOpen(false);}catch(e){setError(e.message);}finally{setBusy(false);}};
  return <><Button variant="secondary" onClick={show}>Tài khoản nhận tiền</Button><Modal open={open} title="Tài khoản nhận tiền" onClose={()=>!busy&&setOpen(false)}>
    <form onSubmit={save} className="space-y-4">{error&&<p role="alert" className="text-red-600">{error}</p>}
      {Object.entries({bankBin:'Mã BIN ngân hàng (6 số)',accountNumber:'Số tài khoản',accountName:'Tên chủ tài khoản'}).map(([key,label])=><label key={key} className="block">{label}<Input required value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={busy} onClick={()=>setOpen(false)}>Hủy</Button><Button type="submit" disabled={busy}>Lưu</Button></div>
    </form></Modal></>;
}
