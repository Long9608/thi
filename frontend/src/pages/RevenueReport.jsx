import React, { useCallback, useEffect, useState } from 'react';
import { DollarSign, CreditCard, FileText, TrendingUp, Download, RefreshCw } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { dashboardAPI } from '../api';
import { Card, Button, StatCard } from '../components/UI';
import { money, formatDateTime } from '../utils/formatters';
import { exportWorkbook } from '../utils/reportExport';
const colors=['#635bff','#06b6d4','#f59e0b','#3b82f6'];
export default function RevenueReport() {
  const [year,setYear]=useState(new Date().getFullYear()),[month,setMonth]=useState(new Date().getMonth()+1),[quarter,setQuarter]=useState(Math.ceil((new Date().getMonth()+1)/3));
  const [period,setPeriod]=useState('year'),[view,setView]=useState('chart'),[data,setData]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const load=useCallback(async()=>{setLoading(true);setError('');try{setData((await dashboardAPI.getRevenue({year,month,quarter,period})).data);}catch(e){setError(e.message);setData(null);}finally{setLoading(false);}},[year,month,quarter,period]);
  useEffect(()=>{load();},[load]);
  const summary=data?.summary || {},payments=data?.payments || [],trend=data?.trend || [];
  const years=[...new Set([new Date().getFullYear(),year,...(data?.availableYears || [])])].sort((a,b)=>b-a);
  const rows=payments.map(p=>({'Mã giao dịch':p.TransactionCode || '', 'Mã thanh toán':p.PaymentID,'Mã hóa đơn':p.InvoiceID,'Căn hộ':p.ApartmentCode,'Ngày thanh toán':new Date(p.PaymentDate),'Số tiền':Number(p.Amount),'Phương thức':p.MethodName}));
  const exportCsv=()=>{
    const keys=Object.keys(rows[0]||{}),escape=v=>'"'+String(v instanceof Date?v.toISOString():v??'').replaceAll('"','""')+'"';
    const blob=new Blob(['\uFEFF'+[keys.map(escape).join(','),...rows.map(r=>keys.map(k=>escape(r[k])).join(','))].join('\r\n')],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`doanh-thu-${year}-${period}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  return <div className="space-y-5"><Card className="flex flex-wrap items-center justify-between gap-3 p-5"><div><h3 className="font-bold">Báo cáo doanh thu</h3><p className="text-sm text-slate-500">Khoản thanh toán thành công theo ngày thu tiền.</p></div><div className="flex flex-wrap gap-2">
    <select aria-label="Kỳ báo cáo" className="rounded-xl border p-2" value={period} onChange={e=>setPeriod(e.target.value)}><option value="month">Theo tháng</option><option value="quarter">Theo quý</option><option value="year">Theo năm</option></select>
    <select aria-label="Năm báo cáo" className="rounded-xl border p-2" value={year} onChange={e=>setYear(Number(e.target.value))}>{years.map(y=><option key={y}>{y}</option>)}</select>
    {period==='month'&&<select aria-label="Tháng báo cáo" className="rounded-xl border p-2" value={month} onChange={e=>setMonth(Number(e.target.value))}>{Array.from({length:12},(_,i)=><option key={i} value={i+1}>Tháng {i+1}</option>)}</select>}
    {period==='quarter'&&<select aria-label="Quý báo cáo" className="rounded-xl border p-2" value={quarter} onChange={e=>setQuarter(Number(e.target.value))}>{[1,2,3,4].map(q=><option key={q} value={q}>Quý {q}</option>)}</select>}
    <Button variant="secondary" disabled={loading} onClick={load}><RefreshCw size={16}/> Làm mới</Button><Button disabled={!payments.length||loading} onClick={()=>exportWorkbook(rows,`doanh-thu-${year}-${period}.xlsx`,'Doanh thu')}><Download size={16}/> Xuất Excel</Button><Button variant="secondary" disabled={!payments.length||loading} onClick={exportCsv}>Xuất CSV</Button>
  </div></Card>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
  <div className="grid gap-4 md:grid-cols-4"><StatCard icon={DollarSign} label="Tổng doanh thu" value={money(summary.total)} hint="Trong kỳ đã chọn"/><StatCard icon={TrendingUp} label="Thu từ hóa đơn đã tất toán" value={money(summary.paidInvoiceRevenue)} hint="Khoản thu trong kỳ"/><StatCard icon={CreditCard} label="Giao dịch thành công" value={summary.paymentCount||0}/><StatCard icon={FileText} label="Hóa đơn có khoản thu" value={summary.invoiceCount||0}/></div>
  {loading?<Card className="p-8 text-center">Đang tải báo cáo…</Card>:!payments.length?<Card className="p-10 text-center">Chưa có dữ liệu doanh thu trong kỳ này.</Card>:<>
    <Card className="p-6"><div className="mb-4 flex items-center justify-between"><h4 className="font-bold">Doanh thu theo thời gian</h4><div className="flex gap-2"><Button variant="secondary" onClick={()=>setView('chart')}>Biểu đồ</Button><Button variant="secondary" onClick={()=>setView('table')}>Bảng</Button></div></div>
      {view==='chart'?<div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={trend}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="period"/><YAxis/><Tooltip formatter={money}/><Bar dataKey="total" name="Doanh thu thực thu" fill="#635bff" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>:<table className="w-full text-left text-sm"><thead><tr><th>Thời gian</th><th>Doanh thu</th></tr></thead><tbody>{trend.map(t=><tr key={t.period}><td className="py-2">{t.period}</td><td>{money(t.total)}</td></tr>)}</tbody></table>}
    </Card>
    <div className="grid gap-4 md:grid-cols-2"><Card className="p-6"><h4 className="font-bold">Doanh thu theo phương thức thanh toán</h4><div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.byMethod} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85}>{data.byMethod.map((m,i)=><Cell key={m.name} fill={colors[i%colors.length]}/>)}</Pie><Tooltip formatter={money}/><Legend/></PieChart></ResponsiveContainer></div></Card><Card className="space-y-3 p-6"><h4 className="font-bold">Chi tiết kỳ báo cáo</h4><p>{period==='year'?`Năm ${year}`:period==='quarter'?`Quý ${quarter}/${year}`:`Tháng ${month}/${year}`}</p><p>Tổng thu: <strong>{money(summary.total)}</strong></p><p>Thu từ hóa đơn đã tất toán: {money(summary.paidInvoiceRevenue)}</p><p>Thu từ hóa đơn còn thanh toán một phần: {money(Number(summary.total)-Number(summary.paidInvoiceRevenue))}</p></Card></div>
    <Card className="overflow-x-auto p-5"><h4 className="mb-3 font-bold">Các khoản thanh toán</h4><table className="w-full min-w-[650px] text-left text-sm"><thead><tr><th>Ngày thu</th><th>Căn hộ</th><th>Hóa đơn</th><th>Phương thức</th><th>Số tiền</th></tr></thead><tbody>{payments.map(p=><tr key={p.PaymentID} className="border-t"><td className="py-3">{formatDateTime(p.PaymentDate)}</td><td>{p.ApartmentCode}</td><td>#{p.InvoiceID} · {p.InvoiceMonth}/{p.InvoiceYear}</td><td>{p.MethodName}</td><td>{money(p.Amount)}</td></tr>)}</tbody></table></Card>
  </>}
  </div>;
}
