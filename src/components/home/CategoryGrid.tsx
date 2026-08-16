import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Category } from '../../types/database';
import { Reveal } from '../common';
import { useInteractiveTilt } from '../../hooks/useInteractiveTilt';
import { useSettings } from '../../contexts/SettingsContext';

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

function CategoryCard({ category }: { category: Category }) {
  const tilt = useInteractiveTilt({ maxRotation: 9, scaleOnHover: 1.04 });

  return (
    <Link
      to={`/shop?category=${category.slug}`}
      ref={tilt.ref as any}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
      onPointerCancel={tilt.onPointerCancel}
      style={tilt.style}
      className="motion-surface holo-surface group relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 text-center shadow-card hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-500 border border-gray-100 dark:border-gray-700/80 flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="text-4xl sm:text-5xl mb-3 layer-pop transition-transform duration-300 group-hover:scale-110">
        {categoryIcons[category.slug] || '📦'}
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
        {category.name}
      </h3>
      {category.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
          {category.description}
        </p>
      )}
    </Link>
  );
}

export function CategoryGrid({ categories, loading }: CategoryGridProps) {
  const { settings } = useSettings();

  if (loading) {
    return (
      <section className="mb-12">
        <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-6">
          {settings.categories_title || 'Shop by Category'}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-2xl h-36" />
          ))}
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-widest block mb-1">
            {settings.categories_subtitle || 'Explore Collections'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-white">
            {settings.categories_title || 'Shop by Category'}
          </h2>
        </div>
        <Link
          to="/categories"
          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
        >
          View All{' '}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4.5">
        {categories.slice(0, 10).map((category, index) => (
          <Reveal key={category.id} delay={index % 4}>
            <CategoryCard category={category} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

