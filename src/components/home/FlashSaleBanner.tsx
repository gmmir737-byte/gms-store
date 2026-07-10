import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function FlashSaleBanner() {
  const [timeLeft, setTimeLeft] = useState({
    hours: 23,
    minutes: 59,
    seconds: 59,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="mb-12">
      <div className="relative bg-gradient-to-r from-primary-600 to-pink-600 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }} />
        </div>
        <div className="relative px-6 py-8 md:px-12 md:py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-white text-sm font-medium mb-3">
              Limited Time Offer
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
              Flash Sale!
            </h2>
            <p className="text-white/90 text-lg max-w-md">
              Up to 70% off on selected items. Don't miss out on these incredible deals!
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-3">
              <div className="bg-white rounded-lg px-4 py-2 text-center min-w-[70px]">
                <span className="block text-2xl font-bold text-gray-900">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="text-xs text-gray-500">Hours</span>
              </div>
              <div className="bg-white rounded-lg px-4 py-2 text-center min-w-[70px]">
                <span className="block text-2xl font-bold text-gray-900">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="text-xs text-gray-500">Mins</span>
              </div>
              <div className="bg-white rounded-lg px-4 py-2 text-center min-w-[70px]">
                <span className="block text-2xl font-bold text-gray-900">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="text-xs text-gray-500">Secs</span>
              </div>
            </div>
            <Link
              to="/shop?filter=flash"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Shop Flash Sale <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
