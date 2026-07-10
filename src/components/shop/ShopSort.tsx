import React from 'react';
import { Grid3X3, List, ArrowUpDown } from 'lucide-react';
import { Select } from '../common';
import type { FilterState } from '../../types/database';

interface ShopSortProps {
  filters: FilterState;
  onChange: (filters: Partial<FilterState>) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function ShopSort({ filters, onChange, viewMode, onViewModeChange }: ShopSortProps) {
  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'popular', label: 'Most Popular' },
  ];

  return (
    <div className="flex items-center justify-between gap-4 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">Sort by:</span>
        <Select
          options={sortOptions}
          value={filters.sortBy}
          onChange={(e) => onChange({ sortBy: e.target.value as FilterState['sortBy'] })}
          className="w-44"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onViewModeChange('grid')}
          className={`p-2 rounded-lg transition-colors ${
            viewMode === 'grid'
              ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          <Grid3X3 className="h-5 w-5" />
        </button>
        <button
          onClick={() => onViewModeChange('list')}
          className={`p-2 rounded-lg transition-colors ${
            viewMode === 'list'
              ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          <List className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
