import React, { useEffect, useState } from 'react';
import { Home, RefreshCw } from 'lucide-react';
import { apartmentAPI, ticketAPI } from '../api';
import { Card, Button, Modal, Input } from './UI';
import { createPermissionChecker } from '../permissions';
import { formatDate } from '../utils/formatters';

export default function MyApartments({onNavigate}) {
  const {can}=createPermissionChecker(JSON.parse(localStorage.getItem('user')||'{}'));
  const [view,setView]=useState('detail'),[equipment,setEquipment]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [form,setForm]=useState({title:'',description:''});
  const [apartments, setApartments] = useState([]);
  const [pendingEquipmentIds, setPendingEquipmentIds] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = [];
        let page = 1, totalPages = 1;
        do {
          const result = await apartmentAPI.getAll('', '', page, 100);
          rows.push(...(result.data || []));
          totalPages = result.pagination?.totalPages || 1;
          page += 1;
        } while (page <= totalPages && active);
        if (active) setApartments(rows);
      } catch (err) { if (active) setError(err.message); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);
  const open = async (id,mode='detail') => {
    setError('');
    setMessage('');setView(mode);setEquipment(null);
    try {
      const [apartmentResult, ticketResult] = await Promise.all([
        apartmentAPI.getById(id),
        ticketAPI.getAll('', 1, 999)
      ]);
      setSelected(apartmentResult.data);
      setPendingEquipmentIds((ticketResult.data || [])
        .filter(ticket => Number(ticket.ApartmentID) === Number(id) && [1, 2].includes(Number(ticket.StatusID)) && ticket.ContractEquipmentID)
        .map(ticket => Number(ticket.ContractEquipmentID)));
    }
    catch (err) { setError(err.message); }
  };
  const report=async event=>{event.preventDefault();setBusy(true);setError('');try{
    await ticketAPI.create({apartmentId:selected.ApartmentID,equipmentId:equipment.EquipmentID,title:form.title,description:form.description});
    setPendingEquipmentIds(ids => ids.includes(Number(equipment.EquipmentID)) ? ids : [...ids, Number(equipment.EquipmentID)]);
    setEquipment(null);setMessage('Đã gửi yêu cầu. Bạn có thể theo dõi tại Yêu cầu hỗ trợ.');
  }catch(err){setError(err.message);}finally{setBusy(false);}};
  return <div className="space-y-5">
    <h2 className="text-xl font-bold text-slate-900">Căn hộ của tôi</h2>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {loading ? <RefreshCw className="animate-spin" /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {apartments.map(a => <Card key={a.ApartmentID} className="space-y-3 p-5">
        <Home className="text-[#1f4f46]" /><h3 className="text-lg font-bold">{a.ApartmentCode}</h3>
        <p>{a.BuildingName} · Tầng {a.FloorNumber}</p>
        <p>Diện tích: {Number(a.Area).toLocaleString('vi-VN')} m²</p><p>{a.Status}</p>
        <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => open(a.ApartmentID)}>Xem chi tiết</Button><Button variant="secondary" onClick={() => open(a.ApartmentID,'equipment')}>Xem thiết bị</Button></div>
      </Card>)}
    </div>}
    {!loading && !error && !apartments.length && <Card className="p-5">Bạn chưa có căn hộ đang liên kết hợp lệ.</Card>}
    <Modal open={Boolean(selected)} onClose={() => !busy&&setSelected(null)} title={`${equipment?'Báo hỏng / Bảo trì':view==='equipment'?'Thiết bị':'Căn hộ'} ${selected?.ApartmentCode || ''}`}>
      {error&&<p role="alert" className="text-red-600">{error}</p>}
      {message&&<p role="status" className="text-emerald-700">{message}{onNavigate&&<Button variant="secondary" onClick={()=>onNavigate('tickets')}>Theo dõi yêu cầu</Button>}</p>}
      {selected&&view==='equipment'&&!equipment&&<div className="space-y-4">{selected.Equipment?.length?selected.Equipment.map(item=><Card key={item.EquipmentID} className="space-y-2 p-4">
        <h3 className="font-bold">{item.Name}</h3><p>Loại: {item.Category || 'Chưa cập nhật'} · Mã bàn giao: #{item.EquipmentID}</p><p>{item.Brand} {item.Model} · {item.Location}</p><p>Số lượng: {item.Quantity}</p>
        <p>Tình trạng: {({operational:'Đang sử dụng',maintenance:'Đang bảo trì',broken:'Hỏng',retired:'Ngừng sử dụng'})[item.Status] || item.Status || 'Chưa cập nhật'}</p>
        <p>Ngày ghi nhận: {formatDate(item.CreatedDate)}</p><p>{item.Specifications}</p><p>Ghi chú: {item.ConditionDescription || 'Không có'}</p>
        {can('TICKET_CREATE')&&<Button disabled={pendingEquipmentIds.includes(Number(item.EquipmentID))} className={pendingEquipmentIds.includes(Number(item.EquipmentID)) ? 'opacity-50' : ''} onClick={()=>{setEquipment(item);setMessage('');setForm({title:`Báo hỏng: ${item.Name}`,description:''});}}>{pendingEquipmentIds.includes(Number(item.EquipmentID)) ? 'Chờ bảo trì' : 'Báo hỏng / Bảo trì'}</Button>}
      </Card>):<p>Chưa có thiết bị bàn giao cho căn hộ này.</p>}<Button variant="secondary" onClick={()=>setSelected(null)}>Đóng</Button></div>}
      {equipment&&<form onSubmit={report} className="space-y-4"><p>Căn {selected.ApartmentCode} · {equipment.Name} · #{equipment.EquipmentID}</p><label className="block">Tiêu đề<Input required maxLength={200} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label className="block">Mô tả sự cố<textarea className="w-full rounded-xl border p-3" required maxLength={10000} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={busy} onClick={()=>setEquipment(null)}>Hủy</Button><Button type="submit" disabled={busy}>Gửi yêu cầu</Button></div></form>}
      {selected && view==='detail' && <div className="space-y-3">
        <p>{selected.BuildingName} · Tầng {selected.FloorNumber} · {selected.AreaName}</p>
        <p>{selected.AreaAddress}</p><p>Diện tích: {Number(selected.Area).toLocaleString('vi-VN')} m² · {selected.Status}</p>
        {selected.CurrentContract && <Card className="space-y-2 p-4"><p>Hợp đồng: {selected.CurrentContract.ContractNumber}</p><p>Chủ hộ: {selected.CurrentContract.OwnerName}</p><p>Giá thuê: {Number(selected.CurrentContract.Rent).toLocaleString('vi-VN')} đ</p></Card>}
        {(selected.CurrentResidents || []).map(r => <p key={r.ResidentID}>{r.FullName} · {r.Relationship}</p>)}
        <h3 className="font-bold">Thiết bị</h3>
        {selected.Equipment?.length ? selected.Equipment.map(item => <Card key={item.EquipmentID} className="p-3"><p className="font-semibold">{item.Name} · Số lượng: {item.Quantity}</p><p>{item.Brand} {item.Model} · {item.Location}</p><p>{item.ConditionDescription || item.Status}</p></Card>) : <p>Chưa có thiết bị bàn giao cho căn hộ này.</p>}
        <h3 className="font-bold">Dịch vụ</h3>
        {selected.Services?.length ? selected.Services.map(item => <p key={item.RegistrationID}>{item.ServiceName} · {item.Status ? 'Đang đăng ký' : 'Đã kết thúc'}</p>) : <p>Chưa đăng ký dịch vụ.</p>}
        <Button variant="secondary" onClick={()=>setSelected(null)}>Đóng</Button>
      </div>}
    </Modal>
  </div>;
}
