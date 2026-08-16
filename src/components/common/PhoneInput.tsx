import React from 'react';
import { Phone } from 'lucide-react';

export const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+1', flag: '🇺🇸', name: 'USA / Canada' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: '+86', flag: '🇨🇳', name: 'China' },
  { code: '+92', flag: '🇵🇰', name: 'Pakistan' },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+977', flag: '🇳🇵', name: 'Nepal' },
  { code: '+94', flag: '🇱🇰', name: 'Sri Lanka' },
];

interface PhoneInputProps {
  countryCode: string;
  onCountryCodeChange: (code: string) => void;
  phoneNumber: string;
  onPhoneNumberChange: (number: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export function PhoneInput({
  countryCode,
  onCountryCodeChange,
  phoneNumber,
  onPhoneNumberChange,
  label = 'Phone number',
  error,
  disabled = false,
}: PhoneInputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative flex rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 overflow-hidden">
        {/* Country Code Select */}
        <div className="flex items-center pl-3 pr-1 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300">
          <Phone className="h-4 w-4 text-gray-400 mr-2 shrink-0" />
          <select
            aria-label="Country Code"
            value={countryCode}
            onChange={(e) => onCountryCodeChange(e.target.value)}
            disabled={disabled}
            className="bg-transparent text-sm font-medium border-0 focus:ring-0 cursor-pointer py-2.5 pl-0 pr-1 text-gray-900 dark:text-white"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                {c.flag} {c.code}
              </option>
            ))}
          </select>
        </div>

        {/* Number Input */}
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => onPhoneNumberChange(e.target.value.replace(/[^\d]/g, ''))}
          placeholder="9876543210"
          disabled={disabled}
          required
          className="flex-1 w-full border-0 py-2.5 px-3 text-sm text-gray-900 dark:text-white bg-transparent focus:ring-0 placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-50"
        />
      </div>
      {error ? (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      ) : (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Enter mobile number without country code. We will prepend {countryCode}.
        </p>
      )}
    </div>
  );
}

export default PhoneInput;
