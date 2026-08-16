export interface StoreSettings {
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

export const defaultStoreSettings: StoreSettings = {
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
