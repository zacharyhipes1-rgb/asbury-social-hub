import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UsersProvider } from './context/UsersContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PostsProvider } from './context/PostsContext'
import { ToastProvider } from './context/ToastContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import UploadPage from './pages/UploadPage'
import CalendarPage from './pages/CalendarPage'
import AdminPage from './pages/AdminPage'
import UsersPage from './pages/UsersPage'
import SettingsPage from './pages/SettingsPage'

function ProtectedRoute({ children, adminOnly = false }) {
  const { currentUser, isAdmin, authLoaded } = useAuth()
  if (!authLoaded) return null
  if (!currentUser) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout><DashboardPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <Layout><UploadPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <Layout><CalendarPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <Layout><AdminPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute adminOnly>
            <Layout><UsersPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute adminOnly>
            <Layout><SettingsPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <UsersProvider>
        <AuthProvider>
          <PostsProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </PostsProvider>
        </AuthProvider>
      </UsersProvider>
    </BrowserRouter>
  )
}
