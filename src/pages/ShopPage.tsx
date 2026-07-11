import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ProductGrid, ShopFilters, ShopSort } from '../components/shop';
import { PageLoader, Pagination } from '../components/common';
import type { Product, Category, FilterState } from '../types/database';

const ITEMS_PER_PAGE = 12;

export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filters: FilterState = useMemo(() => ({
    category: searchParams.get('category'),
    priceRange: [Number(searchParams.get('minPrice')) || 0, Number(searchParams.get('maxPrice')) || 100000],
    rating: searchParams.get('rating') ? Number(searchParams.get('rating')) : null,
    sortBy: (searchParams.get('sort') as FilterState['sortBy']) || 'newest',
    search: searchParams.get('search') || '',
    inStock: searchParams.get('inStock') === 'true',
  }), [searchParams]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*').order('sort_order');
      if (data) setCategories(data as Category[]);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);

      let query = supabase
        .from('products')
        .select('*, category:categories(*)', { count: 'exact' })
        .eq('status', 'active');

      if (filters.category) {
        const { data: catData } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', filters.category)
          .maybeSingle();
        if (catData) {
          query = query.eq('category_id', catData.id);
        }
      }

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,tags.cs.{${filters.search}}`);
      }

      if (filters.priceRange[0] > 0 || filters.priceRange[1] < 100000) {
        query = query.gte('price', filters.priceRange[0]).lte('price', filters.priceRange[1]);
      }

      if (filters.rating) {
        query = query.gte('rating_avg', filters.rating);
      }

      if (filters.inStock) {
        query = query.gt('quantity', 0);
      }

      const filterParam = searchParams.get('filter');
      if (filterParam === 'new') {
        query = query.eq('is_new', true);
      } else if (filterParam === 'bestseller') {
        query = query.eq('is_bestseller', true);
      } else if (filterParam === 'featured') {
        query = query.eq('is_featured', true);
      } else if (filterParam === 'flash') {
        query = query.eq('is_flash_sale', true);
      }

      const sortBy = filters.sortBy;
      if (sortBy === 'price-low') {
        query = query.order('price', { ascending: true });
      } else if (sortBy === 'price-high') {
        query = query.order('price', { ascending: false });
      } else if (sortBy === 'rating') {
        query = query.order('rating_avg', { ascending: false });
      } else if (sortBy === 'popular') {
        query = query.order('rating_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE - 1;
      query = query.range(start, end);

      const { data, error, count } = await query;

      if (!error && data) {
        setProducts(data as Product[]);
        setTotalProducts(count || 0);
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
          {totalProducts} products found
        </p>
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
