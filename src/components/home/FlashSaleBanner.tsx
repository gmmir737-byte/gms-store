import React, { useState, useEffect } from 'react';
import { ArrowRight, Zap, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useInteractiveTilt } from '../../hooks/useInteractiveTilt';
import type { Product } from '../../types/database';
import { useSettings } from '../../contexts/SettingsContext';

interface FlashSaleBannerProps {
  products?: Product[];
}

export function FlashSaleBanner({ products = [] }: FlashSaleBannerProps) {
  const { settings } = useSettings();
  const tilt = useInteractiveTilt({ maxRotation: 6, scaleOnHover: 1.01 });

  // Calculate actual maximum discount percentage among flash sale products
  let maxDiscountPercent = 0;
  let targetEndTime: number | null = null;

  if (products && products.length > 0) {
    for (const p of products) {
      const originalPrice = p.compare_price || p.price;
      const salePrice = p.flash_sale_price || p.price;
      if (originalPrice > salePrice) {
        const discount = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
        if (discount > maxDiscountPercent) {
          maxDiscountPercent = discount;
        }
      }
      if (p.flash_sale_ends) {
        const endTime = new Date(p.flash_sale_ends).getTime();
        if (!isNaN(endTime) && endTime > Date.now()) {
          if (!targetEndTime || endTime < targetEndTime) {
            targetEndTime = endTime;
          }
        }
      }
    }
  }

  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateRemaining = () => {
      if (targetEndTime) {
        const diff = Math.max(0, targetEndTime - Date.now());
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      } else {
        // If no explicit end time is set, count down to midnight
        const now = new Date();
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        const diff = Math.max(0, endOfDay.getTime() - now.getTime());
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }
    };

    calculateRemaining();
    const timer = setInterval(calculateRemaining, 1000);
    return () => clearInterval(timer);
  }, [targetEndTime]);

  // Only render if there are actual flash sale products
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="mb-12">
      <div
        ref={tilt.ref as any}
        onPointerMove={tilt.onPointerMove}
        onPointerLeave={tilt.onPointerLeave}
        onPointerCancel={tilt.onPointerCancel}
        style={tilt.style}
        className="motion-surface holo-surface relative bg-gradient-to-r from-primary-700 via-indigo-600 to-pink-600 rounded-3xl overflow-hidden shadow-2xl shadow-primary-900/20 border border-white/20"
      >
        {/* Animated Background Tech Grid */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-pink-500/30 rounded-full blur-3xl pointer-events-none animate-pulse" />

        <div className="relative px-6 py-8 md:px-12 md:py-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left layer-pop">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-white text-xs font-semibold tracking-wide mb-3 shadow-sm">
              <Flame className="h-3.5 w-3.5 text-amber-300 fill-current animate-bounce" />
              <span>{settings.flash_sale_subtitle || 'Limited Time Price Drop'}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-tight flex items-center justify-center md:justify-start gap-2">
              <Zap className="h-8 w-8 text-amber-300 fill-current" />
              {settings.flash_sale_title || 'Flash Sale Live!'}
            </h2>
            <p className="text-white/90 text-base sm:text-lg max-w-md leading-relaxed font-normal">
              {maxDiscountPercent > 0 ? (
                <>
                  Save up to <span className="font-bold text-amber-300">{maxDiscountPercent}% OFF</span> on active sale items.
                </>
              ) : (
                'Special limited-time offers available while stocks last.'
              )}
            </p>
          </div>

          <div className="flex flex-col items-center gap-5 layer-pop">
            {/* Countdown timer with glass cards */}
            <div className="flex gap-3 sm:gap-4">
              <div className="bg-white/95 dark:bg-gray-900/90 backdrop-blur-md rounded-2xl px-4 py-3 text-center min-w-[76px] shadow-xl border border-white/40 dark:border-gray-800">
                <span className="block text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  Hours
                </span>
              </div>
              <div className="bg-white/95 dark:bg-gray-900/90 backdrop-blur-md rounded-2xl px-4 py-3 text-center min-w-[76px] shadow-xl border border-white/40 dark:border-gray-800">
                <span className="block text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  Mins
                </span>
              </div>
              <div className="bg-white/95 dark:bg-gray-900/90 backdrop-blur-md rounded-2xl px-4 py-3 text-center min-w-[76px] shadow-xl border border-white/40 dark:border-gray-800">
                <span className="block text-2xl sm:text-3xl font-extrabold text-primary-600 dark:text-primary-400 tracking-tight">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  Secs
                </span>
              </div>
            </div>

            <Link to="/shop?filter=flash">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-gray-950 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all shadow-xl shadow-black/20"
              >
                Shop Flash Sale <ArrowRight className="h-4 w-4" />
              </motion.button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

