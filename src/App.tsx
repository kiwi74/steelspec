import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectLayout from "./pages/ProjectLayout";
import ProjectOverview from "./pages/project/ProjectOverview";
import ProjectDocuments from "./pages/project/ProjectDocuments";
import ProjectAnalysis from "./pages/project/ProjectAnalysis";
import ProjectReview from "./pages/project/ProjectReview";
import ProjectFabrication from "./pages/project/ProjectFabrication";
import SettingsPage from "./pages/SettingsPage";
import AuthPage from "./pages/AuthPage";
import FAQPage from "./pages/FAQPage";
import ContactPage from "./pages/ContactPage";
import NotFoundPage from "./pages/NotFoundPage";

// Every route that existed before Wave 2 still resolves to exactly what it did
// before: /, /dashboard, /signup, /faq, /contact. The project routes are added
// alongside them.
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <ProjectsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <ProjectLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<ProjectOverview />} />
            <Route path="documents" element={<ProjectDocuments />} />
            <Route path="analysis" element={<ProjectAnalysis />} />
            <Route path="review" element={<ProjectReview />} />
            <Route path="fabrication" element={<ProjectFabrication />} />
          </Route>
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/signup" element={<AuthPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/contact" element={<ContactPage />} />
          {/* Last, and the only catch-all: React Router ranks a wildcard below
              every concrete path, so this cannot shadow a route above it. It
              catches what used to render a blank page — a mistyped top-level
              URL and an unmatched section under /projects/:id alike. */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
