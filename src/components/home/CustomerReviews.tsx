import React, { useEffect, useState } from 'react';
import { Star, Quote, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Reveal } from '../common';
import { useInteractiveTilt } from '../../hooks/useInteractiveTilt';
import { supabase } from '../../lib/supabase';

interface RealReviewItem {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  user?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  product?: {
    name: string;
    slug: string;
    images?: string[];
  } | null;
}

function ReviewCard({ review }: { review: RealReviewItem }) {
  const tilt = useInteractiveTilt({ maxRotation: 8, scaleOnHover: 1.02 });
  const reviewerName = review.user?.full_name || 'Verified Customer';
  const reviewerAvatar =
    review.user?.avatar_url ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(reviewerName)}&backgroundColor=0284c7,4f46e5,0d9488`;

  return (
    <div
      ref={tilt.ref as any}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
      onPointerCancel={tilt.onPointerCancel}
      style={tilt.style}
      className="motion-surface holo-surface bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-card hover:shadow-2xl hover:shadow-primary-500/10 transition-all duration-500 border border-gray-100 dark:border-gray-700/80 flex flex-col justify-between"
    >
      <div>
        <Quote className="h-8 w-8 text-primary-400 dark:text-primary-500 mb-3 layer-pop opacity-80" />
        {review.title && (
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">
            {review.title}
          </h4>
        )}
        <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed text-sm sm:text-base font-normal line-clamp-4">
          "{review.comment || 'Great experience!'}"
        </p>
      </div>

      <div>
        {review.product && (
          <Link
            to={`/product/${review.product.slug}`}
            className="block text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline mb-3 truncate"
          >
            Reviewed: {review.product.name}
          </Link>
        )}
        <div className="flex items-center gap-3.5 mb-2.5">
          <img
            src={reviewerAvatar}
            alt={reviewerName}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-primary-500/30 layer-pop shadow-md"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
              {reviewerName}
            </h4>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle className="h-3 w-3" />
              <span>{review.is_verified_purchase ? 'Verified Purchase' : 'Customer Review'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${
                i < review.rating
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CustomerReviews() {
  const [reviews, setReviews] = useState<RealReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRealReviews = async () => {
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('id, rating, title, comment, is_verified_purchase, created_at, user:profiles(full_name, avatar_url), product:products(name, slug, images)')
          .eq('is_approved', true)
          .gte('rating', 4)
          .order('created_at', { ascending: false })
          .limit(3);

        if (!error && data && data.length > 0) {
          setReviews(data as unknown as RealReviewItem[]);
        } else {
          setReviews([]);
        }
      } catch (err) {
        console.warn('Could not fetch customer reviews:', err);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRealReviews();
  }, []);

  if (loading || reviews.length === 0) {
    return null;
  }

  return (
    <section className="mb-12">
      <div className="text-center mb-10">
        <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-widest block mb-1">
          Verified Customer Feedback
        </span>
        <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white mb-3">
          Customer Reviews
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-sm sm:text-base">
          Read genuine experiences from customers who ordered products on our store.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {reviews.map((review, idx) => (
          <Reveal key={review.id} delay={idx}>
            <ReviewCard review={review} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}


