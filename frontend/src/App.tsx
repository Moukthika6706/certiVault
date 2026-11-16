import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AdminLayout } from './layouts/AdminLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { CertificateDetailsPage } from './pages/CertificateDetailsPage';
import { CertificatesPage } from './pages/CertificatesPage';
import { DashboardPage } from './pages/DashboardPage';
import { IssueCertificatePage } from './pages/IssueCertificatePage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SystemPage } from './pages/SystemPage';
import { VerifyPage } from './pages/VerifyPage';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<LandingPage />} />
              <Route path="verify" element={<VerifyPage />} />
              <Route path="verify/:certificateId" element={<VerifyPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            <Route path="admin/login" element={<LoginPage />} />

            <Route path="admin" element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="issue" element={<IssueCertificatePage />} />
                <Route path="certificates" element={<CertificatesPage />} />
                <Route path="certificates/:certificateId" element={<CertificateDetailsPage />} />
                <Route path="system" element={<SystemPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
