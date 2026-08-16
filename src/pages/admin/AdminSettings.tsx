import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Button, Input, LoadingSpinner, ImageUploadInput } from "../../components/common";
import { useSettings, Settings, defaultSettings, sanitizeSettings } from "../../contexts/SettingsContext";
import toast from "react-hot-toast";
import {
  Store,
  Megaphone,
  Layout,
  PhoneCall,
  Share2,
  Truck,
  CreditCard,
  Search,
  CheckCircle2,
  Sparkles,
  Eye,
  Laptop,
} from "lucide-react";

export const AdminSettings: React.FC = () => {
  const { settings: globalSettings, refreshSettings, updateSettings } = useSettings();
  const [form, setForm] = useState<Settings>(defaultSettings);
  const [activeTab, setActiveTab] = useState<
    "branding" | "header" | "homepage" | "contact" | "social" | "shipping" | "payments" | "seo"
  >("homepage");
  const [previewSlideIndex, setPreviewSlideIndex] = useState<0 | 1 | 2>(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) {
        toast.error(`Database note: ${error.message}`);
        setForm(sanitizeSettings(globalSettings));
      } else if (data) {
        setForm(sanitizeSettings(data));
      } else {
        setForm(sanitizeSettings(globalSettings));
      }
    } catch {
      setForm(sanitizeSettings(globalSettings));
    } finally {
      setLoading(false);
    }
  };

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setHasChanges(true);
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (name: keyof Settings, value: string) => {
    setHasChanges(true);
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const onNumberChange = (name: keyof Settings, value: string) => {
    setHasChanges(true);
    const num = parseFloat(value) || 0;
    setForm((prev) => ({
      ...prev,
      [name]: num,
    }));
  };

  const onToggle = (name: keyof Settings, checked: boolean) => {
    setHasChanges(true);
    setForm((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      // 1. Immediately apply changes to local app context and storage cache
      updateSettings(form);

      // 2. Persist to Supabase settings table
      let saveError: { message?: string } | null = null;

      if (form.id) {
        const { error } = await supabase
          .from("settings")
          .update(form)
          .eq("id", form.id);
        saveError = error;
      } else {
        // First check if any row exists
        const { data: existing } = await supabase
          .from("settings")
          .select("id")
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          const { error } = await supabase
            .from("settings")
            .update(form)
            .eq("id", existing.id);
          saveError = error;
        } else {
          const { error } = await supabase
            .from("settings")
            .insert([form]);
          saveError = error;
        }
      }

      if (saveError) {
        // If Supabase schema lacks new columns, try saving the base supported columns
        console.warn("Retrying with core supported settings columns:", saveError);
        const { error: coreError } = await supabase
          .from("settings")
          .upsert({
            store_name: form.store_name,
            store_tagline: form.store_tagline,
            about_us: form.about_us,
            email: form.email,
            phone: form.phone,
            whatsapp: form.whatsapp,
            address: form.address,
            city: form.city,
            state: form.state,
            country: form.country,
            postal_code: form.postal_code,
            website: form.website,
            facebook: form.facebook,
            instagram: form.instagram,
            twitter: form.twitter,
            youtube: form.youtube,
            logo_url: form.logo_url,
            favicon_url: form.favicon_url,
            hero_image: form.hero_image,
            hero_title: form.hero_title,
            hero_subtitle: form.hero_subtitle,
            hero_description: form.hero_description,
            hero_button_text: form.hero_button_text,
            free_shipping_amount: form.free_shipping_amount,
            shipping_charge: form.shipping_charge,
            cod_enabled: form.cod_enabled,
            razorpay_enabled: form.razorpay_enabled,
            razorpay_key: form.razorpay_key,
            razorpay_secret: form.razorpay_secret,
          });

        if (coreError) {
          toast.error(`Database note: ${coreError.message}`);
        } else {
          toast.success("Settings saved successfully!");
        }
      } else {
        toast.success("Settings saved successfully!");
      }

      await refreshSettings();
      setHasChanges(false);
      setLastSaved(new Date().toLocaleTimeString());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save settings";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <LoadingSpinner />
      </div>
    );
  }

  const tabs = [
    { id: "branding", label: "Store Branding", icon: Store },
    { id: "header", label: "Header & Announcement", icon: Megaphone },
    { id: "homepage", label: "Homepage Sections", icon: Layout },
    { id: "contact", label: "Contact & Business", icon: PhoneCall },
    { id: "social", label: "Social Media", icon: Share2 },
    { id: "shipping", label: "Shipping & Returns", icon: Truck },
    { id: "payments", label: "Payments & Gateway", icon: CreditCard },
    { id: "seo", label: "SEO & Metadata", icon: Search },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-800 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800">
              Live Config
            </span>
            {lastSaved && (
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Saved at {lastSaved}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-gray-900 dark:text-white mt-1">
            Store & Website Settings
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Configure dynamic branding, homepage banners, header announcements, policies, and payment gateways.
          </p>
        </div>

        <Button
          onClick={save}
          disabled={saving}
          className="min-w-[150px] shadow-lg shadow-primary-600/20"
        >
          {saving ? (
            "Saving..."
          ) : hasChanges ? (
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Save Changes *
            </span>
          ) : (
            "Save Settings"
          )}
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-primary-600 text-white shadow-md shadow-primary-600/20"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/80 border border-gray-200/80 dark:border-gray-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Settings Tab Panels */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-800 p-6 sm:p-8">
        {/* 1. STORE BRANDING */}
        {activeTab === "branding" && (
          <div className="space-y-6">
            <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-primary-600" />
                Store Branding & Identity
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Customize your store name, tagline, logos, and copyright notice.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Store Name *"
                name="store_name"
                value={form.store_name}
                onChange={onChange}
                placeholder="Azhar's Store"
                required
              />

              <Input
                label="Store Tagline"
                name="store_tagline"
                value={form.store_tagline}
                onChange={onChange}
                placeholder="Your trusted destination for quality products"
              />

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-gray-100 dark:border-gray-800">
                <ImageUploadInput
                  label="Store Logo Image"
                  value={form.logo_url}
                  onChange={(val) => handleImageChange("logo_url", val)}
                  placeholder="https://example.com/logo.png"
                  aspectRatioHint="Recommended: 400 × 120 (Transparent PNG)"
                  helperText="Upload your store logo from PC or enter an image URL."
                />

                <ImageUploadInput
                  label="Store Favicon (Browser Icon)"
                  value={form.favicon_url}
                  onChange={(val) => handleImageChange("favicon_url", val)}
                  placeholder="https://example.com/favicon.ico"
                  aspectRatioHint="Recommended: 64 × 64 or 32 × 32 (Square)"
                  helperText="Upload your browser tab favicon from PC or enter an icon URL."
                />
              </div>

              <Input
                label="Copyright Notice"
                name="copyright_text"
                value={form.copyright_text}
                onChange={onChange}
                placeholder="All rights reserved."
              />

              <Input
                label="Primary Brand Color (Hex)"
                name="primary_color"
                value={form.primary_color || "#2563eb"}
                onChange={onChange}
                placeholder="#2563eb"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                About Us / Brand Story
              </label>
              <textarea
                name="about_us"
                value={form.about_us}
                onChange={onChange}
                rows={4}
                placeholder="Welcome to Azhar's Store. We are committed to providing quality products and an outstanding shopping experience."
                className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800/80 p-4 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/50 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* 2. HEADER & ANNOUNCEMENT */}
        {activeTab === "header" && (
          <div className="space-y-6">
            <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-primary-600" />
                Header & Announcement Bar
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Display top banner offers, shipping promos, and custom header subtags.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Enable Top Announcement Bar
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Display a vibrant announcement ticker above the header navigation.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.announcement_enabled}
                  onChange={(e) => onToggle("announcement_enabled", e.target.checked)}
                  className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
              </div>

              {form.announcement_enabled && (
                <div className="pt-2">
                  <Input
                    label="Announcement Bar Message"
                    name="announcement_text"
                    value={form.announcement_text}
                    onChange={onChange}
                    placeholder="Welcome to Azhar's Store! Enjoy free shipping on orders above ₹499."
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Header Secondary Tagline (shown next to Logo)"
                name="header_tagline"
                value={form.header_tagline}
                onChange={onChange}
                placeholder="Official Direct Store"
              />
            </div>
          </div>
        )}

        {/* 3. HOMEPAGE SECTIONS */}
        {activeTab === "homepage" && (
          <div className="space-y-8">
            <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Layout className="w-5 h-5 text-primary-600" />
                Homepage Sections & Banners
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Customize titles, descriptions, and buttons for all homepage product rows.
              </p>
            </div>

            {/* Hero Banner Section */}
            <div className="p-5 sm:p-6 rounded-3xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-700/80 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/80 dark:border-gray-700/60 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Hero Carousel & Banner Customization
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Upload high-resolution banner pictures from your PC or device for your store homepage.
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-xs">
                  <span className="text-[11px] font-semibold text-gray-500 px-2 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-primary-500" /> Preview:
                  </span>
                  {(['Slide 1', 'Slide 2', 'Slide 3'] as const).map((label, idx) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setPreviewSlideIndex(idx as 0 | 1 | 2)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                        previewSlideIndex === idx
                          ? 'bg-primary-600 text-white shadow-xs'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Interactive Hero Banner Simulator */}
              <div className="relative rounded-2xl overflow-hidden shadow-md border border-gray-200 dark:border-gray-700 group">
                <div className="relative h-44 sm:h-56 w-full overflow-hidden bg-slate-900 flex items-center">
                  <img
                    src={
                      previewSlideIndex === 0
                        ? form.hero_image || form.logo_url || "https://images.pexels.com/photos/1036857/pexels-photo-1036857.jpeg?auto=compress&cs=tinysrgb&w=1600"
                        : previewSlideIndex === 1
                        ? form.hero_image_slide2 || "https://images.pexels.com/photos/2730465/pexels-photo-2730465.jpeg?auto=compress&cs=tinysrgb&w=1600"
                        : form.hero_image_slide3 || "https://images.pexels.com/photos/2305445/pexels-photo-2305445.jpeg?auto=compress&cs=tinysrgb&w=1600"
                    }
                    alt="Live Hero Preview"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${
                      previewSlideIndex === 0
                        ? 'from-blue-900/90 via-indigo-900/75 to-purple-900/80'
                        : previewSlideIndex === 1
                        ? 'from-emerald-950/90 via-teal-900/75 to-cyan-950/80'
                        : 'from-purple-950/90 via-pink-950/75 to-rose-950/80'
                    }`}
                  />
                  <div className="relative z-10 p-5 sm:p-8 max-w-xl text-white space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/20">
                      {previewSlideIndex === 0
                        ? form.hero_subtitle || 'Next-Gen Shopping Experience'
                        : previewSlideIndex === 1
                        ? 'Fresh Collection 2026'
                        : 'Limited Edition Deals'}
                    </span>
                    <h4 className="text-lg sm:text-2xl font-black text-white leading-tight">
                      {previewSlideIndex === 0
                        ? form.hero_title || form.store_name || "Azhar's Store"
                        : previewSlideIndex === 1
                        ? 'New Arrivals'
                        : 'Flash Sale Deals'}
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-200 line-clamp-2">
                      {previewSlideIndex === 0
                        ? form.hero_description || 'Discover extraordinary curated products with real-time tracking, fast delivery, and buyer protection.'
                        : previewSlideIndex === 1
                        ? 'Check out the latest futuristic trends in tech, accessories, and lifestyle fashion.'
                        : 'Exclusive limited-time price drops on flagship items. Grab them before stock runs out!'}
                    </p>
                    <div className="pt-1">
                      <span className="inline-block px-4 py-1.5 rounded-xl bg-white text-gray-900 text-xs font-bold shadow-md">
                        {previewSlideIndex === 0 ? form.hero_button_text || 'Shop Now' : previewSlideIndex === 1 ? 'Explore Now' : 'View Deals'}
                      </span>
                    </div>
                  </div>

                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                    <Laptop className="w-3 h-3 text-emerald-400" /> Live Simulation (Slide {previewSlideIndex + 1})
                  </div>
                </div>
              </div>

              {/* Slide 1 Primary Hero Banner Uploader & Controls */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    Slide 1: Primary Hero Banner (Main Homepage Visual)
                  </h4>
                </div>

                {/* PC Upload Input for Main Hero Banner */}
                <ImageUploadInput
                  label="Hero Banner Picture (Upload from PC)"
                  value={form.hero_image}
                  onChange={(val) => handleImageChange("hero_image", val)}
                  placeholder="https://images.pexels.com/..."
                  aspectRatioHint="Recommended: 1920 × 800 (Landscape HD)"
                  helperText="Choose any image file from your PC or drag and drop. Replaces the default hero slide visual."
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <Input
                    label="Hero Banner Title"
                    name="hero_title"
                    value={form.hero_title}
                    onChange={onChange}
                    placeholder={form.store_name || "Azhar's Store"}
                  />
                  <Input
                    label="Hero Banner Subtitle"
                    name="hero_subtitle"
                    value={form.hero_subtitle}
                    onChange={onChange}
                    placeholder="Next-Gen Shopping Experience"
                  />
                  <Input
                    label="Hero Button Text"
                    name="hero_button_text"
                    value={form.hero_button_text}
                    onChange={onChange}
                    placeholder="Shop Now"
                  />
                </div>
                <Input
                  label="Hero Description Text"
                  name="hero_description"
                  value={form.hero_description}
                  onChange={onChange}
                  placeholder="Discover extraordinary curated products with real-time tracking..."
                />
              </div>

              {/* Slide 2 & Slide 3 Secondary Banner Uploaders */}
              <div className="pt-4 border-t border-gray-200/80 dark:border-gray-700/60 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Additional Carousel Slides (Optional PC Uploads)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">
                        2
                      </span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        Slide 2 Picture: New Arrivals Banner
                      </span>
                    </div>
                    <ImageUploadInput
                      label="Slide 2 Banner Picture"
                      value={form.hero_image_slide2 || ''}
                      onChange={(val) => handleImageChange("hero_image_slide2", val)}
                      placeholder="https://images.pexels.com/..."
                      aspectRatioHint="Recommended: 1920 × 800"
                      helperText="Custom background for the 'New Arrivals' carousel slide."
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[11px] font-bold flex items-center justify-center">
                        3
                      </span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        Slide 3 Picture: Flash Sale Banner
                      </span>
                    </div>
                    <ImageUploadInput
                      label="Slide 3 Banner Picture"
                      value={form.hero_image_slide3 || ''}
                      onChange={(val) => handleImageChange("hero_image_slide3", val)}
                      placeholder="https://images.pexels.com/..."
                      aspectRatioHint="Recommended: 1920 × 800"
                      helperText="Custom background for the 'Flash Sale' carousel slide."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Category Grid Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Categories Section Title"
                name="categories_title"
                value={form.categories_title}
                onChange={onChange}
                placeholder="Shop by Category"
              />
              <Input
                label="Categories Section Subtitle"
                name="categories_subtitle"
                value={form.categories_subtitle}
                onChange={onChange}
                placeholder="Explore our wide range of collections"
              />
            </div>

            {/* Flash Sale Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Flash Sale Section Title"
                name="flash_sale_title"
                value={form.flash_sale_title}
                onChange={onChange}
                placeholder="Flash Sale Products"
              />
              <Input
                label="Flash Sale Section Subtitle"
                name="flash_sale_subtitle"
                value={form.flash_sale_subtitle}
                onChange={onChange}
                placeholder="Limited time offers at unbeatable prices"
              />
            </div>

            {/* Featured Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Featured Products Title"
                name="featured_title"
                value={form.featured_title}
                onChange={onChange}
                placeholder="Featured Products"
              />
              <Input
                label="Featured Products Subtitle"
                name="featured_subtitle"
                value={form.featured_subtitle}
                onChange={onChange}
                placeholder="Handpicked products just for you"
              />
            </div>

            {/* Best Sellers Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Best Sellers Title"
                name="bestsellers_title"
                value={form.bestsellers_title}
                onChange={onChange}
                placeholder="Best Sellers"
              />
              <Input
                label="Best Sellers Subtitle"
                name="bestsellers_subtitle"
                value={form.bestsellers_subtitle}
                onChange={onChange}
                placeholder="Top rated products loved by our customers"
              />
            </div>

            {/* New Arrivals Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="New Arrivals Title"
                name="new_arrivals_title"
                value={form.new_arrivals_title}
                onChange={onChange}
                placeholder="New Arrivals"
              />
              <Input
                label="New Arrivals Subtitle"
                name="new_arrivals_subtitle"
                value={form.new_arrivals_subtitle}
                onChange={onChange}
                placeholder="Fresh products just added to our store"
              />
            </div>

            {/* Promotional Banner */}
            <div className="p-5 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-700/80 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Bottom Promotional & Newsletter Banner
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Promo Banner Title"
                  name="promo_title"
                  value={form.promo_title}
                  onChange={onChange}
                  placeholder={`Welcome to ${form.store_name || "Azhar's Store"}`}
                />
                <Input
                  label="Promo Banner Subtitle / Description"
                  name="promo_subtitle"
                  value={form.promo_subtitle}
                  onChange={onChange}
                  placeholder="Join our newsletter and receive exclusive offers and latest updates."
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. CONTACT & BUSINESS */}
        {activeTab === "contact" && (
          <div className="space-y-6">
            <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-primary-600" />
                Contact & Business Information
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Official contact details shown on the Contact page, footer, and checkout notes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input label="Customer Support Email" name="email" value={form.email} onChange={onChange} />
              <Input label="Phone Number" name="phone" value={form.phone} onChange={onChange} />
              <Input label="WhatsApp Support Number" name="whatsapp" value={form.whatsapp} onChange={onChange} />
              <Input label="Official Website URL" name="website" value={form.website} onChange={onChange} />
              <Input label="Street Address" name="address" value={form.address} onChange={onChange} />
              <Input label="City" name="city" value={form.city} onChange={onChange} />
              <Input label="State" name="state" value={form.state} onChange={onChange} />
              <Input label="Country" name="country" value={form.country} onChange={onChange} />
              <Input label="Postal / ZIP Code" name="postal_code" value={form.postal_code} onChange={onChange} />
              <Input
                label="Business / Operating Hours"
                name="business_hours"
                value={form.business_hours}
                onChange={onChange}
                placeholder="Mon - Sat: 9:00 AM - 8:00 PM"
              />
            </div>
          </div>
        )}

        {/* 5. SOCIAL MEDIA */}
        {activeTab === "social" && (
          <div className="space-y-6">
            <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary-600" />
                Social Media Links
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Link your official social media pages for customer engagement.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Facebook Page URL"
                name="facebook"
                value={form.facebook}
                onChange={onChange}
                placeholder="https://facebook.com/..."
              />
              <Input
                label="Instagram Profile URL"
                name="instagram"
                value={form.instagram}
                onChange={onChange}
                placeholder="https://instagram.com/..."
              />
              <Input
                label="Twitter / X Profile URL"
                name="twitter"
                value={form.twitter}
                onChange={onChange}
                placeholder="https://x.com/..."
              />
              <Input
                label="YouTube Channel URL"
                name="youtube"
                value={form.youtube}
                onChange={onChange}
                placeholder="https://youtube.com/..."
              />
              <Input
                label="LinkedIn Company URL"
                name="linkedin"
                value={form.linkedin}
                onChange={onChange}
                placeholder="https://linkedin.com/company/..."
              />
            </div>
          </div>
        )}

        {/* 6. SHIPPING & POLICIES */}
        {activeTab === "shipping" && (
          <div className="space-y-6">
            <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary-600" />
                Shipping & Return Policy Settings
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Control free shipping thresholds, standard delivery charges, and return windows.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Free Shipping Minimum Order Amount (₹)"
                type="number"
                name="free_shipping_amount"
                value={String(form.free_shipping_amount)}
                onChange={(e) => onNumberChange("free_shipping_amount", e.target.value)}
              />

              <Input
                label="Standard Flat Shipping Charge (₹)"
                type="number"
                name="shipping_charge"
                value={String(form.shipping_charge)}
                onChange={(e) => onNumberChange("shipping_charge", e.target.value)}
              />

              <Input
                label="Estimated Delivery Timeframe"
                name="delivery_days"
                value={form.delivery_days}
                onChange={onChange}
                placeholder="3-7 Business Days"
              />

              <Input
                label="Return Window (in Days)"
                type="number"
                name="return_days"
                value={String(form.return_days || 7)}
                onChange={(e) => onNumberChange("return_days", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* 7. PAYMENTS & GATEWAY */}
        {activeTab === "payments" && (
          <div className="space-y-6">
            <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary-600" />
                Payment Gateway & Options
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Configure Cash on Delivery (COD) and Razorpay online payments.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* COD Box */}
              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700 flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                    Cash on Delivery (COD)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Allow customers to pay in cash upon package delivery.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.cod_enabled}
                  onChange={(e) => onToggle("cod_enabled", e.target.checked)}
                  className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
              </div>

              {/* Razorpay Box */}
              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700 flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                    Razorpay Online Payments (Cards, UPI, Netbanking)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Accept UPI, credit/debit cards, and wallets.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.razorpay_enabled}
                  onChange={(e) => onToggle("razorpay_enabled", e.target.checked)}
                  className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
              </div>
            </div>

            {form.razorpay_enabled && (
              <div className="p-5 rounded-2xl bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/40 space-y-4">
                <h3 className="text-xs font-bold text-primary-700 dark:text-primary-300 uppercase tracking-wider">
                  Razorpay Credentials
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Razorpay Key ID"
                    name="razorpay_key"
                    value={form.razorpay_key || ""}
                    onChange={onChange}
                    placeholder="rzp_live_... or rzp_test_..."
                  />
                  <Input
                    label="Razorpay Key Secret"
                    type="password"
                    name="razorpay_secret"
                    value={form.razorpay_secret || ""}
                    onChange={onChange}
                    placeholder="Key Secret"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 8. SEO & METADATA */}
        {activeTab === "seo" && (
          <div className="space-y-6">
            <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-primary-600" />
                SEO & Social Meta Tags
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Control the browser title tag, search engine descriptions, and social preview cards.
              </p>
            </div>

            <div className="space-y-4">
              <Input
                label="Browser Tab Title (Meta Title)"
                name="meta_title"
                value={form.meta_title}
                onChange={onChange}
                placeholder="Azhar's Store - Online Shopping"
              />

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Meta Description (Google Search Snippet)
                </label>
                <textarea
                  name="meta_description"
                  value={form.meta_description}
                  onChange={onChange}
                  rows={3}
                  placeholder="Azhar's Store - Your trusted destination for quality products at unbeatable prices. Shop electronics, fashion, home & kitchen, and more."
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800/80 p-4 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/50 focus:outline-none"
                />
              </div>

              <Input
                label="Meta Keywords (Comma separated)"
                name="meta_keywords"
                value={form.meta_keywords}
                onChange={onChange}
                placeholder="ecommerce, online shopping, electronics, fashion, clothing, accessories, deals, discounts"
              />
            </div>
          </div>
        )}

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-between pt-8 border-t border-gray-100 dark:border-gray-800 mt-8">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {hasChanges ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                ● Unsaved changes in form
              </span>
            ) : lastSaved ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                ✓ All settings synced
              </span>
            ) : (
              <span>Ready</span>
            )}
          </div>

          <Button
            onClick={save}
            disabled={saving}
            className="min-w-[150px] shadow-md shadow-primary-600/20"
          >
            {saving ? (
              "Saving..."
            ) : hasChanges ? (
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Save Changes *
              </span>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
