import React,{useEffect,useState} from 'react';
import {aiAPI} from '../api';
import {Card} from '../components/UI';
const labels={FullName:'Họ tên',Status:'Trạng thái',PlateNumber:'Biển số',EquipmentStatus:'Tình trạng thiết bị',Location:'Vị trí',Price:'Giá',Reply:'Phản hồi',Content:'Nội dung',ExpiredDate:'Ngày hết hạn',RegisterDate:'Ngày đăng ký',EndDate:'Ngày kết thúc',CreatedDate:'Ngày tạo',Area:'Diện tích',IsOccupied:'Đã sử dụng',ApartmentCode:'Mã căn hộ',ServiceName:'Dịch vụ',EquipmentName:'Tên thiết bị'};
export default function AIRecord({deepLink}){
  const [record,setRecord]=useState(null),[error,setError]=useState('');
  useEffect(()=>{let active=true;setRecord(null);setError('');
    if(!deepLink?.entityType||!deepLink?.recordId){setError('Chọn bản ghi từ kết quả tìm kiếm hoặc chat.');return;}
    aiAPI.getRecord(deepLink.entityType,deepLink.recordId).then(r=>{if(active)setRecord(r.data);}).catch(e=>{if(active)setError(e.message);});
    return()=>{active=false;};
  },[deepLink?.entityType,deepLink?.recordId]);
  return <Card className="p-6 space-y-3">{error?<p role="alert">{error}</p>:!record?<p>Đang tải…</p>:<><h2 className="text-xl font-bold">{record.title}</h2><p>{record.subtitle}</p><dl className="grid grid-cols-2 gap-3">{Object.entries(record.data).map(([key,value])=><React.Fragment key={key}><dt>{labels[key]||key}</dt><dd>{value===null?'—':typeof value==='boolean'?(value?'Có':'Không'):String(value)}</dd></React.Fragment>)}</dl></>}</Card>;
}
