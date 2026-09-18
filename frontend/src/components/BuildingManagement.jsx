// src/pages/BuildingManagement.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, Plus, Edit, Trash2, RefreshCw, 
  Layers, Home, ChevronRight, X, CheckCircle2,
  Search, AlertCircle, Save, ArrowLeft
} from 'lucide-react';
import { apartmentAPI, contractAPI, residentAPI, invoiceAPI, utilityAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';

export default function BuildingManagement({ flash }) {
  const FIXED_MONTHLY_RENT = 7500000;

  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [schematicOpen, setSchematicOpen] = useState(false);
  const [schematicBuilding, setSchematicBuilding] = useState(null);
  const [buildingApartments, setBuildingApartments] = useState([]);
  const [selectedApartmentDetails, setSelectedApartmentDetails] = useState(null);
  const [selectedApartmentResidents, setSelectedApartmentResidents] = useState(null);
  const [billingInfo, setBillingInfo] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [tickingMeters, setTickingMeters] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [meterModalOpen, setMeterModalOpen] = useState(false);
  const [meterForm, setMeterForm] = useState({ electricNewIndex: '', waterNewIndex: '' });
  const [meterSaving, setMeterSaving] = useState(false);
  const [finalizingInvoice, setFinalizingInvoice] = useState(false);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [contractMode, setContractMode] = useState('create'); // 'create' | 'renew'
  const [contractLoading, setContractLoading] = useState(false);
  const [contractForm, setContractForm] = useState({
    apartmentId: '',
    ownerId: '',
    contractNumber: '',
    signDate: new Date().toISOString().split('T')[0],
    startDate: '',
    endDate: '',
    deposit: '',
    rent: FIXED_MONTHLY_RENT,
    contractTermMonths: '',
    depositMonths: 1,
    paymentCycleMonths: 1,
    monthlyBillingDay: 10,
    residents: []
  });
  const [signedContractImageFile, setSignedContractImageFile] = useState(null);
  const [allResidents, setAllResidents] = useState([]);
  const [residentSearch, setResidentSearch] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('buildings'); // 'buildings' | 'floors'
  const [form, setForm] = useState({
    areaId: '',
    buildingName: '',
    numberOfFloors: '',
    floorNumber: '',
    buildingId: ''
  });

  const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')} VND`;
  const getInvoiceWorkflow = (invoice) => invoice?.WorkflowStatus || (invoice?.IsPaid ? 'PAID' : 'WAITING_PAYMENT');
  const getWorkflowBadgeTone = (workflow) => {
    if (workflow === 'PAID') return 'green';
    if (workflow === 'DRAFT') return 'amber';
    return 'blue';
  };
  const getWorkflowLabel = (workflow) => ({
    DRAFT: 'Nháp',
    WAITING_PAYMENT: 'Chờ thanh toán',
    PAID: 'Đã thanh toán'
  }[workflow] || 'Chưa thanh toán');
  const findReading = (key) => (billingInfo?.meterReadings || []).find((reading) => reading.key === key) || null;
  const readingAmount = (reading, newValue) => {
    const next = Number(newValue);
    if (!reading || !Number.isFinite(next) || next < Number(reading.oldIndex || 0)) return 0;
    const qty = next - Number(reading.oldIndex || 0);
    return Math.round(qty * Number(reading.averageUnitPrice || 0));
  };

  const formatVnd = (value) => Number(value || 0).toLocaleString('vi-VN');
  const addMonthsToDate = (dateValue, months) => {
    if (!dateValue || !months) return '';
    const date = new Date(dateValue);
    date.setMonth(date.getMonth() + Number(months));
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  };
  const updateContractTerm = (months) => {
    setContractForm((prev) => ({
      ...prev,
      contractTermMonths: months,
      endDate: months ? addMonthsToDate(prev.startDate, months) : prev.endDate
    }));
  };
  const updateContractStartDate = (startDate) => {
    setContractForm((prev) => ({
      ...prev,
      startDate,
      endDate: prev.contractTermMonths ? addMonthsToDate(startDate, prev.contractTermMonths) : prev.endDate
    }));
  };

  const loadApartmentBilling = async (apartmentId) => {
    setBillingLoading(true);
    try {
      const res = await invoiceAPI.getApartmentCurrent(apartmentId);
      setBillingInfo(res?.data || null);
    } catch (error) {
      console.error('Error loading apartment billing:', error);
      setBillingInfo(null);
      if (flash) flash('Không thể tải hóa đơn hiện tại của căn hộ');
    } finally {
      setBillingLoading(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [buildingsRes, floorsRes, areasRes] = await Promise.all([
        apartmentAPI.getBuildings(),
        apartmentAPI.getFloors(),
        apartmentAPI.getAreas()
      ]);
      
      console.log('📊 Buildings:', buildingsRes);
      console.log('📊 Floors:', floorsRes);
      console.log('📊 Areas:', areasRes);
      
      setBuildings(buildingsRes?.data || buildingsRes || []);
      setFloors(floorsRes?.data || floorsRes || []);
      setAreas(areasRes?.data || areasRes || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải dữ liệu'));
    } finally {
      setLoading(false);
    }
  }, [flash]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openSchematic = async (building) => {
    try {
      setSchematicBuilding(building);
      // lấy tất cả căn hộ của tòa
      const res = await apartmentAPI.getAll('', '', 1, 999, building.BuildingID);
      const apartments = res?.data || [];
      const normalizedApartments = apartments.map((apt) => {
        let currentContract = apt.CurrentContract;
        if (typeof currentContract === 'string' && currentContract) {
          try {
            currentContract = JSON.parse(currentContract);
          } catch (error) {
            console.error('Failed to parse CurrentContract JSON:', error, currentContract);
          }
        }
        return { ...apt, CurrentContract: currentContract };
      });
      setBuildingApartments(normalizedApartments);
      setSchematicOpen(true);
    } catch (error) {
      console.error('Error loading apartments for schematic:', error);
      if (flash) flash('❌ Không thể tải sơ đồ tòa nhà');
    }
  };

  const handleShowResidents = async (apartmentId) => {
    try {
      const res = await apartmentAPI.getById(apartmentId);
      setSelectedApartmentResidents(res?.data?.CurrentResidents || []);
    } catch (error) {
      console.error('Error loading residents:', error);
      setSelectedApartmentResidents([]);
    }
  };

  const openContractModal = async (mode, apartment) => {
    try {
      setContractMode(mode);
      setSelectedApartmentDetails(apartment);

      const isRenew = mode === 'renew' && apartment.CurrentContract;
      const today = new Date().toISOString().split('T')[0];
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const depositMonths = isRenew
        ? (apartment.CurrentContract.DepositMonths || Math.max(1, Math.min(2, Math.round((Number(apartment.CurrentContract.Deposit || 0) / FIXED_MONTHLY_RENT) || 1))))
        : 1;
      const initialForm = {
        contractId: isRenew ? apartment.CurrentContract.ContractID : null,
        apartmentId: apartment.ApartmentID,
        ownerId: isRenew ? apartment.CurrentContract.OwnerID || '' : '',
        contractNumber: isRenew
          ? apartment.CurrentContract.ContractNumber
          : `HD-${apartment.ApartmentCode}-${new Date().toISOString().slice(0,10).replace(/-/g,'')}`,
        signDate: isRenew
          ? new Date(apartment.CurrentContract.SignDate).toISOString().split('T')[0]
          : today,
        startDate: isRenew
          ? new Date(apartment.CurrentContract.StartDate).toISOString().split('T')[0]
          : today,
        endDate: isRenew
          ? new Date(apartment.CurrentContract.EndDate).toISOString().split('T')[0]
          : nextMonth,
        deposit: depositMonths * FIXED_MONTHLY_RENT,
        rent: FIXED_MONTHLY_RENT,
        contractTermMonths: isRenew ? apartment.CurrentContract.ContractTermMonths || '' : '',
        depositMonths,
        paymentCycleMonths: isRenew ? apartment.CurrentContract.PaymentCycleMonths || 1 : 1,
        monthlyBillingDay: 10,
        residents: isRenew ? [] : []
      };

      setContractForm(initialForm);
      const residentsRes = await residentAPI.getAll('', 1, 999);
      const residentsList = residentsRes?.data || residentsRes || [];
      setAllResidents(Array.isArray(residentsList) ? residentsList : []);
      setResidentSearch('');
      setContractModalOpen(true);
    } catch (error) {
      console.error('Error opening contract modal:', error);
      if (flash) flash('❌ Không thể mở modal hợp đồng');
    }
  };

  const closeContractModal = () => {
    setContractModalOpen(false);
    setContractForm({
      contractId: null,
      apartmentId: '',
      ownerId: '',
      contractNumber: '',
      signDate: new Date().toISOString().split('T')[0],
      startDate: '',
      endDate: '',
      deposit: '',
      rent: FIXED_MONTHLY_RENT,
      contractTermMonths: '',
      depositMonths: 1,
      paymentCycleMonths: 1,
      monthlyBillingDay: 10,
      residents: []
    });
    setSignedContractImageFile(null);
    setSelectedApartmentDetails(null);
    setAllResidents([]);
    setResidentSearch('');
  };

  const handleContractResidentSelect = (resident) => {
    if (contractForm.residents.find((r) => r.ResidentID === resident.ResidentID)) {
      if (flash) flash('⚠️ Cư dân đã được chọn');
      return;
    }

    const isOwner = !contractForm.ownerId;
    const newResident = {
      ResidentID: resident.ResidentID,
      FullName: resident.FullName,
      Phone: resident.Phone,
      Relationship: isOwner ? 'Chủ hộ' : 'Người ở',
      moveInDate: contractForm.startDate || new Date().toISOString().split('T')[0]
    };

    setContractForm((prev) => ({
      ...prev,
      ownerId: prev.ownerId || resident.ResidentID,
      residents: [...prev.residents, newResident]
    }));
  };

  const handleRemoveContractResident = (residentId) => {
    setContractForm((prev) => {
      const updatedResidents = prev.residents.filter((r) => r.ResidentID !== residentId);
      let newOwnerId = prev.ownerId;
      const removedOwner = prev.ownerId === residentId;

      if (removedOwner) {
        const nextOwner = updatedResidents[0];
        if (nextOwner) {
          newOwnerId = nextOwner.ResidentID;
          updatedResidents[0] = { ...nextOwner, Relationship: 'Chủ hộ' };
        } else {
          newOwnerId = '';
        }
      }

      return {
        ...prev,
        ownerId: newOwnerId,
        residents: updatedResidents
      };
    });
  };

  const handleSubmitContract = async (e) => {
    e.preventDefault();
    if (!contractForm.apartmentId || !contractForm.startDate || !contractForm.endDate || !contractForm.rent) {
      if (flash) flash('⚠️ Vui lòng điền đầy đủ thông tin hợp đồng');
      return;
    }

    setContractLoading(true);
    try {
      if (contractMode === 'renew' && contractForm.contractId) {
        await contractAPI.update(contractForm.contractId, {
          endDate: contractForm.endDate,
          rent: FIXED_MONTHLY_RENT,
          deposit: Number(contractForm.depositMonths || 1) * FIXED_MONTHLY_RENT,
          contractTermMonths: contractForm.contractTermMonths || null,
          depositMonths: contractForm.depositMonths,
          paymentCycleMonths: contractForm.paymentCycleMonths,
          monthlyBillingDay: 10,
          statusId: 2
        });
        if (signedContractImageFile) {
          await contractAPI.uploadSignedImage(contractForm.contractId, signedContractImageFile);
        }
        if (flash) flash('✅ Hợp đồng đã được gia hạn thành công');
      } else {
        if (!contractForm.ownerId || contractForm.residents.length === 0) {
          if (flash) flash('⚠️ Vui lòng chọn chủ hộ cho hợp đồng');
          setContractLoading(false);
          return;
        }

        const createResult = await contractAPI.create({
          apartmentId: contractForm.apartmentId,
          ownerId: contractForm.ownerId,
          contractNumber: contractForm.contractNumber,
          signDate: contractForm.signDate,
          startDate: contractForm.startDate,
          endDate: contractForm.endDate,
          deposit: Number(contractForm.depositMonths || 1) * FIXED_MONTHLY_RENT,
          rent: FIXED_MONTHLY_RENT,
          contractTermMonths: contractForm.contractTermMonths || null,
          depositMonths: contractForm.depositMonths,
          paymentCycleMonths: contractForm.paymentCycleMonths,
          monthlyBillingDay: 10,
          statusId: 2,
          residents: contractForm.residents.map((resident) => ({
            residentId: resident.ResidentID,
            relationship: resident.Relationship || 'Chủ hộ',
            moveInDate: resident.moveInDate || contractForm.startDate
          }))
        });
        const createdContractId = createResult?.data?.contractId;
        if (signedContractImageFile && createdContractId) {
          await contractAPI.uploadSignedImage(createdContractId, signedContractImageFile);
        }
        if (flash) flash('✅ Hợp đồng đã được tạo thành công');
      }
      closeContractModal();
      fetchData();
    } catch (error) {
      console.error('Contract submit error:', error, error.response || error.data || null);
      const errMsg = (error?.data?.message) || (error?.response?.data?.message) || error?.message || 'Không thể lưu hợp đồng';
      if (flash) flash('❌ ' + errMsg);
    } finally {
      setContractLoading(false);
    }
  };

  const handleShowApartmentDetails = async (apartmentId) => {
    try {
      setBillingInfo(null);
      const res = await apartmentAPI.getById(apartmentId);
      setSelectedApartmentDetails(res?.data || null);
      setSelectedApartmentResidents(res?.data?.CurrentResidents || []);
      await loadApartmentBilling(apartmentId);
    } catch (error) {
      console.error('Error loading apartment details:', error);
      if (flash) flash('❌ Không thể tải thông tin căn hộ');
      setSelectedApartmentResidents([]);
    }
  };

  const openMeterModal = () => {
    const electric = findReading('electric');
    const water = findReading('water');
    setMeterForm({
      electricNewIndex: electric?.newIndex ?? '',
      waterNewIndex: water?.newIndex ?? ''
    });
    setMeterModalOpen(true);
  };

  const handleSaveMeterReadings = async () => {
    if (!selectedApartmentDetails?.ApartmentID) return;
    setMeterSaving(true);
    try {
      await invoiceAPI.updateApartmentMeterReadings(selectedApartmentDetails.ApartmentID, {
        invoiceMonth: billingInfo?.month,
        invoiceYear: billingInfo?.year,
        electricNewIndex: meterForm.electricNewIndex,
        waterNewIndex: meterForm.waterNewIndex
      });
      if (flash) flash('Đã cập nhật chỉ số điện/nước');
      setMeterModalOpen(false);
      await loadApartmentBilling(selectedApartmentDetails.ApartmentID);
    } catch (error) {
      console.error('Save meter readings error:', error);
      if (flash) flash(error.message || 'Không thể cập nhật chỉ số điện/nước');
    } finally {
      setMeterSaving(false);
    }
  };

  const handleFinalizeCurrentInvoice = async () => {
    if (!selectedApartmentDetails?.ApartmentID) return;
    setFinalizingInvoice(true);
    try {
      await invoiceAPI.finalizeApartmentCurrent(selectedApartmentDetails.ApartmentID, {
        invoiceMonth: billingInfo?.month,
        invoiceYear: billingInfo?.year
      });
      if (flash) flash('Đã chốt hóa đơn, chuyển sang chờ thanh toán');
      await loadApartmentBilling(selectedApartmentDetails.ApartmentID);
    } catch (error) {
      console.error('Finalize current invoice error:', error);
      if (flash) flash(error.message || 'Không thể chốt hóa đơn');
    } finally {
      setFinalizingInvoice(false);
    }
  };

  const handleDemoTickApartment = async () => {
    if (!selectedApartmentDetails?.ApartmentID) return;
    setTickingMeters(true);
    try {
      const res = await utilityAPI.demoTick(selectedApartmentDetails.ApartmentID);
      if (flash) flash(`Đã demo tăng ${res?.data?.length || 0} đồng hồ`);
      await loadApartmentBilling(selectedApartmentDetails.ApartmentID);
    } catch (error) {
      console.error('Demo tick apartment error:', error);
      if (flash) flash(error.message || 'Không thể mô phỏng tăng chỉ số');
    } finally {
      setTickingMeters(false);
    }
  };

  const handlePayCurrentInvoice = async () => {
    if (!selectedApartmentDetails?.ApartmentID) return;
    setCreatingInvoice(true);
    try {
      const now = new Date();
      await invoiceAPI.payApartmentCurrent(selectedApartmentDetails.ApartmentID, {
        invoiceMonth: now.getMonth() + 1,
        invoiceYear: now.getFullYear()
      });
      if (flash) flash('Đã tạo hóa đơn tổng và thanh toán thành công');
      await loadApartmentBilling(selectedApartmentDetails.ApartmentID);
    } catch (error) {
      console.error('Pay current invoice error:', error);
      if (flash) flash(error.message || 'Không thể thanh toán hóa đơn');
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handleTerminateContract = async () => {
    if (!selectedApartmentDetails?.CurrentContract?.ContractID) {
      if (flash) flash('⚠️ Không có hợp đồng để thanh lý');
      return;
    }
    if (!confirm('Bạn có chắc muốn thanh lý hợp đồng này?')) return;

    setContractLoading(true);
    try {
      await contractAPI.update(selectedApartmentDetails.CurrentContract.ContractID, {
        statusId: 4
      });
      if (flash) flash('✅ Hợp đồng đã được thanh lý');
      setSelectedApartmentDetails(null);
      setSelectedApartmentResidents(null);
      fetchData();
    } catch (error) {
      console.error('Terminate contract error:', error);
      const errMsg = (error?.data?.message) || (error?.response?.data?.message) || error?.message || 'Không thể thanh lý hợp đồng';
      if (flash) flash('❌ ' + errMsg);
    } finally {
      setContractLoading(false);
    }
  };

  const filteredResidents = allResidents.filter((resident) => {
    const q = residentSearch.toLowerCase();
    return (
      resident.FullName?.toLowerCase().includes(q) ||
      resident.Phone?.includes(q) ||
      resident.Email?.toLowerCase().includes(q)
    );
  });

  const getApartmentActionLabel = (apartment) => {
    if (apartment.StatusID === 1 || apartment.Status === 'Còn trống') {
      return 'Tạo hợp đồng';
    }
    return 'Gia hạn / Thanh lý';
  };

  const handleActionButton = (apartment) => {
    if (apartment.StatusID === 1 || apartment.Status === 'Còn trống') {
      openContractModal('create', apartment);
    } else {
      openContractModal('renew', apartment);
    }
  };

  const handleCreateBuilding = async (e) => {
    e.preventDefault();
    try {
      await apartmentAPI.createBuilding({
        areaId: parseInt(form.areaId),
        buildingName: form.buildingName,
        numberOfFloors: parseInt(form.numberOfFloors)
      });
      if (flash) flash('✅ Tạo tòa nhà thành công!');
      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Create building error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tạo tòa nhà'));
    }
  };

  const handleCreateFloor = async (e) => {
    e.preventDefault();
    try {
      await apartmentAPI.createFloor({
        buildingId: parseInt(form.buildingId),
        floorNumber: parseInt(form.floorNumber)
      });
      if (flash) flash('✅ Tạo tầng thành công!');
      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Create floor error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tạo tầng'));
    }
  };

  const handleDeleteBuilding = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa tòa nhà này? Các tầng và căn hộ liên quan sẽ bị ảnh hưởng.')) return;
    try {
      await apartmentAPI.deleteBuilding(id);
      if (flash) flash('✅ Xóa tòa nhà thành công!');
      fetchData();
    } catch (error) {
      console.error('Delete building error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể xóa tòa nhà'));
    }
  };

  const handleDeleteFloor = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa tầng này?')) return;
    try {
      await apartmentAPI.deleteFloor(id);
      if (flash) flash('✅ Xóa tầng thành công!');
      fetchData();
    } catch (error) {
      console.error('Delete floor error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể xóa tầng'));
    }
  };

  const resetForm = () => {
    setForm({
      areaId: '',
      buildingName: '',
      numberOfFloors: '',
      floorNumber: '',
      buildingId: ''
    });
    setSelectedBuilding(null);
    setSelectedFloor(null);
  };

  const openCreateBuildingModal = () => {
    resetForm();
    setModalMode('building');
    setModalOpen(true);
  };

  const openCreateFloorModal = () => {
    resetForm();
    setModalMode('floor');
    setModalOpen(true);
  };

  const getAreaName = (areaId) => {
    const area = areas.find(a => a.AreaID === areaId);
    return area?.AreaName || 'Không xác định';
  };

  // Filter buildings by search
  const filteredBuildings = useMemo(() => {
    const q = search.toLowerCase();
    return buildings.filter(b => 
      (b.BuildingName || '').toLowerCase().includes(q) ||
      (b.AreaName || '').toLowerCase().includes(q)
    );
  }, [buildings, search]);

  // Filter floors by search
  const filteredFloors = useMemo(() => {
    const q = search.toLowerCase();
    return floors.filter(f => 
      (f.BuildingName || '').toLowerCase().includes(q) ||
      String(f.FloorNumber).includes(q)
    );
  }, [floors, search]);

  // Stats
  const stats = useMemo(() => {
    const totalBuildings = buildings.length;
    const totalFloors = floors.length;
    const totalAreas = areas.length;
    return { totalBuildings, totalFloors, totalAreas };
  }, [buildings, floors, areas]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Quản lý tòa nhà & tầng</h3>
            <p className="text-sm text-slate-500">
              Quản lý cấu trúc tòa nhà, số tầng và căn hộ
              <span className="ml-2 text-[#635bff] font-semibold">
                {stats.totalBuildings} tòa nhà / {stats.totalFloors} tầng
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-48"
            />
            <Button onClick={openCreateBuildingModal}>
              <Plus size={16} /> Thêm tòa nhà
            </Button>
            <Button variant="secondary" onClick={openCreateFloorModal}>
              <Layers size={16} /> Thêm tầng
            </Button>
            <Button variant="secondary" onClick={fetchData} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={Building2} label="Tòa nhà" value={stats.totalBuildings} hint="Đang quản lý" />
        <StatCard icon={Layers} label="Tầng" value={stats.totalFloors} hint="Tổng số tầng" />
        <StatCard icon={Home} label="Khu vực" value={stats.totalAreas} hint="Khu vực quản lý" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('buildings')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === 'buildings'
              ? 'border-[#635bff] text-[#635bff]'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Building2 size={16} /> Tòa nhà
        </button>
        <button
          onClick={() => setActiveTab('floors')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === 'floors'
              ? 'border-[#635bff] text-[#635bff]'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Layers size={16} /> Tầng
        </button>
      </div>

      {/* TAB: Buildings */}
      {activeTab === 'buildings' && (
        <>
          {loading ? (
            <Card className="p-8 text-center">
              <RefreshCw size={32} className="animate-spin text-[#635bff] mx-auto" />
              <p className="mt-3 font-bold text-slate-900">Đang tải danh sách tòa nhà...</p>
            </Card>
          ) : filteredBuildings.length === 0 ? (
            <Card className="p-8 text-center">
              <Building2 size={48} className="text-slate-300 mx-auto" />
              <h3 className="mt-3 text-xl font-bold text-slate-900">Chưa có tòa nhà</h3>
              <p className="text-sm text-slate-500">Nhấn "Thêm tòa nhà" để tạo mới</p>
              <Button className="mt-4" onClick={openCreateBuildingModal}>
                <Plus size={16} /> Thêm tòa nhà
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredBuildings.map(building => (
                <Card key={building.BuildingID} className="group hover:border-[#635bff]/30 transition-all">
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge tone="blue" className="mb-2">{building.AreaName || getAreaName(building.AreaID)}</Badge>
                        <h3 className="text-xl font-bold text-slate-950 group-hover:text-[#635bff]">
                          {building.BuildingName}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {building.NumberOfFloors} tầng · {building.TotalApartments || 0} căn hộ
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {building.OccupiedApartments || 0} căn đã thuê
                        </p>
                      </div>
                      <div className="flex gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => openSchematic(building)}>
                                    <ChevronRight size={16} className="text-slate-400 hover:text-slate-700" />
                                  </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setSelectedBuilding(building);
                            setForm({
                              ...form,
                              buildingId: building.BuildingID,
                              areaId: building.AreaID,
                              buildingName: building.BuildingName,
                              numberOfFloors: building.NumberOfFloors
                            });
                            setModalMode('building');
                            setModalOpen(true);
                          }}
                        >
                          <Edit size={16} className="text-slate-400 hover:text-slate-700" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteBuilding(building.BuildingID)}
                        >
                          <Trash2 size={16} className="text-slate-400 hover:text-rose-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB: Floors */}
      {activeTab === 'floors' && (
        <>
          {loading ? (
            <Card className="p-8 text-center">
              <RefreshCw size={32} className="animate-spin text-[#635bff] mx-auto" />
              <p className="mt-3 font-bold text-slate-900">Đang tải danh sách tầng...</p>
            </Card>
          ) : filteredFloors.length === 0 ? (
            <Card className="p-8 text-center">
              <Layers size={48} className="text-slate-300 mx-auto" />
              <h3 className="mt-3 text-xl font-bold text-slate-900">Chưa có tầng</h3>
              <p className="text-sm text-slate-500">Nhấn "Thêm tầng" để tạo mới</p>
              <Button className="mt-4" onClick={openCreateFloorModal}>
                <Plus size={16} /> Thêm tầng
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredFloors.map(floor => (
                <Card key={floor.FloorID} className="group hover:border-[#635bff]/30 transition-all">
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge tone="slate" className="mb-2">{floor.BuildingName}</Badge>
                        <h3 className="text-2xl font-black text-slate-950 group-hover:text-[#635bff]">
                          Tầng {floor.FloorNumber}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {floor.TotalApartments || 0} căn hộ
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteFloor(floor.FloorID)}
                      >
                        <Trash2 size={16} className="text-slate-400 hover:text-rose-600" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal - Create/Edit Building or Floor */}
      <Modal
        open={modalOpen}
        title={modalMode === 'building' ? (selectedBuilding ? 'Cập nhật tòa nhà' : 'Thêm tòa nhà mới') : 'Thêm tầng mới'}
        description={modalMode === 'building' ? 'Quản lý thông tin tòa nhà' : 'Thêm tầng cho tòa nhà'}
        onClose={() => setModalOpen(false)}
      >
        {modalMode === 'building' ? (
          <form onSubmit={handleCreateBuilding} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Khu vực *</label>
              <select
                value={form.areaId}
                onChange={(e) => setForm({...form, areaId: e.target.value})}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#635bff]"
                required
              >
                <option value="">Chọn khu vực</option>
                {areas.map(a => (
                  <option key={a.AreaID} value={a.AreaID}>{a.AreaName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Tên tòa nhà *</label>
              <Input
                value={form.buildingName}
                onChange={(e) => setForm({...form, buildingName: e.target.value})}
                placeholder="Block A"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Số tầng *</label>
              <Input
                type="number"
                value={form.numberOfFloors}
                onChange={(e) => setForm({...form, numberOfFloors: e.target.value})}
                placeholder="25"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Hủy</Button>
              <Button type="submit">
                {selectedBuilding ? 'Cập nhật' : 'Thêm tòa nhà'}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCreateFloor} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Tòa nhà *</label>
              <select
                value={form.buildingId}
                onChange={(e) => setForm({...form, buildingId: e.target.value})}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#635bff]"
                required
              >
                <option value="">Chọn tòa nhà</option>
                {buildings.map(b => (
                  <option key={b.BuildingID} value={b.BuildingID}>{b.BuildingName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Số tầng *</label>
              <Input
                type="number"
                value={form.floorNumber}
                onChange={(e) => setForm({...form, floorNumber: e.target.value})}
                placeholder="1"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Hủy</Button>
              <Button type="submit">Thêm tầng</Button>
            </div>
          </form>
        )}
      </Modal>
      {/* Modal: Sơ đồ tòa nhà */}
      <Modal
        open={schematicOpen}
        title={schematicBuilding ? `Sơ đồ: ${schematicBuilding.BuildingName}` : 'Sơ đồ tòa nhà'}
        description={schematicBuilding ? `Tổng tầng: ${schematicBuilding.NumberOfFloors || 5}` : ''}
        onClose={() => { setSchematicOpen(false); setSelectedApartmentResidents(null); }}
        size="lg"
      >
        <div className="space-y-4">
          {(() => {
            const floorsCount = schematicBuilding?.NumberOfFloors || 5;
            const rows = [];
            for (let floor = floorsCount; floor >= 1; floor--) {
              const apartmentsOnFloor = buildingApartments.filter(a => Number(a.FloorNumber) === floor).sort((x,y)=> (x.ApartmentCode||'').localeCompare(y.ApartmentCode||''));
              const cols = [];
              for (let col = 1; col <= 5; col++) {
                const apt = apartmentsOnFloor[col-1] || null;
                cols.push(
                  <div key={`f${floor}c${col}`} className="p-1">
                    <button
                      onClick={() => { if (apt) handleShowApartmentDetails(apt.ApartmentID); }}
                      className={`w-28 h-20 rounded-lg border flex flex-col items-center justify-center text-sm font-medium ${apt ? (apt.Status === 'Đang ở' || apt.StatusID === 2 ? 'bg-emerald-100 text-emerald-800' : (apt.Status === 'Còn trống' || apt.StatusID === 1 ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700')) : 'bg-slate-50 text-slate-400'}`}
                    >
                      <div className="text-xs">{apt ? apt.ApartmentCode : `T${floor}-P${col}`}</div>
                      <div className="text-[11px] mt-1">{apt ? (apt.Status || 'Chưa rõ') : 'Trống'}</div>
                    </button>
                  </div>
                );
              }
              rows.push(
                <div key={`floor-${floor}`} className="flex items-center gap-2">
                  <div className="w-8 text-sm font-semibold">T{floor}</div>
                  <div className="flex">{cols}</div>
                </div>
              );
            }
            return rows;
          })()}
        </div>
      </Modal>

      {/* Modal: Chi tiết căn hộ và thao tác hợp đồng */}
      <Modal
        open={selectedApartmentDetails !== null}
        title={selectedApartmentDetails ? `Căn hộ ${selectedApartmentDetails.ApartmentCode}` : 'Chi tiết căn hộ'}
        onClose={() => { setSelectedApartmentDetails(null); setBillingInfo(null); }}
        size="lg"
        backdropClassName="bg-slate-950/10"
        backdropBlur={false}
      >
        {selectedApartmentDetails ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-slate-500">Thông tin căn hộ</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Mã căn hộ:</span> {selectedApartmentDetails.ApartmentCode}</div>
                  <div><span className="text-slate-500">Tòa nhà:</span> {selectedApartmentDetails.BuildingName}</div>
                  <div><span className="text-slate-500">Tầng:</span> {selectedApartmentDetails.FloorNumber}</div>
                  <div><span className="text-slate-500">Trạng thái:</span> {selectedApartmentDetails.Status}</div>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Hợp đồng hiện tại</p>
                {selectedApartmentDetails.CurrentContract ? (
                  <div className="mt-2 space-y-2 text-sm">
                    <div><span className="text-slate-500">Số HĐ:</span> {selectedApartmentDetails.CurrentContract.ContractNumber}</div>
                    <div><span className="text-slate-500">Chủ hộ:</span> {selectedApartmentDetails.CurrentContract.OwnerName}</div>
                    <div><span className="text-slate-500">Giá thuê:</span> {selectedApartmentDetails.CurrentContract.Rent ? `${selectedApartmentDetails.CurrentContract.Rent} VND` : 'Chưa có'}</div>
                    <div><span className="text-slate-500">Thời hạn:</span> {selectedApartmentDetails.CurrentContract.StartDate ? `${new Date(selectedApartmentDetails.CurrentContract.StartDate).toLocaleDateString('vi-VN')} → ${new Date(selectedApartmentDetails.CurrentContract.EndDate).toLocaleDateString('vi-VN')}` : 'Chưa có'}</div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 mt-2">Chưa có hợp đồng</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Hóa đơn tháng hiện tại</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Hóa đơn nháp tự tạo theo tháng với tiền nhà 7.500.000 VND + dịch vụ hộ đã đăng ký. Điện/nước chỉ cộng sau khi nhập số mới và chốt hóa đơn.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {getInvoiceWorkflow(billingInfo?.invoice) === 'DRAFT' && (
                    <>
                      <Button variant="secondary" onClick={openMeterModal} disabled={billingLoading}>
                        <Edit size={16} /> Cập nhật chỉ số điện/nước
                      </Button>
                      <Button onClick={handleFinalizeCurrentInvoice} disabled={finalizingInvoice || billingLoading}>
                        <CheckCircle2 size={16} /> {finalizingInvoice ? 'Đang chốt...' : 'Chốt hóa đơn'}
                      </Button>
                    </>
                  )}
                  {getInvoiceWorkflow(billingInfo?.invoice) === 'WAITING_PAYMENT' && (
                    <Button onClick={handlePayCurrentInvoice} disabled={creatingInvoice || billingLoading}>
                      <Plus size={16} /> {creatingInvoice ? 'Đang thanh toán...' : 'Thanh toán'}
                    </Button>
                  )}
                </div>
              </div>

              {billingLoading ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  Đang tải hóa đơn và đồng hồ...
                </div>
              ) : billingInfo ? (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {(billingInfo.meterReadings || []).map((reading) => (
                      <div key={reading.key} className={`rounded-xl border p-3 ${reading.isEntered ? 'border-slate-200 bg-slate-50' : 'border-amber-200 bg-amber-50'}`}>
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-900">{reading.label}</p>
                          <Badge tone={reading.isEntered ? 'green' : 'amber'}>
                            {reading.isEntered ? 'Đã nhập số mới' : 'Chưa nhập số mới'}
                          </Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-600">
                          <div>
                            <p>Số cũ</p>
                            <p className="font-bold text-slate-950">{Number(reading.oldIndex || 0).toLocaleString('vi-VN')}</p>
                          </div>
                          <div>
                            <p>Số mới</p>
                            <p className="font-bold text-slate-950">{reading.isEntered ? Number(reading.newIndex || 0).toLocaleString('vi-VN') : '—'}</p>
                          </div>
                          <div>
                            <p>Tiêu thụ</p>
                            <p className="font-bold text-slate-950">{Number(reading.consumption || 0).toLocaleString('vi-VN')} {reading.unit}</p>
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          Công thức: (số mới - số cũ) x đơn giá bậc thang hiện hành
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-900">Dịch vụ hộ đã đăng ký</p>
                      <Badge tone={(billingInfo.registeredServices || []).length ? 'green' : 'slate'}>
                        {(billingInfo.registeredServices || []).length} dịch vụ
                      </Badge>
                    </div>
                    {(billingInfo.registeredServices || []).length > 0 ? (
                      <div className="mt-2 space-y-2">
                        {(billingInfo.registeredServices || []).map((service) => (
                          <div key={service.RegistrationID} className="flex items-center justify-between text-sm">
                            <span className="text-slate-700">{service.ServiceName} x {service.Quantity || 1}</span>
                            <span className="font-bold text-[#635bff]">{money(Number(service.Price || 0) * Number(service.Quantity || 1))}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">
                        Căn hộ này chưa đăng ký Gym/Hồ bơi hoặc dịch vụ hộ nào đang hiệu lực.
                      </p>
                    )}
                  </div>

                  {billingInfo.invoice ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <div className="flex flex-col justify-between gap-2 bg-slate-50 px-4 py-3 md:flex-row md:items-center">
                        <div>
                          <p className="font-bold text-slate-950">
                            HĐ #{billingInfo.invoice.InvoiceID} - kỳ {billingInfo.invoice.InvoiceMonth}/{billingInfo.invoice.InvoiceYear}
                          </p>
                          <p className="text-xs text-slate-500">
                            Đã thu {money(billingInfo.invoice.PaidAmount)} / còn {money(billingInfo.invoice.RemainingAmount)}
                          </p>
                        </div>
                        <Badge tone={getWorkflowBadgeTone(getInvoiceWorkflow(billingInfo.invoice))}>
                          {getWorkflowLabel(getInvoiceWorkflow(billingInfo.invoice))}
                        </Badge>
                      </div>
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-slate-100">
                          {(billingInfo.invoice.Details || []).map((detail) => (
                            <tr key={detail.InvoiceDetailID}>
                              <td className="px-4 py-2">
                                <p className="font-medium text-slate-900">{detail.Description}</p>
                                <p className="text-xs text-slate-500">{detail.ChargeType}</p>
                              </td>
                              <td className="px-4 py-2 text-right text-slate-600">
                                {Number(detail.Quantity || 0).toLocaleString('vi-VN')} x {money(detail.UnitPrice)}
                              </td>
                              <td className="px-4 py-2 text-right font-bold text-slate-950">{money(detail.Amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50">
                          <tr>
                            <td colSpan="2" className="px-4 py-3 text-right font-bold text-slate-950">Tổng cộng</td>
                            <td className="px-4 py-3 text-right text-lg font-black text-[#635bff]">
                              {money(billingInfo.invoice.TotalAmount)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                      {billingInfo.activeContract
                        ? 'Tháng hiện tại chưa có hóa đơn tổng. Có thể tạo ngay từ dữ liệu đồng hồ hiện tại.'
                        : 'Căn hộ chưa có hợp đồng hiệu lực nên đồng hồ không tăng và chưa thể tạo hóa đơn.'}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  Chưa tải được dữ liệu hóa đơn.
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-500">Danh sách cư dân</p>
              {selectedApartmentResidents && selectedApartmentResidents.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {selectedApartmentResidents.map((r) => (
                    <li key={r.ResidentID} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-semibold text-slate-900">{r.FullName}</div>
                          <div className="text-xs text-slate-500">{r.Phone || 'Chưa có'}</div>
                        </div>
                        {r.Relationship && <Badge tone="blue">{r.Relationship}</Badge>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-2 text-sm text-slate-500">Không có cư dân trong phòng này.</div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              {selectedApartmentDetails.StatusID === 1 || selectedApartmentDetails.Status === 'Còn trống' ? (
                <Button onClick={() => openContractModal('create', selectedApartmentDetails)}>
                  <Plus size={16} /> Tạo hợp đồng
                </Button>
              ) : (
                <>
                  <Button variant="secondary" onClick={() => openContractModal('renew', selectedApartmentDetails)}>
                    <RefreshCw size={16} /> Gia hạn hợp đồng
                  </Button>
                  <Button variant="danger" onClick={handleTerminateContract} disabled={contractLoading}>
                    <Trash2 size={16} /> Thanh lý hợp đồng
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500">Không có dữ liệu căn hộ.</div>
        )}
      </Modal>

      <Modal
        open={meterModalOpen}
        title="Cập nhật chỉ số điện/nước"
        description="Nhập số mới theo đồng hồ thực tế. Hệ thống lấy số mới - số cũ để tính vào hóa đơn nháp."
        onClose={() => setMeterModalOpen(false)}
        size="md"
      >
        <div className="space-y-4">
          {[
            { key: 'electric', field: 'electricNewIndex' },
            { key: 'water', field: 'waterNewIndex' }
          ].map(({ key, field }) => {
            const reading = findReading(key);
            const amount = readingAmount(reading, meterForm[field]);
            return (
              <div key={key} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-950">{reading?.label || key}</p>
                  <Badge tone={reading?.isEntered ? 'green' : 'amber'}>
                    {reading?.isEntered ? 'Đã nhập' : 'Chưa nhập'}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Số cũ</label>
                    <Input value={Number(reading?.oldIndex || 0).toLocaleString('vi-VN')} disabled />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Số mới</label>
                    <Input
                      type="number"
                      step="0.001"
                      min={reading?.oldIndex || 0}
                      value={meterForm[field]}
                      onChange={(e) => setMeterForm((prev) => ({ ...prev, [field]: e.target.value }))}
                      placeholder="Nhập số mới"
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Công thức: ({meterForm[field] || 'số mới'} - {Number(reading?.oldIndex || 0).toLocaleString('vi-VN')}) x đơn giá ≈ {money(amount)}
                </p>
              </div>
            );
          })}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setMeterModalOpen(false)}>Hủy</Button>
            <Button type="button" onClick={handleSaveMeterReadings} disabled={meterSaving}>
              <Save size={16} /> {meterSaving ? 'Đang lưu...' : 'Lưu chỉ số'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={contractModalOpen}
        title={contractMode === 'renew' ? 'Gia hạn hợp đồng' : 'Tạo hợp đồng mới'}
        description={contractMode === 'renew' ? 'Cập nhật thời hạn và giá thuê của hợp đồng hiện tại' : 'Tạo hợp đồng cho căn hộ'}
        onClose={closeContractModal}
        size="lg"
      >
        <form onSubmit={handleSubmitContract} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Mã hợp đồng</label>
              <Input
                value={contractForm.contractNumber}
                onChange={(e) => setContractForm(prev => ({ ...prev, contractNumber: e.target.value }))}
                placeholder="HD-A-1201-20260517"
                required
                disabled={contractMode === 'renew'}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày ký</label>
              <Input
                type="date"
                value={contractForm.signDate}
                onChange={(e) => setContractForm(prev => ({ ...prev, signDate: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Bắt đầu</label>
              <Input
                type="date"
                value={contractForm.startDate}
                onChange={(e) => updateContractStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="block text-sm font-semibold text-slate-700">Kết thúc</label>
                <div className="flex gap-1">
                  {[3, 6, 12].map((months) => (
                    <button
                      key={months}
                      type="button"
                      onClick={() => updateContractTerm(contractForm.contractTermMonths === months ? '' : months)}
                      className={`rounded-lg border px-2 py-1 text-xs font-semibold transition ${
                        contractForm.contractTermMonths === months
                          ? 'border-[#635bff] bg-[#635bff] text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {months} tháng
                    </button>
                  ))}
                </div>
              </div>
              <Input
                type="date"
                value={contractForm.endDate}
                onChange={(e) => setContractForm(prev => ({ ...prev, endDate: e.target.value }))}
                disabled={Boolean(contractForm.contractTermMonths)}
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                Chưa chọn thời hạn thì có thể tự chọn ngày kết thúc. Chọn 3/6/12 tháng thì hệ thống tự tính ngày kết thúc.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Giá thuê / tháng</label>
              <Input
                value={`${formatVnd(FIXED_MONTHLY_RENT)} VNĐ`}
                readOnly
                required
              />
              <p className="mt-1 text-xs text-slate-500">Giá thuê được gán cố định cho tất cả phòng.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Tiền cọc</label>
              <div className="flex gap-2">
                {[1, 2].map((months) => (
                  <button
                    key={months}
                    type="button"
                    onClick={() => setContractForm(prev => ({
                      ...prev,
                      depositMonths: months,
                      deposit: months * FIXED_MONTHLY_RENT
                    }))}
                    className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                      Number(contractForm.depositMonths) === months
                        ? 'border-[#635bff] bg-[#635bff] text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Cọc {months} tháng
                  </button>
                ))}
              </div>
              <p className="mt-1 text-sm font-semibold text-[#635bff]">
                {formatVnd(Number(contractForm.depositMonths || 1) * FIXED_MONTHLY_RENT)} VNĐ
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Chu kỳ đóng tiền</label>
              <div className="flex gap-2">
                {[1, 3].map((months) => (
                  <button
                    key={months}
                    type="button"
                    onClick={() => setContractForm(prev => ({ ...prev, paymentCycleMonths: months }))}
                    className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                      Number(contractForm.paymentCycleMonths) === months
                        ? 'border-[#635bff] bg-[#635bff] text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {months} tháng / lần
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày chốt tiền hàng tháng</label>
              <Input value="Ngày 10 hằng tháng" readOnly />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Ảnh hợp đồng đã ký</label>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 hover:border-[#635bff] hover:bg-slate-50">
              <span>{signedContractImageFile ? signedContractImageFile.name : 'Chọn ảnh hợp đồng đã ký...'}</span>
              <span className="font-semibold text-[#635bff]">Tải ảnh lên</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setSignedContractImageFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          {contractMode === 'create' && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">Chọn chủ hộ</label>
              <Input
                icon={Search}
                value={residentSearch}
                onChange={(e) => setResidentSearch(e.target.value)}
                placeholder="Tìm cư dân..."
                className="mb-3"
              />
              <div className="max-h-52 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2">
                {filteredResidents.length === 0 ? (
                  <div className="text-sm text-slate-500 p-4">Không tìm thấy cư dân</div>
                ) : (
                  filteredResidents.map((resident) => (
                    <button
                      type="button"
                      key={resident.ResidentID}
                      className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50"
                      onClick={() => handleContractResidentSelect(resident)}
                    >
                      <div>
                        <div className="font-medium text-slate-900">{resident.FullName}</div>
                        <div className="text-xs text-slate-500">{resident.Phone || resident.Email}</div>
                      </div>
                      <span className="text-xs text-slate-400">Chọn</span>
                    </button>
                  ))
                )}
              </div>

              {contractForm.residents.length > 0 && (
                <div className="space-y-4">
                  {contractForm.residents.some((r) => r.Relationship === 'Chủ hộ') && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs font-semibold uppercase text-emerald-700">Chủ hộ</p>
                      {contractForm.residents.filter((r) => r.Relationship === 'Chủ hộ').map((resident) => (
                        <div key={resident.ResidentID} className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                          <div>
                            <div className="font-semibold text-slate-900">{resident.FullName}</div>
                            <div className="text-xs text-slate-500">{resident.Phone || 'Chưa có'}</div>
                          </div>
                          <button type="button" className="text-rose-600 hover:text-rose-800" onClick={() => handleRemoveContractResident(resident.ResidentID)}>
                            Xóa
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {contractForm.residents.some((r) => r.Relationship === 'Người ở') && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase text-slate-700">Người ở cùng</p>
                      {contractForm.residents.filter((r) => r.Relationship === 'Người ở').map((resident) => (
                        <div key={resident.ResidentID} className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                          <div>
                            <div className="font-semibold text-slate-900">{resident.FullName}</div>
                            <div className="text-xs text-slate-500">{resident.Phone || 'Chưa có'}</div>
                          </div>
                          <button type="button" className="text-rose-600 hover:text-rose-800" onClick={() => handleRemoveContractResident(resident.ResidentID)}>
                            Xóa
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={closeContractModal}>Hủy</Button>
            <Button type="submit" disabled={contractLoading}>
              {contractLoading ? 'Đang lưu...' : contractMode === 'renew' ? 'Lưu gia hạn' : 'Tạo hợp đồng'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* small resident-list modal removed — resident list is inside apartment detail modal */}
    </div>
  );
}

