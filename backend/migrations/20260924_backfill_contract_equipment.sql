SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- Seed the handover template only for contracts that have no persisted equipment.
-- This is idempotent and covers the active contract for apartment A-T5-P1.
INSERT INTO dbo.ContractEquipment (
    ContractID,
    EquipmentName,
    Category,
    Brand,
    Model,
    Quantity,
    Location,
    Specifications,
    ConditionDescription,
    EquipmentStatus
)
SELECT
    c.ContractID,
    v.EquipmentName,
    v.Category,
    v.Brand,
    v.Model,
    1,
    v.Location,
    v.Specifications,
    v.ConditionDescription,
    'operational'
FROM dbo.Contract c
CROSS JOIN (VALUES
    (N'Smart Tivi 4K Samsung Crystal UHD 55 inch', N'TIVI', N'Samsung', N'UA55AU7002KXXV', N'Phòng khách', N'55 inch - 4K UHD - Wi-Fi 5G & Bluetooth', N'Hoạt động tốt (98%)'),
    (N'Tủ lạnh Inverter Panasonic 322 Lít 2 cánh', N'TỦ LẠNH', N'Panasonic', N'NR-BV360QSVN', N'Khu vực bếp', N'322 Lít - Ngăn đông mềm - Inverter Econavi', N'Mới 98%, làm lạnh êm'),
    (N'Máy lạnh Daikin Inverter 1.5 HP (Phòng khách)', N'MÁY LẠNH', N'Daikin', N'FTKB35XVMV', N'Phòng khách', N'1.5 HP - 12.000 BTU - Inverter', N'Làm lạnh nhanh, đã vệ sinh bảo dưỡng định kỳ'),
    (N'Máy lạnh Daikin Inverter 1.0 HP (Phòng ngủ Master)', N'MÁY LẠNH', N'Daikin', N'FTKB25XVMV', N'Phòng ngủ Master', N'1.0 HP - 9.000 BTU - Inverter', N'Hoạt động rất êm'),
    (N'Máy lạnh Daikin Inverter 1.0 HP (Phòng ngủ nhỏ)', N'MÁY LẠNH', N'Daikin', N'FTKB25XVMV', N'Phòng ngủ 2', N'1.0 HP - 9.000 BTU - Inverter', N'Hoạt động ổn định'),
    (N'Máy giặt cửa ngang Electrolux UltimateCare 9.0 Kg', N'MÁY GIẶT', N'Electrolux', N'EWF9024P5WB', N'Logia giặt phơi', N'9.0 Kg - EcoInverter - Giặt hơi nước', N'Hoạt động tốt, vắt êm')
) v(EquipmentName, Category, Brand, Model, Location, Specifications, ConditionDescription)
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.ContractEquipment existing
    WHERE existing.ContractID = c.ContractID
);

COMMIT;
