
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AdopterDashboard from './pages/AdopterDashboard';
import StaffDashboard from './pages/StaffDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { UserRole } from './types/auth';

const Navigation = () => {
  const { currentUser, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
            🐾
          </div>
          <span className="text-lg font-semibold tracking-tight text-gray-900">ACAMS</span>
        </div>
        <div>
          {currentUser ? (
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                <span className="font-medium text-gray-900">{currentUser.U_NAME}</span>
                <span className="ml-2 bg-gray-100 text-gray-700 text-xs rounded-full px-2 py-0.5">
                  {currentUser.U_ROLE}
                </span>
              </span>
              <button
                onClick={logout}
                className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                Login
              </Link>
              <Link to="/signup" className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

const AppContent = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Public signup route */}
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected Routes for Adopters */}
        <Route element={<ProtectedRoute allowedRoles={[UserRole.Adopter]} />}>
          <Route path="/adopter" element={<AdopterDashboard />} />
        </Route>

        {/* Protected Routes for Staff */}
        <Route element={<ProtectedRoute allowedRoles={[UserRole.Staff]} />}>
          <Route path="/staff" element={<StaffDashboard />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
