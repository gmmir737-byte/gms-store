export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  title: string;
  color?: string;
  size?: string;
  price: number;
  compare_price?: number | null;
  quantity: number;
  image_url?: string;
  attributes?: Record<string, string>;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: number;
  compare_price: number | null;
  cost_price: number | null;
  sku: string | null;
  barcode: string | null;
  quantity: number;
  category_id: string | null;
  brand: string | null;
  images: string[];
  specifications: Record<string, string>;
  tags: string[];
  weight: number | null;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  is_flash_sale: boolean;
  flash_sale_price: number | null;
  flash_sale_ends: string | null;
  rating_avg: number;
  rating_count: number;
  status: 'active' | 'draft' | 'archived';
  created_at: string;
  updated_at: string;
  category?: Category;

  // Extended Amazon-style attributes
  manufacturer?: string | null;
  subcategory?: string | null;
  product_type?: string | null;
  model_number?: string | null;
  bullet_points?: string[];
  gst_rate?: number | null;
  unit?: string | null;
  color?: string | null;
  size?: string | null;
  material?: string | null;
  country_of_origin?: string | null;
  generic_name?: string | null;
  low_stock_threshold?: number | null;
  allow_backorder?: boolean;
  package_weight?: number | null;
  package_dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  shipping_class?: string | null;
  custom_shipping_charge?: number | null;
  is_free_shipping?: boolean;
  estimated_delivery_text?: string | null;
  is_returnable?: boolean;
  return_window_days?: number | null;
  return_conditions?: string | null;
  is_replaceable?: boolean;
  has_warranty?: boolean;
  warranty_period?: string | null;
  warranty_type?: string | null;
  warranty_description?: string | null;
  search_keywords?: string[];
  internal_notes?: string | null;
  supplier_info?: string | null;
  variants?: ProductVariant[];
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: 'customer' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface DeliveryArea {
  id: string;
  area_name: string;
  tehsil?: string | null;
  district?: string | null;
  city: string;
  state: string;
  pincode: string | null;
  is_active: boolean;
  delivery_charge: number;
  minimum_order_amount: number;
  estimated_delivery_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  type: 'shipping' | 'billing';
  is_default: boolean;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  area?: string | null;
  tehsil?: string | null;
  district?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order_amount: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export type ReturnStatus =
  | 'REQUESTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'PICKUP_SCHEDULED'
  | 'PICKUP_ATTEMPTED'
  | 'ITEM_RECEIVED'
  | 'REFUND_PROCESSING'
  | 'REFUNDED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'RETURN_COMPLETED'
  // Legacy aliases for backward safety
  | 'none'
  | 'requested'
  | 'under_review'
  | 'approved'
  | 'pickup_scheduled'
  | 'item_received'
  | 'refund_processing'
  | 'refunded'
  | 'rejected'
  | 'cancelled';

export type ReturnReason =
  | 'Product damaged'
  | 'Wrong product received'
  | 'Product defective'
  | 'Product not as described'
  | 'Quality issue'
  | 'Missing item/accessories'
  | 'Changed my mind'
  | 'Not satisfied'
  | 'Other';

export interface ReturnRequest {
  id: string;
  return_number: string;
  order_id: string;
  order_item_id: string;
  user_id: string;
  product_id: string | null;
  quantity: number;
  reason: ReturnReason | string;
  customer_note: string | null;
  status: ReturnStatus;
  
  // Courier & Tracking details
  courier_name: string | null;
  tracking_number: string | null;
  pickup_date: string | null;
  
  // Refund details
  refund_amount: number | null;
  refund_method: string | null;
  refund_transaction_id: string | null;
  
  // Notes
  admin_note: string | null;
  internal_note: string | null;
  
  // Audit Timestamps
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  approved_at: string | null;
  pickup_scheduled_at: string | null;
  received_at: string | null;
  refund_started_at: string | null;
  refunded_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;

  // Joined Relations
  order?: Order;
  order_item?: OrderItem;
  product?: Product;
  user?: Profile;
  history?: ReturnStatusHistory[];
}

export interface ReturnStatusHistory {
  id: string;
  return_id?: string | null;
  order_id?: string | null;
  status: string;
  note: string | null;
  customer_visible: boolean;
  created_at: string;
  created_by: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  order_id: string | null;
  return_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'return_requested' | 'returned';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: 'cod' | 'razorpay' | null;
  payment_id: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  razorpay_order_status: string | null;
  razorpay_order_currency: string | null;
  razorpay_order_amount: number | null;
  razorpay_order_created_at: string | null;
  payment_verified_at: string | null;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  tax: number;
  total: number;
  coupon_id: string | null;
  return_status?: ReturnStatus | null;
  return_reason?: string | null;
  cancel_reason?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  shipping_address: AddressSnapshot;
  billing_address: AddressSnapshot | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  return_history?: ReturnStatusHistory[];
}

export interface AddressSnapshot {
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  area?: string | null;
  tehsil?: string | null;
  district?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  delivery_charge?: number | null;
  estimated_delivery_time?: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  quantity: number;
  price: number;
  total: number;
  created_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface FilterState {
  category: string | null;
  priceRange: [number, number];
  rating: number | null;
  sortBy: 'relevance' | 'newest' | 'price-low' | 'price-high' | 'rating' | 'popular';
  search: string;
  inStock: boolean;
}

export interface CartContextType {
  items: CartItem[];
  loading: boolean;
  addItem: (productId: string, quantity?: number) => Promise<{ error: string | null }>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  subtotal: number;
  itemCount: number;
  synced: boolean;
  appliedCoupon: Coupon | null;
  discount: number;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string; discount: number }>;
  removeCoupon: () => void;
}

export interface WishlistContextType {
  items: WishlistItem[];
  loading: boolean;
  addItem: (productId: string) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  itemCount: number;
}

export interface AuthContextType {
  user: {
    id: string;
    email: string | null;
  } | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string, remember?: boolean) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName?: string, remember?: boolean) => Promise<{ error: string | null }>;
  signInWithProvider: (provider: 'google' | 'apple') => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}
