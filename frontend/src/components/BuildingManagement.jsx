// src/pages/BuildingManagement.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, Plus, Edit, Trash2, RefreshCw, 
  Layers, Home, ChevronRight, X, CheckCircle2,
  Search, AlertCircle, Save, ArrowLeft
} from 'lucide-react';
import { apartmentAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';

export default function BuildingManagement({ flash }) {
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('buildings'); // 'buildings' | 'floors'
  const [form, setForm] = useState({
    areaId: '',
    buildingName: '',
    numberOfFloors: '',
    floorNumber: '',
    buildingId: ''
  });

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
              <span className="ml-2 text-[#1f4f46] font-semibold">
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
              ? 'border-[#1f4f46] text-[#1f4f46]'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Building2 size={16} /> Tòa nhà
        </button>
        <button
          onClick={() => setActiveTab('floors')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === 'floors'
              ? 'border-[#1f4f46] text-[#1f4f46]'
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
              <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
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
                <Card key={building.BuildingID} className="group hover:border-[#1f4f46]/30 transition-all">
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge tone="blue" className="mb-2">{building.AreaName || getAreaName(building.AreaID)}</Badge>
                        <h3 className="text-xl font-bold text-slate-950 group-hover:text-[#1f4f46]">
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
              <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
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
                <Card key={floor.FloorID} className="group hover:border-[#1f4f46]/30 transition-all">
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge tone="slate" className="mb-2">{floor.BuildingName}</Badge>
                        <h3 className="text-2xl font-black text-slate-950 group-hover:text-[#1f4f46]">
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
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
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
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
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
    </div>
  );
}