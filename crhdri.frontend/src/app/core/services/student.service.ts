import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardResponse, StudentProfile } from '../models/student.models';

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  readonly activeEnrollmentNumber = signal<string>(environment.defaultEnrollmentNumber);
  readonly studentProfile = signal<StudentProfile | null>(null);
  readonly isConnected = signal<boolean>(true);
  readonly lastError = signal<string | null>(null);

  setEnrollmentNumber(enrollment: string): void {
    if (enrollment && enrollment.trim() !== '') {
      this.activeEnrollmentNumber.set(enrollment.trim());
      // Refresh profile
      this.getProfile().subscribe({
        next: profile => this.studentProfile.set(profile),
        error: () => {}
      });
    }
  }

  getDashboard(enrollment?: string): Observable<DashboardResponse> {
    const enroll = enrollment || this.activeEnrollmentNumber();
    const url = `${this.baseUrl}/students/${encodeURIComponent(enroll)}/dashboard`;

    return this.http.get<DashboardResponse>(url).pipe(
      tap(data => {
        this.isConnected.set(true);
        this.lastError.set(null);
        if (data && data.profile) {
          this.studentProfile.set(data.profile);
        }
      }),
      catchError(err => this.handleError(err, 'Dashboard API'))
    );
  }

  getProfile(enrollment?: string): Observable<StudentProfile> {
    const enroll = enrollment || this.activeEnrollmentNumber();
    const url = `${this.baseUrl}/students/${encodeURIComponent(enroll)}/profile`;

    return this.http.get<StudentProfile>(url).pipe(
      tap(profile => {
        this.isConnected.set(true);
        this.lastError.set(null);
        this.studentProfile.set(profile);
      }),
      catchError(err => this.handleError(err, 'Profile API'))
    );
  }

  checkDatabaseHealth(): Observable<{ status: string; database?: string; username?: string }> {
    const url = `${this.baseUrl}/health/database`;
    return this.http.get<{ status: string; database?: string; username?: string }>(url).pipe(
      tap(() => this.isConnected.set(true)),
      catchError(err => this.handleError(err, 'Database Health API'))
    );
  }

  private handleError(error: HttpErrorResponse, context: string): Observable<never> {
    this.isConnected.set(false);
    let errorMsg = `Unable to connect to CRHDRI backend (${context}).`;
    if (error.status === 0) {
      errorMsg = `Cannot connect to server at ${this.baseUrl}. Please verify the API is running at http://localhost:5083.`;
    } else if (error.error && error.error.message) {
      errorMsg = error.error.message;
    } else if (error.status === 404) {
      errorMsg = `No record found for student ${this.activeEnrollmentNumber()}.`;
    }
    this.lastError.set(errorMsg);
    console.error(`[CRHDRI API ERROR] ${context}:`, error);
    return throwError(() => new Error(errorMsg));
  }
}
