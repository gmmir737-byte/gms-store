import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingBag, Users, DollarSign, TrendingUp, ArrowUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner, Badge } from '../../components/common';
import type { Product, Order } from '../../types/database';

export function AdminDashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    pendingOrders: 0,
    lowStockProducts: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topProducts, setTopProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const [
        productsCount,
        ordersCount,
        ordersData,
        customersCount,
        pendingCount,
        lowStockCount,
        recentOrdersData,
        topProductsData,
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('total'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('products').select('*', { count: 'exact', head: true }).lt('quantity', 10).gt('quantity', 0),
        supabase.from('orders').select('*, items:order_items(product_name, quantity, total)').order('created_at', { ascending: false }).limit(5),
        supabase.from('products').select('*').eq('status', 'active').order('rating_count', { ascending: false }).limit(5),
      ]);

      const revenue = ordersData.data?.reduce((sum: number, order) => sum + (order.total || 0), 0) || 0;

      setStats({
        totalProducts: productsCount.count || 0,
        totalOrders: ordersCount.count || 0,
        totalRevenue: revenue,
        totalCustomers: customersCount.count || 0,
        pendingOrders: pendingCount.count || 0,
        lowStockProducts: lowStockCount.count || 0,
      });

      if (recentOrdersData.data) setRecentOrders(recentOrdersData.data as Order[]);
      if (topProductsData.data) setTopProducts(topProductsData.data as Product[]);

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, change, color }: { icon: React.ElementType; label: string; value: string | number; change?: string; color: string }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        {change && (
          <span className="flex items-center text-sm text-green-600 dark:text-green-400">
            <TrendingUp className="h-4 w-4 mr-1" />
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome back! Here's your store overview.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Package}
          label="Total Products"
          value={stats.totalProducts}
          color="bg-blue-600"
        />
        <StatCard
          icon={ShoppingBag}
          label="Total Orders"
          value={stats.totalOrders}
          change="+12%"
          color="bg-primary-600"
        />
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={`₹${stats.totalRevenue.toLocaleString()}`}
          change="+8%"
          color="bg-green-600"
        />
        <StatCard
          icon={Users}
          label="Total Customers"
          value={stats.totalCustomers}
          color="bg-purple-600"
        />
      </div>

      {/* Alerts */}
      {(stats.pendingOrders > 0 || stats.lowStockProducts > 0) && (
        <div className="grid sm:grid-cols-2 gap-6">
          {stats.pendingOrders > 0 && (
            <Link
              to="/admin/orders?status=pending"
              className="flex items-center gap-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4"
            >
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg">
                <ShoppingBag className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  {stats.pendingOrders} pending orders
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">Click to view and process</p>
              </div>
            </Link>
          )}
          {stats.lowStockProducts > 0 && (
            <Link
              to="/admin/products?filter=low-stock"
              className="flex items-center gap-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
            >
              <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                <Package className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">
                  {stats.lowStockProducts} products low on stock
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">Less than 10 items remaining</p>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Recent Orders</h3>
            <Link to="/admin/orders" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">
              View All
            </Link>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentOrders.map((order) => (
              <div key={order.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">#{order.order_number}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(order.created_at).toLocaleDateString()}
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
                      {order.status}
                    </Badge>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      ₹{order.total.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Top Selling Products</h3>
            <Link to="/admin/products" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">
              View All
            </Link>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {topProducts.map((product) => (
              <div key={product.id} className="px-6 py-4 flex items-center gap-4">
                <img
                  src={product.images[0] || 'https://via.placeholder.com/48'}
                  alt={product.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {product.rating_count} reviews
                  </p>
                </div>
                <p className="font-medium text-gray-900 dark:text-white">
                  ₹{product.price.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
export default AdminDashboard;
