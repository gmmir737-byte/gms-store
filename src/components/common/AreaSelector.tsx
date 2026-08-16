import React, { useState, useEffect, useRef } from 'react';
import { MapPin, CheckCircle2, AlertCircle, ChevronDown, Clock, Truck } from 'lucide-react';
import type { DeliveryArea } from '../../types/database';
import { useDelivery } from '../../contexts/DeliveryContext';

interface AreaSelectorProps {
  value: string;
  onChange: (areaName: string, selectedAreaObj?: DeliveryArea | null) => void;
  city?: string;
  district?: string;
  tehsil?: string;
  state?: string;
  onAutoFillLocation?: (location: {
    city: string;
    tehsil?: string;
    district?: string;
    state: string;
    pincode: string;
    deliveryCharge?: number;
    estimatedTime?: string;
  }) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showStatusBanner?: boolean;
}

export const AreaSelector: React.FC<AreaSelectorProps> = ({
  value,
  onChange,
  city = '',
  district = '',
  tehsil = '',
  state = '',
  onAutoFillLocation,
  label = 'Area / Locality *',
  placeholder = 'Select or search your locality (e.g. Lal Chowk, Dalgate)...',
  required = true,
  disabled = false,
  className = '',
  showStatusBanner = true,
}) => {
  const { activeAreas, checkAreaAvailability } = useDelivery();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [validationState, setValidationState] = useState<{
    checked: boolean;
    isAvailable: boolean;
    message: string;
    area: DeliveryArea | null;
  }>({
    checked: false,
    isAvailable: false,
    message: '',
    area: null,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal search input with external value
  useEffect(() => {
    setSearchTerm(value || '');
    if (value?.trim()) {
      verifyArea(value);
    } else {
      setValidationState({ checked: false, isAvailable: false, message: '', area: null });
    }
  }, [value]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const verifyArea = async (areaName: string) => {
    if (!areaName?.trim()) {
      setValidationState({ checked: false, isAvailable: false, message: '', area: null });
      return;
    }

    const result = await checkAreaAvailability(areaName, city, state, undefined, district, tehsil);
    setValidationState({
      checked: true,
      isAvailable: result.isAvailable,
      message: result.message,
      area: result.area,
    });
  };

  const filteredAreas = activeAreas.filter((item) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      item.area_name.toLowerCase().includes(term) ||
      (item.tehsil && item.tehsil.toLowerCase().includes(term)) ||
      (item.district && item.district.toLowerCase().includes(term)) ||
      item.city.toLowerCase().includes(term) ||
      (item.pincode && item.pincode.includes(term))
    );
  });

  const handleSelect = (area: DeliveryArea) => {
    setSearchTerm(area.area_name);
    onChange(area.area_name, area);
    setValidationState({
      checked: true,
      isAvailable: true,
      message: '✓ Delivery available to your area',
      area,
    });
    setIsOpen(false);

    if (onAutoFillLocation) {
      onAutoFillLocation({
        city: area.city,
        tehsil: area.tehsil || undefined,
        district: area.district || undefined,
        state: area.state,
        pincode: area.pincode || '',
        deliveryCharge: area.delivery_charge,
        estimatedTime: area.estimated_delivery_time || '1-2 Business Days',
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setSearchTerm(text);
    onChange(text, null);
    setIsOpen(true);

    if (!text.trim()) {
      setValidationState({ checked: false, isAvailable: false, message: '', area: null });
    }
  };

  const handleInputBlur = () => {
    // Small timeout to allow click on dropdown items
    setTimeout(() => {
      if (searchTerm.trim()) {
        verifyArea(searchTerm);
      }
    }, 200);
  };

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
          {validationState.checked && (
            <span
              className={`text-xs font-semibold flex items-center gap-1 ${
                validationState.isAvailable
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {validationState.isAvailable ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Serviceable
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" /> Non-Serviceable
                </>
              )}
            </span>
          )}
        </div>
      )}

      <div className="relative">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={`w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border transition-all duration-200
              ${
                validationState.checked
                  ? validationState.isAvailable
                    ? 'border-emerald-400 dark:border-emerald-600 focus:ring-emerald-500/30'
                    : 'border-red-400 dark:border-red-600 focus:ring-red-500/30'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500/30'
              }
              bg-white dark:bg-gray-800 text-gray-900 dark:text-white
              placeholder-gray-400 dark:placeholder-gray-500
              focus:outline-none focus:ring-2 focus:border-transparent`}
          />
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Dropdown suggestions */}
        {isOpen && !disabled && (
          <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl divide-y divide-gray-100 dark:divide-gray-700/60">
            {filteredAreas.length > 0 ? (
              filteredAreas.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => handleSelect(area)}
                  className="w-full px-4 py-3 text-left hover:bg-primary-50/80 dark:hover:bg-primary-950/40 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-primary-600 dark:group-hover:text-primary-400">
                        {area.area_name}
                      </span>
                      {area.pincode && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-mono">
                          {area.pincode}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {area.tehsil ? `${area.tehsil}, ` : ''}
                      {area.district ? `${area.district}, ` : ''}
                      {area.city}, {area.state}
                    </p>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {area.delivery_charge === 0 ? 'Free Delivery' : `₹${area.delivery_charge} delivery`}
                    </span>
                    {area.estimated_delivery_time && (
                      <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {area.estimated_delivery_time}
                      </span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {searchTerm.trim()
                    ? `No active delivery area found matching "${searchTerm}".`
                    : 'No active delivery areas registered.'}
                </p>
                <p className="text-[11px] text-red-500 mt-1">
                  Delivery might be unavailable to unlisted areas.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Validation Banner */}
      {showStatusBanner && validationState.checked && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
            validationState.isAvailable
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/80 text-red-900 dark:text-red-200'
          }`}
        >
          {validationState.isAvailable ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-semibold">{validationState.message}</p>
            {validationState.isAvailable && validationState.area && (
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                <span className="flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  Delivery Charge: ₹{validationState.area.delivery_charge}
                </span>
                {validationState.area.estimated_delivery_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Est. Time: {validationState.area.estimated_delivery_time}
                  </span>
                )}
                {validationState.area.minimum_order_amount > 0 && (
                  <span>Min Order: ₹{validationState.area.minimum_order_amount}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
