import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RotateCcw, Package, Clock, CheckCircle, XCircle, ArrowLeft, Truck, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button, EmptyState, LoadingSpinner, Modal } from '../components/common';
import type { ReturnRequest, ReturnStatusHistory, Order } from '../types/database';
import {
  formatReturnStatus,
  getReturnBadgeClass,
  getCustomerReturns,
  getReturnStatusHistory,
  cleanReturnRecord,
  normalizeReturnStatus,
} from '../lib/returnService';

export function MyReturnsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetReturnId = searchParams.get('returnId');

  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const closedByUserRef = useRef<boolean>(false);
  const isInitialLoadRef = useRef<boolean>(true);
  const [history, setHistory] = useState<ReturnStatusHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const handleCloseReturn = useCallback(() => {
    closedByUserRef.current = true;
    setSelectedReturn(null);
    if (targetReturnId) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('returnId');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, targetReturnId]);

  const handleOpenReturn = useCallback((ret: ReturnRequest) => {
    closedByUserRef.current = false;
    setSelectedReturn(ret);
  }, []);

  // Fetch returns list
  const fetchReturns = useCallback(async (isInitial = false) => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (isInitial) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const data = await getCustomerReturns(user.id);

      // If data is empty but targetReturnId is provided, attempt targeted direct order/return resolution
      if (targetReturnId && !data.some((r) => r.id === targetReturnId || r.order_id === targetReturnId)) {
        try {
          const { data: directRet } = await supabase
            .from('returns')
            .select('*')
            .or(`id.eq.${targetReturnId},order_id.eq.${targetReturnId},return_number.eq.${targetReturnId}`)
            .maybeSingle();

          if (directRet) {
            data.unshift(cleanReturnRecord(directRet as ReturnRequest));
          } else {
            // Check direct order
            const { data: directOrd } = await supabase
              .from('orders')
              .select('*, items:order_items(*)')
              .eq('id', targetReturnId)
              .maybeSingle();

            if (directOrd && (directOrd.return_status || directOrd.status === 'return_requested')) {
              const item = directOrd.items?.[0];
              const synthetic: ReturnRequest = cleanReturnRecord({
                id: directOrd.id,
                return_number: `RET-${directOrd.order_number || directOrd.id.slice(0, 8)}`,
                order_id: directOrd.id,
                order_item_id: item?.id || directOrd.id,
                user_id: directOrd.user_id,
                product_id: item?.product_id || null,
                quantity: item?.quantity || 1,
                reason: directOrd.return_reason || 'Return Requested',
                customer_note: directOrd.notes || null,
                status: normalizeReturnStatus(directOrd.return_status || 'REQUESTED'),
                refund_amount: directOrd.total || 0,
                created_at: directOrd.updated_at || directOrd.created_at,
                updated_at: directOrd.updated_at || directOrd.created_at,
                courier_name: null,
                tracking_number: null,
                pickup_date: null,
                refund_method: directOrd.payment_method || null,
                refund_transaction_id: null,
                admin_note: null,
                internal_note: null,
                reviewed_at: null,
                reviewed_by: null,
                approved_at: null,
                pickup_scheduled_at: null,
                received_at: null,
                refund_started_at: null,
                refunded_at: null,
                rejected_at: null,
                cancelled_at: null,
                completed_at: null,
                order: directOrd as Order,
                order_item: item as ReturnRequest['order_item'],
                product: null,
              });
              data.unshift(synthetic);
            }
          }
        } catch (targetErr) {
          console.warn('Direct target return lookup error:', targetErr);
        }
      }

      setReturns(data);

      // Sync selected return if open
      setSelectedReturn((prev) => {
        if (closedByUserRef.current) return null;
        if (targetReturnId && !prev) {
          return (
            data.find(
              (r) =>
                r.id === targetReturnId ||
                r.return_number === targetReturnId ||
                r.order_id === targetReturnId ||
                r.order?.order_number === targetReturnId
            ) || null
          );
        }
        if (prev) {
          return data.find((r) => r.id === prev.id || r.order_id === prev.order_id) || prev;
        }
        return null;
      });
    } catch (err) {
      console.warn('Error in fetchReturns:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user, targetReturnId]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      fetchReturns(true);
    } else {
      fetchReturns(false);
    }

    const handleReturnCreated = () => {
      fetchReturns(false);
    };
    window.addEventListener('return_created', handleReturnCreated);

    // Real-time listener for customer's returns, history, and orders
    const channel = supabase
      .channel(`customer-returns-sync-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'returns', filter: `user_id=eq.${user.id}` },
        () => {
          fetchReturns(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'return_status_history' },
        () => {
          fetchReturns(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
        () => {
          fetchReturns(false);
        }
      )
      .subscribe();

    // Fallback automatic refetching polling interval (silent in background)
    const pollInterval = setInterval(() => {
      fetchReturns(false);
    }, 10000);

    return () => {
      window.removeEventListener('return_created', handleReturnCreated);
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [user, fetchReturns]);

  // Load history when selectedReturn changes
  useEffect(() => {
    if (!selectedReturn) {
      setHistory([]);
      return;
    }

    let isMounted = true;
    setHistoryLoading(true);
    getReturnStatusHistory(selectedReturn.id).then((data) => {
      if (isMounted) {
        setHistory(data);
        setHistoryLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedReturn]);

  if (loading && returns.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Link
              to="/account"
              className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <RotateCcw className="h-6 w-6 text-amber-600" />
              My Returns
            </h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Track product returns, pickup schedules, and refund updates in real time
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
          {isRefreshing ? 'Updating...' : 'Refresh Status'}
        </Button>
      </div>

      {/* Returns List */}
      {returns.length === 0 ? (
        <EmptyState
          icon={<RotateCcw className="h-12 w-12 text-gray-400" />}
          title="No Return Requests Found"
          description="You haven't submitted any product return requests yet."
          action={
            <Link to="/orders">
              <Button className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs">
                View My Orders
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {returns.map((ret) => (
            <div
              key={ret.id}
              className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm hover:shadow-md transition space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/80 pb-3">
                <div>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                    {ret.return_number}
                  </span>
                  <p className="text-[11px] text-gray-400 font-medium">
                    Order #{ret.order?.order_number || ret.order_id?.slice(0, 8) || ''} • {new Date(ret.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getReturnBadgeClass(ret.status)}`}>
                  {formatReturnStatus(ret.status)}
                </span>
              </div>

              {/* Product Info */}
              <div className="flex items-center gap-3">
                {ret.order_item?.product_image || ret.product?.images?.[0] ? (
                  <img
                    src={ret.order_item?.product_image || ret.product?.images?.[0]}
                    alt={ret.order_item?.product_name || 'Product'}
                    className="w-14 h-14 object-cover rounded-xl border border-gray-200 dark:border-gray-700"
                  />
                ) : (
                  <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-400">
                    <Package className="h-6 w-6" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">
                    {ret.order_item?.product_name || ret.product?.name || 'Returned Product'}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Qty: {ret.quantity} | Reason: <span className="text-gray-700 dark:text-gray-300 font-medium">{ret.reason}</span>
                  </p>
                  {ret.refund_amount && (
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      Estimated Refund: ₹{ret.refund_amount.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Courier info snippet if pickup scheduled */}
              {ret.courier_name && (
                <div className="p-2.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-xl text-xs flex items-center gap-2 text-amber-900 dark:text-amber-200">
                  <Truck className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <span className="truncate">
                    Pickup via <strong>{ret.courier_name}</strong> {ret.tracking_number ? `(AW# ${ret.tracking_number})` : ''} {ret.pickup_date ? `on ${ret.pickup_date}` : ''}
                  </span>
                </div>
              )}

              <div className="pt-1 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenReturn(ret)}
                  className="text-xs font-semibold"
                >
                  View Details & Timeline
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Return Details Modal */}
      {selectedReturn && (
        <Modal
          isOpen={Boolean(selectedReturn)}
          onClose={handleCloseReturn}
          title={`Return Details — ${selectedReturn.return_number}`}
        >
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
            {/* Header Badge & Overview */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/90 rounded-2xl border border-gray-200/80 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Order #{selectedReturn.order?.order_number || selectedReturn.order_id?.slice(0, 8) || ''}
                </span>
                <h3 className="font-mono font-bold text-amber-600 dark:text-amber-400 text-lg">
                  {selectedReturn.return_number}
                </h3>
              </div>
              <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold border ${getReturnBadgeClass(selectedReturn.status)}`}>
                {formatReturnStatus(selectedReturn.status)}
              </span>
            </div>

            {/* Status Stepper Timeline */}
            <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Return Progress Stepper
              </h4>

              {selectedReturn.status === 'REJECTED' ? (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 text-xs text-red-800 dark:text-red-300">
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">Return Request Rejected</p>
                    <p className="mt-0.5">
                      {selectedReturn.admin_note || 'Our team reviewed your request and determined it does not qualify for return under our store return policy.'}
                    </p>
                  </div>
                </div>
              ) : selectedReturn.status === 'CANCELLED' ? (
                <div className="p-3.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl flex items-start gap-3 text-xs text-gray-700 dark:text-gray-300">
                  <AlertCircle className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">Return Cancelled</p>
                    <p className="mt-0.5">This return request was cancelled.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto pb-2">
                  <div className="min-w-[500px] relative flex items-center justify-between py-2">
                    {[
                      { key: 'REQUESTED', label: 'Requested' },
                      { key: 'UNDER_REVIEW', label: 'Review' },
                      { key: 'APPROVED', label: 'Approved' },
                      { key: 'PICKUP_SCHEDULED', label: 'Pickup' },
                      { key: 'ITEM_RECEIVED', label: 'Received' },
                      { key: 'REFUNDED', label: 'Refunded' },
                    ].map((step, idx, arr) => {
                      const flow = ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'PICKUP_SCHEDULED', 'PICKUP_ATTEMPTED', 'ITEM_RECEIVED', 'REFUND_PROCESSING', 'REFUNDED', 'RETURN_COMPLETED'];
                      const curIdx = flow.indexOf(selectedReturn.status.toUpperCase());
                      const stepIdx = [0, 1, 2, 3, 5, 7][idx];
                      const isPassed = curIdx >= stepIdx;
                      const isCurrent = curIdx === stepIdx || (idx === 3 && (selectedReturn.status === 'PICKUP_SCHEDULED' || selectedReturn.status === 'PICKUP_ATTEMPTED')) || (idx === 5 && (selectedReturn.status === 'REFUNDED' || selectedReturn.status === 'REFUND_PROCESSING' || selectedReturn.status === 'RETURN_COMPLETED'));

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
                                curIdx > stepIdx ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-700'
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Courier Tracking Info */}
            {selectedReturn.courier_name && (
              <div className="p-4 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
                  <Truck className="h-4 w-4 text-amber-600" />
                  Courier & Pickup Details
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-amber-950 dark:text-amber-100 font-medium">
                  <div>Partner: <span className="font-bold">{selectedReturn.courier_name}</span></div>
                  {selectedReturn.tracking_number && (
                    <div>Tracking AW#: <span className="font-mono font-bold">{selectedReturn.tracking_number}</span></div>
                  )}
                  {selectedReturn.pickup_date && (
                    <div>Scheduled Date: <span className="font-bold">{selectedReturn.pickup_date}</span></div>
                  )}
                </div>
              </div>
            )}

            {/* Customer Visible Admin Notes */}
            {selectedReturn.admin_note && (
              <div className="p-4 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-1">
                <p className="text-[11px] font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                  Store Admin Update / Instructions:
                </p>
                <p className="text-xs font-medium text-blue-950 dark:text-blue-100 leading-relaxed">
                  “{selectedReturn.admin_note}”
                </p>
              </div>
            )}

            {/* Audit Timeline History Log */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Complete Return History Timeline
                </h4>
              </div>

              {historyLoading ? (
                <div className="p-4 text-center text-xs text-gray-400">Loading timeline history...</div>
              ) : history.length === 0 ? (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-center text-xs text-gray-400">
                  No timeline history logged yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="p-3 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200/80 dark:border-gray-700 text-xs flex justify-between items-start gap-3 shadow-2xs"
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

export default MyReturnsPage;
