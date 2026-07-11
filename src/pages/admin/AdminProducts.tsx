import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button, Input, LoadingSpinner, Badge, Modal, EmptyState, Pagination } from '../../components/common';
import type { Product, Category } from '../../types/database';
import toast from 'react-hot-toast';

export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low-stock' | 'out-of-stock'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [deleteModal, setDeleteModal] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showModal, setShowModal] = useState(false);

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*').order('name');
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      let query = supabase
        .from('products')
        .select('*, category:categories(*)', { count: 'exact' });

      if (search) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
      }

      if (filter === 'low-stock') {
        query = query.lt('quantity', 10).gt('quantity', 0);
      } else if (filter === 'out-of-stock') {
        query = query.eq('quantity', 0);
      }

      query = query.order('created_at', { ascending: false });
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      query = query.range(start, start + ITEMS_PER_PAGE - 1);

      const { data, error, count } = await query;
      if (!error && data) {
        setProducts(data);
        setTotalProducts(count || 0);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [search, filter, currentPage]);

  const handleDelete = async () => {
    if (!deleteModal) return;
    const { error } = await supabase.from('products').delete().eq('id', deleteModal.id);
    if (error) {
      toast.error('Failed to delete product');
    } else {
      setProducts(products.filter(p => p.id !== deleteModal.id));
      toast.success('Product deleted');
    }
    setDeleteModal(null);
  };

  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Products</h1>
          <p className="text-gray-500 dark:text-gray-400">{totalProducts} products</p>
        </div>
        <Link to="/admin/products/new">
          <Button icon={<Plus className="h-4 w-4" />}>Add Product</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="h-5 w-5" />}
          className="sm:max-w-xs"
        />
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'low-stock' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('low-stock')}
          >
            Low Stock
          </Button>
          <Button
            variant={filter === 'out-of-stock' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('out-of-stock')}
          >
            Out of Stock
          </Button>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Package className="h-16 w-16" />}
          title="No products found"
          description="Add your first product to get started"
          action={<Link to="/admin/products/new"><Button icon={<Plus className="h-4 w-4" />}>Add Product</Button></Link>}
        />
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.images[0] || 'https://via.placeholder.com/48'}
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                          {product.sku && <p className="text-xs text-gray-500">SKU: {product.sku}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-gray-600 dark:text-gray-400">{product.category?.name || '-'}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-medium text-gray-900 dark:text-white">₹{product.price.toLocaleString()}</p>
                      {product.compare_price && (
                        <p className="text-xs text-gray-500 line-through">₹{product.compare_price.toLocaleString()}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          product.quantity === 0 ? 'error' :
                          product.quantity < 10 ? 'warning' : 'success'
                        }
                      >
                        {product.quantity}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={product.status === 'active' ? 'success' : product.status === 'draft' ? 'warning' : 'default'}>
                        {product.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/admin/products/${product.id}/edit`}>
                          <Button variant="ghost" size="sm" icon={<Edit2 className="h-4 w-4" />} />
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteModal(product)}
                          icon={<Trash2 className="h-4 w-4 text-red-600" />}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showSummary
              totalItems={totalProducts}
            />
          )}
        </>
      )}

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Delete Product"
      >
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{deleteModal?.name}</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setDeleteModal(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={handleDelete} className="flex-1">Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
export default AdminProducts;
