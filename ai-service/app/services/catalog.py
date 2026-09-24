"""Read-only domain tools. SQL identifiers are constants, never client input."""
SUCCESS_PAYMENT_STATUS_ID = 2  # billingService.SUCCESS_PAYMENT_STATUS_ID
PAID = '(SELECT ISNULL(SUM(p.Amount),0) FROM Payment p WHERE p.InvoiceID=i.InvoiceID AND p.StatusID=2)'
CONTRACT = ' JOIN Contract c ON c.ContractID=i.ContractID JOIN Apartment a ON a.ApartmentID=c.ApartmentID'
def spec(module,kind,source,id,title,subtitle,page,param,data,search):
    return dict(module=module,kind=kind,source=source,id=id,title=title,subtitle=subtitle,page=page,param=param,data=data,search=search)
CATALOG = {
 'RESIDENT':spec('RESIDENT','resident','Resident r','r.ResidentID','r.FullName','r.Phone','residents','residentId','r.ResidentID,r.FullName,r.Status',['r.FullName','r.Phone','r.Email']),
 'APARTMENT':spec('APARTMENT','apartment','Apartment a','a.ApartmentID','a.ApartmentCode',"N'Căn hộ'",'buildings','apartmentId','a.ApartmentID,a.ApartmentCode,a.StatusID,a.Area',['a.ApartmentCode']),
 'CONTRACT':spec('CONTRACT','contract','Contract c JOIN Apartment a ON a.ApartmentID=c.ApartmentID','c.ContractID','c.ContractNumber','a.ApartmentCode','contract-list','contractId','c.ContractID,c.StartDate,c.EndDate,c.StatusID,c.Rent,a.ApartmentCode',['c.ContractNumber','a.ApartmentCode']),
 'INVOICE':spec('INVOICE','contract','Invoice i'+CONTRACT,'i.InvoiceID',"CONCAT(N'Hóa đơn #',i.InvoiceID)",'a.ApartmentCode','fees','invoiceId',f'i.InvoiceID,i.DueDate,i.TotalAmount,i.StatusID,i.WorkflowStatus,{PAID} PaidAmount,i.TotalAmount-{PAID} RemainingAmount,a.ApartmentCode',['CONVERT(nvarchar(30),i.InvoiceID)','a.ApartmentCode','c.ContractNumber']),
 'PAYMENT':spec('INVOICE','contract','Payment pay JOIN Invoice i ON i.InvoiceID=pay.InvoiceID'+CONTRACT,'pay.PaymentID',"CONCAT(N'Thanh toán #',pay.PaymentID)",'a.ApartmentCode','fees','invoiceId','pay.PaymentID,pay.InvoiceID,pay.Amount,pay.PaymentDate,pay.StatusID',['pay.TransactionCode','CONVERT(nvarchar(30),pay.PaymentID)','a.ApartmentCode']),
 'VEHICLE':spec('VEHICLE','vehicle','Vehicle v JOIN Resident r ON r.ResidentID=v.ResidentID','v.VehicleID','v.PlateNumber','r.FullName','vehicles','vehicleId','v.VehicleID,v.PlateNumber,v.Status',['v.PlateNumber','r.FullName']),
 'PARKING_CARD':spec('PARKING','vehicle','ParkingCard pc JOIN Vehicle v ON v.VehicleID=pc.VehicleID','pc.CardID','pc.CardCode','v.PlateNumber','vehicle-cards','cardId','pc.CardID,pc.ExpiredDate,pc.Status,v.PlateNumber',['pc.CardCode','v.PlateNumber']),
 'PARKING_SLOT':spec('PARKING','slot','ParkingSlot ps','ps.SlotID','ps.SlotNumber',"N'Chỗ đậu xe'",'parking-lot','slotId','ps.SlotID,ps.IsOccupied',['ps.SlotNumber']),
 'EQUIPMENT':spec('APARTMENT','contract','ContractEquipment ce JOIN Contract c ON c.ContractID=ce.ContractID','ce.ContractEquipmentID','ce.EquipmentName','ce.EquipmentStatus','contract-list','contractId','ce.ContractEquipmentID,ce.ContractID,ce.EquipmentStatus,ce.Location',['ce.EquipmentName','ce.Category','ce.Brand']),
 'MAINTENANCE':spec('TICKET','ticket','MaintenanceRequest mr','mr.RequestID','mr.Title',"N'Yêu cầu bảo trì'",'tickets','requestId','mr.RequestID,mr.StatusID,mr.Progress,mr.RequestDate,mr.CompletedAt,mr.DueDate',['mr.Title','mr.Description','CONVERT(nvarchar(30),mr.RequestID)']),
 'SERVICE':spec('SERVICE','service','Service s','s.ServiceID','s.ServiceName','s.Unit','register-service','serviceId','s.ServiceID,s.Price,s.Status',['s.ServiceName']),
 'SERVICE_REGISTRATION':spec('SERVICE','contract','ServiceRegistration sr JOIN Service s ON s.ServiceID=sr.ServiceID JOIN Contract c ON c.ContractID=sr.ContractID','sr.RegistrationID','s.ServiceName','c.ContractNumber','register-service','registrationId','sr.RegistrationID,sr.ServiceID,sr.ContractID,sr.RegisterDate,sr.EndDate,sr.Status',['s.ServiceName','c.ContractNumber']),
 'FEEDBACK':spec('FEEDBACK','feedback','Feedback f','f.FeedbackID','f.Title',"N'Phản ánh'",'feedbacks','feedbackId','f.FeedbackID,f.Rating,f.Reply,f.CreatedDate',['f.Title','f.Content']),
 'NOTIFICATION':spec('NOTIFICATION','notification','Notification n','n.NotificationID','n.Title',"N'Thông báo'",'notifications','notificationId','n.NotificationID,n.Content,n.CreatedDate',['n.Title','n.Content'])
}
