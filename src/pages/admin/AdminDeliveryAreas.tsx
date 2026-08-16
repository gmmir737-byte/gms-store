import React, { useEffect, useState, useMemo } from 'react';
import {
  MapPin,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Building2,
  Clock,
  RefreshCw,
  AlertTriangle,
  Database,
  Copy,
  Check,
  Globe,
} from 'lucide-react';
import { Button, Input, Modal, LoadingSpinner } from '../../components/common';
import type { DeliveryArea } from '../../types/database';
import {
  fetchAllDeliveryAreas,
  createDeliveryArea,
  updateDeliveryArea,
  deleteDeliveryArea,
  toggleDeliveryAreaStatus,
  getDeliveryAreaStorageStatus,
  DELIVERY_AREAS_SQL_MIGRATION,
} from '../../lib/delivery';
import toast from 'react-hot-toast';

export const AdminDeliveryAreas: React.FC = () => {
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [tehsilFilter, setTehsilFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingArea, setEditingArea] = useState<DeliveryArea | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState<DeliveryArea | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // SQL Migration Helper Modal
  const [isSqlModalOpen, setIsSqlModalOpen] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    area_name: '',
    tehsil: '',
    district: 'Srinagar',
    city: 'Srinagar',
    state: 'Jammu and Kashmir',
    pincode: '',
    is_active: true,
    delivery_charge: 40,
    minimum_order_amount: 0,
    estimated_delivery_time: 'Same Day Delivery',
  });

  const loadAreas = async () => {
    setLoading(true);
    const data = await fetchAllDeliveryAreas();
    setAreas(data);
    setLoading(false);
  };

  useEffect(() => {
    loadAreas();
  }, []);

  // Unique list of districts
  const uniqueDistricts = useMemo(() => {
    const districts = new Set<string>();
    areas.forEach((a) => {
      if (a.district?.trim()) districts.add(a.district.trim());
    });
    return Array.from(districts).sort();
  }, [areas]);

  // Unique list of tehsils
  const uniqueTehsils = useMemo(() => {
    const tehsils = new Set<string>();
    areas.forEach((a) => {
      if (a.tehsil?.trim()) tehsils.add(a.tehsil.trim());
    });
    return Array.from(tehsils).sort();
  }, [areas]);

  // Unique list of cities
  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    areas.forEach((a) => {
      if (a.city?.trim()) cities.add(a.city.trim());
    });
    return Array.from(cities).sort();
  }, [areas]);

  // Filtered areas
  const filteredAreas = useMemo(() => {
    return areas.filter((area) => {
      // Status filter
      if (statusFilter === 'active' && !area.is_active) return false;
      if (statusFilter === 'inactive' && area.is_active) return false;

      // District filter
      if (
        districtFilter !== 'all' &&
        (!area.district || area.district.toLowerCase() !== districtFilter.toLowerCase())
      ) {
        return false;
      }

      // Tehsil filter
      if (
        tehsilFilter !== 'all' &&
        (!area.tehsil || area.tehsil.toLowerCase() !== tehsilFilter.toLowerCase())
      ) {
        return false;
      }

      // City filter
      if (cityFilter !== 'all' && area.city.toLowerCase() !== cityFilter.toLowerCase()) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = area.area_name.toLowerCase().includes(q);
        const matchesTehsil = area.tehsil ? area.tehsil.toLowerCase().includes(q) : false;
        const matchesDistrict = area.district ? area.district.toLowerCase().includes(q) : false;
        const matchesCity = area.city.toLowerCase().includes(q);
        const matchesState = area.state.toLowerCase().includes(q);
        const matchesPin = area.pincode ? area.pincode.includes(q) : false;
        return matchesName || matchesTehsil || matchesDistrict || matchesCity || matchesState || matchesPin;
      }

      return true;
    });
  }, [areas, statusFilter, districtFilter, tehsilFilter, cityFilter, searchQuery]);

  // Metrics
  const stats = useMemo(() => {
    const total = areas.length;
    const active = areas.filter((a) => a.is_active).length;
    const inactive = total - active;
    const districtsCount = uniqueDistricts.length;
    const tehsilsCount = uniqueTehsils.length;
    return { total, active, inactive, districtsCount, tehsilsCount };
  }, [areas, uniqueDistricts, uniqueTehsils]);

  const handleOpenCreateModal = () => {
    setEditingArea(null);
    setFormData({
      area_name: '',
      tehsil: '',
      district: uniqueDistricts[0] || 'Srinagar',
      city: uniqueCities[0] || 'Srinagar',
      state: 'Jammu and Kashmir',
      pincode: '',
      is_active: true,
      delivery_charge: 40,
      minimum_order_amount: 0,
      estimated_delivery_time: 'Same Day Delivery',
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (area: DeliveryArea) => {
    setEditingArea(area);
    setFormData({
      area_name: area.area_name,
      tehsil: area.tehsil || '',
      district: area.district || 'Srinagar',
      city: area.city,
      state: area.state,
      pincode: area.pincode || '',
      is_active: area.is_active,
      delivery_charge: area.delivery_charge,
      minimum_order_amount: area.minimum_order_amount,
      estimated_delivery_time: area.estimated_delivery_time || '1-2 Business Days',
    });
    setIsFormModalOpen(true);
  };

  const handleSaveArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.area_name.trim()) {
      toast.error('Please enter the area/locality name');
      return;
    }
    if (!formData.city.trim()) {
      toast.error('Please enter the city');
      return;
    }
    if (!formData.state.trim()) {
      toast.error('Please enter the state');
      return;
    }

    setSubmitting(true);

    if (editingArea) {
      const { error } = await updateDeliveryArea(editingArea.id, formData);
      if (error) {
        toast.error(`Failed to update area: ${error}`);
      } else {
        toast.success(`Area "${formData.area_name}" updated successfully!`);
        setIsFormModalOpen(false);
        await loadAreas();
      }
    } else {
      const { error } = await createDeliveryArea(formData);
      if (error) {
        toast.error(`Failed to add area: ${error}`);
      } else {
        toast.success(`Area "${formData.area_name}" added successfully!`);
        setIsFormModalOpen(false);
        await loadAreas();
      }
    }

    setSubmitting(false);
  };

  const handleToggleStatus = async (area: DeliveryArea) => {
    const newStatus = !area.is_active;
    // Optimistic UI update
    setAreas((prev) =>
      prev.map((a) => (a.id === area.id ? { ...a, is_active: newStatus } : a))
    );

    const { error } = await toggleDeliveryAreaStatus(area.id, newStatus);
    if (error) {
      toast.error(`Failed to update status: ${error}`);
      await loadAreas(); // Revert
    } else {
      toast.success(
        `Area "${area.area_name}" is now ${newStatus ? 'ACTIVE (Serviceable)' : 'INACTIVE (Disabled)'}`
      );
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    const { error } = await deleteDeliveryArea(deleteTarget.id);
    if (error) {
      toast.error(`Failed to delete area: ${error}`);
    } else {
      toast.success(`Area "${deleteTarget.area_name}" has been removed.`);
      setDeleteTarget(null);
      await loadAreas();
    }
    setDeleting(false);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(DELIVERY_AREAS_SQL_MIGRATION);
    setCopiedSql(true);
    toast.success('SQL migration script copied to clipboard!');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const storageStatus = getDeliveryAreaStorageStatus();

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-800 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800">
              Logistics & Locality Control
            </span>
            {storageStatus === 'local_fallback' && (
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                <Database className="w-3 h-3" /> Resilient Local Sync Active
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-gray-900 dark:text-white mt-1.5">
            Delivery Areas & District Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 max-w-2xl">
            Manage serviceable localities, districts, delivery charges, and transit times.
            Each area operates with independent active/inactive serviceability control.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setIsSqlModalOpen(true)}
            icon={<Database className="w-4 h-4 text-primary-600 dark:text-primary-400" />}
            className="text-xs"
          >
            SQL Script
          </Button>
          <Button
            variant="outline"
            onClick={loadAreas}
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button
            onClick={handleOpenCreateModal}
            icon={<Plus className="w-4 h-4" />}
            className="shadow-lg shadow-primary-600/20"
          >
            Add Delivery Area
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700/60 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Localities</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700/60 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Active Serviceable</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats.active}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700/60 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Inactive / Disabled</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-0.5">{stats.inactive}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700/60 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Districts Covered</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
              {stats.districtsCount}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-4 border border-gray-200/80 dark:border-gray-700/60 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search area, district, city, pincode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
            {(['all', 'active', 'inactive'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  statusFilter === st
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* District Filter */}
          {uniqueDistricts.length > 0 && (
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            >
              <option value="all">All Districts ({uniqueDistricts.length})</option>
              {uniqueDistricts.map((dist) => (
                <option key={dist} value={dist}>
                  District: {dist}
                </option>
              ))}
            </select>
          )}

          {/* Tehsil Filter */}
          {uniqueTehsils.length > 0 && (
            <select
              value={tehsilFilter}
              onChange={(e) => setTehsilFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            >
              <option value="all">All Tehsils ({uniqueTehsils.length})</option>
              {uniqueTehsils.map((teh) => (
                <option key={teh} value={teh}>
                  Tehsil: {teh}
                </option>
              ))}
            </select>
          )}

          {/* City Filter */}
          {uniqueCities.length > 0 && (
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            >
              <option value="all">All Cities ({uniqueCities.length})</option>
              {uniqueCities.map((c) => (
                <option key={c} value={c}>
                  City: {c}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Table / List View */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading delivery areas...</p>
        </div>
      ) : filteredAreas.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center border border-gray-200/80 dark:border-gray-700 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto text-gray-400">
            <MapPin className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Delivery Areas Found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
              {searchQuery
                ? `No areas matched "${searchQuery}". Try clearing search filters.`
                : 'No delivery areas have been configured yet. Click below to add your first locality.'}
            </p>
          </div>
          <Button onClick={handleOpenCreateModal} icon={<Plus className="w-4 h-4" />}>
            Add Delivery Area
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-3xl border border-gray-200/80 dark:border-gray-700/80 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 dark:bg-gray-900/60 text-xs uppercase font-bold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700/80 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Area / Locality</th>
                  <th className="px-6 py-4">Tehsil</th>
                  <th className="px-6 py-4">District</th>
                  <th className="px-6 py-4">City & State</th>
                  <th className="px-6 py-4">PIN Code</th>
                  <th className="px-6 py-4">Delivery Fee</th>
                  <th className="px-6 py-4">Est. Transit Time</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {filteredAreas.map((area) => (
                  <tr
                    key={area.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    {/* Area Name */}
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            area.is_active
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                              : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                          }`}
                        >
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{area.area_name}</p>
                          {area.minimum_order_amount > 0 && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400">
                              Min. order: ₹{area.minimum_order_amount}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Tehsil */}
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {area.tehsil ? (
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold text-xs border border-blue-100 dark:border-blue-900/60">
                          {area.tehsil}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Not set</span>
                      )}
                    </td>

                    {/* District */}
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {area.district ? (
                        <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-semibold text-xs border border-purple-100 dark:border-purple-900/60">
                          {area.district}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Not set</span>
                      )}
                    </td>

                    {/* City & State */}
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                      <p className="font-semibold text-gray-900 dark:text-white">{area.city}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{area.state}</p>
                    </td>

                    {/* PIN Code */}
                    <td className="px-6 py-4">
                      {area.pincode ? (
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {area.pincode}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Not set</span>
                      )}
                    </td>

                    {/* Delivery Fee */}
                    <td className="px-6 py-4 font-bold">
                      {area.delivery_charge === 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">FREE</span>
                      ) : (
                        <span className="text-gray-900 dark:text-white">₹{area.delivery_charge}</span>
                      )}
                    </td>

                    {/* Est. Delivery Time */}
                    <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {area.estimated_delivery_time || '1-2 Days'}
                      </div>
                    </td>

                    {/* Status Toggle */}
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(area)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-xs ${
                          area.is_active
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                            : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100'
                        }`}
                        title="Click to toggle status"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            area.is_active ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                        />
                        {area.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditModal(area)}
                        icon={<Edit2 className="w-3.5 h-3.5" />}
                        className="text-xs"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(area)}
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {filteredAreas.map((area) => (
              <div
                key={area.id}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200/80 dark:border-gray-700 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        area.is_active
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                          : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                      }`}
                    >
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-base">
                        {area.area_name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {area.tehsil ? `Tehsil: ${area.tehsil} • ` : ''}
                        {area.district ? `District: ${area.district} • ` : ''}
                        {area.city}, {area.state} {area.pincode ? `(${area.pincode})` : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleStatus(area)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      area.is_active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        area.is_active ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                    />
                    {area.is_active ? 'Active' : 'Inactive'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[11px]">Delivery Charge:</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {area.delivery_charge === 0 ? 'FREE' : `₹${area.delivery_charge}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Estimated Time:</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {area.estimated_delivery_time || '1-2 Days'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEditModal(area)}
                    icon={<Edit2 className="w-3.5 h-3.5" />}
                    className="text-xs flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteTarget(area)}
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    className="text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800/60 flex-1"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingArea ? `Edit Delivery Area: ${editingArea.area_name}` : 'Add Delivery Area'}
        size="lg"
      >
        <form onSubmit={handleSaveArea} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Area / Locality Name *"
              placeholder="e.g. Lal Chowk, Dalgate, Bemina"
              value={formData.area_name}
              onChange={(e) => setFormData({ ...formData, area_name: e.target.value })}
              required
            />

            <Input
              label="Tehsil"
              placeholder="e.g. South Srinagar, Khanyar, Eidgah"
              value={formData.tehsil}
              onChange={(e) => setFormData({ ...formData, tehsil: e.target.value })}
            />

            <Input
              label="District *"
              placeholder="e.g. Srinagar, Budgam, Anantnag, Baramulla"
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="City *"
              placeholder="e.g. Srinagar"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
            />

            <Input
              label="State *"
              placeholder="e.g. Jammu and Kashmir"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              required
            />

            <Input
              label="PIN Code (Optional)"
              placeholder="e.g. 190001"
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Delivery Charge (₹) *"
              type="number"
              min="0"
              step="1"
              placeholder="40"
              value={formData.delivery_charge.toString()}
              onChange={(e) =>
                setFormData({ ...formData, delivery_charge: parseFloat(e.target.value) || 0 })
              }
              required
            />

            <Input
              label="Minimum Order Amount (₹)"
              type="number"
              min="0"
              step="1"
              placeholder="0 (No minimum)"
              value={formData.minimum_order_amount.toString()}
              onChange={(e) =>
                setFormData({ ...formData, minimum_order_amount: parseFloat(e.target.value) || 0 })
              }
            />
          </div>

          <Input
            label="Estimated Delivery Time"
            placeholder="e.g. Same Day Delivery, 24-48 Hours, 1-2 Business Days"
            value={formData.estimated_delivery_time}
            onChange={(e) => setFormData({ ...formData, estimated_delivery_time: e.target.value })}
          />

          {/* Active toggle */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <p className="font-bold text-sm text-gray-900 dark:text-white">Serviceable Status</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formData.is_active
                  ? 'Area is ACTIVE. Customers in this locality can place orders.'
                  : 'Area is INACTIVE. Customers in this locality will be blocked from checkout.'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={() => setIsFormModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingArea ? 'Save Changes' : 'Create Delivery Area'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Permanent Deletion"
        size="sm"
      >
        <div className="space-y-4 text-sm">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Recommendation</p>
              <p className="text-xs mt-0.5">
                If historical customer orders reference{' '}
                <span className="font-bold">"{deleteTarget?.area_name}"</span>, consider toggling its
                status to <span className="font-bold">Inactive</span> instead of permanently deleting
                it.
              </p>
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to permanently delete{' '}
            <span className="font-bold text-gray-900 dark:text-white">
              "{deleteTarget?.area_name}" {deleteTarget?.district ? `(${deleteTarget.district})` : `(${deleteTarget?.city})`}
            </span>
            ? This action cannot be undone.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-red-600 hover:bg-red-700 text-white border-transparent"
              onClick={handleDeleteConfirm}
              loading={deleting}
            >
              Delete Area
            </Button>
          </div>
        </div>
      </Modal>

      {/* SQL Migration Setup Modal */}
      <Modal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
        title="Supabase SQL Migration Script"
        size="lg"
      >
        <div className="space-y-4 text-sm">
          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 flex items-start gap-3 text-xs">
            <Globe className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Supabase Cloud Synchronization</p>
              <p className="mt-0.5">
                Your delivery areas work automatically with local storage backup. To enable direct Supabase Cloud SQL persistence, copy and run this script in your{' '}
                <strong>Supabase Dashboard → SQL Editor</strong>.
              </p>
            </div>
          </div>

          <div className="relative">
            <pre className="p-4 rounded-2xl bg-gray-900 text-gray-100 font-mono text-xs overflow-x-auto max-h-64 border border-gray-800">
              {DELIVERY_AREAS_SQL_MIGRATION}
            </pre>
            <button
              type="button"
              onClick={handleCopySql}
              className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-all flex items-center gap-1.5 border border-white/20"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSql ? 'Copied!' : 'Copy SQL'}
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsSqlModalOpen(false)}>
              Close
            </Button>
            <Button onClick={handleCopySql} icon={copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}>
              {copiedSql ? 'Copied' : 'Copy Script'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDeliveryAreas;
