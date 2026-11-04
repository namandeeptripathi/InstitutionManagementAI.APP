import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StudentService } from '../../core/services/student.service';
import { DashboardResponse } from '../../core/models/student.models';
import { IconComponent } from '../../shared/components/icon.component';
import { AssignmentsService } from '../../core/services/assignments.service';
import { Assignment } from '../../core/models/student.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="dashboard-page">
      <!-- Loading Skeleton State -->
      @if (loading()) {
        <div class="skeleton-container" aria-busy="true" aria-label="Loading dashboard">
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
            <p class="error-hint">Ensure the backend API at <code>http://localhost:5083</code> is active and PostgreSQL is running.</p>
          </div>
          <button class="btn btn-primary btn-sm" (click)="loadDashboard()">
            <app-icon name="refresh" [size]="15"></app-icon>
            Retry Connection
          </button>
        </div>
      }

      <!-- Loaded Dashboard Content -->
      @else if (data()) {
        <!-- Welcome Banner (EduMate Inspired Clean Header) -->
        <section class="welcome-banner card-modern">
          <div class="banner-inner">
            <div class="banner-text">
              <div class="banner-meta-pills">
                <span class="badge badge-teal">
                  <app-icon name="badge-check" [size]="12"></app-icon>
                  {{ data()?.profile?.enrollmentStatus || 'ACTIVE' }}
                </span>
                <span class="meta-separator">&bull;</span>
                <span class="meta-tag font-mono">{{ data()?.profile?.enrollmentNumber }}</span>
                <span class="meta-separator">&bull;</span>
                <span class="meta-tag">Semester {{ data()?.profile?.semester }} &bull; Sec {{ data()?.profile?.section }}</span>
                <span class="meta-separator">&bull;</span>
                <span class="meta-tag">AY {{ data()?.profile?.academicYear }}</span>
              </div>

              <h2 class="welcome-title">
                {{ greeting() }}, <span class="student-name-highlight">{{ data()?.profile?.fullName }}</span>
              </h2>

              <p class="welcome-subtext">
                {{ data()?.profile?.course || data()?.profile?.courseName }}
                &bull; <span class="dept-text">{{ data()?.profile?.department }}</span>
              </p>
            </div>

            <!-- Attendance Circular Dial -->
            <div class="banner-attendance-widget">
              <div class="attendance-dial" [style.background]="getConicGradient(data()?.summary?.attendancePercentage || 0)">
                <div class="dial-cutout">
                  <span class="dial-number">{{ data()?.summary?.attendancePercentage || 0 }}%</span>
                  <span class="dial-caption">Attendance</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 4 Key Academic Metric Cards -->
        <section class="metrics-grid" aria-label="Key Academic Indicators">
          <!-- Card 1: Enrolled Courses -->
          <div class="card-modern card-interactive metric-card" routerLink="/courses">
            <div class="metric-top">
              <span class="metric-icon-wrap teal">
                <app-icon name="courses" [size]="20"></app-icon>
              </span>
              <span class="badge badge-teal">Enrolled</span>
            </div>
            <div class="metric-middle">
              <div class="metric-num">{{ data()?.summary?.totalCourses || 0 }}</div>
              <div class="metric-lbl">Active Courses</div>
              <div class="metric-hint">Current semester registered subjects</div>
            </div>
            <div class="metric-bottom">
              <span class="card-link-text">View Subjects <app-icon name="chevron-right" [size]="14"></app-icon></span>
            </div>
          </div>

          <!-- Card 2: Attendance Rate -->
          <div class="card-modern card-interactive metric-card" routerLink="/attendance">
            <div class="metric-top">
              <span class="metric-icon-wrap" [class.green]="(data()?.summary?.attendancePercentage || 0) >= 75" [class.amber]="(data()?.summary?.attendancePercentage || 0) < 75">
                <app-icon name="attendance" [size]="20"></app-icon>
              </span>
              <span class="badge" [class.badge-success]="(data()?.summary?.attendancePercentage || 0) >= 75" [class.badge-amber]="(data()?.summary?.attendancePercentage || 0) < 75">
                {{ (data()?.summary?.attendancePercentage || 0) >= 75 ? 'Good Standing' : 'Low Attendance' }}
              </span>
            </div>
            <div class="metric-middle">
              <div class="metric-num">{{ data()?.summary?.attendancePercentage || 0 }}%</div>
              <div class="metric-lbl">Overall Attendance</div>
              <div class="metric-hint">
                {{ data()?.summary?.attendedClasses }} attended of {{ data()?.summary?.totalClasses }} sessions
              </div>
            </div>
            <div class="metric-bottom">
              <div class="attendance-mini-track">
                <div class="attendance-mini-fill" [style.width.%]="data()?.summary?.attendancePercentage || 0"></div>
              </div>
            </div>
          </div>

          <!-- Card 3: Pending Assignments -->
          <div class="card-modern card-interactive metric-card" routerLink="/assignments">
            <div class="metric-top">
              <span class="metric-icon-wrap amber">
                <app-icon name="assignments" [size]="20"></app-icon>
              </span>
              <span class="badge badge-amber">Tasks</span>
            </div>
            <div class="metric-middle">
              <div class="metric-num">{{ data()?.summary?.pendingAssignments || 0 }}</div>
              <div class="metric-lbl">Pending Assignments</div>
              <div class="metric-hint">
                {{ (data()?.summary?.pendingAssignments || 0) === 0 ? 'All course assignments submitted' : 'Requires your submission' }}
              </div>
            </div>
            <div class="metric-bottom">
              <span class="card-link-text">Review Tasks <app-icon name="chevron-right" [size]="14"></app-icon></span>
            </div>
          </div>

          <!-- Card 4: Latest Assessment Result -->
          <div class="card-modern card-interactive metric-card" routerLink="/results">
            <div class="metric-top">
              <span class="metric-icon-wrap blue">
                <app-icon name="results" [size]="20"></app-icon>
              </span>
              <span class="badge badge-info">Latest Score</span>
            </div>
            <div class="metric-middle">
              @if (data()?.latestResult; as res) {
                <div class="metric-num">
                  {{ res.marksObtained | number:'1.0-1' }} <span class="metric-max-marks">/ {{ res.maxMarks }}</span>
                </div>
                <div class="metric-lbl text-truncate">{{ res.assessmentName }}</div>
                <div class="metric-hint font-mono">
                  Recorded {{ res.recordedAt | date:'mediumDate' }}
                </div>
              } @else {
                <div class="metric-num">&mdash;</div>
                <div class="metric-lbl">No results recorded</div>
                <div class="metric-hint">Assessments awaiting evaluation</div>
              }
            </div>
            <div class="metric-bottom">
              <span class="card-link-text">Full Results <app-icon name="chevron-right" [size]="14"></app-icon></span>
            </div>
          </div>
        </section>

        <!-- Main Dashboard Split Content -->
        <div class="content-split">
          <!-- Left Column: Upcoming Assignments & Quick Actions -->
          <div class="split-col-main">
            <!-- Assignments Card -->
            <div class="card-modern panel-card">
              <div class="panel-header">
                <div>
                  <h3 class="panel-title">Course Assignments & Deadlines</h3>
                  <p class="panel-sub">Synchronized in real-time from faculty course managers</p>
                </div>
                <a routerLink="/assignments" class="btn btn-secondary btn-sm">
                  View All ({{ assignments().length }})
                </a>
              </div>

              <div class="panel-body">
                @if (assignmentsLoading()) {
                  <div class="skeleton" style="height: 52px; margin-bottom: 8px;"></div>
                  <div class="skeleton" style="height: 52px;"></div>
                } @else if (assignments().length === 0) {
                  <div class="empty-tasks-state">
                    <app-icon name="check" [size]="22"></app-icon>
                    <span>No upcoming assignments scheduled at this time.</span>
                  </div>
                } @else {
                  <div class="assignment-list">
                    @for (item of assignments().slice(0, 3); track item.assignmentId) {
                      <div class="assignment-row" routerLink="/assignments">
                        <div class="item-status-icon" [class.is-submitted]="item.submissionStatus === 'SUBMITTED'">
                          <app-icon [name]="item.submissionStatus === 'SUBMITTED' ? 'check' : 'assignments'" [size]="15"></app-icon>
                        </div>
                        <div class="assignment-info">
                          <div class="assignment-title-line">
                            <span class="assignment-name">{{ item.title }}</span>
                            <span class="badge" [class.badge-success]="item.submissionStatus === 'SUBMITTED'" [class.badge-amber]="item.submissionStatus !== 'SUBMITTED'">
                              {{ item.submissionStatus === 'SUBMITTED' ? 'Submitted' : 'Pending' }}
                            </span>
                          </div>
                          <div class="assignment-meta-line">
                            <span class="meta-date">
                              <app-icon name="clock" [size]="12"></app-icon> Due: {{ item.dueAt | date:'mediumDate' }}
                            </span>
                            <span class="meta-separator">&bull;</span>
                            <span>Max Marks: {{ item.maxMarks }}</span>
                            @if (item.marksObtained !== null) {
                              <span class="meta-separator">&bull;</span>
                              <span class="score-highlight">Score: {{ item.marksObtained }} / {{ item.maxMarks }}</span>
                            }
                          </div>
                        </div>
                        <app-icon name="chevron-right" [size]="15" class="row-arrow"></app-icon>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Quick Action Shortcuts -->
            <div class="quick-shortcuts-panel card-modern">
              <span class="shortcuts-heading">Quick Actions:</span>
              <div class="shortcuts-buttons">
                <a routerLink="/assignments" class="btn btn-secondary btn-sm">
                  <app-icon name="upload" [size]="14"></app-icon> Submit Task
                </a>
                <a routerLink="/assessments" class="btn btn-secondary btn-sm">
                  <app-icon name="assessments" [size]="14"></app-icon> Start Quiz
                </a>
                <a routerLink="/attendance" class="btn btn-secondary btn-sm">
                  <app-icon name="attendance" [size]="14"></app-icon> Attendance Log
                </a>
                <a routerLink="/learning-materials" class="btn btn-secondary btn-sm">
                  <app-icon name="materials" [size]="14"></app-icon> Study Materials
                </a>
              </div>
            </div>
          </div>

          <!-- Right Column: Semester Progress & Verified Status -->
          <div class="split-col-side">
            <!-- Semester Progress Card -->
            <div class="card-modern panel-card">
              <h3 class="panel-title">Semester Timeline</h3>
              <p class="panel-sub">
                Enrolled term: Semester {{ data()?.profile?.semester }}, Academic Year {{ data()?.profile?.academicYear }}
              </p>

              <div class="timeline-block">
                <div class="timeline-labels">
                  <span class="timeline-title">Semester Progress</span>
                  <span class="timeline-val font-mono">Week 8 of 16</span>
                </div>
                <div class="timeline-track">
                  <div class="timeline-fill" style="width: 50%;"></div>
                </div>
              </div>

              <div class="academic-details-list">
                <div class="detail-line">
                  <span class="detail-label">Program</span>
                  <span class="detail-value">{{ data()?.profile?.course || data()?.profile?.courseName || 'B.Tech (AI & ML)' }}</span>
                </div>
                <div class="detail-line">
                  <span class="detail-label">Institution</span>
                  <span class="detail-value">CRHDRI University</span>
                </div>
                <div class="detail-line">
                  <span class="detail-label">Status</span>
                  <span class="detail-value">
                    <span class="badge badge-success">{{ data()?.profile?.enrollmentStatus || 'ACTIVE' }}</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Verified Real Backend Card -->
            <div class="verified-status-card">
              <div class="verified-top">
                <app-icon name="check" [size]="16" class="verified-icon"></app-icon>
                <span class="verified-heading">Live Academic Sync</span>
              </div>
              <p class="verified-caption">
                Connected to ASP.NET Core API at <code>http://localhost:5083</code> backed by PostgreSQL database <code>crhdri_institution_db</code>.
              </p>
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

    /* Error Banner */
    .error-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
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
      font-size: 13.5px;
      color: var(--text-main);
      margin-bottom: 3px;
    }

    .error-hint {
      font-size: 11.5px;
      color: var(--text-secondary);
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

    .student-name-highlight {
      color: var(--color-teal);
    }

    .welcome-subtext {
      font-size: 13.5px;
      color: var(--text-secondary);
    }

    .dept-text {
      font-weight: 600;
      color: var(--text-main);
    }

    /* Attendance Dial */
    .banner-attendance-widget {
      flex-shrink: 0;
    }

    .attendance-dial {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      padding: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
    }

    .dial-cutout {
      width: 100%;
      height: 100%;
      background: var(--bg-surface);
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .dial-number {
      font-size: 18px;
      font-weight: 800;
      color: var(--color-teal);
      line-height: 1;
    }

    .dial-caption {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
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
      line-height: 1.35;
      margin-top: 2px;
    }

    .metric-max-marks {
      font-size: 16px;
      color: var(--text-muted);
      font-weight: 400;
    }

    .text-truncate {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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

    .attendance-mini-track {
      width: 100%;
      height: 5px;
      background: var(--bg-surface-subtle);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .attendance-mini-fill {
      height: 100%;
      background: var(--color-teal);
      border-radius: var(--radius-full);
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

    .assignment-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .assignment-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .assignment-row:hover {
      background: #FFFFFF;
      border-color: var(--border-medium);
      transform: translateX(2px);
    }

    .item-status-icon {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: var(--color-amber-surface);
      color: var(--color-amber);
      border: 1px solid var(--color-amber-border);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .item-status-icon.is-submitted {
      background: var(--color-teal-surface);
      color: var(--color-teal);
      border-color: var(--color-teal-border);
    }

    .assignment-info {
      flex: 1;
      min-width: 0;
    }

    .assignment-title-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 2px;
    }

    .assignment-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
    }

    .assignment-meta-line {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--text-secondary);
    }

    .meta-date {
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }

    .score-highlight {
      color: var(--color-teal);
      font-weight: 600;
    }

    .row-arrow {
      color: var(--text-muted);
    }

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

    /* Quick Shortcuts */
    .quick-shortcuts-panel {
      padding: 14px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .shortcuts-heading {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-main);
    }

    .shortcuts-buttons {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    /* Timeline */
    .timeline-block {
      margin-top: 14px;
      margin-bottom: 18px;
    }

    .timeline-labels {
      display: flex;
      justify-content: space-between;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 5px;
    }

    .timeline-track {
      height: 6px;
      background: var(--bg-surface-subtle);
      border-radius: var(--radius-full);
      overflow: hidden;
      border: 1px solid var(--border-subtle);
    }

    .timeline-fill {
      height: 100%;
      background: var(--color-teal);
      border-radius: var(--radius-full);
    }

    .academic-details-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      border-top: 1px solid var(--border-subtle);
      padding-top: 12px;
    }

    .detail-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }

    .detail-label {
      color: var(--text-secondary);
    }

    .detail-value {
      font-weight: 600;
      color: var(--text-main);
    }

    /* Verified Card */
    .verified-status-card {
      padding: 14px 16px;
      background: var(--color-teal-surface);
      border: 1px solid var(--color-teal-border);
      border-radius: var(--radius-lg);
    }

    .verified-top {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }

    .verified-icon {
      color: var(--color-teal);
    }

    .verified-heading {
      font-size: 12px;
      font-weight: 700;
      color: var(--color-teal);
    }

    .verified-caption {
      font-size: 11.5px;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .verified-caption code {
      font-size: 10.5px;
      color: var(--color-teal-dark);
      background: rgba(15, 118, 110, 0.08);
      padding: 1px 4px;
      border-radius: 3px;
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
      .banner-attendance-widget {
        display: none;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly studentService = inject(StudentService);
  private readonly assignmentsService = inject(AssignmentsService);

  loading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);
  data = signal<DashboardResponse | null>(null);

  assignments = signal<Assignment[]>([]);
  assignmentsLoading = signal<boolean>(true);

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.studentService.getDashboard().subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Failed to connect to backend.');
        this.loading.set(false);
      }
    });

    this.assignmentsService.getAssignments().subscribe({
      next: (list) => {
        this.assignments.set(list || []);
        this.assignmentsLoading.set(false);
      },
      error: () => {
        this.assignmentsLoading.set(false);
      }
    });
  }

  greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  getConicGradient(pct: number): string {
    const color = pct >= 75 ? '#0F766E' : '#B91C1C';
    return `conic-gradient(${color} 0% ${pct}%, #E2E8F0 ${pct}% 100%)`;
  }
}
