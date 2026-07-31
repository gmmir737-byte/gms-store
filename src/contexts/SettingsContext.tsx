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

  // Store
  store_name: string;
  store_tagline: string;
  about_us: string;

  logo_url: string;
  favicon_url: string;

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

  // Social
  facebook: string;
  instagram: string;
  twitter: string;
  youtube: string;
  linkedin: string;

  // Shipping
  free_shipping_amount: number;
  shipping_charge: number;
  delivery_days: string;
  return_days: number;

  // Payments
  cod_enabled: boolean;
  razorpay_enabled: boolean;
  razorpay_key: string;
  razorpay_secret: string;

  // Homepage
  hero_title: string;
  hero_subtitle: string;
  hero_button_text: string;
  hero_image: string;

  // SEO
  meta_title: string;
  meta_description: string;
  meta_keywords: string;

  // Policies
  privacy_policy: string;
  terms_conditions: string;
  refund_policy: string;
  shipping_policy: string;

  // Appearance
  currency: string;
  currency_symbol: string;
  primary_color: string;
}

const SETTINGS_CACHE_KEY = 'gms_store_settings';
const SETTINGS_CACHE_TTL = 1000 * 60 * 60; // 1 hour

const loadCachedSettings = (): Settings | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { settings: Settings; expiresAt: number };
    if (parsed.expiresAt > Date.now()) {
      return parsed.settings;
    }
    window.localStorage.removeItem(SETTINGS_CACHE_KEY);
    return null;
  } catch {
    return null;
  }
};

const saveCachedSettings = (settings: Settings) => {
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

const defaultSettings: Settings = {
  // Store
  store_name: "GM's Store",
  store_tagline: "",
  about_us: "",

  logo_url: "",
  favicon_url: "",

  // Contact
  email: "",
  phone: "",
  whatsapp: "",

  website: "",

  address: "",
  city: "",
  state: "",
  country: "",
  postal_code: "",

  // Social
  facebook: "",
  instagram: "",
  twitter: "",
  youtube: "",
  linkedin: "",

  // Shipping
  free_shipping_amount: 499,
  shipping_charge: 49,
  delivery_days: "3-7 Business Days",
  return_days: 7,

  // Payments
  cod_enabled: true,
  razorpay_enabled: false,
  razorpay_key: "",
  razorpay_secret: "",

  // Homepage
  hero_title: "",
  hero_subtitle: "",
  hero_button_text: "",
  hero_image: "",

  // SEO
  meta_title: "",
  meta_description: "",
  meta_keywords: "",

  // Policies
  privacy_policy: "",
  terms_conditions: "",
  refund_policy: "",
  shipping_policy: "",

  // Appearance
  currency: "INR",
  currency_symbol: "₹",
  primary_color: "#2563eb",
};
type SettingsContextType = {
  settings: Settings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export const SettingsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [settings, setSettings] =
    useState<Settings>(defaultSettings);

  const [loading, setLoading] = useState(true);

  const refreshSettings = async () => {
    const cached = loadCachedSettings();
    if (cached) {
      setSettings(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const { data } = await supabase
      .from("settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (data) {
      const merged = {
        ...defaultSettings,
        ...data,
      };
      setSettings(merged);
      saveCachedSettings(merged);
    }

    setLoading(false);
  };

  useEffect(() => {
    refreshSettings();
  }, []);  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        refreshSettings,
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