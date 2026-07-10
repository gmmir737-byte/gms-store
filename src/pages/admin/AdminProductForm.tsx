import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button, Input, Select, LoadingSpinner, Badge } from '../../components/common';
import type { Category } from '../../types/database';
import toast from 'react-hot-toast';

export function AdminProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    short_description: '',
    price: '',
    compare_price: '',
    sku: '',
    quantity: '0',
    category_id: '',
    brand: '',
    images: [''] as string[],
    specifications: {} as Record<string, string>,
    is_featured: false,
    is_new: false,
    is_bestseller: false,
    is_flash_sale: false,
    flash_sale_price: '',
    status: 'draft' as 'draft' | 'active',
  });

  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*').order('name');
      if (data) setCategories(data as Category[]);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (id) {
      const fetchProduct = async () => {
        setLoading(true);
        const { data } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
        if (data) {
          setFormData({
            name: data.name || '',
            slug: data.slug || '',
            description: data.description || '',
            short_description: data.short_description || '',
            price: data.price?.toString() || '',
            compare_price: data.compare_price?.toString() || '',
            sku: data.sku || '',
            quantity: data.quantity?.toString() || '0',
            category_id: data.category_id || '',
            brand: data.brand || '',
            images: data.images || [''],
            specifications: data.specifications || {},
            is_featured: data.is_featured || false,
            is_new: data.is_new || false,
            is_bestseller: data.is_bestseller || false,
            is_flash_sale: data.is_flash_sale || false,
            flash_sale_price: data.flash_sale_price?.toString() || '',
            status: data.status || 'draft',
          });
        }
        setLoading(false);
      };
      fetchProduct();
    }
  }, [id]);

  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setFormData({ ...formData, slug });
  };

  const handleAddSpecification = () => {
    if (specKey.trim() && specValue.trim()) {
      setFormData({
        ...formData,
        specifications: { ...formData.specifications, [specKey.trim()]: specValue.trim() },
      });
      setSpecKey('');
      setSpecValue('');
    }
  };

  const handleRemoveSpecification = (key: string) => {
    const { [key]: _, ...rest } = formData.specifications;
    setFormData({ ...formData, specifications: rest });
  };

  const handleAddImage = () => {
    setFormData({ ...formData, images: [...formData.images, ''] });
  };

  const handleRemoveImage = (index: number) => {
    setFormData({ ...formData, images: formData.images.filter((_, i) => i !== index) });
  };

  const handleChangeImage = (index: number, value: string) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData({ ...formData, images: newImages });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const priceValue = parseFloat(formData.price);
    if (isNaN(priceValue) || priceValue <= 0) {
      toast.error('Please enter a valid price');
      setSaving(false);
      return;
    }

    const productData = {
      name: formData.name,
      slug: formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      description: formData.description || null,
      short_description: formData.short_description || null,
      price: priceValue,
      compare_price: formData.compare_price ? parseFloat(formData.compare_price) || null : null,
      sku: formData.sku || null,
      quantity: parseInt(formData.quantity) || 0,
      category_id: formData.category_id || null,
      brand: formData.brand || null,
      images: formData.images.filter(Boolean),
      specifications: formData.specifications,
      is_featured: formData.is_featured,
      is_new: formData.is_new,
      is_bestseller: formData.is_bestseller,
      is_flash_sale: formData.is_flash_sale,
      flash_sale_price: formData.flash_sale_price ? parseFloat(formData.flash_sale_price) || null : null,
      status: formData.status,
    };

    let error;
    if (id) {
      const result = await supabase.from('products').update(productData).eq('id', id);
      error = result.error;
    } else {
      const result = await supabase.from('products').insert(productData);
      error = result.error;
    }

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(id ? 'Product updated' : 'Product created');
      navigate('/admin/products');
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/admin/products')} icon={<ArrowLeft className="h-4 w-4" />}>
          Back
        </Button>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          {id ? 'Edit Product' : 'Add New Product'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Product Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter product name" required />
            <div className="flex gap-2">
              <Input label="Slug *" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="product-url-slug" required className="flex-1" />
              <Button type="button" variant="outline" onClick={generateSlug} className="mt-7">Generate</Button>
            </div>
          </div>
          <Input label="Short Description" value={formData.short_description} onChange={(e) => setFormData({ ...formData, short_description: e.target.value })} placeholder="Brief product summary" className="mt-4" />
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Full product description" rows={4} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Pricing & Inventory</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <Input label="Price (₹) *" type="number" min="0" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="0.00" required />
            <Input label="Compare Price (₹)" type="number" min="0" step="0.01" value={formData.compare_price} onChange={(e) => setFormData({ ...formData, compare_price: e.target.value })} placeholder="0.00" />
            <Input label="Quantity" type="number" min="0" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} placeholder="0" />
            <Input label="SKU" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} placeholder="SKU-001" />
          </div>
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <Select
              label="Category"
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              options={[{ value: '', label: 'Select Category' }, ...categories.map(c => ({ value: c.id, label: c.name }))]}
            />
            <Input label="Brand" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} placeholder="Brand name" />
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'active' })}
              options={[{ value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }]}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Images</h3>
          <div className="space-y-3">
            {formData.images.map((img, idx) => (
              <div key={idx} className="flex gap-2">
                <Input value={img} onChange={(e) => handleChangeImage(idx, e.target.value)} placeholder="Image URL" className="flex-1" />
                <Button type="button" variant="ghost" onClick={() => handleRemoveImage(idx)} className="text-red-600">Remove</Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={handleAddImage}>Add Image</Button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Specifications</h3>
          <div className="space-y-3">
            {Object.entries(formData.specifications).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="font-medium text-gray-700 dark:text-gray-300">{key}:</span>
                <span className="text-gray-600 dark:text-gray-400">{value}</span>
                <button type="button" onClick={() => handleRemoveSpecification(key)} className="ml-auto text-red-600 hover:text-red-700">Remove</button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input placeholder="Specification name" value={specKey} onChange={(e) => setSpecKey(e.target.value)} className="flex-1" />
              <Input placeholder="Value" value={specValue} onChange={(e) => setSpecValue(e.target.value)} className="flex-1" />
              <Button type="button" variant="outline" onClick={handleAddSpecification}>Add</Button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Product Flags</h3>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.is_featured} onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })} className="w-4 h-4 rounded" />
              <span>Featured Product</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.is_new} onChange={(e) => setFormData({ ...formData, is_new: e.target.checked })} className="w-4 h-4 rounded" />
              <span>New Arrival</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.is_bestseller} onChange={(e) => setFormData({ ...formData, is_bestseller: e.target.checked })} className="w-4 h-4 rounded" />
              <span>Bestseller</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.is_flash_sale} onChange={(e) => setFormData({ ...formData, is_flash_sale: e.target.checked })} className="w-4 h-4 rounded" />
              <span>Flash Sale</span>
            </label>
          </div>
          {formData.is_flash_sale && (
            <Input label="Flash Sale Price (₹)" type="number" min="0" step="0.01" value={formData.flash_sale_price} onChange={(e) => setFormData({ ...formData, flash_sale_price: e.target.value })} placeholder="0.00" className="mt-4" />
          )}
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/products')}>Cancel</Button>
          <Button type="submit" loading={saving}>{id ? 'Update Product' : 'Create Product'}</Button>
        </div>
      </form>
    </div>
  );
}
