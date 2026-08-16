import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingBag, Users, DollarSign, TrendingUp, RefreshCw, Radio, AlertTriangle, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner, Badge, Button } from '../../components/common';
import type { Product, Order } from '../../types/database';

export function AdminDashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStockCount: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    pendingOrders: 0,
    processingOrders: 0,
    cancelledOrders: 0,
    pendingReturns: 0,
    lowStockProducts: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topProducts, setTopProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    else setIsRefreshing(true);

    try {
      const [
        productsCount,
        allProductsRes,
        ordersCount,
        ordersData,
        customersCount,
        pendingCount,
        processingCount,
        cancelledCount,
        pendingReturnsRes,
        lowStockCount,
        recentOrdersData,
        topProductsData,
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('products').select('quantity').eq('status', 'active'),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('total, status'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).or('status.eq.return_requested,notes.ilike.*Return Requested*'),
        supabase.from('products').select('*', { count: 'exact', head: true }).lt('quantity', 10).gt('quantity', 0),
        supabase.from('orders').select('*, items:order_items(product_name, quantity, total)').order('created_at', { ascending: false }).limit(6),
        supabase.from('products').select('*').eq('status', 'active').order('rating_count', { ascending: false }).limit(6),
      ]);

      const revenue = ordersData.data?.filter(o => o.status !== 'cancelled').reduce((sum: number, order) => sum + (order.total || 0), 0) || 0;
      const totalStock = allProductsRes.data?.reduce((sum: number, prod) => sum + (prod.quantity || 0), 0) || 0;

      setStats({
        totalProducts: productsCount.count || 0,
        totalStockCount: totalStock,
        totalOrders: ordersCount.count || 0,
        totalRevenue: revenue,
        totalCustomers: customersCount.count || 0,
        pendingOrders: pendingCount.count || 0,
        processingOrders: processingCount.count || 0,
        cancelledOrders: cancelledCount.count || 0,
        pendingReturns: pendingReturnsRes.count || 0,
        lowStockProducts: lowStockCount.count || 0,
      });

      if (recentOrdersData.data) setRecentOrders(recentOrdersData.data as Order[]);
      if (topProductsData.data) setTopProducts(topProductsData.data as Product[]);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);


  useEffect(() => {
    fetchData(true);

    // Live Polling every 10 seconds
    const interval = setInterval(() => {
      fetchData(false);
    }, 10000);

    // Supabase Realtime subscriptions
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchData(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchData(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        fetchData(false);
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const StatCard = ({
    icon: Icon,
    label,
    value,
    subValue,
    color,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    subValue?: string;
    color: string;
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <span className="flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
          <TrendingUp className="h-3.5 w-3.5 mr-1" /> Live
        </span>
      </div>
      <p className="text-3xl font-extrabold text-gray-900 dark:text-white font-display">{value}</p>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">{label}</p>
      {subValue && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subValue}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Live Sync Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-500" />
              Real-time Active
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Live metrics & stock sync • Last updated {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData(false)}
          loading={isRefreshing}
          icon={<RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
        >
          Refresh Data
        </Button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Package}
          label="Active Products"
          value={stats.totalProducts}
          subValue={`${stats.totalStockCount} total items in stock`}
          color="bg-blue-600"
        />
        <StatCard
          icon={ShoppingBag}
          label="Total Orders"
          value={stats.totalOrders}
          subValue={`${stats.pendingOrders} pending • ${stats.processingOrders} processing`}
          color="bg-primary-600"
        />
        <StatCard
          icon={DollarSign}
          label="Valid Revenue"
          value={`₹${stats.totalRevenue.toLocaleString()}`}
          subValue={`Excludes ${stats.cancelledOrders} cancelled order(s)`}
          color="bg-emerald-600"
        />
        <StatCard
          icon={Users}
          label="Registered Customers"
          value={stats.totalCustomers}
          color="bg-purple-600"
        />
      </div>

      {/* Live Alerts */}
      {(stats.pendingOrders > 0 || stats.lowStockProducts > 0 || stats.pendingReturns > 0 || stats.cancelledOrders > 0) && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.pendingReturns > 0 && (
            <Link
              to="/admin/orders?filter=returns"
              className="flex items-center gap-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="p-2.5 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                <RotateCcw className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-semibold text-purple-900 dark:text-purple-200 text-sm">
                  {stats.pendingReturns} Return Request(s)
                </p>
                <p className="text-xs text-purple-700 dark:text-purple-400">Needs review & action</p>
              </div>
            </Link>
          )}

          {stats.pendingOrders > 0 && (
            <Link
              to="/admin/orders?filter=pending"
              className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="p-2.5 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                <ShoppingBag className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-200 text-sm">
                  {stats.pendingOrders} Pending Order(s)
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">Needs processing & shipping</p>
              </div>
            </Link>
          )}

          {stats.lowStockProducts > 0 && (
            <Link
              to="/admin/products?filter=low-stock"
              className="flex items-center gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="p-2.5 bg-red-100 dark:bg-red-900/40 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-semibold text-red-900 dark:text-red-200 text-sm">
                  {stats.lowStockProducts} Low Stock Item(s)
                </p>
                <p className="text-xs text-red-700 dark:text-red-400">Quantity below 10 units</p>
              </div>
            </Link>
          )}

          {stats.cancelledOrders > 0 && (
            <Link
              to="/admin/orders?filter=cancelled"
              className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="p-2.5 bg-gray-200 dark:bg-gray-700 rounded-lg">
                <Package className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  {stats.cancelledOrders} Cancelled Order(s)
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Stock automatically restored</p>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Real-time Tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Recent Live Orders</h3>
            <Link to="/admin/orders" className="text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400">
              View All Orders →
            </Link>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentOrders.length === 0 ? (
              <p className="p-6 text-sm text-gray-500 text-center">No orders yet.</p>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="px-6 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">#{order.order_number}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {new Date(order.created_at).toLocaleString()} • {order.items?.length || 0} item(s)
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          order.status === 'pending' ? 'warning' :
                          order.status === 'processing' ? 'info' :
                          order.status === 'shipped' ? 'info' :
                          order.status === 'delivered' ? 'success' : 'error'
                        }
                      >
                        {order.status.toUpperCase()}
                      </Badge>
                      <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                        ₹{order.total.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Top Rated & Active Products</h3>
            <Link to="/admin/products" className="text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400">
              Manage Catalog →
            </Link>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {topProducts.length === 0 ? (
              <p className="p-6 text-sm text-gray-500 text-center">No products found.</p>
            ) : (
              topProducts.map((product) => (
                <div key={product.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <img
                    src={product.images[0] || 'https://via.placeholder.com/48'}
                    alt={product.name}
                    className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{product.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Stock: <span className={`font-semibold ${product.quantity < 10 ? 'text-red-500' : 'text-emerald-600'}`}>{product.quantity} units</span> • {product.rating_count} reviews
                    </p>
                  </div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm">
                    ₹{product.price.toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default AdminDashboard;

