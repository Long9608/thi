const { getPool, sql } = require('../config/db');
const { resolveScope, contractOwnershipSql } = require('../utils/accessScope');

module.exports = async (req, res, next) => {
    try {
        const filePath = `/uploads${decodeURIComponent(req.path)}`;
        if (!/^\/uploads\/(identity|contracts)\/[A-Za-z0-9_.-]+$/.test(filePath)) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }
        const pool = await getPool();
        const identity = filePath.startsWith('/uploads/identity/');
        const { scope, residentId } = await resolveScope(req, pool, identity ? 'RESIDENT' : 'CONTRACT');
        const result = await pool.request().input('FilePath', sql.NVarChar, filePath)
            .input('CurrentResidentID', sql.Int, residentId).query(identity
                ? `SELECT 1 FROM ResidentIdentity ri WHERE (ri.FrontImage=@FilePath OR ri.BackImage=@FilePath)
                    ${scope === 'own' ? 'AND ri.ResidentID=@CurrentResidentID' : ''}`
                : `SELECT 1 FROM Contract c WHERE c.SignedContractImage=@FilePath
                    ${scope === 'own' ? `AND ${contractOwnershipSql()}` : ''}`);
        if (!result.recordset.length) return res.status(404).json({ success: false, message: 'File not found' });
        res.setHeader('Cache-Control', 'private, no-store');
        next();
    } catch (error) { next(error); }
};
