import React, { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { ticketAPI, residentAPI, apartmentAPI } from '../api';
import { createPermissionChecker } from '../permissions';
import { Card, Button, Input, Badge, Modal } from '../components/UI';
import { formatDateTime } from '../utils/formatters';

export default function TicketManagement({ flash, deepLink }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const { can, roleCodes } = createPermissionChecker(user);
  const resident = roleCodes.includes('RESIDENT');
  const canCreate = can('TICKET_CREATE') && (resident || can('TICKET_VIEW_ALL'));
  const canProcess = !resident && can('MAINTENANCE_UPDATE');
  const [tickets,setTickets] = useState([]), [statuses,setStatuses] = useState([]);
  const [apartments,setApartments] = useState([]), [residents,setResidents] = useState([]);
  const [search,setSearch] = useState(''), [status,setStatus] = useState(''), [page,setPage] = useState(1), [pages,setPages] = useState(1);
  const [loading,setLoading] = useState(false), [busy,setBusy] = useState(false), [error,setError] = useState('');
  const [selected,setSelected] = useState(null), [creating,setCreating] = useState(false);
  const [form,setForm] = useState({title:'',description:'',apartmentId:'',residentId:''});
  const [update,setUpdate] = useState({progress:0,response:''});
  const load = useCallback(async()=>{
    setLoading(true);
    try { const result=await ticketAPI.getAll(status,page,20,search);setTickets(result.data || []);setPages(Math.max(1,result.pagination?.totalPages || 1)); }
    catch(e){setError(e.message);}finally{setLoading(false);}
  },[status,page,search]);
  useEffect(()=>{const timer=setTimeout(load,200);return()=>clearTimeout(timer);},[load]);
  useEffect(()=>{ticketAPI.getStatuses().then(r=>setStatuses(r.data || [])).catch(e=>setError(e.message));},[]);
  useEffect(()=>{
    const requestId=Number(deepLink?.requestId);
    if(!requestId)return;
    let cancelled=false;
    ticketAPI.getById(requestId).then(({data})=>{if(!cancelled){setSelected(data);setUpdate({progress:data.Progress||0,response:''});}}).catch(e=>{if(!cancelled)setError(e.message);});
    return()=>{cancelled=true;};
  },[deepLink?.requestId]);
  // Residents see updates from technicians without closing the detail modal.
  useEffect(()=>{
    const timer=setInterval(async()=>{
      try {if(selected){const {data}=await ticketAPI.getById(selected.RequestID);setSelected(data);}await load();}catch(e){setError(e.message);}
    },20000);
    return()=>clearInterval(timer);
  },[selected?.RequestID,load]);
  const view=async ticket=>{
    setError('');setBusy(true);
    try{const {data}=await ticketAPI.getById(ticket.RequestID);setSelected(data);setUpdate({progress:data.Progress || 0,response:''});}
    catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const openCreate=async()=>{
    setError('');setBusy(true);
    try{
      const [a,r]=await Promise.all([apartmentAPI.getAll('', '',1,999),resident?Promise.resolve({data:[]}):residentAPI.getAll('',1,999)]);
      setApartments(a.data || []);setResidents(r.data || []);setForm({title:'',description:'',apartmentId:'',residentId:''});setCreating(true);
    }catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const create=async e=>{
    e.preventDefault();setBusy(true);setError('');
    try{await ticketAPI.create({...form,apartmentId:Number(form.apartmentId),residentId:resident?undefined:Number(form.residentId)});setCreating(false);await load();flash?.('Đã gửi yêu cầu hỗ trợ');}
    catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const act=async(ticket,statusId,details={})=>{
    setBusy(true);setError('');
    try{
      await ticketAPI.update(ticket.RequestID,{statusId,...details});
      if(selected?.RequestID===ticket.RequestID){const {data}=await ticketAPI.getById(ticket.RequestID);setSelected(data);setUpdate({progress:data.Progress,response:''});}
      await load();flash?.('Đã cập nhật yêu cầu');
    }catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const removable = ticket => !resident && can('TICKET_DELETE') && can('TICKET_VIEW_ALL') && [1,4].includes(ticket.StatusID);
  const remove=async ticket=>{if(!confirm('Xóa yêu cầu này?'))return;setBusy(true);try{await ticketAPI.delete(ticket.RequestID);setSelected(null);await load();}catch(e){setError(e.message);}finally{setBusy(false);}};
  const allowed = ticket => canProcess && (can('TICKET_VIEW_ALL') || !ticket.AssignedEmployeeID || Number(ticket.AssignedUserID)===Number(user.userId));
  const badge=ticket=><Badge tone={ticket.StatusID===3?'green':ticket.StatusID===4?'red':'amber'}>{ticket.Status}</Badge>;
  return <div className="space-y-5">
    <Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">{resident?'Yêu cầu hỗ trợ của tôi':'Yêu cầu hỗ trợ'}</h3><p className="text-sm text-slate-500">Theo dõi người xử lý, tiến độ và phản hồi.</p></div>
      <div className="flex flex-wrap gap-2"><Input icon={Search} placeholder="Tìm yêu cầu…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
        <select className="rounded-xl border p-2" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">Tất cả trạng thái</option>{statuses.map(s=><option key={s.StatusID} value={s.StatusID}>{s.StatusName}</option>)}</select>
        {canCreate&&<Button onClick={openCreate} disabled={busy}><Plus size={16}/> Gửi yêu cầu</Button>}<Button variant="secondary" disabled={loading} onClick={load}><RefreshCw size={16}/> Làm mới</Button>
      </div></div></Card>
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
    {loading&&!tickets.length?<p>Đang tải…</p>:!tickets.length?<Card className="p-5">Không có yêu cầu phù hợp.</Card>:<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{tickets.map(ticket=><Card key={ticket.RequestID} className="space-y-3 p-5">
      {badge(ticket)}<h3 className="font-bold">{ticket.Title}</h3><p>{ticket.ApartmentCode} · {ticket.ResidentName}</p><p className="text-sm">Tạo lúc {formatDateTime(ticket.RequestDate)}</p>
      <p>Người xử lý: {ticket.AssignedEmployeeName || 'Chưa nhận'}</p><p>Tiến độ: {ticket.Progress || 0}%</p><progress className="w-full" value={ticket.Progress || 0} max="100"/>
      <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={()=>view(ticket)}>Xem chi tiết</Button>{allowed(ticket)&&ticket.StatusID===1&&<Button disabled={busy} onClick={()=>act(ticket,2)}>Nhận xử lý</Button>}</div>
    </Card>)}</div>}
    <div className="flex items-center justify-center gap-3"><Button variant="secondary" disabled={page<=1||loading} onClick={()=>setPage(page-1)}>Trước</Button><span>Trang {page}/{pages}</span><Button variant="secondary" disabled={page>=pages||loading} onClick={()=>setPage(page+1)}>Sau</Button></div>
    <Modal open={creating} title="Gửi yêu cầu hỗ trợ" onClose={()=>!busy&&setCreating(false)}>
      <form onSubmit={create} className="space-y-4">{error&&<p role="alert" className="text-red-600">{error}</p>}
        <label className="block">Tiêu đề<Input required maxLength={200} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
        <label className="block">Nội dung<textarea className="w-full rounded-xl border p-3" value={form.description} maxLength={10000} onChange={e=>setForm({...form,description:e.target.value})}/></label>
        <label className="block">Căn hộ<select required className="w-full rounded-xl border p-3" value={form.apartmentId} onChange={e=>setForm({...form,apartmentId:e.target.value})}><option value="">Chọn căn hộ</option>{apartments.map(a=><option key={a.ApartmentID} value={a.ApartmentID}>{a.ApartmentCode} · {a.BuildingName}</option>)}</select></label>
        {!resident&&<label className="block">Cư dân<select required className="w-full rounded-xl border p-3" value={form.residentId} onChange={e=>setForm({...form,residentId:e.target.value})}><option value="">Chọn cư dân</option>{residents.map(r=><option key={r.ResidentID} value={r.ResidentID}>{r.FullName} · {r.ApartmentCode}</option>)}</select></label>}
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={busy} onClick={()=>setCreating(false)}>Hủy</Button><Button type="submit" disabled={busy}>Gửi yêu cầu</Button></div>
      </form>
    </Modal>
    <Modal open={Boolean(selected)} title="Chi tiết yêu cầu" onClose={()=>!busy&&setSelected(null)} size="lg">
      {selected&&<div className="space-y-4">{error&&<p role="alert" className="text-red-600">{error}</p>}{badge(selected)}<h3 className="text-xl font-bold">{selected.Title}</h3><p className="whitespace-pre-wrap">{selected.Description}</p>
        <p>Căn {selected.ApartmentCode} · {selected.ResidentName}</p>{selected.EquipmentName && <p>Thiết bị: {selected.EquipmentName} (#{selected.ContractEquipmentID})</p>}<p>Người xử lý: {selected.AssignedEmployeeName || 'Chưa nhận'}</p><p>Tiến độ: {selected.Progress}%</p>
        <p>Tạo: {formatDateTime(selected.RequestDate)} · Cập nhật: {formatDateTime(selected.UpdatedAt)}{selected.CompletedAt&&` · Kết thúc: ${formatDateTime(selected.CompletedAt)}`}</p>
        <h4 className="font-bold">Lịch sử phản hồi</h4>{!selected.Updates?.length&&<p>Chưa có phản hồi.</p>}{selected.Updates?.map(item=><Card key={item.UpdateID} className="p-3"><p>{item.ActorName} · {formatDateTime(item.CreatedAt)} · {item.StatusName} · {item.Progress}%</p><p className="whitespace-pre-wrap">{item.Response}</p></Card>)}
        {allowed(selected)&&selected.StatusID===1&&<Button disabled={busy} onClick={()=>act(selected,2)}>Nhận xử lý</Button>}
        {allowed(selected)&&selected.StatusID===2&&<form className="space-y-3 rounded-xl border p-4" onSubmit={e=>{e.preventDefault();act(selected,2,update);}}>
          <label className="block">Tiến độ (%)<Input type="number" min={selected.Progress} max={99} required value={update.progress} onChange={e=>setUpdate({...update,progress:Number(e.target.value)})}/></label>
          <label className="block">Phản hồi<textarea className="w-full rounded-xl border p-3" maxLength={10000} value={update.response} onChange={e=>setUpdate({...update,response:e.target.value})}/></label>
          <div className="flex gap-2"><Button type="submit" disabled={busy}>Cập nhật tiến độ</Button><Button type="button" disabled={busy} onClick={()=>act(selected,3,{response:update.response})}>Hoàn tất</Button></div>
        </form>}
        <div className="flex justify-end gap-2">{allowed(selected)&&can('TICKET_VIEW_ALL')&&[1,2].includes(selected.StatusID)&&<Button variant="danger" disabled={busy} onClick={()=>{if(confirm('Hủy yêu cầu này?'))act(selected,4,{response:update.response});}}>Hủy yêu cầu</Button>}{removable(selected)&&<Button variant="danger" disabled={busy} onClick={()=>remove(selected)}>Xóa</Button>}<Button variant="secondary" disabled={busy} onClick={()=>setSelected(null)}>Đóng</Button></div>
      </div>}
    </Modal>
  </div>;
}
