import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Badge, Button, LoadingSpinner, Modal, Input, Pagination } from '../../components/common';
import type { Order, ReturnStatus, ReturnStatusHistory } from '../../types/database';
import {
  formatReturnStatus,
  getReturnStatusHistory,
  markReturnUnderReview,
  processAdminReturnAction,
  cleanNoteText,
} from '../../lib/returnService';
import { RefreshCw, Radio, RotateCcw, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'return_requested', label: 'Return Requested' },
  { value: 'returned', label: 'Returned' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ITEMS_PER_PAGE = 20;

export function AdminOrders() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = (searchParams.get('filter') || searchParams.get('status') || 'all') as any;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returns' | 'return_requested' | 'returned'>(
    ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returns', 'return_requested', 'returned'].includes(initialFilter)
      ? initialFilter
      : 'all'
  );
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [pendingReturnsCount, setPendingReturnsCount] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderHistory, setSelectedOrderHistory] = useState<ReturnStatusHistory[]>([]);
  const [updatingReturn, setUpdatingReturn] = useState(false);
  const [adminReturnNotes, setAdminReturnNotes] = useState('');

  // Handle when selected order is opened
  useEffect(() => {
    if (!selectedOrder) {
      setSelectedOrderHistory([]);
      return;
    }

    let isMounted = true;

    const loadModalDetails = async () => {
      // Load history
      const history = await getReturnStatusHistory(selectedOrder.id);
      if (isMounted) setSelectedOrderHistory(history);

      // Check if return is in 'requested' status -> auto mark as 'under_review'
      const isRequested =
        selectedOrder.return_status === 'requested' ||
        selectedOrder.status === 'return_requested' ||
        (selectedOrder.notes && /return requested/i.test(selectedOrder.notes));

      if (isRequested && !selectedOrder.reviewed_at) {
        const marked = await markReturnUnderReview(selectedOrder, user?.id);
        if (marked && isMounted) {
          setSelectedOrder((prev) =>
            prev ? { ...prev, return_status: 'under_review', reviewed_at: new Date().toISOString() } : null
          );
          // Reload history
          const updatedHistory = await getReturnStatusHistory(selectedOrder.id);
          if (isMounted) setSelectedOrderHistory(updatedHistory);
          fetchOrders(false);
        }
      }
    };

    loadModalDetails();

    return () => {
      isMounted = false;
    };
  }, [selectedOrder?.id]);

  const hasReturnRequest = useCallback((order: Order) => {
    return Boolean(
      order.status === 'return_requested' ||
      order.status === 'returned' ||
      (order.return_status && order.return_status !== 'none') ||
      Boolean(order.return_reason) ||
      Boolean(order.notes && /return/i.test(order.notes))
    );
  }, []);

  const fetchOrders = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    else setIsRefreshing(true);

    try {
      if (filter === 'returns' || filter === 'return_requested' || filter === 'returned') {
        const map = new Map<string, Order>();

        // Query 1: By status
        const { data: statusData } = await supabase
          .from('orders')
          .select('*, items:order_items(*)')
          .in('status', ['return_requested', 'returned'])
          .order('created_at', { ascending: false });

        if (statusData) statusData.forEach(o => map.set(o.id, o as Order));

        // Query 2: By notes
        const { data: notesData } = await supabase
          .from('orders')
          .select('*, items:order_items(*)')
          .ilike('notes', '%Return%')
          .order('created_at', { ascending: false });

        if (notesData) notesData.forEach(o => map.set(o.id, o as Order));

        // Query 3: By return_status (if column exists in schema)
        try {
          const { data: retData } = await supabase
            .from('orders')
            .select('*, items:order_items(*)')
            .or('return_status.eq.requested,return_status.eq.approved,return_status.eq.rejected,return_status.eq.pickup_pending,return_status.eq.received,return_status.eq.refunded');
          if (retData) retData.forEach(o => map.set(o.id, o as Order));
        } catch (e) {
          // Ignore if column is absent
        }

        // Ultimate fallback: fetch recent 100 orders if map is empty
        if (map.size === 0) {
          const { data: recentData } = await supabase
            .from('orders')
            .select('*, items:order_items(*)')
            .order('created_at', { ascending: false })
            .limit(100);
          if (recentData) recentData.forEach(o => map.set(o.id, o as Order));
        }

        let returnOrders = Array.from(map.values()).filter(hasReturnRequest);

        // Sort descending by creation date
        returnOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        if (search) {
          const q = search.toLowerCase();
          returnOrders = returnOrders.filter(o =>
            o.order_number?.toLowerCase().includes(q)
          );
        }

        if (filter === 'return_requested') {
          returnOrders = returnOrders.filter(o =>
            o.return_status === 'requested' ||
            o.status === 'return_requested' ||
            Boolean(o.notes && /return requested/i.test(o.notes))
          );
        } else if (filter === 'returned') {
          returnOrders = returnOrders.filter(o =>
            o.return_status === 'refunded' ||
            o.status === 'returned'
          );
        }

        setOrders(returnOrders);
        setTotalOrders(returnOrders.length);
      } else {
        let query = supabase
          .from('orders')
          .select('*, items:order_items(*)', { count: 'exact' })
          .order('created_at', { ascending: false });

        if (filter !== 'all') {
          query = query.eq('status', filter);
        }

        if (search) {
          query = query.or(`order_number.ilike.%${search}%`);
        }

        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE - 1;
        const { data, error, count } = await query.range(start, end);

        if (!error && data) {
          setOrders(data as Order[]);
          setTotalOrders(count || 0);
        } else if (error) {
          console.error('Error fetching admin orders:', error.message);
          setOrders([]);
          setTotalOrders(0);
        }
      }

      // Compute pending return count accurately for badge
      try {
        const countMap = new Map<string, any>();
        const { data: sData } = await supabase
          .from('orders')
          .select('id, status, return_status, return_reason, notes')
          .eq('status', 'return_requested');
        if (sData) sData.forEach(o => countMap.set(o.id, o));

        const { data: nData } = await supabase
          .from('orders')
          .select('id, status, return_status, return_reason, notes')
          .ilike('notes', '%Return Requested%');
        if (nData) nData.forEach(o => countMap.set(o.id, o));

        try {
          const { data: rData } = await supabase
            .from('orders')
            .select('id, status, return_status, return_reason, notes')
            .eq('return_status', 'requested');
          if (rData) rData.forEach(o => countMap.set(o.id, o));
        } catch (e) {
          // Ignore
        }

        const pendingList = Array.from(countMap.values()).filter(o =>
          o.return_status === 'requested' ||
          o.status === 'return_requested' ||
          Boolean(o.notes && /return requested/i.test(o.notes))
        );
        setPendingReturnsCount(pendingList.length);
      } catch (err) {
        console.warn('Could not calculate pending return count:', err);
      }
    } catch (err) {
      console.error('Error fetching admin orders:', err);
      setOrders([]);
      setTotalOrders(0);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [filter, search, currentPage, hasReturnRequest]);

  useEffect(() => {
    fetchOrders(true);

    const interval = setInterval(() => {
      fetchOrders(false);
    }, 10000);

    const channel = supabase
      .channel('admin-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders(false);
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const updatePayload: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === 'return_requested') {
      updatePayload.return_status = 'requested';
    } else if (newStatus === 'returned') {
      updatePayload.return_status = 'refunded';
      updatePayload.payment_status = 'refunded';
    }

    const { error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId);

    if (error) {
      console.warn('Direct update with return payload failed, updating status alone:', error.message);
      await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);
    }

    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus as Order['status'], ...(updatePayload.return_status ? { return_status: updatePayload.return_status } : {}) } : o));
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus as Order['status'], ...(updatePayload.return_status ? { return_status: updatePayload.return_status } : {}) });
    }
    toast.success('Order status updated');
  };

  const handleUpdateReturnStatus = async (orderId: string, actionStatus: ReturnStatus) => {
    if (!selectedOrder) return;
    setUpdatingReturn(true);
    try {
      const res = await processAdminReturnAction(
        selectedOrder,
        actionStatus,
        adminReturnNotes,
        user?.id
      );

      if (res.success) {
        toast.success(res.message);
        setAdminReturnNotes('');
        fetchOrders(false);

        // Refresh selected order and history
        const updatedStatus = actionStatus === 'refunded' ? 'returned' : 'delivered';
        const updatedPayment = actionStatus === 'refunded' ? 'refunded' : selectedOrder.payment_status;

        setSelectedOrder({
          ...selectedOrder,
          status: updatedStatus,
          return_status: actionStatus,
          payment_status: updatedPayment,
        });

        const history = await getReturnStatusHistory(selectedOrder.id);
        setSelectedOrderHistory(history);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      console.error('Error updating return status:', err);
      toast.error(err.message || 'Failed to update return status');
    } finally {
      setUpdatingReturn(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'success';
      case 'shipped': return 'info';
      case 'processing': return 'info';
      case 'return_requested': return 'warning';
      case 'returned': return 'info';
      case 'cancelled': return 'error';
      default: return 'warning';
    }
  };

  const getReturnBadgeClass = (returnStatus?: string | null) => {
    switch (returnStatus) {
      case 'requested': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300';
      case 'approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300';
      case 'pickup_pending': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-300';
      case 'received': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-300';
      case 'refunded': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-300';
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalOrders / ITEMS_PER_PAGE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Orders Management</h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              <Radio className="h-3 w-3 animate-pulse text-emerald-500" />
              Live
            </span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {totalOrders} total order(s) • {pendingReturnsCount} pending return request(s)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/admin/returns">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm">
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Return Management System
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrders(false)}
            loading={isRefreshing}
            icon={<RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh Orders
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search by order number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex gap-2 flex-wrap items-center">
          <Button variant={filter === 'all' ? 'primary' : 'outline'} size="sm" onClick={() => { setFilter('all'); setSearchParams({}); }}>All</Button>
          <Button variant={filter === 'pending' ? 'primary' : 'outline'} size="sm" onClick={() => { setFilter('pending'); setSearchParams({ filter: 'pending' }); }}>Pending</Button>
          <Button variant={filter === 'processing' ? 'primary' : 'outline'} size="sm" onClick={() => { setFilter('processing'); setSearchParams({ filter: 'processing' }); }}>Processing</Button>
          <Button variant={filter === 'shipped' ? 'primary' : 'outline'} size="sm" onClick={() => { setFilter('shipped'); setSearchParams({ filter: 'shipped' }); }}>Shipped</Button>
          <Button variant={filter === 'delivered' ? 'primary' : 'outline'} size="sm" onClick={() => { setFilter('delivered'); setSearchParams({ filter: 'delivered' }); }}>Delivered</Button>
          
          <Button
            variant={filter === 'returns' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => { setFilter('returns'); setSearchParams({ filter: 'returns' }); }}
            className="relative flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Return Requests</span>
            {pendingReturnsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-white animate-pulse">
                {pendingReturnsCount}
              </span>
            )}
          </Button>

          <Button variant={filter === 'cancelled' ? 'primary' : 'outline'} size="sm" onClick={() => { setFilter('cancelled'); setSearchParams({ filter: 'cancelled' }); }}>Cancelled</Button>
        </div>
      </div>

      {/* Orders */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : orders.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">No orders found for the selected filter.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Return Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {orders.map((order) => {
                const isReturn = hasReturnRequest(order);
                const retStatusLabel = order.return_status
                  ? order.return_status.replace('_', ' ').toUpperCase()
                  : order.notes?.includes('Return Requested')
                  ? 'REQUESTED (In Notes)'
                  : 'NONE';

                const displayStatus =
                  order.return_status === 'requested' || order.status === 'return_requested' || order.notes?.includes('Return Requested')
                    ? 'return_requested'
                    : order.return_status === 'refunded' || order.status === 'returned'
                    ? 'returned'
                    : order.status;

                const currentSelectValue = displayStatus;

                return (
                  <tr key={order.id} className={isReturn ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 dark:text-white">#{order.order_number}</p>
                      <p className="text-xs text-gray-500">{order.items?.length || 0} items</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-sm">
                      ₹{order.total.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={order.payment_status === 'paid' ? 'success' : order.payment_status === 'refunded' ? 'info' : 'warning'}>
                        {order.payment_status === 'refunded' ? 'REFUNDED' : order.payment_method === 'cod' ? 'COD' : 'Razorpay'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusColor(displayStatus) as any}>
                        {displayStatus.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {isReturn ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getReturnBadgeClass(order.return_status)}`}>
                          <RotateCcw className="h-3 w-3" />
                          {retStatusLabel}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={currentSelectValue}
                          onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                          className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          {statusOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setAdminReturnNotes('');
                          }}
                        >
                          View / Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          showSummary
          totalItems={totalOrders}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      )}

      {/* Order Detail & Return Management Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Order #${selectedOrder?.order_number}`}
        size="full"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Return Request Banner & Admin Controls */}
            {hasReturnRequest(selectedOrder) && (
              <div className="p-5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl space-y-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 dark:border-amber-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                      <RotateCcw className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-amber-950 dark:text-amber-100 text-base">
                        Customer Return Management
                      </h3>
                      <p className="text-xs text-amber-800 dark:text-amber-300">
                        Review customer's reason, send admin notes, and update status lifecycle
                      </p>
                    </div>
                  </div>
                  <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold border ${getReturnBadgeClass(selectedOrder.return_status)}`}>
                    Current Status: {formatReturnStatus(selectedOrder.return_status)}
                  </span>
                </div>

                {/* Return Reason Box */}
                <div className="p-3.5 bg-white dark:bg-gray-800/90 rounded-xl border border-amber-200 dark:border-amber-800/60 shadow-sm">
                  <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-1">
                    Customer Return Reason:
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    “{cleanNoteText(selectedOrder.return_reason || selectedOrder.notes) || 'No specific reason provided.'}”
                  </p>
                </div>

                {/* Admin Response Note Input */}
                <div>
                  <label className="block text-xs font-bold text-amber-950 dark:text-amber-200 mb-1.5">
                    Add Admin Note / Courier Tracking / Pickup Reference (Optional):
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={adminReturnNotes}
                      onChange={(e) => setAdminReturnNotes(e.target.value)}
                      placeholder="e.g. Approved return. Pickup scheduled for tomorrow via BlueDart AW# 8291039"
                      className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700/80 rounded-xl focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Admin Status Action Buttons */}
                <div className="pt-2 border-t border-amber-200 dark:border-amber-800/80">
                  <p className="text-xs font-bold text-amber-950 dark:text-amber-200 mb-2.5">
                    Select Action Return Status:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm"
                      onClick={() => handleUpdateReturnStatus(selectedOrder.id, 'approved')}
                      loading={updatingReturn}
                    >
                      Approve Return
                    </Button>
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-sm"
                      onClick={() => handleUpdateReturnStatus(selectedOrder.id, 'pickup_scheduled')}
                      loading={updatingReturn}
                    >
                      Schedule Pickup
                    </Button>
                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm"
                      onClick={() => handleUpdateReturnStatus(selectedOrder.id, 'item_received')}
                      loading={updatingReturn}
                    >
                      Mark Item Received
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
                      onClick={() => handleUpdateReturnStatus(selectedOrder.id, 'refunded')}
                      loading={updatingReturn}
                    >
                      Approve & Refund Customer
                    </Button>
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-sm"
                      onClick={() => handleUpdateReturnStatus(selectedOrder.id, 'rejected')}
                      loading={updatingReturn}
                    >
                      Reject Return Request
                    </Button>
                  </div>
                </div>

                {/* Return Status History Log */}
                {selectedOrderHistory.length > 0 && (
                  <div className="pt-3 border-t border-amber-200 dark:border-amber-800/80">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <h4 className="text-xs font-bold text-amber-950 dark:text-amber-200 uppercase tracking-wider">
                        Return Audit & Timeline History ({selectedOrderHistory.length})
                      </h4>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedOrderHistory.map((h) => (
                        <div
                          key={h.id}
                          className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 text-xs flex justify-between items-start gap-3 shadow-2xs"
                        >
                          <div>
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border mb-1 ${getReturnBadgeClass(h.status)}`}>
                              {formatReturnStatus(h.status)}
                            </span>
                            {h.note && (
                              <p className="text-gray-800 dark:text-gray-200 font-medium text-xs">
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
                  </div>
                )}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Items */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Items</h4>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      {item.product_image && (
                        <img src={item.product_image} className="w-12 h-12 rounded object-cover" alt="" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{item.product_name}</p>
                        <p className="text-sm text-gray-500">Qty: {item.quantity} x ₹{item.price}</p>
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white">₹{item.total}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Address */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Shipping Address</h4>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                  <p className="font-medium text-gray-900 dark:text-white">{selectedOrder.shipping_address.full_name}</p>
                  <p className="text-gray-500 mt-1">
                    {selectedOrder.shipping_address.address_line1}
                    {selectedOrder.shipping_address.address_line2 && `, ${selectedOrder.shipping_address.address_line2}`}
                  </p>
                  {(selectedOrder.shipping_address.area || selectedOrder.shipping_address.tehsil || selectedOrder.shipping_address.district) && (
                    <p className="text-xs text-primary-600 dark:text-primary-400 font-medium my-0.5">
                      {[
                        selectedOrder.shipping_address.area ? `Area: ${selectedOrder.shipping_address.area}` : '',
                        selectedOrder.shipping_address.tehsil ? `Tehsil: ${selectedOrder.shipping_address.tehsil}` : '',
                        selectedOrder.shipping_address.district ? `District: ${selectedOrder.shipping_address.district}` : '',
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                  )}
                  <p className="text-gray-500">
                    {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} - {selectedOrder.shipping_address.postal_code}
                  </p>
                  <p className="text-gray-500">Phone: {selectedOrder.shipping_address.phone}</p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900 dark:text-white">₹{selectedOrder.subtotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Shipping</span>
                <span className="text-gray-900 dark:text-white">₹{selectedOrder.shipping_cost}</span>
              </div>
              <div className="flex justify-between font-medium border-t border-gray-200 dark:border-gray-600 pt-2">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-gray-900 dark:text-white">₹{selectedOrder.total}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
export default AdminOrders;
