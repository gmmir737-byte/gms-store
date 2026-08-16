import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  Image as ImageIcon,
  AlertTriangle,
  Layers,
  DollarSign,
  Package,
  Truck,
  RotateCcw,
  Shield,
  Eye,
  CheckCircle2,
  Sparkles,
  Tag,
  ListPlus,
  Boxes,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { deleteProductFromDb } from "../../lib/products";
import {
  Button,
  Input,
  Select,
  LoadingSpinner,
  Modal,
  Badge,
} from "../../components/common";

import type { Category, ProductVariant } from "../../types/database";
import toast from "react-hot-toast";

interface FormDataState {
  // Basic Info
  name: string;
  slug: string;
  brand: string;
  manufacturer: string;
  category_id: string;
  subcategory: string;
  product_type: string;
  sku: string;
  model_number: string;
  short_description: string;
  description: string;
  bullet_points: string[];

  // Pricing
  compare_price: string; // MRP
  price: string; // Selling Price
  cost_price: string; // Admin only
  gst_rate: string;

  // Images
  images: string[];

  // Specifications
  weight: string;
  unit: string;
  color: string;
  size: string;
  material: string;
  dimensions_length: string;
  dimensions_width: string;
  dimensions_height: string;
  country_of_origin: string;
  generic_name: string;
  specifications: Record<string, string>;

  // Category specific attributes
  fabric?: string;
  gender?: string;
  expiry_shelf_life?: string;
  net_quantity?: string;
  ingredients?: string;
  power_wattage?: string;

  // Inventory
  quantity: string;
  low_stock_threshold: string;
  allow_backorder: boolean;

  // Shipping
  package_weight: string;
  package_length: string;
  package_width: string;
  package_height: string;
  shipping_class: string;
  custom_shipping_charge: string;
  is_free_shipping: boolean;
  estimated_delivery_text: string;

  // Return & Warranty
  is_returnable: boolean;
  return_window_days: string;
  return_conditions: string;
  is_replaceable: boolean;
  has_warranty: boolean;
  warranty_period: string;
  warranty_type: string;
  warranty_description: string;

  // Visibility & Search
  tags: string[];
  search_keywords: string[];
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  is_flash_sale: boolean;
  flash_sale_price: string;
  status: "active" | "draft" | "archived";

  // Admin notes
  internal_notes: string;
  supplier_info: string;

  // Variants
  variants: ProductVariant[];
}

const initialFormState: FormDataState = {
  name: "",
  slug: "",
  brand: "",
  manufacturer: "",
  category_id: "",
  subcategory: "",
  product_type: "",
  sku: "",
  model_number: "",
  short_description: "",
  description: "",
  bullet_points: [""],

  compare_price: "",
  price: "",
  cost_price: "",
  gst_rate: "0",

  images: [""],

  weight: "",
  unit: "piece",
  color: "",
  size: "",
  material: "",
  dimensions_length: "0",
  dimensions_width: "0",
  dimensions_height: "0",
  country_of_origin: "India",
  generic_name: "",
  specifications: {},

  quantity: "10",
  low_stock_threshold: "5",
  allow_backorder: false,

  package_weight: "",
  package_length: "0",
  package_width: "0",
  package_height: "0",
  shipping_class: "standard",
  custom_shipping_charge: "",
  is_free_shipping: false,
  estimated_delivery_text: "2 - 5 Business Days",

  is_returnable: true,
  return_window_days: "7",
  return_conditions: "Product must be unused and in original packaging with tags intact.",
  is_replaceable: true,
  has_warranty: false,
  warranty_period: "1 Year",
  warranty_type: "Manufacturer Warranty",
  warranty_description: "Covers manufacturing defects only.",

  tags: [],
  search_keywords: [],
  is_featured: false,
  is_new: false,
  is_bestseller: false,
  is_flash_sale: false,
  flash_sale_price: "",
  status: "active",

  internal_notes: "",
  supplier_info: "",

  variants: [],
};

export default function AdminProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("basic");

  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<FormDataState>(initialFormState);

  // Dynamic Specification & Tag inputs
  const [specKey, setSpecKey] = useState("");
  const [specValue, setSpecValue] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");

  // Variant generator state
  const [variantColors, setVariantColors] = useState("");
  const [variantSizes, setVariantSizes] = useState("");

  useEffect(() => {
    loadCategories();
    if (id) {
      loadProduct();
    }
  }, [id]);

  async function loadCategories() {
    const { data } = await supabase.from("categories").select("*").order("name");
    if (data) setCategories(data as Category[]);
  }

  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === formData.category_id);
  }, [categories, formData.category_id]);

  const categoryType = useMemo(() => {
    if (!selectedCategory) return "general";
    const name = selectedCategory.name.toLowerCase();
    if (name.includes("cloth") || name.includes("fashion") || name.includes("apparel") || name.includes("wear")) {
      return "clothing";
    }
    if (name.includes("shoe") || name.includes("footwear")) {
      return "shoes";
    }
    if (name.includes("grocer") || name.includes("food") || name.includes("snack") || name.includes("spice") || name.includes("organic")) {
      return "grocery";
    }
    if (name.includes("elec") || name.includes("gadget") || name.includes("mobile") || name.includes("tech")) {
      return "electronics";
    }
    return "general";
  }, [selectedCategory]);

  async function loadProduct() {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) {
      const specs = (data.specifications as Record<string, string>) || {};

      setFormData({
        name: data.name || "",
        slug: data.slug || "",
        brand: data.brand || "",
        manufacturer: data.manufacturer || "",
        category_id: data.category_id || "",
        subcategory: data.subcategory || "",
        product_type: data.product_type || "",
        sku: data.sku || "",
        model_number: data.model_number || "",
        short_description: data.short_description || "",
        description: data.description || "",
        bullet_points: data.bullet_points && data.bullet_points.length > 0 ? data.bullet_points : [""],

        compare_price: data.compare_price !== null && data.compare_price !== undefined ? String(data.compare_price) : "",
        price: data.price !== null && data.price !== undefined ? String(data.price) : "",
        cost_price: data.cost_price !== null && data.cost_price !== undefined ? String(data.cost_price) : "",
        gst_rate: data.gst_rate !== null && data.gst_rate !== undefined ? String(data.gst_rate) : "0",

        images: data.images && data.images.length > 0 ? data.images : [""],

        weight: data.weight !== null && data.weight !== undefined ? String(data.weight) : "",
        unit: data.unit || "piece",
        color: data.color || specs.Color || "",
        size: data.size || specs.Size || "",
        material: data.material || specs.Material || "",
        dimensions_length: String(data.dimensions?.length || 0),
        dimensions_width: String(data.dimensions?.width || 0),
        dimensions_height: String(data.dimensions?.height || 0),
        country_of_origin: data.country_of_origin || "India",
        generic_name: data.generic_name || "",
        specifications: specs,

        fabric: specs.Fabric || "",
        gender: specs.Gender || "",
        expiry_shelf_life: specs["Expiry / Shelf Life"] || "",
        net_quantity: specs["Net Quantity"] || "",
        ingredients: specs.Ingredients || "",
        power_wattage: specs["Power / Wattage"] || "",

        quantity: String(data.quantity || 0),
        low_stock_threshold: String(data.low_stock_threshold || 5),
        allow_backorder: Boolean(data.allow_backorder),

        package_weight: data.package_weight !== null && data.package_weight !== undefined ? String(data.package_weight) : "",
        package_length: String(data.package_dimensions?.length || 0),
        package_width: String(data.package_dimensions?.width || 0),
        package_height: String(data.package_dimensions?.height || 0),
        shipping_class: data.shipping_class || "standard",
        custom_shipping_charge: data.custom_shipping_charge !== null && data.custom_shipping_charge !== undefined ? String(data.custom_shipping_charge) : "",
        is_free_shipping: Boolean(data.is_free_shipping),
        estimated_delivery_text: data.estimated_delivery_text || "2 - 5 Business Days",

        is_returnable: data.is_returnable !== false,
        return_window_days: String(data.return_window_days || 7),
        return_conditions: data.return_conditions || "Product must be unused and in original packaging.",
        is_replaceable: data.is_replaceable !== false,
        has_warranty: Boolean(data.has_warranty),
        warranty_period: data.warranty_period || "1 Year",
        warranty_type: data.warranty_type || "Manufacturer Warranty",
        warranty_description: data.warranty_description || "",

        tags: data.tags || [],
        search_keywords: data.search_keywords || [],
        is_featured: Boolean(data.is_featured),
        is_new: Boolean(data.is_new),
        is_bestseller: Boolean(data.is_bestseller),
        is_flash_sale: Boolean(data.is_flash_sale),
        flash_sale_price: data.flash_sale_price ? String(data.flash_sale_price) : "",
        status: data.status || "active",

        internal_notes: data.internal_notes || "",
        supplier_info: data.supplier_info || "",

        variants: (data.variants as ProductVariant[]) || [],
      });
    }
    setLoading(false);
  }

  function generateSlug() {
    const slug = formData.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    setFormData((prev) => ({ ...prev, slug }));
  }

  function handleImageChange(index: number, value: string) {
    const images = [...formData.images];
    images[index] = value;
    setFormData((prev) => ({ ...prev, images }));
  }

  function addImageField() {
    setFormData((prev) => ({ ...prev, images: [...prev.images, ""] }));
  }

  function removeImage(index: number) {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  }

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>, index: number) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

    const { error } = await supabase.storage.from("products").upload(fileName, file);

    if (error) {
      toast.error(error.message);
      setUploadingImage(false);
      return;
    }

    const { data } = supabase.storage.from("products").getPublicUrl(fileName);
    handleImageChange(index, data.publicUrl);
    toast.success("Image uploaded successfully");
    setUploadingImage(false);
  }

  // Key Features Bullet Points
  function handleBulletChange(index: number, value: string) {
    const bullets = [...formData.bullet_points];
    bullets[index] = value;
    setFormData((prev) => ({ ...prev, bullet_points: bullets }));
  }

  function addBulletField() {
    setFormData((prev) => ({ ...prev, bullet_points: [...prev.bullet_points, ""] }));
  }

  function removeBulletField(index: number) {
    setFormData((prev) => ({
      ...prev,
      bullet_points: prev.bullet_points.filter((_, i) => i !== index),
    }));
  }

  // Specifications
  function addSpecification() {
    if (!specKey.trim() || !specValue.trim()) return;
    setFormData((prev) => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [specKey.trim()]: specValue.trim(),
      },
    }));
    setSpecKey("");
    setSpecValue("");
  }

  function removeSpecification(key: string) {
    const specs = { ...formData.specifications };
    delete specs[key];
    setFormData((prev) => ({ ...prev, specifications: specs }));
  }

  // Tags & Keywords
  function addTag() {
    if (!tagInput.trim()) return;
    if (!formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
    }
    setTagInput("");
  }

  function removeTag(t: string) {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((tag) => tag !== t) }));
  }

  function addKeyword() {
    if (!keywordInput.trim()) return;
    if (!formData.search_keywords.includes(keywordInput.trim())) {
      setFormData((prev) => ({ ...prev, search_keywords: [...prev.search_keywords, keywordInput.trim()] }));
    }
    setKeywordInput("");
  }

  function removeKeyword(k: string) {
    setFormData((prev) => ({ ...prev, search_keywords: prev.search_keywords.filter((kw) => kw !== k) }));
  }

  // Variant generator
  function generateVariantMatrix() {
    const colors = variantColors.split(",").map((s) => s.trim()).filter(Boolean);
    const sizes = variantSizes.split(",").map((s) => s.trim()).filter(Boolean);

    if (colors.length === 0 && sizes.length === 0) {
      toast.error("Enter at least one Color or Size to generate variants.");
      return;
    }

    const newVariants: ProductVariant[] = [];
    const baseSku = formData.sku || formData.name.substring(0, 4).toUpperCase();
    const basePrice = Number(formData.price) || 0;
    const baseCompare = formData.compare_price ? Number(formData.compare_price) : null;

    if (colors.length > 0 && sizes.length > 0) {
      colors.forEach((c) => {
        sizes.forEach((s) => {
          const varSku = `${baseSku}-${c.substring(0, 3).toUpperCase()}-${s.toUpperCase()}`;
          newVariants.push({
            id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            sku: varSku,
            title: `${c} / ${s}`,
            color: c,
            size: s,
            price: basePrice,
            compare_price: baseCompare,
            quantity: 5,
          });
        });
      });
    } else if (colors.length > 0) {
      colors.forEach((c) => {
        newVariants.push({
          id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          sku: `${baseSku}-${c.substring(0, 3).toUpperCase()}`,
          title: c,
          color: c,
          price: basePrice,
          compare_price: baseCompare,
          quantity: 5,
        });
      });
    } else {
      sizes.forEach((s) => {
        newVariants.push({
          id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          sku: `${baseSku}-${s.toUpperCase()}`,
          title: s,
          size: s,
          price: basePrice,
          compare_price: baseCompare,
          quantity: 5,
        });
      });
    }

    setFormData((prev) => ({ ...prev, variants: newVariants }));
    toast.success(`Generated ${newVariants.length} variant combination(s)`);
  }

  function updateVariant(index: number, field: keyof ProductVariant, value: string | number | undefined | null) {
    const updated = [...formData.variants];
    updated[index] = { ...updated[index], [field]: value };
    setFormData((prev) => ({ ...prev, variants: updated }));
  }

  function removeVariant(index: number) {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  }

  // Calculated Discount
  const discountPercent = useMemo(() => {
    const p = parseFloat(formData.price) || 0;
    const mrp = parseFloat(formData.compare_price) || 0;
    if (mrp > p && mrp > 0) {
      return Math.round(((mrp - p) / mrp) * 100);
    }
    return 0;
  }, [formData.price, formData.compare_price]);

  // Margin calculation (Admin Only)
  const adminMargin = useMemo(() => {
    const p = parseFloat(formData.price) || 0;
    const cost = parseFloat(formData.cost_price) || 0;
    if (p > 0 && cost > 0) {
      const profit = p - cost;
      const margin = (profit / p) * 100;
      return { profit, margin: margin.toFixed(1) };
    }
    return null;
  }, [formData.price, formData.cost_price]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // 1. Strict Validation
    if (!formData.name.trim()) {
      toast.error("Product name is required.");
      return;
    }
    if (!formData.category_id) {
      toast.error("Please select a Category.");
      return;
    }
    const sellingPrice = parseFloat(formData.price);
    if (isNaN(sellingPrice) || sellingPrice < 0) {
      toast.error("Selling price must be a valid non-negative number.");
      return;
    }
    const stockQty = parseInt(formData.quantity, 10);
    if (isNaN(stockQty) || stockQty < 0) {
      toast.error("Stock quantity must be a non-negative integer.");
      return;
    }

    const cleanImages = formData.images.filter((img) => img.trim().length > 0);
    if (cleanImages.length === 0) {
      toast.error("At least one product image is required.");
      return;
    }

    // Check variant SKU uniqueness
    if (formData.variants.length > 0) {
      const skus = formData.variants.map((v) => v.sku.trim().toLowerCase());
      const hasDuplicates = skus.some((s, idx) => skus.indexOf(s) !== idx);
      if (hasDuplicates) {
        toast.error("Each variant must have a unique SKU.");
        return;
      }
    }

    setSaving(true);

    const mergedSpecs: Record<string, string> = { ...formData.specifications };
    if (formData.color) mergedSpecs.Color = formData.color;
    if (formData.size) mergedSpecs.Size = formData.size;
    if (formData.material) mergedSpecs.Material = formData.material;
    if (formData.fabric) mergedSpecs.Fabric = formData.fabric;
    if (formData.gender) mergedSpecs.Gender = formData.gender;
    if (formData.expiry_shelf_life) mergedSpecs["Expiry / Shelf Life"] = formData.expiry_shelf_life;
    if (formData.net_quantity) mergedSpecs["Net Quantity"] = formData.net_quantity;
    if (formData.ingredients) mergedSpecs.Ingredients = formData.ingredients;
    if (formData.power_wattage) mergedSpecs["Power / Wattage"] = formData.power_wattage;

    const payload = {
      name: formData.name.trim(),
      slug: formData.slug.trim() || formData.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-"),
      brand: formData.brand.trim() || null,
      manufacturer: formData.manufacturer.trim() || null,
      category_id: formData.category_id || null,
      subcategory: formData.subcategory.trim() || null,
      product_type: formData.product_type.trim() || null,
      sku: formData.sku.trim() || null,
      model_number: formData.model_number.trim() || null,
      short_description: formData.short_description.trim() || null,
      description: formData.description.trim() || null,
      bullet_points: formData.bullet_points.filter((b) => b.trim().length > 0),

      price: sellingPrice,
      compare_price: formData.compare_price ? parseFloat(formData.compare_price) : null,
      cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
      gst_rate: formData.gst_rate ? parseFloat(formData.gst_rate) : 0,

      images: cleanImages,

      weight: formData.weight ? parseFloat(formData.weight) : null,
      unit: formData.unit || "piece",
      color: formData.color.trim() || null,
      size: formData.size.trim() || null,
      material: formData.material.trim() || null,
      dimensions: {
        length: parseFloat(formData.dimensions_length) || 0,
        width: parseFloat(formData.dimensions_width) || 0,
        height: parseFloat(formData.dimensions_height) || 0,
      },
      country_of_origin: formData.country_of_origin.trim() || "India",
      generic_name: formData.generic_name.trim() || null,
      specifications: mergedSpecs,

      quantity: stockQty,
      low_stock_threshold: parseInt(formData.low_stock_threshold, 10) || 5,
      allow_backorder: formData.allow_backorder,

      package_weight: formData.package_weight ? parseFloat(formData.package_weight) : null,
      package_dimensions: {
        length: parseFloat(formData.package_length) || 0,
        width: parseFloat(formData.package_width) || 0,
        height: parseFloat(formData.package_height) || 0,
      },
      shipping_class: formData.shipping_class || "standard",
      custom_shipping_charge: formData.custom_shipping_charge ? parseFloat(formData.custom_shipping_charge) : null,
      is_free_shipping: formData.is_free_shipping,
      estimated_delivery_text: formData.estimated_delivery_text.trim() || null,

      is_returnable: formData.is_returnable,
      return_window_days: parseInt(formData.return_window_days, 10) || 7,
      return_conditions: formData.return_conditions.trim() || null,
      is_replaceable: formData.is_replaceable,
      has_warranty: formData.has_warranty,
      warranty_period: formData.warranty_period.trim() || null,
      warranty_type: formData.warranty_type.trim() || null,
      warranty_description: formData.warranty_description.trim() || null,

      tags: formData.tags,
      search_keywords: formData.search_keywords,
      is_featured: formData.is_featured,
      is_new: formData.is_new,
      is_bestseller: formData.is_bestseller,
      is_flash_sale: formData.is_flash_sale,
      flash_sale_price: formData.flash_sale_price ? parseFloat(formData.flash_sale_price) : null,
      status: formData.status,

      internal_notes: formData.internal_notes.trim() || null,
      supplier_info: formData.supplier_info.trim() || null,
      variants: formData.variants,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (id) {
      const res = await supabase.from("products").update(payload).eq("id", id);
      error = res.error;
    } else {
      const res = await supabase.from("products").insert(payload);
      error = res.error;
    }

    setSaving(false);

    if (error) {
      console.error("Failed to save product:", error);
      toast.error(error.message || "Failed to save product in database.");
      return;
    }

    toast.success(id ? "Product updated successfully!" : "Product created successfully!");
    navigate("/admin/products");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin/products")}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-display text-gray-900 dark:text-white">
                {id ? "Edit Product" : "Add New Product"}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-primary-100 text-primary-800 dark:bg-primary-950/50 dark:text-primary-300">
                Amazon-Style Listing
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Comprehensive catalog management with dynamic category fields & multi-variant support
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {id && (
            <Button
              variant="outline"
              size="sm"
              icon={<Eye className="w-4 h-4" />}
              onClick={() => window.open(`/product/${formData.slug || id}`, "_blank")}
            >
              Preview Store Page
            </Button>
          )}
          <Button
            variant="primary"
            loading={saving}
            onClick={handleSubmit}
            icon={<CheckCircle2 className="w-4 h-4" />}
          >
            {id ? "Save Changes" : "Publish Product"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Navigation Section Tabs */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-semibold">
          {[
            { id: "basic", label: "1. Basic Info", icon: Package },
            { id: "pricing", label: "2. Pricing & GST", icon: DollarSign },
            { id: "images", label: "3. Images", icon: ImageIcon },
            { id: "specs", label: "4. Specifications", icon: Layers },
            { id: "variants", label: "5. Variants", icon: Boxes },
            { id: "inventory", label: "6. Inventory", icon: Tag },
            { id: "shipping", label: "7. Shipping", icon: Truck },
            { id: "return", label: "8. Return & Warranty", icon: RotateCcw },
            { id: "visibility", label: "9. Visibility & SEO", icon: Sparkles },
            { id: "admin", label: "10. Admin Only", icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  active
                    ? "bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 1. BASIC INFORMATION */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/80 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-primary-600" />
                1. Basic Product Information
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Core titles, classification, and detailed bullet descriptions.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <Input
                label="Product Title / Name"
                required
                placeholder="e.g., Premium Wireless Noise-Cancelling Headphones"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="flex gap-2 items-end">
              <Input
                className="flex-1"
                label="URL Slug"
                placeholder="product-url-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
              <Button type="button" variant="outline" onClick={generateSlug}>
                Generate
              </Button>
            </div>

            <Select
              label="Primary Category"
              required
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            >
              <option value="">Select a Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <Input
              label="Subcategory"
              placeholder="e.g., Audio Accessories"
              value={formData.subcategory}
              onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
            />

            <Input
              label="Product Type"
              placeholder="e.g., Over-Ear Headset"
              value={formData.product_type}
              onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
            />

            <Input
              label="Brand Name"
              placeholder="e.g., Sony, Apple, Azhar's Choice"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            />

            <Input
              label="Manufacturer"
              placeholder="e.g., Acme Electronics Pvt Ltd"
              value={formData.manufacturer}
              onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
            />

            <Input
              label="Base SKU / Product Code"
              placeholder="e.g., WH-1000XM5-BLK"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            />

            <Input
              label="Model Number"
              placeholder="e.g., XM5-2026"
              value={formData.model_number}
              onChange={(e) => setFormData({ ...formData, model_number: e.target.value })}
            />
          </div>

          <div className="space-y-4 pt-2">
            <Input
              label="Short Catchy Description (appears above the fold)"
              placeholder="One or two sentences highlighting the top selling points."
              value={formData.short_description}
              onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
            />

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Full Product Description
              </label>
              <textarea
                rows={4}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="Comprehensive details, styling recommendations, usage instructions, etc."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Key Features / Bullet Points */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Key Features / Amazon-Style Bullet Points
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addBulletField}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Feature
                </Button>
              </div>

              {formData.bullet_points.map((bp, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 w-5">#{idx + 1}</span>
                  <Input
                    className="flex-1"
                    placeholder="e.g., Industry-leading noise cancellation with two processors and 8 microphones"
                    value={bp}
                    onChange={(e) => handleBulletChange(idx, e.target.value)}
                  />
                  {formData.bullet_points.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBulletField(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. PRICING & GST */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/80 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                2. Pricing, Discounts & GST
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Authoritative customer selling prices, MRP strikes, and tax rates.</p>
            </div>
            {discountPercent > 0 && (
              <Badge variant="success" className="text-xs font-bold">
                {discountPercent}% Customer Discount
              </Badge>
            )}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            <Input
              label="Maximum Retail Price (MRP / Compare Price)"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g., 2999"
              value={formData.compare_price}
              onChange={(e) => setFormData({ ...formData, compare_price: e.target.value })}
            />

            <Input
              label="Selling Price (Discounted Store Price)"
              type="number"
              required
              min="0"
              step="0.01"
              placeholder="e.g., 2499"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />

            <Input
              label="Cost Price (Admin-Only Confidential)"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g., 1800"
              value={formData.cost_price}
              onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
            />

            <Select
              label="GST / Tax Rate (%)"
              value={formData.gst_rate}
              onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
            >
              <option value="0">0% (Exempt)</option>
              <option value="5">5% GST</option>
              <option value="12">12% GST</option>
              <option value="18">18% GST (Standard)</option>
              <option value="28">28% GST</option>
            </Select>
          </div>

          {adminMargin && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-emerald-900 dark:text-emerald-300">
                  Admin Profit Margin Indicator:
                </span>
                <span className="text-emerald-800 dark:text-emerald-400">
                  Estimated Profit ₹{adminMargin.profit.toFixed(2)} per unit
                </span>
              </div>
              <span className="font-bold text-emerald-700 dark:text-emerald-300 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-md">
                {adminMargin.margin}% Margin
              </span>
            </div>
          )}
        </div>

        {/* 3. PRODUCT IMAGES */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/80 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-600" />
                3. Product Images Gallery
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Add main image and multiple high-resolution gallery angles.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addImageField}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add More Images
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {formData.images.map((imgUrl, index) => (
              <div
                key={index}
                className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 space-y-3"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                  <span>{index === 0 ? "Main Cover Image" : `Gallery Image #${index + 1}`}</span>
                  {formData.images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="aspect-video bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={`Product image ${index + 1}`}
                      className="h-full w-full object-contain"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=600&auto=format&fit=crop&q=80";
                      }}
                    />
                  ) : (
                    <div className="text-center p-4 text-gray-400">
                      <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                      <span className="text-xs">No image provided</span>
                    </div>
                  )}
                </div>

                <Input
                  label="Image Direct URL"
                  placeholder="https://..."
                  value={imgUrl}
                  onChange={(e) => handleImageChange(index, e.target.value)}
                />

                <div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    Upload from Device
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => uploadImage(e, index)}
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. PRODUCT SPECIFICATIONS & CATEGORY DYNAMIC FIELDS */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  4. Specifications & Category-Specific Attributes
                </h2>
                <Badge variant="info" className="text-xs">
                  Category: {selectedCategory?.name || "General"}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Contextual fields adapt automatically based on category selection.
              </p>
            </div>
          </div>

          {/* General Universal Specs */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            <Input
              label="Item Weight"
              type="number"
              step="0.01"
              placeholder="e.g., 0.25"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
            />

            <Select
              label="Unit of Measurement"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            >
              <option value="piece">Piece / Unit</option>
              <option value="kg">Kilogram (kg)</option>
              <option value="g">Gram (g)</option>
              <option value="L">Litre (L)</option>
              <option value="ml">Millilitre (ml)</option>
              <option value="pack">Pack / Box</option>
              <option value="pair">Pair</option>
              <option value="set">Set</option>
            </Select>

            <Input
              label="Country of Origin"
              placeholder="e.g., India"
              value={formData.country_of_origin}
              onChange={(e) => setFormData({ ...formData, country_of_origin: e.target.value })}
            />

            <Input
              label="Generic Name"
              placeholder="e.g., Bluetooth Headset"
              value={formData.generic_name}
              onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
            />
          </div>

          {/* DYNAMIC CATEGORY FIELDS */}
          <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-4">
            <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Tailored Fields for {selectedCategory?.name || "This Category"}
            </h3>

            {(categoryType === "clothing" || categoryType === "shoes" || categoryType === "general") && (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input
                  label="Primary Colour"
                  placeholder="e.g., Midnight Black"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
                <Input
                  label="Standard Size"
                  placeholder="e.g., M / UK 9 / Free Size"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                />
                <Input
                  label="Material"
                  placeholder="e.g., 100% Organic Cotton / Leather"
                  value={formData.material}
                  onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                />
                {categoryType === "clothing" && (
                  <Input
                    label="Fabric Type"
                    placeholder="e.g., Pure Linen, Denim"
                    value={formData.fabric || ""}
                    onChange={(e) => setFormData({ ...formData, fabric: e.target.value })}
                  />
                )}
                {(categoryType === "clothing" || categoryType === "shoes") && (
                  <Select
                    label="Gender / Target Demographic"
                    value={formData.gender || "Unisex"}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="Unisex">Unisex</option>
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="Kids">Kids / Boys / Girls</option>
                  </Select>
                )}
              </div>
            )}

            {categoryType === "grocery" && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                  label="Net Quantity"
                  placeholder="e.g., 500g / 1 Litre"
                  value={formData.net_quantity || ""}
                  onChange={(e) => setFormData({ ...formData, net_quantity: e.target.value })}
                />
                <Input
                  label="Expiry / Shelf Life"
                  placeholder="e.g., 12 Months from packaging"
                  value={formData.expiry_shelf_life || ""}
                  onChange={(e) => setFormData({ ...formData, expiry_shelf_life: e.target.value })}
                />
                <Input
                  label="Key Ingredients"
                  placeholder="e.g., Whole Wheat, Salt, Saffron"
                  value={formData.ingredients || ""}
                  onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                />
              </div>
            )}

            {categoryType === "electronics" && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                  label="Power / Wattage"
                  placeholder="e.g., 65W Fast Charge / 220V"
                  value={formData.power_wattage || ""}
                  onChange={(e) => setFormData({ ...formData, power_wattage: e.target.value })}
                />
                <Input
                  label="Material / Build"
                  placeholder="e.g., Aerospace Aluminium + Polycarbonate"
                  value={formData.material}
                  onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                />
                <Input
                  label="Colour"
                  placeholder="e.g., Space Grey"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
            )}
          </div>

          {/* Custom Extra Key-Value Specifications */}
          <div className="space-y-3 pt-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Additional Custom Specifications
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Spec Name (e.g., Bluetooth Version)"
                value={specKey}
                onChange={(e) => setSpecKey(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Spec Value (e.g., v5.3 Low Latency)"
                value={specValue}
                onChange={(e) => setSpecValue(e.target.value)}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addSpecification}>
                Add Specification
              </Button>
            </div>

            {Object.keys(formData.specifications).length > 0 && (
              <div className="grid md:grid-cols-2 gap-2 pt-2">
                {Object.entries(formData.specifications).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs border border-gray-200 dark:border-gray-700"
                  >
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{k}:</span>
                    <span className="text-gray-900 dark:text-white font-medium">{v}</span>
                    <button
                      type="button"
                      onClick={() => removeSpecification(k)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 5. VARIANTS SYSTEM */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/80 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-rose-600" />
                5. Product Variants (Color, Size & Multi-Combinations)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Manage distinct SKUs, prices, stock levels, and combination titles for complex items.
              </p>
            </div>
          </div>

          {/* Fast Variant Combinator */}
          <div className="p-4 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-900 dark:text-rose-300">
              Quick Variant Generator
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Comma-separated Colours"
                placeholder="e.g., Black, White, Navy Blue"
                value={variantColors}
                onChange={(e) => setVariantColors(e.target.value)}
              />
              <Input
                label="Comma-separated Sizes"
                placeholder="e.g., S, M, L, XL"
                value={variantSizes}
                onChange={(e) => setVariantSizes(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateVariantMatrix}
              icon={<ListPlus className="w-4 h-4" />}
            >
              Generate Variant Matrix
            </Button>
          </div>

          {/* Variants Table */}
          {formData.variants.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="p-3">Variant Title</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Selling Price (₹)</th>
                    <th className="p-3">Stock Qty</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {formData.variants.map((v, vIdx) => (
                    <tr key={v.id || vIdx} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="p-3 font-semibold text-gray-900 dark:text-white">
                        <input
                          type="text"
                          value={v.title}
                          onChange={(e) => updateVariant(vIdx, "title", e.target.value)}
                          className="w-full bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-primary-500 outline-none p-1 font-medium"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={v.sku}
                          onChange={(e) => updateVariant(vIdx, "sku", e.target.value)}
                          className="w-full bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-primary-500 outline-none p-1 font-mono"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={v.price}
                          onChange={(e) => updateVariant(vIdx, "price", parseFloat(e.target.value) || 0)}
                          className="w-24 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-primary-500 outline-none p-1 font-bold"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={v.quantity}
                          onChange={(e) => updateVariant(vIdx, "quantity", parseInt(e.target.value, 10) || 0)}
                          className="w-20 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-primary-500 outline-none p-1 font-bold text-emerald-600"
                        />
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => removeVariant(vIdx)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
              No variants defined yet. Use the Quick Variant Generator above if this product has multiple colors or sizes.
            </p>
          )}
        </div>

        {/* 6. INVENTORY & STOCK */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/80 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-600" />
                6. Inventory & Stock Controls
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Authoritative master inventory levels and low stock triggers.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <Input
              label="Current Total Stock Quantity"
              type="number"
              required
              min="0"
              placeholder="e.g., 25"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            />

            <Input
              label="Low Stock Warning Threshold"
              type="number"
              min="1"
              placeholder="e.g., 5"
              value={formData.low_stock_threshold}
              onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
            />

            <div className="flex items-center gap-3 pt-7">
              <input
                type="checkbox"
                id="allow_backorder"
                checked={formData.allow_backorder}
                onChange={(e) => setFormData({ ...formData, allow_backorder: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <label htmlFor="allow_backorder" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Allow Backorders (Allow orders when out of stock)
              </label>
            </div>
          </div>
        </div>

        {/* 7. SHIPPING INFORMATION */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/80 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-cyan-600" />
                7. Shipping & Packaging
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Package dimensions, delivery estimates, and custom shipping rules.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            <Input
              label="Package Weight (kg)"
              type="number"
              step="0.01"
              placeholder="e.g., 0.45"
              value={formData.package_weight}
              onChange={(e) => setFormData({ ...formData, package_weight: e.target.value })}
            />

            <Input
              label="Package Length (cm)"
              type="number"
              value={formData.package_length}
              onChange={(e) => setFormData({ ...formData, package_length: e.target.value })}
            />

            <Input
              label="Package Width (cm)"
              type="number"
              value={formData.package_width}
              onChange={(e) => setFormData({ ...formData, package_width: e.target.value })}
            />

            <Input
              label="Package Height (cm)"
              type="number"
              value={formData.package_height}
              onChange={(e) => setFormData({ ...formData, package_height: e.target.value })}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-5 pt-2">
            <Input
              label="Estimated Delivery Text"
              placeholder="e.g., Same Day Delivery / 2-4 Days"
              value={formData.estimated_delivery_text}
              onChange={(e) => setFormData({ ...formData, estimated_delivery_text: e.target.value })}
            />

            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="is_free_shipping"
                checked={formData.is_free_shipping}
                onChange={(e) => setFormData({ ...formData, is_free_shipping: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <label htmlFor="is_free_shipping" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                Grant Free Shipping on this specific item regardless of cart value
              </label>
            </div>
          </div>
        </div>

        {/* 8. RETURN & WARRANTY */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/80 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-orange-600" />
                8. Return Policy & Warranty Details
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Displayed in trust badges on customer product detail page.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <div className="flex items-center gap-3 pt-4">
              <input
                type="checkbox"
                id="is_returnable"
                checked={formData.is_returnable}
                onChange={(e) => setFormData({ ...formData, is_returnable: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <label htmlFor="is_returnable" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Product is Returnable
              </label>
            </div>

            <Select
              label="Return Window Period"
              value={formData.return_window_days}
              onChange={(e) => setFormData({ ...formData, return_window_days: e.target.value })}
              disabled={!formData.is_returnable}
            >
              <option value="7">7 Days Easy Return</option>
              <option value="10">10 Days Return</option>
              <option value="15">15 Days Return</option>
              <option value="30">30 Days Return</option>
              <option value="0">Non-Returnable (Hygiene / Perishable)</option>
            </Select>

            <div className="flex items-center gap-3 pt-4">
              <input
                type="checkbox"
                id="is_replaceable"
                checked={formData.is_replaceable}
                onChange={(e) => setFormData({ ...formData, is_replaceable: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <label htmlFor="is_replaceable" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Replacement Available
              </label>
            </div>
          </div>

          <Input
            label="Specific Return Conditions"
            value={formData.return_conditions}
            onChange={(e) => setFormData({ ...formData, return_conditions: e.target.value })}
          />

          <div className="pt-4 border-t border-gray-100 dark:border-gray-700/80 space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="has_warranty"
                checked={formData.has_warranty}
                onChange={(e) => setFormData({ ...formData, has_warranty: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <label htmlFor="has_warranty" className="text-sm font-bold text-gray-900 dark:text-white">
                This Product Includes Manufacturer / Seller Warranty
              </label>
            </div>

            {formData.has_warranty && (
              <div className="grid md:grid-cols-3 gap-5 pt-2">
                <Input
                  label="Warranty Period"
                  placeholder="e.g., 1 Year / 6 Months"
                  value={formData.warranty_period}
                  onChange={(e) => setFormData({ ...formData, warranty_period: e.target.value })}
                />
                <Input
                  label="Warranty Type"
                  placeholder="e.g., Brand Warranty / Replacement"
                  value={formData.warranty_type}
                  onChange={(e) => setFormData({ ...formData, warranty_type: e.target.value })}
                />
                <Input
                  label="Warranty Coverage Description"
                  placeholder="e.g., Covers internal parts and manufacturing flaws"
                  value={formData.warranty_description}
                  onChange={(e) => setFormData({ ...formData, warranty_description: e.target.value })}
                />
              </div>
            )}
          </div>
        </div>

        {/* 9. VISIBILITY, FLASH SALE & SEARCH SEO */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/80 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                9. Store Visibility, Flash Deals & Badges
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Promotional merchandising badges and search keywords.</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <span className="text-xs font-bold text-gray-900 dark:text-white">Featured Product</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_new}
                onChange={(e) => setFormData({ ...formData, is_new: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <span className="text-xs font-bold text-gray-900 dark:text-white">New Arrival Badge</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_bestseller}
                onChange={(e) => setFormData({ ...formData, is_bestseller: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <span className="text-xs font-bold text-gray-900 dark:text-white">Bestseller Badge</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_flash_sale}
                onChange={(e) => setFormData({ ...formData, is_flash_sale: e.target.checked })}
                className="w-4 h-4 text-rose-600 rounded"
              />
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Flash Sale Deal</span>
            </label>
          </div>

          {formData.is_flash_sale && (
            <div className="grid md:grid-cols-2 gap-4 p-4 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
              <Input
                label="Flash Sale Price (₹)"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g., 1999"
                value={formData.flash_sale_price}
                onChange={(e) => setFormData({ ...formData, flash_sale_price: e.target.value })}
              />
              <Select
                label="Store Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "draft" | "archived" })}
              >
                <option value="active">Active (Visible in Store)</option>
                <option value="draft">Draft (Hidden from Store)</option>
                <option value="archived">Archived</option>
              </Select>
            </div>
          )}

          {/* Search Keywords & Tags */}
          <div className="grid md:grid-cols-2 gap-5 pt-2">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Search Keywords (Hidden keywords to optimize search)
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., wireless, bluetooth, earphones"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                />
                <Button type="button" variant="outline" size="sm" onClick={addKeyword}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {formData.search_keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  >
                    {kw}
                    <button type="button" onClick={() => removeKeyword(kw)} className="text-gray-500 hover:text-red-500">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Store Tags (Publicly visible filter chips)
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., trending, summer, premium"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                />
                <Button type="button" variant="outline" size="sm" onClick={addTag}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {formData.tags.map((tg) => (
                  <span
                    key={tg}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-primary-50 dark:bg-primary-950/40 text-primary-800 dark:text-primary-300 border border-primary-200 dark:border-primary-800"
                  >
                    #{tg}
                    <button type="button" onClick={() => removeTag(tg)} className="text-primary-600 hover:text-red-500">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 10. ADMIN CONFIDENTIAL (NEVER EXPOSED TO CUSTOMERS) */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/80 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                10. Admin-Only Confidential Records
              </h2>
              <p className="text-xs text-red-500 font-semibold">
                This information is strictly internal and will NEVER be rendered on the customer storefront.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Internal Notes & Procurement Log
              </label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-900/30 px-3.5 py-2.5 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="e.g., Ordered 50 units from vendor batch #882 on 12th Aug."
                value={formData.internal_notes}
                onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Supplier & Vendor Information
              </label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-900/30 px-3.5 py-2.5 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="e.g., Supplier: Global Trade Hub, Contact: +91 99999 11111, Vendor Code: V-401"
                value={formData.supplier_info}
                onChange={(e) => setFormData({ ...formData, supplier_info: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div>
            {id && (
              <Button
                type="button"
                variant="danger"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={() => setShowDeleteModal(true)}
              >
                Delete Product
              </Button>
            )}
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/admin/products")}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              loading={saving}
              variant="primary"
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              {id ? "Save Product Changes" : "Create Product"}
            </Button>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {id && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => !isDeleting && setShowDeleteModal(false)}
          title="Delete Product Permanently"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-900 dark:text-red-200">
                <p className="font-semibold">Permanently Delete from Database</p>
                <p className="mt-1 text-red-800 dark:text-red-300">
                  Are you sure you want to delete <strong>{formData.name || "this product"}</strong>? This removes it permanently or safely archives it if linked to prior orders.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={isDeleting}
                className="flex-1"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={async () => {
                  setIsDeleting(true);
                  const res = await deleteProductFromDb(id);
                  setIsDeleting(false);

                  if (!res.success) {
                    toast.error(res.error || "Failed to delete product from database");
                    return;
                  }

                  if (res.mode === "archived") {
                    toast.success("Product was removed from store (safely archived for orders)");
                  } else {
                    toast.success("Product permanently deleted from database");
                  }

                  setShowDeleteModal(false);
                  navigate("/admin/products");
                }}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
