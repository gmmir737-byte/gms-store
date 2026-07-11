import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner, Badge, Input, Pagination } from '../../components/common';
import type { Profile } from '../../types/database';
import { Users } from 'lucide-react';

export function AdminCustomers() {
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    fetchCustomers();
  }, [search, currentPage]);

  const fetchCustomers = async () => {
    setLoading(true);
    let query = supabase.from('profiles').select('*', { count: 'exact' }).eq('role', 'customer');
    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    query = query.order('created_at', { ascending: false }).range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);
    const { data, count } = await query;
    if (data) setCustomers(data as Profile[]);
    if (count) setTotalCount(count);
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Customers</h1>
          <p className="text-gray-500 dark:text-gray-400">{totalCount} customers</p>
        </div>
      </div>

      <Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <span className="text-primary-600 font-medium">{customer.full_name?.charAt(0) || 'U'}</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{customer.full_name || 'N/A'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{customer.email}</td>
                <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{customer.phone || '-'}</td>
                <td className="px-6 py-4 text-gray-500">{new Date(customer.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {Math.ceil(totalCount / ITEMS_PER_PAGE) > 1 && (
        <Pagination currentPage={currentPage} totalPages={Math.ceil(totalCount / ITEMS_PER_PAGE)} onPageChange={setCurrentPage} />
      )}
    </div>
  );
}
export default AdminCustomers;
