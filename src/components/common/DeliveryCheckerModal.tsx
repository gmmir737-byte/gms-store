import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Search, CheckCircle2, AlertCircle, X, Truck, Clock, Sparkles } from 'lucide-react';
import { useDelivery } from '../../contexts/DeliveryContext';
import { Button } from './Button';
import type { DeliveryArea } from '../../types/database';

export const DeliveryCheckerModal: React.FC = () => {
  const {
    isCheckerModalOpen,
    closeCheckerModal,
    activeAreas,
    selectedArea,
    setSelectedArea,
    checkAreaAvailability,
  } = useDelivery();

  const [inputArea, setInputArea] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{
    checked: boolean;
    isAvailable: boolean;
    area: DeliveryArea | null;
    message: string;
  } | null>(null);

  if (!isCheckerModalOpen) return null;

  const handleCheck = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputArea.trim();
    if (!query) return;

    setChecking(true);
    const res = await checkAreaAvailability(query);
    setResult({
      checked: true,
      isAvailable: res.isAvailable,
      area: res.area,
      message: res.message,
    });
    setChecking(false);
  };

  const handleSelectArea = (area: DeliveryArea) => {
    setSelectedArea(area);
    setResult({
      checked: true,
      isAvailable: true,
      area,
      message: `✓ Delivery available to ${area.area_name}`,
    });
    setInputArea(area.area_name);
  };

  const handleApplyLocation = () => {
    if (result?.area && result.isAvailable) {
      setSelectedArea(result.area);
    }
    closeCheckerModal();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={closeCheckerModal}
      />

      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-lg transform overflow-hidden rounded-3xl bg-white dark:bg-gray-900 p-6 sm:p-8 text-left align-middle shadow-2xl transition-all border border-gray-100 dark:border-gray-800"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center shadow-inner">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Check Delivery Availability
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enter your locality to check delivery serviceability & rates
                </p>
              </div>
            </div>
            <button
              onClick={closeCheckerModal}
              className="rounded-full p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search form */}
          <form onSubmit={handleCheck} className="mt-6 space-y-3">
            <div className="relative">
              <input
                type="text"
                value={inputArea}
                onChange={(e) => {
                  setInputArea(e.target.value);
                  if (!e.target.value.trim()) setResult(null);
                }}
                placeholder="Enter your locality (e.g. Lal Chowk, Dalgate, Rajbagh)..."
                className="w-full pl-11 pr-24 py-3.5 text-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-transparent transition-all shadow-inner"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Button
                type="submit"
                size="sm"
                loading={checking}
                disabled={!inputArea.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl text-xs px-3.5 py-2 font-semibold shadow-sm"
              >
                Check
              </Button>
            </div>
          </form>

          {/* Verification Result Feedback */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`mt-4 p-4 rounded-2xl border text-sm ${
                  result.isAvailable
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                    : 'bg-red-50/80 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.isAvailable ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 space-y-1">
                    <p className="font-bold text-sm">
                      {result.isAvailable
                        ? `✓ We deliver to ${result.area?.area_name || inputArea}`
                        : `✕ We currently don't deliver to "${inputArea}"`}
                    </p>
                    {result.isAvailable && result.area && (
                      <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                          <Truck className="w-3.5 h-3.5" />
                          <span>Fee: {result.area.delivery_charge === 0 ? 'FREE' : `₹${result.area.delivery_charge}`}</span>
                        </div>
                        {result.area.estimated_delivery_time && (
                          <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{result.area.estimated_delivery_time}</span>
                          </div>
                        )}
                        {result.area.city && (
                          <div className="text-emerald-700/80 dark:text-emerald-300/80 col-span-2">
                            Location: {result.area.district ? `District ${result.area.district}, ` : ''}{result.area.city}, {result.area.state} {result.area.pincode ? `(${result.area.pincode})` : ''}
                          </div>
                        )}
                      </div>
                    )}
                    {!result.isAvailable && (
                      <p className="text-xs text-red-700 dark:text-red-300 pt-1">
                        Our delivery network is currently expanding. Please check back soon or try another nearby locality.
                      </p>
                    )}
                  </div>
                </div>

                {result.isAvailable && result.area && (
                  <div className="mt-4 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/60 flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleApplyLocation}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl font-semibold px-4"
                    >
                      Set as Delivery Location
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Popular / Active Localities Quick Select */}
          <div className="mt-6">
            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary-500" />
              Active Serviceable Localities
            </h4>
            <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5 divide-y divide-gray-100 dark:divide-gray-800/60">
              {activeAreas.length > 0 ? (
                activeAreas.map((area) => {
                  const isCurrent = selectedArea?.id === area.id;
                  return (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => handleSelectArea(area)}
                      className={`w-full py-2.5 px-3 rounded-xl text-left text-xs transition-all flex items-center justify-between group ${
                        isCurrent
                          ? 'bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 font-bold text-primary-600 dark:text-primary-400'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className={`w-3.5 h-3.5 ${isCurrent ? 'text-primary-600' : 'text-gray-400'}`} />
                        <div>
                          <span className="font-semibold">{area.area_name}</span>
                          <span className="text-[10px] text-gray-400 ml-1.5">
                            ({area.district ? `${area.district}, ` : ''}{area.city})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          {area.delivery_charge === 0 ? 'FREE' : `₹${area.delivery_charge}`}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded-full">
                            Selected
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="text-xs text-gray-400 py-3 text-center">
                  No active delivery localities available at the moment.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
