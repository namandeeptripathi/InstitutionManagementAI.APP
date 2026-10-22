import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ResultsResponse } from '../models/student.models';
import { StudentService } from './student.service';

@Injectable({
  providedIn: 'root'
})
export class ResultsService {
  private readonly http = inject(HttpClient);
  private readonly studentService = inject(StudentService);
  private readonly baseUrl = environment.apiBaseUrl;

  getResults(enrollment?: string): Observable<ResultsResponse> {
    const enroll = enrollment || this.studentService.activeEnrollmentNumber();
    const url = `${this.baseUrl}/students/${encodeURIComponent(enroll)}/results`;

    return this.http.get<ResultsResponse>(url).pipe(
      catchError((error: HttpErrorResponse) => {
        const msg = error.error?.message || `Failed to load results for ${enroll}.`;
        return throwError(() => new Error(msg));
      })
    );
  }
}
