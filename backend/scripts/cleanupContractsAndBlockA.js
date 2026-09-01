require('dotenv').config({ path: 'backend/.env' });

const { getPool, sql, closePool } = require('../config/db');

async function main() {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        const before = await transaction.request().query(`
            SELECT
                (SELECT COUNT(*) FROM Contract WHERE ContractNumber LIKE 'HD-AUTO-%') AS AutoContracts,
                (SELECT COUNT(*) FROM Building WHERE BuildingName = N'Block A') AS BlockABuildings,
                (
                    SELECT COUNT(*)
                    FROM Apartment a
                    JOIN Floor f ON f.FloorID = a.FloorID
                    JOIN Building b ON b.BuildingID = f.BuildingID
                    WHERE b.BuildingName = N'Block A'
                ) AS BlockAApartments;
        `);

        const duplicateAutos = await transaction.request().query(`
            SELECT auto.ContractID
            FROM Contract auto
            WHERE auto.ContractNumber LIKE 'HD-AUTO-%'
              AND EXISTS (
                SELECT 1
                FROM Contract originalContract
                WHERE originalContract.ApartmentID = auto.ApartmentID
                  AND originalContract.ContractID <> auto.ContractID
                  AND originalContract.StatusID IN (2, 5)
                  AND CAST(GETDATE() AS DATE) BETWEEN originalContract.StartDate AND originalContract.EndDate
                  AND originalContract.ContractNumber NOT LIKE 'HD-AUTO-%'
              );
        `);

        await transaction.request().query(`
            DELETE FROM ContractResident
            WHERE ContractID IN (
                SELECT auto.ContractID
                FROM Contract auto
                WHERE auto.ContractNumber LIKE 'HD-AUTO-%'
                  AND EXISTS (
                    SELECT 1
                    FROM Contract originalContract
                    WHERE originalContract.ApartmentID = auto.ApartmentID
                      AND originalContract.ContractID <> auto.ContractID
                      AND originalContract.StatusID IN (2, 5)
                      AND CAST(GETDATE() AS DATE) BETWEEN originalContract.StartDate AND originalContract.EndDate
                      AND originalContract.ContractNumber NOT LIKE 'HD-AUTO-%'
                  )
            );

            DELETE FROM Contract
            WHERE ContractNumber LIKE 'HD-AUTO-%'
              AND EXISTS (
                SELECT 1
                FROM Contract originalContract
                WHERE originalContract.ApartmentID = Contract.ApartmentID
                  AND originalContract.ContractID <> Contract.ContractID
                  AND originalContract.StatusID IN (2, 5)
                  AND CAST(GETDATE() AS DATE) BETWEEN originalContract.StartDate AND originalContract.EndDate
                  AND originalContract.ContractNumber NOT LIKE 'HD-AUTO-%'
              );
        `);

        const block = await transaction.request().query(`
            SELECT BuildingID
            FROM Building
            WHERE BuildingName = N'Block A';
        `);

        const blockIds = block.recordset.map((row) => row.BuildingID);
        let blockDeleteSummary = null;

        if (blockIds.length > 0) {
            await transaction.request().query(`
                DECLARE @BlockApartments TABLE (ApartmentID INT PRIMARY KEY);
                DECLARE @BlockContracts TABLE (ContractID INT PRIMARY KEY);
                DECLARE @BlockInvoices TABLE (InvoiceID INT PRIMARY KEY);
                DECLARE @BlockMeters TABLE (MeterID INT PRIMARY KEY);
                DECLARE @BlockFloors TABLE (FloorID INT PRIMARY KEY);

                INSERT INTO @BlockFloors (FloorID)
                SELECT f.FloorID
                FROM Floor f
                JOIN Building b ON b.BuildingID = f.BuildingID
                WHERE b.BuildingName = N'Block A';

                INSERT INTO @BlockApartments (ApartmentID)
                SELECT a.ApartmentID
                FROM Apartment a
                WHERE a.FloorID IN (SELECT FloorID FROM @BlockFloors);

                INSERT INTO @BlockContracts (ContractID)
                SELECT c.ContractID
                FROM Contract c
                WHERE c.ApartmentID IN (SELECT ApartmentID FROM @BlockApartments);

                INSERT INTO @BlockInvoices (InvoiceID)
                SELECT i.InvoiceID
                FROM Invoice i
                WHERE i.ContractID IN (SELECT ContractID FROM @BlockContracts);

                INSERT INTO @BlockMeters (MeterID)
                SELECT sm.MeterID
                FROM SmartMeter sm
                WHERE sm.ApartmentID IN (SELECT ApartmentID FROM @BlockApartments);

                DELETE FROM Payment
                WHERE InvoiceID IN (SELECT InvoiceID FROM @BlockInvoices);

                DELETE FROM InvoiceDetail
                WHERE InvoiceID IN (SELECT InvoiceID FROM @BlockInvoices);

                DELETE FROM Invoice
                WHERE InvoiceID IN (SELECT InvoiceID FROM @BlockInvoices);

                DELETE FROM MeterReading
                WHERE ApartmentID IN (SELECT ApartmentID FROM @BlockApartments);

                DELETE FROM SmartMeterLog
                WHERE MeterID IN (SELECT MeterID FROM @BlockMeters);

                DELETE FROM SmartMeter
                WHERE MeterID IN (SELECT MeterID FROM @BlockMeters);

                DELETE FROM ServiceRegistration
                WHERE ContractID IN (SELECT ContractID FROM @BlockContracts);

                DELETE FROM ContractResident
                WHERE ContractID IN (SELECT ContractID FROM @BlockContracts);

                DELETE FROM Contract
                WHERE ContractID IN (SELECT ContractID FROM @BlockContracts);

                DELETE FROM ApartmentPriceHistory
                WHERE ApartmentID IN (SELECT ApartmentID FROM @BlockApartments);

                DELETE FROM Apartment
                WHERE ApartmentID IN (SELECT ApartmentID FROM @BlockApartments);

                DELETE FROM Floor
                WHERE FloorID IN (SELECT FloorID FROM @BlockFloors);

                DELETE FROM Building
                WHERE BuildingName = N'Block A';
            `);

            blockDeleteSummary = { DeletedBlockA: blockIds.length };
        }

        await transaction.request().query(`
            UPDATE a
            SET StatusID = 2
            FROM Apartment a
            WHERE EXISTS (
                SELECT 1
                FROM Contract c
                JOIN ContractResident cr ON cr.ContractID = c.ContractID
                WHERE c.ApartmentID = a.ApartmentID
                  AND c.StatusID IN (2, 5)
                  AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
                  AND cr.MoveOutDate IS NULL
            )
              AND a.StatusID <> 2;

            UPDATE a
            SET StatusID = 1
            FROM Apartment a
            WHERE a.StatusID = 2
              AND NOT EXISTS (
                SELECT 1
                FROM Contract c
                JOIN ContractResident cr ON cr.ContractID = c.ContractID
                WHERE c.ApartmentID = a.ApartmentID
                  AND c.StatusID IN (2, 5)
                  AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
                  AND cr.MoveOutDate IS NULL
            );
        `);

        const after = await transaction.request().query(`
            SELECT
                (SELECT COUNT(*) FROM Contract WHERE ContractNumber LIKE 'HD-AUTO-%') AS AutoContracts,
                (SELECT COUNT(*) FROM Building WHERE BuildingName = N'Block A') AS BlockABuildings,
                (
                    SELECT COUNT(*)
                    FROM Apartment a
                    JOIN Floor f ON f.FloorID = a.FloorID
                    JOIN Building b ON b.BuildingID = f.BuildingID
                    WHERE b.BuildingName = N'Block A'
                ) AS BlockAApartments,
                (
                    SELECT COUNT(*)
                    FROM Apartment a
                    WHERE a.StatusID = 2
                      AND NOT EXISTS (
                        SELECT 1
                        FROM Contract c
                        JOIN ContractResident cr ON cr.ContractID = c.ContractID
                        WHERE c.ApartmentID = a.ApartmentID
                          AND c.StatusID IN (2, 5)
                          AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
                          AND cr.MoveOutDate IS NULL
                      )
                ) AS OccupiedWithoutActiveContractOrResident;
        `);

        await transaction.commit();

        console.log('BEFORE');
        console.table(before.recordset);
        console.log('AUTO_DUPLICATES_REMOVED');
        console.table(duplicateAutos.recordset);
        console.log('BLOCK_A_DELETE');
        console.table([blockDeleteSummary || { DeletedBlockA: 0 }]);
        console.log('AFTER');
        console.table(after.recordset);
    } catch (error) {
        await transaction.rollback();
        throw error;
    } finally {
        await closePool();
    }
}

main().catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
});
