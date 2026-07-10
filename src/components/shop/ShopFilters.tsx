import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { Button, Input, Rating } from '../common';
import type { Category, FilterState } from '../../types/database';

interface ShopFiltersProps {
  categories: Category[];
  filters: FilterState;
  onChange: (filters: Partial<FilterState>) => void;
  onClear: () => void;
  totalResults: number;
}

export function ShopFilters({ categories, filters, onChange, onClear, totalResults }: ShopFiltersProps) {
  const [expandedSections, setExpandedSections] = useState({
    category: true,
    price: true,
    rating: false,
  });
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <button
          onClick={() => toggleSection('category')}
          className="flex items-center justify-between w-full text-left py-2"
        >
          <h3 className="font-semibold text-gray-900 dark:text-white">Categories</h3>
          {expandedSections.category ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>
        {expandedSections.category && (
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="category"
                checked={!filters.category}
                onChange={() => onChange({ category: null })}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300"
              />
              <span className="text-gray-600 dark:text-gray-400">All Categories</span>
            </label>
            {categories.map((category) => (
              <label key={category.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="category"
                  checked={filters.category === category.slug}
                  onChange={() => onChange({ category: category.slug })}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="text-gray-600 dark:text-gray-400">{category.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Price Range */}
      <div>
        <button
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full text-left py-2"
        >
          <h3 className="font-semibold text-gray-900 dark:text-white">Price Range</h3>
          {expandedSections.price ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>
        {expandedSections.price && (
          <div className="mt-3 space-y-4">
            <div className="flex gap-4">
              <Input
                type="number"
                placeholder="Min"
                value={filters.priceRange[0] || ''}
                onChange={(e) => onChange({ priceRange: [Number(e.target.value), filters.priceRange[1]] })}
                className="w-24"
              />
              <span className="text-gray-400 self-center">-</span>
              <Input
                type="number"
                placeholder="Max"
                value={filters.priceRange[1] || ''}
                onChange={(e) => onChange({ priceRange: [filters.priceRange[0], Number(e.target.value)] })}
                className="w-24"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Under ₹500', min: 0, max: 500 },
                { label: '₹500 - ₹1000', min: 500, max: 1000 },
                { label: '₹1000 - ₹5000', min: 1000, max: 5000 },
                { label: 'Over ₹5000', min: 5000, max: 100000 },
              ].map((range) => (
                <button
                  key={range.label}
                  onClick={() => onChange({ priceRange: [range.min, range.max] as [number, number] })}
                  className="text-sm px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rating */}
      <div>
        <button
          onClick={() => toggleSection('rating')}
          className="flex items-center justify-between w-full text-left py-2"
        >
          <h3 className="font-semibold text-gray-900 dark:text-white">Rating</h3>
          {expandedSections.rating ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>
        {expandedSections.rating && (
          <div className="mt-3 space-y-2">
            {[4, 3, 2, 1].map((rating) => (
              <label key={rating} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="rating"
                  checked={filters.rating === rating}
                  onChange={() => onChange({ rating })}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <div className="flex items-center gap-1">
                  <Rating value={rating} readonly size="sm" />
                  <span className="text-gray-600 dark:text-gray-400">& up</span>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* In Stock */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={(e) => onChange({ inStock: e.target.checked })}
            className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <span className="text-gray-600 dark:text-gray-400">In Stock Only</span>
        </label>
      </div>

      {/* Clear Filters */}
      {(filters.category || filters.priceRange[0] > 0 || filters.priceRange[1] < 100000 || filters.rating || filters.inStock) && (
        <Button variant="outline" onClick={onClear} className="w-full" icon={<X className="h-4 w-4" />}>
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Filters */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-24">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-gray-900 dark:text-white">Filters</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">{totalResults} results</span>
            </div>
            <FilterContent />
          </div>
        </div>
      </div>

      {/* Mobile Filter Button */}
      <Button
        variant="outline"
        className="lg:hidden fixed bottom-6 right-6 z-30 shadow-lg rounded-full px-4"
        onClick={() => setIsMobileFilterOpen(true)}
        icon={<SlidersHorizontal className="h-4 w-4" />}
      >
        Filters
        {filters.category || filters.rating || filters.inStock ? (
          <span className="ml-1.5 px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs rounded-full">
            Active
          </span>
        ) : null}
      </Button>

      {/* Mobile Filter Modal */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileFilterOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white dark:bg-gray-800 shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">Filters</h2>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <FilterContent />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
