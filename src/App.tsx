import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { ThemeProvider } from "./theme/ThemeProvider";
import { Dashboard } from "./pages/Dashboard";
import { Companies } from "./pages/Companies";
import { Jobs } from "./pages/Jobs";
import { Filters } from "./pages/Filters";
import { Settings } from "./pages/Settings";
import { Applications } from "./pages/Applications";
import { CareerProfile } from "./pages/CareerProfile";
import { EvidenceEntry } from "./pages/EvidenceEntry";
import { Resume } from "./pages/Resume";
import { Onboarding } from "./pages/Onboarding";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Layout } from "./components/Layout";
import { ToastContainer } from "./components/ToastContainer";
import { useAppContext } from "./context/AppContext";
import { useCareerProfile } from "./career/storage";
import { useOnboardingPreference } from "./career/onboarding";

function HomeRoute() {
  const { profile, save, configured, loading } = useCareerProfile();
  const { dismissed } = useOnboardingPreference();

  if (loading) {
    return (
      <Layout>
        <section className="panel panel-strong px-6 py-7 text-sm text-[var(--color-text-secondary)]">
          Loading your workspace...
        </section>
      </Layout>
    );
  }

  if (!configured && !dismissed) {
    return <Onboarding profile={profile} saveProfile={save} />;
  }

  return <Dashboard />;
}

function AppRoutes() {
  const { toasts, removeToast } = useAppContext();

  return (
    <>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/onboarding" element={<OnboardingRoute />} />
        <Route path="/career-evidence/new" element={<EvidenceEntry />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/career-profile" element={<CareerProfile />} />
        <Route path="/resume" element={<Resume />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/filters" element={<Filters />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </>
  );
}

function OnboardingRoute() {
  const { profile, save, loading } = useCareerProfile();

  if (loading) {
    return (
      <Layout>
        <section className="panel panel-strong px-6 py-7 text-sm text-[var(--color-text-secondary)]">
          Loading your setup...
        </section>
      </Layout>
    );
  }

  return <Onboarding profile={profile} saveProfile={save} />;
}

export function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <Router>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </Router>
      </AppProvider>
    </ThemeProvider>
  );
}
