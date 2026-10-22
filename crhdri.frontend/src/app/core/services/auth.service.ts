import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  AuthResponse, 
  AuthenticatedFaculty, 
  AuthenticatedStudent, 
  FacultyAuthResponse, 
  LoginRequest, 
  UserRole 
} from '../models/auth.models';
import { StudentService } from './student.service';

const TOKEN_KEY = 'crhdri_auth_token';
const USER_KEY = 'crhdri_auth_user';
const ROLE_KEY = 'crhdri_auth_role';
const EXPIRES_KEY = 'crhdri_auth_expires';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly studentService = inject(StudentService);
  private readonly baseUrl = environment.apiBaseUrl;

  // Authentication State Signals
  readonly currentUser = signal<AuthenticatedStudent | null>(null);
  readonly currentFaculty = signal<AuthenticatedFaculty | null>(null);
  readonly currentRole = signal<UserRole | null>(null);
  readonly token = signal<string | null>(null);

  // Computed Properties
  readonly isAuthenticated = computed(() => 
    !!this.token() && (!!this.currentUser() || !!this.currentFaculty())
  );
  readonly isStudent = computed(() => this.currentRole() === 'STUDENT' && !!this.currentUser());
  readonly isFaculty = computed(() => this.currentRole() === 'FACULTY' && !!this.currentFaculty());

  constructor() {
    this.restoreSession();
  }

  /**
   * Authenticate student using enrollment number or email
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    const url = `${this.baseUrl}/auth/student/login`;

    return this.http.post<AuthResponse>(url, credentials).pipe(
      tap((res) => {
        this.saveStudentSession(res.token, res.student, res.expiresAt);
      }),
      catchError((error: HttpErrorResponse) => {
        let msg = 'Authentication failed. Please check your credentials.';
        if (error.error && error.error.message) {
          msg = error.error.message;
        } else if (error.status === 401) {
          msg = 'Invalid enrollment number/email or password.';
        } else if (error.status === 0) {
          msg = 'Cannot connect to authentication service at http://localhost:5083. Verify backend is running.';
        }
        return throwError(() => new Error(msg));
      })
    );
  }

  /**
   * Authenticate faculty member using institutional email
   */
  loginFaculty(credentials: LoginRequest): Observable<FacultyAuthResponse> {
    const url = `${this.baseUrl}/auth/faculty/login`;

    return this.http.post<FacultyAuthResponse>(url, credentials).pipe(
      tap((res) => {
        this.saveFacultySession(res.token, res.faculty, res.expiresAt);
      }),
      catchError((error: HttpErrorResponse) => {
        let msg = 'Authentication failed. Please check your faculty credentials.';
        if (error.error && error.error.message) {
          msg = error.error.message;
        } else if (error.status === 401) {
          msg = 'Invalid faculty email or password.';
        } else if (error.status === 403) {
          msg = 'Faculty access restricted or account is inactive.';
        } else if (error.status === 0) {
          msg = 'Cannot connect to authentication service at http://localhost:5083. Verify backend is running.';
        }
        return throwError(() => new Error(msg));
      })
    );
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  handleUnauthorized(): void {
    this.clearSession();
    const currentUrl = this.router.url;
    if (currentUrl && !currentUrl.includes('/login')) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: currentUrl } });
    } else {
      this.router.navigate(['/login']);
    }
  }

  getToken(): string | null {
    return this.token();
  }

  private saveStudentSession(token: string, student: AuthenticatedStudent, expiresAt: string): void {
    this.token.set(token);
    this.currentUser.set(student);
    this.currentFaculty.set(null);
    this.currentRole.set('STUDENT');

    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(ROLE_KEY, 'STUDENT');
      sessionStorage.setItem(USER_KEY, JSON.stringify(student));
      sessionStorage.setItem(EXPIRES_KEY, expiresAt);
    } catch {
      // Session storage might be restricted in some iframe contexts
    }

    if (student && student.enrollmentNumber) {
      this.studentService.activeEnrollmentNumber.set(student.enrollmentNumber);
    }
  }

  private saveFacultySession(token: string, faculty: AuthenticatedFaculty, expiresAt: string): void {
    this.token.set(token);
    this.currentFaculty.set(faculty);
    this.currentUser.set(null);
    this.currentRole.set('FACULTY');

    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(ROLE_KEY, 'FACULTY');
      sessionStorage.setItem(USER_KEY, JSON.stringify(faculty));
      sessionStorage.setItem(EXPIRES_KEY, expiresAt);
    } catch {
      // Session storage might be restricted in some iframe contexts
    }
  }

  private restoreSession(): boolean {
    try {
      const storedToken = sessionStorage.getItem(TOKEN_KEY);
      const storedUser = sessionStorage.getItem(USER_KEY);
      const storedRole = (sessionStorage.getItem(ROLE_KEY) as UserRole) || 'STUDENT';
      const storedExpires = sessionStorage.getItem(EXPIRES_KEY);

      if (!storedToken || !storedUser) {
        return false;
      }

      // Check expiry if timestamp is stored
      if (storedExpires) {
        const expiryDate = new Date(storedExpires);
        if (expiryDate.getTime() <= Date.now()) {
          this.clearSession();
          return false;
        }
      }

      this.token.set(storedToken);

      if (storedRole === 'FACULTY') {
        const faculty: AuthenticatedFaculty = JSON.parse(storedUser);
        this.currentFaculty.set(faculty);
        this.currentUser.set(null);
        this.currentRole.set('FACULTY');
      } else {
        const student: AuthenticatedStudent = JSON.parse(storedUser);
        this.currentUser.set(student);
        this.currentFaculty.set(null);
        this.currentRole.set('STUDENT');

        if (student && student.enrollmentNumber) {
          this.studentService.activeEnrollmentNumber.set(student.enrollmentNumber);
        }
      }

      return true;
    } catch {
      this.clearSession();
      return false;
    }
  }

  private clearSession(): void {
    this.token.set(null);
    this.currentUser.set(null);
    this.currentFaculty.set(null);
    this.currentRole.set(null);

    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(ROLE_KEY);
      sessionStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(EXPIRES_KEY);
    } catch {
      // Ignore
    }
  }
}
