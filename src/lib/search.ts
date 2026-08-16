import { supabase } from './supabase';
import type { Product, Category } from '../types/database';

export interface SearchOptions {
  query: string;
  categorySlug?: string | null;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number | null;
  inStock?: boolean;
  filterBadge?: 'new' | 'bestseller' | 'featured' | 'flash' | null;
  sortBy?: 'newest' | 'price-low' | 'price-high' | 'rating' | 'popular' | 'relevance';
  page?: number;
  limit?: number;
}

export interface SearchResult {
  products: Product[];
  total: number;
  didYouMean?: string | null;
  categoriesFound?: Category[];
}

export interface SearchSuggestionResult {
  products: Product[];
  categories: Category[];
  suggestions: string[];
}

interface ScoredProduct extends Product {
  _relevanceScore?: number;
  _score?: number;
}

// Memory cache for recent autocomplete suggestions
const suggestionCache = new Map<string, { data: SearchSuggestionResult; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes

/**
 * Calculates a relevance score for ranking search results like Amazon.
 */
export function calculateRelevanceScore(product: Product, query: string, tokens: string[]): number {
  let score = 0;
  const queryLower = query.toLowerCase().trim();
  if (!queryLower) return score;

  const nameLower = (product.name || '').toLowerCase();
  const brandLower = (product.brand || '').toLowerCase();
  const skuLower = (product.sku || '').toLowerCase();
  const descLower = (product.description || '').toLowerCase();
  const shortDescLower = (product.short_description || '').toLowerCase();
  const categoryNameLower = (product.category?.name || '').toLowerCase();
  const tagsLower = (product.tags || []).map((t) => t.toLowerCase()).join(' ');
  const specsLower = JSON.stringify(product.specifications || {}).toLowerCase();

  // 1. Title Matches
  if (nameLower === queryLower) {
    score += 1000;
  } else if (nameLower.startsWith(queryLower)) {
    score += 700;
  } else if (nameLower.includes(queryLower)) {
    score += 500;
  }

  // 2. Brand Matches
  if (brandLower === queryLower) {
    score += 400;
  } else if (brandLower.includes(queryLower)) {
    score += 250;
  }

  // 3. SKU Matches
  if (skuLower === queryLower) {
    score += 800;
  } else if (skuLower.includes(queryLower)) {
    score += 400;
  }

  // 4. Category Matches
  if (categoryNameLower === queryLower) {
    score += 350;
  } else if (categoryNameLower.includes(queryLower)) {
    score += 200;
  }

  // 5. Token-based matching across all fields
  for (const token of tokens) {
    if (!token) continue;

    if (nameLower.includes(token)) score += 120;
    if (brandLower.includes(token)) score += 100;
    if (skuLower.includes(token)) score += 100;
    if (categoryNameLower.includes(token)) score += 80;
    if (tagsLower.includes(token)) score += 90;
    if (specsLower.includes(token)) score += 60;
    if (shortDescLower.includes(token)) score += 40;
    if (descLower.includes(token)) score += 20;
  }

  // 6. Popularity & Quality Boost
  if (product.rating_avg) {
    score += product.rating_avg * 15;
  }
  if (product.rating_count) {
    score += Math.min(product.rating_count, 50);
  }
  if (product.is_bestseller) score += 50;
  if (product.is_featured) score += 30;
  if (product.is_new) score += 10;

  return score;
}

/**
 * Levenshtein distance for lightweight typo tolerance matching.
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Searches across the entire database for products with full field matching,
 * ranking, filtering, and typo fallback.
 */
export async function searchProducts(options: SearchOptions): Promise<SearchResult> {
  const {
    query = '',
    categorySlug = null,
    minPrice = 0,
    maxPrice = 100000,
    minRating = null,
    inStock = false,
    filterBadge = null,
    sortBy = 'relevance',
    page = 1,
    limit = 12,
  } = options;

  const cleanQuery = query.trim().replace(/\s+/g, ' ');
  const tokens = cleanQuery.toLowerCase().split(' ').filter(Boolean);

  let matchingCategoryIds: string[] = [];
  let foundCategories: Category[] = [];

  // Step 1: Check if query matches category names
  if (cleanQuery) {
    const { data: catData } = await supabase
      .from('categories')
      .select('*')
      .or(`name.ilike.%${cleanQuery}%,slug.ilike.%${cleanQuery}%`);

    if (catData && catData.length > 0) {
      foundCategories = catData as Category[];
      matchingCategoryIds = catData.map((c) => c.id);
    }
  }

  // Step 2: Build Base Products Query
  const fetchFromDb = async (searchPattern: string, catIds: string[]) => {
    let dbQuery = supabase
      .from('products')
      .select('*, category:categories(*)', { count: 'exact' })
      .eq('status', 'active');

    // Apply category filter if specified in sidebar
    if (categorySlug) {
      const { data: selCat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .maybeSingle();

      if (selCat) {
        dbQuery = dbQuery.eq('category_id', selCat.id);
      }
    }

    // Apply Search Clause across name, brand, sku, description, short_description, and category
    if (searchPattern) {
      const orClauses = [
        `name.ilike.%${searchPattern}%`,
        `brand.ilike.%${searchPattern}%`,
        `sku.ilike.%${searchPattern}%`,
        `description.ilike.%${searchPattern}%`,
        `short_description.ilike.%${searchPattern}%`,
      ];

      // Add token matches if search is multi-word
      const patternTokens = searchPattern.split(' ').filter((t) => t.length >= 2);
      if (patternTokens.length > 1) {
        for (const tok of patternTokens) {
          orClauses.push(`name.ilike.%${tok}%`);
          orClauses.push(`brand.ilike.%${tok}%`);
        }
      }

      if (catIds.length > 0) {
        orClauses.push(`category_id.in.(${catIds.join(',')})`);
      }

      dbQuery = dbQuery.or(orClauses.join(','));
    }

    // Apply Price Filters
    if (minPrice > 0 || maxPrice < 100000) {
      dbQuery = dbQuery.gte('price', minPrice).lte('price', maxPrice);
    }

    // Apply Rating Filter
    if (minRating) {
      dbQuery = dbQuery.gte('rating_avg', minRating);
    }

    // Apply In Stock Filter
    if (inStock) {
      dbQuery = dbQuery.gt('quantity', 0);
    }

    // Apply Badge Filter (new, bestseller, featured, flash)
    if (filterBadge === 'new') {
      dbQuery = dbQuery.eq('is_new', true);
    } else if (filterBadge === 'bestseller') {
      dbQuery = dbQuery.eq('is_bestseller', true);
    } else if (filterBadge === 'featured') {
      dbQuery = dbQuery.eq('is_featured', true);
    } else if (filterBadge === 'flash') {
      dbQuery = dbQuery.eq('is_flash_sale', true);
    }

    // Sorting
    if (sortBy === 'price-low') {
      dbQuery = dbQuery.order('price', { ascending: true });
    } else if (sortBy === 'price-high') {
      dbQuery = dbQuery.order('price', { ascending: false });
    } else if (sortBy === 'rating') {
      dbQuery = dbQuery.order('rating_avg', { ascending: false });
    } else if (sortBy === 'popular') {
      dbQuery = dbQuery.order('rating_count', { ascending: false });
    } else if (sortBy === 'newest') {
      dbQuery = dbQuery.order('created_at', { ascending: false });
    }

    return await dbQuery;
  };

  const dbRes = await fetchFromDb(cleanQuery, matchingCategoryIds);
  let data = dbRes.data;
  let count = dbRes.count;

  let didYouMean: string | null = null;

  // Step 3: Typo / Fuzzy Fallback if 0 results were found and cleanQuery is provided
  if ((!data || data.length === 0) && cleanQuery.length >= 3) {
    // Try word prefix or single character trim (e.g., 'headphon' -> 'headpho' or token prefix)
    const prefixQuery = cleanQuery.length > 4 ? cleanQuery.slice(0, -1) : cleanQuery;

    const fallbackResult = await fetchFromDb(prefixQuery, matchingCategoryIds);
    if (fallbackResult.data && fallbackResult.data.length > 0) {
      data = fallbackResult.data;
      count = fallbackResult.count;
    } else {
      // Try searching for distinct product names/brands to find a close typo correction
      const { data: sampleProducts } = await supabase
        .from('products')
        .select('name, brand')
        .eq('status', 'active')
        .limit(100);

      if (sampleProducts) {
        for (const p of sampleProducts) {
          const nameWords = p.name.split(' ');
          for (const word of nameWords) {
            if (word.length >= 3 && Math.abs(word.length - cleanQuery.length) <= 2) {
              const dist = levenshteinDistance(cleanQuery.toLowerCase(), word.toLowerCase());
              if (dist >= 1 && dist <= 2) {
                didYouMean = word;
                break;
              }
            }
          }
          if (didYouMean) break;
        }

        if (didYouMean) {
          const suggestedResult = await fetchFromDb(didYouMean, []);
          if (suggestedResult.data && suggestedResult.data.length > 0) {
            data = suggestedResult.data;
            count = suggestedResult.count;
          }
        }
      }
    }
  }

  let rawProducts = (data || []) as ScoredProduct[];

  // Step 4: Relevance Ranking (if searching with a query and default or relevance sorting)
  if (cleanQuery && (sortBy === 'relevance' || !sortBy)) {
    rawProducts = rawProducts.map((p) => ({
      ...p,
      _relevanceScore: calculateRelevanceScore(p, cleanQuery, tokens),
    })).sort((a: ScoredProduct, b: ScoredProduct) => (b._relevanceScore || 0) - (a._relevanceScore || 0));
  }

  // Step 5: Pagination
  const total = count || rawProducts.length;
  const start = (page - 1) * limit;
  const paginatedProducts = rawProducts.slice(start, start + limit);

  return {
    products: paginatedProducts,
    total,
    didYouMean,
    categoriesFound: foundCategories,
  };
}

/**
 * Fast search suggestions / autocomplete for header search inputs.
 */
export async function getSearchSuggestions(query: string, limit = 6): Promise<SearchSuggestionResult> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) {
    return { products: [], categories: [], suggestions: [] };
  }

  // Check cache
  const cached = suggestionCache.get(cleanQuery);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    // 1. Fetch matching categories
    const { data: catData } = await supabase
      .from('categories')
      .select('*')
      .or(`name.ilike.%${cleanQuery}%,slug.ilike.%${cleanQuery}%`)
      .limit(3);

    const categories = (catData || []) as Category[];
    const categoryIds = categories.map((c) => c.id);

    // 2. Fetch matching products across multiple fields
    const orClauses = [
      `name.ilike.%${cleanQuery}%`,
      `brand.ilike.%${cleanQuery}%`,
      `sku.ilike.%${cleanQuery}%`,
      `description.ilike.%${cleanQuery}%`,
      `short_description.ilike.%${cleanQuery}%`,
    ];
    if (categoryIds.length > 0) {
      orClauses.push(`category_id.in.(${categoryIds.join(',')})`);
    }

    const { data: prodData } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('status', 'active')
      .or(orClauses.join(','))
      .limit(limit * 2);

    let products = (prodData || []) as ScoredProduct[];

    // Rank products by relevance
    const tokens = cleanQuery.split(' ');
    products = products
      .map((p) => ({
        ...p,
        _score: calculateRelevanceScore(p, cleanQuery, tokens),
      }))
      .sort((a: ScoredProduct, b: ScoredProduct) => (b._score || 0) - (a._score || 0))
      .slice(0, limit);

    // 3. Extract keyword suggestions (brands, category names, tags)
    const suggestionsSet = new Set<string>();

    categories.forEach((c) => suggestionsSet.add(`in ${c.name}`));
    products.forEach((p) => {
      if (p.brand && p.brand.toLowerCase().includes(cleanQuery)) {
        suggestionsSet.add(p.brand);
      }
      if (p.tags && Array.isArray(p.tags)) {
        p.tags.forEach((t) => {
          if (t.toLowerCase().includes(cleanQuery)) {
            suggestionsSet.add(t);
          }
        });
      }
    });

    const result: SearchSuggestionResult = {
      products,
      categories,
      suggestions: Array.from(suggestionsSet).slice(0, 4),
    };

    suggestionCache.set(cleanQuery, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.error('Error fetching search suggestions:', err);
    return { products: [], categories: [], suggestions: [] };
  }
}
