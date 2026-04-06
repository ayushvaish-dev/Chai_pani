import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AuthPage from './components/AuthPage'
import DashboardPage from './components/DashboardPage'
import LandingPage from './components/LandingPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/forgot-password" element={<AuthPage mode="forgot-password" />} />
        <Route path="/reset-password" element={<AuthPage mode="reset-password" />} />
        <Route path="/vendor-dashboard" element={<DashboardPage requiredRole="vendor" />} />
        <Route path="/employee-dashboard" element={<DashboardPage requiredRole="employee" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
