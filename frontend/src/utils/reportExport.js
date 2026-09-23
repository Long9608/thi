import * as XLSX from 'xlsx';

export function debtExportRows(invoices) {
  return invoices.map(i => ({
    'Căn hộ': i.ApartmentCode || '', 'Cư dân': i.OwnerName || '', 'Mã hóa đơn': i.InvoiceID,
    'Kỳ hóa đơn': `${i.InvoiceMonth}/${i.InvoiceYear}`, 'Tổng tiền': Number(i.TotalAmount)||0,
    'Đã thanh toán': Number(i.PaidAmount)||0, 'Còn nợ': Math.max(0,Number(i.TotalAmount)-Number(i.PaidAmount||0)),
    'Trạng thái': i.InvoiceStatus || (i.StatusID===3?'Quá hạn':'Chưa thanh toán'),
    'Ngày đến hạn': i.DueDate ? new Date(i.DueDate) : null,
  }));
}
export function createWorkbook(rows,sheetName='Báo cáo') {
  const sheet=XLSX.utils.json_to_sheet(rows,{cellDates:true,dateNF:'dd/mm/yyyy'});
  sheet['!cols']=Object.keys(rows[0]||{}).map(()=>({wch:22}));
  for(const [key,cell] of Object.entries(sheet)) if(!key.startsWith('!')&&cell.t==='n') cell.z='#,##0.##';
  const workbook=XLSX.utils.book_new();XLSX.utils.book_append_sheet(workbook,sheet,sheetName);return workbook;
}
export function exportWorkbook(rows,filename,sheetName){XLSX.writeFile(createWorkbook(rows,sheetName),filename);}
