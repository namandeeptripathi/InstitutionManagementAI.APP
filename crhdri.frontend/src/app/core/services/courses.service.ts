import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Course } from '../models/student.models';
import { StudentService } from './student.service';

@Injectable({
  providedIn: 'root'
})
export class CoursesService {
  private readonly http = inject(HttpClient);
  private readonly studentService = inject(StudentService);
  private readonly baseUrl = environment.apiBaseUrl;

  getCourses(enrollment?: string): Observable<Course[]> {
    const enroll = enrollment || this.studentService.activeEnrollmentNumber();
    const url = `${this.baseUrl}/students/${encodeURIComponent(enroll)}/courses`;

    return this.http.get<Course[]>(url).pipe(
      catchError((error: HttpErrorResponse) => {
        const msg = error.error?.message || `Failed to load courses for ${enroll}.`;
        return throwError(() => new Error(msg));
      })
    );
  }
}
