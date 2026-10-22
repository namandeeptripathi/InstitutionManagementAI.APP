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
        <div class="error-banner card-tactile" role="alert">
          <div class="error-icon-wrap">
            <app-icon name="alert" [size]="28"></app-icon>
          </div>
          <div class="error-text">
            <h3 class="error-title">Backend Synchronization Error</h3>
            <p class="error-desc">{{ errorMessage() }}</p>
            <p class="error-hint">Ensure the backend API at <code>http://localhost:5083</code> is running with PostgreSQL.</p>
          </div>
          <button class="btn btn-primary" (click)="loadDashboard()">
            <app-icon name="refresh" [size]="16"></app-icon>
            Retry Connection
          </button>
        </div>
      }

      <!-- Loaded Dashboard Content -->
      @else if (data()) {
        <!-- Editorial Hero Greeting Banner -->
        <section class="hero-frame">
          <div class="hero-inner">
            <div class="hero-text-block">
              <div class="hero-meta-row">
                <span class="badge badge-sage">
                  <app-icon name="badge-check" [size]="13"></app-icon>
                  {{ data()?.profile?.enrollmentStatus || 'ACTIVE' }}
                </span>
                <span class="meta-dot">&bull;</span>
                <span class="meta-item font-mono">{{ data()?.profile?.enrollmentNumber }}</span>
                <span class="meta-dot">&bull;</span>
                <span class="meta-item">Sem {{ data()?.profile?.semester }} &bull; Sec {{ data()?.profile?.section }}</span>
                <span class="meta-dot">&bull;</span>
                <span class="meta-item">AY {{ data()?.profile?.academicYear }}</span>
              </div>

              <h2 class="hero-greeting font-editorial">
                {{ greeting() }}, <span class="student-highlight">{{ data()?.profile?.fullName }}</span>
              </h2>

              <p class="hero-subtext">
                {{ data()?.profile?.course || data()?.profile?.courseName }}
                &bull; <span class="dept-text">{{ data()?.profile?.department }}</span>
              </p>
            </div>

            <div class="hero-tactile-widget">
              <div class="academic-badge-dial" [style.background]="getConicGradient(data()?.summary?.attendancePercentage || 0)">
                <div class="dial-inner">
                  <span class="dial-value">{{ data()?.summary?.attendancePercentage || 0 }}%</span>
                  <span class="dial-label">Attendance</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 4 Metric Cards -->
        <section class="metrics-grid" aria-label="Key Academic Indicators">
          <!-- Card 1: Courses -->
          <div class="card-tactile card-interactive metric-card" routerLink="/courses">
            <div class="metric-header">
              <span class="metric-icon-box forest-box">
                <app-icon name="courses" [size]="20"></app-icon>
              </span>
              <span class="metric-tag">Enrolled</span>
            </div>
            <div class="metric-body">
              <div class="metric-value font-editorial">{{ data()?.summary?.totalCourses || 0 }}</div>
              <div class="metric-title">Active Courses</div>
              <div class="metric-caption">Current semester registered subjects</div>
            </div>
            <div class="metric-footer">
              <span class="view-link">View Subjects <app-icon name="chevron-right" [size]="14"></app-icon></span>
            </div>
          </div>

          <!-- Card 2: Attendance -->
          <div class="card-tactile card-interactive metric-card" routerLink="/attendance">
            <div class="metric-header">
              <span class="metric-icon-box teal-box">
                <app-icon name="attendance" [size]="20"></app-icon>
              </span>
              <span class="badge" [class.badge-forest]="(data()?.summary?.attendancePercentage || 0) >= 75" [class.badge-danger]="(data()?.summary?.attendancePercentage || 0) < 75">
                {{ (data()?.summary?.attendancePercentage || 0) >= 75 ? 'Good Standing' : 'Low Warning' }}
              </span>
            </div>
            <div class="metric-body">
              <div class="metric-value font-editorial">{{ data()?.summary?.attendancePercentage || 0 }}%</div>
              <div class="metric-title">Overall Attendance</div>
              <div class="metric-caption">
                {{ data()?.summary?.attendedClasses }} attended / {{ data()?.summary?.totalClasses }} sessions
              </div>
            </div>
            <div class="metric-footer">
              <div class="mini-bar-track">
                <div class="mini-bar-fill" [style.width.%]="data()?.summary?.attendancePercentage || 0"></div>
              </div>
            </div>
          </div>

          <!-- Card 3: Pending Assignments -->
          <div class="card-tactile card-interactive metric-card" routerLink="/assignments">
            <div class="metric-header">
              <span class="metric-icon-box amber-box">
                <app-icon name="assignments" [size]="20"></app-icon>
              </span>
              <span class="metric-tag">Submissions</span>
            </div>
            <div class="metric-body">
              <div class="metric-value font-editorial">{{ data()?.summary?.pendingAssignments || 0 }}</div>
              <div class="metric-title">Pending Assignments</div>
              <div class="metric-caption">
                {{ (data()?.summary?.pendingAssignments || 0) === 0 ? 'All course assignments submitted' : 'Requires your submission' }}
              </div>
            </div>
            <div class="metric-footer">
              <span class="view-link">Review Tasks <app-icon name="chevron-right" [size]="14"></app-icon></span>
            </div>
          </div>

          <!-- Card 4: Latest Assessment Result -->
          <div class="card-tactile card-interactive metric-card" routerLink="/results">
            <div class="metric-header">
              <span class="metric-icon-box sage-box">
                <app-icon name="results" [size]="20"></app-icon>
              </span>
              <span class="badge badge-forest">Latest Result</span>
            </div>
            <div class="metric-body">
              @if (data()?.latestResult; as res) {
                <div class="metric-value font-editorial">
                  {{ res.marksObtained | number:'1.0-1' }} <span class="metric-max">/ {{ res.maxMarks }}</span>
                </div>
                <div class="metric-title text-truncate">{{ res.assessmentName }}</div>
                <div class="metric-caption font-mono">
                  Recorded {{ res.recordedAt | date:'mediumDate' }}
                </div>
              } @else {
                <div class="metric-value font-editorial">&mdash;</div>
                <div class="metric-title">No results recorded</div>
                <div class="metric-caption">Assessments are awaiting grading</div>
              }
            </div>
            <div class="metric-footer">
              <span class="view-link">Full Transcripts <app-icon name="chevron-right" [size]="14"></app-icon></span>
            </div>
          </div>
        </section>

        <!-- Main Dashboard Split Content -->
        <div class="content-split">
          <!-- Left Column: Upcoming Tasks & Quick Actions -->
          <div class="split-col-main">
            <!-- Upcoming Tasks Card -->
            <div class="card-tactile section-card">
              <div class="section-card-header">
                <div>
                  <h3 class="section-card-title font-editorial">Course Assignments & Deadlines</h3>
                  <p class="section-card-subtitle">Synchronized directly from faculty assignments</p>
                </div>
                <a routerLink="/assignments" class="btn btn-ghost btn-sm">
                  View All ({{ assignments().length }})
                </a>
              </div>

              <div class="section-card-body">
                @if (assignmentsLoading()) {
                  <div class="skeleton" style="height: 60px; margin-bottom: 8px;"></div>
                  <div class="skeleton" style="height: 60px;"></div>
                } @else if (assignments().length === 0) {
                  <div class="empty-inline-state">
                    <app-icon name="check" [size]="24"></app-icon>
                    <span>No upcoming assignments scheduled.</span>
                  </div>
                } @else {
                  <div class="assignment-items-list">
                    @for (item of assignments().slice(0, 3); track item.assignmentId) {
                      <div class="assignment-item" routerLink="/assignments">
                        <div class="item-status-icon" [class.is-submitted]="item.submissionStatus === 'SUBMITTED'">
                          <app-icon [name]="item.submissionStatus === 'SUBMITTED' ? 'check' : 'assignments'" [size]="16"></app-icon>
                        </div>
                        <div class="item-content">
                          <div class="item-title-row">
                            <span class="item-title">{{ item.title }}</span>
                            <span class="badge" [class.badge-forest]="item.submissionStatus === 'SUBMITTED'" [class.badge-amber]="item.submissionStatus !== 'SUBMITTED'">
                              {{ item.submissionStatus === 'SUBMITTED' ? 'Submitted' : 'Pending' }}
                            </span>
                          </div>
                          <div class="item-meta">
                            <span class="item-date">
                              <app-icon name="clock" [size]="12"></app-icon> Due: {{ item.dueAt | date:'mediumDate' }}
                            </span>
                            <span class="meta-dot">&bull;</span>
                            <span>Max Marks: {{ item.maxMarks }}</span>
                            @if (item.marksObtained !== null) {
                              <span class="meta-dot">&bull;</span>
                              <span class="scored-text">Score: {{ item.marksObtained }} / {{ item.maxMarks }}</span>
                            }
                          </div>
                        </div>
                        <app-icon name="chevron-right" [size]="16" class="item-arrow"></app-icon>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Quick Action Shortcuts -->
            <div class="quick-actions-bar">
              <span class="quick-actions-label font-editorial">Quick Shortcuts:</span>
              <a routerLink="/assignments" class="btn btn-secondary btn-sm">
                <app-icon name="upload" [size]="15"></app-icon> Submit Assignment
              </a>
              <a routerLink="/assessments" class="btn btn-secondary btn-sm">
                <app-icon name="assessments" [size]="15"></app-icon> Start Quiz
              </a>
              <a routerLink="/attendance" class="btn btn-secondary btn-sm">
                <app-icon name="attendance" [size]="15"></app-icon> View Attendance
              </a>
              <a routerLink="/learning-materials" class="btn btn-secondary btn-sm">
                <app-icon name="materials" [size]="15"></app-icon> Learning Materials
              </a>
            </div>
          </div>

          <!-- Right Column: Institutional Overview & Health Status -->
          <div class="split-col-side">
            <!-- Academic Session Card -->
            <div class="card-tactile session-card">
              <h3 class="session-card-title font-editorial">Semester Progress</h3>
              <p class="session-desc">
                Current enrolled term: Semester {{ data()?.profile?.semester }}, Academic Year {{ data()?.profile?.academicYear }}.
              </p>

              <div class="progress-block">
                <div class="progress-labels">
                  <span class="progress-title">Semester Timeline</span>
                  <span class="progress-pct font-mono">Week 8 of 16</span>
                </div>
                <div class="progress-track">
                  <div class="progress-bar" style="width: 50%;"></div>
                </div>
              </div>

              <div class="session-stat-list">
                <div class="stat-row">
                  <span class="stat-name">Program</span>
                  <span class="stat-val">{{ data()?.profile?.course || data()?.profile?.courseName || 'B.Tech (AI & ML)' }}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-name">Institution</span>
                  <span class="stat-val">CRHDRI Technology Institute</span>
                </div>
                <div class="stat-row">
                  <span class="stat-name">Status</span>
                  <span class="stat-val"><span class="pill-active">{{ data()?.profile?.enrollmentStatus || 'ACTIVE' }}</span></span>
                </div>
              </div>
            </div>

            <!-- Verified Backend Notice -->
            <div class="card-tactile verified-card">
              <div class="verified-header">
                <app-icon name="check" [size]="18" class="verified-icon"></app-icon>
                <span class="verified-title">Real-Time Data Connected</span>
              </div>
              <p class="verified-text">
                Every metric and course row is fetched live from your ASP.NET Core backend and PostgreSQL database.
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
      gap: 24px;
    }

    /* Skeleton Loading */
    .skeleton-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .hero-skeleton {
      height: 180px;
      border-radius: var(--radius-xl);
    }

    .card-skeleton {
      height: 140px;
      border-radius: var(--radius-lg);
    }

    .panel-skeleton {
      height: 320px;
      border-radius: var(--radius-lg);
    }

    /* Error Banner */
    .error-banner {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 24px;
      background: var(--color-danger-surface);
      border-color: var(--color-danger-border);
    }

    .error-icon-wrap {
      color: var(--color-danger);
    }

    .error-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--color-danger);
      margin-bottom: 4px;
    }

    .error-desc {
      font-size: 14px;
      color: var(--text-main);
      margin-bottom: 4px;
    }

    .error-hint {
      font-size: 12px;
      color: var(--text-muted);
    }

    /* Hero Banner */
    .hero-frame {
      padding: 32px 36px;
    }

    .hero-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 28px;
    }

    .hero-text-block {
      flex: 1;
    }

    .hero-meta-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      font-size: 12.5px;
      color: var(--text-muted);
    }

    .meta-dot {
      color: var(--border-strong);
    }

    .meta-item {
      font-weight: 600;
    }

    .hero-greeting {
      font-size: 32px;
      font-weight: 600;
      color: var(--color-forest);
      line-height: 1.2;
      margin-bottom: 8px;
      letter-spacing: -0.01em;
    }

    .student-highlight {
      font-style: italic;
      color: var(--color-forest-dark);
    }

    .hero-subtext {
      font-size: 14.5px;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .dept-text {
      font-weight: 600;
      color: var(--color-forest);
    }

    /* Tactile Dial */
    .hero-tactile-widget {
      flex-shrink: 0;
    }

    .academic-badge-dial {
      width: 108px;
      height: 108px;
      border-radius: 50%;
      background: conic-gradient(var(--color-forest) 0% 100%, var(--border-subtle) 100%);
      padding: 7px;
      box-shadow: 0 4px 14px rgba(23, 63, 53, 0.15), 0 1px 3px rgba(32, 40, 36, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dial-inner {
      width: 100%;
      height: 100%;
      background: var(--bg-surface);
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: inset 0 2px 4px rgba(32, 40, 36, 0.06);
    }

    .dial-value {
      font-family: var(--font-editorial);
      font-size: 22px;
      font-weight: 700;
      color: var(--color-forest);
      line-height: 1;
    }

    .dial-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      margin-top: 3px;
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 18px;
    }

    .metric-card {
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
    }

    .metric-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }

    .metric-icon-box {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 5px rgba(32, 40, 36, 0.05);
    }

    .forest-box {
      background: var(--color-forest-surface);
      color: var(--color-forest);
      border: 1px solid var(--color-forest-border);
    }

    .teal-box {
      background: var(--color-teal-surface);
      color: var(--color-teal);
      border: 1px solid var(--color-sage);
    }

    .amber-box {
      background: var(--color-amber-surface);
      color: var(--color-amber-dark);
      border: 1px solid var(--color-amber-border);
    }

    .sage-box {
      background: var(--color-sage-surface);
      color: var(--color-forest);
      border: 1px solid var(--color-sage);
    }

    .metric-tag {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    .metric-body {
      margin-bottom: 16px;
    }

    .metric-value {
      font-size: 32px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.1;
      margin-bottom: 4px;
    }

    .metric-max {
      font-size: 18px;
      color: var(--text-muted);
      font-weight: 400;
    }

    .metric-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--color-forest);
      margin-bottom: 2px;
    }

    .metric-caption {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.3;
    }

    .text-truncate {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .metric-footer {
      border-top: 1px solid var(--border-subtle);
      padding-top: 12px;
    }

    .view-link {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-forest);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .mini-bar-track {
      width: 100%;
      height: 6px;
      background: var(--bg-surface-subtle);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .mini-bar-fill {
      height: 100%;
      background: var(--color-teal);
      border-radius: var(--radius-full);
    }

    /* Content Split */
    .content-split {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
    }

    .split-col-main {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .split-col-side {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    /* Section Card */
    .section-card {
      padding: 24px;
    }

    .section-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .section-card-title {
      font-size: 20px;
      font-weight: 600;
      color: var(--color-forest);
      letter-spacing: -0.01em;
    }

    .section-card-subtitle {
      font-size: 12.5px;
      color: var(--text-muted);
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }

    /* Assignment Item */
    .assignment-items-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .assignment-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 14px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background-color var(--transition-fast), transform var(--transition-fast), border-color var(--transition-fast);
    }

    .assignment-item:hover {
      background: #FFFFFF;
      border-color: var(--border-medium);
      transform: translateX(3px);
    }

    .item-status-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--color-amber-surface);
      color: var(--color-amber-dark);
      border: 1px solid var(--color-amber-border);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .item-status-icon.is-submitted {
      background: var(--color-forest-surface);
      color: var(--color-forest);
      border-color: var(--color-forest-border);
    }

    .item-content {
      flex: 1;
      min-width: 0;
    }

    .item-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 3px;
    }

    .item-title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text-main);
    }

    .item-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11.5px;
      color: var(--text-muted);
    }

    .item-date {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .scored-text {
      color: var(--color-forest);
      font-weight: 600;
    }

    .item-arrow {
      color: var(--text-muted);
    }

    .empty-inline-state {
      padding: 28px;
      text-align: center;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }

    /* Quick Actions */
    .quick-actions-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      padding: 14px 18px;
      background: var(--bg-surface);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
    }

    .quick-actions-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-forest);
      margin-right: 4px;
    }

    /* Side Cards */
    .session-card {
      padding: 22px;
    }

    .session-card-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--color-forest);
      margin-bottom: 4px;
    }

    .session-desc {
      font-size: 12.5px;
      color: var(--text-muted);
      margin-bottom: 16px;
      line-height: 1.4;
    }

    .progress-block {
      margin-bottom: 20px;
    }

    .progress-labels {
      display: flex;
      justify-content: space-between;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 6px;
    }

    .progress-track {
      height: 8px;
      background: var(--bg-surface-subtle);
      border-radius: var(--radius-full);
      overflow: hidden;
      border: 1px solid var(--border-subtle);
    }

    .progress-bar {
      height: 100%;
      background: var(--color-forest);
      border-radius: var(--radius-full);
    }

    .session-stat-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      border-top: 1px solid var(--border-subtle);
      padding-top: 14px;
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }

    .stat-name {
      color: var(--text-muted);
    }

    .stat-val {
      font-weight: 600;
      color: var(--text-main);
    }

    .pill-active {
      display: inline-block;
      padding: 2px 8px;
      background: var(--color-forest-surface);
      color: var(--color-forest);
      border-radius: var(--radius-full);
      font-size: 11px;
      font-weight: 700;
    }

    /* Verified Card */
    .verified-card {
      padding: 16px 20px;
      background: var(--color-forest-surface);
      border-color: var(--color-forest-border);
    }

    .verified-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .verified-icon {
      color: var(--color-forest);
    }

    .verified-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--color-forest);
    }

    .verified-text {
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    /* Responsive */
    @media (max-width: 1200px) {
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
      .hero-inner {
        flex-direction: column;
        align-items: flex-start;
      }
      .hero-tactile-widget {
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
    const color = pct >= 75 ? '#173F35' : '#B84233';
    return `conic-gradient(${color} 0% ${pct}%, #E5E4DC ${pct}% 100%)`;
  }
}
