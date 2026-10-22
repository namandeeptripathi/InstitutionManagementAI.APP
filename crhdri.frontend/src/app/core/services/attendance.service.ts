import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AttendanceResponse } from '../models/student.models';
import { StudentService } from './student.service';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private readonly http = inject(HttpClient);
  private readonly studentService = inject(StudentService);
  private readonly baseUrl = environment.apiBaseUrl;

  getAttendance(enrollment?: string): Observable<AttendanceResponse> {
    const enroll = enrollment || this.studentService.activeEnrollmentNumber();
    const url = `${this.baseUrl}/students/${encodeURIComponent(enroll)}/attendance`;

    return this.http.get<AttendanceResponse>(url).pipe(
      catchError((error: HttpErrorResponse) => {
        const msg = error.error?.message || `Failed to load attendance records for ${enroll}.`;
        return throwError(() => new Error(msg));
      })
    );
  }
}
