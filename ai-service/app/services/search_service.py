from database import get_connection


def search_all(keyword: str):
    connection = None

    try:
        keyword = (keyword or "").strip()

        if not keyword:
            return {
                "success": True,
                "query": keyword,
                "count": 0,
                "data": []
            }

        connection = get_connection()
        cursor = connection.cursor()

        like_keyword = f"%{keyword}%"

        results = []

        # =====================================================
        # 1. SEARCH RESIDENT
        # =====================================================
        cursor.execute(
            """
            SELECT TOP 20
                r.ResidentID,
                r.FullName,
                r.Phone,
                r.Email,
                r.Status,
                a.ApartmentCode
            FROM dbo.Resident r

            OUTER APPLY (
                SELECT TOP 1
                    ap.ApartmentCode
                FROM dbo.ContractResident cr

                INNER JOIN dbo.Contract c
                    ON c.ContractID = cr.ContractID

                INNER JOIN dbo.Apartment ap
                    ON ap.ApartmentID = c.ApartmentID

                WHERE cr.ResidentID = r.ResidentID

                ORDER BY
                    c.ContractID DESC
            ) a

            WHERE
                r.FullName LIKE ?
                OR r.Phone LIKE ?
                OR r.Email LIKE ?
                OR a.ApartmentCode LIKE ?

            ORDER BY
                r.FullName
            """,
            like_keyword,
            like_keyword,
            like_keyword,
            like_keyword
        )

        for row in cursor.fetchall():
            results.append({
                "type": "RESIDENT",
                "id": row.ResidentID,
                "title": row.FullName,
                "subtitle": (
                    row.ApartmentCode
                    or "Chưa có căn hộ"
                ),
                "data": {
                    "residentId": row.ResidentID,
                    "fullName": row.FullName,
                    "phone": row.Phone,
                    "email": row.Email,
                    "apartmentCode": row.ApartmentCode,
                    "status": row.Status
                }
            })

        # =====================================================
        # 2. SEARCH APARTMENT
        # =====================================================
        cursor.execute(
            """
            SELECT TOP 20
                a.ApartmentID,
                a.ApartmentCode,
                a.Area,
                rs.StatusName,
                f.FloorNumber,
                b.BuildingName

            FROM dbo.Apartment a

            LEFT JOIN dbo.RoomStatus rs
                ON rs.StatusID = a.StatusID

            LEFT JOIN dbo.Floor f
                ON f.FloorID = a.FloorID

            LEFT JOIN dbo.Building b
                ON b.BuildingID = f.BuildingID

            WHERE
                a.ApartmentCode LIKE ?
                OR b.BuildingName LIKE ?
                OR rs.StatusName LIKE ?

            ORDER BY
                a.ApartmentCode
            """,
            like_keyword,
            like_keyword,
            like_keyword
        )

        for row in cursor.fetchall():
            results.append({
                "type": "APARTMENT",
                "id": row.ApartmentID,
                "title": row.ApartmentCode,
                "subtitle": (
                    row.StatusName
                    or "Chưa rõ trạng thái"
                ),
                "data": {
                    "apartmentId": row.ApartmentID,
                    "apartmentCode": row.ApartmentCode,
                    "area": float(row.Area or 0),
                    "status": row.StatusName,
                    "floorNumber": row.FloorNumber,
                    "buildingName": row.BuildingName
                }
            })

        # =====================================================
        # 3. SEARCH VEHICLE
        # =====================================================
        cursor.execute(
            """
            SELECT TOP 20
                v.VehicleID,
                v.PlateNumber,
                v.Brand,
                v.Color,
                v.Status,
                vt.TypeName AS VehicleType,
                r.FullName AS OwnerName

            FROM dbo.Vehicle v

            LEFT JOIN dbo.VehicleType vt
                ON vt.VehicleTypeID = v.VehicleTypeID

            LEFT JOIN dbo.Resident r
                ON r.ResidentID = v.ResidentID

            WHERE
                v.PlateNumber LIKE ?
                OR v.Brand LIKE ?
                OR v.Color LIKE ?
                OR vt.TypeName LIKE ?
                OR r.FullName LIKE ?

            ORDER BY
                v.PlateNumber
            """,
            like_keyword,
            like_keyword,
            like_keyword,
            like_keyword,
            like_keyword
        )

        for row in cursor.fetchall():
            results.append({
                "type": "VEHICLE",
                "id": row.VehicleID,
                "title": row.PlateNumber,
                "subtitle": (
                    row.OwnerName
                    or "Chưa rõ chủ xe"
                ),
                "data": {
                    "vehicleId": row.VehicleID,
                    "plateNumber": row.PlateNumber,
                    "vehicleType": row.VehicleType,
                    "brand": row.Brand,
                    "color": row.Color,
                    "ownerName": row.OwnerName,
                    "status": row.Status
                }
            })

        # =====================================================
        # 4. SEARCH CONTRACT
        # =====================================================
        cursor.execute(
            """
            SELECT TOP 20
                c.ContractID,
                c.ContractNumber,
                c.StartDate,
                c.EndDate,
                c.Rent,
                cs.StatusName,
                a.ApartmentCode,
                r.FullName AS OwnerName

            FROM dbo.Contract c

            LEFT JOIN dbo.ContractStatus cs
                ON cs.StatusID = c.StatusID

            LEFT JOIN dbo.Apartment a
                ON a.ApartmentID = c.ApartmentID

            LEFT JOIN dbo.Resident r
                ON r.ResidentID = c.OwnerID

            WHERE
                c.ContractNumber LIKE ?
                OR a.ApartmentCode LIKE ?
                OR r.FullName LIKE ?
                OR cs.StatusName LIKE ?

            ORDER BY
                c.ContractID DESC
            """,
            like_keyword,
            like_keyword,
            like_keyword,
            like_keyword
        )

        for row in cursor.fetchall():
            results.append({
                "type": "CONTRACT",
                "id": row.ContractID,
                "title": (
                    row.ContractNumber
                    or f"Hợp đồng #{row.ContractID}"
                ),
                "subtitle": (
                    row.ApartmentCode
                    or "Chưa có căn hộ"
                ),
                "data": {
                    "contractId": row.ContractID,
                    "contractNumber": row.ContractNumber,
                    "apartmentCode": row.ApartmentCode,
                    "ownerName": row.OwnerName,
                    "startDate": (
                        str(row.StartDate)
                        if row.StartDate
                        else None
                    ),
                    "endDate": (
                        str(row.EndDate)
                        if row.EndDate
                        else None
                    ),
                    "rent": float(row.Rent or 0),
                    "status": row.StatusName
                }
            })

        # =====================================================
        # 5. SEARCH INVOICE
        # =====================================================
        cursor.execute(
            """
            SELECT TOP 20
                i.InvoiceID,
                i.InvoiceMonth,
                i.InvoiceYear,
                i.InvoiceDate,
                i.DueDate,
                i.TotalAmount,
                ins.StatusName,
                c.ContractID,
                c.ContractNumber,
                a.ApartmentCode,
                r.FullName AS OwnerName

            FROM dbo.Invoice i

            INNER JOIN dbo.Contract c
                ON c.ContractID = i.ContractID

            LEFT JOIN dbo.InvoiceStatus ins
                ON ins.StatusID = i.StatusID

            LEFT JOIN dbo.Apartment a
                ON a.ApartmentID = c.ApartmentID

            LEFT JOIN dbo.Resident r
                ON r.ResidentID = c.OwnerID

            WHERE
                CAST(i.InvoiceID AS NVARCHAR(30)) LIKE ?
                OR c.ContractNumber LIKE ?
                OR a.ApartmentCode LIKE ?
                OR r.FullName LIKE ?
                OR ins.StatusName LIKE ?
                OR CONCAT(
                    i.InvoiceMonth,
                    '/',
                    i.InvoiceYear
                ) LIKE ?

            ORDER BY
                i.InvoiceYear DESC,
                i.InvoiceMonth DESC,
                i.InvoiceID DESC
            """,
            like_keyword,
            like_keyword,
            like_keyword,
            like_keyword,
            like_keyword,
            like_keyword
        )

        for row in cursor.fetchall():
            invoice_title = (
                f"Hóa đơn #{row.InvoiceID}"
            )

            invoice_period = (
                f"Tháng "
                f"{row.InvoiceMonth}/"
                f"{row.InvoiceYear}"
            )

            results.append({
                "type": "INVOICE",
                "id": row.InvoiceID,
                "title": invoice_title,
                "subtitle": (
                    f"{row.ApartmentCode or 'Không rõ căn hộ'}"
                    f" - {invoice_period}"
                ),
                "data": {
                    "invoiceId": row.InvoiceID,
                    "invoiceMonth": row.InvoiceMonth,
                    "invoiceYear": row.InvoiceYear,
                    "invoiceDate": (
                        str(row.InvoiceDate)
                        if row.InvoiceDate
                        else None
                    ),
                    "dueDate": (
                        str(row.DueDate)
                        if row.DueDate
                        else None
                    ),
                    "totalAmount": float(
                        row.TotalAmount or 0
                    ),
                    "status": row.StatusName,
                    "contractId": row.ContractID,
                    "contractNumber": row.ContractNumber,
                    "apartmentCode": row.ApartmentCode,
                    "ownerName": row.OwnerName
                }
            })

        # =====================================================
        # RESPONSE
        # =====================================================
        return {
            "success": True,
            "query": keyword,
            "count": len(results),
            "data": results
        }

    except Exception as error:
        print(
            "AI Search error:",
            str(error)
        )

        return {
            "success": False,
            "message": str(error)
        }

    finally:
        if connection:
            connection.close()