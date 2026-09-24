import React,{useEffect,useState} from 'react';
import {aiAPI} from '../api';
import {Card,Button} from '../components/UI';
import {BarChart,Bar,ResponsiveContainer,XAxis,YAxis,Tooltip,Legend} from 'recharts';
const labels={activeResidents:'Cư dân hoạt động',totalApartments:'Tổng căn hộ',occupiedApartments:'Căn đang thuê',vacantApartments:'Căn trống',occupancyRate:'Tỷ lệ lấp đầy (%)',activeContracts:'Hợp đồng hoạt động',expiring30:'Hợp đồng hết hạn trong 30 ngày',expiring60:'Hết hạn trong 60 ngày',expiring90:'Hết hạn trong 90 ngày',currentMonthInvoices:'Hóa đơn tháng này',currentMonthBilled:'Giá trị hóa đơn tháng này',totalBilled:'Tổng giá trị hóa đơn',currentMonthCollected:'Tiền thực thu tháng này',collected:'Tổng tiền thực thu',outstanding:'Công nợ còn lại',overdueInvoices:'Hóa đơn quá hạn',overdueAmount:'Công nợ quá hạn',collectionRate:'Tỷ lệ thu hóa đơn tháng (%)',activeVehicles:'Xe hoạt động',activeParkingCards:'Thẻ xe hoạt động',parkingSlots:'Tổng chỗ đậu',occupiedParkingSlots:'Chỗ đậu đã sử dụng',maintenanceNew:'Yêu cầu bảo trì mới',maintenanceInProgress:'Bảo trì đang xử lý',maintenanceOverdue:'Bảo trì quá hạn',maintenanceWithoutDeadline:'Bảo trì chưa có hạn xử lý',averageMaintenanceHours:'Giờ xử lý bảo trì trung bình',activeServiceRegistrations:'Đăng ký dịch vụ hoạt động',feedbackCount:'Phản ánh',unansweredFeedback:'Phản ánh chưa trả lời'};
const currency=new Set(['currentMonthBilled','totalBilled','currentMonthCollected','collected','outstanding','overdueAmount']);
const number=v=>Number(v||0).toLocaleString('vi-VN',{maximumFractionDigits:2});
export default function AIStatistics(){
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const load=async()=>{setBusy(true);setError('');try{setData((await aiAPI.getStatisticsDashboard()).data);}catch(e){setError(e.message);}finally{setBusy(false);}};
 useEffect(()=>{load();},[]);
 const trend=(data?.billingTrend||[]).map(r=>({...r,period:`${r.month}/${r.year}`}));
 return <div className="space-y-5"><Card className="p-5"><h2 className="text-xl font-bold">Thống kê dữ liệu vận hành</h2><p>Phân tích theo quy tắc từ dữ liệu thật trong phạm vi quyền của bạn.</p><Button disabled={busy} onClick={load}>{busy?'Đang tải…':'Làm mới'}</Button></Card>
  {error&&<p role="alert" className="text-red-600">{error}</p>}
  <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">{Object.entries(data?.overview||{}).filter(([key])=>labels[key]).map(([key,value])=><Card className="p-4" key={key}><p>{labels[key]}</p><strong className="text-2xl">{value===null?'Chưa đủ dữ liệu':number(value)+(currency.has(key)?' đ':'')}</strong></Card>)}</div>
  {trend.length>0&&<><Card className="p-5"><h3 className="font-bold">Giá trị hóa đơn và tiền thực thu — 6 tháng</h3><p className="text-sm">Tiền thực thu tính theo ngày thanh toán thành công. Tháng hiện tại chưa kết thúc.</p><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={trend}><XAxis dataKey="period"/><YAxis/><Tooltip formatter={number}/><Legend/><Bar dataKey="totalBilled" name="Giá trị hóa đơn" fill="#94a3b8"/><Bar dataKey="collected" name="Tiền thực thu" fill="#635bff"/></BarChart></ResponsiveContainer></div></Card>
  <Card className="p-5"><p>{data.billingInsight?.insight}</p>{data.billingInsight?.changePercent!=null&&<p>Thay đổi: {number(data.billingInsight.changePercent)}%</p>}<p>Tỷ lệ thu hóa đơn tháng = tiền đã trả cho hóa đơn tháng / giá trị hóa đơn tháng. Công nợ loại hóa đơn nháp và đã hủy; chỉ trừ thanh toán thành công.</p></Card></>}
 </div>;
}
