import { Routes, Route } from 'react-router-dom';
import { Layout } from './layouts/Layout';
import { Dashboard } from './pages/Dashboard';
import { ChildList } from './pages/ChildList';
import { ChildForm } from './pages/ChildForm';
import { ChildDetail } from './pages/ChildDetail';
import { DocumentsWizard } from './pages/DocumentsWizard';
import { CertificateOfLiveBirth } from './pages/CertificateOfLiveBirth';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/children" element={<ChildList />} />
        <Route path="/children/new" element={<ChildForm />} />
        <Route path="/children/:id" element={<ChildDetail />} />
        <Route path="/children/:id/edit" element={<ChildForm />} />
        <Route path="/children/:id/documents" element={<DocumentsWizard />} />
        <Route path="/children/:id/certificate-of-live-birth" element={<CertificateOfLiveBirth />} />
      </Route>
    </Routes>
  );
}
