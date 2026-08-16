import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getCache, setCache } from '../lib/cache';
import { ProductGrid, ShopFilters, ShopSort } from '../components/shop';
import { Pagination } from '../components/common';
import { searchProducts } from '../lib/search';
import type { Product, Category, FilterState } from '../types/database';
import { Sparkles } from 'lucide-react';

const ITEMS_PER_PAGE = 12;

export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [didYouMean, setDidYouMean] = useState<string | null>(null);

  const filters: FilterState = useMemo(() => ({
    category: searchParams.get('category'),
    priceRange: [Number(searchParams.get('minPrice')) || 0, Number(searchParams.get('maxPrice')) || 100000],
    rating: searchParams.get('rating') ? Number(searchParams.get('rating')) : null,
    sortBy: (searchParams.get('sort') as FilterState['sortBy']) || (searchParams.get('search') ? 'relevance' : 'newest'),
    search: searchParams.get('search') || '',
    inStock: searchParams.get('inStock') === 'true',
  }), [searchParams]);

  useEffect(() => {
    const fetchCategories = async () => {
      const cacheKey = 'gms_shop_categories';
      const cached = getCache<Category[]>(cacheKey);
      if (cached) {
        setCategories(cached);
        return;
      }

      const { data } = await supabase.from('categories').select('*').order('sort_order');
      if (data) {
        const categoryData = data as Category[];
        setCategories(categoryData);
        setCache(cacheKey, categoryData, 1000 * 60 * 30);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setDidYouMean(null);

      const filterParam = searchParams.get('filter') as 'new' | 'bestseller' | 'featured' | 'flash' | null;

      const result = await searchProducts({
        query: filters.search,
        categorySlug: filters.category,
        minPrice: filters.priceRange[0],
        maxPrice: filters.priceRange[1],
        minRating: filters.rating,
        inStock: filters.inStock,
        filterBadge: filterParam,
        sortBy: filters.sortBy,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      });

      setProducts(result.products);
      setTotalProducts(result.total);
      if (result.didYouMean) {
        setDidYouMean(result.didYouMean);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [filters, currentPage, searchParams]);


  const updateFilters = useCallback((newFilters: Partial<FilterState>) => {
    const params = new URLSearchParams(searchParams);

    if (newFilters.category !== undefined) {
      if (newFilters.category) {
        params.set('category', newFilters.category);
      } else {
        params.delete('category');
      }
    }

    if (newFilters.priceRange !== undefined) {
      if (newFilters.priceRange[0] > 0) {
        params.set('minPrice', String(newFilters.priceRange[0]));
      } else {
        params.delete('minPrice');
      }
      if (newFilters.priceRange[1] < 100000) {
        params.set('maxPrice', String(newFilters.priceRange[1]));
      } else {
        params.delete('maxPrice');
      }
    }

    if (newFilters.rating !== undefined) {
      if (newFilters.rating) {
        params.set('rating', String(newFilters.rating));
      } else {
        params.delete('rating');
      }
    }

    if (newFilters.sortBy !== undefined) {
      params.set('sort', newFilters.sortBy);
    }

    if (newFilters.inStock !== undefined) {
      if (newFilters.inStock) {
        params.set('inStock', 'true');
      } else {
        params.delete('inStock');
      }
    }

    setSearchParams(params);
    setCurrentPage(1);
  }, [searchParams, setSearchParams]);

  const clearFilters = useCallback(() => {
    setSearchParams({});
    setCurrentPage(1);
  }, [setSearchParams]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-2">
          {searchParams.get('search')
            ? `Search Results for "${searchParams.get('search')}"`
            : searchParams.get('filter') === 'new'
            ? 'New Arrivals'
            : searchParams.get('filter') === 'bestseller'
            ? 'Best Sellers'
            : searchParams.get('filter') === 'flash'
            ? 'Flash Sale'
            : searchParams.get('filter') === 'featured'
            ? 'Featured Products'
            : 'Shop All Products'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {totalProducts} products found in store database
        </p>

        {/* Did You Mean Suggestion Banner */}
        {didYouMean && (
          <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center gap-2 text-sm text-indigo-900 dark:text-indigo-200">
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <span>
              Did you mean:{' '}
              <button
                onClick={() => updateFilters({ search: didYouMean })}
                className="font-bold underline hover:text-indigo-600 dark:hover:text-indigo-300 ml-1"
              >
                "{didYouMean}"
              </button>
            </span>
          </div>
        )}
      </div>

      <div className="lg:flex gap-8">
        <ShopFilters
          categories={categories}
          filters={filters}
          onChange={updateFilters}
          onClear={clearFilters}
          totalResults={totalProducts}
        />

        <div className="flex-1">
          <ShopSort
            filters={filters}
            onChange={updateFilters}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          <div className="mt-6">
            <ProductGrid
              products={products}
              loading={loading}
              columns={4}
              emptyMessage={
                filters.search
                  ? `No products found matching "${filters.search}"`
                  : 'No products found'
              }
            />
          </div>

          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                showSummary
                totalItems={totalProducts}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default ShopPage;
