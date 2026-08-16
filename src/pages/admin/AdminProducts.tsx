import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Package, AlertTriangle, Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button, Input, LoadingSpinner, Badge, Modal, EmptyState, Pagination } from '../../components/common';
import type { Product } from '../../types/database';
import { deleteProductFromDb, isDemoProduct } from '../../lib/products';
import toast from 'react-hot-toast';

export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low-stock' | 'out-of-stock' | 'demo'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [deleteModal, setDeleteModal] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk demo products cleanup state
  const [showBulkDemoModal, setShowBulkDemoModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [demoProductsInStore, setDemoProductsInStore] = useState<Product[]>([]);
  const [checkingDemoProducts, setCheckingDemoProducts] = useState(false);

  const ITEMS_PER_PAGE = 12;

  const fetchProducts = useCallback(async () => {
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
    if (error) {
      toast.error(`Error loading products: ${error.message}`);
    } else if (data) {
      setProducts(data as Product[]);
      setTotalProducts(count || 0);
    }
    setLoading(false);
  }, [search, filter, currentPage]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Scan database for remaining demo/sample products
  const scanForDemoProducts = useCallback(async () => {
    setCheckingDemoProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .limit(200);

      if (!error && data) {
        const found = (data as Product[]).filter((p) => isDemoProduct(p));
        setDemoProductsInStore(found);
      }
    } catch (err) {
      console.error('Error scanning for demo products:', err);
    } finally {
      setCheckingDemoProducts(false);
    }
  }, []);

  useEffect(() => {
    scanForDemoProducts();
  }, [scanForDemoProducts]);

  const handleDelete = async () => {
    if (!deleteModal) return;
    setIsDeleting(true);

    try {
      const result = await deleteProductFromDb(deleteModal.id);

      if (!result.success) {
        toast.error(result.error || 'Failed to delete product from database.');
        setIsDeleting(false);
        setDeleteModal(null);
        return;
      }

      // Verification succeeded: Update state and show verified toast
      if (result.mode === 'archived') {
        toast.success(
          `"${deleteModal.name}" was safely archived because previous orders reference it. It is now completely hidden from customers.`
        );
      } else {
        toast.success(`"${deleteModal.name}" permanently deleted from database.`);
      }

      setProducts((prev) => prev.filter((p) => p.id !== deleteModal.id));
      setTotalProducts((prev) => Math.max(0, prev - 1));
      setDeleteModal(null);

      // Re-scan demo count
      scanForDemoProducts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Delete failed: ${msg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDeleteDemoProducts = async () => {
    if (demoProductsInStore.length === 0) return;
    setBulkDeleting(true);
    setBulkProgress({ current: 0, total: demoProductsInStore.length });

    let deletedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < demoProductsInStore.length; i++) {
      const prod = demoProductsInStore[i];
      setBulkProgress({ current: i + 1, total: demoProductsInStore.length });

      const res = await deleteProductFromDb(prod.id);
      if (res.success) {
        deletedCount++;
      } else {
        failedCount++;
      }
    }

    setBulkDeleting(false);
    setShowBulkDemoModal(false);

    if (deletedCount > 0) {
      toast.success(`Successfully removed ${deletedCount} sample/demo products from the database.`);
      fetchProducts();
      scanForDemoProducts();
    }

    if (failedCount > 0) {
      toast.error(`Could not delete ${failedCount} products due to database permissions or constraints.`);
    }
  };

  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Products Catalog</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {totalProducts} total products in database
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchProducts();
              scanForDemoProducts();
            }}
            icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Link to="/admin/products/new">
            <Button icon={<Plus className="h-4 w-4" />}>Add Product</Button>
          </Link>
        </div>
      </div>

      {/* Demo Products Detection Alert Banner */}
      {!checkingDemoProducts && demoProductsInStore.length > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg text-amber-600 dark:text-amber-400 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-200">
                Found {demoProductsInStore.length} Sample / Demo Products in Database
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300/80 mt-0.5">
                These are demo items seeded into the database (e.g. {demoProductsInStore.slice(0, 3).map((p) => p.name).join(', ')}).
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowBulkDemoModal(true)}
            icon={<Trash2 className="h-4 w-4" />}
            className="shrink-0"
          >
            Purge {demoProductsInStore.length} Demo Products
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search products by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="h-5 w-5" />}
          className="sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
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
          title="No products found in store database"
          description="Your store catalog is empty or no products match your filter criteria."
          action={
            <Link to="/admin/products/new">
              <Button icon={<Plus className="h-4 w-4" />}>Add Your First Real Product</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
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
                  {products.map((product) => {
                    const isDemo = isDemoProduct(product);

                    return (
                      <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <img
                              src={product.images?.[0] || 'https://via.placeholder.com/48'}
                              alt={product.name}
                              className="w-11 h-11 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                                {isDemo && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-700">
                                    Sample
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">
                                SKU: {product.sku || 'N/A'} {product.brand ? `• ${product.brand}` : ''}
                              </p>
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
                            {product.quantity} in stock
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
                              <Button variant="ghost" size="sm" icon={<Edit2 className="h-4 w-4" />} title="Edit Product" />
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteModal(product)}
                              icon={<Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />}
                              title="Delete from Database"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showSummary
              totalItems={totalProducts}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => !isDeleting && setDeleteModal(null)}
        title="Permanently Delete Product"
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm text-red-900 dark:text-red-200">
              <p className="font-semibold">Confirm Database Deletion</p>
              <p className="mt-1 text-red-800 dark:text-red-300">
                This will execute a real database operation on Supabase. If deleted, this product will immediately disappear from all storefront searches, category grids, homepage carousels, and product listings.
              </p>
            </div>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Target Product</p>
            <p className="text-base font-bold text-gray-900 dark:text-white mt-1">{deleteModal?.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">ID: {deleteModal?.id}</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteModal(null)}
              disabled={isDeleting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={isDeleting}
              className="flex-1"
              icon={<Trash2 className="h-4 w-4" />}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Demo Purge Modal */}
      <Modal
        isOpen={showBulkDemoModal}
        onClose={() => !bulkDeleting && setShowBulkDemoModal(false)}
        title="Purge Sample / Demo Products"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            The following <strong className="text-gray-900 dark:text-white">{demoProductsInStore.length} sample products</strong> were identified from initial seed data. Purging them will remove them from the database so only your real products remain.
          </p>

          <div className="max-h-56 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-700 bg-gray-50 dark:bg-gray-800/50 p-2">
            {demoProductsInStore.map((p) => (
              <div key={p.id} className="py-2 px-3 flex items-center justify-between text-sm">
                <span className="font-medium text-gray-800 dark:text-gray-200">{p.name}</span>
                <span className="text-xs text-gray-500 font-mono">₹{p.price.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {bulkDeleting && (
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl">
              <div className="flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200 font-medium mb-1.5">
                <span>Deleting demo products from Supabase...</span>
                <span>{bulkProgress.current} / {bulkProgress.total}</span>
              </div>
              <div className="w-full bg-indigo-200 dark:bg-indigo-900 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 dark:bg-indigo-400 h-2 transition-all duration-200"
                  style={{ width: `${(bulkProgress.current / Math.max(1, bulkProgress.total)) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowBulkDemoModal(false)}
              disabled={bulkDeleting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleBulkDeleteDemoProducts}
              loading={bulkDeleting}
              className="flex-1"
              icon={<Trash2 className="h-4 w-4" />}
            >
              Delete All {demoProductsInStore.length} Demo Products
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
export default AdminProducts;
