import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
  RotateCcw,
  Search,
  CheckCircle,
  XCircle,
  Truck,
  Clock,
  RefreshCw,
  Eye,
  Package,
} from 'lucide-react';
import { Button, LoadingSpinner, Modal } from '../../components/common';
import type { ReturnRequest, ReturnStatus, ReturnStatusHistory } from '../../types/database';
import {
  formatReturnStatus,
  getReturnBadgeClass,
  getAdminReturns,
  getReturnStatusHistory,
  markReturnUnderReview,
  processAdminReturnAction,
} from '../../lib/returnService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const STATUS_TABS: { id: string; label: string }[] = [
  { id: 'all', label: 'All Returns' },
  { id: 'REQUESTED', label: 'Requested' },
  { id: 'UNDER_REVIEW', label: 'Under Review' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'PICKUP_SCHEDULED', label: 'Pickup Scheduled' },
  { id: 'ITEM_RECEIVED', label: 'Item Received' },
  { id: 'REFUND_PROCESSING', label: 'Refund Processing' },
  { id: 'REFUNDED', label: 'Refunded' },
  { id: 'REJECTED', label: 'Rejected' },
];

export function AdminReturns() {
  const { user } = useAuth();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Return Modal
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const selectedReturnIdRef = useRef<string | null>(null);
  const [history, setHistory] = useState<ReturnStatusHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Sync ref with selectedReturn state
  useEffect(() => {
    selectedReturnIdRef.current = selectedReturn?.id || null;
  }, [selectedReturn]);

  const handleCloseReturn = useCallback(() => {
    selectedReturnIdRef.current = null;
    setSelectedReturn(null);
  }, []);

  // Form Inputs for Admin Actions
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ReturnStatus>('REQUESTED');
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [internalNoteInput, setInternalNoteInput] = useState('');
  const [courierNameInput, setCourierNameInput] = useState('');
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [pickupDateInput, setPickupDateInput] = useState('');

  // Fetch Admin Returns
  const isInitialLoadRef = useRef<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchReturns = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const [data, allData] = await Promise.all([
        getAdminReturns(activeTab),
        activeTab !== 'all' ? getAdminReturns('all') : Promise.resolve([]),
      ]);
      setReturns(data);

      // Sync open modal data if it is still open
      const currentOpenId = selectedReturnIdRef.current;
      if (currentOpenId) {
        const searchPool = activeTab === 'all' ? data : allData;
        const match = searchPool.find((r) => r.id === currentOpenId || r.order_id === currentOpenId);
        if (match && selectedReturnIdRef.current === currentOpenId) {
          setSelectedReturn(match);
          setSelectedStatus(match.status);
        }
      }
    } catch (err) {
      console.warn('Error in admin fetchReturns:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      fetchReturns(true);
    } else {
      fetchReturns(false);
    }

    const channel = supabase
      .channel('admin-returns-orders-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchReturns(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'returns' },
        () => {
          fetchReturns(false);
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      fetchReturns(false);
    }, 12000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchReturns]);

  // Handle viewing return details & auto mark under review
  const handleOpenReturn = async (ret: ReturnRequest) => {
    selectedReturnIdRef.current = ret.id;
    setSelectedReturn(ret);
    setSelectedStatus(ret.status);
    setAdminNoteInput(ret.admin_note || '');
    setInternalNoteInput(ret.internal_note || '');
    setCourierNameInput(ret.courier_name || '');
    setTrackingNumberInput(ret.tracking_number || '');
    setPickupDateInput(ret.pickup_date || '');

    // Load history
    setHistoryLoading(true);
    const hist = await getReturnStatusHistory(ret.id);
    if (selectedReturnIdRef.current === ret.id) {
      setHistory(hist);
      setHistoryLoading(false);
    }

    // Auto mark as UNDER_REVIEW if newly opened and currently REQUESTED
    if (ret.status === 'REQUESTED') {
      const marked = await markReturnUnderReview(ret, user?.id);
      if (marked && selectedReturnIdRef.current === ret.id) {
        setSelectedReturn((prev) => (prev ? { ...prev, status: 'UNDER_REVIEW' } : null));
        setSelectedStatus('UNDER_REVIEW');
        fetchReturns();
      }
    }
  };

  // Process status action
  const handleAction = async (targetStatus?: ReturnStatus) => {
    const statusToApply = targetStatus || selectedStatus;
    if (!selectedReturn || actionLoading) return;

    if (statusToApply === 'REJECTED' && !adminNoteInput.trim()) {
      toast.error('Please enter a rejection note/reason for the customer.');
      return;
    }

    if (statusToApply === 'PICKUP_SCHEDULED' && !courierNameInput.trim()) {
      toast.error('Please enter courier name (e.g. BlueDart, Delhivery, Ecom Express).');
      return;
    }

    setActionLoading(true);
    try {
      const res = await processAdminReturnAction({
        returnRequest: selectedReturn,
        actionStatus: statusToApply,
        adminNote: adminNoteInput,
        internalNote: internalNoteInput,
        courierName: courierNameInput,
        trackingNumber: trackingNumberInput,
        pickupDate: pickupDateInput,
        adminUserId: user?.id,
      });

      if (res.success && res.updatedReturn) {
        toast.success('✓ Return status updated successfully.');
        if (selectedReturnIdRef.current) {
          setSelectedReturn(res.updatedReturn);
          setSelectedStatus(res.updatedReturn.status);
          // Refresh history
          const updatedHist = await getReturnStatusHistory(res.updatedReturn.id);
          if (selectedReturnIdRef.current) {
            setHistory(updatedHist);
          }
        }
        fetchReturns();
      } else {
        toast.error(res.message || '✗ Unable to update return status.');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '✗ Unable to update return status.';
      toast.error(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter returns by search query
  const filteredReturns = returns.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.return_number?.toLowerCase().includes(q) ||
      r.order?.order_number?.toLowerCase().includes(q) ||
      r.user?.full_name?.toLowerCase().includes(q) ||
      r.user?.email?.toLowerCase().includes(q) ||
      r.order_item?.product_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Title & Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-amber-600" />
            Return Management System
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Review return requests, schedule pickups, track items, and process refunds
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchReturns(false)}
          className="text-xs"
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
          {isRefreshing ? 'Updating...' : 'Refresh'}
        </Button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search Return ID, Order #, Customer, Product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white"
          />
        </div>

        {/* Tab Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Return Table List */}
      {loading ? (
        <div className="p-12 text-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-400 text-sm">
          No return requests found matching the filter criteria.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/60 border-b border-gray-200 dark:border-gray-700 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="p-4">Return ID</th>
                  <th className="p-4">Order #</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Product</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-xs text-gray-900 dark:text-white">
                {filteredReturns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition">
                    <td className="p-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                      {ret.return_number}
                    </td>
                    <td className="p-4 font-medium text-gray-600 dark:text-gray-300">
                      #{ret.order?.order_number || ret.order_id?.slice(0, 8) || ''}
                    </td>
                    <td className="p-4">
                      <p className="font-semibold">{ret.user?.full_name || 'Customer'}</p>
                      <p className="text-[10px] text-gray-400">{ret.user?.email}</p>
                    </td>
                    <td className="p-4 max-w-[180px]">
                      <p className="font-semibold truncate">{ret.order_item?.product_name || ret.product?.name || 'Item'}</p>
                      <p className="text-[10px] text-gray-400">Qty: {ret.quantity} | ₹{ret.refund_amount?.toLocaleString()}</p>
                    </td>
                    <td className="p-4 font-medium text-gray-700 dark:text-gray-300">
                      {ret.reason}
                    </td>
                    <td className="p-4 text-gray-400 font-mono text-[11px]">
                      {new Date(ret.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getReturnBadgeClass(ret.status)}`}>
                        {formatReturnStatus(ret.status)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenReturn(ret)}
                        className="text-xs font-bold"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Action & Return Details Modal */}
      {selectedReturn && (
        <Modal
          isOpen={Boolean(selectedReturn)}
          onClose={handleCloseReturn}
          title={`Manage Return Request — ${selectedReturn.return_number}`}
        >
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
            {/* Header Badge & Overview */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/90 rounded-2xl border border-gray-200/80 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Customer: {selectedReturn.user?.full_name} ({selectedReturn.user?.email})
                </span>
                <h3 className="font-mono font-bold text-amber-600 dark:text-amber-400 text-lg">
                  {selectedReturn.return_number} (Order #{selectedReturn.order?.order_number})
                </h3>
              </div>
              <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold border ${getReturnBadgeClass(selectedReturn.status)}`}>
                {formatReturnStatus(selectedReturn.status)}
              </span>
            </div>

            {/* Product & Return Details Card */}
            <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 space-y-3">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Product & Return Reason
              </h4>

              <div className="flex items-center gap-3">
                {selectedReturn.order_item?.product_image || selectedReturn.product?.images?.[0] ? (
                  <img
                    src={selectedReturn.order_item?.product_image || selectedReturn.product?.images?.[0]}
                    alt={selectedReturn.order_item?.product_name || 'Product'}
                    className="w-14 h-14 object-cover rounded-xl border border-gray-200 dark:border-gray-700"
                  />
                ) : (
                  <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-400">
                    <Package className="h-6 w-6" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                    {selectedReturn.order_item?.product_name || selectedReturn.product?.name}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Return Qty: {selectedReturn.quantity} | Refund Amount: <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{selectedReturn.refund_amount?.toLocaleString()}</span>
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-300 font-medium mt-1">
                    Reason: {selectedReturn.reason}
                  </p>
                  {selectedReturn.customer_note && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 italic mt-0.5">
                      Customer note: “{selectedReturn.customer_note}”
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Admin Action Workflow Panel */}
            <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                <RotateCcw className="h-4 w-4 text-amber-600" />
                Admin Return Status Control
              </h4>

              {/* Status Select Control */}
              <div className="p-3.5 bg-white dark:bg-gray-800 rounded-xl border border-amber-200/80 dark:border-gray-700 space-y-2">
                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">
                  Current Status:
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as ReturnStatus)}
                    className="flex-1 text-xs font-bold px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="REQUESTED">REQUESTED (Return Requested)</option>
                    <option value="UNDER_REVIEW">UNDER_REVIEW (Under Review)</option>
                    <option value="APPROVED">APPROVED (Return Approved)</option>
                    <option value="PICKUP_SCHEDULED">PICKUP_SCHEDULED (Pickup Scheduled)</option>
                    <option value="ITEM_RECEIVED">ITEM_RECEIVED (Item Received)</option>
                    <option value="REFUND_PROCESSING">REFUND_PROCESSING (Refund Processing)</option>
                    <option value="REFUNDED">REFUNDED (Refund Completed)</option>
                    <option value="REJECTED">REJECTED (Return Rejected)</option>
                    <option value="CANCELLED">CANCELLED (Return Cancelled)</option>
                    <option value="RETURN_COMPLETED">RETURN_COMPLETED (Return Completed)</option>
                  </select>

                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs px-5 py-2.5"
                    onClick={() => handleAction(selectedStatus)}
                    loading={actionLoading}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Updating...' : 'Update Return Status'}
                  </Button>
                </div>
              </div>

              {/* Action Shortcut Buttons */}
              <div className="pt-1">
                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-2">
                  Quick Workflow Shortcuts:
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedReturn.status === 'UNDER_REVIEW' || selectedReturn.status === 'REQUESTED' ? (
                    <>
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs"
                        onClick={() => {
                          setSelectedStatus('APPROVED');
                          handleAction('APPROVED');
                        }}
                        loading={actionLoading}
                        disabled={actionLoading}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        Approve Return
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50 text-xs font-semibold"
                        onClick={() => {
                          setSelectedStatus('REJECTED');
                          handleAction('REJECTED');
                        }}
                        loading={actionLoading}
                        disabled={actionLoading}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Reject Return
                      </Button>
                    </>
                  ) : null}

                  {selectedReturn.status === 'APPROVED' || selectedReturn.status === 'UNDER_REVIEW' ? (
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs"
                      onClick={() => {
                        setSelectedStatus('PICKUP_SCHEDULED');
                        handleAction('PICKUP_SCHEDULED');
                      }}
                      loading={actionLoading}
                      disabled={actionLoading}
                    >
                      <Truck className="h-3.5 w-3.5 mr-1" />
                      Schedule Pickup
                    </Button>
                  ) : null}

                  {selectedReturn.status === 'PICKUP_SCHEDULED' || selectedReturn.status === 'PICKUP_ATTEMPTED' ? (
                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
                      onClick={() => {
                        setSelectedStatus('ITEM_RECEIVED');
                        handleAction('ITEM_RECEIVED');
                      }}
                      loading={actionLoading}
                      disabled={actionLoading}
                    >
                      <Package className="h-3.5 w-3.5 mr-1" />
                      Mark Item Received
                    </Button>
                  ) : null}

                  {selectedReturn.status === 'ITEM_RECEIVED' || selectedReturn.status === 'REFUND_PROCESSING' ? (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                      onClick={() => {
                        setSelectedStatus('REFUNDED');
                        handleAction('REFUNDED');
                      }}
                      loading={actionLoading}
                      disabled={actionLoading}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      Approve & Complete Refund
                    </Button>
                  ) : null}
                </div>
              </div>

              {/* Courier Input Fields */}
              <div className="grid md:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Courier Partner:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BlueDart, Delhivery"
                    value={courierNameInput}
                    onChange={(e) => setCourierNameInput(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Tracking AW#:
                  </label>
                  <input
                    type="text"
                    placeholder="AWB / Tracking #"
                    value={trackingNumberInput}
                    onChange={(e) => setTrackingNumberInput(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Pickup Date:
                  </label>
                  <input
                    type="date"
                    value={pickupDateInput}
                    onChange={(e) => setPickupDateInput(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Note Inputs */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Customer Update / Admin Note:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Your return has been approved. Pickup will be scheduled shortly."
                    value={adminNoteInput}
                    onChange={(e) => setAdminNoteInput(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                    Internal Admin Note (Private - Not visible to customer):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Verified product serial number in warehouse."
                    value={internalNoteInput}
                    onChange={(e) => setInternalNoteInput(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300"
                  />
                </div>
              </div>
            </div>

            {/* Audit History Log */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Audit History Timeline
                </h4>
              </div>

              {historyLoading ? (
                <div className="p-4 text-center text-xs text-gray-400">Loading audit history...</div>
              ) : history.length === 0 ? (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-center text-xs text-gray-400">
                  No audit history logged yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 text-xs flex justify-between items-start gap-3 shadow-2xs"
                    >
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border mb-1 ${getReturnBadgeClass(h.status)}`}>
                          {formatReturnStatus(h.status)}
                        </span>
                        {h.note && (
                          <p className="text-gray-800 dark:text-gray-200 font-medium">
                            {h.note}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">
                        {new Date(h.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default AdminReturns;
