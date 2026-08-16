import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, CheckCircle, RotateCcw, AlertCircle } from 'lucide-react';
import { Button, Modal } from './common';
import type { OrderItem, ReturnReason, ReturnRequest } from '../types/database';
import { createReturnRequest, checkItemReturnEligibility } from '../lib/returnService';
import toast from 'react-hot-toast';

interface ReturnItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  userId: string;
  item: OrderItem | null;
  onSuccess?: (newReturn: ReturnRequest) => void;
}

const REASON_OPTIONS: ReturnReason[] = [
  'Product damaged',
  'Wrong product received',
  'Product defective',
  'Product not as described',
  'Quality issue',
  'Missing item/accessories',
  'Changed my mind',
  'Not satisfied',
  'Other',
];

export function ReturnItemModal({ isOpen, onClose, orderId, userId, item, onSuccess }: ReturnItemModalProps) {
  const navigate = useNavigate();
  const [selectedReason, setSelectedReason] = useState<ReturnReason>('Not satisfied');
  const [customerNote, setCustomerNote] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [eligibilityChecking, setEligibilityChecking] = useState(false);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);

  // Success state
  const [createdReturn, setCreatedReturn] = useState<ReturnRequest | null>(null);

  useEffect(() => {
    if (isOpen && item && orderId && userId) {
      setQuantity(item.quantity || 1);
      setCustomerNote('');
      setSelectedReason('Not satisfied');
      setCreatedReturn(null);
      setEligibilityError(null);

      // Verify server-side eligibility on open
      setEligibilityChecking(true);
      checkItemReturnEligibility(orderId, item.id, userId).then((res) => {
        setEligibilityChecking(false);
        if (!res.eligible) {
          setEligibilityError(res.reason || 'This item is not eligible for return.');
        }
      });
    }
  }, [isOpen, item, orderId, userId]);

  if (!item) return null;

  const refundAmount = (item.price || 0) * quantity;

  const handleSubmit = async () => {
    if (submitting || eligibilityError) return;
    if (!selectedReason) {
      toast.error('Please select a reason for the return.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createReturnRequest({
        orderId,
        orderItemId: item.id,
        userId,
        productId: item.product_id,
        quantity,
        reason: selectedReason,
        customerNote: customerNote.trim() || undefined,
        refundAmount,
      });

      if (res.success && res.returnRequest) {
        toast.success('Return request submitted!');
        setCreatedReturn(res.returnRequest);
        if (onSuccess) onSuccess(res.returnRequest);
      } else {
        toast.error(res.message || 'Failed to submit return request.');
      }
    } catch (err: any) {
      console.error('Submit return error:', err);
      toast.error(err.message || 'Error submitting return request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={createdReturn ? 'Return Request Submitted' : 'Request Item Return'}
    >
      {createdReturn ? (
        /* Professional Confirmation View */
        <div className="py-2 space-y-5 text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-md">
            <CheckCircle className="h-9 w-9" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Return Request Submitted Successfully!
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Our operations team will review your request shortly.
            </p>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700 text-left space-y-3">
            <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Return ID:</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                {createdReturn.return_number}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Item:</span>
              <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
                {item.product_name} (Qty: {createdReturn.quantity})
              </span>
            </div>

            <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Reason:</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {createdReturn.reason}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Estimated Refund:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                ₹{createdReturn.refund_amount?.toLocaleString() || refundAmount.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <Button variant="outline" className="flex-1 text-xs" onClick={onClose}>
              Close
            </Button>
            <Button
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-md"
              onClick={() => {
                onClose();
                const targetId = createdReturn.id || createdReturn.return_number || orderId;
                navigate(`/returns?returnId=${targetId}`);
              }}
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              View My Returns
            </Button>
          </div>
        </div>
      ) : (
        /* Return Submission Form */
        <div className="space-y-5">
          {/* Eligibility Banner */}
          {eligibilityChecking ? (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs text-gray-500 animate-pulse">
              Verifying return window & item eligibility...
            </div>
          ) : eligibilityError ? (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2.5 text-xs text-red-800 dark:text-red-300">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500 mt-0.5" />
              <div>
                <p className="font-bold">Not Eligible for Return</p>
                <p className="mt-0.5">{eligibilityError}</p>
              </div>
            </div>
          ) : null}

          {/* Product Summary Card */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200/80 dark:border-gray-700">
            {item.product_image ? (
              <img
                src={item.product_image}
                alt={item.product_name}
                className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
              />
            ) : (
              <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400">
                <Package className="h-6 w-6" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">
                {item.product_name}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Price: ₹{item.price.toLocaleString()} | Ordered Qty: {item.quantity}
              </p>
            </div>
          </div>

          {/* Return Quantity Selector */}
          {item.quantity > 1 && (
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Quantity to Return:
              </label>
              <select
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                disabled={Boolean(eligibilityError) || submitting}
                className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white"
              >
                {Array.from({ length: item.quantity }, (_, i) => i + 1).map((q) => (
                  <option key={q} value={q}>
                    {q} {q === 1 ? 'unit' : 'units'} (Refund: ₹{(item.price * q).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Return Reason Dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Why are you returning this item? *
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value as ReturnReason)}
              disabled={Boolean(eligibilityError) || submitting}
              className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-amber-500 font-medium text-gray-900 dark:text-white"
            >
              {REASON_OPTIONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Additional Details / Comments (Optional):
            </label>
            <textarea
              rows={3}
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              disabled={Boolean(eligibilityError) || submitting}
              placeholder="e.g. Received wrong size/color, package outer seal was open..."
              className="w-full text-xs p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 text-xs"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-md"
              onClick={handleSubmit}
              loading={submitting}
              disabled={Boolean(eligibilityError) || submitting || eligibilityChecking}
            >
              Submit Return Request
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
