import React, { useState } from 'react';
import { User, Mail, Phone, Camera, Edit2, Save, MapPin, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, LoadingSpinner } from '../components/common';
import toast from 'react-hot-toast';

export function AccountPage() {
  const { user, profile, updateProfile, loading } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  });

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateProfile(formData);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Profile updated successfully');
      setEditing(false);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-8">
        My Account
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-primary-600 to-pink-600 p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || 'User'}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-bold text-white">
                    {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-gray-200">
                <Camera className="h-4 w-4 text-gray-600" />
              </button>
            </div>
            <div className="text-center md:text-left text-white">
              <h2 className="text-2xl font-bold">{profile?.full_name || 'User'}</h2>
              <p className="text-white/80">{profile?.email}</p>
              <p className="text-sm text-white/60 mt-1">
                Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Personal Information
            </h3>
            {!editing ? (
              <Button variant="outline" onClick={() => setEditing(true)} icon={<Edit2 className="h-4 w-4" />}>
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                <Button onClick={handleSave} loading={saving} icon={<Save className="h-4 w-4" />}>
                  Save
                </Button>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Input
              label="Full Name"
              value={editing ? formData.full_name : profile?.full_name || ''}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              icon={<User className="h-5 w-5" />}
              disabled={!editing}
            />
            <Input
              label="Email Address"
              value={profile?.email || ''}
              icon={<Mail className="h-5 w-5" />}
              disabled
            />
            <Input
              label="Phone Number"
              value={editing ? formData.phone : profile?.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              icon={<Phone className="h-5 w-5" />}
              disabled={!editing}
              placeholder="Add phone number"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
