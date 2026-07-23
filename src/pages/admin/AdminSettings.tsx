
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Button, Input, LoadingSpinner } from "../../components/common";
import toast from "react-hot-toast";

type Settings = {
 id?: string;
  store_name:string; store_tagline:string; about_us:string;
  email:string; phone:string; whatsapp:string;
  address:string; city:string; state:string; country:string; postal_code:string;
  website:string; facebook:string; instagram:string; twitter:string; youtube:string;
  logo_url:string; favicon_url:string;free_shipping_amount: number;
shipping_charge: number;
cod_enabled: boolean;
};

const empty: Settings = {
  store_name:"",store_tagline:"",about_us:"",
  email:"",phone:"",whatsapp:"",
  address:"",city:"",state:"",country:"",postal_code:"",
  website:"",facebook:"",instagram:"",twitter:"",youtube:"",
  logo_url:"",favicon_url:"",free_shipping_amount: 499,
shipping_charge: 49,
cod_enabled: true,
};

const AdminSettings: React.FC = () => {
  const [form,setForm]=useState<Settings>(empty);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [lastSaved, setLastSaved] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(()=>{(async()=>{
    setLoading(true);
    const { data, error } = await supabase
  .from("settings")
  .select("id,*")
  .limit(1)
  .maybeSingle();
    if(error) toast.error(error.message);
   else if (data) {

  setForm({
    ...empty,
    ...data,
  });
}
    setLoading(false);
  })();},[]);

  const onChange = (e: any) => {
  setHasChanges(true);

  setForm((f) => ({
    ...f,
    [e.target.name]: e.target.value,
  }));
};

const save = async () => {
  setSaving(true);

  const { data, error } = await supabase
  .from("settings")
  .update({
    ...form,
  })
  .eq("id", form.id)
  .select();
  if (error) {
  console.error(error);
  toast.error(error.message);
} else {
  toast.success("Settings saved");
  setLastSaved(new Date().toLocaleString());
  setHasChanges(false);
}

  setSaving(false);
};if (loading)
  return (
    <div className="flex justify-center py-20">
      <LoadingSpinner />
    </div>
  );

const fields: [string, string][] = [
  ["Store Name", "store_name"],
  ["Store Tagline", "store_tagline"],
  ["Email", "email"],
  ["Phone", "phone"],
  ["WhatsApp", "whatsapp"],
  ["Address", "address"],
  ["City", "city"],
  ["State", "state"],
  ["Country", "country"],
  ["Postal Code", "postal_code"],
  ["Website", "website"],
  ["Facebook", "facebook"],
  ["Instagram", "instagram"],
  ["Twitter/X", "twitter"],
  ["YouTube", "youtube"],
  ["Logo URL", "logo_url"],
  ["Favicon URL", "favicon_url"],
];

return (
  <div className="max-w-6xl mx-auto p-6 text-gray-900 dark:text-gray-100">
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6 space-y-6">

      <h1 className="text-3xl font-bold">
        Store Settings
      </h1>

      {/* Store Information */}
      <div className="border rounded-xl p-5 space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">
          🏪 Store Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ["Store Name", "store_name"],
            ["Store Tagline", "store_tagline"],
            ["Logo URL", "logo_url"],
            ["Favicon URL", "favicon_url"],
          ].map(([label, key]) => (
            <div key={key}>
              <label className="block text-sm mb-1">{label}</label>

              <Input
  name={key}
  value={(form as any)[key]}
  onChange={onChange}
/>

{key === "logo_url" && form.logo_url && (
  <div className="mt-3">
    <img
      src={form.logo_url}
      alt="Store Logo"
      className="h-20 w-20 rounded-xl border object-cover"
    />
  </div>
)}

{key === "favicon_url" && form.favicon_url && (
  <div className="mt-3">
    <img
      src={form.favicon_url}
      alt="Favicon"
      className="h-10 w-10 rounded border object-cover"
    />
  </div>
)}
            </div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="border rounded-xl p-5 space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">
          📞 Contact Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ["Email", "email"],
            ["Phone", "phone"],
            ["WhatsApp", "whatsapp"],
            ["Website", "website"],
            ["Address", "address"],
            ["City", "city"],
            ["State", "state"],
            ["Country", "country"],
            ["Postal Code", "postal_code"],
          ].map(([label, key]) => (
            <div key={key}>
              <label className="block text-sm mb-1">{label}</label>

              <Input
                name={key}
                value={(form as any)[key]}
                onChange={onChange}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Social */}
      <div className="border rounded-xl p-5 space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">
          🌐 Social Media
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ["Facebook", "facebook"],
            ["Instagram", "instagram"],
            ["Twitter / X", "twitter"],
            ["YouTube", "youtube"],
          ].map(([label, key]) => (
            <div key={key}>
              <label className="block text-sm mb-1">{label}</label>

              <Input
                name={key}
                value={(form as any)[key]}
                onChange={onChange}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1">
          About Us
        </label>

        <textarea
          name="about_us"
          value={form.about_us}
          onChange={onChange}
          className="w-full rounded-lg border dark:bg-gray-800 p-3 min-h-40"
        />
      </div>

      <div className="flex items-center justify-between">

  <div className="text-sm text-gray-500 dark:text-gray-400">
    {lastSaved && (
      <>
        Last Updated: <span className="font-medium">{lastSaved}</span>
      </>
    )}
  </div>

 <Button onClick={save} loading={saving}>
  {hasChanges ? "Save Changes *" : "Save Settings"}
</Button>
</div>

    </div>
  </div>
);
};
export default AdminSettings;