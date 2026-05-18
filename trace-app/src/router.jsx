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
import { AusfPrint } from './pages/utils/AusfPrint';
import { AUSF_06_PRINT_TYPE } from './pages/utils/ausf1';
import { AUSF_0717_PRINT_TYPE } from './pages/utils/ausf2';
import { AUSF_ONLY_PRINT_TYPE } from './pages/utils/ausf3';
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
        <Route path="/children/:id/ausf-0-6" element={<AusfPrint variant={AUSF_06_PRINT_TYPE} />} />
        <Route path="/children/:id/ausf-07-17" element={<AusfPrint variant={AUSF_0717_PRINT_TYPE} />} />
        <Route path="/children/:id/ausf-only" element={<AusfPrint variant={AUSF_ONLY_PRINT_TYPE} />} />
        <Route path="/colb-brap" element={<ChildList />} />
        <Route path="/colb-brap/new" element={<ChildForm />} />
        <Route path="/colb-brap/:id" element={<ChildDetail />} />
        <Route path="/colb-brap/:id/edit" element={<ChildForm />} />
        <Route path="/colb-brap/:id/documents" element={<DocumentsWizard />} />
        <Route path="/colb-brap/:id/certificate-of-live-birth" element={<CertificateOfLiveBirth />} />
        <Route path="/colb-brap/:id/field-position" element={<FieldPosition />} />
        <Route path="/colb-brap/:id/field-position-back" element={<FieldPositionBack />} />
        <Route path="/colb-brap/:id/paternity-affidavit" element={<PaternityAffidavit />} />
        <Route path="/colb-brap/:id/delayed-registration-affidavit" element={<DelayedRegistrationAffidavit />} />
        <Route path="/colb-brap/:id/print-certificate" element={<PrintCertificate />} />
        <Route path="/colb-brap/:id/ausf-0-6" element={<AusfPrint variant={AUSF_06_PRINT_TYPE} />} />
        <Route path="/colb-brap/:id/ausf-07-17" element={<AusfPrint variant={AUSF_0717_PRINT_TYPE} />} />
        <Route path="/colb-brap/:id/ausf-only" element={<AusfPrint variant={AUSF_ONLY_PRINT_TYPE} />} />
      </Route>
    </>
  )
);
