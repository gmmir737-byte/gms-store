import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";

import { supabase } from "../../lib/supabase";

import {
  Button,
  Input,
  Select,
  LoadingSpinner,
} from "../../components/common";

import type { Category } from "../../types/database";

import toast from "react-hot-toast";

export default function AdminProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    short_description: "",
    brand: "",
    sku: "",

    price: "",
    compare_price: "",
    quantity: "0",

    category_id: "",

    images: [""] as string[],

    specifications: {} as Record<string, string>,

    is_featured: false,
    is_new: false,
    is_bestseller: false,
    is_flash_sale: false,

    flash_sale_price: "",

    status: "draft" as "draft" | "active",
  });

  const [specKey, setSpecKey] = useState("");
  const [specValue, setSpecValue] = useState("");

  useEffect(() => {
    loadCategories();

    if (id) {
      loadProduct();
    }
  }, []);

  async function loadCategories() {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    if (data) {
      setCategories(data as Category[]);
    }
  }

  async function loadProduct() {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) {
      setFormData({
        name: data.name || "",
        slug: data.slug || "",
        description: data.description || "",
        short_description: data.short_description || "",

        brand: data.brand || "",
        sku: data.sku || "",

        price: String(data.price || ""),
        compare_price: String(data.compare_price || ""),

        quantity: String(data.quantity || 0),

        category_id: data.category_id || "",

        images:
          data.images && data.images.length
            ? data.images
            : [""],

        specifications:
          data.specifications || {},

        is_featured: data.is_featured,
        is_new: data.is_new,
        is_bestseller: data.is_bestseller,
        is_flash_sale: data.is_flash_sale,

        flash_sale_price:
          String(data.flash_sale_price || ""),

        status: data.status,
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

    setFormData({
      ...formData,
      slug,
    });
  }

  function handleImageChange(index: number, value: string) {
    const images = [...formData.images];

    images[index] = value;

    setFormData({
      ...formData,
      images,
    });
  }

  function addImageField() {
    setFormData({
      ...formData,
      images: [...formData.images, ""],
    });
  }

  function removeImage(index: number) {
    setFormData({
      ...formData,
      images: formData.images.filter(
        (_, i) => i !== index
      ),
    });
  }

  async function uploadImage(
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    setUploadingImage(true);

    const ext = file.name.split(".").pop();

    const fileName =
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .substring(2) +
      "." +
      ext;

    const { error } = await supabase.storage
      .from("products")
      .upload(fileName, file);

    if (error) {
      toast.error(error.message);

      setUploadingImage(false);

      return;
    }

    const { data } = supabase.storage
      .from("products")
      .getPublicUrl(fileName);

    handleImageChange(index, data.publicUrl);

    toast.success("Image uploaded");

    setUploadingImage(false);
  }

  function addSpecification() {
    if (!specKey || !specValue) return;

    setFormData({
      ...formData,
      specifications: {
        ...formData.specifications,
        [specKey]: specValue,
      },
    });

    setSpecKey("");
    setSpecValue("");
  }

  function removeSpecification(key: string) {
    const specs = { ...formData.specifications };

    delete specs[key];

    setFormData({
      ...formData,
      specifications: specs,
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }  return (
    <div className="max-w-7xl mx-auto space-y-6">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin/products")}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>

          <div>
            <h1 className="text-3xl font-bold">
              {id ? "Edit Product" : "Add Product"}
            </h1>

            <p className="text-gray-500">
              Manage your store products
            </p>
          </div>
        </div>
      </div>

      <form className="space-y-6">

        {/* BASIC INFORMATION */}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border p-6">

          <h2 className="text-xl font-semibold mb-6">
            Product Information
          </h2>

          <div className="grid md:grid-cols-2 gap-5">

            <Input
              label="Product Name"
              required
              value={formData.name}
              onChange={(e)=>
                setFormData({
                  ...formData,
                  name:e.target.value
                })
              }
            />

            <div className="flex gap-2 items-end">

              <Input
                className="flex-1"
                label="Slug"
                value={formData.slug}
                onChange={(e)=>
                  setFormData({
                    ...formData,
                    slug:e.target.value
                  })
                }
              />

              <Button
                type="button"
                variant="outline"
                onClick={generateSlug}
              >
                Generate
              </Button>

            </div>

            <Input
              label="Brand"
              value={formData.brand}
              onChange={(e)=>
                setFormData({
                  ...formData,
                  brand:e.target.value
                })
              }
            />

            <Input
              label="SKU"
              value={formData.sku}
              onChange={(e)=>
                setFormData({
                  ...formData,
                  sku:e.target.value
                })
              }
            />

          </div>

          <div className="mt-5">

            <Input
              label="Short Description"
              value={formData.short_description}
              onChange={(e)=>
                setFormData({
                  ...formData,
                  short_description:e.target.value
                })
              }
            />

          </div>

          <div className="mt-5">

            <label className="block font-medium mb-2">
              Description
            </label>

            <textarea
              rows={7}
              value={formData.description}
              onChange={(e)=>
                setFormData({
                  ...formData,
                  description:e.target.value
                })
              }
              className="w-full rounded-lg border p-3 dark:bg-gray-900"
            />

          </div>

        </div>

        {/* PRICE */}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border p-6">

          <h2 className="text-xl font-semibold mb-6">
            Pricing & Inventory
          </h2>

          <div className="grid md:grid-cols-4 gap-5">

            <Input
              label="Selling Price"
              type="number"
              value={formData.price}
              onChange={(e)=>
                setFormData({
                  ...formData,
                  price:e.target.value
                })
              }
            />

            <Input
              label="Compare Price"
              type="number"
              value={formData.compare_price}
              onChange={(e)=>
                setFormData({
                  ...formData,
                  compare_price:e.target.value
                })
              }
            />

            <Input
              label="Stock"
              type="number"
              value={formData.quantity}
              onChange={(e)=>
                setFormData({
                  ...formData,
                  quantity:e.target.value
                })
              }
            />

            <Input
              label="Flash Sale Price"
              type="number"
              value={formData.flash_sale_price}
              onChange={(e)=>
                setFormData({
                  ...formData,
                  flash_sale_price:e.target.value
                })
              }
            />

          </div>

          <div className="grid md:grid-cols-2 gap-5 mt-6">

            <Select
              label="Category"
              value={formData.category_id}
              onChange={(e)=>
                setFormData({
                  ...formData,
                  category_id:e.target.value
                })
              }
              options={[
                {
                  value:"",
                  label:"Select Category"
                },
                ...categories.map(category=>({
                  value:category.id,
                  label:category.name
                }))
              ]}
            />

            <Select
              label="Status"
              value={formData.status}
              onChange={(e)=>
                setFormData({
                  ...formData,
                  status:e.target.value as
                  "draft"|"active"
                })
              }
              options={[
                {
                  value:"draft",
                  label:"Draft"
                },
                {
                  value:"active",
                  label:"Active"
                }
              ]}
            />

          </div>

        </div>        {/* PRODUCT IMAGES */}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border p-6">

          <div className="flex items-center justify-between mb-6">

            <h2 className="text-xl font-semibold">
              Product Images
            </h2>

            <Button
              type="button"
              variant="outline"
              icon={<Plus className="w-4 h-4" />}
              onClick={addImageField}
            >
              Add Image
            </Button>

          </div>

          <div className="space-y-6">

            {formData.images.map((img, index) => (

              <div
                key={index}
                className="border rounded-xl p-5 space-y-4"
              >

                <Input
                  label={`Image ${index + 1} URL`}
                  value={img}
                  onChange={(e) =>
                    handleImageChange(index, e.target.value)
                  }
                  placeholder="https://..."
                />

                <div>

                  <label className="flex items-center gap-2 text-sm font-medium mb-2">

                    <Upload className="w-4 h-4" />

                    Upload From Computer

                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => uploadImage(e, index)}
                  />

                </div>

                {uploadingImage && (

                  <p className="text-blue-600">
                    Uploading image...
                  </p>

                )}

                {img ? (

                  <img
                    src={img}
                    alt=""
                    className="w-44 h-44 rounded-lg border object-cover"
                  />

                ) : (

                  <div className="w-44 h-44 rounded-lg border flex items-center justify-center">

                    <ImageIcon className="w-12 h-12 text-gray-400" />

                  </div>

                )}

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeImage(index)}
                  icon={<Trash2 className="w-4 h-4" />}
                >
                  Remove
                </Button>

              </div>

            ))}

          </div>

        </div>

        {/* SPECIFICATIONS */}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border p-6">

          <h2 className="text-xl font-semibold mb-6">
            Specifications
          </h2>

          <div className="space-y-4">

            {Object.entries(formData.specifications).map(
              ([key, value]) => (

                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border p-3"
                >

                  <div>

                    <strong>{key}</strong>

                    <div>{value}</div>

                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => removeSpecification(key)}
                    icon={<Trash2 className="w-4 h-4" />}
                  >
                    Remove
                  </Button>

                </div>

              )
            )}

            <div className="grid md:grid-cols-3 gap-4">

              <Input
                placeholder="Specification"
                value={specKey}
                onChange={(e) => setSpecKey(e.target.value)}
              />

              <Input
                placeholder="Value"
                value={specValue}
                onChange={(e) => setSpecValue(e.target.value)}
              />

              <Button
                type="button"
                onClick={addSpecification}
              >
                Add Specification
              </Button>

            </div>

          </div>

        </div>        {/* PRODUCT FLAGS */}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border p-6">

          <h2 className="text-xl font-semibold mb-6">
            Product Options
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e)=>
                  setFormData({
                    ...formData,
                    is_featured:e.target.checked
                  })
                }
              />
              Featured Product
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_new}
                onChange={(e)=>
                  setFormData({
                    ...formData,
                    is_new:e.target.checked
                  })
                }
              />
              New Arrival
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_bestseller}
                onChange={(e)=>
                  setFormData({
                    ...formData,
                    is_bestseller:e.target.checked
                  })
                }
              />
              Bestseller
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_flash_sale}
                onChange={(e)=>
                  setFormData({
                    ...formData,
                    is_flash_sale:e.target.checked
                  })
                }
              />
              Flash Sale
            </label>

          </div>

        </div>

        <div className="flex justify-end gap-4">

          <Button
            type="button"
            variant="outline"
            onClick={()=>navigate("/admin/products")}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            loading={saving}
            onClick={async(e)=>{

              e.preventDefault();

              setSaving(true);

              const productData={

                ...formData,

                price:Number(formData.price),

                compare_price:
                  formData.compare_price
                  ? Number(formData.compare_price)
                  : null,

                flash_sale_price:
                  formData.flash_sale_price
                  ? Number(formData.flash_sale_price)
                  : null,

                quantity:Number(formData.quantity),

                images:formData.images.filter(Boolean)

              };

              let error;

              if(id){

                const result=await supabase
                .from("products")
                .update(productData)
                .eq("id",id);

                error=result.error;

              }else{

                const result=await supabase
                .from("products")
                .insert(productData);

                error=result.error;

              }

              setSaving(false);

              if(error){

                toast.error(error.message);

                return;

              }

              toast.success(
                id
                ? "Product Updated Successfully"
                : "Product Created Successfully"
              );

              navigate("/admin/products");

            }}
          >

            {id
              ? "Update Product"
              : "Create Product"}

          </Button>

        </div>

      </form>

    </div>

  );

}