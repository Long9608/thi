require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const jwt = require('jsonwebtoken');
const { getPool, closePool } = require('../config/db');

const baseUrl = `http://127.0.0.1:${process.env.PORT || 5000}/api`;

async function getFixtures(pool) {
  const result = await pool.request().query(`
    DECLARE @Residents TABLE (UserID INT, ResidentID INT, Username NVARCHAR(100));
    INSERT INTO @Residents
    SELECT TOP 2 u.UserID, r.ResidentID, u.Username
    FROM dbo.Users u
    JOIN dbo.Resident r ON r.UserID = u.UserID
    WHERE u.Status = 1
    ORDER BY r.ResidentID;

    SELECT * FROM @Residents;
    SELECT TOP 1 r.UserID, c.ContractID, c.ApartmentID
    FROM @Residents r
    JOIN dbo.ContractResident cr ON cr.ResidentID = r.ResidentID
    JOIN dbo.Contract c ON c.ContractID = cr.ContractID
    WHERE r.UserID = (SELECT MIN(UserID) FROM @Residents)
    ORDER BY c.ContractID;
    SELECT TOP 1 i.InvoiceID FROM dbo.Invoice i JOIN dbo.Contract c ON c.ContractID = i.ContractID JOIN @Residents r ON r.ResidentID = c.OwnerID ORDER BY i.InvoiceID;
    SELECT TOP 1 v.VehicleID FROM dbo.Vehicle v JOIN @Residents r ON r.ResidentID = v.ResidentID ORDER BY v.VehicleID;
    SELECT TOP 1 pc.CardID FROM dbo.ParkingCard pc JOIN dbo.Vehicle v ON v.VehicleID = pc.VehicleID JOIN @Residents r ON r.ResidentID = v.ResidentID ORDER BY pc.CardID;
    SELECT TOP 1 mr.RequestID FROM dbo.MaintenanceRequest mr JOIN @Residents r ON r.ResidentID = mr.ResidentID ORDER BY mr.RequestID;
    SELECT TOP 1 f.FeedbackID FROM dbo.Feedback f JOIN @Residents r ON r.ResidentID = f.ResidentID ORDER BY f.FeedbackID;
    SELECT TOP 1 n.NotificationID, nr.UserID FROM dbo.Notification n JOIN dbo.NotificationReceiver nr ON nr.NotificationID = n.NotificationID JOIN @Residents r ON r.UserID = nr.UserID WHERE r.UserID = (SELECT MAX(UserID) FROM @Residents) ORDER BY n.NotificationID;
    SELECT r.UserID, r.ResidentID, c.ContractID, c.ApartmentID, i.InvoiceID, v.VehicleID, pc.CardID, mr.RequestID, f.FeedbackID
    FROM @Residents r
    LEFT JOIN dbo.ContractResident cr ON cr.ResidentID = r.ResidentID
    LEFT JOIN dbo.Contract c ON c.ContractID = cr.ContractID
    LEFT JOIN dbo.Invoice i ON i.ContractID = c.ContractID
    LEFT JOIN dbo.Vehicle v ON v.ResidentID = r.ResidentID
    LEFT JOIN dbo.ParkingCard pc ON pc.VehicleID = v.VehicleID
    LEFT JOIN dbo.MaintenanceRequest mr ON mr.ResidentID = r.ResidentID
    LEFT JOIN dbo.Feedback f ON f.ResidentID = r.ResidentID;
  `);
  return {
    residents: result.recordsets[0],
    contract: result.recordsets[1][0],
    invoice: result.recordsets[2][0],
    vehicle: result.recordsets[3][0],
    card: result.recordsets[4][0],
    ticket: result.recordsets[5][0],
    feedback: result.recordsets[6][0],
    notificationForB: result.recordsets[7][0],
    byResident: result.recordsets[8]
  };
}

function tokenFor(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '10m' });
}

async function call(userId, path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${tokenFor(userId)}` }
  });
  let body = null;
  try { body = await response.json(); } catch { body = {}; }
  return { status: response.status, body };
}

function idsFrom(body) {
  return (body?.data || []).map((item) => item.ResidentID || item.ApartmentID || item.ContractID || item.InvoiceID || item.VehicleID || item.CardID || item.RequestID || item.FeedbackID || item.NotificationID);
}

async function main() {
  const pool = await getPool();
  const fixtures = await getFixtures(pool);
  await closePool();
  if (fixtures.residents.length < 2) throw new Error('Fewer than two linked resident accounts');
  const [a, b] = fixtures.residents;
  const aData = fixtures.byResident.find((row) => row.UserID === a.UserID) || {};
  const bData = fixtures.byResident.find((row) => row.UserID === b.UserID) || {};
  const listPaths = ['/residents', '/apartments', '/contracts', '/invoices', '/vehicles', '/vehicles/cards', '/vehicles/history', '/tickets', '/feedbacks', '/notifications'];
  const results = [];
  for (const path of listPaths) {
    const response = await call(a.UserID, path);
    results.push({ user: a.Username, path, status: response.status, count: idsFrom(response.body).length, message: response.body?.message });
  }
  const detailPaths = [
    ['/residents', a.ResidentID, b.ResidentID],
    ['/apartments', aData.ApartmentID, bData.ApartmentID],
    ['/contracts', aData.ContractID, bData.ContractID],
    ['/invoices', aData.InvoiceID, bData.InvoiceID],
    ['/vehicles', aData.VehicleID, bData.VehicleID],
    ['/vehicles/cards', aData.CardID, bData.CardID],
    ['/tickets', aData.RequestID, bData.RequestID],
    ['/feedbacks', aData.FeedbackID, bData.FeedbackID],
    ['/notifications', fixtures.notificationForB?.NotificationID]
  ];
  for (const [prefix, ownId, otherId] of detailPaths) {
    if (!ownId) continue;
    const own = await call(a.UserID, `${prefix}/${ownId}`);
    const cross = otherId ? await call(a.UserID, `${prefix}/${otherId}`) : null;
    results.push({ user: a.Username, path: `${prefix}/${ownId}`, status: own.status, message: own.body?.message, crossStatus: cross?.status || null, crossMessage: cross?.body?.message || null });
    const residentBAccess = await call(b.UserID, `${prefix}/${ownId}`);
    results.push({ user: b.Username, path: `${prefix}/${ownId}`, status: residentBAccess.status, message: residentBAccess.body?.message });
  }
  for (const path of ['/residents/export', '/residents/birthdays?monthDay=01-01']) {
    const response = await call(a.UserID, path);
    results.push({ user: a.Username, path, status: response.status, message: response.body?.message });
  }
  if (fixtures.notificationForB?.NotificationID) {
    const ownNotification = await call(b.UserID, `/notifications/${fixtures.notificationForB.NotificationID}`);
    results.push({ user: b.Username, path: `/notifications/${fixtures.notificationForB.NotificationID}`, status: ownNotification.status, message: ownNotification.body?.message });
  }
  console.log(JSON.stringify({ fixtures, results, residentA: a, residentB: b }, null, 2));
}

main().catch(async (error) => {
  console.error('API_SCOPE_TEST_FAILED:', error.message);
  await closePool();
  process.exitCode = 1;
});
