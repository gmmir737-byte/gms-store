import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { DeliveryProvider } from './contexts/DeliveryContext';
import { Layout, AdminLayout } from './components/layout';
import { PageLoader, DeliveryCheckerModal } from './components/common';
import { useEffect } from "react";
import { useSettings } from "./contexts/SettingsContext";
// Lazy load pages
const HomePage = React.lazy(() => import('./pages/HomePage'));
const ShopPage = React.lazy(() => import('./pages/ShopPage'));
const ProductDetailPage = React.lazy(() => import('./pages/ProductDetailPage'));
const CategoriesPage = React.lazy(() => import('./pages/CategoriesPage'));
const CartPage = React.lazy(() => import('./pages/CartPage'));
const WishlistPage = React.lazy(() => import('./pages/WishlistPage'));
const CheckoutPage = React.lazy(() => import('./pages/CheckoutPage'));
const OrderSuccessPage = React.lazy(() => import('./pages/OrderSuccessPage'));
const OrderFailurePage = React.lazy(() => import('./pages/OrderFailurePage'));
const OrdersPage = React.lazy(() => import('./pages/OrdersPage'));
const MyReturnsPage = React.lazy(() => import('./pages/MyReturnsPage'));
const AccountPage = React.lazy(() => import('./pages/AccountPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));
const OtpVerifyPage = React.lazy(() => import('./pages/OtpVerifyPage'));
const AboutPage = React.lazy(() => import('./pages/AboutPage'));
const ContactPage = React.lazy(() => import('./pages/ContactPage'));
const PrivacyPolicyPage = React.lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsPage = React.lazy(() => import('./pages/TermsPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

// Admin pages
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const AdminProducts = React.lazy(() => import('./pages/admin/AdminProducts'));
const AdminProductForm = React.lazy(() => import('./pages/admin/AdminProductForm'));
const AdminCategories = React.lazy(() => import('./pages/admin/AdminCategories'));
const AdminOrders = React.lazy(() => import('./pages/admin/AdminOrders'));
const AdminReturns = React.lazy(() => import('./pages/admin/AdminReturns'));
const AdminDeliveryAreas = React.lazy(() => import('./pages/admin/AdminDeliveryAreas'));
const AdminCustomers = React.lazy(() => import('./pages/admin/AdminCustomers'));
const AdminCoupons = React.lazy(() => import('./pages/admin/AdminCoupons'));
const AdminSettings = React.lazy(() => import('./pages/admin/AdminSettings'));

// Helper to safely parse relative redirect URL
function getSafeRedirect(url: string | null | undefined): string {
  if (!url) return '/';
  if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) {
    return url;
  }
  return '/';
}

// Protected Route for authenticated users
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    const redirectParam = location.pathname + location.search;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectParam)}`} replace />;
  }

  return <>{children}</>;
}

// Protected Route for admins
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Public Route (redirect if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();

  if (loading) {
    return <PageLoader />;
  }

  if (user) {
    const redirectTarget = getSafeRedirect(searchParams.get('redirect'));
    return <Navigate to={redirectTarget} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="product/:slug" element={<ProductDetailPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="wishlist" element={<WishlistPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="terms" element={<TermsPage />} />

        {/* Auth Routes */}
        <Route
          path="login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="otp-verify" element={<OtpVerifyPage />} />

        {/* Protected User Routes */}
        <Route
          path="checkout"
          element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="order-success"
          element={
            <ProtectedRoute>
              <OrderSuccessPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="order-failure"
          element={
            <ProtectedRoute>
              <OrderFailurePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders"
          element={
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="returns"
          element={
            <ProtectedRoute>
              <MyReturnsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="account"
          element={
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="products/new" element={<AdminProductForm />} />
        <Route path="products/:id/edit" element={<AdminProductForm />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="returns" element={<AdminReturns />} />
        <Route path="delivery-areas" element={<AdminDeliveryAreas />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="coupons" element={<AdminCoupons />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
  );
}
function AppTitle() {
  const { settings } = useSettings();

  useEffect(() => {
    const storeName = settings.store_name || "Azhar's Store";
    const documentTitle = settings.meta_title || `${storeName} - Online Shopping`;
    document.title = documentTitle;

    // Update meta description
    const metaDesc = document.querySelector("meta[name='description']");
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        settings.meta_description ||
          `${storeName} - Your trusted destination for quality products at unbeatable prices. Shop electronics, fashion, home & kitchen, and more.`
      );
    }

    // Update meta keywords
    const metaKeywords = document.querySelector("meta[name='keywords']");
    if (metaKeywords && settings.meta_keywords) {
      metaKeywords.setAttribute("content", settings.meta_keywords);
    }

    // Update meta author
    const metaAuthor = document.querySelector("meta[name='author']");
    if (metaAuthor) {
      metaAuthor.setAttribute("content", storeName);
    }

    // Update Open Graph tags
    const ogTitle = document.querySelector("meta[property='og:title']");
    if (ogTitle) {
      ogTitle.setAttribute("content", documentTitle);
    }

    const ogDesc = document.querySelector("meta[property='og:description']");
    if (ogDesc) {
      ogDesc.setAttribute(
        "content",
        settings.meta_description ||
          settings.store_tagline ||
          "Your trusted destination for quality products at unbeatable prices."
      );
    }

    if (settings.favicon_url) {
      let favicon = document.querySelector(
        "link[rel='icon']"
      ) as HTMLLinkElement | null;

      if (!favicon) {
        favicon = document.createElement("link");
        favicon.rel = "icon";
        document.head.appendChild(favicon);
      }

      favicon.href = settings.favicon_url;
    }
  }, [
    settings.store_name,
    settings.meta_title,
    settings.meta_description,
    settings.meta_keywords,
    settings.store_tagline,
    settings.favicon_url,
  ]);

  return null;
}

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <DeliveryProvider>
            <CartProvider>
              <WishlistProvider>
                <BrowserRouter>
                  <AppTitle />
                  <Suspense fallback={<PageLoader />}>
                    <AppRoutes />
                  </Suspense>

                  {/* Store-wide delivery check modal */}
                  <DeliveryCheckerModal />

                  <Toaster
                    position="top-right"
                    toastOptions={{
                      duration: 3000,
                      style: {
                        background: 'var(--toast-bg)',
                        color: 'var(--toast-color)',
                      },
                      className: 'dark:bg-gray-800 dark:text-white',
                    }}
                  />
                </BrowserRouter>
              </WishlistProvider>
            </CartProvider>
          </DeliveryProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;