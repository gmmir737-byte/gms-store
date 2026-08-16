import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button, Input, LoadingSpinner, Modal, EmptyState } from '../../components/common';
import type { Category } from '../../types/database';
import toast from 'react-hot-toast';

export function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', slug: '', description: '', image_url: '' });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('sort_order');
    if (data) setCategories(data as Category[]);
    setLoading(false);
  };

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name || '',
        slug: category.slug || '',
        description: category.description || '',
        image_url: category.image_url || '',
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', slug: '', description: '', image_url: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const slug = formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const data = { ...formData, slug };

    let error;
    if (editingCategory) {
      const result = await supabase.from('categories').update(data).eq('id', editingCategory.id);
      error = result.error;
    } else {
      const result = await supabase.from('categories').insert(data);
      error = result.error;
    }

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editingCategory ? 'Category updated' : 'Category created');
      setShowModal(false);
      fetchCategories();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      toast.error('Cannot delete category');
    } else {
      setCategories(categories.filter(c => c.id !== id));
      toast.success('Category deleted');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Categories</h1>
          <p className="text-gray-500 dark:text-gray-400">{categories.length} categories</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => handleOpenModal()}>Add Category</Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState icon={<Tag className="h-16 w-16" />} title="No categories" description="Add categories to organize your products" action={<Button onClick={() => handleOpenModal()}>Add Category</Button>} />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{cat.name}</td>
                  <td className="px-6 py-4 text-gray-500">{cat.slug}</td>
                  <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{cat.description || '-'}</td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(cat)} icon={<Edit2 className="h-4 w-4" />} />
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(cat.id)} icon={<Trash2 className="h-4 w-4 text-red-600" />} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingCategory ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="Slug" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="url-friendly-slug" />
          <Input label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          <Input label="Image URL" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://..." />
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">{editingCategory ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
export default AdminCategories;
