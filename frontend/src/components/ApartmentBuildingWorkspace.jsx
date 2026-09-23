import { PermissionGate } from '../permissions';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleCheck,
  FileText,
  FileSignature,
  Home,
  IdCard,
  Info,
  Layers,
  MapPin,
  Pencil,
  PackageCheck,
  Plus,
  Refrigerator,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Tv,
  UserRound,
  Users,
  WashingMachine,
  Wind,
  Wrench,
} from 'lucide-react';
import { apartmentAPI, contractAPI, residentAPI } from '../api';
import { Badge, Button, Card, Input, Modal, StatCard } from './UI';

const EMPTY_BUILDING_FORM = {
  areaId: '',
  buildingName: '',
  numberOfFloors: 5,
};

const EMPTY_APARTMENT_FORM = {
  buildingId: '',
  floorId: '',
  apartmentCode: '',
  area: 30,
  statusId: 1,
  tenantName: '',
  tenantPhone: '',
  rent: 7500000,
};

const EMPTY_CONTRACT_FORM = {
  ownerId: '',
  tenantName: '',
  tenantIdentity: '',
  tenantPhone: '',
  tenantEmail: '',
  contractNumber: '',
  signDate: new Date().toISOString().slice(0, 10),
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  contractTermMonths: 12,
  depositMonths: 1,
  paymentCycleMonths: 1,
  rent: 12000000,
};

const DEFAULT_EQUIPMENT = [
  {
    id: 'tv-samsung-55',
    name: 'Smart Tivi 4K Samsung Crystal UHD 55 inch',
    category: 'TIVI',
    brand: 'Samsung',
    model: 'UA55AU7002KXXV',
    quantity: 1,
    location: 'Phòng khách',
    specs: '55 inch • 4K UHD • Điều khiển giọng nói Tiếng Việt • Wi‑Fi 5G & Bluetooth',
    condition: 'Hoạt động tốt (98%)',
    status: 'operational',
  },
  {
    id: 'fridge-panasonic-322',
    name: 'Tủ lạnh Inverter Panasonic 322 Lít 2 cánh',
    category: 'TỦ LẠNH',
    brand: 'Panasonic',
    model: 'NR-BV360QSVN',
    quantity: 1,
    location: 'Khu vực bếp',
    specs: '322 Lít • Ngăn đông mềm • Công nghệ Inverter Econavi tiết kiệm điện',
    condition: 'Mới 98%, làm lạnh êm, ngăn đông mềm Prime Fresh −3°C',
    status: 'operational',
  },
  {
    id: 'ac-daikin-living',
    name: 'Máy lạnh Daikin Inverter 1.5 HP (Phòng khách)',
    category: 'MÁY LẠNH',
    brand: 'Daikin',
    model: 'FTKB35XVMV',
    quantity: 1,
    location: 'Phòng khách',
    specs: '1.5 HP (12.000 BTU) • Inverter tiết kiệm điện • Phin lọc Enzyme Blue diệt khuẩn',
    condition: 'Làm lạnh nhanh, êm ái, đã vệ sinh bảo dưỡng định kỳ',
    status: 'operational',
  },
  {
    id: 'ac-daikin-master',
    name: 'Máy lạnh Daikin Inverter 1.0 HP (Phòng ngủ Master)',
    category: 'MÁY LẠNH',
    brand: 'Daikin',
    model: 'FTKB25XVMV',
    quantity: 1,
    location: 'Phòng ngủ Master',
    specs: '1.0 HP (9.000 BTU) • Inverter • Chế độ ban đêm siêu êm 19dB',
    condition: 'Hoạt động rất êm, làm mát sâu dễ chịu',
    status: 'operational',
  },
  {
    id: 'ac-daikin-small',
    name: 'Máy lạnh Daikin Inverter 1.0 HP (Phòng ngủ nhỏ)',
    category: 'MÁY LẠNH',
    brand: 'Daikin',
    model: 'FTKB25XVMV',
    quantity: 1,
    location: 'Phòng ngủ 2',
    specs: '1.0 HP (9.000 BTU) • Inverter • Luồng gió Coanda không thổi trực tiếp',
    condition: 'Hoạt động ổn định',
    status: 'operational',
  },
  {
    id: 'washer-electrolux-9',
    name: 'Máy giặt cửa ngang Electrolux UltimateCare 9.0 Kg',
    category: 'MÁY GIẶT',
    brand: 'Electrolux',
    model: 'EWF9024P5WB',
    quantity: 1,
    location: 'Logia giặt phơi',
    specs: 'Khối lượng giặt 9.0 Kg • EcoInverter • Giặt hơi nước Hygienic Care',
    condition: 'Hoạt động tốt, vắt êm 1200 vòng/phút',
    status: 'operational',
  },
];

function equipmentIcon(category) {
  const name = String(category || '').toUpperCase();
  if (name.includes('TIVI')) return Tv;
  if (name.includes('TỦ LẠNH')) return Refrigerator;
  if (name.includes('MÁY GIẶT')) return WashingMachine;
  return Wind;
}

function equipmentFromStorage(contractId) {
  if (!contractId || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`contract-equipment:${contractId}`);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch {
    return null;
  }
}

function storeContractEquipment(contractId, equipment) {
  if (!contractId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`contract-equipment:${contractId}`, JSON.stringify(equipment));
  } catch {
    // localStorage is only a fallback until the optional SQL patch is applied.
  }
}

function unwrap(response) {
  return Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
}

function statusMeta(apartment) {
  const id = Number(apartment?.StatusID);
  const name = String(apartment?.Status || '').toLowerCase();

  if ([3, 7].includes(id) || name.includes('bảo trì')) {
    return {
      key: 'maintenance',
      label: apartment?.Status || 'Bảo trì',
      tone: 'amber',
      card: 'border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-500',
      icon: Wrench,
    };
  }

  if ([2, 4].includes(id) || name.includes('ở') || name.includes('thuê')) {
    return {
      key: 'occupied',
      label: apartment?.Status || 'Đang sử dụng',
      tone: 'green',
      card: 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:border-emerald-500',
      icon: Users,
    };
  }

  if (id === 1 || name.includes('trống')) {
    return {
      key: 'vacant',
      label: apartment?.Status || 'Còn trống',
      tone: 'blue',
      card: 'border-blue-200 bg-blue-50 text-blue-900 hover:border-blue-500',
      icon: Home,
    };
  }

  return {
    key: 'other',
    label: apartment?.Status || 'Chưa xác định',
    tone: 'slate',
    card: 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-400',
    icon: Home,
  };
}

function buildingStats(building, apartments) {
  const rows = apartments.filter((item) => Number(item.BuildingID) === Number(building.BuildingID));
  return {
    total: rows.length,
    vacant: rows.filter((item) => statusMeta(item).key === 'vacant').length,
    occupied: rows.filter((item) => statusMeta(item).key === 'occupied').length,
    maintenance: rows.filter((item) => statusMeta(item).key === 'maintenance').length,
  };
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')} VND`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('vi-VN');
}

// Danh sách căn hộ trả CurrentResidents dạng chuỗi STRING_AGG và
// CurrentContract dạng JSON string. Modal chi tiết cần dữ liệu ổn định
// ngay ở lượt render đầu tiên (trước khi API chi tiết trả về).
function parseCurrentContract(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeEquipment(value) {
  const items = Array.isArray(value) ? value : parseJsonArray(value);
  return items.length ? items : null;
}

function normalizeApartmentDetail(apartment) {
  if (!apartment || typeof apartment !== 'object') return apartment;

  const rawResidents = apartment.CurrentResidents;
  const currentResidents = Array.isArray(rawResidents)
    ? rawResidents
    : typeof rawResidents === 'string'
      ? rawResidents
        .split(',')
        .map((name, index) => name.trim())
        .filter(Boolean)
        .map((name, index) => ({
          ResidentID: `summary-${index}-${name}`,
          FullName: name,
        }))
      : [];

  return {
    ...apartment,
    CurrentContract: parseCurrentContract(apartment.CurrentContract),
    CurrentResidents: currentResidents,
  };
}

function SampleModal({ open, title, subtitle, icon: Icon = FileText, children, footer, onClose, size = 'max-w-6xl' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-5">
      <div className={`flex max-h-[96vh] w-full ${size} flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl`}>
        <div className="flex flex-shrink-0 items-center justify-between bg-[#1474f5] px-5 py-4 text-white sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/95 text-[#1474f5]"><Icon size={23} /></span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black sm:text-2xl">{title}</h2>
              {subtitle && <p className="mt-0.5 truncate text-sm text-blue-100 sm:text-base">{subtitle}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-blue-100 transition hover:bg-white/15 hover:text-white" aria-label="Đóng">
            <span className="text-3xl font-light leading-none">×</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-7">{children}</div>
        {footer && <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-7">{footer}</div>}
      </div>
    </div>
  );
}

export default function ApartmentBuildingWorkspace({ flash }) {
  const [buildings, setBuildings] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [areas, setAreas] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [floors, setFloors] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedApartment, setSelectedApartment] = useState(null);
  const [buildingModalOpen, setBuildingModalOpen] = useState(false);
  const [apartmentModalOpen, setApartmentModalOpen] = useState(false);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [contractViewModalOpen, setContractViewModalOpen] = useState(false);
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [contractViewLoading, setContractViewLoading] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [contractEquipment, setContractEquipment] = useState(DEFAULT_EQUIPMENT);
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [editingApartment, setEditingApartment] = useState(null);
  const [buildingForm, setBuildingForm] = useState(EMPTY_BUILDING_FORM);
  const [apartmentForm, setApartmentForm] = useState(EMPTY_APARTMENT_FORM);
  const [contractForm, setContractForm] = useState(EMPTY_CONTRACT_FORM);
  const [residents, setResidents] = useState([]);
  const [selectedResidentIds, setSelectedResidentIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [buildingResponse, apartmentResponse, areaResponse, statusResponse] = await Promise.all([
        apartmentAPI.getBuildings(),
        apartmentAPI.getAll('', '', 1, 9999),
        apartmentAPI.getAreas(),
        apartmentAPI.getStatuses(),
      ]);

      const nextBuildings = unwrap(buildingResponse);
      const nextApartments = unwrap(apartmentResponse);
      setBuildings(nextBuildings);
      setApartments(nextApartments);
      setAreas(unwrap(areaResponse));
      setStatuses(unwrap(statusResponse));

      setSelectedBuildingId((current) => {
        if (current && nextBuildings.some((item) => String(item.BuildingID) === String(current))) return current;
        return nextBuildings[0]?.BuildingID ? String(nextBuildings[0].BuildingID) : '';
      });
    } catch (requestError) {
      console.error('Load apartment/building workspace error:', requestError);
      const message = requestError?.message || 'Không thể tải dữ liệu tòa nhà và căn hộ.';
      setError(message);
      if (flash) flash(`❌ ${message}`);
    } finally {
      setLoading(false);
    }
  }, [flash]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedBuilding = useMemo(
    () => buildings.find((item) => String(item.BuildingID) === String(selectedBuildingId)) || null,
    [buildings, selectedBuildingId],
  );

  const selectedBuildingApartments = useMemo(
    () => apartments.filter((item) => Number(item.BuildingID) === Number(selectedBuildingId)),
    [apartments, selectedBuildingId],
  );

  const loadFloors = useCallback(async (buildingId) => {
    if (!buildingId) {
      setFloors([]);
      return;
    }
    try {
      const response = await apartmentAPI.getFloors(buildingId);
      setFloors(unwrap(response));
    } catch (requestError) {
      console.error('Load floors error:', requestError);
      setFloors([]);
    }
  }, []);

  useEffect(() => {
    setSelectedFloorId('');
    loadFloors(selectedBuildingId);
  }, [loadFloors, selectedBuildingId]);

  const floorRows = useMemo(() => {
    const knownFloors = floors.length
      ? floors
      : Array.from({ length: Number(selectedBuilding?.NumberOfFloors || 0) }, (_, index) => ({
          FloorID: `virtual-${index + 1}`,
          FloorNumber: index + 1,
          BuildingID: selectedBuildingId,
        }));

    const rows = knownFloors
      .map((floor) => ({
        ...floor,
        rooms: selectedBuildingApartments
          .filter((apartment) =>
            Number(apartment.FloorID) === Number(floor.FloorID)
            || Number(apartment.FloorNumber) === Number(floor.FloorNumber),
          )
          .filter((apartment) => {
            const query = search.trim().toLowerCase();
            const matchesSearch = !query
              || String(apartment.ApartmentCode || '').toLowerCase().includes(query)
              || String(apartment.CurrentResidents || '').toLowerCase().includes(query);
            const matchesStatus = !statusFilter || String(apartment.StatusID) === String(statusFilter);
            return matchesSearch && matchesStatus;
          })
          .sort((a, b) => String(a.ApartmentCode || '').localeCompare(String(b.ApartmentCode || ''))),
      }))
      .sort((a, b) => Number(b.FloorNumber) - Number(a.FloorNumber));

    if (!search.trim() && !statusFilter && !selectedFloorId) return rows;
    if (selectedFloorId) {
      return rows.filter((floor) => String(floor.FloorID) === String(selectedFloorId));
    }
    return rows.filter((floor) => floor.rooms.length > 0);
  }, [floors, search, selectedBuilding, selectedBuildingApartments, selectedBuildingId, selectedFloorId, statusFilter]);

  const totals = useMemo(() => {
    const all = apartments.map(statusMeta);
    return {
      total: apartments.length,
      vacant: all.filter((item) => item.key === 'vacant').length,
      occupied: all.filter((item) => item.key === 'occupied').length,
      maintenance: all.filter((item) => item.key === 'maintenance').length,
      buildings: buildings.length,
    };
  }, [apartments, buildings.length]);

  const openBuildingCreate = () => {
    setEditingBuilding(null);
    setBuildingForm({
      ...EMPTY_BUILDING_FORM,
      areaId: areas[0]?.AreaID || '',
    });
    setBuildingModalOpen(true);
  };

  const openBuildingEdit = (building) => {
    setEditingBuilding(building);
    setBuildingForm({
      areaId: building.AreaID || '',
      buildingName: building.BuildingName || '',
      numberOfFloors: building.NumberOfFloors || 1,
    });
    setBuildingModalOpen(true);
  };

  const openApartmentCreate = () => {
    const firstFloor = floors[0];
    setEditingApartment(null);
    setApartmentForm({
      ...EMPTY_APARTMENT_FORM,
      buildingId: selectedBuildingId,
      floorId: firstFloor?.FloorID || '',
      statusId: statuses[0]?.StatusID || 1,
    });
    setApartmentModalOpen(true);
  };

  const openApartmentEdit = (apartment) => {
    const currentContract = apartment.CurrentContract || {};
    const ownerResident = Array.isArray(apartment.CurrentResidents)
      ? apartment.CurrentResidents.find((resident) => resident?.ResidentID && !String(resident.ResidentID).startsWith('summary-'))
      : null;
    setEditingApartment(apartment);
    setApartmentForm({
      buildingId: apartment.BuildingID || selectedBuildingId,
      floorId: apartment.FloorID || '',
      apartmentCode: apartment.ApartmentCode || '',
      area: apartment.Area || 30,
      statusId: apartment.StatusID || 1,
      tenantName: currentContract.OwnerName || ownerResident?.FullName || '',
      tenantPhone: currentContract.OwnerPhone || ownerResident?.Phone || '',
      rent: currentContract.Rent || 7500000,
    });
    setSelectedApartment(null);
    setApartmentModalOpen(true);
  };

  const openApartmentDetail = async (apartment) => {
    // Chuẩn hóa ngay trước lượt render đầu tiên. Nếu dùng thẳng bản ghi
    // từ /apartments thì CurrentResidents là chuỗi và gọi .map() sẽ làm
    // React trắng toàn trang.
    setSelectedApartment(normalizeApartmentDetail(apartment));
    setDetailLoading(true);
    try {
      const response = await apartmentAPI.getById(apartment.ApartmentID);
      setSelectedApartment(normalizeApartmentDetail(response?.data || apartment));
    } catch (requestError) {
      console.error('Load apartment detail error:', requestError);
      if (flash) flash('❌ Không thể tải chi tiết căn hộ.');
    } finally {
      setDetailLoading(false);
    }
  };

  const openContractView = async () => {
    const summary = selectedApartment?.CurrentContract;
    if (!summary) {
      if (flash) flash('❌ Căn hộ hiện chưa có hợp đồng hiệu lực.');
      return;
    }

    setSelectedContract({
      ...summary,
      Residents: selectedApartment.CurrentResidents || [],
      History: selectedApartment.AllContracts || [],
      Equipment: normalizeEquipment(summary.Equipment) || equipmentFromStorage(summary.ContractID) || DEFAULT_EQUIPMENT,
    });
    setContractViewModalOpen(true);
    if (!summary.ContractID) return;

    setContractViewLoading(true);
    try {
      const response = await contractAPI.getById(summary.ContractID);
      const contract = response?.data || summary;
      const residentsFromApi = typeof contract.Residents === 'string'
        ? parseJsonArray(contract.Residents)
        : (Array.isArray(contract.Residents) ? contract.Residents : (selectedApartment.CurrentResidents || []));
      setSelectedContract({
        ...contract,
        Residents: residentsFromApi,
        History: selectedApartment.AllContracts || [],
        Equipment: normalizeEquipment(contract.Equipment)
          || equipmentFromStorage(contract.ContractID) || DEFAULT_EQUIPMENT,
      });
    } catch (requestError) {
      console.error('Load contract detail error:', requestError);
      if (flash) flash(`❌ ${requestError?.message || 'Không thể tải chi tiết hợp đồng.'}`);
    } finally {
      setContractViewLoading(false);
    }
  };

  const openEquipmentView = async () => {
    const contract = selectedApartment?.CurrentContract;
    if (!contract) {
      if (flash) flash('❌ Căn hộ hiện chưa có hợp đồng và danh mục thiết bị bàn giao.');
      return;
    }

    let equipment = normalizeEquipment(contract.Equipment) || equipmentFromStorage(contract.ContractID) || DEFAULT_EQUIPMENT;
    if (contract.ContractID) {
      try {
        const response = await contractAPI.getById(contract.ContractID);
        const detail = response?.data || {};
        if (normalizeEquipment(detail.Equipment)) equipment = normalizeEquipment(detail.Equipment);
      } catch (requestError) {
        console.warn('Load equipment detail fallback:', requestError);
      }
    }
    setSelectedEquipment(equipment);
    setEquipmentModalOpen(true);
  };

  const terminateSelectedContract = async () => {
    if (!selectedContract?.ContractID) return;
    if (!window.confirm(`Kết thúc hợp đồng ${selectedContract.ContractNumber || ''}? Căn hộ sẽ chuyển về Còn trống.`)) return;

    setSaving(true);
    try {
      // ContractStatus 4 = Đã thanh lý. Backend đồng bộ Apartment về StatusID 1.
      await contractAPI.update(selectedContract.ContractID, { statusId: 4 });
      if (flash) flash('✅ Đã kết thúc hợp đồng và chuyển căn hộ về còn trống.');
      setContractViewModalOpen(false);
      setSelectedContract(null);
      setSelectedApartment(null);
      await loadData();
    } catch (requestError) {
      console.error('Terminate contract error:', requestError);
      if (flash) flash(`❌ ${requestError?.message || 'Không thể kết thúc hợp đồng.'}`);
    } finally {
      setSaving(false);
    }
  };

  const renewSelectedContract = async () => {
    if (!selectedContract?.ContractID || Number(selectedContract.StatusID) === 4) return;
    const currentEnd = new Date(selectedContract.EndDate);
    if (Number.isNaN(currentEnd.getTime())) {
      if (flash) flash('❌ Hợp đồng chưa có ngày kết thúc hợp lệ.');
      return;
    }
    currentEnd.setMonth(currentEnd.getMonth() + 12);
    setSaving(true);
    try {
      const endDate = currentEnd.toISOString().slice(0, 10);
      await contractAPI.update(selectedContract.ContractID, { endDate });
      setSelectedContract((current) => ({ ...current, EndDate: endDate }));
      if (flash) flash('✅ Đã gia hạn hợp đồng thêm 12 tháng.');
    } catch (requestError) {
      if (flash) flash(`❌ ${requestError?.message || 'Không thể gia hạn hợp đồng.'}`);
    } finally {
      setSaving(false);
    }
  };

  const openContractCreate = async () => {
    if (!selectedApartment?.ApartmentID) return;
    if (statusMeta(selectedApartment).key !== 'vacant') {
      if (flash) flash('❌ Chỉ được tạo hợp đồng cho căn hộ đang trống.');
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 12);
    endDate.setDate(endDate.getDate() - 1);

    setContractForm({
      ...EMPTY_CONTRACT_FORM,
      contractNumber: `HD-${selectedApartment.ApartmentCode}-${today.replace(/-/g, '')}`,
      signDate: today,
      startDate: today,
      endDate: endDate.toISOString().slice(0, 10),
    });
    setSelectedResidentIds([]);
    setContractEquipment(DEFAULT_EQUIPMENT);
    try {
      const response = await residentAPI.getAll('', 1, 999);
      setResidents(unwrap(response));
    } catch (requestError) {
      console.error('Load residents for contract error:', requestError);
      setResidents([]);
      if (flash) flash('❌ Không thể tải danh sách cư dân để tạo hợp đồng.');
    }
    setContractModalOpen(true);
  };

  const submitContract = async (event) => {
    event.preventDefault();
    if (!selectedApartment?.ApartmentID || !contractForm.ownerId || !contractForm.startDate || !contractForm.endDate) {
      if (flash) flash('❌ Cần chọn chủ hộ và thời hạn hợp đồng.');
      return;
    }

    const contractTermMonths = Number(contractForm.contractTermMonths);
    if (!Number.isInteger(contractTermMonths) || contractTermMonths < 1) {
      if (flash) flash('❌ Thời hạn hợp đồng phải là số tháng dương.');
      return;
    }

    const rent = Number(contractForm.rent);
    if (!Number.isFinite(rent) || rent <= 0) {
      if (flash) flash('❌ Giá thuê phải lớn hơn 0.');
      return;
    }

    setSaving(true);
    try {
      // Giữ thông tin bên B đồng bộ với cư dân được chọn trước khi phát hành hợp đồng.
      await residentAPI.update(Number(contractForm.ownerId), {
        fullName: String(contractForm.tenantName || '').trim(),
        phone: String(contractForm.tenantPhone || '').trim() || null,
        email: String(contractForm.tenantEmail || '').trim() || null,
        identityNumber: String(contractForm.tenantIdentity || '').trim() || undefined,
      });
      const createResponse = await contractAPI.create({
        apartmentId: Number(selectedApartment.ApartmentID),
        ownerId: Number(contractForm.ownerId),
        contractNumber: contractForm.contractNumber.trim(),
        signDate: contractForm.signDate,
        startDate: contractForm.startDate,
        endDate: contractForm.endDate,
        deposit: rent * Number(contractForm.depositMonths || 1),
        rent,
        contractTermMonths,
        depositMonths: Number(contractForm.depositMonths || 1),
        paymentCycleMonths: Number(contractForm.paymentCycleMonths || 1),
        monthlyBillingDay: 10,
        statusId: 2,
        residents: selectedResidentIds.map((residentId) => ({
          residentId: Number(residentId),
          relationship: Number(residentId) === Number(contractForm.ownerId) ? 'Chủ hộ' : 'Thành viên',
          moveInDate: contractForm.startDate,
        })),
        equipment: contractEquipment,
      });
      storeContractEquipment(createResponse?.data?.contractId, contractEquipment);
      if (flash) flash('✅ Đã tạo hợp đồng và chuyển trạng thái căn hộ sang đang ở.');
      setContractModalOpen(false);
      setSelectedApartment(null);
      await loadData();
    } catch (requestError) {
      console.error('Create contract error:', requestError);
      if (flash) flash(`❌ ${requestError?.message || 'Không thể tạo hợp đồng.'}`);
    } finally {
      setSaving(false);
    }
  };

  const saveBuilding = async (event) => {
    event.preventDefault();
    const numberOfFloors = Number(buildingForm.numberOfFloors);
    if (!buildingForm.areaId || !buildingForm.buildingName.trim() || !Number.isInteger(numberOfFloors) || numberOfFloors < 1) {
      if (flash) flash('❌ Nhập khu vực, tên tòa nhà và số tầng hợp lệ.');
      return;
    }

    setSaving(true);
    try {
      if (editingBuilding) {
        await apartmentAPI.updateBuilding(editingBuilding.BuildingID, {
          buildingName: buildingForm.buildingName.trim(),
          numberOfFloors,
        });
        if (flash) flash('✅ Đã cập nhật tòa nhà.');
      } else {
        const response = await apartmentAPI.createBuilding({
          areaId: Number(buildingForm.areaId),
          buildingName: buildingForm.buildingName.trim(),
          numberOfFloors,
        });
        const buildingId = response?.data?.buildingId;
        if (buildingId) {
          // Backend hiện tạo tòa nhà trước, nên tạo các tầng mặc định ngay sau đó.
          await Promise.all(Array.from({ length: numberOfFloors }, (_, index) =>
            apartmentAPI.createFloor({ buildingId, floorNumber: index + 1 }),
          ));
        }
        if (flash) flash('✅ Đã tạo tòa nhà và các tầng mặc định.');
      }
      setBuildingModalOpen(false);
      await loadData();
    } catch (requestError) {
      console.error('Save building error:', requestError);
      if (flash) flash(`❌ ${requestError?.message || 'Không thể lưu tòa nhà.'}`);
    } finally {
      setSaving(false);
    }
  };

  const saveApartment = async (event) => {
    event.preventDefault();
    const nextApartmentStatus = statusMeta({
      ...(editingApartment || {}),
      StatusID: apartmentForm.statusId,
      Status: statuses.find((status) => String(status.StatusID) === String(apartmentForm.statusId))?.StatusName,
    });

    // Khi sửa phòng, form bám đúng mẫu đã kiểm thử: trạng thái, khách thuê,
    // số điện thoại và giá thuê. Không gửi lại tòa/tầng/mã/diện tích ở luồng này.
    if (editingApartment) {
      const rent = Number(apartmentForm.rent);
      if (!apartmentForm.statusId || (editingApartment.CurrentContract && (!Number.isFinite(rent) || rent <= 0))) {
        if (flash) flash('❌ Nhập trạng thái và giá thuê hợp lệ.');
        return;
      }

      if (!editingApartment.CurrentContract && nextApartmentStatus.key === 'occupied') {
        if (flash) flash('❌ Hãy tạo hợp đồng trước khi chuyển phòng sang Đang thuê.');
        return;
      }
    }

    if (editingApartment?.CurrentContract && nextApartmentStatus.key !== 'occupied') {
      if (flash) flash('❌ Căn hộ đang có hợp đồng hiệu lực; hãy kết thúc hợp đồng trước khi đổi trạng thái.');
      return;
    }

    const area = Number(apartmentForm.area);
    if (!editingApartment && (!apartmentForm.floorId || !Number.isFinite(area) || area <= 0 || !apartmentForm.apartmentCode.trim())) {
      if (flash) flash('❌ Nhập tầng, mã căn hộ và diện tích hợp lệ.');
      return;
    }

    setSaving(true);
    try {
      if (editingApartment) {
        await apartmentAPI.update(editingApartment.ApartmentID, {
          statusId: Number(apartmentForm.statusId),
        });

        const currentContract = editingApartment.CurrentContract;
        const ownerId = Number(currentContract?.OwnerID || editingApartment.CurrentResidents?.find((resident) => resident?.ResidentID)?.ResidentID);
        const updates = [];
        if (currentContract?.ContractID && Number.isFinite(Number(apartmentForm.rent))) {
          updates.push(contractAPI.update(currentContract.ContractID, { rent: Number(apartmentForm.rent) }));
        }
        if (ownerId) {
          updates.push(residentAPI.update(ownerId, {
            fullName: String(apartmentForm.tenantName || '').trim(),
            phone: String(apartmentForm.tenantPhone || '').trim() || null,
          }));
        }
        await Promise.all(updates);
        if (flash) flash('✅ Đã cập nhật trạng thái, khách thuê và giá thuê.');
      } else {
        await apartmentAPI.create({
          floorId: Number(apartmentForm.floorId),
          apartmentCode: apartmentForm.apartmentCode.trim(),
          area,
          statusId: Number(apartmentForm.statusId),
        });
        if (flash) flash('✅ Đã tạo căn hộ.');
      }
      setApartmentModalOpen(false);
      await loadData();
    } catch (requestError) {
      console.error('Save apartment error:', requestError);
      if (flash) flash(`❌ ${requestError?.message || 'Không thể lưu căn hộ.'}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteBuilding = async (building) => {
    if (!window.confirm(`Xóa ${building.BuildingName}? Chỉ tòa nhà không còn căn hộ mới xóa được.`)) return;
    try {
      await apartmentAPI.deleteBuilding(building.BuildingID);
      if (flash) flash('✅ Đã xóa tòa nhà.');
      await loadData();
    } catch (requestError) {
      if (flash) flash(`❌ ${requestError?.message || 'Không thể xóa tòa nhà.'}`);
    }
  };

  const deleteApartment = async (apartment) => {
    if (!window.confirm(`Xóa căn ${apartment.ApartmentCode}?`)) return;
    try {
      await apartmentAPI.delete(apartment.ApartmentID);
      setSelectedApartment(null);
      if (flash) flash('✅ Đã xóa căn hộ.');
      await loadData();
    } catch (requestError) {
      if (flash) flash(`❌ ${requestError?.message || 'Không thể xóa căn hộ.'}`);
    }
  };

  const floorOptions = floors.length
    ? floors
    : Array.from({ length: Number(selectedBuilding?.NumberOfFloors || 0) }, (_, index) => ({
        FloorID: `virtual-${index + 1}`,
        FloorNumber: index + 1,
      }));

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#0d1b33] via-[#15325a] to-[#0b5260] text-white shadow-xl">
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-200">
              <Building2 size={17} /> Quản lý căn hộ & phòng
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Sơ đồ tòa nhà trực quan</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">
              Chọn tòa nhà, chọn tầng và bấm vào từng phòng để xem cư dân, hợp đồng và trạng thái sử dụng.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PermissionGate permission="APARTMENT_CREATE"><Button className="border border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={openBuildingCreate}>
              <Plus size={16} /> Thêm tòa nhà
            </Button></PermissionGate>
            <PermissionGate permission="APARTMENT_CREATE"><Button className="border border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={openApartmentCreate} disabled={!selectedBuildingId}>
              <Plus size={16} /> Thêm căn hộ
            </Button></PermissionGate>
            <Button className="border border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={loadData} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-5">
        <StatCard icon={Building2} label="Tòa nhà" value={totals.buildings} hint="Đang quản lý" />
        <StatCard icon={Home} label="Tổng căn hộ" value={totals.total} hint="Theo dữ liệu thực" />
        <StatCard icon={CheckCircle2} label="Còn trống" value={totals.vacant} hint="Có thể bố trí" />
        <StatCard icon={Users} label="Đang sử dụng" value={totals.occupied} hint="Có hợp đồng/cư dân" />
        <StatCard icon={Wrench} label="Bảo trì" value={totals.maintenance} hint="Cần xử lý" />
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
            <Building2 size={18} className="text-[#1f4f46]" /> Chọn tòa nhà
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input icon={Search} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã căn hoặc cư dân..." className="sm:w-64" />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]">
              <option value="">Tất cả trạng thái</option>
              {statuses.map((status) => <option key={status.StatusID} value={status.StatusID}>{status.StatusName}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500"><RefreshCw size={18} className="animate-spin" /> Đang tải dữ liệu...</div>
        ) : buildings.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">Chưa có tòa nhà. Bấm “Thêm tòa nhà” để bắt đầu.</div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {buildings.map((building) => {
              const stats = buildingStats(building, apartments);
              const selected = String(building.BuildingID) === String(selectedBuildingId);
              return (
                <div key={building.BuildingID} role="button" tabIndex={0} onClick={() => setSelectedBuildingId(String(building.BuildingID))} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedBuildingId(String(building.BuildingID)); }} className={`rounded-2xl border p-4 text-left transition ${selected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2"><span className={`rounded-lg p-2 ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}><Building2 size={18} /></span><span className="text-lg font-black text-slate-950">{building.BuildingName}</span></div>
                      <p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><MapPin size={13} /> {building.AreaName || 'Chưa có khu vực'}</p>
                    </div>
                    <div className="flex items-center gap-1"><PermissionGate permission="APARTMENT_UPDATE"><button type="button" aria-label={`Sửa ${building.BuildingName}`} onClick={(event) => { event.stopPropagation(); openBuildingEdit(building); }} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700"><Pencil size={15} /></button></PermissionGate><PermissionGate permission="APARTMENT_DELETE"><button type="button" aria-label={`Xóa ${building.BuildingName}`} onClick={(event) => { event.stopPropagation(); deleteBuilding(building); }} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-rose-600"><Trash2 size={15} /></button></PermissionGate></div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs"><Badge tone="slate">{building.NumberOfFloors || 0} tầng</Badge><Badge tone="blue">{stats.total} căn</Badge><Badge tone="green">{stats.occupied} đang ở</Badge><Badge tone="amber">{stats.maintenance} bảo trì</Badge></div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {selectedBuilding && (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50/80 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div><div className="flex items-center gap-2"><h3 className="text-xl font-black text-slate-950">{selectedBuilding.BuildingName}</h3><Badge tone="blue">Đang xem</Badge></div><p className="mt-1 text-sm text-slate-500">{selectedBuilding.AreaName || 'Chưa xác định khu vực'} · {selectedBuilding.NumberOfFloors || 0} tầng · {selectedBuildingApartments.length} căn hộ</p></div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600"><span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-blue-200" /> Trống</span><span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-300" /> Đang sử dụng</span><span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-300" /> Bảo trì</span></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setSelectedFloorId('')} className={`rounded-xl px-3 py-2 text-sm font-bold transition ${!selectedFloorId ? 'bg-[#1f4f46] text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>Tất cả tầng</button>{floorOptions.map((floor) => <button type="button" key={floor.FloorID} onClick={() => setSelectedFloorId(String(floor.FloorID))} className={`rounded-xl px-3 py-2 text-sm font-bold transition ${String(selectedFloorId) === String(floor.FloorID) ? 'bg-[#1f4f46] text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>Tầng {floor.FloorNumber}</button>)}</div>
          </div>

          {error && <div className="m-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertTriangle size={17} /> {error}</div>}

          <div className="space-y-5 p-5">
            {floorRows.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">Không có căn hộ phù hợp với bộ lọc hiện tại.</div> : floorRows.map((floor) => {
              const slots = Array.from({ length: Math.max(5, floor.rooms.length) }, (_, index) => floor.rooms[index] || null);
              return (
                <section key={floor.FloorID} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><span className="rounded-lg bg-slate-100 p-2 text-slate-600"><Layers size={17} /></span><h4 className="font-black text-slate-950">Tầng {floor.FloorNumber}</h4></div><span className="text-xs font-semibold text-slate-500">{floor.rooms.length} căn hiển thị</span></div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                    {slots.map((apartment, index) => {
                      const meta = apartment ? statusMeta(apartment) : null;
                      const Icon = meta?.icon || Home;
                      return apartment ? (
                        <button key={apartment.ApartmentID} type="button" onClick={() => openApartmentDetail(apartment)} className={`group min-h-[118px] rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${meta.card}`}>
                          <div className="flex items-start justify-between gap-2"><span className="text-base font-black">{apartment.ApartmentCode}</span><Icon size={17} className="opacity-70" /></div>
                          <p className="mt-2 text-xs font-semibold opacity-80">{meta.label} · {Number(apartment.Area || 0).toLocaleString('vi-VN')} m²</p>
                          <p className="mt-3 truncate text-xs opacity-70">{apartment.CurrentResidents || 'Chưa có cư dân'}</p>
                          <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold opacity-75">Xem chi tiết <ChevronRight size={12} /></span>
                        </button>
                      ) : (
                        <div key={`empty-${floor.FloorID}-${index}`} className="min-h-[118px] rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-slate-400"><div className="flex items-start justify-between"><span className="text-sm font-bold">T{floor.FloorNumber}-P{index + 1}</span><Home size={16} /></div><p className="mt-3 text-xs">Chưa tạo căn hộ</p><PermissionGate permission="APARTMENT_CREATE"><button type="button" onClick={openApartmentCreate} className="mt-2 text-[11px] font-bold text-[#1f4f46] hover:underline">+ Thêm căn</button></PermissionGate></div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </Card>
      )}

      <Modal open={selectedApartment !== null} title={selectedApartment ? `Căn hộ ${selectedApartment.ApartmentCode}` : 'Chi tiết căn hộ'} description="Thông tin phòng theo dữ liệu hệ thống" onClose={() => setSelectedApartment(null)} size="lg">
        {selectedApartment && <div className="space-y-5">
          {detailLoading && <div className="flex items-center gap-2 text-sm text-slate-500"><RefreshCw size={16} className="animate-spin" /> Đang tải chi tiết...</div>}
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center"><div><h3 className="text-2xl font-black text-slate-950">{selectedApartment.ApartmentCode}</h3><p className="mt-1 text-sm text-slate-500">{selectedApartment.BuildingName} · Tầng {selectedApartment.FloorNumber} · {selectedApartment.Area || 0} m²</p></div><Badge tone={statusMeta(selectedApartment).tone}>{statusMeta(selectedApartment).label}</Badge></div>
          <div className="grid gap-4 md:grid-cols-3"><Card className="p-4"><p className="flex items-center gap-2 text-sm font-bold text-slate-800"><Home size={16} className="text-[#1f4f46]" /> Thông tin căn hộ</p><div className="mt-3 space-y-2 text-sm"><p><span className="text-slate-500">Tòa nhà:</span> {selectedApartment.BuildingName || '—'}</p><p><span className="text-slate-500">Tầng:</span> {selectedApartment.FloorNumber || '—'}</p><p><span className="text-slate-500">Diện tích:</span> <strong>{Number(selectedApartment.Area || 0).toLocaleString('vi-VN')} m²</strong></p><p><span className="text-slate-500">Mã căn:</span> {selectedApartment.ApartmentCode}</p></div></Card><Card className="p-4"><p className="flex items-center gap-2 text-sm font-bold text-slate-800"><FileText size={16} className="text-[#1f4f46]" /> Hợp đồng hiện tại</p>{selectedApartment.CurrentContract ? <div className="mt-3 space-y-2 text-sm"><p><span className="text-slate-500">Số hợp đồng:</span> {selectedApartment.CurrentContract.ContractNumber}</p><p><span className="text-slate-500">Chủ hộ:</span> {selectedApartment.CurrentContract.OwnerName || 'Chưa có'}</p><p><span className="text-slate-500">Giá thuê:</span> {formatMoney(selectedApartment.CurrentContract.Rent)}</p><p><span className="text-slate-500">Thời hạn:</span> {selectedApartment.CurrentContract.StartDate ? `${new Date(selectedApartment.CurrentContract.StartDate).toLocaleDateString('vi-VN')} → ${new Date(selectedApartment.CurrentContract.EndDate).toLocaleDateString('vi-VN')}` : 'Chưa có'}</p></div> : <p className="mt-3 text-sm text-slate-500">Căn hộ chưa có hợp đồng hiệu lực.</p>}</Card><Card className="p-4"><p className="flex items-center gap-2 text-sm font-bold text-slate-800"><Users size={16} className="text-[#1f4f46]" /> Cư dân hiện tại</p>{selectedApartment.CurrentResidents?.length ? <div className="mt-3 space-y-2">{selectedApartment.CurrentResidents.map((resident) => <div key={resident.ResidentID} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 text-sm"><span className="rounded-lg bg-white p-2 text-slate-500"><UserRound size={14} /></span><div><p className="font-semibold text-slate-900">{resident.FullName}</p><p className="text-xs text-slate-500">{resident.Phone || 'Chưa có số điện thoại'}{resident.Relationship ? ` · ${resident.Relationship}` : ''}</p></div></div>)}</div> : <p className="mt-3 text-sm text-slate-500">Chưa có cư dân trong căn hộ.</p>}</Card></div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {statusMeta(selectedApartment).key === 'vacant' && <PermissionGate permission="CONTRACT_CREATE"><Button onClick={openContractCreate}><FileText size={15} /> Tạo hợp đồng</Button></PermissionGate>}
            {statusMeta(selectedApartment).key === 'maintenance' && <span className="mr-auto rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Phòng đang bảo trì — không thể tạo hợp đồng</span>}
            {selectedApartment.CurrentContract && <Button variant="secondary" onClick={openContractView}><FileText size={15} /> Xem hợp đồng</Button>}
            {selectedApartment.CurrentContract && <Button variant="secondary" onClick={openEquipmentView}><PackageCheck size={15} /> Xem thiết bị</Button>}
            <PermissionGate permission="APARTMENT_UPDATE"><Button variant="secondary" onClick={() => openApartmentEdit(selectedApartment)}><Pencil size={15} /> Cập nhật phòng</Button></PermissionGate>
            <PermissionGate permission="APARTMENT_DELETE"><Button variant="danger" onClick={() => deleteApartment(selectedApartment)}><Trash2 size={15} /> Xóa căn hộ</Button></PermissionGate>
            <Button onClick={() => setSelectedApartment(null)}>Đóng</Button>
          </div>
        </div>}
      </Modal>

      <SampleModal
        open={contractViewModalOpen}
        icon={FileSignature}
        title={selectedContract ? `Hợp đồng thuê căn hộ #${selectedContract.ContractNumber || ''}` : 'Hợp đồng thuê căn hộ'}
        subtitle={selectedContract ? `Căn hộ ${selectedContract.ApartmentCode || selectedApartment?.ApartmentCode || '—'} • Khách thuê: ${selectedContract.OwnerName || '—'}` : 'Thông tin hợp đồng'}
        onClose={() => { setContractViewModalOpen(false); setSelectedContract(null); }}
        size="max-w-6xl"
        footer={selectedContract && <>
          <span className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${Number(selectedContract.StatusID) === 4 ? 'bg-slate-100 text-slate-600' : 'bg-emerald-600 text-white'}`}><CircleCheck size={16} /> {Number(selectedContract.StatusID) === 4 ? 'Hợp đồng đã thanh lý' : 'Hợp đồng đang có hiệu lực'}</span>
          <div className="ml-auto flex flex-wrap gap-2">
            {Number(selectedContract.StatusID) !== 4 && <PermissionGate permission="CONTRACT_RENEW"><Button variant="secondary" onClick={renewSelectedContract} disabled={saving}><RotateCcw size={16} /> Gia hạn +12 Tháng</Button></PermissionGate>}
            {Number(selectedContract.StatusID) !== 4 && <PermissionGate permission="CONTRACT_LIQUIDATE"><Button variant="danger" onClick={terminateSelectedContract} disabled={saving}><FileText size={16} /> {saving ? 'Đang xử lý...' : 'Thanh lý HĐ'}</Button></PermissionGate>}
            <Button variant="secondary" onClick={() => { setContractViewModalOpen(false); setSelectedContract(null); }}>Đóng</Button>
          </div>
        </>}
      >
        {contractViewLoading && <div className="mb-4 flex items-center gap-2 text-sm text-slate-500"><RefreshCw size={16} className="animate-spin" /> Đang tải chi tiết hợp đồng...</div>}
        {selectedContract && <article className="bg-white px-5 py-8 font-serif text-[15px] leading-7 text-slate-900 shadow-sm sm:px-10">
          <header className="text-center">
            <p className="text-xl font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p>Độc lập - Tự do - Hạnh phúc</p>
            <div className="mx-auto my-3 h-px w-40 bg-slate-400" />
            <h1 className="text-2xl font-bold uppercase">HỢP ĐỒNG THUÊ CĂN HỘ CHUNG CƯ</h1>
            <p className="mt-2">Số: <strong>{selectedContract.ContractNumber || '—'}</strong></p>
            <p className="italic">Ký ngày: {formatDate(selectedContract.SignDate)}</p>
          </header>

          <section className="mt-8 space-y-1">
            <h2 className="text-lg font-bold underline">BÊN CHO THUÊ (BÊN A):</h2>
            <p className="pl-5"><strong>Đại diện:</strong> BAN QUẢN LÝ DỰ ÁN CĂN HỘ ĐỨC VŨ TOWER</p>
            <p className="pl-5"><strong>Địa chỉ:</strong> Theo thông tin tòa nhà trong hệ thống quản lý</p>
            <p className="pl-5"><strong>Đại diện pháp lý ký duyệt:</strong> Ban quản lý tòa nhà</p>
          </section>
          <section className="mt-5 space-y-1">
            <h2 className="text-lg font-bold underline">BÊN THUÊ (BÊN B):</h2>
            <p className="pl-5"><strong>Họ và tên:</strong> {String(selectedContract.OwnerName || '—').toUpperCase()}</p>
            <p className="pl-5"><strong>Số CCCD/Hộ chiếu:</strong> {selectedContract.OwnerIdentityNumber || '—'}</p>
            <p className="pl-5"><strong>Điện thoại liên lạc:</strong> {selectedContract.OwnerPhone || '—'}</p>
            <p className="pl-5"><strong>Email:</strong> {selectedContract.OwnerEmail || '—'}</p>
          </section>
          <section className="mt-7">
            <h2 className="border-b border-slate-300 pb-1 text-lg font-bold uppercase">ĐIỀU 1: ĐỐI TƯỢNG HỢP ĐỒNG & MỤC ĐÍCH</h2>
            <p className="mt-3">Bên A đồng ý cho Bên B thuê căn hộ số <strong>{selectedContract.ApartmentCode || selectedApartment?.ApartmentCode || '—'}</strong> thuộc {selectedContract.BuildingName || selectedApartment?.BuildingName || 'tòa nhà Đức Vũ Tower'}. Mục đích sử dụng: để ở, nghiêm cấm các hoạt động trái pháp luật.</p>
          </section>
          <section className="mt-6">
            <h2 className="border-b border-slate-300 pb-1 text-lg font-bold uppercase">ĐIỀU 2: THỜI HẠN THUÊ & TIỀN THUÊ</h2>
            <div className="mt-3 space-y-1 pl-5">
              <p><strong>Thời hạn thuê:</strong> {selectedContract.ContractTermMonths || '—'} tháng, từ ngày {formatDate(selectedContract.StartDate)} đến hết ngày {formatDate(selectedContract.EndDate)}.</p>
              <p><strong>Giá thuê hàng tháng:</strong> <span className="font-bold text-red-600">{formatMoney(selectedContract.Rent)}/tháng</span> (chưa bao gồm điện, nước sinh hoạt và phí dịch vụ).</p>
              <p><strong>Tiền đặt cọc bảo đảm:</strong> <span className="font-bold text-blue-600">{formatMoney(selectedContract.Deposit)}</span> ({selectedContract.DepositMonths || 1} tháng tiền thuê nhà).</p>
              <p><strong>Chu kỳ & hình thức thanh toán:</strong> Hàng tháng, trước ngày {selectedContract.MonthlyBillingDay || 10} hàng tháng qua tài khoản hoặc ứng dụng cư dân.</p>
            </div>
          </section>
          <section className="mt-6">
            <h2 className="border-b border-slate-300 pb-1 text-lg font-bold uppercase">ĐIỀU 3: PHỤ LỤC BÀN GIAO TRANG THIẾT BỊ (TIVI, TỦ LẠNH, MÁY LẠNH…)</h2>
            <p className="mt-3">Bên A đã kiểm tra vận hành và bàn giao đầy đủ cho Bên B các trang thiết bị nội thất điện tử, điện lạnh sau:</p>
            <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-sm"><thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2">STT</th><th className="border border-slate-300 p-2">TÊN THIẾT BỊ / CHỦNG LOẠI</th><th className="border border-slate-300 p-2">HÃNG / MODEL</th><th className="border border-slate-300 p-2">SL</th><th className="border border-slate-300 p-2">VỊ TRÍ LẮP ĐẶT</th><th className="border border-slate-300 p-2">TÌNH TRẠNG VẬN HÀNH</th></tr></thead><tbody>{(selectedContract.Equipment || DEFAULT_EQUIPMENT).map((item, index) => <tr key={item.id || `${item.name}-${index}`}><td className="border border-slate-300 p-2 text-center">{index + 1}</td><td className="border border-slate-300 p-2 font-semibold">{item.name}</td><td className="border border-slate-300 p-2">{item.brand || '—'} · {item.model || '—'}</td><td className="border border-slate-300 p-2 text-center">{item.quantity || 1}</td><td className="border border-slate-300 p-2">{item.location || '—'}</td><td className="border border-slate-300 p-2 text-emerald-700">{item.condition || 'Hoạt động tốt'}</td></tr>)}</tbody></table></div>
          </section>
          <section className="mt-6"><h2 className="border-b border-slate-300 pb-1 text-lg font-bold uppercase">ĐIỀU 4: CAM KẾT CHUNG</h2><p className="mt-3">Hai bên cam kết thực hiện đúng các điều khoản của hợp đồng. Mọi thay đổi hoặc gia hạn phải được lập thành văn bản và ghi nhận trên hệ thống.</p></section>
        </article>}
      </SampleModal>

      <SampleModal
        open={equipmentModalOpen}
        icon={PackageCheck}
        title={`Danh mục thiết bị căn hộ ${selectedApartment?.ApartmentCode || ''}`}
        subtitle={`${selectedApartment?.BuildingName || 'Tòa nhà'} • Khách thuê: ${selectedApartment?.CurrentContract?.OwnerName || '—'}`}
        onClose={() => setEquipmentModalOpen(false)}
        size="max-w-6xl"
        footer={<div className="ml-auto"><Button variant="secondary" onClick={() => setEquipmentModalOpen(false)}>Đóng</Button></div>}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {selectedEquipment.map((item, index) => {
            const Icon = equipmentIcon(item.category);
            return (
              <Card key={item.id || `${item.name}-${index}`} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3"><span className={`flex h-14 w-14 items-center justify-center rounded-xl border ${String(item.category).includes('MÁY LẠNH') ? 'border-cyan-200 bg-cyan-50 text-cyan-600' : 'border-slate-200 bg-slate-50 text-indigo-600'}`}><Icon size={27} /></span><div><div className="flex flex-wrap gap-2"><Badge tone="slate">{item.category || 'THIẾT BỊ'}</Badge><Badge tone="slate">SL: {item.quantity || 1}</Badge></div><h3 className="mt-2 text-lg font-black text-slate-950">{item.name}</h3><p className="text-sm text-slate-600">{item.brand || '—'} <span className="px-1">•</span> <span className="font-mono">{item.model || '—'}</span></p></div></div>
                  <Badge tone="green"><span className="mr-1">●</span> Hoạt động tốt</Badge>
                </div>
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600"><p><MapPin size={14} className="mr-1 inline text-rose-500" /><strong>Vị trí: </strong>{item.location || '—'}</p><p className="mt-2">{item.specs || 'Chưa có thông số kỹ thuật'}</p></div>
                <p className="mt-3 text-sm text-slate-600"><Info size={15} className="mr-1 inline text-slate-400" /><strong>Tình trạng: </strong>{item.condition || 'Hoạt động tốt'}</p>
                <div className="mt-4 border-t border-slate-200 pt-3 text-sm text-slate-500">Bàn giao theo HĐ</div>
              </Card>
            );
          })}
        </div>
      </SampleModal>

      <SampleModal
        open={contractModalOpen}
        icon={FileSignature}
        title="Tạo hợp đồng cho thuê căn hộ mới"
        subtitle="Lập hồ sơ hợp đồng pháp lý & bàn giao thiết bị điện tử, điện lạnh"
        onClose={() => setContractModalOpen(false)}
        size="max-w-6xl"
        footer={<><Button type="button" variant="secondary" onClick={() => setContractModalOpen(false)}>Hủy bỏ</Button><Button type="submit" form="sample-contract-form" disabled={saving}><FileSignature size={17} /> {saving ? 'Đang phát hành...' : 'Phát hành & Ký hợp đồng'}</Button></>}
      >
        <form id="sample-contract-form" className="space-y-5" onSubmit={submitContract}>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3"><h3 className="flex items-center gap-3 text-lg font-black text-slate-950"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1474f5] text-sm text-white">1</span> Chọn Căn Hộ & Vị Trí Cho Thuê</h3><Badge tone="amber">Đang thuê / Đổi khách</Badge></div>
            <div className="mt-4 grid gap-4 md:grid-cols-2"><div><label className="mb-1 block text-sm font-bold uppercase text-slate-600">Chọn số căn hộ *</label><select value={selectedApartment?.ApartmentID || ''} disabled className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold"><option value={selectedApartment?.ApartmentID}>{selectedApartment?.ApartmentCode} — {selectedApartment?.BuildingName} (Tầng {selectedApartment?.FloorNumber}, {selectedApartment?.Area} m²)</option></select></div><div><label className="mb-1 block text-sm font-bold uppercase text-slate-600">Mã hợp đồng tự sinh</label><Input value={contractForm.contractNumber} onChange={(event) => setContractForm((current) => ({ ...current, contractNumber: event.target.value }))} /></div></div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500"><span><strong>Tòa:</strong> {selectedApartment?.BuildingName || '—'}</span><span><strong>Tầng:</strong> {selectedApartment?.FloorNumber || '—'}</span><span><strong>Diện tích:</strong> {selectedApartment?.Area || 0} m²</span><span><strong>Kiểu căn:</strong> Căn hộ chung cư</span></div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="border-b border-slate-200 pb-3"><h3 className="flex items-center gap-3 text-lg font-black text-slate-950"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1474f5] text-sm text-white">2</span> Thông Tin Khách Thuê (Đại diện bên B)</h3></div>
            <div className="mt-4 grid gap-4 md:grid-cols-2"><div><label className="mb-1 block text-sm font-bold uppercase text-slate-600">Họ và tên khách thuê *</label><Input list="contract-resident-options" value={contractForm.tenantName} onChange={(event) => { const tenantName = event.target.value; const owner = residents.find((resident) => String(resident.FullName || '').toLowerCase() === tenantName.trim().toLowerCase()); const ownerId = owner ? String(owner.ResidentID) : ''; setContractForm((current) => ({ ...current, ownerId, tenantName, tenantIdentity: owner?.IdentityNumber || owner?.CCCD || current.tenantIdentity, tenantPhone: owner?.Phone || current.tenantPhone, tenantEmail: owner?.Email || current.tenantEmail })); if (ownerId) setSelectedResidentIds((current) => current.includes(ownerId) ? current : [...current, ownerId]); }} placeholder="Ví dụ: Nguyễn Văn An" required /><datalist id="contract-resident-options">{residents.map((resident) => <option key={resident.ResidentID} value={resident.FullName}>{resident.Phone || ''}</option>)}</datalist><p className="mt-1 text-xs text-slate-500">Nhập tên cư dân đã có trong hệ thống để liên kết với hợp đồng.</p></div><div><label className="mb-1 block text-sm font-bold uppercase text-slate-600">Số CCCD / Hộ chiếu *</label><Input icon={IdCard} value={contractForm.tenantIdentity} onChange={(event) => setContractForm((current) => ({ ...current, tenantIdentity: event.target.value }))} placeholder="Ví dụ: 079092003891" required /></div><div><label className="mb-1 block text-sm font-bold uppercase text-slate-600">Số điện thoại di động *</label><Input value={contractForm.tenantPhone} onChange={(event) => setContractForm((current) => ({ ...current, tenantPhone: event.target.value }))} placeholder="09xx xxx xxx" required /></div><div><label className="mb-1 block text-sm font-bold uppercase text-slate-600">Email nhận hóa đơn & thông báo</label><Input value={contractForm.tenantEmail} onChange={(event) => setContractForm((current) => ({ ...current, tenantEmail: event.target.value }))} placeholder="cudan@gmail.com" /></div></div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="border-b border-slate-200 pb-3"><h3 className="flex items-center gap-3 text-lg font-black text-slate-950"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1474f5] text-sm text-white">3</span> Thời Hạn Thuê & Điều Kiện Tài Chính</h3></div>
            <div className="mt-4 grid gap-4 md:grid-cols-3"><div><label className="mb-1 block text-sm font-bold uppercase text-slate-600">Ngày bắt đầu hiệu lực</label><Input icon={CalendarDays} type="date" value={contractForm.startDate} onChange={(event) => { const startDate = event.target.value; setContractForm((current) => { const date = new Date(startDate); date.setMonth(date.getMonth() + Number(current.contractTermMonths || 12)); date.setDate(date.getDate() - 1); return { ...current, startDate, endDate: date.toISOString().slice(0, 10) }; }); }} required /></div><div><label className="mb-1 block text-sm font-bold uppercase text-slate-600">Thời hạn thuê (tháng)</label><div className="flex gap-2">{[6, 12, 24].map((months) => <button key={months} type="button" onClick={() => setContractForm((current) => { const date = new Date(current.startDate); date.setMonth(date.getMonth() + months); date.setDate(date.getDate() - 1); return { ...current, contractTermMonths: months, endDate: date.toISOString().slice(0, 10) }; })} className={`flex-1 rounded-xl border px-2 py-2.5 text-sm font-bold ${Number(contractForm.contractTermMonths) === months ? 'border-[#1474f5] bg-[#1474f5] text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{months} tháng</button>)}</div></div><div><label className="mb-1 block text-sm font-bold uppercase text-slate-600">Ngày kết thúc dự kiến</label><Input type="date" value={contractForm.endDate} onChange={(event) => setContractForm((current) => ({ ...current, endDate: event.target.value }))} required /></div><div><label className="mb-1 block text-sm font-bold uppercase text-slate-600">Tiền thuê hàng tháng (VNĐ) *</label><Input type="number" min="1" step="1000" value={contractForm.rent} onChange={(event) => setContractForm((current) => ({ ...current, rent: event.target.value }))} required /><p className="mt-1 text-sm text-slate-500">{formatMoney(contractForm.rent)}/tháng</p></div><div><label className="mb-1 block text-sm font-bold uppercase text-slate-600">Tiền đặt cọc bảo đảm (VNĐ)</label><select value={contractForm.depositMonths} onChange={(event) => setContractForm((current) => ({ ...current, depositMonths: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="1">{formatMoney(Number(contractForm.rent) || 0)} (1 tháng cọc)</option><option value="2">{formatMoney((Number(contractForm.rent) || 0) * 2)} (2 tháng cọc)</option></select></div><div><label className="mb-1 block text-sm font-bold uppercase text-slate-600">Kỳ thanh toán</label><select value={contractForm.paymentCycleMonths} onChange={(event) => setContractForm((current) => ({ ...current, paymentCycleMonths: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="1">Hàng tháng (trước ngày 15)</option><option value="3">3 tháng/lần</option></select></div></div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3"><div><h3 className="flex items-center gap-3 text-lg font-black text-slate-950"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1474f5] text-sm text-white">4</span> Danh Mục Bàn Giao Thiết Bị (Tivi, Tủ lạnh, Máy lạnh…)</h3><p className="mt-1 text-sm text-slate-500">Cư dân sẽ tra cứu được danh mục thiết bị cụ thể trên giao diện căn hộ của họ.</p></div><Button type="button" variant="secondary" onClick={() => { const next = DEFAULT_EQUIPMENT.find((item) => !contractEquipment.some((current) => current.id === item.id)); if (next) setContractEquipment((current) => [...current, next]); else if (flash) flash('ℹ️ Danh mục mẫu đã được thêm đầy đủ.'); }}><Plus size={16} /> Thêm thiết bị</Button></div>
            <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="p-2">#</th><th className="p-2">Tên thiết bị / đồ điện</th><th className="p-2">Phân loại</th><th className="p-2">Hãng / Model</th><th className="p-2">Vị trí</th><th className="p-2">Tình trạng bàn giao</th></tr></thead><tbody>{contractEquipment.map((item, index) => <tr key={`${item.id}-${index}`} className="border-b border-slate-100"><td className="p-2">{index + 1}</td><td className="p-2 font-semibold">{item.name}</td><td className="p-2"><Badge tone="slate">{item.category}</Badge></td><td className="p-2">{item.brand} · {item.model}</td><td className="p-2">{item.location}</td><td className="p-2 text-emerald-700"><CircleCheck size={14} className="mr-1 inline" /> {item.condition}</td></tr>)}</tbody></table></div>
          </section>
        </form>
      </SampleModal>

      <Modal open={buildingModalOpen} title={editingBuilding ? 'Sửa tòa nhà' : 'Thêm tòa nhà'} description="Tòa nhà sẽ có các tầng mặc định theo số tầng nhập vào." onClose={() => setBuildingModalOpen(false)}>
        <form className="space-y-4" onSubmit={saveBuilding}><div><label className="mb-1 block text-sm font-semibold text-slate-700">Khu vực *</label><select value={buildingForm.areaId} onChange={(event) => setBuildingForm((current) => ({ ...current, areaId: event.target.value }))} disabled={Boolean(editingBuilding)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" required><option value="">Chọn khu vực</option>{areas.map((area) => <option key={area.AreaID} value={area.AreaID}>{area.AreaName}</option>)}</select></div><div><label className="mb-1 block text-sm font-semibold text-slate-700">Tên tòa nhà *</label><Input value={buildingForm.buildingName} onChange={(event) => setBuildingForm((current) => ({ ...current, buildingName: event.target.value }))} placeholder="Tòa A" required /></div><div><label className="mb-1 block text-sm font-semibold text-slate-700">Số tầng *</label><Input type="number" min="1" max="100" value={buildingForm.numberOfFloors} onChange={(event) => setBuildingForm((current) => ({ ...current, numberOfFloors: event.target.value }))} required /></div><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setBuildingModalOpen(false)}>Hủy</Button><Button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu tòa nhà'}</Button></div></form>
      </Modal>

      <Modal
        open={apartmentModalOpen}
        title={editingApartment ? `Cập nhật thông tin căn hộ ${editingApartment.ApartmentCode || ''}` : 'Thêm căn hộ'}
        description={editingApartment ? 'Cập nhật trạng thái phòng, khách thuê và giá thuê.' : 'Tòa nhà mới sẽ dùng các trường quản trị căn hộ bên dưới.'}
        onClose={() => setApartmentModalOpen(false)}
      >
        <form className="space-y-4" onSubmit={saveApartment}>
          {editingApartment ? (
            <>
              <div>
                <label className="mb-1 block text-sm font-semibold uppercase tracking-wide text-slate-600">Trạng thái phòng *</label>
                <select value={apartmentForm.statusId} onChange={(event) => setApartmentForm((current) => ({ ...current, statusId: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" required>
                  {statuses.map((status) => <option key={status.StatusID} value={status.StatusID}>{status.StatusName}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold uppercase tracking-wide text-slate-600">Tên khách thuê</label>
                <Input value={apartmentForm.tenantName} onChange={(event) => setApartmentForm((current) => ({ ...current, tenantName: event.target.value }))} placeholder="Nguyễn Văn An" disabled={!editingApartment.CurrentContract} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold uppercase tracking-wide text-slate-600">Số điện thoại liên hệ</label>
                <Input value={apartmentForm.tenantPhone} onChange={(event) => setApartmentForm((current) => ({ ...current, tenantPhone: event.target.value }))} placeholder="098 777 666" disabled={!editingApartment.CurrentContract} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold uppercase tracking-wide text-slate-600">Giá thuê (VND/tháng)</label>
                <Input type="number" min="0" step="1000" value={apartmentForm.rent} onChange={(event) => setApartmentForm((current) => ({ ...current, rent: event.target.value }))} placeholder="12000000" disabled={!editingApartment.CurrentContract} />
              </div>
              {!editingApartment.CurrentContract && <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">Phòng chưa có hợp đồng hiệu lực. Hãy dùng “Tạo hợp đồng” để nhập khách thuê và giá thuê.</p>}
            </>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Tòa nhà *</label>
                <select value={apartmentForm.buildingId} onChange={(event) => { setApartmentForm((current) => ({ ...current, buildingId: event.target.value, floorId: '' })); loadFloors(event.target.value); }} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" required>
                  <option value="">Chọn tòa nhà</option>
                  {buildings.map((building) => <option key={building.BuildingID} value={building.BuildingID}>{building.BuildingName}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Tầng *</label>
                <select value={apartmentForm.floorId} onChange={(event) => setApartmentForm((current) => ({ ...current, floorId: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" required>
                  <option value="">Chọn tầng</option>
                  {(apartmentForm.buildingId === selectedBuildingId ? floors : []).map((floor) => <option key={floor.FloorID} value={floor.FloorID}>Tầng {floor.FloorNumber}</option>)}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-1 block text-sm font-semibold text-slate-700">Mã căn hộ *</label><Input value={apartmentForm.apartmentCode} onChange={(event) => setApartmentForm((current) => ({ ...current, apartmentCode: event.target.value }))} placeholder="A.101" required /></div>
                <div><label className="mb-1 block text-sm font-semibold text-slate-700">Diện tích (m²) *</label><Input type="number" min="1" step="0.01" value={apartmentForm.area} onChange={(event) => setApartmentForm((current) => ({ ...current, area: event.target.value }))} required /></div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Trạng thái *</label>
                <select value={apartmentForm.statusId} onChange={(event) => setApartmentForm((current) => ({ ...current, statusId: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" required>
                  {statuses.map((status) => <option key={status.StatusID} value={status.StatusID}>{status.StatusName}</option>)}
                </select>
              </div>
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setApartmentModalOpen(false)}>Hủy</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : editingApartment ? 'Lưu thay đổi' : 'Lưu căn hộ'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
