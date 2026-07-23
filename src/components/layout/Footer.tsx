import { Link } from 'react-router-dom';
import { useSettings } from '../../contexts/SettingsContext';
import {
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Shield,
  Truck,
  RotateCcw,
} from 'lucide-react';

export function Footer() {
  const { settings } = useSettings();
  return (
    <footer className="bg-gray-900 text-gray-300 mt-20">
      {/* Features Section */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary-600/10 rounded-lg">
                <Truck className="h-6 w-6 text-primary-500" />
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Free Shipping</h4>
                <p className="text-sm text-gray-400">On orders over ₹499</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary-600/10 rounded-lg">
                <RotateCcw className="h-6 w-6 text-primary-500" />
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Easy Returns</h4>
                <p className="text-sm text-gray-400">7 days return policy</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary-600/10 rounded-lg">
                <Shield className="h-6 w-6 text-primary-500" />
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Secure Payment</h4>
                <p className="text-sm text-gray-400">100% secure checkout</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary-600/10 rounded-lg">
                <CreditCard className="h-6 w-6 text-primary-500" />
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Multiple Payment</h4>
                <p className="text-sm text-gray-400">COD, Cards, UPI</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-6">
  <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
    {settings.logo_url ? (
      <img
        src={settings.logo_url}
        alt={settings.store_name || "Store"}
        className="w-full h-full object-cover"
      />
    ) : (
      <span className="text-white font-bold text-lg">
        {(settings.store_name || "Store").charAt(0).toUpperCase()}
      </span>
    )}
  </div>

  <span className="text-xl font-display font-bold text-white">
    {settings.store_name || "Store"}
  </span>
</Link>
            <p className="text-gray-400 mb-6 leading-relaxed">
  {settings.store_tagline ||
    "Your one-stop destination for all your shopping needs. Quality products, great prices, and excellent service."}
</p>
           <div className="flex gap-3">
  <a
    href={settings.facebook || "#"}
    target="_blank"
    rel="noopener noreferrer"
    className="w-10 h-10 bg-gray-800 hover:bg-primary-600 rounded-full flex items-center justify-center transition-colors"
  >
    <Facebook className="h-5 w-5" />
  </a>

  <a
    href={settings.twitter || "#"}
    target="_blank"
    rel="noopener noreferrer"
    className="w-10 h-10 bg-gray-800 hover:bg-primary-600 rounded-full flex items-center justify-center transition-colors"
  >
    <Twitter className="h-5 w-5" />
  </a>

  <a
    href={settings.instagram || "#"}
    target="_blank"
    rel="noopener noreferrer"
    className="w-10 h-10 bg-gray-800 hover:bg-primary-600 rounded-full flex items-center justify-center transition-colors"
  >
    <Instagram className="h-5 w-5" />
  </a>

  <a
    href={settings.youtube || "#"}
    target="_blank"
    rel="noopener noreferrer"
    className="w-10 h-10 bg-gray-800 hover:bg-primary-600 rounded-full flex items-center justify-center transition-colors"
  >
    <Youtube className="h-5 w-5" />
  </a>
</div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-6">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-gray-400 hover:text-white transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/shop" className="text-gray-400 hover:text-white transition-colors">Shop</Link>
              </li>
              <li>
                <Link to="/categories" className="text-gray-400 hover:text-white transition-colors">Categories</Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-400 hover:text-white transition-colors">About Us</Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-400 hover:text-white transition-colors">Contact Us</Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-white font-semibold mb-6">Customer Service</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/account" className="text-gray-400 hover:text-white transition-colors">My Account</Link>
              </li>
              <li>
                <Link to="/orders" className="text-gray-400 hover:text-white transition-colors">Track Order</Link>
              </li>
              <li>
                <Link to="/wishlist" className="text-gray-400 hover:text-white transition-colors">Wishlist</Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/terms" className="text-gray-400 hover:text-white transition-colors">Terms & Conditions</Link>
              </li>
            </ul>
          </div>

         {/* Contact Info */}
<div>
  <h3 className="text-white font-semibold mb-6">Contact Us</h3>

  <ul className="space-y-4">
    <li className="flex items-start gap-3">
      <MapPin className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />

      <span className="text-gray-400">
        {[
          settings.address,
          settings.city,
          settings.state,
          settings.country,
          settings.postal_code,
        ]
          .filter(Boolean)
          .join(", ") || "Address not available"}
      </span>
    </li>

    <li className="flex items-center gap-3">
      <Phone className="h-5 w-5 text-primary-500 flex-shrink-0" />

      <a
        href={settings.phone ? `tel:${settings.phone}` : "#"}
        className="text-gray-400 hover:text-white transition-colors"
      >
        {settings.phone || "Phone not available"}
      </a>
    </li>

    <li className="flex items-center gap-3">
      <Mail className="h-5 w-5 text-primary-500 flex-shrink-0" />

      <a
        href={settings.email ? `mailto:${settings.email}` : "#"}
        className="text-gray-400 hover:text-white transition-colors"
      >
        {settings.email || "Email not available"}
      </a>
    </li>
  </ul>
</div>

</div>
</div>

{/* Newsletter */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-white font-semibold mb-2">Subscribe to our Newsletter</h3>
              <p className="text-gray-400 text-sm">Get the latest updates on new products and upcoming sales.</p>
            </div>
            <form className="flex gap-3 w-full md:w-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 md:w-64 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
           <p>
  © {new Date().getFullYear()} {settings.store_name || "Store"}. All rights reserved.
</p>
            <div className="flex items-center gap-6">
              <span>We accept:</span>
              <div className="flex items-center gap-2">
<img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png"alt="Visa" className="h-6 opacity-60" />

<img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6 opacity-60" />

<img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" alt="UPI" className="h-6 opacity-60" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
