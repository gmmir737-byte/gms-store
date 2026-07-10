import React from 'react';
import { ProductCard } from './ProductCard';
import { EmptyState } from '../common';
import { Package } from 'lucide-react';
import type { Product } from '../../types/database';

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  columns?: 3 | 4;
  emptyMessage?: string;
}

export function ProductGrid({ products, loading, columns = 4, emptyMessage = 'No products found' }: ProductGridProps) {
  if (loading) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${columns === 4 ? 'lg:grid-cols-3 xl:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden animate-pulse">
            <div className="aspect-square bg-gray-200 dark:bg-gray-700" />
            <div className="p-4 space-y-3">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<Package className="h-16 w-16" />}
        title={emptyMessage}
        description="Try adjusting your filters or search query"
      />
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${columns === 4 ? 'lg:grid-cols-3 xl:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
