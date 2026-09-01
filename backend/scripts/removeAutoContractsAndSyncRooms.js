require('dotenv').config({ path: 'backend/.env' });

const { getPool, sql, closePool } = require('../config/db');

async function main() {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        const before = await transaction.request().query(`
            SELECT a.ApartmentCode, c.ContractID, c.ContractNumber
            FROM Contract c
            JOIN Apartment a ON a.ApartmentID = c.ApartmentID
            WHERE c.ContractNumber LIKE 'HD-AUTO-%'
            ORDER BY a.ApartmentCode;
        `);

        await transaction.request().query(`
            DELETE FROM ContractResident
            WHERE ContractID IN (
                SELECT ContractID FROM Contract WHERE ContractNumber LIKE 'HD-AUTO-%'
            );

            DELETE FROM Contract
            WHERE ContractNumber LIKE 'HD-AUTO-%';

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
                ) AS OccupiedWithoutRealActiveContract,
                (
                    SELECT COUNT(*)
                    FROM Building
                    WHERE BuildingName = N'Block A'
                ) AS BlockABuildings;
        `);

        await transaction.commit();

        console.log('REMOVED_AUTO_CONTRACTS');
        console.table(before.recordset);
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
    console.error('Remove auto contracts failed:', error);
    process.exit(1);
});
