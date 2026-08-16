import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Edit2,
  Save,
  MapPin,
  Plus,
  Trash2,
  Package,
  Star,
  Heart,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useCart } from '../contexts/CartContext';
import { supabase } from '../lib/supabase';
import { Button, Input, LoadingSpinner, Modal, Badge, Rating, AreaSelector } from '../components/common';
import { WriteReviewModal } from '../components/shop';
import { useDelivery } from '../contexts/DeliveryContext';
import toast from 'react-hot-toast';
import type { Address, Order, Review } from '../types/database';

export function AccountPage() {
  const { user, profile, updateProfile, loading: authLoading } = useAuth();
  const { items: wishlistItems, removeItem: removeFromWishlist } = useWishlist();
  const { addItem: addToCart } = useCart();
  const { activeAreas } = useDelivery();

  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'orders' | 'reviews' | 'wishlist'>('profile');

  // Profile Form state
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  // Addresses State
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    area: '',
    tehsil: '',
    district: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    is_default: false,
    type: 'shipping' as 'shipping' | 'billing',
  });

  // Recent Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // My Reviews State
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [editingReviewItem, setEditingReviewItem] = useState<{
    review: Review;
    productId: string;
    productName: string;
  } | null>(null);

  // Fetch Addresses
  const fetchAddresses = useCallback(async () => {
    if (!user) return;
    setLoadingAddresses(true);
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false });

    if (!error && data) {
      setAddresses(data as Address[]);
    }
    setLoadingAddresses(false);
  }, [user]);

  // Fetch Recent Orders
  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoadingOrders(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error && data) {
      setOrders(data as Order[]);
    }
    setLoadingOrders(false);
  }, [user]);

  // Fetch User Reviews
  const fetchReviews = useCallback(async () => {
    if (!user) return;
    setLoadingReviews(true);
    const { data, error } = await supabase
      .from('reviews')
      .select('*, product:products(name, images)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setReviews(data as Review[]);
    }
    setLoadingReviews(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      if (activeTab === 'addresses') fetchAddresses();
      if (activeTab === 'orders') fetchOrders();
      if (activeTab === 'reviews') fetchReviews();
    }
  }, [user, activeTab, fetchAddresses, fetchOrders, fetchReviews]);

  // Profile Save
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const { error } = await updateProfile(profileForm);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Profile updated successfully');
      setEditingProfile(false);
    }
    setSavingProfile(false);
  };

  // Open Address Modal
  const handleOpenAddressModal = (addr?: Address) => {
    if (addr) {
      setEditingAddress(addr);
      setAddressForm({
        full_name: addr.full_name,
        phone: addr.phone,
        address_line1: addr.address_line1,
        address_line2: addr.address_line2 || '',
        area: addr.area || '',
        tehsil: addr.tehsil || '',
        district: addr.district || '',
        city: addr.city,
        state: addr.state,
        postal_code: addr.postal_code,
        country: addr.country || 'India',
        is_default: addr.is_default,
        type: addr.type || 'shipping',
      });
    } else {
      setEditingAddress(null);
      setAddressForm({
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
        address_line1: '',
        address_line2: '',
        area: '',
        tehsil: '',
        district: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'India',
        is_default: addresses.length === 0,
        type: 'shipping',
      });
    }
    setAddressModalOpen(true);
  };

  // Save Address
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (
      !addressForm.full_name.trim() ||
      !addressForm.phone.trim() ||
      !addressForm.address_line1.trim() ||
      !addressForm.city.trim() ||
      !addressForm.state.trim() ||
      !addressForm.postal_code.trim()
    ) {
      toast.error('Please fill in all required address fields');
      return;
    }

    setSavingAddress(true);
    try {
      if (addressForm.is_default) {
        // Clear other defaults
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      if (editingAddress) {
        const { error } = await supabase
          .from('addresses')
          .update({
            full_name: addressForm.full_name.trim(),
            phone: addressForm.phone.trim(),
            address_line1: addressForm.address_line1.trim(),
            address_line2: addressForm.address_line2.trim() || null,
            area: addressForm.area.trim() || null,
            tehsil: addressForm.tehsil.trim() || null,
            district: addressForm.district.trim() || null,
            city: addressForm.city.trim(),
            state: addressForm.state.trim(),
            postal_code: addressForm.postal_code.trim(),
            country: addressForm.country.trim(),
            is_default: addressForm.is_default,
            type: addressForm.type,
          })
          .eq('id', editingAddress.id);

        if (error) throw error;
        toast.success('Address updated');
      } else {
        const { error } = await supabase.from('addresses').insert([
          {
            user_id: user.id,
            full_name: addressForm.full_name.trim(),
            phone: addressForm.phone.trim(),
            address_line1: addressForm.address_line1.trim(),
            address_line2: addressForm.address_line2.trim() || null,
            area: addressForm.area.trim() || null,
            tehsil: addressForm.tehsil.trim() || null,
            district: addressForm.district.trim() || null,
            city: addressForm.city.trim(),
            state: addressForm.state.trim(),
            postal_code: addressForm.postal_code.trim(),
            country: addressForm.country.trim(),
            is_default: addressForm.is_default,
            type: addressForm.type,
          },
        ]);

        if (error) throw error;
        toast.success('Address saved');
      }

      setAddressModalOpen(false);
      fetchAddresses();
    } catch (err: any) {
      console.error('Error saving address:', err);
      toast.error(err.message || 'Failed to save address');
    } finally {
      setSavingAddress(false);
    }
  };

  // Delete Address
  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    const { error } = await supabase.from('addresses').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete address');
    } else {
      toast.success('Address deleted');
      fetchAddresses();
    }
  };

  // Set Default Address
  const handleSetDefaultAddress = async (id: string) => {
    if (!user) return;
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
    await supabase.from('addresses').update({ is_default: true }).eq('id', id);
    toast.success('Default address updated');
    fetchAddresses();
  };

  // Delete Review
  const handleDeleteReview = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete review');
    } else {
      toast.success('Review deleted');
      fetchReviews();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Header Card */}
      <div className="bg-gradient-to-r from-primary-600 to-indigo-700 rounded-2xl p-6 md:p-8 text-white shadow-xl mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-3xl font-bold shadow-inner">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || 'User'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                profile?.full_name?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold font-display">
                {profile?.full_name || 'Valued Customer'}
              </h1>
              <p className="text-white/80 text-sm mt-1 flex items-center justify-center md:justify-start gap-1">
                <Mail className="h-4 w-4" /> {profile?.email || user?.email}
              </p>
              <p className="text-xs text-white/60 mt-1">
                Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'recently'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-xs">
            <ShieldCheck className="h-5 w-5 text-green-300" />
            <span>Verified Account</span>
          </div>
        </div>
      </div>

      {/* Account Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-8 overflow-x-auto">
        <nav className="flex gap-2 sm:gap-6">
          {[
            { id: 'profile', label: 'Personal Info', icon: User },
            { id: 'addresses', label: 'Saved Addresses', icon: MapPin },
            { id: 'orders', label: 'My Orders', icon: Package },
            { id: 'reviews', label: 'My Reviews', icon: Star },
            { id: 'wishlist', label: 'Wishlist', icon: Heart },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 pb-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  active
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 md:p-8 shadow-sm">
        {/* Tab 1: Profile */}
        {activeTab === 'profile' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Personal Information</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage your profile details and contact information.</p>
              </div>
              {!editingProfile ? (
                <Button variant="outline" onClick={() => setEditingProfile(true)} icon={<Edit2 className="h-4 w-4" />}>
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setEditingProfile(false)}>Cancel</Button>
                  <Button onClick={handleSaveProfile} loading={savingProfile} icon={<Save className="h-4 w-4" />}>
                    Save Changes
                  </Button>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-2xl">
              <Input
                label="Full Name"
                value={editingProfile ? profileForm.full_name : profile?.full_name || ''}
                onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                icon={<User className="h-5 w-5" />}
                disabled={!editingProfile}
              />
              <Input
                label="Email Address"
                value={profile?.email || user?.email || ''}
                icon={<Mail className="h-5 w-5" />}
                disabled
              />
              <Input
                label="Phone Number"
                value={editingProfile ? profileForm.phone : profile?.phone || ''}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                icon={<Phone className="h-5 w-5" />}
                disabled={!editingProfile}
                placeholder="Add phone number"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Saved Addresses */}
        {activeTab === 'addresses' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Saved Addresses</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage your shipping and delivery destinations.</p>
              </div>
              <Button onClick={() => handleOpenAddressModal()} icon={<Plus className="h-4 w-4" />}>
                Add New Address
              </Button>
            </div>

            {loadingAddresses ? (
              <div className="py-12 flex justify-center"><LoadingSpinner /></div>
            ) : addresses.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>No saved addresses yet. Add one to speed up checkout!</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {addresses.map((addr) => {
                  const isServiceable = activeAreas.some(
                    (a) =>
                      addr.area &&
                      a.area_name.toLowerCase() === addr.area.toLowerCase() &&
                      a.is_active
                  );

                  return (
                    <div
                      key={addr.id}
                      className={`p-5 rounded-xl border relative transition-all ${
                        addr.is_default
                          ? 'border-primary-500 bg-primary-50/20 dark:bg-primary-950/20'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 absolute top-4 right-4">
                        {addr.area && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isServiceable
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                            }`}
                          >
                            {isServiceable ? '✓ Serviceable Area' : '✕ Unavailable Area'}
                          </span>
                        )}
                        {addr.is_default && (
                          <Badge variant="primary" size="sm">
                            Default
                          </Badge>
                        )}
                      </div>

                      <p className="font-bold text-gray-900 dark:text-white text-base">{addr.full_name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {addr.address_line1}
                        {addr.address_line2 && `, ${addr.address_line2}`}
                      </p>
                      {(addr.area || addr.tehsil || addr.district) && (
                        <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mt-0.5 flex items-center gap-1 flex-wrap">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {addr.area && <span>Locality: {addr.area}</span>}
                          {addr.tehsil && <span>• Tehsil: {addr.tehsil}</span>}
                          {addr.district && <span>• District: {addr.district}</span>}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {addr.city}, {addr.state} - {addr.postal_code}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Phone: {addr.phone}</p>

                      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                        {!addr.is_default && (
                          <button
                            onClick={() => handleSetDefaultAddress(addr.id)}
                            className="text-xs font-semibold text-primary-600 hover:underline"
                          >
                            Set as Default
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenAddressModal(addr)}
                          className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="text-xs text-red-600 dark:text-red-400 hover:underline ml-auto flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Recent Orders */}
        {activeTab === 'orders' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Orders</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">View and track your recently placed purchases.</p>
              </div>
              <Link to="/orders">
                <Button variant="outline" size="sm">View All Orders</Button>
              </Link>
            </div>

            {loadingOrders ? (
              <div className="py-12 flex justify-center"><LoadingSpinner /></div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>You haven't placed any orders yet.</p>
                <Link to="/shop" className="mt-4 inline-block">
                  <Button size="sm">Start Shopping</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((ord) => (
                  <div key={ord.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">#{ord.order_number}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(ord.created_at).toLocaleDateString()} • {ord.items?.length || 0} item(s)
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">₹{ord.total.toLocaleString()}</p>
                      <Badge variant={ord.status === 'delivered' ? 'success' : ord.status === 'cancelled' ? 'error' : 'info'} size="sm">
                        {ord.status.toUpperCase()}
                      </Badge>
                    </div>
                    <Link to="/orders">
                      <Button variant="ghost" size="sm">Details</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: My Reviews */}
        {activeTab === 'reviews' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Ratings & Reviews</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Reviews you have shared on purchased products.</p>
            </div>

            {loadingReviews ? (
              <div className="py-12 flex justify-center"><LoadingSpinner /></div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Star className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>You haven't written any product reviews yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Rating value={rev.rating} readonly size="sm" />
                        {rev.title && <h4 className="font-bold text-gray-900 dark:text-white mt-1">{rev.title}</h4>}
                        {rev.comment && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{rev.comment}</p>}
                        <p className="text-xs text-gray-400 mt-2">{new Date(rev.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setEditingReviewItem({
                              review: rev,
                              productId: rev.product_id,
                              productName: (rev as any).product?.name || 'Product',
                            })
                          }
                          className="p-1.5 text-gray-500 hover:text-primary-600"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteReview(rev.id)} className="p-1.5 text-gray-500 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Wishlist */}
        {activeTab === 'wishlist' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Saved Wishlist</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{wishlistItems.length} items saved for later.</p>
              </div>
            </div>

            {wishlistItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Heart className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>Your wishlist is empty. Explore products and tap the heart icon to save them!</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {wishlistItems.map((item) => (
                  <div key={item.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                    <div>
                      {item.product?.images?.[0] && (
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-full h-36 object-cover rounded-lg mb-3"
                        />
                      )}
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">{item.product?.name}</h4>
                      <p className="font-bold text-gray-900 dark:text-white mt-1">₹{item.product?.price.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <Button
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={async () => {
                          if (item.product) {
                            await addToCart(item.product.id, 1);
                            await removeFromWishlist(item.product.id);
                            toast.success('Moved to cart!');
                          }
                        }}
                      >
                        Move to Cart
                      </Button>
                      <button
                        onClick={() => item.product && removeFromWishlist(item.product.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Address Edit/Add Modal */}
      <Modal
        isOpen={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        title={editingAddress ? 'Edit Address' : 'Add New Address'}
        size="md"
      >
        <form onSubmit={handleSaveAddress} className="space-y-4">
          <Input
            label="Full Name *"
            value={addressForm.full_name}
            onChange={(e) => setAddressForm({ ...addressForm, full_name: e.target.value })}
            required
          />
          <Input
            label="Phone Number *"
            value={addressForm.phone}
            onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
            required
          />
          <Input
            label="Address Line 1 *"
            value={addressForm.address_line1}
            onChange={(e) => setAddressForm({ ...addressForm, address_line1: e.target.value })}
            placeholder="House / Flat / Building No., Street"
            required
          />

          {/* Area / Locality Selector with Autocomplete and auto-fill */}
          <AreaSelector
            value={addressForm.area}
            city={addressForm.city}
            tehsil={addressForm.tehsil}
            district={addressForm.district}
            state={addressForm.state}
            onChange={(areaName) => setAddressForm((prev) => ({ ...prev, area: areaName }))}
            onAutoFillLocation={(loc) => {
              setAddressForm((prev) => ({
                ...prev,
                city: loc.city || prev.city,
                tehsil: loc.tehsil || prev.tehsil,
                district: loc.district || prev.district,
                state: loc.state || prev.state,
                postal_code: loc.pincode || prev.postal_code,
              }));
            }}
            required
          />

          <Input
            label="Address Line 2"
            value={addressForm.address_line2}
            onChange={(e) => setAddressForm({ ...addressForm, address_line2: e.target.value })}
            placeholder="Landmark, Apartment (optional)"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Tehsil"
              value={addressForm.tehsil}
              onChange={(e) => setAddressForm({ ...addressForm, tehsil: e.target.value })}
              placeholder="Tehsil (e.g. South Srinagar, Khanyar)"
            />
            <Input
              label="District"
              value={addressForm.district}
              onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })}
              placeholder="District (e.g. Srinagar)"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="City *"
              value={addressForm.city}
              onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
              required
            />
            <Input
              label="State *"
              value={addressForm.state}
              onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="PIN / Postal Code *"
              value={addressForm.postal_code}
              onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
              required
            />
            <Input
              label="Country *"
              value={addressForm.country}
              onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_default"
              checked={addressForm.is_default}
              onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
              className="rounded text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="is_default" className="text-sm text-gray-700 dark:text-gray-300">
              Set as default shipping address
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="ghost" onClick={() => setAddressModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={savingAddress}>
              Save Address
            </Button>
          </div>
        </form>
      </Modal>

      {/* Review Edit Modal */}
      {editingReviewItem && (
        <WriteReviewModal
          isOpen={!!editingReviewItem}
          onClose={() => setEditingReviewItem(null)}
          productId={editingReviewItem.productId}
          productName={editingReviewItem.productName}
          existingReview={editingReviewItem.review}
          onSuccess={fetchReviews}
        />
      )}
    </div>
  );
}
export default AccountPage;
