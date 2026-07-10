import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Eye, ChevronRight, ShoppingBag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Badge, Button, EmptyState, LoadingSpinner, Modal } from '../components/common';
import type { Order } from '../types/database';
import toast from 'react-hot-toast';

export function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOrders(data as Order[]);
      }
      setLoading(false);
    };

    fetchOrders();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <EmptyState
          icon={<Package className="h-20 w-20" />}
          title="No orders yet"
          description="You haven't placed any orders yet. Start shopping to see your orders here."
          action={
            <Link to="/shop">
              <Button icon={<ShoppingBag className="h-5 w-5" />}>Start Shopping</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'success';
      case 'shipped':
        return 'info';
      case 'processing':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-8">
        My Orders
      </h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Order Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Order Number</p>
                  <p className="font-semibold text-gray-900 dark:text-white">#{order.order_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    ₹{order.total.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant={getStatusColor(order.status) as any}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedOrder(order)}
                  icon={<Eye className="h-4 w-4" />}
                >
                  View Details
                </Button>
              </div>
            </div>

            {/* Order Items Preview */}
            <div className="p-4">
              <div className="flex items-center gap-4 overflow-x-auto">
                {order.items?.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-center gap-3 flex-shrink-0">
                    {item.product_image && (
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="w-14 h-14 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                        {item.product_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Qty: {item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
                {order.items && order.items.length > 4 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    +{order.items.length - 4} more items
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Detail Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Order #${selectedOrder?.order_number}`}
        size="full"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Status Timeline */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Order Status</h3>
              <Badge variant={getStatusColor(selectedOrder.status) as any} size="md">
                {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
              </Badge>
            </div>

            {/* Items */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Items</h3>
              <div className="space-y-3">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    {item.product_image && (
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{item.product_name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        ₹{item.price.toLocaleString()} x {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      ₹{item.total.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Shipping Address</h3>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedOrder.shipping_address.full_name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {selectedOrder.shipping_address.address_line1}
                  {selectedOrder.shipping_address.address_line2 && `, ${selectedOrder.shipping_address.address_line2}`}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} - {selectedOrder.shipping_address.postal_code}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Phone: {selectedOrder.shipping_address.phone}
                </p>
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Payment Summary</h3>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="text-gray-900 dark:text-white">₹{selectedOrder.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                  <span className="text-gray-900 dark:text-white">₹{selectedOrder.shipping_cost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold border-t border-gray-200 dark:border-gray-600 pt-2">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="text-gray-900 dark:text-white">₹{selectedOrder.total.toLocaleString()}</span>
                </div>
                <div className="pt-2 text-sm text-gray-500 dark:text-gray-400">
                  Payment: {selectedOrder.payment_method === 'cod' ? 'Cash on Delivery' : 'Razorpay'}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
