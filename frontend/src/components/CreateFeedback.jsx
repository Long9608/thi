import React, { useState } from 'react';
import { feedbackAPI } from '../api';
import { Modal, Button, Input } from './UI';
export default function CreateFeedback({ onCreated }) {
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [form,setForm]=useState({title:'',content:'',rating:5});
  const submit=async e=>{e.preventDefault();setBusy(true);setError('');try{await feedbackAPI.create(form);setOpen(false);setForm({title:'',content:'',rating:5});await onCreated();}catch(e){setError(e.message);}finally{setBusy(false);}};
  return <><Button onClick={()=>setOpen(true)}>Gửi phản ánh</Button><Modal open={open} title="Gửi phản ánh" onClose={()=>!busy&&setOpen(false)}><form onSubmit={submit} className="space-y-4">
    {error&&<p role="alert" className="text-red-600">{error}</p>}<label className="block">Tiêu đề<Input required maxLength={200} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
    <label className="block">Nội dung<textarea required maxLength={10000} className="w-full rounded-xl border p-3" value={form.content} onChange={e=>setForm({...form,content:e.target.value})}/></label>
    <label className="block">Đánh giá<select className="w-full rounded-xl border p-3" value={form.rating} onChange={e=>setForm({...form,rating:Number(e.target.value)})}>{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} sao</option>)}</select></label>
    <div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={busy} onClick={()=>setOpen(false)}>Hủy</Button><Button type="submit" disabled={busy}>Gửi</Button></div>
  </form></Modal></>;
}
