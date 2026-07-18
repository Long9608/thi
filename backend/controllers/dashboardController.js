const { getPool, sql } = require('../config/db');

exports.getDashboardStats = async (req, res) => {
    try {
        const pool = await getPool();

        // Get apartment stats
        const apartmentStats = await pool.query(`
            SELECT 
                COUNT(*) AS Total,
                SUM(CASE WHEN StatusID = 1 THEN 1 ELSE 0 END) AS Available,
                SUM(CASE WHEN StatusID = 2 THEN 1 ELSE 0 END) AS Occupied,
                SUM(CASE WHEN StatusID = 3 THEN 1 ELSE 0 END) AS UnderMaintenance,
                SUM(CASE WHEN StatusID = 4 THEN 1 ELSE 0 END) AS Rented
            FROM Apartment
        `);

        // Get contract stats
        const contractStats = await pool.query(`
            SELECT 
                COUNT(*) AS Total,
                SUM(CASE WHEN StatusID = 1 THEN 1 ELSE 0 END) AS New,
                SUM(CASE WHEN StatusID = 2 THEN 1 ELSE 0 END) AS Active,
                SUM(CASE WHEN StatusID = 3 THEN 1 ELSE 0 END) AS Expired,
                SUM(CASE WHEN StatusID = 4 THEN 1 ELSE 0 END) AS Terminated
            FROM Contract
        `);

        // Get invoice stats
        const invoiceStats = await pool.query(`
            SELECT 
                COUNT(*) AS Total,
                SUM(CASE WHEN StatusID = 1 THEN 1 ELSE 0 END) AS Unpaid,
                SUM(CASE WHEN StatusID = 2 THEN 1 ELSE 0 END) AS Paid,
                SUM(CASE WHEN StatusID = 3 THEN 1 ELSE 0 END) AS Overdue,
                ISNULL(SUM(CASE WHEN StatusID = 2 THEN TotalAmount ELSE 0 END), 0) AS TotalRevenue
            FROM Invoice
        `);

        // Get resident stats
        const residentStats = await pool.query(`
            SELECT 
                COUNT(*) AS Total,
                SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END) AS Active
            FROM Resident
        `);

        // Get ticket stats
        const ticketStats = await pool.query(`
            SELECT 
                COUNT(*) AS Total,
                SUM(CASE WHEN StatusID = 1 THEN 1 ELSE 0 END) AS New,
                SUM(CASE WHEN StatusID = 2 THEN 1 ELSE 0 END) AS Processing,
                SUM(CASE WHEN StatusID = 3 THEN 1 ELSE 0 END) AS Completed
            FROM MaintenanceRequest
        `);

        // Get revenue by month (last 6 months)
        const revenueByMonth = await pool.query(`
            SELECT 
                YEAR(InvoiceDate) AS Year,
                MONTH(InvoiceDate) AS Month,
                ISNULL(SUM(TotalAmount), 0) AS Total
            FROM Invoice
            WHERE StatusID = 2
                AND InvoiceDate >= DATEADD(MONTH, -6, GETDATE())
            GROUP BY YEAR(InvoiceDate), MONTH(InvoiceDate)
            ORDER BY Year DESC, Month DESC
        `);

        res.json({
            success: true,
            data: {
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
        const pool = await getPool();

        // Get recent contracts
        const recentContracts = await pool.query(`
            SELECT TOP 5 
                c.ContractNumber,
                c.StartDate,
                c.Rent,
                a.ApartmentCode,
                r.FullName AS OwnerName,
                cs.StatusName AS Status
            FROM Contract c
            INNER JOIN Apartment a ON c.ApartmentID = a.ApartmentID
            INNER JOIN Resident r ON c.OwnerID = r.ResidentID
            INNER JOIN ContractStatus cs ON c.StatusID = cs.StatusID
            ORDER BY c.CreatedDate DESC
        `);

        // Get recent payments
        const recentPayments = await pool.query(`
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
            ORDER BY p.PaymentDate DESC
        `);

        // Get recent tickets
        const recentTickets = await pool.query(`
            SELECT TOP 5 
                mr.Title,
                mr.RequestDate,
                mr.StatusID,
                ms.StatusName AS Status,
                r.FullName AS ResidentName,
                a.ApartmentCode
            FROM MaintenanceRequest mr
            INNER JOIN Resident r ON mr.ResidentID = r.ResidentID
            INNER JOIN Apartment a ON mr.ApartmentID = a.ApartmentID
            INNER JOIN MaintenanceStatus ms ON mr.StatusID = ms.StatusID
            ORDER BY mr.RequestDate DESC
        `);

        // Get recent notifications
        const recentNotifications = await pool.query(`
            SELECT TOP 5 
                n.Title,
                n.Content,
                n.CreatedDate,
                n.TargetScope,
                e.FullName AS SenderName
            FROM Notification n
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
        const pool = await getPool();

        // Get current month summary
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        const monthSummary = await pool.request()
            .input('Month', sql.Int, currentMonth)
            .input('Year', sql.Int, currentYear)
            .query(`
                SELECT 
                    ISNULL(SUM(CASE WHEN StatusID = 2 THEN TotalAmount ELSE 0 END), 0) AS Paid,
                    ISNULL(SUM(CASE WHEN StatusID = 1 THEN TotalAmount ELSE 0 END), 0) AS Unpaid,
                    ISNULL(SUM(CASE WHEN StatusID = 3 THEN TotalAmount ELSE 0 END), 0) AS Overdue,
                    COUNT(*) AS TotalInvoices
                FROM Invoice
                WHERE InvoiceMonth = @Month AND InvoiceYear = @Year
            `);

        // Get year-to-date revenue
        const ytdRevenue = await pool.request()
            .input('Year', sql.Int, currentYear)
            .query(`
                SELECT 
                    ISNULL(SUM(TotalAmount), 0) AS Revenue
                FROM Invoice
                WHERE StatusID = 2 AND InvoiceYear = @Year
            `);

        // Get outstanding balance
        const outstanding = await pool.query(`
            SELECT 
                ISNULL(SUM(TotalAmount), 0) AS Outstanding
            FROM Invoice
            WHERE StatusID IN (1, 3)
        `);

        // Get monthly revenue trend
        const monthlyTrend = await pool.query(`
            SELECT 
                InvoiceMonth AS Month,
                InvoiceYear AS Year,
                ISNULL(SUM(TotalAmount), 0) AS Revenue
            FROM Invoice
            WHERE StatusID = 2
                AND InvoiceDate >= DATEADD(MONTH, -12, GETDATE())
            GROUP BY InvoiceYear, InvoiceMonth
            ORDER BY InvoiceYear ASC, InvoiceMonth ASC
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