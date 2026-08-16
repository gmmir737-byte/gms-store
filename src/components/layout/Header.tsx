import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  Package,
  LayoutDashboard,
  RotateCcw,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useDelivery } from '../../contexts/DeliveryContext';
import { Button } from '../common';
import { SearchAutocomplete } from '../shop/SearchAutocomplete';
import { NotificationsMenu } from '../common/NotificationsMenu';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);

  const { user, profile, isAdmin, signOut } = useAuth();
  const { itemCount } = useCart();
  const { itemCount: wishlistCount } = useWishlist();
  const { theme, toggleTheme } = useTheme();
  const { settings } = useSettings();
  const { selectedArea, openCheckerModal } = useDelivery();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsSearchOpen(false);
    setIsAutocompleteOpen(false);
  }, [location]);

  // Click outside listener for search autocomplete
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node) &&
        mobileSearchContainerRef.current &&
        !mobileSearchContainerRef.current.contains(e.target as Node)
      ) {
        setIsAutocompleteOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (term: string) => {
    const queryTerm = term.trim() || searchQuery.trim();
    if (queryTerm) {
      navigate(`/shop?search=${encodeURIComponent(queryTerm)}`);
      setIsSearchOpen(false);
      setIsAutocompleteOpen(false);
    }
  };

  const handleFormSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchSubmit(searchQuery);
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/shop' },
    { name: 'Categories', path: '/categories' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/85 dark:bg-gray-900/85 backdrop-blur-xl shadow-lg shadow-black/5 border-b border-gray-200/50 dark:border-gray-800/60'
            : 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800/40'
        }`}
      >
        {/* Top Announcement Bar */}
        {settings.announcement_enabled && settings.announcement_text && (
          <div className="bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-600 text-white text-xs font-semibold py-1.5 px-4 text-center tracking-wide">
            <span>{settings.announcement_text}</span>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 3 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-primary-600 via-indigo-600 to-pink-500 flex items-center justify-center shadow-md shadow-primary-500/20 ring-2 ring-white/20"
              >
                {settings.logo_url ? (
                  <img
                    src={settings.logo_url}
                    alt={settings.store_name || "Azhar's Store"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-black text-lg">
                    {(settings.store_name || "Azhar's Store").charAt(0).toUpperCase()}
                  </span>
                )}
              </motion.div>
              <div className="flex flex-col">
                <span className="text-xl font-display font-extrabold text-gray-900 dark:text-white tracking-tight hidden sm:block">
                  {settings.store_name || "Azhar's Store"}
                </span>
                {settings.header_tagline && (
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium hidden md:block -mt-1">
                    {settings.header_tagline}
                  </span>
                )}
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1 bg-gray-100/60 dark:bg-gray-800/50 p-1.5 rounded-full border border-gray-200/60 dark:border-gray-700/50 backdrop-blur-md">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`relative px-4 py-1.5 text-sm font-semibold rounded-full transition-all duration-200 ${
                      isActive
                        ? 'text-primary-600 dark:text-primary-400 bg-white dark:bg-gray-900 shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>

            {/* Search Bar - Desktop */}
            <div ref={searchContainerRef} className="hidden lg:flex items-center flex-1 max-w-sm mx-6 relative">
              <form onSubmit={handleFormSearch} className="w-full">
                <div className="relative w-full">
                  <input
                    type="text"
                    placeholder="Search products, brands, SKU, keywords..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsAutocompleteOpen(true);
                    }}
                    onFocus={() => setIsAutocompleteOpen(true)}
                    className="w-full pl-10 pr-4 py-2 text-sm rounded-full border border-gray-200 dark:border-gray-700/80
                      bg-gray-50/80 dark:bg-gray-800/80 text-gray-900 dark:text-white placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:bg-white dark:focus:bg-gray-900
                      transition-all shadow-inner"
                  />
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </form>
              <SearchAutocomplete
                query={searchQuery}
                isOpen={isAutocompleteOpen}
                onClose={() => setIsAutocompleteOpen(false)}
                onSearchSubmit={handleSearchSubmit}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* Delivery Area Location Button */}
              <button
                type="button"
                onClick={openCheckerModal}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100/90 dark:bg-gray-800/90 hover:bg-primary-50 dark:hover:bg-primary-950/50 text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 border border-gray-200/80 dark:border-gray-700/80 transition-all shadow-xs group max-w-[170px]"
                title="Check delivery availability in your area"
              >
                <MapPin className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="truncate">
                  {selectedArea ? selectedArea.area_name : 'Deliver to?'}
                </span>
              </button>

              {/* Mobile Search Toggle */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <Search className="h-5 w-5" />
              </motion.button>

              {/* Theme Toggle */}
              <motion.button
                whileTap={{ scale: 0.9, rotate: 180 }}
                transition={{ duration: 0.3 }}
                onClick={toggleTheme}
                className="p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-amber-400" />}
              </motion.button>

              {/* Wishlist */}
              <Link to="/wishlist">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="relative p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <Heart className="h-5 w-5" />
                  <AnimatePresence>
                    {wishlistCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary-600 text-white text-[11px] font-bold flex items-center justify-center rounded-full shadow-md ring-2 ring-white dark:ring-gray-900"
                      >
                        {wishlistCount > 9 ? '9+' : wishlistCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>

              {/* Cart */}
              <Link to="/cart">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="relative p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <ShoppingCart className="h-5 w-5" />
                  <AnimatePresence>
                    {itemCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary-600 text-white text-[11px] font-bold flex items-center justify-center rounded-full shadow-md ring-2 ring-white dark:ring-gray-900"
                      >
                        {itemCount > 9 ? '9+' : itemCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>

              {/* Notifications */}
              <NotificationsMenu />

              {/* User Menu */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-md shadow-primary-500/20 ring-2 ring-white/20">
                      <span className="text-white font-semibold text-xs">
                        {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 hidden lg:block" />
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsUserMenuOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-0 mt-2 w-60 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/80 dark:border-gray-700/80 py-2 z-20 overflow-hidden"
                        >
                          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/50">
                            <p className="font-semibold text-gray-900 dark:text-white text-sm">{profile?.full_name || 'User'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{profile?.email}</p>
                          </div>
                          <div className="py-1">
                            <Link to="/account" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70 font-medium">
                              <User className="h-4 w-4 text-primary-500" />
                              My Account
                            </Link>
                            <Link to="/orders" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70 font-medium">
                              <Package className="h-4 w-4 text-indigo-500" />
                              My Orders
                            </Link>
                            <Link to="/returns" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70 font-medium">
                              <RotateCcw className="h-4 w-4 text-amber-500" />
                              My Returns
                            </Link>
                            <Link to="/wishlist" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70 font-medium">
                              <Heart className="h-4 w-4 text-rose-500" />
                              Wishlist
                            </Link>
                            {isAdmin && (
                              <Link to="/admin" className="flex items-center gap-3 px-4 py-2.5 text-sm text-primary-600 dark:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700/70 font-semibold">
                                <LayoutDashboard className="h-4 w-4" />
                                Admin Dashboard
                              </Link>
                            )}
                          </div>
                          <div className="border-t border-gray-100 dark:border-gray-700/80 pt-1">
                            <button
                              onClick={signOut}
                              className="flex items-center gap-3 px-4 py-2.5 w-full text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium"
                            >
                              <LogOut className="h-4 w-4" />
                              Sign Out
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Link to="/login">
                    <Button variant="ghost" size="sm" className="font-semibold">Sign In</Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm" className="font-semibold shadow-md">Sign Up</Button>
                  </Link>
                </div>
              )}

              {/* Mobile Menu Toggle */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden px-4 pb-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md overflow-visible relative"
            >
              <div ref={mobileSearchContainerRef} className="relative">
                <form onSubmit={handleFormSearch}>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search products, brands, SKU..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsAutocompleteOpen(true);
                      }}
                      onFocus={() => setIsAutocompleteOpen(true)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 dark:border-gray-700
                        bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                        focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </form>
                <SearchAutocomplete
                  query={searchQuery}
                  isOpen={isAutocompleteOpen}
                  onClose={() => setIsAutocompleteOpen(false)}
                  onSearchSubmit={handleSearchSubmit}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-16 right-0 bottom-0 w-4/5 max-w-sm bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl overflow-y-auto border-l border-gray-200/50 dark:border-gray-800/50"
            >
              <nav className="p-4 sm:p-5 space-y-1.5">
                {/* Mobile Delivery Area Selector */}
                <div className="mb-3 p-3 rounded-2xl bg-primary-50/80 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-900/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300">Delivery Location</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[170px]">
                          {selectedArea ? selectedArea.area_name : 'Check Service Area'}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-2.5 bg-white dark:bg-gray-800"
                      onClick={() => {
                        setIsMenuOpen(false);
                        openCheckerModal();
                      }}
                    >
                      {selectedArea ? 'Change' : 'Check'}
                    </Button>
                  </div>
                </div>

                <p className="px-3 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                  Navigation
                </p>
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-4 py-3 rounded-xl font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors"
                  >
                    {link.name}
                  </Link>
                ))}

                {user ? (
                  <div className="pt-4 mt-2 border-t border-gray-200/60 dark:border-gray-800/60 space-y-1">
                    <p className="px-3 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                      Account & Orders
                    </p>
                    <Link
                      to="/account"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/80"
                    >
                      <User className="h-4 w-4 text-primary-500" />
                      My Account
                    </Link>
                    <Link
                      to="/orders"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/80"
                    >
                      <Package className="h-4 w-4 text-indigo-500" />
                      My Orders
                    </Link>
                    <Link
                      to="/returns"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/80"
                    >
                      <RotateCcw className="h-4 w-4 text-amber-500" />
                      My Returns
                    </Link>
                    <Link
                      to="/wishlist"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/80"
                    >
                      <Heart className="h-4 w-4 text-rose-500" />
                      Wishlist
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/30"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        signOut();
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 w-full text-left rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 mt-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-gray-200/50 dark:border-gray-800/50">
                    <div className="flex flex-col gap-3">
                      <Link to="/login" onClick={() => setIsMenuOpen(false)} className="w-full">
                        <Button variant="outline" className="w-full font-semibold min-h-[44px]">Sign In</Button>
                      </Link>
                      <Link to="/register" onClick={() => setIsMenuOpen(false)} className="w-full">
                        <Button className="w-full font-semibold min-h-[44px]">Sign Up</Button>
                      </Link>
                    </div>
                  </div>
                )}
              </nav>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Spacer */}
      <div className="h-16 lg:h-20" />
    </>
  );
}

