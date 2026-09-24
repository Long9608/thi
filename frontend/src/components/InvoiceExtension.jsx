import React, {useState} from 'react';
import {invoiceAPI} from '../api';
import {Button,Modal,Input} from './UI';
import {money,formatDateTime} from '../utils/formatters';

export default function InvoiceExtension({invoice,resident,onUpdated}) {
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [request,setRequest]=useState(null),[date,setDate]=useState(''),[reason,setReason]=useState('');
  const [pending,setPending]=useState(Boolean(invoice.PendingExtensionID));
  const show=async()=>{
    setOpen(true);setBusy(true);setError('');setReason('');
    try {const rows=(await invoiceAPI.getExtensions(invoice.InvoiceID)).data;const current=rows.find(r=>r.Status==='PENDING');setRequest(current);setDate(current?.RequestedDueDate?.slice(0,10)||'');}
    catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const save=async(decision)=>{
    setBusy(true);setError('');
    try{
      if(resident){await invoiceAPI.requestExtension(invoice.InvoiceID,{requestedDueDate:date,reason});setPending(true);}
      else await invoiceAPI.reviewExtension(invoice.InvoiceID,{requestId:request?.RequestID,decision,approvedDueDate:date,note:reason});
      setOpen(false);await onUpdated?.();
    }catch(e){setError(e.message);}finally{setBusy(false);}
  };
  return <><Button disabled={resident&&(pending||Boolean(invoice.PendingExtensionID))} onClick={show}>{resident?(pending||invoice.PendingExtensionID?'Đang chờ gia hạn':'Xin gia hạn thanh toán'):(invoice.PendingExtensionID?'Xử lý gia hạn':'Gia hạn thanh toán')}</Button>
    <Modal open={open} title="Gia hạn thanh toán" onClose={()=>!busy&&setOpen(false)}>
      <form className="space-y-4" onSubmit={e=>{e.preventDefault();save('APPROVED');}}>
        <p>Hóa đơn #{invoice.InvoiceID} · {invoice.ApartmentCode} · {invoice.OwnerName}</p>
        <p>Còn nợ: {money(invoice.RemainingAmount)} · Hạn hiện tại: {invoice.DueDate?.slice(0,10)}</p>
        {request&&<div className="rounded bg-amber-50 p-3"><p>Ngày đề nghị: {request.RequestedDueDate?.slice(0,10)}</p><p>Lý do: {request.Reason}</p><p>Gửi lúc: {formatDateTime(request.RequestedAt)}</p></div>}
        <label className="block">Hạn thanh toán mới<Input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label>
        <label className="block">{resident?'Lý do':'Ghi chú xử lý'}<textarea className="w-full border rounded p-2" required={resident||!request} maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}/></label>
        {error&&<p role="alert" className="text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          {!resident&&request&&<Button type="button" variant="danger" disabled={busy} onClick={()=>save('REJECTED')}>Từ chối</Button>}
          <Button type="submit" disabled={busy}>{busy?'Đang lưu…':resident?'Gửi yêu cầu':'Chấp nhận'}</Button>
        </div>
      </form>
    </Modal></>;
}
