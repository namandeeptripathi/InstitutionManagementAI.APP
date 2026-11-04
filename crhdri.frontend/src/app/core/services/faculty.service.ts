import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  FacultyAssignedClass, 
  FacultyClassRosterResponse, 
  FacultyDashboardResponse,
  FacultyClassSessionsResponse,
  CreateSessionRequest,
  SessionAttendanceResponse,
  UpdateSessionAttendancePayload,
  FacultyClassTasksResponse,
  CreateAssignmentPayload,
  FacultyAssignmentSubmissionsResponse,
  GradeSubmissionPayload,
  FacultyClassMaterialsResponse,
  FacultyLearningMaterialItem,
  FacultyClassAssessmentsResponse,
  CreateAssessmentPayload,
  FacultyAssessmentSubmissionsResponse
} from '../models/faculty.models';

@Injectable({
  providedIn: 'root'
})
export class FacultyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  readonly dashboardData = signal<FacultyDashboardResponse | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  /**
   * Fetch authenticated faculty dashboard metrics and assigned classes
   */
  getDashboard(): Observable<FacultyDashboardResponse> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.get<FacultyDashboardResponse>(`${this.baseUrl}/faculty/me/dashboard`).pipe(
      tap((data) => {
        this.dashboardData.set(data);
        this.loading.set(false);
      }),
      catchError((err: HttpErrorResponse) => {
        let msg = 'Failed to load faculty dashboard data from backend server.';
        if (err.error && err.error.message) {
          msg = err.error.message;
        } else if (err.status === 401) {
          msg = 'Faculty session expired or unauthorized. Please sign in again.';
        } else if (err.status === 403) {
          msg = 'Access forbidden: Faculty role required.';
        } else if (err.status === 0) {
          msg = 'Cannot connect to backend API at http://localhost:5083. Verify the ASP.NET Core server is active.';
        }
        this.error.set(msg);
        this.loading.set(false);
        return throwError(() => new Error(msg));
      })
    );
  }

  /**
   * Fetch assigned classes list for the authenticated faculty member
   */
  getMyClasses(): Observable<FacultyAssignedClass[]> {
    return this.http.get<FacultyAssignedClass[]>(`${this.baseUrl}/faculty/me/subjects`).pipe(
      catchError((err: HttpErrorResponse) => {
        let msg = 'Failed to load assigned classes.';
        if (err.error && err.error.message) msg = err.error.message;
        return throwError(() => new Error(msg));
      })
    );
  }

  /**
   * Fetch student roster for a specific faculty class assignment
   */
  getClassRoster(facultyAssignmentId: string): Observable<FacultyClassRosterResponse> {
    return this.http.get<FacultyClassRosterResponse>(`${this.baseUrl}/faculty/assignments/${facultyAssignmentId}/students`).pipe(
      catchError((err: HttpErrorResponse) => {
        let msg = 'Failed to load student roster for this class.';
        if (err.status === 404) {
          msg = 'Class assignment not found or you are not authorized to view this roster.';
        } else if (err.error && err.error.message) {
          msg = err.error.message;
        }
        return throwError(() => new Error(msg));
      })
    );
  }

  /**
   * Fetch assigned subjects list
   */
  getAssignedSubjects(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/faculty/me/subjects`).pipe(
      catchError((err: HttpErrorResponse) => {
        return throwError(() => new Error(err.error?.message || 'Failed to load assigned subjects'));
      })
    );
  }

  /**
   * Fetch all sessions for a specific class assignment with attendance counts
   */
  getClassSessions(facultyAssignmentId: string): Observable<FacultyClassSessionsResponse> {
    return this.http.get<FacultyClassSessionsResponse>(`${this.baseUrl}/faculty/assignments/${facultyAssignmentId}/sessions`).pipe(
      catchError((err: HttpErrorResponse) => {
        let msg = 'Failed to load class sessions.';
        if (err.status === 404) msg = 'Class assignment not found or access denied.';
        else if (err.error?.message) msg = err.error.message;
        return throwError(() => new Error(msg));
      })
    );
  }

  /**
   * Create a new class lecture session for a class assignment
   */
  createClassSession(facultyAssignmentId: string, request: CreateSessionRequest): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/faculty/assignments/${facultyAssignmentId}/sessions`, request).pipe(
      catchError((err: HttpErrorResponse) => {
        let msg = 'Failed to create class session.';
        if (err.status === 409) msg = 'A session already exists for this class on this date and time.';
        else if (err.error?.message) msg = err.error.message;
        return throwError(() => new Error(msg));
      })
    );
  }

  /**
   * Fetch student attendance list for a specific session
   */
  getSessionAttendance(sessionId: string): Observable<SessionAttendanceResponse> {
    return this.http.get<SessionAttendanceResponse>(`${this.baseUrl}/faculty/sessions/${sessionId}/attendance`).pipe(
      catchError((err: HttpErrorResponse) => {
        let msg = 'Failed to load attendance for this session.';
        if (err.status === 404) msg = 'Session not found or access denied.';
        else if (err.error?.message) msg = err.error.message;
        return throwError(() => new Error(msg));
      })
    );
  }

  /**
   * Mark or update student attendance for a session
   */
  updateSessionAttendance(sessionId: string, payload: UpdateSessionAttendancePayload): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/faculty/sessions/${sessionId}/attendance`, payload).pipe(
      catchError((err: HttpErrorResponse) => {
        let msg = 'Failed to save attendance.';
        if (err.error?.message) msg = err.error.message;
        return throwError(() => new Error(msg));
      })
    );
  }

  /**
   * Fetch all assignment tasks created for a specific class assignment
   */
  getClassTasks(facultyAssignmentId: string): Observable<FacultyClassTasksResponse> {
    return this.http.get<FacultyClassTasksResponse>(`${this.baseUrl}/faculty/assignments/${facultyAssignmentId}/tasks`).pipe(
      catchError((err: HttpErrorResponse) => {
        let msg = 'Failed to load assignments for this class.';
        if (err.status === 404) msg = 'Class assignment not found or access denied.';
        else if (err.error?.message) msg = err.error.message;
        return throwError(() => new Error(msg));
      })
    );
  }

  /**
   * Create a new assignment task for a specific class
   */
  createClassTask(facultyAssignmentId: string, payload: CreateAssignmentPayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/faculty/assignments/${facultyAssignmentId}/tasks`, payload).pipe(
      catchError((err: HttpErrorResponse) => {
        let msg = 'Failed to create assignment.';
        if (err.error?.message) msg = err.error.message;
        return throwError(() => new Error(msg));
      })
    );
  }

  /**
   * Fetch student submissions roster and evaluation status for a specific assignment task
   */
  getTaskSubmissions(assignmentId: string): Observable<FacultyAssignmentSubmissionsResponse> {
    return this.http.get<FacultyAssignmentSubmissionsResponse>(`${this.baseUrl}/faculty/assignments/tasks/${assignmentId}/submissions`).pipe(
      catchError((err: HttpErrorResponse) => {
        let msg = 'Failed to load assignment submissions.';
        if (err.status === 404) msg = 'Assignment not found or access denied.';
        else if (err.error?.message) msg = err.error.message;
        return throwError(() => new Error(msg));
      })
    );
  }

  /**
   * Grade a student submission with marks obtained and feedback
   */
  gradeSubmission(submissionId: string, payload: GradeSubmissionPayload): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/faculty/submissions/${submissionId}/grade`, payload).pipe(
      catchError((err: HttpErrorResponse) => {
        let msg = 'Failed to save grade evaluation.';
        if (err.error?.message) msg = err.error.message;
        return throwError(() => new Error(msg));
      })
    );
  }

  /**
   * Get direct download endpoint URL for a student submission file
   */
  getSubmissionDownloadUrl(submissionId: string): string {
    const token = localStorage.getItem('crhdri_auth_token');
    const base = `${this.baseUrl}/faculty/submissions/${submissionId}/download`;
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
  }

  /**
   * Fetch all learning materials uploaded for a specific faculty class
   */
  getClassMaterials(facultyAssignmentId: string): Observable<FacultyClassMaterialsResponse> {
    return this.http.get<FacultyClassMaterialsResponse>(`${this.baseUrl}/faculty/assignments/${facultyAssignmentId}/materials`).pipe(
      catchError((err: HttpErrorResponse) => {
        let msg = 'Failed to load learning materials for this class.';
        if (err.status === 404) msg = 'Class assignment not found or access denied.';
        else if (err.error?.message) msg = err.error.message;
        return throwError(() => new Error(msg));
      })
    );
  }

  /**
   * Upload a new learning material file for a faculty class
   */
  uploadMaterial(facultyAssignmentId: string, formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/faculty/assignments/${facultyAssignmentId}/materials`, formData).pipe(
      catchError((err: HttpErrorResponse) => {
        let msg = 'Failed to upload learning material.';
        if (err.error?.message) msg = err.error.message;
        return throwError(() => new Error(msg));
      })
    );
  }

  /**
   * Delete an existing learning material record and file
   */
  deleteMaterial(materialId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/faculty/materials/${materialId}`).pipe(
      catchError((err: HttpErrorResponse) => {
        let msg = 'Failed to delete learning material.';
        if (err.status === 404) msg = 'Learning material not found or access denied.';
        else if (err.error?.message) msg = err.error.message;
        return throwError(() => new Error(msg));
      })
    );
  }

  /**
   * Get direct download endpoint URL for a faculty learning material file
   */
  getMaterialDownloadUrl(materialId: string): string {
    const token = localStorage.getItem('crhdri_auth_token');
    const base = `${this.baseUrl}/faculty/materials/${materialId}/download`;
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
  }

  // ======================================================
  // STAGE 7: FACULTY ASSESSMENTS & QUIZZES API
  // ======================================================

  /**
   * Fetch all assessments and enrolled student stats for a faculty class
   */
  getClassAssessments(facultyAssignmentId: string): Observable<FacultyClassAssessmentsResponse> {
    return this.http.get<FacultyClassAssessmentsResponse>(`${this.baseUrl}/faculty/assignments/${facultyAssignmentId}/assessments`).pipe(
      catchError((err: HttpErrorResponse) => {
        let msg = 'Failed to load assessments for this class.';
        if (err.status === 404) msg = 'Class assignment not found or access denied.';
        else if (err.error?.message) msg = err.error.message;
        return throwError(() => new Error(msg));
      })
    );
  }

  /**
   * Create and publish a new assessment with questions and options
   */
  createAssessment(facultyAssignmentId: string, payload: CreateAssessmentPayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/faculty/assignments/${facultyAssignmentId}/assessments`, payload).pipe(
      catchError((err: HttpErrorResponse) => {
        let msg = 'Failed to create assessment.';
        if (err.error?.message) msg = err.error.message;
        return throwError(() => new Error(msg));
      })
    );
  }

  /**
   * Delete an existing assessment if no student attempts exist
   */
  deleteAssessment(assessmentId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/faculty/assessments/${assessmentId}`).pipe(
      catchError((err: HttpErrorResponse) => {
        let msg = 'Failed to delete assessment.';
        if (err.status === 409) {
          msg = err.error?.message || 'Cannot delete assessment: Student attempts have already been submitted.';
        } else if (err.status === 404) {
          msg = 'Assessment not found or access denied.';
        } else if (err.error?.message) {
          msg = err.error.message;
        }
        return throwError(() => new Error(msg));
      })
    );
  }

  /**
   * Fetch questions and student submissions roster for an assessment
   */
  getAssessmentSubmissions(assessmentId: string): Observable<FacultyAssessmentSubmissionsResponse> {
    return this.http.get<FacultyAssessmentSubmissionsResponse>(`${this.baseUrl}/faculty/assessments/${assessmentId}/submissions`).pipe(
      catchError((err: HttpErrorResponse) => {
        let msg = 'Failed to load assessment submissions.';
        if (err.status === 404) msg = 'Assessment not found or access denied.';
        else if (err.error?.message) msg = err.error.message;
        return throwError(() => new Error(msg));
      })
    );
  }
}



