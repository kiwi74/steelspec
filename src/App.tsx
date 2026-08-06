import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import AuthPage from "./pages/AuthPage";
import FAQPage from "./pages/FAQPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/signup" element={<AuthPage />} />
        <Route path="/faq" element={<FAQPage />} />
      </Routes>
    </BrowserRouter>
  );
}