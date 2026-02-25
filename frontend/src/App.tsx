import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import PaperCreate from "./pages/PaperCreate";
import PaperAttempt from "./pages/PaperAttempt";
import Mental from "./pages/Mental";
import NotFound from "./pages/NotFound";
import Login from "./components/Login";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import StudentProfile from "./pages/StudentProfile";
import AdminAttendance from "./pages/AdminAttendance";
import AdminFeeManagement from "./pages/AdminFeeManagement";
import AdminUnifiedManagement from "./pages/AdminUnifiedManagement";
import AdminStudentIDManagement from "./pages/AdminStudentIDManagement";
import AbacusCourse from "./pages/AbacusCourse";
import VedicMathsCourse from "./pages/VedicMathsCourse";
import HandwritingCourse from "./pages/HandwritingCourse";
import STEMCourse from "./pages/STEMCourse";
import { ReactNode } from "react";
import { useScrollRestoration } from "./hooks/useScrollRestoration";
import { SpeedInsights } from "@vercel/speed-insights/react";


const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();
  
  console.log("🟡 [PROTECTED] Route check - loading:", loading, "authenticated:", isAuthenticated, "user:", user?.email);
  
  if (loading) {
    console.log("🟡 [PROTECTED] Still loading, showing loading screen");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-xl text-slate-900 dark:text-slate-100">Loading...</div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    console.log("🟡 [PROTECTED] Not authenticated, showing login");
    return <Login />;
  }
  
  console.log("✅ [PROTECTED] Authenticated, showing protected content");
  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, isAdmin, user } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-xl text-slate-900 dark:text-slate-100">Loading...</div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Login />;
  }
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Access Denied</div>
          <div className="text-slate-600 dark:text-slate-300 mb-4">You do not have permission to access this page.</div>
          <a href="/dashboard" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}

function AppContent() {
  // Handle scroll restoration based on page type
  useScrollRestoration();

  return (
    <ErrorBoundary>
      <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300">
        <Header />
        <main className="flex-grow">
          <ErrorBoundary>
            <Switch>
              <Route path="/login" component={Login} />
              <Route path="/" component={Home} />
              <Route path="/create/junior" component={PaperCreate} />
              <Route path="/create/basic" component={PaperCreate} />
              <Route path="/create/advanced" component={PaperCreate} />
              <Route path="/create" component={PaperCreate} />
              <Route path="/vedic-maths/level-1" component={PaperCreate} />
              <Route path="/vedic-maths/level-2" component={PaperCreate} />
              <Route path="/vedic-maths/level-3" component={PaperCreate} />
              <Route path="/vedic-maths/level-4" component={PaperCreate} />
              <Route path="/mental">
                <ProtectedRoute>
                  <Mental />
                </ProtectedRoute>
              </Route>
              <Route path="/paper/attempt">
                <ProtectedRoute>
                  <ErrorBoundary>
                    <PaperAttempt />
                  </ErrorBoundary>
                </ProtectedRoute>
              </Route>
              <Route path="/dashboard">
                <ProtectedRoute>
                  <StudentDashboard />
                </ProtectedRoute>
              </Route>
              <Route path="/profile">
                <ProtectedRoute>
                  <StudentProfile />
                </ProtectedRoute>
              </Route>
              <Route path="/admin">
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              </Route>
              <Route path="/admin/attendance">
                <AdminRoute>
                  <AdminAttendance />
                </AdminRoute>
              </Route>
              <Route path="/admin/fees">
                <AdminRoute>
                  <AdminFeeManagement />
                </AdminRoute>
              </Route>
              <Route path="/admin/unified">
                <AdminRoute>
                  <AdminUnifiedManagement />
                </AdminRoute>
              </Route>
              <Route path="/admin/student-ids">
                <AdminRoute>
                  <AdminStudentIDManagement />
                </AdminRoute>
              </Route>
              <Route path="/courses/abacus" component={AbacusCourse} />
              <Route path="/courses/vedic-maths" component={VedicMathsCourse} />
              <Route path="/courses/handwriting" component={HandwritingCourse} />
              <Route path="/courses/stem" component={STEMCourse} />
              <Route component={NotFound} />
            </Switch>
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
          <SpeedInsights />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

