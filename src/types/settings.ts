export interface StoreSettings {
  id?: string;

  // Store
  store_name: string;
  store_tagline: string;
  about_us: string;

  // Contact
  email: string;
  phone: string;
  whatsapp: string;

  // Address
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;

  // Website
  website: string;

  // Social Media
  facebook: string;
  instagram: string;
  twitter: string;
  youtube: string;

  // Branding
  logo_url: string;
  favicon_url: string;
}

export const defaultStoreSettings: StoreSettings = {
  store_name: "",
  store_tagline: "",
  about_us: "",

  email: "",
  phone: "",
  whatsapp: "",

  address: "",
  city: "",
  state: "",
  country: "",
  postal_code: "",

  website: "",

  facebook: "",
  instagram: "",
  twitter: "",
  youtube: "",

  logo_url: "",
  favicon_url: "",
};