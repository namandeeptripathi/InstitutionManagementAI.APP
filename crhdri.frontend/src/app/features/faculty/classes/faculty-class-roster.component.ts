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
        <a routerLink="/faculty/classes" class="btn btn-secondary btn-sm">
          <app-icon name="arrow-left" [size]="14"></app-icon>
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
          <div class="skeleton hero-skeleton"></div>
          <div class="skeleton table-skeleton"></div>
        </div>
      }

      <!-- Error State -->
      @else if (errorMessage()) {
        <div class="error-banner card-modern" role="alert">
          <div class="error-icon-wrap">
            <app-icon name="alert" [size]="24"></app-icon>
          </div>
          <div class="error-text">
            <h3 class="error-title">Unable to Load Class Roster</h3>
            <p class="error-desc">{{ errorMessage() }}</p>
          </div>
          <button class="btn btn-primary btn-sm" (click)="loadRoster()">
            <app-icon name="refresh" [size]="14"></app-icon>
            Retry Connection
          </button>
        </div>
      }

      <!-- Loaded Roster Content -->
      @else if (classDetails()) {
        <!-- Class Overview Hero Card -->
        <section class="class-hero-card card-modern">
          <div class="hero-left">
            <div class="hero-meta-row">
              <span class="badge badge-teal">
                <app-icon name="badge-check" [size]="12"></app-icon>
                OFFICIAL ROSTER
              </span>
              <span class="meta-dot">&bull;</span>
              <span class="font-mono text-muted">{{ classDetails()?.academicYear }}</span>
              <span class="meta-dot">&bull;</span>
              <span class="text-secondary">{{ classDetails()?.departmentName }}</span>
            </div>

            <div class="hero-subject-row">
              <span class="subject-tag font-mono">{{ classDetails()?.subjectCode }}</span>
              <h2 class="hero-title">{{ classDetails()?.subjectName }}</h2>
            </div>

            <p class="hero-course">
              {{ classDetails()?.courseName }}
              <span class="font-mono text-muted">({{ classDetails()?.courseCode }})</span>
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
              <span class="stat-number">{{ totalStudents() }}</span>
              <span class="stat-title">{{ totalStudents() === 1 ? 'Enrolled Student' : 'Enrolled Students' }}</span>
              <span class="stat-note font-mono">Section {{ classDetails()?.section }}</span>
            </div>

            <button class="btn btn-secondary btn-sm" (click)="loadRoster()" [disabled]="loading()" title="Refresh Roster">
              <app-icon name="refresh" [size]="14" [class.spin-icon]="loading()"></app-icon>
              <span>Refresh</span>
            </button>
          </div>
        </section>

        <!-- Search & Filter Controls -->
        <div class="card-modern search-card">
          <div class="search-input-wrap">
            <app-icon name="search" [size]="15" class="search-icon"></app-icon>
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
        <div class="card-modern table-container-clean">
          <div class="table-header-block">
            <div class="table-header-left">
              <h3 class="table-title">Official Enrollment Directory</h3>
              <p class="table-subtitle">Verified active registrations from PostgreSQL institution database</p>
            </div>
            <span class="badge badge-teal badge-sm font-mono">
              <app-icon name="badge-check" [size]="12"></app-icon>
              {{ filteredStudents().length }} Records
            </span>
          </div>

          @if (filteredStudents().length > 0) {
            <div class="table-responsive">
              <table class="table-modern" aria-label="Student Roster">
                <thead>
                  <tr>
                    <th scope="col" style="width: 280px;">Student Name & Email</th>
                    <th scope="col" style="width: 170px;">Enrollment Number</th>
                    <th scope="col" style="width: 150px;">Cohort / Section</th>
                    <th scope="col">Department & Year</th>
                    <th scope="col" style="width: 170px;">Session Attendance</th>
                    <th scope="col" style="width: 120px;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (student of filteredStudents(); track student.studentId) {
                    <tr>
                      <!-- Student Identity -->
                      <td>
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
                      <td>
                        <span class="font-mono text-bold">{{ student.enrollmentNumber }}</span>
                      </td>

                      <!-- Cohort -->
                      <td>
                        <span class="cohort-text">Sem {{ student.semester }} &bull; Sec {{ student.section }}</span>
                      </td>

                      <!-- Department & Admission Year -->
                      <td>
                        <div class="dept-wrap">
                          <span class="dept-name">{{ student.department }}</span>
                          <span class="admission-year font-mono text-muted">Adm. {{ student.admissionYear }}</span>
                        </div>
                      </td>

                      <!-- Attendance Stats -->
                      <td>
                        <div class="attendance-stat-box">
                          <span
                            class="badge badge-sm"
                            [class.badge-teal]="student.attendancePercentage >= 75"
                            [class.badge-danger]="student.attendancePercentage < 75"
                          >
                            {{ student.attendancePercentage }}%
                          </span>
                          <span class="att-counts font-mono text-muted">
                            {{ student.attendedSessions }}/{{ student.totalSessions }}
                          </span>
                        </div>
                      </td>

                      <!-- Enrollment Status -->
                      <td>
                        <span class="badge badge-teal badge-sm">
                          <span class="status-dot"></span>
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
              <div class="empty-icon-wrap">
                <app-icon name="profile" [size]="28"></app-icon>
              </div>
              <h4 class="empty-title">No Students Found</h4>
              <p class="empty-text">
                @if (searchQuery) {
                  No enrolled students match your search "{{ searchQuery }}".
                } @else {
                  No students are currently registered in this section for the active academic term.
                }
              </p>
            </div>
          }

          <!-- Roster Footer -->
          <div class="table-footer">
            <span class="footer-note">
              Total enrollment: <strong>{{ totalStudents() }} student{{ totalStudents() === 1 ? '' : 's' }}</strong> &bull; Authenticated records from university registrar.
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
      padding-bottom: 30px;
    }

    .navigation-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .page-breadcrumbs {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }

    .crumb-link {
      color: var(--text-muted);
      cursor: pointer;
      text-decoration: none;
    }

    .crumb-link:hover {
      color: var(--color-teal);
    }

    .crumb-sep {
      color: var(--border-medium);
    }

    .crumb-active {
      color: var(--text-main);
      font-weight: 600;
    }

    /* Skeleton Loading */
    .skeleton-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .hero-skeleton {
      height: 160px;
      border-radius: var(--radius-xl);
    }

    .table-skeleton {
      height: 380px;
      border-radius: var(--radius-lg);
    }

    /* Error Banner */
    .error-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px 24px;
      border-left: 4px solid var(--color-danger);
    }

    .error-icon-wrap {
      color: var(--color-danger);
      flex-shrink: 0;
    }

    .error-text {
      flex: 1;
    }

    .error-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--color-danger);
      margin-bottom: 2px;
    }

    .error-desc {
      font-size: 13.5px;
      color: var(--text-secondary);
    }

    /* Class Hero Card */
    .class-hero-card {
      padding: 24px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      flex-wrap: wrap;
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
      flex-wrap: wrap;
    }

    .meta-dot {
      color: var(--border-medium);
    }

    .hero-subject-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .subject-tag {
      font-size: 14px;
      font-weight: 700;
      color: var(--color-teal);
      background: var(--color-teal-surface);
      border: 1px solid var(--color-teal-border);
      padding: 4px 10px;
      border-radius: var(--radius-md);
    }

    .hero-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.02em;
    }

    .hero-course {
      font-size: 14px;
      color: var(--text-secondary);
    }

    .cohort-badges-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
      flex-wrap: wrap;
    }

    .cohort-pill {
      font-size: 12px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
    }

    .hero-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .enrolled-stat-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--color-teal-surface);
      border: 1px solid var(--color-teal-border);
      padding: 14px 22px;
      border-radius: var(--radius-lg);
      text-align: center;
      min-width: 140px;
    }

    .stat-number {
      font-size: 32px;
      font-weight: 800;
      line-height: 1;
      color: var(--color-teal);
      letter-spacing: -0.03em;
    }

    .stat-title {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-main);
      margin-top: 4px;
    }

    .stat-note {
      font-size: 10.5px;
      color: var(--text-muted);
    }

    /* Search Card */
    .search-card {
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .search-input-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 6px 14px;
      flex: 1;
      max-width: 480px;
      transition: all var(--transition-fast);
    }

    .search-input-wrap:focus-within {
      background: #FFFFFF;
      border-color: var(--color-teal);
      box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
    }

    .search-icon {
      color: var(--text-muted);
    }

    .search-input {
      border: none;
      outline: none;
      background: transparent;
      font-size: 13.5px;
      color: var(--text-main);
      width: 100%;
    }

    .search-input::placeholder {
      color: var(--text-muted);
    }

    .clear-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 16px;
      cursor: pointer;
      padding: 0 4px;
    }

    .filter-summary {
      font-size: 12.5px;
      color: var(--text-muted);
    }

    /* Table Card */
    .table-header-block {
      padding: 18px 24px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .table-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
    }

    .table-subtitle {
      font-size: 12.5px;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .student-identity-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .student-avatar {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-full);
      background: var(--color-teal-surface);
      color: var(--color-teal);
      border: 1px solid var(--color-teal-border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12.5px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .student-text {
      display: flex;
      flex-direction: column;
    }

    .student-fullname {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text-main);
    }

    .student-email {
      font-size: 12px;
      color: var(--text-muted);
    }

    .cohort-text {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .dept-wrap {
      display: flex;
      flex-direction: column;
    }

    .dept-name {
      font-size: 13px;
      color: var(--text-main);
    }

    .admission-year {
      font-size: 11.5px;
    }

    .attendance-stat-box {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .att-counts {
      font-size: 12px;
    }

    .status-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: var(--radius-full);
      background-color: var(--color-teal);
      margin-right: 4px;
    }

    .empty-roster {
      padding: 48px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .empty-icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: var(--radius-full);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      margin-bottom: 4px;
    }

    .empty-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
    }

    .empty-text {
      font-size: 13.5px;
      color: var(--text-secondary);
      max-width: 420px;
    }

    .table-footer {
      padding: 14px 24px;
      border-top: 1px solid var(--border-subtle);
      background: var(--bg-surface-subtle);
    }

    .footer-note {
      font-size: 12px;
      color: var(--text-muted);
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
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
