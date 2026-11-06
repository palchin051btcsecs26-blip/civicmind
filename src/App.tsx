import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Landing } from './pages/Landing'
import { About } from './pages/About'
import { Welcome } from './pages/Welcome'
import { CitizenOverview } from './pages/citizen/CitizenOverview'
import { SubmitComplaint } from './pages/citizen/SubmitComplaint'
import { CitizenReports } from './pages/citizen/CitizenReports'
import { NearbyIssues } from './pages/citizen/NearbyIssues'
import { CitizenNotifications } from './pages/citizen/CitizenNotifications'
import { AuthorityOverview } from './pages/authority/AuthorityOverview'
import { AuthorityIncidents } from './pages/authority/AuthorityIncidents'
import { AuthorityPriority } from './pages/authority/AuthorityPriority'
import { AuthorityDepartments } from './pages/authority/AuthorityDepartments'
import { IncidentDetail } from './pages/authority/IncidentDetail'
import { Intelligence } from './pages/intelligence/Intelligence'
import { AuthLoading, AuthProvider, RequireRole, useAuth } from './lib/auth'
import type { Role } from './lib/types'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

const CITIZEN_ONLY: Role[] = ['citizen']
const ADMIN_ONLY: Role[] = ['admin']
const ALL_SIGNED_IN: Role[] = ['citizen', 'admin', 'guest']

function RootHome() {
  const { user, loading } = useAuth()
  if (loading) return <AuthLoading />
  if (!user) return <Navigate to="/welcome" replace />
  return <Landing />
}

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div id="main">
        <Routes>
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<Navigate to="/welcome" replace />} />
          <Route path="/" element={<RootHome />} />
          <Route path="/about" element={<About />} />

          <Route
            path="/citizen"
            element={
              <RequireRole roles={CITIZEN_ONLY}>
                <CitizenOverview />
              </RequireRole>
            }
          />
          <Route
            path="/citizen/report"
            element={
              <RequireRole roles={CITIZEN_ONLY}>
                <SubmitComplaint />
              </RequireRole>
            }
          />
          <Route
            path="/citizen/reports"
            element={
              <RequireRole roles={CITIZEN_ONLY}>
                <CitizenReports />
              </RequireRole>
            }
          />
          <Route
            path="/citizen/nearby"
            element={
              <RequireRole roles={CITIZEN_ONLY}>
                <NearbyIssues />
              </RequireRole>
            }
          />
          <Route
            path="/citizen/notifications"
            element={
              <RequireRole roles={CITIZEN_ONLY}>
                <CitizenNotifications />
              </RequireRole>
            }
          />

          <Route
            path="/authority"
            element={
              <RequireRole roles={ADMIN_ONLY}>
                <AuthorityOverview />
              </RequireRole>
            }
          />
          <Route
            path="/authority/incidents"
            element={
              <RequireRole roles={ADMIN_ONLY}>
                <AuthorityIncidents />
              </RequireRole>
            }
          />
          <Route
            path="/authority/incidents/:ref"
            element={
              <RequireRole roles={ADMIN_ONLY}>
                <IncidentDetail />
              </RequireRole>
            }
          />
          <Route
            path="/authority/priority"
            element={
              <RequireRole roles={ADMIN_ONLY}>
                <AuthorityPriority />
              </RequireRole>
            }
          />
          <Route
            path="/authority/departments"
            element={
              <RequireRole roles={ADMIN_ONLY}>
                <AuthorityDepartments />
              </RequireRole>
            }
          />

          <Route
            path="/intelligence"
            element={
              <RequireRole roles={ALL_SIGNED_IN}>
                <Intelligence />
              </RequireRole>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
