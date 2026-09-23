import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';

// Pages
import Login from './pages/Login';

// Admin
import AdminDashboard from './pages/admin/Dashboard';
import AdminHospitals from './pages/admin/Hospitals';
import AddHospital from './pages/admin/AddHospital';
import HospitalDetail from './pages/admin/HospitalDetail';

// Hospital
import HospitalDashboard from './pages/hospital/Dashboard';
import AddDonor from './pages/hospital/AddDonor';
import AddReceiver from './pages/hospital/AddReceiver';
import Donors from './pages/hospital/Donors';
import Receivers from './pages/hospital/Receivers';
import PatientDetail from './pages/hospital/PatientDetail';
import VerifiedPool from './pages/hospital/VerifiedPool';
import AllocationRequests from './pages/hospital/AllocationRequests';
import AllocationHistory from './pages/hospital/AllocationHistory';

// Coordinator
import CoordinatorDashboard from './pages/coordinator/Dashboard';
import EligibleDonors from './pages/coordinator/EligibleDonors';
import EligibleReceivers from './pages/coordinator/EligibleReceivers';
import AvailableOrgans from './pages/coordinator/AvailableOrgans';
import OrganMatching from './pages/coordinator/OrganMatching';
import ActiveOffers from './pages/coordinator/ActiveOffers';
import ActiveAllocations from './pages/coordinator/ActiveAllocations';
import AllocationDetail from './pages/coordinator/AllocationDetail';
import RejectionHistory from './pages/coordinator/RejectionHistory';
import RejectionAnalytics from './pages/coordinator/RejectionAnalytics';
import MultiOrganMatching from './pages/coordinator/MultiOrganMatching';
import ResearchDataLake from './pages/coordinator/ResearchDataLake';
import CompletedAllocations from './pages/coordinator/CompletedAllocations';
import UnallocatedOrgans from './pages/coordinator/UnallocatedOrgans';

import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="hospitals" element={<AdminHospitals />} />
              <Route path="hospitals/add" element={<AddHospital />} />
              <Route path="hospitals/:id" element={<HospitalDetail />} />
            </Route>

            {/* Hospital Routes */}
            <Route path="/hospital" element={
              <ProtectedRoute allowedRoles={['HOSPITAL']}>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/hospital/dashboard" replace />} />
              <Route path="dashboard" element={<HospitalDashboard />} />
              <Route path="add-donor" element={<AddDonor />} />
              <Route path="add-receiver" element={<AddReceiver />} />
              <Route path="donors" element={<Donors />} />
              <Route path="receivers" element={<Receivers />} />
              <Route path="patients/:id" element={<PatientDetail />} />
              <Route path="verified-pool" element={<VerifiedPool />} />
              <Route path="allocation-requests" element={<AllocationRequests />} />
              <Route path="allocation-history" element={<AllocationHistory />} />
            </Route>

            {/* Coordinator Routes */}
            <Route path="/coordinator" element={
              <ProtectedRoute allowedRoles={['COORDINATOR']}>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/coordinator/dashboard" replace />} />
              <Route path="dashboard" element={<CoordinatorDashboard />} />
              <Route path="donors" element={<EligibleDonors />} />
              <Route path="receivers" element={<EligibleReceivers />} />
              <Route path="organs" element={<AvailableOrgans />} />
              <Route path="matching" element={<OrganMatching />} />
              <Route path="multi-organ" element={<MultiOrganMatching />} />
              <Route path="offers" element={<ActiveOffers />} />
              <Route path="allocations" element={<ActiveAllocations />} />
              <Route path="allocations/:id" element={<AllocationDetail />} />
              <Route path="rejections" element={<RejectionHistory />} />
              <Route path="analytics/rejections" element={<RejectionAnalytics />} />
              <Route path="completed" element={<CompletedAllocations />} />
              <Route path="research-dataset" element={<ResearchDataLake />} />
              <Route path="unallocated" element={<UnallocatedOrgans />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
