require('dotenv').config({ path: 'backend/.env' });

const { getPool, sql, closePool } = require('../config/db');

const VACANT_STATUS_ID = 1;
const OCCUPIED_STATUS_ID = 2;
const ACTIVE_CONTRACT_STATUS_ID = 2;

function asNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

async function main() {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
        const auditBefore = await transaction.request().query(`
            SELECT
                a.ApartmentID,
                a.ApartmentCode,
                a.StatusID AS ApartmentStatusID,
                rs.StatusName AS ApartmentStatus,
                COUNT(DISTINCT CASE
                    WHEN cr.MoveOutDate IS NULL THEN cr.ResidentID
                END) AS ResidentStillInRoom,
                COUNT(DISTINCT CASE
                    WHEN c.StatusID = ${ACTIVE_CONTRACT_STATUS_ID}
                     AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
                    THEN c.ContractID
                END) AS ActiveContractNow,
                COUNT(DISTINCT CASE
                    WHEN c.StatusID = ${ACTIVE_CONTRACT_STATUS_ID}
                    THEN c.ContractID
                END) AS StatusActiveContractAnyDate
            FROM Apartment a
            JOIN RoomStatus rs ON rs.StatusID = a.StatusID
            LEFT JOIN Contract c ON c.ApartmentID = a.ApartmentID
            LEFT JOIN ContractResident cr ON cr.ContractID = c.ContractID
            GROUP BY a.ApartmentID, a.ApartmentCode, a.StatusID, rs.StatusName
            HAVING
                (
                    COUNT(DISTINCT CASE WHEN cr.MoveOutDate IS NULL THEN cr.ResidentID END) > 0
                    AND COUNT(DISTINCT CASE
                        WHEN c.StatusID = ${ACTIVE_CONTRACT_STATUS_ID}
                         AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
                        THEN c.ContractID
                    END) = 0
                )
                OR
                (
                    COUNT(DISTINCT CASE WHEN cr.MoveOutDate IS NULL THEN cr.ResidentID END) = 0
                    AND a.StatusID = ${OCCUPIED_STATUS_ID}
                )
                OR
                (
                    COUNT(DISTINCT CASE
                        WHEN c.StatusID = ${ACTIVE_CONTRACT_STATUS_ID}
                         AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
                        THEN c.ContractID
                    END) > 0
                    AND a.StatusID <> ${OCCUPIED_STATUS_ID}
                )
            ORDER BY a.ApartmentCode;
        `);

        const roomsNeedContract = await transaction.request().query(`
            SELECT
                a.ApartmentID,
                a.ApartmentCode,
                a.Area,
                a.StatusID,
                oldContract.ContractID AS SourceContractID,
                oldContract.ContractNumber AS SourceContractNumber,
                oldContract.OwnerID,
                oldContract.Rent,
                oldContract.Deposit,
                oldContract.StartDate AS SourceStartDate,
                oldContract.EndDate AS SourceEndDate
            FROM Apartment a
            CROSS APPLY (
                SELECT TOP 1 c.*
                FROM Contract c
                WHERE c.ApartmentID = a.ApartmentID
                  AND EXISTS (
                    SELECT 1
                    FROM ContractResident cr
                    WHERE cr.ContractID = c.ContractID
                      AND cr.MoveOutDate IS NULL
                  )
                ORDER BY
                  CASE WHEN c.StatusID = ${ACTIVE_CONTRACT_STATUS_ID} THEN 0 ELSE 1 END,
                  c.EndDate DESC,
                  c.ContractID DESC
            ) oldContract
            WHERE NOT EXISTS (
                SELECT 1
                FROM Contract activeContract
                WHERE activeContract.ApartmentID = a.ApartmentID
                  AND activeContract.StatusID = ${ACTIVE_CONTRACT_STATUS_ID}
                  AND CAST(GETDATE() AS DATE) BETWEEN activeContract.StartDate AND activeContract.EndDate
            )
              AND EXISTS (
                SELECT 1
                FROM Contract c
                JOIN ContractResident cr ON cr.ContractID = c.ContractID
                WHERE c.ApartmentID = a.ApartmentID
                  AND cr.MoveOutDate IS NULL
              )
            ORDER BY a.ApartmentCode;
        `);

        const createdContracts = [];
        for (const room of roomsNeedContract.recordset) {
            const rent = asNumber(room.Rent, asNumber(room.Area, 1) * 12000);
            const deposit = asNumber(room.Deposit, rent * 2);
            const suffix = `${Date.now()}-${room.ApartmentID}`.replace(/[^0-9]/g, '').slice(-12);
            const contractNumber = `HD-AUTO-${room.ApartmentCode}-${suffix}`;

            const inserted = await transaction.request()
                .input('ApartmentID', sql.Int, room.ApartmentID)
                .input('OwnerID', sql.Int, room.OwnerID)
                .input('ContractNumber', sql.VarChar(50), contractNumber)
                .input('SignDate', sql.Date, new Date())
                .input('StartDate', sql.Date, new Date())
                .input('EndDate', sql.Date, new Date(new Date().setFullYear(new Date().getFullYear() + 1)))
                .input('Deposit', sql.Decimal(18, 2), deposit)
                .input('Rent', sql.Decimal(18, 2), rent)
                .input('StatusID', sql.Int, ACTIVE_CONTRACT_STATUS_ID)
                .query(`
                    INSERT INTO Contract (
                        ApartmentID, OwnerID, ContractNumber, SignDate,
                        StartDate, EndDate, Deposit, Rent, StatusID
                    )
                    OUTPUT INSERTED.ContractID
                    VALUES (
                        @ApartmentID, @OwnerID, @ContractNumber, @SignDate,
                        @StartDate, @EndDate, @Deposit, @Rent, @StatusID
                    );
                `);

            const newContractId = inserted.recordset[0].ContractID;

            await transaction.request()
                .input('SourceContractID', sql.Int, room.SourceContractID)
                .input('NewContractID', sql.Int, newContractId)
                .query(`
                    INSERT INTO ContractResident (
                        ContractID, ResidentID, Relationship, MoveInDate, MoveOutDate
                    )
                    SELECT
                        @NewContractID,
                        cr.ResidentID,
                        cr.Relationship,
                        ISNULL(cr.MoveInDate, CAST(GETDATE() AS DATE)),
                        NULL
                    FROM ContractResident cr
                    WHERE cr.ContractID = @SourceContractID
                      AND cr.MoveOutDate IS NULL
                      AND NOT EXISTS (
                        SELECT 1
                        FROM ContractResident existingCr
                        WHERE existingCr.ContractID = @NewContractID
                          AND existingCr.ResidentID = cr.ResidentID
                      );
                `);

            createdContracts.push({
                ApartmentCode: room.ApartmentCode,
                ContractID: newContractId,
                ContractNumber: contractNumber,
                SourceContractID: room.SourceContractID
            });
        }

        const occupiedUpdate = await transaction.request().query(`
            UPDATE a
            SET StatusID = ${OCCUPIED_STATUS_ID}
            FROM Apartment a
            WHERE EXISTS (
                SELECT 1
                FROM Contract c
                JOIN ContractResident cr ON cr.ContractID = c.ContractID
                WHERE c.ApartmentID = a.ApartmentID
                  AND c.StatusID = ${ACTIVE_CONTRACT_STATUS_ID}
                  AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
                  AND cr.MoveOutDate IS NULL
            )
              AND a.StatusID <> ${OCCUPIED_STATUS_ID};
        `);

        const vacantUpdate = await transaction.request().query(`
            UPDATE a
            SET StatusID = ${VACANT_STATUS_ID}
            FROM Apartment a
            WHERE a.StatusID = ${OCCUPIED_STATUS_ID}
              AND NOT EXISTS (
                SELECT 1
                FROM Contract c
                JOIN ContractResident cr ON cr.ContractID = c.ContractID
                WHERE c.ApartmentID = a.ApartmentID
                  AND c.StatusID = ${ACTIVE_CONTRACT_STATUS_ID}
                  AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
                  AND cr.MoveOutDate IS NULL
            );
        `);

        const auditAfter = await transaction.request().query(`
            SELECT
                a.ApartmentID,
                a.ApartmentCode,
                a.StatusID AS ApartmentStatusID,
                rs.StatusName AS ApartmentStatus,
                COUNT(DISTINCT CASE
                    WHEN cr.MoveOutDate IS NULL THEN cr.ResidentID
                END) AS ResidentStillInRoom,
                COUNT(DISTINCT CASE
                    WHEN c.StatusID = ${ACTIVE_CONTRACT_STATUS_ID}
                     AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
                    THEN c.ContractID
                END) AS ActiveContractNow
            FROM Apartment a
            JOIN RoomStatus rs ON rs.StatusID = a.StatusID
            LEFT JOIN Contract c ON c.ApartmentID = a.ApartmentID
            LEFT JOIN ContractResident cr ON cr.ContractID = c.ContractID
            GROUP BY a.ApartmentID, a.ApartmentCode, a.StatusID, rs.StatusName
            HAVING
                (
                    COUNT(DISTINCT CASE WHEN cr.MoveOutDate IS NULL THEN cr.ResidentID END) > 0
                    AND COUNT(DISTINCT CASE
                        WHEN c.StatusID = ${ACTIVE_CONTRACT_STATUS_ID}
                         AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
                        THEN c.ContractID
                    END) = 0
                )
                OR
                (
                    COUNT(DISTINCT CASE WHEN cr.MoveOutDate IS NULL THEN cr.ResidentID END) = 0
                    AND a.StatusID = ${OCCUPIED_STATUS_ID}
                )
                OR
                (
                    COUNT(DISTINCT CASE
                        WHEN c.StatusID = ${ACTIVE_CONTRACT_STATUS_ID}
                         AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
                        THEN c.ContractID
                    END) > 0
                    AND a.StatusID <> ${OCCUPIED_STATUS_ID}
                )
            ORDER BY a.ApartmentCode;
        `);

        await transaction.commit();

        console.log('AUDIT_BEFORE');
        console.table(auditBefore.recordset);
        console.log('CREATED_CONTRACTS');
        console.table(createdContracts);
        console.log('STATUS_UPDATES');
        console.table([{
            SetOccupiedRows: occupiedUpdate.rowsAffected[0] || 0,
            SetVacantRows: vacantUpdate.rowsAffected[0] || 0
        }]);
        console.log('AUDIT_AFTER');
        console.table(auditAfter.recordset);
    } catch (error) {
        await transaction.rollback();
        throw error;
    } finally {
        await closePool();
    }
}

main().catch((error) => {
    console.error('Fix apartment occupancy/contracts failed:', error);
    process.exit(1);
});
