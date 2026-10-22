import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LearningMaterialsResponse } from '../models/student.models';
import { StudentService } from './student.service';

@Injectable({
  providedIn: 'root'
})
export class LearningMaterialsService {
  private readonly http = inject(HttpClient);
  private readonly studentService = inject(StudentService);
  private readonly baseUrl = environment.apiBaseUrl;

  getMaterials(enrollment?: string): Observable<LearningMaterialsResponse> {
    const enroll = enrollment || this.studentService.activeEnrollmentNumber();
    const url = `${this.baseUrl}/students/${encodeURIComponent(enroll)}/learning-materials`;

    return this.http.get<LearningMaterialsResponse>(url).pipe(
      catchError((error: HttpErrorResponse) => {
        const msg = error.error?.message || `Failed to load learning materials for ${enroll}.`;
        return throwError(() => new Error(msg));
      })
    );
  }

  getMaterialDownloadUrl(materialId: string, enrollment?: string): string {
    const enroll = enrollment || this.studentService.activeEnrollmentNumber();
    return `${this.baseUrl}/students/${encodeURIComponent(enroll)}/learning-materials/${materialId}/download`;
  }
}

