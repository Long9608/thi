import React, { useState } from 'react';
import {
  Search,
  Users,
  Building2,
  Car,
  FileText,
  Receipt,
  Loader2,
  AlertCircle
} from 'lucide-react';

import { aiAPI } from '../api';


export default function AISearch() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);


  const handleSearch = async (e) => {
    e.preventDefault();

    const query = keyword.trim();

    if (!query) {
      setResults([]);
      setSearched(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await aiAPI.search(query);

      if (!response?.success) {
        throw new Error(
          response?.message ||
          'Không thể thực hiện tìm kiếm'
        );
      }

      setResults(
        Array.isArray(response.data)
          ? response.data
          : []
      );

      setSearched(true);
    } catch (err) {
      console.error('AI Search error:', err);

      setError(
        err?.message ||
        'Không thể kết nối AI Search'
      );

      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };


  const getIcon = (type) => {
    switch (type) {
      case 'RESIDENT':
        return Users;

      case 'APARTMENT':
        return Building2;

      case 'VEHICLE':
        return Car;

      case 'CONTRACT':
        return FileText;

      case 'INVOICE':
        return Receipt;

      default:
        return Search;
    }
  };


  const getTypeLabel = (type) => {
    switch (type) {
      case 'RESIDENT':
        return 'Cư dân';

      case 'APARTMENT':
        return 'Căn hộ';

      case 'VEHICLE':
        return 'Phương tiện';

      case 'CONTRACT':
        return 'Hợp đồng';

      case 'INVOICE':
        return 'Hóa đơn';

      default:
        return type;
    }
  };


  const formatMoney = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  };


  return (
    <div className="space-y-6 p-6 lg:p-8">

      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-slate-950">
          AI tìm kiếm
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Tìm nhanh cư dân, căn hộ, phương tiện, hợp đồng và hóa đơn.
        </p>
      </div>


      {/* Search box */}
      <form
        onSubmit={handleSearch}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-3 md:flex-row">

          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-[#635bff]">

            <Search
              size={18}
              className="text-slate-400"
            />

            <input
              value={keyword}
              onChange={(e) =>
                setKeyword(e.target.value)
              }
              placeholder="Ví dụ: Bảo, 30K, C-T3-P3, HD-2026, chưa thanh toán..."
              className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />

          </div>


          <button
            type="submit"
            disabled={loading || !keyword.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#635bff] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4f46e5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2
                  size={17}
                  className="animate-spin"
                />
                Đang tìm...
              </>
            ) : (
              <>
                <Search size={17} />
                Tìm kiếm
              </>
            )}
          </button>

        </div>


        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">

          <span className="rounded-full bg-slate-100 px-3 py-1">
            Cư dân
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1">
            Căn hộ
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1">
            Phương tiện
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1">
            Hợp đồng
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1">
            Hóa đơn
          </span>

        </div>
      </form>


      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">

          <AlertCircle
            size={20}
            className="mt-0.5 text-rose-600"
          />

          <p className="text-sm text-rose-700">
            {error}
          </p>

        </div>
      )}


      {/* Results */}
      {searched && !loading && !error && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="mb-4">
            <h4 className="font-bold text-slate-950">
              Kết quả tìm kiếm
            </h4>

            <p className="mt-1 text-sm text-slate-500">
              Tìm thấy {results.length} kết quả cho "{keyword}"
            </p>
          </div>


          {results.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">

              <Search
                size={30}
                className="mx-auto text-slate-400"
              />

              <p className="mt-3 font-semibold text-slate-900">
                Không tìm thấy kết quả
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Hãy thử từ khóa khác.
              </p>

            </div>
          ) : (

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

              {results.map((item, index) => {

                const Icon = getIcon(item.type);

                return (
                  <div
                    key={`${item.type}-${item.id}-${index}`}
                    className="rounded-2xl border border-slate-200 p-5 transition hover:border-[#635bff]/40 hover:shadow-sm"
                  >

                    {/* Card header */}
                    <div className="flex items-start gap-3">

                      <div className="rounded-xl bg-[#f0efff] p-3 text-[#635bff]">
                        <Icon size={20} />
                      </div>


                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center gap-2">

                          <h5 className="truncate font-bold text-slate-950">
                            {item.title}
                          </h5>


                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            {getTypeLabel(item.type)}
                          </span>

                        </div>


                        <p className="mt-1 text-sm text-slate-500">
                          {item.subtitle || '-'}
                        </p>

                      </div>

                    </div>


                    {/* Detail */}
                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">


                      {/* RESIDENT */}
                      {item.type === 'RESIDENT' && (
                        <>
                          <InfoRow
                            label="SĐT"
                            value={item.data?.phone}
                          />

                          <InfoRow
                            label="Email"
                            value={item.data?.email}
                          />

                          <InfoRow
                            label="Căn hộ"
                            value={item.data?.apartmentCode}
                          />

                          <InfoRow
                            label="Trạng thái"
                            value={
                              item.data?.status
                                ? 'Hoạt động'
                                : 'Ngừng hoạt động'
                            }
                          />
                        </>
                      )}


                      {/* APARTMENT */}
                      {item.type === 'APARTMENT' && (
                        <>
                          <InfoRow
                            label="Tòa"
                            value={item.data?.buildingName}
                          />

                          <InfoRow
                            label="Tầng"
                            value={item.data?.floorNumber}
                          />

                          <InfoRow
                            label="Diện tích"
                            value={
                              item.data?.area
                                ? `${item.data.area} m²`
                                : '-'
                            }
                          />

                          <InfoRow
                            label="Trạng thái"
                            value={item.data?.status}
                          />
                        </>
                      )}


                      {/* VEHICLE */}
                      {item.type === 'VEHICLE' && (
                        <>
                          <InfoRow
                            label="Chủ xe"
                            value={item.data?.ownerName}
                          />

                          <InfoRow
                            label="Loại xe"
                            value={item.data?.vehicleType}
                          />

                          <InfoRow
                            label="Hãng"
                            value={item.data?.brand}
                          />

                          <InfoRow
                            label="Màu"
                            value={item.data?.color}
                          />
                        </>
                      )}


                      {/* CONTRACT */}
                      {item.type === 'CONTRACT' && (
                        <>
                          <InfoRow
                            label="Căn hộ"
                            value={item.data?.apartmentCode}
                          />

                          <InfoRow
                            label="Chủ hợp đồng"
                            value={item.data?.ownerName}
                          />

                          <InfoRow
                            label="Ngày bắt đầu"
                            value={item.data?.startDate}
                          />

                          <InfoRow
                            label="Ngày kết thúc"
                            value={item.data?.endDate}
                          />

                          <InfoRow
                            label="Tiền thuê"
                            value={formatMoney(
                              item.data?.rent
                            )}
                          />

                          <InfoRow
                            label="Trạng thái"
                            value={item.data?.status}
                          />
                        </>
                      )}


                      {/* INVOICE */}
                      {item.type === 'INVOICE' && (
                        <>
                          <InfoRow
                            label="Căn hộ"
                            value={item.data?.apartmentCode}
                          />

                          <InfoRow
                            label="Chủ hợp đồng"
                            value={item.data?.ownerName}
                          />

                          <InfoRow
                            label="Hợp đồng"
                            value={item.data?.contractNumber}
                          />

                          <InfoRow
                            label="Kỳ"
                            value={
                              item.data?.invoiceMonth &&
                              item.data?.invoiceYear
                                ? `${item.data.invoiceMonth}/${item.data.invoiceYear}`
                                : '-'
                            }
                          />

                          <InfoRow
                            label="Tổng tiền"
                            value={formatMoney(
                              item.data?.totalAmount
                            )}
                          />

                          <InfoRow
                            label="Hạn thanh toán"
                            value={item.data?.dueDate}
                          />

                          <InfoRow
                            label="Trạng thái"
                            value={item.data?.status}
                          />
                        </>
                      )}

                    </div>

                  </div>
                );
              })}

            </div>
          )}

        </div>
      )}

    </div>
  );
}


function InfoRow({
  label,
  value
}) {
  return (
    <div className="flex justify-between gap-4">

      <span className="text-slate-500">
        {label}
      </span>

      <span className="text-right font-medium text-slate-900">
        {value === null ||
        value === undefined ||
        value === ''
          ? '-'
          : value}
      </span>

    </div>
  );
}