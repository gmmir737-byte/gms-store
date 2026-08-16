import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { Modal, Button, Input } from '../common';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import type { Review } from '../../types/database';

interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  productImage?: string | null;
  existingReview?: Review | null;
  onSuccess?: () => void;
}

export function WriteReviewModal({
  isOpen,
  onClose,
  productId,
  productName,
  productImage,
  existingReview,
  onSuccess,
}: WriteReviewModalProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [checkingVerified, setCheckingVerified] = useState(true);

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setTitle(existingReview.title || '');
      setComment(existingReview.comment || '');
    } else {
      setRating(5);
      setTitle('');
      setComment('');
    }
  }, [existingReview, isOpen]);

  useEffect(() => {
    async function checkVerification() {
      if (!user || !productId) {
        setIsVerified(false);
        setCheckingVerified(false);
        return;
      }
      setCheckingVerified(true);
      try {
        const { data } = await supabase
          .from('orders')
          .select('id, status, payment_status, items:order_items(product_id)')
          .eq('user_id', user.id);

        if (data && Array.isArray(data)) {
          const verifiedOrder = data.some((order: any) => {
            const hasProduct = order.items?.some((i: any) => i.product_id === productId);
            const isCompleted = order.payment_status === 'paid' || order.status === 'delivered';
            return hasProduct && isCompleted;
          });
          setIsVerified(verifiedOrder);
        }
      } catch (err) {
        console.error('Failed to check verified purchase status:', err);
      } finally {
        setCheckingVerified(false);
      }
    }

    if (isOpen) {
      checkVerification();
    }
  }, [user, productId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to write a review');
      return;
    }
    if (rating < 1) {
      toast.error('Please select a star rating');
      return;
    }

    setSubmitting(true);
    try {
      const reviewPayload = {
        product_id: productId,
        user_id: user.id,
        rating,
        title: title.trim() || null,
        comment: comment.trim() || null,
        is_verified_purchase: isVerified,
        is_approved: true,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (existingReview?.id) {
        const res = await supabase
          .from('reviews')
          .update(reviewPayload)
          .eq('id', existingReview.id);
        error = res.error;
      } else {
        const res = await supabase
          .from('reviews')
          .upsert([reviewPayload], { onConflict: 'product_id,user_id' });
        error = res.error;
      }

      if (error) {
        throw error;
      }

      // Recalculate product rating_avg and rating_count
      const { data: allReviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('product_id', productId)
        .eq('is_approved', true);

      if (allReviews && allReviews.length > 0) {
        const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
        const avg = Math.round((totalRating / allReviews.length) * 100) / 100;
        await supabase
          .from('products')
          .update({
            rating_avg: avg,
            rating_count: allReviews.length,
            updated_at: new Date().toISOString(),
          })
          .eq('id', productId);
      }

      toast.success(existingReview ? 'Review updated successfully!' : 'Review submitted successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error submitting review:', err);
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingReview ? 'Edit Your Review' : 'Write a Product Review'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Product Snapshot */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          {productImage && (
            <img
              src={productImage}
              alt={productName}
              className="w-12 h-12 object-cover rounded-md"
            />
          )}
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{productName}</p>
            {!checkingVerified && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isVerified ? '✓ Verified Purchase' : 'Unverified Buyer'}
              </p>
            )}
          </div>
        </div>

        {/* Rating Stars */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Overall Rating <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 ${
                    (hoverRating || rating) >= star
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                />
              </button>
            ))}
            <span className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {hoverRating || rating} / 5
            </span>
          </div>
        </div>

        {/* Title */}
        <Input
          label="Review Title"
          placeholder="Summarize your experience (e.g. Great quality, fits well!)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Written Review
          </label>
          <textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What did you like or dislike? What was the fit like? Let others know your honest thoughts."
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {existingReview ? 'Update Review' : 'Submit Review'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
