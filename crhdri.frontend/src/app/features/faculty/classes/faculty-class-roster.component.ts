import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FacultyService } from '../../../core/services/faculty.service';
import { FacultyClassDetails, FacultyClassStudent } from '../../../core/models/faculty.models';
import { IconComponent } from '../../../shared/components/icon.component';

@Component({
  selector: 'app-faculty-class-roster',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, IconComponent],
  template: `
    <div class="roster-page">
      <!-- Breadcrumb & Back Bar -->
      <div class="navigation-bar">
        <a routerLink="/faculty/classes" class="back-link">
          <app-icon name="chevron-right" [size]="14" class="back-arrow"></app-icon>
          <span>Back to Teaching Classes</span>
        </a>

        <div class="page-breadcrumbs">
          <span class="crumb-link" routerLink="/faculty/classes">My Classes</span>
          <span class="crumb-sep">/</span>
          <span class="crumb-active">
            {{ classDetails()?.subjectCode || 'Class' }} Student Roster
          </span>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="skeleton-container" aria-busy="true" aria-label="Loading student roster">
          <div class="skeleton header-skeleton"></div>
          <div class="skeleton table-skeleton"></div>
        </div>
      }

      <!-- Error State -->
      @else if (errorMessage()) {
        <div class="error-banner card-tactile" role="alert">
          <div class="error-icon-wrap">
            <app-icon name="alert" [size]="28"></app-icon>
          </div>
          <div class="error-text">
            <h3 class="error-title">Unable to Load Class Roster</h3>
            <p class="error-desc">{{ errorMessage() }}</p>
          </div>
          <button class="btn btn-primary" (click)="loadRoster()">
            <app-icon name="refresh" [size]="16"></app-icon>
            Retry
          </button>
        </div>
      }

      <!-- Loaded Roster Content -->
      @else if (classDetails()) {
        <!-- Class Overview Banner -->
        <section class="class-hero-card card-tactile">
          <div class="hero-left">
            <div class="hero-meta-row">
              <span class="badge badge-sage">
                <app-icon name="badge-check" [size]="12"></app-icon>
                OFFICIAL ROSTER
              </span>
              <span class="meta-dot">&bull;</span>
              <span class="font-mono">{{ classDetails()?.academicYear }}</span>
              <span class="meta-dot">&bull;</span>
              <span>{{ classDetails()?.departmentName }}</span>
            </div>

            <div class="hero-subject-row">
              <span class="subject-tag font-mono">{{ classDetails()?.subjectCode }}</span>
              <h2 class="hero-title font-editorial">{{ classDetails()?.subjectName }}</h2>
            </div>

            <p class="hero-course">
              {{ classDetails()?.courseName }}
              <span class="font-mono">({{ classDetails()?.courseCode }})</span>
            </p>

            <div class="cohort-badges-row">
              <span class="cohort-pill">
                <strong>Semester {{ classDetails()?.semester }}</strong> &bull; Section {{ classDetails()?.section }}
              </span>
              <span class="cohort-pill font-mono">{{ classDetails()?.credits }} Credits</span>
            </div>
          </div>

          <div class="hero-right">
            <div class="enrolled-stat-badge">
              <span class="stat-number font-editorial">{{ totalStudents() }}</span>
              <span class="stat-title">{{ totalStudents() === 1 ? 'Enrolled Student' : 'Enrolled Students' }}</span>
              <span class="stat-note font-mono">Section {{ classDetails()?.section }}</span>
            </div>

            <button class="btn btn-outline refresh-btn" (click)="loadRoster()" [disabled]="loading()" title="Refresh Roster">
              <app-icon name="refresh" [size]="15" [class.spin-icon]="loading()"></app-icon>
              <span>Refresh</span>
            </button>
          </div>
        </section>

        <!-- Search & Filter Controls -->
        <div class="card-tactile search-card">
          <div class="search-input-wrap">
            <app-icon name="search" [size]="16" class="search-icon"></app-icon>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Search by student name, enrollment number, or email..."
              class="search-input"
            />
            @if (searchQuery) {
              <button class="clear-btn" (click)="searchQuery = ''" aria-label="Clear search">
                &times;
              </button>
            }
          </div>

          <div class="filter-summary font-mono">
            {{ filteredStudents().length }} of {{ totalStudents() }} Students Listed
          </div>
        </div>

        <!-- Student Roster Table Card -->
        <div class="card-tactile table-card">
          <div class="table-header-block">
            <h3 class="table-title font-editorial">Official Enrollment Directory</h3>
            <span class="badge badge-amber badge-sm">Verified Institutional Records</span>
          </div>

          @if (filteredStudents().length > 0) {
            <div class="table-responsive">
              <table class="roster-table" aria-label="Student Roster">
                <thead>
                  <tr>
                    <th scope="col" class="th-student">Student Name & Email</th>
                    <th scope="col" class="th-enrollment">Enrollment Number</th>
                    <th scope="col" class="th-cohort">Cohort / Section</th>
                    <th scope="col" class="th-dept">Department & Year</th>
                    <th scope="col" class="th-attendance">Session Attendance</th>
                    <th scope="col" class="th-status">Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (student of filteredStudents(); track student.studentId) {
                    <tr class="roster-row">
                      <!-- Student Identity -->
                      <td class="td-student">
                        <div class="student-identity-wrap">
                          <div class="student-avatar" [attr.aria-label]="student.fullName">
                            {{ getInitials(student.fullName) }}
                          </div>
                          <div class="student-text">
                            <span class="student-fullname">{{ student.fullName }}</span>
                            <span class="student-email">{{ student.email }}</span>
                          </div>
                        </div>
                      </td>

                      <!-- Enrollment Number -->
                      <td class="td-enrollment">
                        <span class="enrollment-pill font-mono">{{ student.enrollmentNumber }}</span>
                      </td>

                      <!-- Cohort -->
                      <td class="td-cohort">
                        <span class="cohort-text">Sem {{ student.semester }} &bull; Sec {{ student.section }}</span>
                      </td>

                      <!-- Department & Admission Year -->
                      <td class="td-dept">
                        <div class="dept-wrap">
                          <span class="dept-name">{{ student.department }}</span>
                          <span class="admission-year font-mono">Admitted {{ student.admissionYear }}</span>
                        </div>
                      </td>

                      <!-- Attendance Stats -->
                      <td class="td-attendance">
                        <div class="attendance-stat-box">
                          <div class="att-badges">
                            <span
                              class="badge"
                              [class.badge-forest]="student.attendancePercentage >= 75"
                              [class.badge-danger]="student.attendancePercentage < 75"
                            >
                              {{ student.attendancePercentage }}%
                            </span>
                            <span class="att-counts font-mono">
                              {{ student.attendedSessions }}/{{ student.totalSessions }} Sessions
                            </span>
                          </div>
                        </div>
                      </td>

                      <!-- Enrollment Status -->
                      <td class="td-status">
                        <span class="badge badge-sage">
                          <span class="status-dot-active"></span>
                          {{ student.enrollmentStatus }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="empty-roster">
              <app-icon name="profile" [size]="32" class="empty-icon"></app-icon>
              <h4 class="empty-title">No Students Found</h4>
              <p class="empty-text">
                @if (searchQuery) {
                  No enrolled students match your filter "{{ searchQuery }}".
                } @else {
                  No students are currently registered in this section for the active academic term.
                }
              </p>
            </div>
          }

          <!-- Roster Footer -->
          <div class="table-footer">
            <span class="footer-note">
              Total class enrollment: <strong>{{ totalStudents() }} student{{ totalStudents() === 1 ? '' : 's' }}</strong> &bull; All records verified through university PostgreSQL database.
            </span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .roster-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding-bottom: 40px;
    }

    /* Navigation Bar */
    .navigation-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--color-forest);
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: all var(--transition-fast);
      padding: 6px 10px;
      border-radius: var(--radius-sm);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
    }

    .back-link:hover {
      background: #FFFFFF;
      border-color: var(--color-forest-border);
      transform: translateX(-2px);
    }

    .back-arrow {
      transform: rotate(180deg);
    }

    .page-breadcrumbs {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
    }

    .crumb-link {
      color: var(--text-muted);
      cursor: pointer;
      text-decoration: none;
    }

    .crumb-link:hover {
      color: var(--color-forest);
    }

    .crumb-sep {
      color: var(--border-strong);
    }

    .crumb-active {
      color: var(--text-main);
      font-weight: 700;
    }

    /* Class Hero Card */
    .class-hero-card {
      background: #FFFFFF;
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-subtle);
      padding: 28px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      box-shadow: var(--shadow-tactile);
    }

    .hero-left {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 680px;
    }

    .hero-meta-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text-muted);
      flex-wrap: wrap;
    }

    .meta-dot {
      color: var(--border-strong);
    }

    .hero-subject-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .subject-tag {
      font-size: 15px;
      font-weight: 700;
      color: var(--color-forest);
      background: var(--color-forest-surface);
      border: 1px solid var(--color-forest-border);
      padding: 4px 12px;
      border-radius: var(--radius-md);
    }

    .hero-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-main);
      margin: 0;
      line-height: 1.2;
    }

    .hero-course {
      font-size: 13.5px;
      color: var(--text-secondary);
      margin: 0;
    }

    .cohort-badges-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }

    .cohort-pill {
      font-size: 12px;
      color: var(--text-secondary);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      padding: 4px 10px;
      border-radius: var(--radius-sm);
    }

    .cohort-pill strong {
      color: var(--color-forest);
    }

    .hero-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 14px;
      flex-shrink: 0;
    }

    .enrolled-stat-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px 24px;
      background: var(--color-forest-surface);
      border: 1px solid var(--color-forest-border);
      border-radius: var(--radius-lg);
      text-align: center;
      min-width: 140px;
    }

    .stat-number {
      font-size: 32px;
      font-weight: 800;
      color: var(--color-forest);
      line-height: 1;
    }

    .stat-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-forest-dark);
      margin-top: 4px;
    }

    .stat-note {
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .refresh-btn {
      font-size: 12px;
      padding: 6px 12px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    /* Search Bar */
    .search-card {
      padding: 12px 20px;
      background: #FFFFFF;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .search-input-wrap {
      position: relative;
      flex: 1;
      max-width: 480px;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      color: var(--text-muted);
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: 9px 36px;
      font-size: 13.5px;
      color: var(--text-main);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      outline: none;
      transition: all var(--transition-fast);
      font-family: inherit;
    }

    .search-input:focus {
      background: #FFFFFF;
      border-color: var(--color-forest);
      box-shadow: 0 0 0 3px rgba(23, 63, 53, 0.08);
    }

    .clear-btn {
      position: absolute;
      right: 10px;
      background: none;
      border: none;
      font-size: 18px;
      color: var(--text-muted);
      cursor: pointer;
      line-height: 1;
    }

    .filter-summary {
      font-size: 12px;
      color: var(--text-muted);
      background: var(--bg-surface-subtle);
      padding: 5px 12px;
      border-radius: var(--radius-full);
      border: 1px solid var(--border-subtle);
      white-space: nowrap;
    }

    /* Table Card */
    .table-card {
      background: #FFFFFF;
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-subtle);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .table-header-block {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .table-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--color-forest);
      margin: 0;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .roster-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .roster-table th {
      padding: 12px 20px;
      background: var(--bg-surface-subtle);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-subtle);
      white-space: nowrap;
    }

    .roster-row {
      border-bottom: 1px solid var(--border-subtle);
      transition: background-color var(--transition-fast);
    }

    .roster-row:hover {
      background-color: rgba(247, 245, 239, 0.5);
    }

    .roster-table td {
      padding: 14px 20px;
      font-size: 13.5px;
      vertical-align: middle;
    }

    /* Student Identity Cell */
    .student-identity-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .student-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--color-forest);
      color: #FFFFFF;
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .student-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .student-fullname {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text-main);
    }

    .student-email {
      font-size: 12px;
      color: var(--text-muted);
    }

    .enrollment-pill {
      font-size: 12px;
      font-weight: 700;
      color: var(--color-forest);
      background: var(--color-forest-surface);
      border: 1px solid var(--color-forest-border);
      padding: 3px 8px;
      border-radius: var(--radius-sm);
    }

    .cohort-text {
      font-size: 12.5px;
      color: var(--text-secondary);
      font-weight: 600;
    }

    .dept-wrap {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .dept-name {
      font-size: 12.5px;
      color: var(--text-main);
      font-weight: 500;
    }

    .admission-year {
      font-size: 11px;
      color: var(--text-muted);
    }

    .attendance-stat-box {
      display: flex;
      align-items: center;
    }

    .att-badges {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .att-counts {
      font-size: 11.5px;
      color: var(--text-muted);
    }

    .status-dot-active {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #28a745;
      margin-right: 4px;
    }

    .table-footer {
      padding: 14px 24px;
      background: var(--bg-surface-subtle);
      border-top: 1px solid var(--border-subtle);
      font-size: 12px;
      color: var(--text-muted);
    }

    .table-footer strong {
      color: var(--color-forest);
    }

    /* Empty Roster */
    .empty-roster {
      padding: 40px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      color: var(--text-muted);
    }

    .empty-icon {
      color: var(--text-muted);
    }

    .empty-title {
      font-size: 17px;
      color: var(--text-main);
      margin: 0;
    }

    .empty-text {
      font-size: 13px;
      margin: 0;
      max-width: 400px;
    }

    /* Error & Skeletons */
    .error-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-left: 4px solid #dc2626;
      border-radius: var(--radius-xl);
    }

    .error-icon-wrap {
      color: #dc2626;
    }

    .error-text {
      flex: 1;
    }

    .error-title {
      font-size: 16px;
      font-weight: 700;
      color: #991b1b;
      margin: 0 0 4px 0;
    }

    .error-desc {
      font-size: 13px;
      color: #b91c1c;
      margin: 0;
    }

    .skeleton-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .skeleton {
      background: linear-gradient(90deg, #f0ede4 25%, #f8f6f0 50%, #f0ede4 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: var(--radius-xl);
    }

    .header-skeleton {
      height: 180px;
    }

    .table-skeleton {
      height: 300px;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    @media (max-width: 900px) {
      .class-hero-card {
        flex-direction: column;
        align-items: flex-start;
      }
      .hero-right {
        align-items: flex-start;
        width: 100%;
        flex-direction: row;
        justify-content: space-between;
      }
    }
  `]
})
export class FacultyClassRosterComponent implements OnInit {
  private readonly facultyService = inject(FacultyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  classDetails = signal<FacultyClassDetails | null>(null);
  students = signal<FacultyClassStudent[]>([]);
  totalStudents = signal<number>(0);
  loading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  searchQuery = '';

  filteredStudents = computed(() => {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return this.students();

    return this.students().filter(s =>
      s.fullName.toLowerCase().includes(query) ||
      s.enrollmentNumber.toLowerCase().includes(query) ||
      s.email.toLowerCase().includes(query) ||
      s.department.toLowerCase().includes(query)
    );
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const assignmentId = params.get('facultyAssignmentId');
      if (assignmentId) {
        this.loadRosterForAssignment(assignmentId);
      } else {
        this.router.navigate(['/faculty/classes']);
      }
    });
  }

  loadRoster(): void {
    const assignmentId = this.route.snapshot.paramMap.get('facultyAssignmentId');
    if (assignmentId) {
      this.loadRosterForAssignment(assignmentId);
    }
  }

  private loadRosterForAssignment(assignmentId: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.facultyService.getClassRoster(assignmentId).subscribe({
      next: (res) => {
        this.classDetails.set(res.classDetails);
        this.students.set(res.students);
        this.totalStudents.set(res.totalStudents);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.message || 'Failed to load class student roster.');
      }
    });
  }

  getInitials(fullName: string): string {
    const parts = (fullName || '').split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (fullName || '').slice(0, 2).toUpperCase() || 'ST';
  }
}
