import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Badge, Button, LoadingSpinner, Modal, Select, Input, Pagination } from '../../components/common';
import type { Order } from '../../types/database';
import toast from 'react-hot-toast';

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ITEMS_PER_PAGE = 20;

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'>('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);

      let query = supabase
        .from('orders')
        .select('*, items:order_items(*)', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      if (search) {
        query = query.or(`order_number.ilike.%${search}%`);
      }

      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE - 1;
      const { data, error, count } = await query.range(start, end);

      if (!error && data) {
        setOrders(data as Order[]);
      }
      setTotalOrders(count || 0);
      setLoading(false);
    };

    fetchOrders();
  }, [filter, search, currentPage]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to update order status');
    } else {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus as Order['status'] } : o));
      toast.success('Order status updated');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'success';
      case 'shipped': return 'info';
      case 'processing': return 'info';
      case 'cancelled': return 'error';
      default: return 'warning';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Orders</h1>
          <p className="text-gray-500 dark:text-gray-400">{orders.length} orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search by order number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex gap-2 flex-wrap">
          <Button variant={filter === 'all' ? 'primary' : 'outline'} size="sm" onClick={() => setFilter('all')}>All</Button>
          <Button variant={filter === 'pending' ? 'primary' : 'outline'} size="sm" onClick={() => setFilter('pending')}>Pending</Button>
          <Button variant={filter === 'processing' ? 'primary' : 'outline'} size="sm" onClick={() => setFilter('processing')}>Processing</Button>
          <Button variant={filter === 'shipped' ? 'primary' : 'outline'} size="sm" onClick={() => setFilter('shipped')}>Shipped</Button>
          <Button variant={filter === 'delivered' ? 'primary' : 'outline'} size="sm" onClick={() => setFilter('delivered')}>Delivered</Button>
        </div>
      </div>

      {/* Orders */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900 dark:text-white">#{order.order_number}</p>
                    <p className="text-xs text-gray-500">{order.items?.length || 0} items</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    ₹{order.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={order.payment_status === 'paid' ? 'success' : 'warning'}>
                      {order.payment_method === 'cod' ? 'COD' : 'Razorpay'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={getStatusColor(order.status) as any}>
                      {order.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                        className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700"
                      >
                        {statusOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>View</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Detail Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Order #${selectedOrder?.order_number}`}
        size="full"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Items */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Items</h4>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      {item.product_image && (
                        <img src={item.product_image} className="w-12 h-12 rounded object-cover" alt="" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{item.product_name}</p>
                        <p className="text-sm text-gray-500">Qty: {item.quantity} x ₹{item.price}</p>
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white">₹{item.total}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Address */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Shipping Address</h4>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                  <p className="font-medium text-gray-900 dark:text-white">{selectedOrder.shipping_address.full_name}</p>
                  <p className="text-gray-500 mt-1">
                    {selectedOrder.shipping_address.address_line1}
                    {selectedOrder.shipping_address.address_line2 && `, ${selectedOrder.shipping_address.address_line2}`}
                  </p>
                  <p className="text-gray-500">
                    {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} - {selectedOrder.shipping_address.postal_code}
                  </p>
                  <p className="text-gray-500">Phone: {selectedOrder.shipping_address.phone}</p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900 dark:text-white">₹{selectedOrder.subtotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Shipping</span>
                <span className="text-gray-900 dark:text-white">₹{selectedOrder.shipping_cost}</span>
              </div>
              <div className="flex justify-between font-medium border-t border-gray-200 dark:border-gray-600 pt-2">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-gray-900 dark:text-white">₹{selectedOrder.total}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
export default AdminOrders;
