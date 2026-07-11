import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, Button } from '../components/common';
import type { Category, Product } from '../types/database';

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryProducts, setCategoryProducts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');

      if (categoriesData) {
        setCategories(categoriesData as Category[]);

        const counts: Record<string, number> = {};
        for (const cat of categoriesData) {
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', cat.id)
            .eq('status', 'active');
          counts[cat.id] = count || 0;
        }
        setCategoryProducts(counts);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const categoryIcons: Record<string, string> = {
    electronics: '📱',
    fashion: '👗',
    shoes: '👟',
    beauty: '💄',
    sports: '⚽',
    books: '📚',
    'home-kitchen': '🏠',
    furniture: '🛋️',
    groceries: '🛒',
    toys: '🧸',
    accessories: '⌚',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-gray-900 dark:text-white mb-4">
          Browse Categories
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          Explore our wide range of products organized by category. Find exactly what you're looking for.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {categories.map((category) => (
          <Link
            key={category.id}
            to={`/shop?category=${category.slug}`}
            className="group relative bg-white dark:bg-gray-800 rounded-xl p-6 hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700"
          >
            {category.image_url && (
              <img
                src={category.image_url}
                alt={category.name}
                className="w-full h-32 object-contain mb-4 rounded-lg"
              />
            )}
            <div className={`text-5xl mb-4 ${category.image_url ? 'hidden' : ''}`}>
              {categoryIcons[category.slug] || '📦'}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors flex items-center justify-between">
              {category.name}
              <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            {category.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                {category.description}
              </p>
            )}
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-3">
              {categoryProducts[category.id] || 0} products
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
export default CategoriesPage;
