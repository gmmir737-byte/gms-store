import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "../lib/supabase";

export interface Settings {
  id?: string;

  // Store Branding
  store_name: string;
  store_tagline: string;
  about_us: string;
  logo_url: string;
  favicon_url: string;
  copyright_text: string;

  // Header & Announcement
  announcement_enabled: boolean;
  announcement_text: string;
  header_tagline: string;

  // Contact
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  business_hours: string;

  // Social Media
  facebook: string;
  instagram: string;
  twitter: string;
  youtube: string;
  linkedin: string;

  // Shipping & Policies
  free_shipping_amount: number;
  shipping_charge: number;
  delivery_days: string;
  return_days: number;
  privacy_policy: string;
  terms_conditions: string;
  refund_policy: string;
  shipping_policy: string;

  // Payments
  cod_enabled: boolean;
  razorpay_enabled: boolean;
  razorpay_key: string;
  razorpay_secret: string;

  // Homepage
  hero_title: string;
  hero_subtitle: string;
  hero_description: string;
  hero_button_text: string;
  hero_image: string;
  hero_image_slide2?: string;
  hero_image_slide3?: string;
  featured_title: string;
  featured_subtitle: string;
  new_arrivals_title: string;
  new_arrivals_subtitle: string;
  bestsellers_title: string;
  bestsellers_subtitle: string;
  flash_sale_title: string;
  flash_sale_subtitle: string;
  categories_title: string;
  categories_subtitle: string;
  promo_title: string;
  promo_subtitle: string;

  // SEO
  meta_title: string;
  meta_description: string;
  meta_keywords: string;

  // Appearance
  currency: string;
  currency_symbol: string;
  primary_color: string;
}

const SETTINGS_CACHE_KEY = 'azhars_store_settings';
const SETTINGS_CACHE_TTL = 1000 * 60 * 60; // 1 hour

export const defaultSettings: Settings = {
  // Store Branding
  store_name: "Azhar's Store",
  store_tagline: "Your trusted destination for quality products",
  about_us: "Welcome to Azhar's Store. We are committed to providing quality products and an outstanding shopping experience.",
  logo_url: "",
  favicon_url: "",
  copyright_text: "All rights reserved.",

  // Header & Announcement
  announcement_enabled: false,
  announcement_text: "Welcome to Azhar's Store! Enjoy free shipping on orders above ₹499.",
  header_tagline: "",

  // Contact
  email: "support@azharsstore.com",
  phone: "+91 98765 43210",
  whatsapp: "+91 98765 43210",
  website: "",
  address: "123 Commercial Street",
  city: "Bangalore",
  state: "Karnataka",
  country: "India",
  postal_code: "560001",
  business_hours: "Mon - Sat: 9:00 AM - 8:00 PM",

  // Social Media
  facebook: "",
  instagram: "",
  twitter: "",
  youtube: "",
  linkedin: "",

  // Shipping & Policies
  free_shipping_amount: 499,
  shipping_charge: 49,
  delivery_days: "3-7 Business Days",
  return_days: 7,
  privacy_policy: "",
  terms_conditions: "",
  refund_policy: "",
  shipping_policy: "",

  // Payments
  cod_enabled: true,
  razorpay_enabled: true,
  razorpay_key: "",
  razorpay_secret: "",

  // Homepage
  hero_title: "",
  hero_subtitle: "",
  hero_description: "",
  hero_button_text: "Shop Now",
  hero_image: "",
  hero_image_slide2: "",
  hero_image_slide3: "",
  featured_title: "Featured Products",
  featured_subtitle: "Handpicked products just for you",
  new_arrivals_title: "New Arrivals",
  new_arrivals_subtitle: "Fresh products just added to our store",
  bestsellers_title: "Best Sellers",
  bestsellers_subtitle: "Top rated products loved by our customers",
  flash_sale_title: "Flash Sale Products",
  flash_sale_subtitle: "Limited time offers at unbeatable prices",
  categories_title: "Shop by Category",
  categories_subtitle: "Explore our wide range of collections",
  promo_title: "",
  promo_subtitle: "",

  // SEO
  meta_title: "Azhar's Store - Online Shopping",
  meta_description: "Azhar's Store - Your trusted destination for quality products at unbeatable prices. Shop electronics, fashion, home & kitchen, and more.",
  meta_keywords: "ecommerce, online shopping, electronics, fashion, clothing, accessories, deals, discounts",

  // Appearance
  currency: "INR",
  currency_symbol: "₹",
  primary_color: "#2563eb",
};

export const sanitizeSettings = (raw?: Partial<Settings> | null): Settings => {
  if (!raw) return { ...defaultSettings };

  const cleanStoreName =
    raw.store_name &&
    raw.store_name !== "GM's Store" &&
    raw.store_name !== "GMS Store" &&
    raw.store_name !== "GM Store"
      ? raw.store_name
      : "Azhar's Store";

  const cleanMetaTitle =
    raw.meta_title &&
    !raw.meta_title.includes("GM's Store") &&
    !raw.meta_title.includes("GMS")
      ? raw.meta_title
      : cleanStoreName
      ? `${cleanStoreName} - Online Shopping`
      : defaultSettings.meta_title;

  const razorpayAvailable =
    raw.razorpay_enabled === true ||
    Boolean(import.meta.env.VITE_RAZORPAY_KEY_ID || raw.razorpay_key);

  const clean: Settings = {
    id: raw.id || undefined,

    // Store Branding
    store_name: cleanStoreName,
    store_tagline: raw.store_tagline ?? defaultSettings.store_tagline,
    about_us: raw.about_us ?? defaultSettings.about_us,
    logo_url: raw.logo_url ?? "",
    favicon_url: raw.favicon_url ?? "",
    copyright_text: raw.copyright_text ?? defaultSettings.copyright_text,

    // Header & Announcement
    announcement_enabled: raw.announcement_enabled ?? defaultSettings.announcement_enabled,
    announcement_text: raw.announcement_text ?? defaultSettings.announcement_text,
    header_tagline: raw.header_tagline ?? defaultSettings.header_tagline,

    // Contact
    email: raw.email ?? defaultSettings.email,
    phone: raw.phone ?? defaultSettings.phone,
    whatsapp: raw.whatsapp ?? defaultSettings.whatsapp,
    website: raw.website ?? "",
    address: raw.address ?? defaultSettings.address,
    city: raw.city ?? defaultSettings.city,
    state: raw.state ?? defaultSettings.state,
    country: raw.country ?? defaultSettings.country,
    postal_code: raw.postal_code ?? defaultSettings.postal_code,
    business_hours: raw.business_hours ?? defaultSettings.business_hours,

    // Social Media
    facebook: raw.facebook ?? "",
    instagram: raw.instagram ?? "",
    twitter: raw.twitter ?? "",
    youtube: raw.youtube ?? "",
    linkedin: raw.linkedin ?? "",

    // Shipping & Policies
    free_shipping_amount: typeof raw.free_shipping_amount === "number" ? raw.free_shipping_amount : defaultSettings.free_shipping_amount,
    shipping_charge: typeof raw.shipping_charge === "number" ? raw.shipping_charge : defaultSettings.shipping_charge,
    delivery_days: raw.delivery_days ?? defaultSettings.delivery_days,
    return_days: typeof raw.return_days === "number" ? raw.return_days : defaultSettings.return_days,
    privacy_policy: raw.privacy_policy ?? "",
    terms_conditions: raw.terms_conditions ?? "",
    refund_policy: raw.refund_policy ?? "",
    shipping_policy: raw.shipping_policy ?? "",

    // Payments
    cod_enabled: raw.cod_enabled ?? defaultSettings.cod_enabled,
    razorpay_enabled: razorpayAvailable,
    razorpay_key: raw.razorpay_key ?? "",
    razorpay_secret: raw.razorpay_secret ?? "",

    // Homepage
    hero_title: raw.hero_title ?? "",
    hero_subtitle: raw.hero_subtitle ?? "",
    hero_description: raw.hero_description ?? "",
    hero_button_text: raw.hero_button_text ?? defaultSettings.hero_button_text,
    hero_image: raw.hero_image ?? "",
    hero_image_slide2: raw.hero_image_slide2 ?? "",
    hero_image_slide3: raw.hero_image_slide3 ?? "",
    featured_title: raw.featured_title ?? defaultSettings.featured_title,
    featured_subtitle: raw.featured_subtitle ?? defaultSettings.featured_subtitle,
    new_arrivals_title: raw.new_arrivals_title ?? defaultSettings.new_arrivals_title,
    new_arrivals_subtitle: raw.new_arrivals_subtitle ?? defaultSettings.new_arrivals_subtitle,
    bestsellers_title: raw.bestsellers_title ?? defaultSettings.bestsellers_title,
    bestsellers_subtitle: raw.bestsellers_subtitle ?? defaultSettings.bestsellers_subtitle,
    flash_sale_title: raw.flash_sale_title ?? defaultSettings.flash_sale_title,
    flash_sale_subtitle: raw.flash_sale_subtitle ?? defaultSettings.flash_sale_subtitle,
    categories_title: raw.categories_title ?? defaultSettings.categories_title,
    categories_subtitle: raw.categories_subtitle ?? defaultSettings.categories_subtitle,
    promo_title: raw.promo_title ?? "",
    promo_subtitle: raw.promo_subtitle ?? "",

    // SEO
    meta_title: cleanMetaTitle,
    meta_description: raw.meta_description ?? defaultSettings.meta_description,
    meta_keywords: raw.meta_keywords ?? defaultSettings.meta_keywords,

    // Appearance
    currency: raw.currency ?? defaultSettings.currency,
    currency_symbol: raw.currency_symbol ?? defaultSettings.currency_symbol,
    primary_color: raw.primary_color ?? defaultSettings.primary_color,
  };

  return clean;
};

const loadCachedSettings = (): Settings | null => {
  if (typeof window === 'undefined') return null;
  try {
    // Purge legacy cache with old branding
    window.localStorage.removeItem('gms_store_settings');

    const raw = window.localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { settings: Settings; expiresAt: number };

    // Discard if contains old GM branding
    if (
      parsed.settings?.store_name === "GM's Store" ||
      parsed.settings?.store_name === "GMS Store" ||
      parsed.settings?.store_name === "GM Store"
    ) {
      window.localStorage.removeItem(SETTINGS_CACHE_KEY);
      return null;
    }

    if (parsed.expiresAt > Date.now()) {
      return sanitizeSettings(parsed.settings);
    }
    window.localStorage.removeItem(SETTINGS_CACHE_KEY);
    return null;
  } catch {
    return null;
  }
};

export const saveCachedSettings = (settings: Settings) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      SETTINGS_CACHE_KEY,
      JSON.stringify({ settings, expiresAt: Date.now() + SETTINGS_CACHE_TTL })
    );
  } catch {
    // ignore storage failures
  }
};

type SettingsContextType = {
  settings: Settings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  updateSettings: (newSettings: Settings) => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export const SettingsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [settings, setSettings] = useState<Settings>(() => {
    const cached = loadCachedSettings();
    return cached || defaultSettings;
  });

  const [loading, setLoading] = useState(false);

  const updateSettings = (newSettings: Settings) => {
    const sanitized = sanitizeSettings(newSettings);
    setSettings(sanitized);
    saveCachedSettings(sanitized);
  };

  const refreshSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const sanitized = sanitizeSettings(data);
        setSettings(sanitized);
        saveCachedSettings(sanitized);
      } else {
        const cached = loadCachedSettings();
        if (cached) {
          setSettings(cached);
        } else {
          setSettings(defaultSettings);
        }
      }
    } catch (err) {
      console.warn("Could not fetch remote settings, using fallback/cached settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        refreshSettings,
        updateSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error(
      "useSettings must be used inside SettingsProvider"
    );
  }

  return context;
};

export default SettingsProvider;
