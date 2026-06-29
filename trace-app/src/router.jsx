import { useState, useEffect } from 'react';
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
import { WitnessAffidavit } from './pages/utils/WitnessAffidavit';
import { WitnessPrint } from './pages/utils/WitnessPrint';
import { OutOfTownAffidavit } from './pages/utils/OutOfTownAffidavit';
import { OutOfTownPrint } from './pages/utils/OutOfTownPrint';
import { PrintCertificate } from './pages/utils/PrintCertificate';
import { AusfPrint } from './pages/utils/AusfPrint';
import { MuslimAttachment } from './pages/utils/MuslimAttachment';
import { MuslimAttachmentPrint } from './pages/utils/MuslimAttachmentPrint';
import { AUSF_06_PRINT_TYPE } from './pages/utils/ausf1';
import { AUSF_0717_PRINT_TYPE } from './pages/utils/ausf2';
import { AUSF_ONLY_PRINT_TYPE } from './pages/utils/ausf3';
import { Login } from './pages/Login';
import { Setup } from './pages/Setup';
import { authApi } from './services/api';

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireSetup({ children }) {
  const [hasUsers, setHasUsers] = useState(null);

  useEffect(() => {
    let cancelled = false;
    authApi
      .hasUsers()
      .then((data) => {
        if (!cancelled) setHasUsers(data.hasUsers);
      })
      .catch(() => {
        if (!cancelled) setHasUsers(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (hasUsers === null) {
    return null;
  }

  if (!hasUsers) {
    return <Navigate to="/setup" replace />;
  }

  return children;
}

export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/setup" element={<Setup />} />
      <Route
        path="/login"
        element={
          <RequireSetup>
            <Login />
          </RequireSetup>
        }
      />
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
        <Route path="/children/:id/witness-affidavit" element={<WitnessAffidavit />} />
        <Route path="/children/:id/witness-affidavit/print" element={<WitnessPrint />} />
        <Route path="/children/:id/out-of-town-affidavit" element={<OutOfTownAffidavit />} />
        <Route path="/children/:id/out-of-town-affidavit/print" element={<OutOfTownPrint />} />
        <Route path="/children/:id/print-certificate" element={<PrintCertificate />} />
        <Route path="/children/:id/ausf-0-6" element={<AusfPrint variant={AUSF_06_PRINT_TYPE} />} />
        <Route path="/children/:id/ausf-07-17" element={<AusfPrint variant={AUSF_0717_PRINT_TYPE} />} />
        <Route path="/children/:id/ausf-only" element={<AusfPrint variant={AUSF_ONLY_PRINT_TYPE} />} />
        <Route path="/children/:id/muslim-attachment" element={<MuslimAttachment />} />
        <Route path="/children/:id/muslim-attachment/print" element={<MuslimAttachmentPrint />} />
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
        <Route path="/colb-brap/:id/witness-affidavit" element={<WitnessAffidavit />} />
        <Route path="/colb-brap/:id/witness-affidavit/print" element={<WitnessPrint />} />
        <Route path="/colb-brap/:id/out-of-town-affidavit" element={<OutOfTownAffidavit />} />
        <Route path="/colb-brap/:id/out-of-town-affidavit/print" element={<OutOfTownPrint />} />
        <Route path="/colb-brap/:id/print-certificate" element={<PrintCertificate />} />
        <Route path="/colb-brap/:id/ausf-0-6" element={<AusfPrint variant={AUSF_06_PRINT_TYPE} />} />
        <Route path="/colb-brap/:id/ausf-07-17" element={<AusfPrint variant={AUSF_0717_PRINT_TYPE} />} />
        <Route path="/colb-brap/:id/ausf-only" element={<AusfPrint variant={AUSF_ONLY_PRINT_TYPE} />} />
        <Route path="/colb-brap/:id/muslim-attachment" element={<MuslimAttachment />} />
        <Route path="/colb-brap/:id/muslim-attachment/print" element={<MuslimAttachmentPrint />} />
      </Route>
    </>
  )
);
