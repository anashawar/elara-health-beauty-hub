import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import Index from "./pages/Index";
import CollectionPage from "./pages/CollectionPage";
import CategoryPage from "./pages/CategoryPage";
import CategoriesPage from "./pages/CategoriesPage";
import ProductPage from "./pages/ProductPage";
import CartPage from "./pages/CartPage";
import WishlistPage from "./pages/WishlistPage";
import CheckoutPage from "./pages/CheckoutPage";
import ProfilePage from "./pages/ProfilePage";
import AuthPage from "./pages/AuthPage";
import OrdersPage from "./pages/OrdersPage";
import AddressesPage from "./pages/AddressesPage";
import SettingsPage from "./pages/SettingsPage";
import BrandPage from "./pages/BrandPage";
import NotFound from "./pages/NotFound";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import InstallPage from "./pages/InstallPage";
import ElaraChatPage from "./pages/ElaraChatPage";
import AboutPage from "./pages/AboutPage";
import FAQPage from "./pages/FAQPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import AuthGuard from "./components/AuthGuard";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminBanners from "./pages/admin/AdminBanners";
import AdminBrands from "./pages/admin/AdminBrands";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminRevenue from "./pages/admin/AdminRevenue";
import AdminOffers from "./pages/admin/AdminOffers";
import AdminNotifications from "./pages/admin/AdminNotifications";

const queryClient = new QueryClient();

const SwipeBackWrapper = ({ children }: { children: React.ReactNode }) => {
  useSwipeBack();
  return <>{children}</>;
};

const PushInit = () => {
  usePushNotifications();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <AppProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PushInit />
            <SwipeBackWrapper>
            <Routes>
              <Route path="/" element={<AuthPage />} />
              <Route path="/home" element={<Index />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/shop" element={<CategoryPage />} />
              <Route path="/category/:id" element={<CategoryPage />} />
              <Route path="/collection/:type" element={<CollectionPage />} />
              <Route path="/concern/:id" element={<CategoryPage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/brand/:id" element={<BrandPage />} />
              <Route path="/cart" element={<AuthGuard><CartPage /></AuthGuard>} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/checkout" element={<AuthGuard><CheckoutPage /></AuthGuard>} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/addresses" element={<AddressesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/install" element={<InstallPage />} />
              <Route path="/elara-ai" element={<AuthGuard><ElaraChatPage /></AuthGuard>} />
              {/* Admin Panel */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="revenue" element={<AdminRevenue />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="banners" element={<AdminBanners />} />
                <Route path="brands" element={<AdminBrands />} />
                <Route path="coupons" element={<AdminCoupons />} />
                <Route path="offers" element={<AdminOffers />} />
                <Route path="notifications" element={<AdminNotifications />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </SwipeBackWrapper>
          </BrowserRouter>
        </AppProvider>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
