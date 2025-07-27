import React, { useState, useEffect } from 'react';
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Home from './pages/home/Home';
import Navbar from './Components/navbar/Navbar';
import Register from './pages/Auth/Register';
import Login from './pages/Auth/Login';
import Main from './pages/main/Main';
import Shop from './pages/shop/Shop';
import AdminShops from './pages/vendors/AdminShops';
import VendorItems from './pages/vendors/VendorItems';
import Cart from './pages/cart/Cart';
import VendorOrders from './pages/vendors/VendorOrders';
import UserOrders from './pages/orders/UserOrders';
import { getCurrentUser } from './Components/firebase/Firebase';
import OrderWaitingPage from './pages/utils/WaitingPage';
import Footer from './Components/footer/Footer';
import OrderPickupConfirmation from './Components/order/OrderConfirmation';
import UserProfile from './pages/user/UserProfile';
import VendorDashboard from './pages/vendors/workflow';
import ScrollToTop from './pages/utils/ScrollToTop';
import AboutUs from './pages/utils/AboutUs';
import HowItWorks from './pages/utils/HowItWorks';
import ContactUs from './pages/utils/ContactUs';
import HelpCenter from './pages/utils/HelpCenter';
import PrivacyPolicy from './pages/utils/PrivacyPolicy';
import TermsAndConditions from './pages/utils/TermsAndConditions';
import LoadingScreen from './pages/utils/loading';
import CancellationPolicy from './pages/utils/Refund';
import PaymentSuccess from './pages/utils/PaymentSuccess';
import Reset from './pages/Auth/Reset';
import VendorCounterOrder from './pages/vendors/VendorCounterOrder';
import AddCouponForm from './pages/utils/AddCoupon';
import ProcessingOrders from './pages/vendors/ProcessingVendor';
import PendingOrders from './pages/vendors/PendingVendor';
import OrderScanningPage from './pages/vendors/CompletedVendor';
import VendorLayout from './layouts/VendorLayout';
import AnalyticsDashboard from './pages/vendors/AnalyticsVendor';
import AdvancedAnalytics from './pages/vendors/AdvancedAnalytic';
import OrderHistory from './pages/vendors/HistoryVendors';

import InventoryManagement from './pages/vendors/InventoryManagement';
import AccountDeletionPage from './pages/utils/AccountDeletion';
import TransactionError from './pages/utils/TransactionErrorPage';


import GroceryPage from './pages/groceriesPage/GroceriesPage';
import GroceryDashboard from './pages/groceriesPage/DashBoardGroceries';
import OrderProcessPage from './pages/groceriesPage/orderProcessingPage';

import LevelProgression from './Components/Level/LevelProgression';
import Leaderboard from './pages/user/LeaderBoard';
import UPICheckout from './pages/cart/UPIcheckout';



 // Add this import

const ProtectedRoute = ({ children, requiredRole }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Add VendorWelcomeCheck component




function App() {
  return (
   
    
    <ChakraProvider>
      <BrowserRouter basename={process.env.PUBLIC_URL}>
        <ScrollToTop />
        <LoadingScreen>
          <Navbar />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<Reset />} />
            <Route path="/order-waiting/:orderid" element={<OrderWaitingPage />} />
            <Route path="/order-confirmation" element={<OrderPickupConfirmation />} />
            <Route path="/Profile" element={<UserProfile />} />
            <Route path="/AboutUs" element={<AboutUs />} />
            <Route path="/HowItWorks" element={<HowItWorks />} />
            <Route path="/Contactus" element={<ContactUs />} />
            <Route path="/helpcenter" element={<HelpCenter />} />
            <Route path="/privacypolicy" element={<PrivacyPolicy />} />
            <Route path="/termsandconditions" element={<TermsAndConditions />} />
            <Route path="/refund" element={<CancellationPolicy />} />
            <Route path="/payment-success/:shopId" element={<PaymentSuccess />} />
            <Route path="/counter" element={<VendorCounterOrder />} />
            <Route path="/addcoupon" element={<AddCouponForm />} />
            <Route path="/deleteAccount" element={<AccountDeletionPage />} />
            <Route path="/Groceriesbyfost" element={<GroceryPage />} />
            <Route path="/LeaderBoard" element={<Leaderboard />} />
            <Route path="/Error" element={<TransactionError />} />
            <Route path="/levels" element={<LevelProgression />} />


            {/* Protected User Routes */}
            <Route path="/main" element={<ProtectedRoute><Main /></ProtectedRoute>} />
            <Route path="/shop/:shopId" element={<ProtectedRoute><Shop /></ProtectedRoute>} />
            <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><UserOrders /></ProtectedRoute>} />
            <Route path="/checkout" element={<UPICheckout />} />

            {/* Admin Routes */}
            <Route path="/admin/shops" element={
              <ProtectedRoute requiredRole="admin">
                <AdminShops />
              </ProtectedRoute>
            } />
            <Route path="/admin/Groceriesbyfostdash" element={
              <ProtectedRoute requiredRole="admin">
                <GroceryDashboard />
              </ProtectedRoute>} />
            
            <Route path="/admin/Groceriesbyfostdashdash" element={
              <ProtectedRoute requiredRole="admin">
                <OrderProcessPage />
              </ProtectedRoute>} />

            {/* Vendor Routes */}
            <Route path="/vendor" element={
              <ProtectedRoute requiredRole="vendor">
                
                  <VendorLayout />
                
              </ProtectedRoute>
            }>
              <Route path="MobileScanner" element={<VendorDashboard />} />
              <Route path="items" element={<VendorItems />} />
              <Route path="orders" element={<VendorOrders />} />
              <Route path="ProcessingVendors" element={<ProcessingOrders />} />
              <Route path="PendingVendors" element={<PendingOrders />} />
              <Route path="CompletedVendor" element={<OrderScanningPage />} />
              <Route path="AnalyticVendor" element={<AnalyticsDashboard/>} />
              <Route path="AdvancedAnalytics" element={<AdvancedAnalytics/>} />
              <Route path="HistoryVendor" element={<OrderHistory/>} />
              <Route path="InventoryManagement" element={<InventoryManagement/>} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </LoadingScreen>
        <Footer />
      </BrowserRouter>
    </ChakraProvider>
   

  );
}

export default App;