import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Button, Input, LoadingSpinner } from "../../components/common";
import toast from "react-hot-toast";

interface Settings {
  id?: string;

  store_name: string;
  store_tagline: string;
  about_us: string;

  email: string;
  phone: string;
  whatsapp: string;

  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;

  website: string;

  facebook: string;
  instagram: string;
  twitter: string;
  youtube: string;

  logo_url: string;
  favicon_url: string;

  free_shipping_amount: number;
  shipping_charge: number;
  cod_enabled: boolean;
}

const defaultSettings: Settings = {
  store_name: "",
  store_tagline: "",
  about_us: "",

  email: "",
  phone: "",
  whatsapp: "",

  address: "",
  city: "",
  state: "",
  country: "",
  postal_code: "",

  website: "",

  facebook: "",
  instagram: "",
  twitter: "",
  youtube: "",

  logo_url: "",
  favicon_url: "",

  free_shipping_amount: 499,
  shipping_charge: 49,
  cod_enabled: true,
};

const AdminSettings: React.FC = () => {
  const [form, setForm] = useState<Settings>(defaultSettings);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [hasChanges, setHasChanges] = useState(false);

  const [lastSaved, setLastSaved] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      toast.error(error.message);
    } else if (data) {
      setForm({
        ...defaultSettings,
        ...data,
      });
    }

    setLoading(false);
  };

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setHasChanges(true);

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const save = async () => {
    setSaving(true);

    const { error } = await supabase
      .from("settings")
      .update(form)
      .eq("id", form.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Settings saved successfully");
      setHasChanges(false);
      setLastSaved(new Date().toLocaleString());
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 space-y-8">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Store Settings
            </h1>

            <p className="text-gray-500 mt-1">
              Manage your ecommerce website settings.
            </p>
          </div>

          <Button onClick={save} disabled={saving}>
            {saving
              ? "Saving..."
              : hasChanges
              ? "Save Changes *"
              : "Save Settings"}
          </Button>
        </div>

        {/* Store Information */}

        <div className="border rounded-xl p-6 space-y-5">

          <h2 className="text-xl font-semibold">
            🏪 Store Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <Input
              label="Store Name"
              name="store_name"
              value={form.store_name}
              onChange={onChange}
            />

            <Input
              label="Store Tagline"
              name="store_tagline"
              value={form.store_tagline}
              onChange={onChange}
            />

            <Input
              label="Logo URL"
              name="logo_url"
              value={form.logo_url}
              onChange={onChange}
            />

            <Input
              label="Favicon URL"
              name="favicon_url"
              value={form.favicon_url}
              onChange={onChange}
            />

          </div>
        </div>

        {/* Contact Information */}

        <div className="border rounded-xl p-6 space-y-5">

          <h2 className="text-xl font-semibold">
            📞 Contact Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <Input label="Email" name="email" value={form.email} onChange={onChange} />

            <Input label="Phone" name="phone" value={form.phone} onChange={onChange} />

            <Input label="WhatsApp" name="whatsapp" value={form.whatsapp} onChange={onChange} />

            <Input label="Website" name="website" value={form.website} onChange={onChange} />

            <Input label="Address" name="address" value={form.address} onChange={onChange} />

            <Input label="City" name="city" value={form.city} onChange={onChange} />

            <Input label="State" name="state" value={form.state} onChange={onChange} />

            <Input label="Country" name="country" value={form.country} onChange={onChange} />

            <Input
              label="Postal Code"
              name="postal_code"
              value={form.postal_code}
              onChange={onChange}
            />

          </div>
        </div>

        {/* Social Media */}

        <div className="border rounded-xl p-6 space-y-5">

          <h2 className="text-xl font-semibold">
            🌐 Social Media
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <Input
              label="Facebook"
              name="facebook"
              value={form.facebook}
              onChange={onChange}
            />

            <Input
              label="Instagram"
              name="instagram"
              value={form.instagram}
              onChange={onChange}
            />

            <Input
              label="Twitter / X"
              name="twitter"
              value={form.twitter}
              onChange={onChange}
            />

            <Input
              label="YouTube"
              name="youtube"
              value={form.youtube}
              onChange={onChange}
            />

          </div>
        </div>        {/* Shipping Settings */}

        <div className="border rounded-xl p-6 space-y-5">

          <h2 className="text-xl font-semibold">
            🚚 Shipping Settings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <Input
              label="Free Shipping Above (₹)"
              type="number"
              name="free_shipping_amount"
              value={form.free_shipping_amount}
              onChange={onChange}
            />

            <Input
              label="Shipping Charge (₹)"
              type="number"
              name="shipping_charge"
              value={form.shipping_charge}
              onChange={onChange}
            />

            <div className="flex items-center gap-3 pt-8">

              <input
                id="cod_enabled"
                type="checkbox"
                checked={form.cod_enabled}
                onChange={(e) => {
                  setHasChanges(true);

                  setForm((prev) => ({
                    ...prev,
                    cod_enabled: e.target.checked,
                  }));
                }}
              />

              <label htmlFor="cod_enabled">
                Enable Cash on Delivery (COD)
              </label>

            </div>

          </div>

        </div>

        {/* About Us */}

        <div className="border rounded-xl p-6 space-y-5">

          <h2 className="text-xl font-semibold">
            📝 About Us
          </h2>

          <textarea
            name="about_us"
            value={form.about_us}
            onChange={onChange}
            className="w-full min-h-[180px] rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 p-4"
          />

        </div>

        <div className="flex items-center justify-between">

          <div className="text-sm text-gray-500">

            {lastSaved && (
              <>
                Last Saved:
                <span className="font-medium ml-2">
                  {lastSaved}
                </span>
              </>
            )}

          </div>

          <Button onClick={save} disabled={saving}>
            {saving
              ? "Saving..."
              : hasChanges
              ? "Save Changes *"
              : "Save Settings"}
          </Button>

        </div>

      </div>
    </div>
  );
};

export default AdminSettings;