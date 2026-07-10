import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Category } from '../../types/database';

interface CategoryGridProps {
  categories: Category[];
  loading?: boolean;
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

export function CategoryGrid({ categories, loading }: CategoryGridProps) {
  if (loading) {
    return (
      <section className="mb-12">
        <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-6">
          Shop by Category
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl h-32" />
          ))}
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          Shop by Category
        </h2>
        <Link to="/categories" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium flex items-center gap-1">
          View All <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {categories.slice(0, 10).map((category) => (
          <Link
            key={category.id}
            to={`/shop?category=${category.slug}`}
            className="group relative bg-white dark:bg-gray-800 rounded-xl p-6 text-center hover:shadow-card-hover transition-all duration-300 border border-gray-100 dark:border-gray-700"
          >
            <div className="text-4xl mb-3">
              {categoryIcons[category.slug] || '📦'}
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {category.name}
            </h3>
            {category.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {category.description}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
