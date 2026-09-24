from datetime import date

from database import get_connection


# =========================================================
# READINESS
# =========================================================

def get_prediction_readiness():
    connection = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                COUNT(*) AS TotalContracts,

                SUM(
                    CASE
                        WHEN EndDate < CAST(GETDATE() AS DATE)
                        THEN 1
                        ELSE 0
                    END
                ) AS EndedContracts,

                SUM(
                    CASE
                        WHEN StartDate <= CAST(GETDATE() AS DATE)
                             AND EndDate >= CAST(GETDATE() AS DATE)
                        THEN 1
                        ELSE 0
                    END
                ) AS ActiveContracts,

                SUM(
                    CASE
                        WHEN EndDate >= CAST(GETDATE() AS DATE)
                             AND EndDate <= DATEADD(
                                 DAY,
                                 30,
                                 CAST(GETDATE() AS DATE)
                             )
                        THEN 1
                        ELSE 0
                    END
                ) AS Expiring30Days,

                SUM(
                    CASE
                        WHEN EndDate > DATEADD(
                            DAY,
                            30,
                            CAST(GETDATE() AS DATE)
                        )
                        AND EndDate <= DATEADD(
                            DAY,
                            60,
                            CAST(GETDATE() AS DATE)
                        )
                        THEN 1
                        ELSE 0
                    END
                ) AS Expiring31To60Days,

                SUM(
                    CASE
                        WHEN EndDate > DATEADD(
                            DAY,
                            60,
                            CAST(GETDATE() AS DATE)
                        )
                        AND EndDate <= DATEADD(
                            DAY,
                            90,
                            CAST(GETDATE() AS DATE)
                        )
                        THEN 1
                        ELSE 0
                    END
                ) AS Expiring61To90Days

            FROM dbo.Contract
            """
        )

        overview = cursor.fetchone()

        cursor.execute(
            """
            WITH ContractOutcome AS (
                SELECT
                    c1.ContractID,

                    CASE
                        WHEN EXISTS (
                            SELECT 1
                            FROM dbo.Contract c2

                            WHERE
                                c2.ContractID <> c1.ContractID
                                AND c2.ApartmentID = c1.ApartmentID
                                AND c2.OwnerID = c1.OwnerID
                                AND c2.StartDate > c1.EndDate
                                AND c2.StartDate <= DATEADD(
                                    DAY,
                                    30,
                                    c1.EndDate
                                )
                        )
                        THEN 1
                        ELSE 0
                    END AS IsRenewed

                FROM dbo.Contract c1

                WHERE
                    c1.EndDate <
                    CAST(GETDATE() AS DATE)
            )

            SELECT
                COUNT(*) AS EndedWithKnownOutcome,

                ISNULL(
                    SUM(IsRenewed),
                    0
                ) AS RenewedContracts,

                ISNULL(
                    SUM(
                        CASE
                            WHEN IsRenewed = 0
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS NotRenewedContracts

            FROM ContractOutcome
            """
        )

        history = cursor.fetchone()

        total_contracts = int(
            overview.TotalContracts or 0
        )

        ended_contracts = int(
            overview.EndedContracts or 0
        )

        active_contracts = int(
            overview.ActiveContracts or 0
        )

        renewed_contracts = int(
            history.RenewedContracts or 0
        )

        not_renewed_contracts = int(
            history.NotRenewedContracts or 0
        )

        known_outcomes = int(
            history.EndedWithKnownOutcome or 0
        )

        renewal_rate = (
            round(
                renewed_contracts
                / known_outcomes
                * 100,
                2
            )
            if known_outcomes > 0
            else 0.0
        )

        if ended_contracts >= 100:
            readiness = "GOOD"

            message = (
                "Dữ liệu lịch sử tương đối tốt. "
                "Có thể xây dựng mô hình Machine Learning."
            )

        elif ended_contracts >= 30:
            readiness = "LIMITED"

            message = (
                "Có thể thử nghiệm Machine Learning nhưng "
                "dữ liệu vẫn còn hạn chế."
            )

        else:
            readiness = "INSUFFICIENT"

            message = (
                "Chưa đủ dữ liệu lịch sử để huấn luyện "
                "Machine Learning đáng tin cậy. "
                "Hệ thống đang sử dụng Risk Scoring."
            )

        return {
            "success": True,
            "data": {
                "totalContracts": total_contracts,
                "activeContracts": active_contracts,
                "endedContracts": ended_contracts,

                "expiring30Days": int(
                    overview.Expiring30Days or 0
                ),

                "expiring31To60Days": int(
                    overview.Expiring31To60Days or 0
                ),

                "expiring61To90Days": int(
                    overview.Expiring61To90Days or 0
                ),

                "renewedContracts":
                    renewed_contracts,

                "notRenewedContracts":
                    not_renewed_contracts,

                "renewalRate":
                    renewal_rate,

                "readiness":
                    readiness,

                "predictionMode":
                    "RISK_SCORING",

                "message":
                    message
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


# =========================================================
# RISK LEVEL
# =========================================================

def get_risk_level(score):
    if score >= 70:
        return "HIGH"

    if score >= 40:
        return "MEDIUM"

    return "LOW"


# =========================================================
# CONTRACT RISK SCORING
# =========================================================

def get_contract_predictions():
    connection = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        # Chỉ phân tích hợp đồng:
        # - đang còn hiệu lực
        # - hết hạn trong 90 ngày tới
        cursor.execute(
            """
            SELECT
                c.ContractID,
                c.ContractNumber,
                c.OwnerID,
                c.StartDate,
                c.EndDate,
                c.Rent,
                c.Deposit,

                a.ApartmentCode,

                r.FullName AS OwnerName,

                DATEDIFF(
                    DAY,
                    CAST(GETDATE() AS DATE),
                    c.EndDate
                ) AS DaysRemaining,

                (
                    SELECT COUNT(*)

                    FROM dbo.Invoice i

                    WHERE
                        i.ContractID = c.ContractID
                ) AS InvoiceCount,

                (
                    SELECT COUNT(*)

                    FROM dbo.Invoice i

                    WHERE
                        i.ContractID = c.ContractID
                        AND i.DueDate < CAST(GETDATE() AS DATE)
                        AND i.StatusID <> 4 AND i.WorkflowStatus <> 'DRAFT'

                        AND ISNULL(
                            (
                                SELECT SUM(p.Amount)

                                FROM dbo.Payment p

                                WHERE
                                    p.InvoiceID = i.InvoiceID
                                    AND p.StatusID = 2 -- SUCCESS_PAYMENT_STATUS_ID in billingService
                            ),
                            0
                        ) < i.TotalAmount
                ) AS OverdueInvoiceCount,

                (
                    SELECT COUNT(*)

                    FROM dbo.Contract oldContract

                    WHERE
                        oldContract.OwnerID = c.OwnerID

                        AND oldContract.ContractID <>
                            c.ContractID

                        AND oldContract.EndDate <
                            c.StartDate
                ) AS PreviousContractCount

            FROM dbo.Contract c

            LEFT JOIN dbo.Apartment a
                ON a.ApartmentID = c.ApartmentID

            LEFT JOIN dbo.Resident r
                ON r.ResidentID = c.OwnerID

            WHERE
                c.StartDate <= CAST(GETDATE() AS DATE)

                AND c.EndDate >= CAST(GETDATE() AS DATE)

                AND c.EndDate <= DATEADD(
                    DAY,
                    90,
                    CAST(GETDATE() AS DATE)
                )

            ORDER BY
                c.EndDate ASC
            """
        )

        rows = cursor.fetchall()

        predictions = []

        for row in rows:
            score = 0
            reasons = []

            days_remaining = int(
                row.DaysRemaining or 0
            )

            overdue_count = int(
                row.OverdueInvoiceCount or 0
            )

            invoice_count = int(
                row.InvoiceCount or 0
            )

            previous_contract_count = int(
                row.PreviousContractCount or 0
            )

            # =================================================
            # 1. THỜI GIAN CÒN LẠI
            # =================================================

            if days_remaining <= 15:
                score += 45

                reasons.append(
                    "Hợp đồng còn không quá 15 ngày."
                )

            elif days_remaining <= 30:
                score += 35

                reasons.append(
                    "Hợp đồng sẽ hết hạn trong 30 ngày."
                )

            elif days_remaining <= 60:
                score += 20

                reasons.append(
                    "Hợp đồng sẽ hết hạn trong 31-60 ngày."
                )

            else:
                score += 10

                reasons.append(
                    "Hợp đồng sẽ hết hạn trong 61-90 ngày."
                )

            # =================================================
            # 2. HÓA ĐƠN QUÁ HẠN
            # =================================================

            if overdue_count >= 3:
                score += 35

                reasons.append(
                    f"Có {overdue_count} hóa đơn quá hạn "
                    f"chưa thanh toán đủ."
                )

            elif overdue_count == 2:
                score += 25

                reasons.append(
                    "Có 2 hóa đơn quá hạn chưa thanh toán đủ."
                )

            elif overdue_count == 1:
                score += 15

                reasons.append(
                    "Có 1 hóa đơn quá hạn chưa thanh toán đủ."
                )

            else:
                score -= 5

                reasons.append(
                    "Không phát hiện hóa đơn quá hạn "
                    "chưa thanh toán đủ."
                )

            # =================================================
            # 3. LỊCH SỬ HỢP ĐỒNG
            # =================================================

            if previous_contract_count >= 2:
                score -= 15

                reasons.append(
                    "Cư dân đã có nhiều hợp đồng trước đây."
                )

            elif previous_contract_count == 1:
                score -= 10

                reasons.append(
                    "Cư dân đã từng có hợp đồng trước đây."
                )

            # =================================================
            # 4. CHƯA CÓ DỮ LIỆU HÓA ĐƠN
            # =================================================

            if invoice_count == 0:
                reasons.append(
                    "Chưa có dữ liệu hóa đơn để đánh giá "
                    "hành vi thanh toán."
                )

            # Giới hạn 0-100
            score = max(
                0,
                min(
                    100,
                    score
                )
            )

            risk_level = get_risk_level(
                score
            )

            if risk_level == "HIGH":
                recommendation = (
                    "Nên liên hệ cư dân sớm để xác nhận "
                    "nhu cầu gia hạn và xử lý các vấn đề "
                    "còn tồn đọng."
                )

            elif risk_level == "MEDIUM":
                recommendation = (
                    "Nên theo dõi và chủ động trao đổi "
                    "với cư dân trước ngày hết hạn."
                )

            else:
                recommendation = (
                    "Rủi ro hiện ở mức thấp. "
                    "Tiếp tục theo dõi hợp đồng."
                )

            predictions.append({
                "contractId":
                    row.ContractID,

                "contractNumber":
                    row.ContractNumber,

                "apartmentCode":
                    row.ApartmentCode,

                "ownerId":
                    row.OwnerID,

                "ownerName":
                    row.OwnerName,

                "startDate":
                    str(row.StartDate)
                    if row.StartDate
                    else None,

                "endDate":
                    str(row.EndDate)
                    if row.EndDate
                    else None,

                "daysRemaining":
                    days_remaining,

                "rent":
                    float(row.Rent or 0),

                "deposit":
                    float(row.Deposit or 0),

                "invoiceCount":
                    invoice_count,

                "overdueInvoiceCount":
                    overdue_count,

                "previousContractCount":
                    previous_contract_count,

                "riskScore":
                    score,

                "riskLevel":
                    risk_level,

                "reasons":
                    reasons,

                "recommendation":
                    recommendation
            })

        # Ưu tiên rủi ro cao trước
        predictions.sort(
            key=lambda item: (
                -item["riskScore"],
                item["daysRemaining"]
            )
        )

        high_count = sum(
            1
            for item in predictions
            if item["riskLevel"] == "HIGH"
        )

        medium_count = sum(
            1
            for item in predictions
            if item["riskLevel"] == "MEDIUM"
        )

        low_count = sum(
            1
            for item in predictions
            if item["riskLevel"] == "LOW"
        )

        return {
            "success": True,

            "mode": "RISK_SCORING",

            "disclaimer": (
                "Điểm rủi ro là kết quả chấm điểm theo quy tắc "
                "dựa trên dữ liệu hiện có, không phải xác suất "
                "Machine Learning."
            ),

            "summary": {
                "total": len(predictions),
                "highRisk": high_count,
                "mediumRisk": medium_count,
                "lowRisk": low_count
            },

            "data": predictions
        }

    except Exception as error:
        print(
            "Contract prediction error:",
            str(error)
        )

        return {
            "success": False,
            "message": str(error)
        }

    finally:
        if connection:
            connection.close()


# =========================================================
# DASHBOARD
# =========================================================

def get_prediction_dashboard():
    readiness = get_prediction_readiness()

    predictions = get_contract_predictions()

    if not readiness.get("success"):
        return readiness

    if not predictions.get("success"):
        return predictions

    return {
        "success": True,

        "readiness":
            readiness.get("data"),

        "prediction":
            predictions
    }
