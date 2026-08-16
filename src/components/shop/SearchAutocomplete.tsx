import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Tag, ArrowRight, Loader2, Sparkles, Folder } from 'lucide-react';
import { getSearchSuggestions, SearchSuggestionResult } from '../../lib/search';
import type { Product, Category } from '../../types/database';

interface SearchAutocompleteProps {
  query: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct?: (product: Product) => void;
  onSelectCategory?: (category: Category) => void;
  onSearchSubmit: (term: string) => void;
}

export function SearchAutocomplete({
  query,
  isOpen,
  onClose,
  onSelectProduct,
  onSelectCategory,
  onSearchSubmit,
}: SearchAutocompleteProps) {
  const [results, setResults] = useState<SearchSuggestionResult>({
    products: [],
    categories: [],
    suggestions: [],
  });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const cleanQuery = query.trim();

  // Debounced autocomplete search
  useEffect(() => {
    if (!cleanQuery) {
      setResults({ products: [], categories: [], suggestions: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    setSelectedIndex(-1);

    const timer = setTimeout(async () => {
      const res = await getSearchSuggestions(cleanQuery, 6);
      setResults(res);
      setLoading(false);
    }, 180);

    return () => clearTimeout(timer);
  }, [cleanQuery]);

  // Total selectable items count for keyboard navigation
  const totalItems =
    results.categories.length +
    results.suggestions.length +
    results.products.length;

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
      } else if (e.key === 'Enter') {
        if (selectedIndex >= 0 && selectedIndex < totalItems) {
          e.preventDefault();
          let current = 0;

          // Check products first
          if (selectedIndex < results.products.length) {
            const prod = results.products[selectedIndex];
            if (onSelectProduct) {
              onSelectProduct(prod);
            } else {
              navigate(`/product/${prod.slug || prod.id}`);
            }
            onClose();
            return;
          }
          current += results.products.length;

          // Check categories
          if (selectedIndex < current + results.categories.length) {
            const cat = results.categories[selectedIndex - current];
            if (onSelectCategory) {
              onSelectCategory(cat);
            } else {
              navigate(`/shop?category=${cat.slug}`);
            }
            onClose();
            return;
          }
          current += results.categories.length;

          // Check suggestions
          if (selectedIndex < current + results.suggestions.length) {
            const sugg = results.suggestions[selectedIndex - current];
            const term = sugg.replace(/^in\s+/i, '');
            onSearchSubmit(term);
            onClose();
            return;
          }
        } else {
          // Default submit
          onSearchSubmit(cleanQuery);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, totalItems, results, cleanQuery, navigate, onClose, onSearchSubmit, onSelectCategory, onSelectProduct]);

  if (!isOpen || !cleanQuery) return null;

  const hasContent =
    results.products.length > 0 ||
    results.categories.length > 0 ||
    results.suggestions.length > 0;

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200/80 dark:border-gray-800/80 overflow-hidden z-50 transition-all duration-200"
    >
      {loading ? (
        <div className="p-6 flex items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
          <span className="text-sm font-medium">Searching store database...</span>
        </div>
      ) : !hasContent ? (
        <div className="p-6 text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
            <Search className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            No instant matches for "{cleanQuery}"
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Press <kbd className="px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-800 rounded border">Enter</kbd> to search all fields in database
          </p>
        </div>
      ) : (
        <div className="max-h-[70vh] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
          {/* Product Results - Rendered First for Direct Store Products Visibility */}
          {results.products.length > 0 && (
            <div className="p-2">
              <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
                <span>Products in Store ({results.products.length})</span>
                <span className="text-[10px] text-gray-400 font-normal">Use arrow keys ↑↓</span>
              </p>
              <div className="space-y-1">
                {results.products.map((product, idx) => {
                  const isSelected = selectedIndex === idx;
                  const price =
                    product.is_flash_sale && product.flash_sale_price
                      ? product.flash_sale_price
                      : product.price;

                  return (
                    <button
                      key={product.id}
                      onClick={() => {
                        if (onSelectProduct) {
                          onSelectProduct(product);
                        } else {
                          navigate(`/product/${product.slug || product.id}`);
                        }
                        onClose();
                      }}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors ${
                        isSelected
                          ? 'bg-primary-50 dark:bg-primary-950/40 ring-1 ring-primary-500/30'
                          : 'hover:bg-gray-100/80 dark:hover:bg-gray-800/80'
                      }`}
                    >
                      <img
                        src={product.images?.[0] || 'https://via.placeholder.com/80'}
                        alt={product.name}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-gray-100 dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                          {product.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {product.category?.name && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium truncate">
                              {product.category.name}
                            </span>
                          )}
                          {product.brand && (
                            <span className="text-[10px] text-gray-400 truncate">
                              by {product.brand}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-primary-600 dark:text-primary-400">
                          ₹{price.toLocaleString()}
                        </p>
                        {product.compare_price && product.compare_price > price && (
                          <p className="text-[10px] text-gray-400 line-through">
                            ₹{product.compare_price.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Categories Suggestions */}
          {results.categories.length > 0 && (
            <div className="p-2 bg-gray-50/50 dark:bg-gray-900/50">
              <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Matching Categories
              </p>
              <div className="space-y-0.5">
                {results.categories.map((cat, idx) => {
                  const itemIndex = results.products.length + idx;
                  const isSelected = selectedIndex === itemIndex;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        if (onSelectCategory) onSelectCategory(cat);
                        else navigate(`/shop?category=${cat.slug}`);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-sm transition-colors ${
                        isSelected
                          ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-semibold'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Folder className="h-4 w-4 text-primary-500" />
                        <span>In <strong className="text-gray-900 dark:text-white">{cat.name}</strong></span>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Keyword Suggestions */}
          {results.suggestions.length > 0 && (
            <div className="p-2">
              <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Suggested Searches
              </p>
              <div className="space-y-0.5">
                {results.suggestions.map((sugg, idx) => {
                  const itemIndex = results.products.length + results.categories.length + idx;
                  const isSelected = selectedIndex === itemIndex;
                  return (
                    <button
                      key={sugg}
                      onClick={() => {
                        const term = sugg.replace(/^in\s+/i, '');
                        onSearchSubmit(term);
                        onClose();
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-left text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-bold'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Tag className="h-3.5 w-3.5 text-gray-400" />
                      <span>{sugg}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Action */}
          <div className="p-2 bg-gray-50/80 dark:bg-gray-900/80 text-center">
            <button
              onClick={() => {
                onSearchSubmit(cleanQuery);
                onClose();
              }}
              className="w-full py-2 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>See all search results for "{cleanQuery}"</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
