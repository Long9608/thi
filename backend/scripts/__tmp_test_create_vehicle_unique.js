require('dotenv').config({ path: 'backend/.env' });
const { getPool, closePool } = require('../config/db');
const controller = require('../controllers/vehicleController');

(async () => {
  const pool = await getPool();
  const resident = await pool.request().query(`
    SELECT TOP 1 ResidentID
    FROM dbo.Resident
    WHERE Status = 1
    ORDER BY ResidentID;
  `);

  const plateSuffix = String(Date.now()).slice(-6);
  const req = {
    body: {
      residentId: resident.recordset[0]?.ResidentID,
      plateNumber: `30H-${plateSuffix.slice(0, 3)}.${plateSuffix.slice(3, 5)}`,
      vehicleTypeId: 4,
      cardExpiryDate: '2026-10-04'
    }
  };

  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      console.log('STATUS', this.statusCode || 200);
      console.log(JSON.stringify(payload, null, 2));
    }
  };

  await controller.createVehicle(req, res);
  await closePool();
})().catch(async (error) => {
  console.error(error);
  await closePool();
  process.exit(1);
});
