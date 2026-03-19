import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import AuthGuard from "./components/AuthGuard";

// Eagerly loaded — critical path
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import ResponsiveHome from "./components/ResponsiveHome";

// Lazy loaded — secondary pages
const CollectionPage = lazy(() => import("./pages/CollectionPage"));
const ShopPage = lazy(() => import("./pages/ShopPage"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const WishlistPage = lazy(() => import("./pages/WishlistPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const ModifyOrderPage = lazy(() => import("./pages/ModifyOrderPage"));
const AddressesPage = lazy(() => import("./pages/AddressesPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const BrandPage = lazy(() => import("./pages/BrandPage"));
const AllBrandsPage = lazy(() => import("./pages/AllBrandsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const InstallPage = lazy(() => import("./pages/InstallPage"));
const ElaraChatPage = lazy(() => import("./pages/ElaraChatPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const RewardsPage = lazy(() => import("./pages/RewardsPage"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const SkinScanPage = lazy(() => import("./pages/SkinScanPage"));
const SkinScanHistoryPage = lazy(() => import("./pages/SkinScanHistoryPage"));
const PrepOrdersPage = lazy(() => import("./pages/PrepOrdersPage"));
const WarehouseSystemPage = lazy(() => import("./pages/WarehouseSystemPage"));

// Admin — always lazy
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminBanners = lazy(() => import("./pages/admin/AdminBanners"));
const AdminBrands = lazy(() => import("./pages/admin/AdminBrands"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminRevenue = lazy(() => import("./pages/admin/AdminRevenue"));
const AdminOffers = lazy(() => import("./pages/admin/AdminOffers"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminTranslate = lazy(() => import("./pages/admin/AdminTranslate"));
const AdminImageSearch = lazy(() => import("./pages/admin/AdminImageSearch"));
const AdminSupport = lazy(() => import("./pages/admin/AdminSupport"));
const AdminTeam = lazy(() => import("./pages/admin/AdminTeam"));
const AdminWarehouseCosts = lazy(() => import("./pages/admin/AdminWarehouseCosts"));
const AdminWarehouses = lazy(() => import("./pages/admin/AdminWarehouses"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes — data stays fresh, no refetch
      gcTime: 1000 * 60 * 30,   // 30 minutes — cache persists in memory
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const SwipeBackWrapper = ({ children }: { children: React.ReactNode }) => {
  useSwipeBack();
  return <>{children}</>;
};

const PushInit = () => {
  usePushNotifications();
  return null;
};

// Minimal loading fallback — keeps the screen from flashing
const PageFallback = (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <AppProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PushInit />
            <SwipeBackWrapper>
            <Suspense fallback={PageFallback}>
            <Routes>
              <Route path="/" element={<ResponsiveHome />} />
              <Route path="/home" element={<Index />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/category/:id" element={<CategoryPage />} />
              <Route path="/collection/:type" element={<CollectionPage />} />
              <Route path="/concern/:id" element={<CategoryPage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/brands" element={<AllBrandsPage />} />
              <Route path="/brand/:id" element={<BrandPage />} />
              <Route path="/cart" element={<AuthGuard><CartPage /></AuthGuard>} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/checkout" element={<AuthGuard><CheckoutPage /></AuthGuard>} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:id/modify" element={<AuthGuard><ModifyOrderPage /></AuthGuard>} />
              <Route path="/addresses" element={<AddressesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/install" element={<InstallPage />} />
              <Route path="/elara-ai" element={<AuthGuard><ElaraChatPage /></AuthGuard>} />
              <Route path="/rewards" element={<AuthGuard><RewardsPage /></AuthGuard>} />
              <Route path="/support" element={<AuthGuard><SupportPage /></AuthGuard>} />
              <Route path="/skin-scan" element={<AuthGuard><SkinScanPage /></AuthGuard>} />
              <Route path="/skin-scan/history" element={<AuthGuard><SkinScanHistoryPage /></AuthGuard>} />
              <Route path="/warehouse" element={<PrepOrdersPage />} />
              <Route path="/warehouse-system" element={<WarehouseSystemPage />} />
              <Route path="/prep/login" element={<PrepOrdersPage />} />
              <Route path="/prep/:token" element={<PrepOrdersPage />} />
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
                <Route path="translate" element={<AdminTranslate />} />
                <Route path="images" element={<AdminImageSearch />} />
                <Route path="support" element={<AdminSupport />} />
                <Route path="team" element={<AdminTeam />} />
                <Route path="warehouse-costs" element={<AdminWarehouseCosts />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            </SwipeBackWrapper>
          </BrowserRouter>
        </AppProvider>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
