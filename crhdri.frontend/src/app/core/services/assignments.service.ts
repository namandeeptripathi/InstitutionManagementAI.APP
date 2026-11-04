import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Assignment, AssignmentSubmissionResponse } from '../models/student.models';
import { StudentService } from './student.service';

@Injectable({
  providedIn: 'root'
})
export class AssignmentsService {
  private readonly http = inject(HttpClient);
  private readonly studentService = inject(StudentService);
  private readonly baseUrl = environment.apiBaseUrl;

  getAssignments(enrollment?: string): Observable<Assignment[]> {
    const enroll = enrollment || this.studentService.activeEnrollmentNumber();
    const url = `${this.baseUrl}/students/${encodeURIComponent(enroll)}/assignments`;

    return this.http.get<Assignment[]>(url).pipe(
      catchError((error: HttpErrorResponse) => {
        const msg = error.error?.message || `Failed to load assignments for ${enroll}.`;
        return throwError(() => new Error(msg));
      })
    );
  }

  getDownloadUrl(assignmentId: string, enrollment?: string): string {
    const enroll = enrollment || this.studentService.activeEnrollmentNumber();
    const token = localStorage.getItem('crhdri_auth_token');
    const base = `${this.baseUrl}/students/${encodeURIComponent(enroll)}/assignments/${assignmentId}/submission/download`;
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
  }

  submitAssignment(
    assignmentId: string,
    file: File,
    enrollment?: string
  ): Observable<HttpEvent<AssignmentSubmissionResponse>> {
    const enroll = enrollment || this.studentService.activeEnrollmentNumber();
    const url = `${this.baseUrl}/students/${encodeURIComponent(enroll)}/assignments/${assignmentId}/submit`;

    // Multipart form-data with exact form field name 'File' matching ASP.NET Core SubmissionRequest
    const formData = new FormData();
    formData.append('File', file, file.name);

    const req = new HttpRequest<FormData>('POST', url, formData, {
      reportProgress: true,
      responseType: 'json'
    });

    return this.http.request<AssignmentSubmissionResponse>(req).pipe(
      catchError((error: HttpErrorResponse) => {
        let msg = 'Failed to submit assignment.';
        if (error.error && typeof error.error === 'object' && error.error.message) {
          msg = error.error.message;
        } else if (error.status === 409) {
          msg = 'A submission conflict occurred. Duplicate submissions are not accepted.';
        } else if (error.status === 400) {
          msg = error.error?.message || 'Invalid file format or file size exceeded 10 MB limit.';
        } else if (error.status === 404) {
          msg = error.error?.message || 'Assignment or student record was not found.';
        }
        return throwError(() => new Error(msg));
      })
    );
  }
}
