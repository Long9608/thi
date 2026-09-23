import React, { useCallback, useEffect, useState } from 'react';
import { apartmentAPI } from '../api';
import { createPermissionChecker } from '../permissions';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
export default function EquipmentManagement() {
  const { can } = createPermissionChecker(JSON.parse(localStorage.getItem('user') || '{}'));
  const [rows,setRows]=useState([]),[search,setSearch]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [selected,setSelected]=useState(null),[editing,setEditing]=useState(false),[form,setForm]=useState({status:'operational',conditionDescription:''});
  const labels={operational:'Hoạt động',maintenance:'Đang bảo trì',broken:'Hỏng',retired:'Ngừng sử dụng'};
  const load=useCallback(async()=>{setBusy(true);try{setRows((await apartmentAPI.getEquipment(search)).data || []);}catch(e){setError(e.message);}finally{setBusy(false);}},[search]);
  useEffect(()=>{const timer=setTimeout(load,200);return()=>clearTimeout(timer);},[load]);
  const open=(item,edit=false)=>{setSelected(item);setEditing(edit);setForm({status:item.EquipmentStatus,conditionDescription:item.ConditionDescription || ''});setError('');};
  const save=async e=>{e.preventDefault();setBusy(true);try{await apartmentAPI.updateEquipment(selected.ContractEquipmentID,form);setSelected(null);await load();}catch(e){setError(e.message);}finally{setBusy(false);}};
  return <div className="space-y-5"><Card className="flex flex-wrap items-center justify-between gap-3 p-5"><h3 className="font-bold">Thiết bị bàn giao tại căn hộ đang sử dụng</h3><Input placeholder="Tìm thiết bị hoặc căn hộ…" value={search} onChange={e=>setSearch(e.target.value)}/><Button variant="secondary" disabled={busy} onClick={load}>Làm mới</Button></Card>
    {error&&<p role="alert" className="text-red-600">{error}</p>}{!rows.length&&!busy&&<Card className="p-5">Chưa có thiết bị phù hợp.</Card>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map(item=><Card key={item.ContractEquipmentID} className="space-y-3 p-5"><Badge>{labels[item.EquipmentStatus] || item.EquipmentStatus}</Badge><h3 className="font-bold">{item.EquipmentName}</h3><p>Căn {item.ApartmentCode} · {item.ContractNumber}</p><p>Số lượng: {item.Quantity} · {item.Location}</p><div className="flex gap-2"><Button variant="secondary" onClick={()=>open(item)}>Xem</Button>{can('EQUIPMENT_UPDATE')&&<Button onClick={()=>open(item,true)}>Sửa</Button>}</div></Card>)}</div>
    <Modal open={Boolean(selected)} title={editing?'Cập nhật thiết bị':'Chi tiết thiết bị'} onClose={()=>!busy&&setSelected(null)}>{selected&&<div className="space-y-3">{error&&<p role="alert" className="text-red-600">{error}</p>}<h3 className="font-bold">{selected.EquipmentName}</h3><p>Căn {selected.ApartmentCode} · {selected.Brand} {selected.Model}</p><p>{selected.Specifications}</p>
      {editing?<form onSubmit={save} className="space-y-3"><label className="block">Trạng thái<select className="w-full rounded-xl border p-3" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{Object.entries(labels).map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label><label className="block">Tình trạng<textarea className="w-full rounded-xl border p-3" maxLength={500} value={form.conditionDescription} onChange={e=>setForm({...form,conditionDescription:e.target.value})}/></label><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={()=>setSelected(null)} disabled={busy}>Hủy</Button><Button type="submit" disabled={busy}>Lưu</Button></div></form>:<><p>{labels[selected.EquipmentStatus]}</p><p>{selected.ConditionDescription}</p><Button variant="secondary" onClick={()=>setSelected(null)}>Đóng</Button></>}
    </div>}</Modal>
  </div>;
}
