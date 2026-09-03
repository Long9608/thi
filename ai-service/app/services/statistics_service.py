from datetime import datetime

from database import get_connection


def get_overview_statistics():
    connection = None

    try:
        now = datetime.now()
        month = now.month
        year = now.year

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                (
                    SELECT COUNT(*)
                    FROM dbo.Resident
                    WHERE Status = 1
                ) AS ActiveResidents,

                (
                    SELECT COUNT(*)
                    FROM dbo.Apartment
                ) AS TotalApartments,

                (
                    SELECT COUNT(*)
                    FROM dbo.Contract
                    WHERE StatusID IN (2, 5)
                      AND StartDate <= CAST(GETDATE() AS DATE)
                      AND (
                          EndDate IS NULL
                          OR EndDate >= CAST(GETDATE() AS DATE)
                      )
                ) AS ActiveContracts,

                (
                    SELECT COUNT(*)
                    FROM dbo.Vehicle
                    WHERE Status = 1
                ) AS ActiveVehicles,

                (
                    SELECT COUNT(*)
                    FROM dbo.Invoice
                    WHERE InvoiceMonth = ?
                      AND InvoiceYear = ?
                ) AS CurrentMonthInvoices,

                (
                    SELECT ISNULL(SUM(TotalAmount), 0)
                    FROM dbo.Invoice
                    WHERE InvoiceMonth = ?
                      AND InvoiceYear = ?
                ) AS CurrentMonthBilled
            """,
            month,
            year,
            month,
            year
        )

        row = cursor.fetchone()

        return {
            "success": True,
            "period": {
                "month": month,
                "year": year
            },
            "data": {
                "activeResidents": int(row.ActiveResidents or 0),
                "totalApartments": int(row.TotalApartments or 0),
                "activeContracts": int(row.ActiveContracts or 0),
                "activeVehicles": int(row.ActiveVehicles or 0),
                "currentMonthInvoices": int(row.CurrentMonthInvoices or 0),
                "currentMonthBilled": float(row.CurrentMonthBilled or 0)
            }
        }

    except Exception as error:
        return {
            "success": False,
            "message": str(error)
        }

    finally:
        if connection:
            connection.close()
    
def get_monthly_billing_trend():
    connection = None

    try:
        connection = get_connection()
        cursor = connection.cursor()
    
        cursor.execute("""
            SELECT TOP 6
                InvoiceYear,
                InvoiceMonth,
                COUNT(*) AS InvoiceCount,
                ISNULL(SUM(TotalAmount), 0) AS TotalBilled
            FROM dbo.Invoice
            GROUP BY InvoiceYear, InvoiceMonth
            ORDER BY InvoiceYear DESC, InvoiceMonth DESC
        """)

        rows = cursor.fetchall()

        data = []

        for row in reversed(rows):
            data.append({
                "year": int(row.InvoiceYear),
                "month": int(row.InvoiceMonth),
                "invoiceCount": int(row.InvoiceCount or 0),
                "totalBilled": float(row.TotalBilled or 0)
            })

        return {
            "success": True,
            "data": data
        }

    except Exception as error:
        return {
            "success": False,
            "message": str(error)
        }

    finally:
        if connection:
            connection.close()

def get_billing_insight():
    trend_result = get_monthly_billing_trend()

    if not trend_result.get("success"):
        return trend_result

    data = trend_result.get("data", [])

    if len(data) < 2:
        return {
            "success": True,
            "data": {
                "changePercent": None,
                "direction": "UNKNOWN",
                "insight": "Chưa đủ dữ liệu tối thiểu 2 tháng để phân tích xu hướng."
            }
        }

    previous = data[-2]
    current = data[-1]

    previous_total = float(previous.get("totalBilled", 0))
    current_total = float(current.get("totalBilled", 0))

    if previous_total > 0:
        change_percent = (
            (current_total - previous_total)
            / previous_total
        ) * 100
    else:
        change_percent = None

    now = datetime.now()

    is_current_month = (
        current["year"] == now.year
        and current["month"] == now.month
    )

    if change_percent is None:
        direction = "UNKNOWN"
    elif change_percent > 0:
        direction = "UP"
    elif change_percent < 0:
        direction = "DOWN"
    else:
        direction = "STABLE"

    if is_current_month:
        insight = (
            f"Tháng {current['month']}/{current['year']} hiện đã lập "
            f"{current['invoiceCount']} hóa đơn với tổng giá trị "
            f"{current_total:,.0f} đồng. "
            f"Tháng hiện tại chưa kết thúc nên số liệu mới chỉ mang tính tạm thời "
            f"và chưa nên dùng để kết luận xu hướng tăng hoặc giảm cuối tháng."
        )
    elif change_percent is None:
        insight = (
            "Không thể tính tỷ lệ thay đổi vì kỳ trước không có "
            "giá trị hóa đơn."
        )
    elif change_percent > 0:
        insight = (
            f"Tổng giá trị hóa đơn tăng {abs(change_percent):.2f}% "
            f"so với kỳ trước."
        )
    elif change_percent < 0:
        insight = (
            f"Tổng giá trị hóa đơn giảm {abs(change_percent):.2f}% "
            f"so với kỳ trước."
        )
    else:
        insight = "Tổng giá trị hóa đơn không thay đổi so với kỳ trước."

    return {
        "success": True,
        "data": {
            "previousPeriod": previous,
            "currentPeriod": current,
            "changePercent": (
                round(change_percent, 2)
                if change_percent is not None
                else None
            ),
            "direction": direction,
            "isCurrentMonthIncomplete": is_current_month,
            "insight": insight
        }
    }

def get_statistics_dashboard():
    overview = get_overview_statistics()
    trend = get_monthly_billing_trend()
    insight = get_billing_insight()

    if not overview.get("success"):
        return overview

    if not trend.get("success"):
        return trend

    if not insight.get("success"):
        return insight

    return {
        "success": True,
        "data": {
            "overview": overview.get("data", {}),
            "period": overview.get("period", {}),
            "billingTrend": trend.get("data", []),
            "billingInsight": insight.get("data", {})
        }
    }