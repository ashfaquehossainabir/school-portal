import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';

import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminClasses from './pages/admin/Classes';
import AdminAttendance from './pages/admin/Attendance';
import AdminExams from './pages/admin/Exams';
import AdminRoutine from './pages/admin/Routine';
import AdminNotes from './pages/admin/Notes';
import AdminNotices from './pages/admin/Notices';

import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherAttendance from './pages/teacher/TakeAttendancePage';
import TeacherExams from './pages/teacher/Exams';
import TeacherRoutine from './pages/teacher/Routine';
import TeacherNotes from './pages/teacher/Notes';
import TeacherNotices from './pages/teacher/Notices';

import StudentDashboard from './pages/student/Dashboard';
import StudentAttendance from './pages/student/Attendance';
import StudentExams from './pages/student/Exams';
import StudentRoutine from './pages/student/Routine';
import StudentNotes from './pages/student/Notes';
import StudentNotices from './pages/student/Notices';

import ParentDashboard from './pages/parent/Dashboard';
import ParentAttendance from './pages/parent/Attendance';
import ParentExams from './pages/parent/Exams';
import ParentRoutine from './pages/parent/Routine';
import ParentNotes from './pages/parent/Notes';
import ParentNotices from './pages/parent/Notices';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}`} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />

            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="classes" element={<AdminClasses />} />
              <Route path="attendance" element={<AdminAttendance />} />
              <Route path="exams" element={<AdminExams />} />
              <Route path="routine" element={<AdminRoutine />} />
              <Route path="notes" element={<AdminNotes />} />
              <Route path="notices" element={<AdminNotices />} />
            </Route>

            <Route
              path="/teacher"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<TeacherDashboard />} />
              <Route path="attendance" element={<TeacherAttendance />} />
              <Route path="exams" element={<TeacherExams />} />
              <Route path="routine" element={<TeacherRoutine />} />
              <Route path="notes" element={<TeacherNotes />} />
              <Route path="notices" element={<TeacherNotices />} />
            </Route>

            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<StudentDashboard />} />
              <Route path="attendance" element={<StudentAttendance />} />
              <Route path="exams" element={<StudentExams />} />
              <Route path="routine" element={<StudentRoutine />} />
              <Route path="notes" element={<StudentNotes />} />
              <Route path="notices" element={<StudentNotices />} />
            </Route>

            <Route
              path="/parent"
              element={
                <ProtectedRoute allowedRoles={['parent']}>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ParentDashboard />} />
              <Route path="attendance" element={<ParentAttendance />} />
              <Route path="exams" element={<ParentExams />} />
              <Route path="routine" element={<ParentRoutine />} />
              <Route path="notes" element={<ParentNotes />} />
              <Route path="notices" element={<ParentNotices />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
