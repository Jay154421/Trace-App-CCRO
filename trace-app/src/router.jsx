import {
  Navigate,
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { Layout } from './layouts/Layout';
import { Dashboard } from './pages/Dashboard';
import { ChildList } from './pages/ChildList';
import { ChildForm } from './pages/ChildForm';
import { ChildDetail } from './pages/ChildDetail';
import { DocumentsWizard } from './pages/DocumentsWizard';
import { CertificateOfLiveBirth } from './pages/CertificateOfLiveBirth';
import { FieldPosition } from './pages/FieldPosition';
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
      </Route>
    </>
  )
);
