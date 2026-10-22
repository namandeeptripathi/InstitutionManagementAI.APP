import { Routes } from '@angular/router';
import { studentGuard, facultyGuard, loginGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
    canActivate: [loginGuard],
    title: 'Authentication — CRHDRI.AI'
  },

  // ==========================================
  // FACULTY PORTAL ROUTES
  // ==========================================
  {
    path: 'faculty',
    redirectTo: 'faculty/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'faculty/dashboard',
    loadComponent: () => import('./features/faculty/dashboard/faculty-dashboard.component').then(m => m.FacultyDashboardComponent),
    canActivate: [facultyGuard],
    title: 'Faculty Dashboard — CRHDRI.AI'
  },
  {
    path: 'faculty/classes',
    loadComponent: () => import('./features/faculty/classes/faculty-classes.component').then(m => m.FacultyClassesComponent),
    canActivate: [facultyGuard],
    title: 'My Teaching Classes — CRHDRI.AI'
  },
  {
    path: 'faculty/classes/:facultyAssignmentId',
    loadComponent: () => import('./features/faculty/classes/faculty-class-roster.component').then(m => m.FacultyClassRosterComponent),
    canActivate: [facultyGuard],
    title: 'Class Student Roster — CRHDRI.AI'
  },
  {
    path: 'faculty/attendance',
    loadComponent: () => import('./features/faculty/attendance/faculty-attendance.component').then(m => m.FacultyAttendanceComponent),
    canActivate: [facultyGuard],
    title: 'Session Attendance Manager — CRHDRI.AI'
  },
  {
    path: 'faculty/attendance/:facultyAssignmentId',
    loadComponent: () => import('./features/faculty/attendance/faculty-attendance.component').then(m => m.FacultyAttendanceComponent),
    canActivate: [facultyGuard],
    title: 'Session Attendance Manager — CRHDRI.AI'
  },
  {
    path: 'faculty/assignments',
    loadComponent: () => import('./features/faculty/assignments/faculty-assignments.component').then(m => m.FacultyAssignmentsComponent),
    canActivate: [facultyGuard],
    title: 'Assignments & Grading — CRHDRI.AI'
  },
  {
    path: 'faculty/assignments/:facultyAssignmentId',
    loadComponent: () => import('./features/faculty/assignments/faculty-assignments.component').then(m => m.FacultyAssignmentsComponent),
    canActivate: [facultyGuard],
    title: 'Assignments & Grading — CRHDRI.AI'
  },
  {
    path: 'faculty/materials',
    loadComponent: () => import('./features/faculty/materials/faculty-materials.component').then(m => m.FacultyMaterialsComponent),
    canActivate: [facultyGuard],
    title: 'Learning Materials Repository — CRHDRI.AI'
  },
  {
    path: 'faculty/materials/:facultyAssignmentId',
    loadComponent: () => import('./features/faculty/materials/faculty-materials.component').then(m => m.FacultyMaterialsComponent),
    canActivate: [facultyGuard],
    title: 'Learning Materials Repository — CRHDRI.AI'
  },
  {
    path: 'faculty/assessments',
    loadComponent: () => import('./features/faculty/assessments/faculty-assessments.component').then(m => m.FacultyAssessmentsComponent),
    canActivate: [facultyGuard],
    title: 'Assessments & Quizzes Console — CRHDRI.AI'
  },
  {
    path: 'faculty/assessments/:facultyAssignmentId',
    loadComponent: () => import('./features/faculty/assessments/faculty-assessments.component').then(m => m.FacultyAssessmentsComponent),
    canActivate: [facultyGuard],
    title: 'Assessments & Quizzes Console — CRHDRI.AI'
  },

  // ==========================================
  // STUDENT PORTAL ROUTES
  // ==========================================
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [studentGuard],
    title: 'Dashboard — CRHDRI.AI'
  },
  {
    path: 'courses',
    loadComponent: () => import('./features/courses/courses.component').then(m => m.CoursesComponent),
    canActivate: [studentGuard],
    title: 'My Courses — CRHDRI.AI'
  },
  {
    path: 'attendance',
    loadComponent: () => import('./features/attendance/attendance.component').then(m => m.AttendanceComponent),
    canActivate: [studentGuard],
    title: 'Attendance Analytics — CRHDRI.AI'
  },
  {
    path: 'assignments',
    loadComponent: () => import('./features/assignments/assignments.component').then(m => m.AssignmentsComponent),
    canActivate: [studentGuard],
    title: 'Assignments & Submissions — CRHDRI.AI'
  },
  {
    path: 'learning-materials',
    loadComponent: () => import('./features/materials/materials.component').then(m => m.LearningMaterialsComponent),
    canActivate: [studentGuard],
    title: 'Learning Materials — CRHDRI.AI'
  },
  {
    path: 'results',
    loadComponent: () => import('./features/results/results.component').then(m => m.ResultsComponent),
    canActivate: [studentGuard],
    title: 'Academic Results — CRHDRI.AI'
  },
  {
    path: 'assessments',
    loadComponent: () => import('./features/assessments/assessments.component').then(m => m.AssessmentsComponent),
    canActivate: [studentGuard],
    title: 'Quiz & Assessments — CRHDRI.AI'
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [studentGuard],
    title: 'Student Profile — CRHDRI.AI'
  },
  {
    path: 'ai-assistant',
    loadComponent: () => import('./features/ai-assistant/ai-assistant.component').then(m => m.AiAssistantComponent),
    canActivate: [studentGuard],
    title: 'AI Copilot — CRHDRI.AI'
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
