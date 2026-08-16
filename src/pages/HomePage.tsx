import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { getCache, setCache } from '../lib/cache';
import { HeroBanner, CategoryGrid, FlashSaleBanner, CustomerReviews } from '../components/home';
import { ProductGrid } from '../components/shop';
import { Button } from '../components/common';
import { useSettings } from '../contexts/SettingsContext';
import type { Product, Category } from '../types/database';

export function HomePage() {
  const { settings } = useSettings();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [bestsellers, setBestsellers] = useState<Product[]>([]);
  const [flashSaleProducts, setFlashSaleProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setSubscribing(true);
    await new Promise((r) => setTimeout(r, 600));
    setSubscribed(true);
    toast.success('Thank you for subscribing! You will receive updates on new products and offers.');
    setNewsletterEmail('');
    setSubscribing(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const cachedCategories = getCache<Category[]>('gms_home_categories');
      const [featuredRes, newArrivalsRes, bestsellersRes, flashSaleRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('*, category:categories(*)').eq('is_featured', true).eq('status', 'active').limit(8),
        supabase.from('products').select('*, category:categories(*)').eq('is_new', true).eq('status', 'active').limit(8),
        supabase.from('products').select('*, category:categories(*)').eq('is_bestseller', true).eq('status', 'active').limit(8),
        supabase.from('products').select('*, category:categories(*)').eq('is_flash_sale', true).eq('status', 'active').limit(4),
        cachedCategories
          ? Promise.resolve({ data: cachedCategories })
          : supabase.from('categories').select('*').order('sort_order').limit(10),
      ]);

      if (featuredRes.data) setFeaturedProducts(featuredRes.data as Product[]);
      if (newArrivalsRes.data) setNewArrivals(newArrivalsRes.data as Product[]);
      if (bestsellersRes.data) setBestsellers(bestsellersRes.data as Product[]);
      if (flashSaleRes.data) setFlashSaleProducts(flashSaleRes.data as Product[]);
      if (categoriesRes.data) {
        const categoryData = categoriesRes.data as Category[];
        setCategories(categoryData);
        setCache('gms_home_categories', categoryData, 1000 * 60 * 15);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <HeroBanner />
      <CategoryGrid categories={categories} loading={loading} />
      <FlashSaleBanner products={flashSaleProducts} />

      {/* Flash Sale Products */}
      {flashSaleProducts.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
                {settings.flash_sale_title || "Flash Sale Products"}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {settings.flash_sale_subtitle || "Limited time offers at unbeatable prices"}
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
              {settings.featured_title || "Featured Products"}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {settings.featured_subtitle || "Handpicked products just for you"}
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
              {settings.bestsellers_title || "Best Sellers"}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {settings.bestsellers_subtitle || "Top rated products loved by our customers"}
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
              {settings.new_arrivals_title || "New Arrivals"}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {settings.new_arrivals_subtitle || "Fresh products just added to our store"}
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
              {settings.promo_title || `Welcome to ${settings.store_name || "Azhar's Store"}`}
            </h2>

            <p className="text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
              {settings.promo_subtitle ||
                settings.store_tagline ||
                "Join our newsletter and receive exclusive offers and latest updates."}
            </p>
            {subscribed ? (
              <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-sm font-medium">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span>Thank you for subscribing! Check your inbox for updates.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <Button type="submit" loading={subscribing} className="bg-white text-gray-900 hover:bg-gray-100 font-bold">
                  Subscribe
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>

      <CustomerReviews />
    </div>
  );
}
export default HomePage;
