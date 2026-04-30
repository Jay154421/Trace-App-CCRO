import {
  Navigate,
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { Layout } from './layouts/Layout';
import { Dashboard } from './pages/Dashboard';
import { ChildList } from './pages/Applicant/ChildList';
import { ChildForm } from './pages/Applicant/ChildForm';
import { ChildDetail } from './pages/Applicant/ChildDetail';
import { DocumentsWizard } from './pages/Applicant/DocumentsWizard';
import { CertificateOfLiveBirth } from './pages/utils/CertificateOfLiveBirth';
import { FieldPosition } from './pages/utils/FieldPosition';
import { FieldPositionBack } from './pages/utils/FieldPositionBack';
import { PaternityAffidavit } from './pages/utils/PaternityAffidavit';
import { DelayedRegistrationAffidavit } from './pages/utils/DelayedRegistrationAffidavit';
import { PrintCertificate } from './pages/utils/PrintCertificate';
import { Login } from './pages/Login';

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/children" element={<ChildList />} />
        <Route path="/children/new" element={<ChildForm />} />
        <Route path="/children/:id" element={<ChildDetail />} />
        <Route path="/children/:id/edit" element={<ChildForm />} />
        <Route path="/children/:id/documents" element={<DocumentsWizard />} />
        <Route path="/children/:id/certificate-of-live-birth" element={<CertificateOfLiveBirth />} />
        <Route path="/children/:id/field-position" element={<FieldPosition />} />
        <Route path="/children/:id/field-position-back" element={<FieldPositionBack />} />
        <Route path="/children/:id/paternity-affidavit" element={<PaternityAffidavit />} />
        <Route path="/children/:id/delayed-registration-affidavit" element={<DelayedRegistrationAffidavit />} />
        <Route path="/children/:id/print-certificate" element={<PrintCertificate />} />
      </Route>
    </>
  )
);
