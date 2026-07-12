import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { HeroBanner, CategoryGrid, FlashSaleBanner, CustomerReviews } from '../components/home';
import { ProductGrid } from '../components/shop';
import { Button, LoadingSpinner } from '../components/common';
import type { Product, Category } from '../types/database';

export function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [bestsellers, setBestsellers] = useState<Product[]>([]);
  const [flashSaleProducts, setFlashSaleProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const [featuredRes, newArrivalsRes, bestsellersRes, flashSaleRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('*, category:categories(*)').eq('is_featured', true).eq('status', 'active').limit(8),
        supabase.from('products').select('*, category:categories(*)').eq('is_new', true).eq('status', 'active').limit(8),
        supabase.from('products').select('*, category:categories(*)').eq('is_bestseller', true).eq('status', 'active').limit(8),
        supabase.from('products').select('*, category:categories(*)').eq('is_flash_sale', true).eq('status', 'active').limit(4),
        supabase.from('categories').select('*').order('sort_order').limit(10),
      ]);

      console.log("Featured:", featuredRes);
console.log("New Arrivals:", newArrivalsRes);
console.log("Bestsellers:", bestsellersRes);
console.log("Flash Sale:", flashSaleRes);
console.log("Categories:", categoriesRes);
console.log("First Product:", featuredRes.data?.[0]);
console.log("Images:", featuredRes.data?.[0]?.images);
      if (featuredRes.data) setFeaturedProducts(featuredRes.data as Product[]);
      if (newArrivalsRes.data) setNewArrivals(newArrivalsRes.data as Product[]);
      if (bestsellersRes.data) setBestsellers(bestsellersRes.data as Product[]);
      if (flashSaleRes.data) setFlashSaleProducts(flashSaleRes.data as Product[]);
      if (categoriesRes.data) setCategories(categoriesRes.data as Category[]);

      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <HeroBanner />
      <CategoryGrid categories={categories} loading={loading} />
      <FlashSaleBanner />

      {/* Flash Sale Products */}
      {flashSaleProducts.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
                Flash Sale Products
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Limited time offers at unbeatable prices
              </p>
            </div>
            <Link to="/shop?filter=flash">
              <Button variant="ghost" icon={<ArrowRight className="h-4 w-4" />} iconPosition="right">
                View All
              </Button>
            </Link>
          </div>
          <ProductGrid products={flashSaleProducts} columns={4} />
        </section>
      )}

      {/* Featured Products */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
              Featured Products
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Handpicked products just for you
            </p>
          </div>
          <Link to="/shop?filter=featured">
            <Button variant="ghost" icon={<ArrowRight className="h-4 w-4" />} iconPosition="right">
              View All
            </Button>
          </Link>
        </div>
        <ProductGrid products={featuredProducts} loading={loading} columns={4} />
      </section>

      {/* Best Sellers */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
              Best Sellers
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Top rated products loved by our customers
            </p>
          </div>
          <Link to="/shop?filter=bestseller">
            <Button variant="ghost" icon={<ArrowRight className="h-4 w-4" />} iconPosition="right">
              View All
            </Button>
          </Link>
        </div>
        <ProductGrid products={bestsellers} loading={loading} columns={4} />
      </section>

      {/* New Arrivals */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
              New Arrivals
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Fresh products just added to our store
            </p>
          </div>
          <Link to="/shop?filter=new">
            <Button variant="ghost" icon={<ArrowRight className="h-4 w-4" />} iconPosition="right">
              View All
            </Button>
          </Link>
        </div>
        <ProductGrid products={newArrivals} loading={loading} columns={4} />
      </section>

      {/* Promotional Banner */}
      <section className="mb-12">
        <div className="relative bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <img
              src="https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&w=1600"
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="relative px-6 py-12 md:px-12 md:py-16 text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
              Get 20% Off Your First Order
            </h2>
            <p className="text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
              Join our newsletter and receive an exclusive discount code for your first purchase.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Button className="bg-white text-gray-900 hover:bg-gray-100">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
      </section>

      <CustomerReviews />
    </div>
  );
}
export default HomePage;
