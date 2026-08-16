import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Percent } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button, Input, LoadingSpinner, Modal, Select, EmptyState, Badge } from '../../components/common';
import type { Coupon } from '../../types/database';
import toast from 'react-hot-toast';

export function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: '',
    min_order_amount: '',
    max_discount: '',
    usage_limit: '',
    valid_until: '',
    is_active: true,
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (data) setCoupons(data as Coupon[]);
    setLoading(false);
  };

  const handleOpenModal = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        type: coupon.type,
        value: coupon.value.toString(),
        min_order_amount: coupon.min_order_amount?.toString() || '',
        max_discount: coupon.max_discount?.toString() || '',
        usage_limit: coupon.usage_limit?.toString() || '',
        valid_until: coupon.valid_until ? coupon.valid_until.split('T')[0] : '',
        is_active: coupon.is_active,
      });
    } else {
      setEditingCoupon(null);
      setFormData({ code: '', type: 'percentage', value: '', min_order_amount: '', max_discount: '', usage_limit: '', valid_until: '', is_active: true });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const data: Record<string, any> = {
      code: formData.code.toUpperCase(),
      type: formData.type,
      value: parseFloat(formData.value),
      min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : 0,
      max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
      usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
      valid_until: formData.valid_until || null,
      is_active: formData.is_active,
    };

    let error;
    if (editingCoupon) {
      const result = await supabase.from('coupons').update(data).eq('id', editingCoupon.id);
      error = result.error;
    } else {
      const result = await supabase.from('coupons').insert(data);
      error = result.error;
    }

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editingCoupon ? 'Coupon updated' : 'Coupon created');
      setShowModal(false);
      fetchCoupons();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete coupon');
    } else {
      setCoupons(coupons.filter(c => c.id !== id));
      toast.success('Coupon deleted');
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    const { error } = await supabase.from('coupons').update({ is_active: !coupon.is_active }).eq('id', coupon.id);
    if (!error) {
      setCoupons(coupons.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c));
      toast.success(coupon.is_active ? 'Coupon deactivated' : 'Coupon activated');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Coupons</h1>
          <p className="text-gray-500 dark:text-gray-400">{coupons.length} coupons</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => handleOpenModal()}>Add Coupon</Button>
      </div>

      {coupons.length === 0 ? (
        <EmptyState icon={<Percent className="h-16 w-16" />} title="No coupons" description="Create discount coupons for your customers" action={<Button onClick={() => handleOpenModal()}>Add Coupon</Button>} />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 font-mono font-medium text-gray-900 dark:text-white">{coupon.code}</td>
                  <td className="px-6 py-4">
                    {coupon.type === 'percentage'
                      ? `${coupon.value}% off`
                      : `₹${coupon.value} off`}
                    {coupon.min_order_amount > 0 && (
                      <span className="block text-xs text-gray-500">Min ₹{coupon.min_order_amount}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{coupon.used_count} / {coupon.usage_limit || '∞'}</td>
                  <td className="px-6 py-4">
                    <Badge variant={coupon.is_active ? 'success' : 'error'} onClick={() => handleToggleActive(coupon)} className="cursor-pointer">
                      {coupon.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(coupon)} icon={<Edit2 className="h-4 w-4" />} />
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(coupon.id)} icon={<Trash2 className="h-4 w-4 text-red-600" />} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingCoupon ? 'Edit Coupon' : 'Add Coupon'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Coupon Code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} required placeholder="SAVE10" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as 'percentage' | 'fixed' })} options={[{ value: 'percentage', label: 'Percentage' }, { value: 'fixed', label: 'Fixed Amount' }]} />
            <Input label="Value" type="number" min="0" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} required placeholder="Enter value" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Min Order Amount (₹)" type="number" min="0" value={formData.min_order_amount} onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })} placeholder="0" />
            <Input label="Max Discount (₹)" type="number" min="0" value={formData.max_discount} onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })} placeholder="No limit" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Usage Limit" type="number" min="1" value={formData.usage_limit} onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })} placeholder="Unlimited" />
            <Input label="Valid Until" type="date" value={formData.valid_until} onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })} />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4 rounded" />
            <span>Active</span>
          </label>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">{editingCoupon ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
export default AdminCoupons;
