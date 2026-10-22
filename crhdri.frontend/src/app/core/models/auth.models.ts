export type UserRole = 'STUDENT' | 'FACULTY';

export interface AuthenticatedStudent {
  userId: string;
  studentId: string;
  enrollmentNumber: string;
  fullName: string;
  email: string;
  role: string;
}

export interface AuthenticatedFaculty {
  userId: string;
  facultyId: string;
  employeeCode: string;
  designation: string;
  fullName: string;
  email: string;
  role: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  student: AuthenticatedStudent;
}

export interface FacultyAuthResponse {
  token: string;
  expiresAt: string;
  faculty: AuthenticatedFaculty;
}
