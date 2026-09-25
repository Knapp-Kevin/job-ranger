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
import { Resume } from "./pages/Resume";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastContainer } from "./components/ToastContainer";
import { useAppContext } from "./context/AppContext";

function AppRoutes() {
  const { toasts, removeToast } = useAppContext();

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
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
