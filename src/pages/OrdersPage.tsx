import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Package, Eye, ShoppingBag, CheckCircle, XCircle, RotateCcw, Star, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Badge, Button, EmptyState, LoadingSpinner, Modal, Pagination } from '../components/common';
import { SEO } from '../components/seo';
import { WriteReviewModal } from '../components/shop';
import { ReturnItemModal } from '../components/ReturnItemModal';
import type { Order, OrderItem, ReturnStatusHistory } from '../types/database';
import {
  formatReturnStatus,
  getReturnBadgeClass,
  getReturnStatusHistory,
  normalizeReturnStatus,
  parseReturnMetaFromNotes,
} from '../lib/returnService';
import toast from 'react-hot-toast';

const ITEMS_PER_PAGE = 10;

export function OrdersPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const targetOrderId = searchParams.get('orderId');

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderHistory, setSelectedOrderHistory] = useState<ReturnStatusHistory[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // Modal states for Cancel & Review
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [reviewItem, setReviewItem] = useState<OrderItem | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const [selectedReturnItem, setSelectedReturnItem] = useState<OrderItem | null>(null);
  const [itemReturnModalOpen, setItemReturnModalOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE - 1;
    const { data, error, count } = await supabase
      .from('orders')
      .select('*, items:order_items(*)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(start, end);

    if (!error && data) {
      let orderList = data as Order[];

      // Try fetching returns table entries for these orders
      const orderIds = orderList.map((o) => o.id);
      if (orderIds.length > 0) {
        try {
          const { data: returnsData } = await supabase
            .from('returns')
            .select('*')
            .in('order_id', orderIds);

          if (returnsData && returnsData.length > 0) {
            const returnByOrderId = new Map<string, ReturnRequest>();
            returnsData.forEach((r: ReturnRequest) => {
              // Store latest return per order
              const existing = returnByOrderId.get(r.order_id);
              if (!existing || new Date(r.created_at || 0) > new Date(existing.created_at || 0)) {
                returnByOrderId.set(r.order_id, r);
              }
            });

            orderList = orderList.map((order) => {
              const matchedReturn = returnByOrderId.get(order.id);
              if (matchedReturn && matchedReturn.status) {
                return {
                  ...order,
                  return_status: normalizeReturnStatus(matchedReturn.status),
                };
              }
              const meta = parseReturnMetaFromNotes(order.notes);
              if (meta && meta.status) {
                return {
                  ...order,
                  return_status: meta.status,
                };
              }
              if (order.return_status && order.return_status !== 'none') {
                return {
                  ...order,
                  return_status: normalizeReturnStatus(order.return_status),
                };
              }
              return order;
            });
          } else {
            // Check notes for return meta
            orderList = orderList.map((order) => {
              const meta = parseReturnMetaFromNotes(order.notes);
              if (meta && meta.status) {
                return {
                  ...order,
                  return_status: meta.status,
                };
              }
              if (order.return_status && order.return_status !== 'none') {
                return {
                  ...order,
                  return_status: normalizeReturnStatus(order.return_status),
                };
              }
              return order;
            });
          }
        } catch {
          // Fallback to meta / return_status
          orderList = orderList.map((order) => {
            const meta = parseReturnMetaFromNotes(order.notes);
            if (meta && meta.status) {
              return {
                ...order,
                return_status: meta.status,
              };
            }
            if (order.return_status && order.return_status !== 'none') {
              return {
                ...order,
                return_status: normalizeReturnStatus(order.return_status),
              };
            }
            return order;
          });
        }
      }

      setOrders(orderList);

      // Auto-open target order from URL query param if present
      if (targetOrderId && !selectedOrder) {
        const found = orderList.find((o) => o.id === targetOrderId);
        if (found) setSelectedOrder(found);
      } else if (selectedOrder) {
        const updated = orderList.find((o) => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    }
    setTotalOrders(count || 0);
    setLoading(false);
  }, [user, currentPage, targetOrderId]);

  useEffect(() => {
    fetchOrders();

    if (!user) return;

    // Real-time subscription for customer's orders & return updates
    const channel = supabase
      .channel(`customer-orders-and-returns-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
        () => {
          fetchOrders();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'returns', filter: `user_id=eq.${user.id}` },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchOrders]);

  // Load return status history when selectedOrder changes
  useEffect(() => {
    if (!selectedOrder) {
      setSelectedOrderHistory([]);
      return;
    }

    let isMounted = true;
    getReturnStatusHistory(selectedOrder.id).then((history) => {
      if (isMounted) setSelectedOrderHistory(history);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedOrder?.id, selectedOrder?.return_status]);

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    setCancelling(true);

    try {
      const reasonText = cancelReason.trim() || 'Cancelled by customer';

      // 1. Try secure atomic RPC first
      let cancelledViaRpc = false;
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('cancel_customer_order', {
          p_order_id: selectedOrder.id,
          p_reason: reasonText,
        });

        if (!rpcErr && rpcData?.success) {
          cancelledViaRpc = true;
        }
      } catch (e) {
        console.warn('cancel_customer_order RPC notice, trying standard update:', e);
      }

      // 2. Fallback to direct user-scoped update if RPC not invoked
      if (!cancelledViaRpc) {
        const { error: primaryErr } = await supabase
          .from('orders')
          .update({
            status: 'cancelled',
            notes: `Cancellation Reason: ${reasonText}${selectedOrder.notes ? ` | ${selectedOrder.notes}` : ''}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedOrder.id)
          .eq('user_id', user?.id);

        if (primaryErr) throw primaryErr;

        // Restore inventory via RPC function or fallback
        try {
          await supabase.rpc('restore_order_stock', { p_order_id: selectedOrder.id });
        } catch (rpcErr) {
          console.warn('RPC restore_order_stock notice:', rpcErr);
        }
      }

      toast.success('Order cancelled successfully');
      setCancelModalOpen(false);
      setCancelReason('');
      fetchOrders();
    } catch (err: any) {
      console.error('Error cancelling order:', err);
      toast.error(err.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <SEO title="My Orders" noindex={true} />
        <EmptyState
          icon={<Package className="h-20 w-20" />}
          title="No orders yet"
          description="You haven't placed any orders yet. Start shopping to see your orders here."
          action={
            <Link to="/shop">
              <Button icon={<ShoppingBag className="h-5 w-5" />}>Start Shopping</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'success';
      case 'shipped':
        return 'info';
      case 'processing':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalOrders / ITEMS_PER_PAGE));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEO title="My Orders" noindex={true} />
      <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-8">
        My Orders
      </h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Order Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Order Number</p>
                  <p className="font-semibold text-gray-900 dark:text-white">#{order.order_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    ₹{order.total.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={getStatusColor(order.status === 'return_requested' ? 'delivered' : order.status) as any}>
                  {order.status === 'return_requested' ? 'Delivered' : order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
                {order.return_status && order.return_status !== 'none' && (
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getReturnBadgeClass(order.return_status)}`}>
                      Return: {formatReturnStatus(order.return_status)}
                    </span>
                    <Link to={`/returns?returnId=${order.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-amber-300 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-semibold"
                        icon={<RotateCcw className="h-3.5 w-3.5 text-amber-600" />}
                      >
                        Track Return Request
                      </Button>
                    </Link>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedOrder(order)}
                  icon={<Eye className="h-4 w-4" />}
                >
                  View Details
                </Button>
              </div>
            </div>

            {/* Order Items Preview */}
            <div className="p-4">
              <div className="flex items-center gap-4 overflow-x-auto">
                {order.items?.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-center gap-3 flex-shrink-0">
                    {item.product_image && (
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="w-14 h-14 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                        {item.product_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Qty: {item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
                {order.items && order.items.length > 4 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    +{order.items.length - 4} more items
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            showSummary
            totalItems={totalOrders}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </div>
      )}

      {/* Order Detail Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Order #${selectedOrder?.order_number}`}
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Tracking Lifecycle Stepper */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wider">
                Order Tracking & Lifecycle
              </h3>

              {selectedOrder.status === 'cancelled' ? (
                <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
                  <XCircle className="h-6 w-6 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Order Cancelled</p>
                    {(selectedOrder.cancel_reason || selectedOrder.notes) && (
                      <p className="text-xs mt-0.5 opacity-90">Reason: {selectedOrder.cancel_reason || selectedOrder.notes}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative flex items-center justify-between max-w-xl mx-auto py-2">
                  {/* Stepper Steps */}
                  {[
                    { key: 'pending', label: 'Placed' },
                    { key: 'processing', label: 'Processing' },
                    { key: 'shipped', label: 'Shipped' },
                    { key: 'delivered', label: 'Delivered' },
                  ].map((step, idx, arr) => {
                    const statuses = ['pending', 'processing', 'shipped', 'delivered'];
                    const currentIdx = statuses.indexOf(selectedOrder.status);
                    const isPassed = currentIdx >= idx;
                    const isCurrent = currentIdx === idx;

                    return (
                      <div key={step.key} className="flex-1 flex flex-col items-center relative z-10">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs transition-colors ${
                            isPassed
                              ? 'bg-primary-600 text-white shadow-md'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                          } ${isCurrent ? 'ring-4 ring-primary-100 dark:ring-primary-900/50' : ''}`}
                        >
                          {isPassed ? <CheckCircle className="h-5 w-5" /> : idx + 1}
                        </div>
                        <span className={`text-xs mt-2 font-medium ${isPassed ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                          {step.label}
                        </span>

                        {/* Line connector */}
                        {idx < arr.length - 1 && (
                          <div
                            className={`absolute top-4 left-1/2 w-full h-1 -z-10 ${
                              currentIdx > idx ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Return Tracking Section (if return is active) */}
              {selectedOrder.return_status && selectedOrder.return_status !== 'none' && (
                <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-md">
                        <RotateCcw className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                          Return Status & Tracking
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Live return lifecycle updates & courier status
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getReturnBadgeClass(selectedOrder.return_status)}`}>
                        {formatReturnStatus(selectedOrder.return_status)}
                      </span>
                      <Link to={`/returns?returnId=${selectedOrder.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs border-amber-300 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                          icon={<RotateCcw className="h-3.5 w-3.5 text-amber-600" />}
                        >
                          View Return Details
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Rejected Banner */}
                  {selectedOrder.return_status === 'rejected' ? (
                    <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 text-xs text-red-800 dark:text-red-300">
                      <XCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm">Return Request Rejected</p>
                        <p className="mt-1">
                          Our support team reviewed your request and determined it does not qualify for return under our standard return policy. If you have questions, please reach out to customer support.
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Return Stepper */
                    <div className="p-4 bg-white dark:bg-gray-800/80 rounded-xl border border-amber-200 dark:border-amber-800/60 shadow-sm">
                      <div className="overflow-x-auto pb-2">
                        <div className="min-w-[500px] relative flex items-center justify-between py-2">
                          {[
                            { key: 'requested', label: 'Requested' },
                            { key: 'under_review', label: 'Under Review' },
                            { key: 'approved', label: 'Approved' },
                            { key: 'pickup_scheduled', label: 'Pickup' },
                            { key: 'item_received', label: 'Received' },
                            { key: 'refunded', label: 'Refunded' },
                          ].map((step, idx, arr) => {
                            const returnFlow = ['requested', 'under_review', 'approved', 'pickup_scheduled', 'pickup_pending', 'item_received', 'received', 'refund_processing', 'refunded'];
                            
                            // map current return status index
                            const curStatus = selectedOrder.return_status?.toLowerCase() || 'requested';
                            let curIdx = returnFlow.indexOf(curStatus);
                            if (curStatus === 'pickup_pending') curIdx = 3;
                            if (curStatus === 'received') curIdx = 4;
                            if (curStatus === 'refund_processing') curIdx = 5;

                            const stepFlowIndex = [0, 1, 2, 3, 5, 8][idx];
                            const isPassed = curIdx >= stepFlowIndex;
                            const isCurrent = curIdx === stepFlowIndex || (idx === 3 && (curStatus === 'pickup_scheduled' || curStatus === 'pickup_pending')) || (idx === 4 && (curStatus === 'item_received' || curStatus === 'received')) || (idx === 5 && (curStatus === 'refunded' || curStatus === 'refund_processing'));

                            return (
                              <div key={step.key} className="flex-1 flex flex-col items-center relative z-10">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                                    isPassed
                                      ? 'bg-amber-600 text-white shadow-md'
                                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                                  } ${isCurrent ? 'ring-4 ring-amber-100 dark:ring-amber-900/50 scale-110' : ''}`}
                                >
                                  {isPassed ? <CheckCircle className="h-4 w-4" /> : idx + 1}
                                </div>
                                <span className={`text-[11px] mt-1.5 font-bold ${isPassed ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                                  {step.label}
                                </span>

                                {idx < arr.length - 1 && (
                                  <div
                                    className={`absolute top-4 left-1/2 w-full h-1 -z-10 ${
                                      curIdx > stepFlowIndex ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-700'
                                    }`}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Return Status History & Admin Notes */}
                  {selectedOrderHistory.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                        Return Timeline & Updates
                      </h5>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {selectedOrderHistory.map((h) => (
                          <div
                            key={h.id}
                            className="p-3 bg-gray-50 dark:bg-gray-800/90 rounded-xl border border-gray-200/80 dark:border-gray-700/80 text-xs flex justify-between items-start gap-3"
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getReturnBadgeClass(h.status)}`}>
                                  {formatReturnStatus(h.status)}
                                </span>
                              </div>
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
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Items */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Ordered Items</h3>
              <div className="space-y-3">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    {item.product_image && (
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{item.product_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        ₹{item.price.toLocaleString()} × {item.quantity}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">
                        ₹{item.total.toLocaleString()}
                      </p>
                      {(['delivered', 'completed', 'return_requested', 'returned'].includes(selectedOrder.status.toLowerCase())) && (
                        <div className="flex items-center gap-2">
                          {item.product_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs py-1 px-2.5"
                              icon={<Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                              onClick={() => {
                                setReviewItem(item);
                                setReviewModalOpen(true);
                              }}
                            >
                              Write Review
                            </Button>
                          )}
                          {selectedOrder.return_status && selectedOrder.return_status !== 'none' ? (
                            <Link to={`/returns?returnId=${selectedOrder.id}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs py-1 px-2.5 text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 font-semibold"
                                icon={<RotateCcw className="h-3.5 w-3.5" />}
                              >
                                Track Return
                              </Button>
                            </Link>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs py-1 px-2.5 text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 font-semibold"
                              icon={<RotateCcw className="h-3.5 w-3.5" />}
                              onClick={() => {
                                setSelectedReturnItem(item);
                                setItemReturnModalOpen(true);
                              }}
                            >
                              Return Item
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">Shipping Details</h3>
              <div className="p-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm space-y-1">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {selectedOrder.shipping_address.full_name}
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  {selectedOrder.shipping_address.address_line1}
                  {selectedOrder.shipping_address.address_line2 && `, ${selectedOrder.shipping_address.address_line2}`}
                </p>
                {(selectedOrder.shipping_address.area || selectedOrder.shipping_address.tehsil || selectedOrder.shipping_address.district) && (
                  <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                    {[
                      selectedOrder.shipping_address.area ? `Area: ${selectedOrder.shipping_address.area}` : '',
                      selectedOrder.shipping_address.tehsil ? `Tehsil: ${selectedOrder.shipping_address.tehsil}` : '',
                      selectedOrder.shipping_address.district ? `District: ${selectedOrder.shipping_address.district}` : '',
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                )}
                <p className="text-gray-600 dark:text-gray-300">
                  {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} - {selectedOrder.shipping_address.postal_code}
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-xs pt-1">
                  Phone: {selectedOrder.shipping_address.phone}
                </p>
              </div>
            </div>

            {/* Payment Summary */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">Payment Summary</h3>
              <div className="p-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="text-gray-900 dark:text-white">₹{selectedOrder.subtotal.toLocaleString()}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Discount</span>
                    <span>-₹{selectedOrder.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                  <span className="text-gray-900 dark:text-white">₹{selectedOrder.shipping_cost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t border-gray-200 dark:border-gray-600 pt-2">
                  <span className="text-gray-900 dark:text-white">Total Paid</span>
                  <span className="text-gray-900 dark:text-white">₹{selectedOrder.total.toLocaleString()}</span>
                </div>
                <div className="pt-1 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                  <span>Payment Method: {selectedOrder.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment (Razorpay)'}</span>
                  <span className="capitalize font-semibold">Payment: {selectedOrder.payment_status}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons for Cancellation or Return */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap justify-end gap-3">
              {(selectedOrder.status === 'pending' || selectedOrder.status === 'processing') && (
                <Button
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30"
                  onClick={() => setCancelModalOpen(true)}
                >
                  Cancel Order
                </Button>
              )}

              {selectedOrder.status === 'delivered' && (
                <Link to="/returns">
                  <Button
                    variant="outline"
                    className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-950/30"
                  >
                    View / Track Returns
                  </Button>
                </Link>
              )}

              <Button variant="ghost" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Order"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Are you sure you want to cancel order <span className="font-bold">#{selectedOrder?.order_number}</span>? Any deducted product inventory will be automatically restored.
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason for Cancellation (optional)
            </label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Tell us why you are cancelling this order..."
              className="w-full text-sm px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setCancelModalOpen(false)} disabled={cancelling}>
              Keep Order
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleCancelOrder}
              loading={cancelling}
            >
              Confirm Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Item-Level Return Request Modal */}
      {selectedOrder && user && selectedReturnItem && (
        <ReturnItemModal
          isOpen={itemReturnModalOpen}
          onClose={() => {
            setItemReturnModalOpen(false);
            setSelectedReturnItem(null);
          }}
          orderId={selectedOrder.id}
          userId={user.id}
          item={selectedReturnItem}
          onSuccess={() => {
            fetchOrders();
          }}
        />
      )}

      {/* Review Modal for Item */}
      {reviewItem && reviewItem.product_id && (
        <WriteReviewModal
          isOpen={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setReviewItem(null);
          }}
          productId={reviewItem.product_id}
          productName={reviewItem.product_name}
          productImage={reviewItem.product_image}
          onSuccess={fetchOrders}
        />
      )}
    </div>
  );
}
export default OrdersPage;
