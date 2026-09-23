const { getAccessScope, apartmentOwnershipSql, contractOwnershipSql, isResidentAccount } = require('../utils/accessScope');

async function dashboardPool(req) {
    const pool = await getPool();
    const resident = await pool.request().input('ScopeUserID', sql.Int, req.user.UserID)
        .query('SELECT ResidentID FROM Resident WHERE UserID=@ScopeUserID AND Status=1');
    const residentId = resident.recordset.length === 1 ? resident.recordset[0].ResidentID : null;
    if (isResidentAccount(req) && !residentId) throw Object.assign(new Error('Tài khoản chưa liên kết hồ sơ cư dân đang hoạt động.'), { statusCode: 403 });
    const predicate = (module, own) => {
        const scope = getAccessScope(req, { viewAll: `${module}_VIEW_ALL`, viewOwn: `${module}_VIEW_OWN` });
        if (scope === 'all') return '1=1';
        return scope === 'own' && (residentId || module === 'NOTIFICATION') ? own : '1=0';
    };
    const sources = {
        Apartment: `SELECT scope_a.* FROM Apartment scope_a WHERE ${predicate('APARTMENT', apartmentOwnershipSql('scope_a.ApartmentID'))}`,
        Contract: `SELECT scope_c.* FROM Contract scope_c WHERE ${predicate('CONTRACT', contractOwnershipSql('scope_c'))}`,
        Invoice: `SELECT scope_i.* FROM Invoice scope_i JOIN Contract scope_c ON scope_c.ContractID=scope_i.ContractID WHERE ${predicate('INVOICE', contractOwnershipSql('scope_c'))}`,
        Resident: `SELECT scope_r.* FROM Resident scope_r WHERE ${predicate('RESIDENT', 'scope_r.ResidentID=@CurrentResidentID')}`,
        MaintenanceRequest: `SELECT scope_m.* FROM MaintenanceRequest scope_m WHERE ${predicate('TICKET', 'scope_m.ResidentID=@CurrentResidentID')}`,
        Notification: `SELECT scope_n.* FROM Notification scope_n WHERE ${predicate('NOTIFICATION', 'EXISTS (SELECT 1 FROM NotificationReceiver nr WHERE nr.NotificationID=scope_n.NotificationID AND nr.UserID=@ScopeUserID)')}`
    };
    if (!isResidentAccount(req) && getAccessScope(req, {viewAll:'TICKET_VIEW_ALL',viewOwn:'TICKET_VIEW_OWN'})==='own') {
        sources.MaintenanceRequest = `SELECT scope_m.* FROM MaintenanceRequest scope_m WHERE EXISTS(SELECT 1 FROM Employee e WHERE e.UserID=@ScopeUserID AND e.Status=1 AND (scope_m.AssignedEmployeeID=e.EmployeeID OR (scope_m.AssignedEmployeeID IS NULL AND scope_m.StatusID=1)))`;
    }
    sources.Vehicle = `SELECT v.* FROM Vehicle v WHERE ${predicate('VEHICLE', 'v.ResidentID=@CurrentResidentID')}`;
    sources.Feedback = `SELECT f.* FROM Feedback f WHERE ${predicate('FEEDBACK', 'f.ResidentID=@CurrentResidentID')}`;
    return { pool, residentId, sources };
}
const { getPool, sql } = require('../config/db');

exports.getRevenueReport = async(req,res,next) => {
    try {
        const year=Number(req.query.year || new Date().getFullYear()),period=req.query.period || 'year';
        const month=Number(req.query.month || new Date().getMonth()+1),quarter=Number(req.query.quarter || Math.ceil(month/3));
        if(!Number.isInteger(year)||year<1900||year>9998||!['month','quarter','year'].includes(period)||!Number.isInteger(month)||month<1||month>12||!Number.isInteger(quarter)||quarter<1||quarter>4) return res.status(400).json({success:false,message:'Kỳ báo cáo không hợp lệ'});
        const startMonth=period==='month'?month:period==='quarter'?(quarter-1)*3+1:1;
        const months=period==='month'?1:period==='quarter'?3:12;
        const pool=await getPool();
        const result=await pool.request().input('Year',sql.Int,year).input('Month',sql.Int,startMonth).input('Months',sql.Int,months)
            .query(`DECLARE @Start date=DATEFROMPARTS(@Year,@Month,1),@End date=DATEADD(month,@Months,DATEFROMPARTS(@Year,@Month,1));
                SELECT p.PaymentID,p.InvoiceID,p.PaymentDate,p.Amount,p.TransactionCode,pm.MethodName,
                    i.InvoiceMonth,i.InvoiceYear,i.StatusID AS InvoiceStatusID,a.ApartmentCode,c.ContractNumber
                FROM Payment p JOIN Invoice i ON i.InvoiceID=p.InvoiceID JOIN Contract c ON c.ContractID=i.ContractID
                JOIN Apartment a ON a.ApartmentID=c.ApartmentID JOIN PaymentMethod pm ON pm.MethodID=p.MethodID
                WHERE p.StatusID=2 AND p.PaymentDate>=@Start AND p.PaymentDate<@End AND i.StatusID<>4 ORDER BY p.PaymentDate,p.PaymentID;
                SELECT DISTINCT YEAR(PaymentDate) AS Year FROM Payment WHERE StatusID=2 AND PaymentDate IS NOT NULL ORDER BY Year DESC;`);
        const payments=result.recordsets[0],monthly=new Map(),methods=new Map();
        for(const p of payments){
            const date=p.PaymentDate.toISOString().slice(0,10),key=period==='month'?date:date.slice(0,7);
            monthly.set(key,(monthly.get(key)||0)+Number(p.Amount));methods.set(p.MethodName,(methods.get(p.MethodName)||0)+Number(p.Amount));
        }
        res.json({success:true,data:{year,period,month,quarter,payments,availableYears:result.recordsets[1].map(r=>r.Year),
            summary:{total:payments.reduce((s,p)=>s+Number(p.Amount),0),paymentCount:payments.length,invoiceCount:new Set(payments.map(p=>p.InvoiceID)).size,
                paidInvoiceRevenue:payments.filter(p=>p.InvoiceStatusID===2).reduce((s,p)=>s+Number(p.Amount),0)},
            trend:[...monthly].map(([period,total])=>({period,total})),byMethod:[...methods].map(([name,value])=>({name,value}))}});
    }catch(error){next(error);}
};

exports.getDashboardStats = async (req, res) => {
    try {
        const { pool, residentId, sources } = await dashboardPool(req);
        const scopedRequest = () => pool.request().input('CurrentResidentID', sql.Int, residentId).input('ScopeUserID', sql.Int, req.user.UserID);

        // Get apartment stats
        const apartmentStats = await scopedRequest().query(`
            SELECT 
                COUNT(*) AS Total,
                SUM(CASE WHEN StatusID = 1 THEN 1 ELSE 0 END) AS Available,
                SUM(CASE WHEN StatusID = 2 THEN 1 ELSE 0 END) AS Occupied,
                SUM(CASE WHEN StatusID = 3 THEN 1 ELSE 0 END) AS UnderMaintenance,
                SUM(CASE WHEN StatusID = 4 THEN 1 ELSE 0 END) AS Rented
            FROM (${sources.Apartment}) Apartment
        `);

        // Get contract stats
        const contractStats = await scopedRequest().query(`
            SELECT 
                COUNT(*) AS Total,
                SUM(CASE WHEN StatusID = 1 THEN 1 ELSE 0 END) AS New,
                SUM(CASE WHEN StatusID = 2 THEN 1 ELSE 0 END) AS Active,
                SUM(CASE WHEN StatusID = 3 THEN 1 ELSE 0 END) AS Expired,
                SUM(CASE WHEN StatusID = 4 THEN 1 ELSE 0 END) AS Terminated
            FROM (${sources.Contract}) Contract
        `);

        // Get invoice stats
        const invoiceStats = await scopedRequest().query(`
            SELECT 
                COUNT(*) AS Total,
                SUM(CASE WHEN Invoice.TotalAmount > ISNULL(paid.Amount,0) THEN 1 ELSE 0 END) AS Unpaid,
                SUM(CASE WHEN Invoice.TotalAmount <= ISNULL(paid.Amount,0) THEN 1 ELSE 0 END) AS Paid,
                SUM(CASE WHEN Invoice.TotalAmount > ISNULL(paid.Amount,0) AND Invoice.DueDate < CAST(GETDATE() AS date) THEN 1 ELSE 0 END) AS Overdue,
                (SELECT ISNULL(SUM(p.Amount),0) FROM Payment p JOIN (${sources.Invoice}) i ON i.InvoiceID=p.InvoiceID WHERE p.StatusID=2 AND i.StatusID<>4) AS TotalRevenue
            FROM (${sources.Invoice}) Invoice
            OUTER APPLY (SELECT SUM(p.Amount) AS Amount FROM Payment p WHERE p.InvoiceID=Invoice.InvoiceID AND p.StatusID=2) paid
        `);

        // Get resident stats
        const residentStats = await scopedRequest().query(`
            SELECT 
                COUNT(*) AS Total,
                SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END) AS Active
            FROM (${sources.Resident}) Resident
        `);

        // Get ticket stats
        const ticketStats = await scopedRequest().query(`
            SELECT 
                COUNT(*) AS Total,
                SUM(CASE WHEN StatusID = 1 THEN 1 ELSE 0 END) AS New,
                SUM(CASE WHEN StatusID = 2 THEN 1 ELSE 0 END) AS Processing,
                SUM(CASE WHEN StatusID = 3 THEN 1 ELSE 0 END) AS Completed
            FROM (${sources.MaintenanceRequest}) MaintenanceRequest
        `);

        // Get revenue by month (last 6 months)
        const revenueByMonth = await scopedRequest().query(`
            SELECT 
                YEAR(p.PaymentDate) AS Year,
                MONTH(p.PaymentDate) AS Month,
                ISNULL(SUM(p.Amount), 0) AS Total
            FROM (${sources.Invoice}) Invoice JOIN Payment p ON p.InvoiceID=Invoice.InvoiceID
            WHERE p.StatusID = 2 AND Invoice.StatusID<>4
                AND p.PaymentDate >= DATEADD(MONTH, -6, GETDATE())
            GROUP BY YEAR(p.PaymentDate), MONTH(p.PaymentDate)
            ORDER BY Year DESC, Month DESC
        `);

        const summary = await scopedRequest().query(`
            SELECT
                (SELECT COUNT(*) FROM (${sources.Apartment}) a) AS apartmentCount,
                (SELECT COUNT(*) FROM (${sources.Vehicle}) v) AS vehicleCount,
                (SELECT COUNT(*) FROM (${sources.Feedback}) f WHERE NULLIF(f.Reply, '') IS NULL) AS pendingFeedbackCount,
                (SELECT COUNT(*) FROM (${sources.MaintenanceRequest}) m WHERE m.StatusID IN (1,2)) AS openTicketCount,
                (SELECT COUNT(*) FROM (${sources.Invoice}) draft WHERE draft.WorkflowStatus='DRAFT' AND draft.StatusID<>4) AS draftInvoiceCount,
                (SELECT COUNT(*) FROM NotificationReceiver nr WHERE nr.UserID=@ScopeUserID AND nr.IsRead=0
                    AND EXISTS (SELECT 1 FROM (${sources.Notification}) n WHERE n.NotificationID=nr.NotificationID)) AS unreadCount,
                COUNT(*) AS unpaidInvoiceCount, ISNULL(SUM(balance.RemainingAmount),0) AS outstandingAmount
            FROM (${sources.Invoice}) i
            OUTER APPLY (SELECT ISNULL(SUM(p.Amount),0) AS Paid FROM Payment p WHERE p.InvoiceID=i.InvoiceID AND p.StatusID=2) pay
            CROSS APPLY (SELECT i.TotalAmount-pay.Paid AS RemainingAmount) balance
            WHERE balance.RemainingAmount>0 AND i.StatusID<>4
        `);
        const residentDetails=await scopedRequest().query(`
            SELECT TOP 8 i.InvoiceID,i.InvoiceMonth,i.InvoiceYear,i.DueDate,a.ApartmentCode,i.TotalAmount,
                i.TotalAmount-ISNULL(paid.Amount,0) AS RemainingAmount,
                CASE WHEN i.DueDate<CAST(GETDATE() AS date) THEN 'OVERDUE' ELSE 'UPCOMING' END AS DueStatus
            FROM (${sources.Invoice}) i JOIN Contract c ON c.ContractID=i.ContractID JOIN Apartment a ON a.ApartmentID=c.ApartmentID
            OUTER APPLY(SELECT SUM(p.Amount) Amount FROM Payment p WHERE p.InvoiceID=i.InvoiceID AND p.StatusID=2) paid
            WHERE i.StatusID<>4 AND i.TotalAmount>ISNULL(paid.Amount,0)
              AND i.DueDate<=DATEADD(day,7,CAST(GETDATE() AS date)) ORDER BY i.DueDate,i.InvoiceID;
            SELECT a.ApartmentID,a.ApartmentCode,b.BuildingName,f.FloorNumber FROM (${sources.Apartment}) a
            JOIN Floor f ON f.FloorID=a.FloorID JOIN Building b ON b.BuildingID=f.BuildingID ORDER BY a.ApartmentCode;
            SELECT TOP 5 m.RequestID,m.Title,m.StatusID,m.Progress,m.UpdatedAt,e.FullName AS AssignedEmployeeName
            FROM (${sources.MaintenanceRequest}) m LEFT JOIN Employee e ON e.EmployeeID=m.AssignedEmployeeID
            WHERE m.StatusID IN(1,2) ORDER BY m.RequestDate DESC;
            SELECT TOP 5 n.NotificationID,n.Title,n.Content,n.CreatedDate FROM (${sources.Notification}) n ORDER BY n.CreatedDate DESC,n.NotificationID DESC;
        `);
        res.json({
            success: true,
            data: {
                residentSummary: summary.recordset[0],
                residentDetails:{dueInvoices:residentDetails.recordsets[0],apartments:residentDetails.recordsets[1],tickets:residentDetails.recordsets[2],notifications:residentDetails.recordsets[3]},
                apartments: apartmentStats.recordset[0] || {},
                contracts: contractStats.recordset[0] || {},
                invoices: invoiceStats.recordset[0] || {},
                residents: residentStats.recordset[0] || {},
                tickets: ticketStats.recordset[0] || {},
                revenueByMonth: revenueByMonth.recordset || []
            }
        });

    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard statistics',
            error: error.message
        });
    }
};

exports.getRecentActivities = async (req, res) => {
    try {
        const { pool, residentId, sources } = await dashboardPool(req);
        const scopedRequest = () => pool.request().input('CurrentResidentID', sql.Int, residentId).input('ScopeUserID', sql.Int, req.user.UserID);

        // Get recent contracts
        const recentContracts = await scopedRequest().query(`
            SELECT TOP 5 
                c.ContractNumber,
                c.StartDate,
                c.Rent,
                a.ApartmentCode,
                r.FullName AS OwnerName,
                cs.StatusName AS Status
            FROM (${sources.Contract}) c
            INNER JOIN Apartment a ON c.ApartmentID = a.ApartmentID
            INNER JOIN Resident r ON c.OwnerID = r.ResidentID
            INNER JOIN ContractStatus cs ON c.StatusID = cs.StatusID
            ORDER BY c.CreatedDate DESC
        `);

        // Get recent payments
        const recentPayments = await scopedRequest().query(`
            SELECT TOP 5 
                p.PaymentDate,
                p.Amount,
                p.TransactionCode,
                pm.MethodName AS PaymentMethod,
                i.InvoiceID,
                a.ApartmentCode,
                r.FullName AS ResidentName
            FROM Payment p
            INNER JOIN Invoice i ON p.InvoiceID = i.InvoiceID
            INNER JOIN Contract c ON i.ContractID = c.ContractID
            INNER JOIN Apartment a ON c.ApartmentID = a.ApartmentID
            INNER JOIN Resident r ON c.OwnerID = r.ResidentID
            INNER JOIN PaymentMethod pm ON p.MethodID = pm.MethodID
            WHERE p.StatusID = 2
              AND EXISTS (SELECT 1 FROM (${sources.Invoice}) scope_invoice WHERE scope_invoice.InvoiceID=p.InvoiceID)
            ORDER BY p.PaymentDate DESC
        `);

        // Get recent tickets
        const recentTickets = await scopedRequest().query(`
            SELECT TOP 5 
                mr.Title,
                mr.RequestDate,
                mr.StatusID,
                ms.StatusName AS Status,
                r.FullName AS ResidentName,
                a.ApartmentCode
            FROM (${sources.MaintenanceRequest}) mr
            INNER JOIN Resident r ON mr.ResidentID = r.ResidentID
            INNER JOIN Apartment a ON mr.ApartmentID = a.ApartmentID
            INNER JOIN MaintenanceStatus ms ON mr.StatusID = ms.StatusID
            ORDER BY mr.RequestDate DESC
        `);

        // Get recent notifications
        const recentNotifications = await scopedRequest().query(`
            SELECT TOP 5 
                n.Title,
                n.Content,
                n.CreatedDate,
                n.TargetScope,
                e.FullName AS SenderName
            FROM (${sources.Notification}) n
            LEFT JOIN Employee e ON n.SenderID = e.EmployeeID
            ORDER BY n.CreatedDate DESC
        `);

        res.json({
            success: true,
            data: {
                recentContracts: recentContracts.recordset || [],
                recentPayments: recentPayments.recordset || [],
                recentTickets: recentTickets.recordset || [],
                recentNotifications: recentNotifications.recordset || []
            }
        });

    } catch (error) {
        console.error('Get recent activities error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent activities',
            error: error.message
        });
    }
};

exports.getFinancialSummary = async (req, res) => {
    try {
        const { pool, residentId, sources } = await dashboardPool(req);
        const scopedRequest = () => pool.request().input('CurrentResidentID', sql.Int, residentId).input('ScopeUserID', sql.Int, req.user.UserID);

        // Get current month summary
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        const monthSummary = await scopedRequest()
            .input('Month', sql.Int, currentMonth)
            .input('Year', sql.Int, currentYear)
            .query(`
                SELECT 
                    ISNULL(SUM(paid.Amount),0) AS Paid,
                    ISNULL(SUM(CASE WHEN Invoice.TotalAmount>paid.Amount AND (Invoice.DueDate IS NULL OR Invoice.DueDate>=CAST(GETDATE() AS date)) THEN Invoice.TotalAmount-paid.Amount ELSE 0 END),0) AS Unpaid,
                    ISNULL(SUM(CASE WHEN Invoice.TotalAmount>paid.Amount AND Invoice.DueDate<CAST(GETDATE() AS date) THEN Invoice.TotalAmount-paid.Amount ELSE 0 END),0) AS Overdue,
                    COUNT(*) AS TotalInvoices
                FROM (${sources.Invoice}) Invoice
                OUTER APPLY(SELECT ISNULL(SUM(p.Amount),0) Amount FROM Payment p WHERE p.InvoiceID=Invoice.InvoiceID AND p.StatusID=2) paid
                WHERE InvoiceMonth = @Month AND InvoiceYear = @Year AND Invoice.StatusID<>4 AND ISNULL(Invoice.WorkflowStatus,'')<>'DRAFT'
            `);

        // Get year-to-date revenue
        const ytdRevenue = await scopedRequest()
            .input('Year', sql.Int, currentYear)
            .query(`
                SELECT 
                    ISNULL(SUM(p.Amount), 0) AS Revenue
                FROM (${sources.Invoice}) Invoice JOIN Payment p ON p.InvoiceID=Invoice.InvoiceID
                WHERE p.StatusID = 2 AND YEAR(p.PaymentDate) = @Year AND Invoice.StatusID<>4
            `);

        // Get outstanding balance
        const outstanding = await scopedRequest().query(`
            SELECT 
                ISNULL(SUM(CASE WHEN Invoice.TotalAmount>paid.Amount THEN Invoice.TotalAmount-paid.Amount ELSE 0 END),0) AS Outstanding
            FROM (${sources.Invoice}) Invoice
            OUTER APPLY(SELECT ISNULL(SUM(p.Amount),0) Amount FROM Payment p WHERE p.InvoiceID=Invoice.InvoiceID AND p.StatusID=2) paid
            WHERE Invoice.StatusID<>4 AND ISNULL(Invoice.WorkflowStatus,'')<>'DRAFT'
        `);

        // Get monthly revenue trend
        const monthlyTrend = await scopedRequest().query(`
            SELECT 
                MONTH(p.PaymentDate) AS Month,
                YEAR(p.PaymentDate) AS Year,
                ISNULL(SUM(p.Amount), 0) AS Revenue
            FROM (${sources.Invoice}) Invoice JOIN Payment p ON p.InvoiceID=Invoice.InvoiceID
            WHERE p.StatusID = 2 AND Invoice.StatusID<>4
                AND p.PaymentDate >= DATEADD(MONTH, -12, GETDATE())
            GROUP BY YEAR(p.PaymentDate), MONTH(p.PaymentDate)
            ORDER BY Year, Month
        `);

        res.json({
            success: true,
            data: {
                currentMonth: {
                    ...monthSummary.recordset[0],
                    month: currentMonth,
                    year: currentYear
                },
                yearToDate: ytdRevenue.recordset[0] || { Revenue: 0 },
                outstanding: outstanding.recordset[0] || { Outstanding: 0 },
                monthlyTrend: monthlyTrend.recordset || []
            }
        });

    } catch (error) {
        console.error('Get financial summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch financial summary',
            error: error.message
        });
    }
};
