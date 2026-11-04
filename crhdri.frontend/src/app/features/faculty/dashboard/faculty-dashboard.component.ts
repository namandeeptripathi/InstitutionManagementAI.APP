import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { FacultyService } from '../../../core/services/faculty.service';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent } from '../../../shared/components/icon.component';

@Component({
  selector: 'app-faculty-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="dashboard-page">
      <!-- Loading Skeleton State -->
      @if (loading()) {
        <div class="skeleton-container" aria-busy="true" aria-label="Loading faculty dashboard">
          <div class="skeleton hero-skeleton"></div>
          <div class="metrics-grid">
            <div class="skeleton card-skeleton"></div>
            <div class="skeleton card-skeleton"></div>
            <div class="skeleton card-skeleton"></div>
            <div class="skeleton card-skeleton"></div>
          </div>
          <div class="content-split">
            <div class="skeleton panel-skeleton"></div>
            <div class="skeleton panel-skeleton"></div>
          </div>
        </div>
      }

      <!-- Error State -->
      @else if (errorMessage()) {
        <div class="error-banner card-modern" role="alert">
          <div class="error-icon-wrap">
            <app-icon name="alert" [size]="24"></app-icon>
          </div>
          <div class="error-text">
            <h3 class="error-title">Backend Synchronization Error</h3>
            <p class="error-desc">{{ errorMessage() }}</p>
            <p class="error-hint">Ensure the backend API at <code>http://localhost:5083</code> is active with PostgreSQL.</p>
          </div>
          <button class="btn btn-primary btn-sm" (click)="loadDashboard()">
            <app-icon name="refresh" [size]="14"></app-icon> Retry Connection
          </button>
        </div>
      }

      <!-- Loaded Faculty Dashboard Content -->
      @else if (data()) {
        <!-- Faculty Welcome Header Banner -->
        <section class="welcome-banner card-modern">
          <div class="banner-inner">
            <div class="banner-text">
              <div class="banner-meta-pills">
                <span class="badge badge-teal">
                  <app-icon name="badge-check" [size]="12"></app-icon>
                  FACULTY ACTIVE
                </span>
                <span class="meta-separator">&bull;</span>
                <span class="meta-tag font-mono">{{ data()?.faculty?.employeeCode }}</span>
                <span class="meta-separator">&bull;</span>
                <span class="meta-tag">{{ data()?.faculty?.designation }}</span>
                <span class="meta-separator">&bull;</span>
                <span class="meta-tag">{{ data()?.faculty?.department }}</span>
              </div>

              <h2 class="welcome-title">
                {{ greeting() }}, <span class="faculty-name-highlight">{{ data()?.faculty?.fullName }}</span>
              </h2>

              <p class="welcome-subtext">
                Welcome to your faculty management portal. You have
                <strong>{{ data()?.metrics?.totalAssignedClasses || 0 }} assigned courses</strong> with
                <strong>{{ data()?.metrics?.totalStudents || 0 }} registered students</strong> across active sections.
              </p>
            </div>

            <!-- Active Classes Counter Dial -->
            <div class="banner-dial-widget">
              <div class="classes-dial">
                <span class="dial-number">{{ data()?.metrics?.totalAssignedClasses || 0 }}</span>
                <span class="dial-caption">Active Courses</span>
              </div>
            </div>
          </div>
        </section>

        <!-- 4 Key Faculty Indicators -->
        <section class="metrics-grid" aria-label="Key Faculty Indicators">
          <!-- Card 1: Assigned Classes -->
          <a routerLink="/faculty/classes" class="card-modern card-interactive metric-card">
            <div class="metric-top">
              <span class="metric-icon-wrap teal">
                <app-icon name="courses" [size]="20"></app-icon>
              </span>
              <span class="badge badge-teal">Teaching</span>
            </div>
            <div class="metric-middle">
              <div class="metric-num">{{ data()?.metrics?.totalAssignedClasses || 0 }}</div>
              <div class="metric-lbl">Assigned Classes</div>
              <div class="metric-hint">Current instructional workload</div>
            </div>
            <div class="metric-bottom">
              <span class="card-link-text">Manage Classes <app-icon name="chevron-right" [size]="14"></app-icon></span>
            </div>
          </a>

          <!-- Card 2: Enrolled Students -->
          <a routerLink="/faculty/classes" class="card-modern card-interactive metric-card">
            <div class="metric-top">
              <span class="metric-icon-wrap blue">
                <app-icon name="profile" [size]="20"></app-icon>
              </span>
              <span class="badge badge-info">Roster</span>
            </div>
            <div class="metric-middle">
              <div class="metric-num">{{ data()?.metrics?.totalStudents || 0 }}</div>
              <div class="metric-lbl">Students Under Instruction</div>
              <div class="metric-hint">Enrolled across assigned cohorts</div>
            </div>
            <div class="metric-bottom">
              <span class="card-link-text">View Rosters <app-icon name="chevron-right" [size]="14"></app-icon></span>
            </div>
          </a>

          <!-- Card 3: Pending Submissions -->
          <a routerLink="/faculty/assignments" class="card-modern card-interactive metric-card">
            <div class="metric-top">
              <span class="metric-icon-wrap amber">
                <app-icon name="assignments" [size]="20"></app-icon>
              </span>
              <span class="badge" [class.badge-amber]="(data()?.metrics?.pendingSubmissions || 0) > 0" [class.badge-success]="(data()?.metrics?.pendingSubmissions || 0) === 0">
                {{ (data()?.metrics?.pendingSubmissions || 0) > 0 ? 'To Evaluate' : 'Up to Date' }}
              </span>
            </div>
            <div class="metric-middle">
              <div class="metric-num">{{ data()?.metrics?.pendingSubmissions || 0 }}</div>
              <div class="metric-lbl">Submissions to Grade</div>
              <div class="metric-hint">
                {{ (data()?.metrics?.pendingSubmissions || 0) > 0 ? 'Student deliverables awaiting scoring' : 'All assignments graded' }}
              </div>
            </div>
            <div class="metric-bottom">
              <span class="card-link-text">Grade Tasks <app-icon name="chevron-right" [size]="14"></app-icon></span>
            </div>
          </a>

          <!-- Card 4: Conducted Sessions -->
          <a routerLink="/faculty/attendance" class="card-modern card-interactive metric-card">
            <div class="metric-top">
              <span class="metric-icon-wrap green">
                <app-icon name="attendance" [size]="20"></app-icon>
              </span>
              <span class="badge badge-success">Sessions</span>
            </div>
            <div class="metric-middle">
              <div class="metric-num">{{ data()?.metrics?.conductedSessions || 0 }}</div>
              <div class="metric-lbl">Conducted Sessions</div>
              <div class="metric-hint">Recorded timetable & attendance logs</div>
            </div>
            <div class="metric-bottom">
              <span class="card-link-text">Attendance Register <app-icon name="chevron-right" [size]="14"></app-icon></span>
            </div>
          </a>
        </section>

        <!-- Main Content Split Grid -->
        <div class="content-split">
          <!-- Left Column: Assigned Teaching Schedule -->
          <div class="split-col-main">
            <div class="card-modern panel-card">
              <div class="panel-header">
                <div>
                  <h3 class="panel-title">Assigned Teaching Classes</h3>
                  <p class="panel-sub">Active subjects assigned to your instructional schedule for AY 2026-2027</p>
                </div>
                <a routerLink="/faculty/classes" class="btn btn-secondary btn-sm">
                  <span>Manage All</span>
                  <app-icon name="chevron-right" [size]="12"></app-icon>
                </a>
              </div>

              <div class="classes-list">
                @for (cls of data()?.assignedClasses; track cls.facultyAssignmentId) {
                  <div class="class-item card-modern">
                    <div class="class-main-info">
                      <div class="class-code-badge font-mono">{{ cls.subjectCode }}</div>
                      <div class="class-text">
                        <div class="class-title-row">
                          <h4 class="class-name">{{ cls.subjectName }}</h4>
                          <span class="badge badge-teal badge-sm">{{ cls.credits }} Credits</span>
                        </div>
                        <div class="class-meta-row">
                          <span class="class-course-name">{{ cls.courseName }}</span>
                          <span class="meta-separator">&bull;</span>
                          <span class="font-mono">Sem {{ cls.semester }} (Sec {{ cls.section }})</span>
                          <span class="meta-separator">&bull;</span>
                          <span class="font-mono">{{ cls.academicYear }}</span>
                        </div>
                      </div>
                    </div>

                    <div class="class-actions-cell">
                      <div class="student-count-pill font-mono">
                        <app-icon name="profile" [size]="13"></app-icon>
                        <span>{{ cls.enrolledStudentsCount }} Students</span>
                      </div>
                      <a
                        [routerLink]="['/faculty/materials', cls.facultyAssignmentId]"
                        class="btn btn-secondary btn-sm"
                        [title]="'View Learning Materials for ' + cls.subjectName"
                      >
                        <app-icon name="materials" [size]="12"></app-icon> Materials
                      </a>
                      <a
                        [routerLink]="['/faculty/assignments', cls.facultyAssignmentId]"
                        class="btn btn-secondary btn-sm"
                        [title]="'View Tasks for ' + cls.subjectName"
                      >
                        <app-icon name="assignments" [size]="12"></app-icon> Tasks
                      </a>
                      <a
                        [routerLink]="['/faculty/assessments', cls.facultyAssignmentId]"
                        class="btn btn-secondary btn-sm"
                        [title]="'Manage Quizzes for ' + cls.subjectName"
                      >
                        <app-icon name="assessments" [size]="12"></app-icon> Quizzes
                      </a>
                      <a
                        [routerLink]="['/faculty/classes', cls.facultyAssignmentId]"
                        class="btn btn-primary btn-sm"
                        [title]="'View Student Roster for ' + cls.subjectName"
                      >
                        <span>Roster</span>
                        <app-icon name="chevron-right" [size]="12"></app-icon>
                      </a>
                    </div>
                  </div>
                } @empty {
                  <div class="empty-tasks-state">
                    <app-icon name="courses" [size]="32"></app-icon>
                    <p>No teaching classes are currently assigned in the database.</p>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Right Column: Submissions to Grade & Recent Class Sessions -->
          <div class="split-col-side">
            <!-- Pending Grading Submissions -->
            <div class="card-modern panel-card">
              <div class="panel-header">
                <div>
                  <h3 class="panel-title">Submissions to Grade</h3>
                  <p class="panel-sub">Recent student uploads requiring evaluation</p>
                </div>
                <a routerLink="/faculty/assignments" class="btn btn-secondary btn-sm" title="Open Grading Console">
                  <span>Manage</span>
                  <app-icon name="chevron-right" [size]="12"></app-icon>
                </a>
              </div>

              <div class="pending-list">
                @for (sub of data()?.pendingGradingList; track sub.submissionId) {
                  <div class="pending-item">
                    <div class="pending-icon-box">
                      <app-icon name="assignments" [size]="15"></app-icon>
                    </div>
                    <div class="pending-details">
                      <div class="pending-assignment-title">{{ sub.assignmentTitle }}</div>
                      <div class="pending-student-meta">
                        <span class="student-name">{{ sub.studentName }}</span>
                        <span class="font-mono text-muted">({{ sub.enrollmentNumber }})</span>
                        <span class="meta-separator">&bull;</span>
                        <span class="subject-tag font-mono">{{ sub.subjectCode }}</span>
                      </div>
                      <div class="pending-time font-mono">Max: {{ sub.maxMarks }} &bull; {{ formatDate(sub.submittedAt) }}</div>
                    </div>
                  </div>
                } @empty {
                  <div class="empty-tasks-state">
                    <app-icon name="badge-check" [size]="24" class="check-icon"></app-icon>
                    <p>All student submissions have been evaluated.</p>
                  </div>
                }
              </div>
            </div>

            <!-- Recent Class Sessions -->
            <div class="card-modern panel-card">
              <div class="panel-header">
                <div>
                  <h3 class="panel-title">Recent Class Sessions</h3>
                  <p class="panel-sub">Lectures and attendance entries logged</p>
                </div>
              </div>

              <div class="sessions-list">
                @for (session of data()?.recentSessions; track session.sessionId) {
                  <div class="session-item">
                    <div class="session-date-box font-mono">
                      <span class="session-day">{{ session.sessionDate.slice(8, 10) }}</span>
                      <span class="session-mon">{{ formatMonth(session.sessionDate) }}</span>
                    </div>
                    <div class="session-details">
                      <div class="session-subject-row">
                        <span class="font-mono session-code">{{ session.subjectCode }}</span>
                        <span class="session-name">{{ session.subjectName }}</span>
                      </div>
                      <div class="session-meta">
                        <span>Sec {{ session.section }} (Sem {{ session.semester }})</span>
                        @if (session.startTime) {
                          <span class="meta-separator">&bull;</span>
                          <span>{{ session.startTime }} - {{ session.endTime }}</span>
                        }
                      </div>
                    </div>
                    <span class="badge badge-teal badge-sm">{{ session.sessionStatus }}</span>
                  </div>
                } @empty {
                  <div class="empty-tasks-state">
                    <p>No class sessions have been conducted yet.</p>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Skeleton Loading */
    .skeleton-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .hero-skeleton {
      height: 140px;
      border-radius: var(--radius-xl);
    }

    .card-skeleton {
      height: 130px;
      border-radius: var(--radius-lg);
    }

    .panel-skeleton {
      height: 300px;
      border-radius: var(--radius-lg);
    }

    /* Welcome Banner */
    .welcome-banner {
      padding: 24px 28px;
    }

    .banner-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }

    .banner-text {
      flex: 1;
    }

    .banner-meta-pills {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 12px;
      color: var(--text-secondary);
      flex-wrap: wrap;
    }

    .meta-separator {
      color: var(--border-medium);
    }

    .meta-tag {
      font-weight: 500;
    }

    .welcome-title {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.25;
      margin-bottom: 4px;
      letter-spacing: -0.01em;
    }

    .faculty-name-highlight {
      color: var(--color-teal);
    }

    .welcome-subtext {
      font-size: 13.5px;
      color: var(--text-secondary);
      line-height: 1.45;
    }

    .banner-dial-widget {
      flex-shrink: 0;
    }

    .classes-dial {
      width: 86px;
      height: 86px;
      border-radius: 50%;
      background: var(--color-teal-surface);
      border: 2px solid var(--color-teal-border);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .dial-number {
      font-size: 24px;
      font-weight: 800;
      color: var(--color-teal);
      line-height: 1;
    }

    .dial-caption {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    .metric-card {
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-decoration: none;
    }

    .metric-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .metric-middle {
      margin-bottom: 12px;
    }

    .metric-hint {
      font-size: 11.5px;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .metric-bottom {
      border-top: 1px solid var(--border-subtle);
      padding-top: 10px;
    }

    .card-link-text {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-teal);
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }

    /* Content Split */
    .content-split {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 18px;
    }

    .split-col-main,
    .split-col-side {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .panel-card {
      padding: 20px 22px;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 10px;
    }

    .panel-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.01em;
    }

    .panel-sub {
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 1px;
    }

    /* Class Item */
    .classes-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .class-item {
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .class-main-info {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .class-code-badge {
      padding: 3px 8px;
      background: var(--color-teal-surface);
      color: var(--color-teal);
      border: 1px solid var(--color-teal-border);
      border-radius: var(--radius-sm);
      font-size: 11.5px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .class-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .class-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .class-name {
      font-size: 14.5px;
      font-weight: 700;
      color: var(--text-main);
    }

    .class-meta-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-secondary);
      flex-wrap: wrap;
    }

    .class-actions-cell {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      border-top: 1px solid var(--border-subtle);
      padding-top: 10px;
    }

    .student-count-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      font-size: 11.5px;
      color: var(--text-secondary);
      margin-right: auto;
    }

    /* Pending items */
    .pending-list,
    .sessions-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .pending-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
    }

    .pending-icon-box {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-xs);
      background: var(--color-amber-surface);
      color: var(--color-amber);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .pending-details {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .pending-assignment-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
    }

    .pending-student-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      color: var(--text-secondary);
    }

    .student-name {
      font-weight: 600;
      color: var(--text-main);
    }

    .subject-tag {
      color: var(--color-teal);
      font-weight: 600;
    }

    .pending-time {
      font-size: 11px;
      color: var(--text-muted);
    }

    /* Sessions */
    .session-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
    }

    .session-date-box {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-sm);
      background: var(--color-teal-surface);
      color: var(--color-teal);
      border: 1px solid var(--color-teal-border);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      line-height: 1;
    }

    .session-day {
      font-size: 13px;
      font-weight: 800;
    }

    .session-mon {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .session-details {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .session-subject-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .session-code {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-teal);
    }

    .session-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .session-meta {
      font-size: 11.5px;
      color: var(--text-secondary);
    }

    /* Empty states */
    .empty-tasks-state {
      padding: 24px;
      text-align: center;
      color: var(--text-secondary);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
    }

    .check-icon {
      color: var(--color-success);
    }

    /* Error banner */
    .error-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 18px;
      background: var(--color-danger-surface);
      border-color: var(--color-danger-border);
    }

    .error-icon-wrap {
      color: var(--color-danger);
    }

    .error-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--color-danger);
      margin-bottom: 2px;
    }

    .error-desc {
      font-size: 13px;
      color: var(--text-main);
      margin-bottom: 2px;
    }

    .error-hint {
      font-size: 11.5px;
      color: var(--text-secondary);
    }

    @media (max-width: 1100px) {
      .metrics-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .content-split {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .metrics-grid {
        grid-template-columns: 1fr;
      }
      .banner-inner {
        flex-direction: column;
        align-items: flex-start;
      }
      .banner-dial-widget {
        display: none;
      }
    }
  `]
})
export class FacultyDashboardComponent implements OnInit {
  private readonly facultyService = inject(FacultyService);
  private readonly authService = inject(AuthService);

  readonly data = this.facultyService.dashboardData;
  readonly loading = this.facultyService.loading;
  readonly errorMessage = this.facultyService.error;

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.facultyService.getDashboard().subscribe({
      error: (err) => console.error('[FacultyDashboard] Load error:', err)
    });
  }

  greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  formatDate(dateString?: string | null): string {
    if (!dateString) return 'Pending';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  }

  formatMonth(dateString: string): string {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', { month: 'short' });
    } catch {
      return 'OCT';
    }
  }
}
