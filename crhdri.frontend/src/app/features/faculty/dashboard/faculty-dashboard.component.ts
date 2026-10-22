import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { FacultyService } from '../../../core/services/faculty.service';
import { AuthService } from '../../../core/services/auth.service';
import { FacultyDashboardResponse } from '../../../core/models/faculty.models';
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

      <!-- Loaded Faculty Dashboard Content -->
      @else if (data()) {
        <!-- Editorial Hero Greeting Banner -->
        <section class="hero-frame">
          <div class="hero-inner">
            <div class="hero-text-block">
              <div class="hero-meta-row">
                <span class="badge badge-sage">
                  <app-icon name="badge-check" [size]="13"></app-icon>
                  FACULTY ACTIVE
                </span>
                <span class="meta-dot">&bull;</span>
                <span class="meta-item font-mono">{{ data()?.faculty?.employeeCode }}</span>
                <span class="meta-dot">&bull;</span>
                <span class="meta-item">{{ data()?.faculty?.designation }}</span>
                <span class="meta-dot">&bull;</span>
                <span class="meta-item">{{ data()?.faculty?.department }}</span>
              </div>

              <h2 class="hero-greeting font-editorial">
                {{ greeting() }}, <span class="faculty-highlight">{{ data()?.faculty?.fullName }}</span>
              </h2>

              <p class="hero-subtext">
                Welcome to your academic faculty workspace. You have
                <strong>{{ data()?.metrics?.totalAssignedClasses || 0 }} assigned courses</strong> with
                <strong>{{ data()?.metrics?.totalStudents || 0 }} registered students</strong> across active sections.
              </p>
            </div>

            <div class="hero-tactile-widget">
              <div class="academic-badge-dial">
                <div class="dial-inner">
                  <span class="dial-value">{{ data()?.metrics?.totalAssignedClasses || 0 }}</span>
                  <span class="dial-label">Active Classes</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 4 Key Performance Indicator (KPI) Metric Cards -->
        <section class="metrics-grid" aria-label="Key Faculty Indicators">
          <!-- Card 1: Assigned Classes -->
          <a routerLink="/faculty/classes" class="card-tactile card-interactive metric-card metric-card-link">
            <div class="metric-header">
              <span class="metric-icon-box forest-box">
                <app-icon name="courses" [size]="20"></app-icon>
              </span>
              <span class="metric-tag">Workload</span>
            </div>
            <div class="metric-body">
              <div class="metric-value font-editorial">{{ data()?.metrics?.totalAssignedClasses || 0 }}</div>
              <div class="metric-title">Assigned Classes</div>
              <div class="metric-caption">Across Sem 5 &bull; Section A</div>
            </div>
            <div class="metric-footer">
              <span class="view-link">View All Classes <app-icon name="chevron-right" [size]="14"></app-icon></span>
            </div>
          </a>

          <!-- Card 2: Enrolled Students -->
          <a routerLink="/faculty/classes" class="card-tactile card-interactive metric-card metric-card-link">
            <div class="metric-header">
              <span class="metric-icon-box teal-box">
                <app-icon name="profile" [size]="20"></app-icon>
              </span>
              <span class="badge badge-forest">Active</span>
            </div>
            <div class="metric-body">
              <div class="metric-value font-editorial">{{ data()?.metrics?.totalStudents || 0 }}</div>
              <div class="metric-title">Students Under Instruction</div>
              <div class="metric-caption">Enrolled students in assigned cohorts</div>
            </div>
            <div class="metric-footer">
              <span class="view-link">Student Rosters <app-icon name="chevron-right" [size]="14"></app-icon></span>
            </div>
          </a>

          <!-- Card 3: Pending Submissions -->
          <a routerLink="/faculty/assignments" class="card-tactile card-interactive metric-card metric-card-link">
            <div class="metric-header">
              <span class="metric-icon-box amber-box">
                <app-icon name="assignments" [size]="20"></app-icon>
              </span>
              <span class="badge" [class.badge-amber]="(data()?.metrics?.pendingSubmissions || 0) > 0" [class.badge-forest]="(data()?.metrics?.pendingSubmissions || 0) === 0">
                {{ (data()?.metrics?.pendingSubmissions || 0) > 0 ? 'Pending Review' : 'Up to Date' }}
              </span>
            </div>
            <div class="metric-body">
              <div class="metric-value font-editorial">{{ data()?.metrics?.pendingSubmissions || 0 }}</div>
              <div class="metric-title">Submissions to Grade</div>
              <div class="metric-caption">
                {{ (data()?.metrics?.pendingSubmissions || 0) > 0 ? 'Student submissions awaiting grading' : 'All assignments graded' }}
              </div>
            </div>
            <div class="metric-footer">
              <span class="view-link">Grade Submissions <app-icon name="chevron-right" [size]="14"></app-icon></span>
            </div>
          </a>

          <!-- Card 4: Conducted Sessions -->
          <a routerLink="/faculty/attendance" class="card-tactile card-interactive metric-card metric-card-link">
            <div class="metric-header">
              <span class="metric-icon-box sage-box">
                <app-icon name="attendance" [size]="20"></app-icon>
              </span>
              <span class="metric-tag">Sessions</span>
            </div>
            <div class="metric-body">
              <div class="metric-value font-editorial">{{ data()?.metrics?.conductedSessions || 0 }}</div>
              <div class="metric-title">Conducted Sessions</div>
              <div class="metric-caption">Recorded lecture & attendance logs</div>
            </div>
            <div class="metric-footer">
              <span class="view-link">Attendance Logs <app-icon name="chevron-right" [size]="14"></app-icon></span>
            </div>
          </a>
        </section>

        <!-- Main Content Split Grid -->
        <div class="content-split">
          <!-- Left Column: Assigned Classes & Subject Workload -->
          <div class="split-column main-col">
            <div class="card-tactile content-card">
              <div class="card-header">
                <div class="header-titles">
                  <h3 class="card-title font-editorial">Assigned Teaching Schedule</h3>
                  <p class="card-subtitle">Active subjects assigned to your instructional workload for AY 2026-2027</p>
                </div>
                <div class="header-actions">
                  <a routerLink="/faculty/classes" class="btn btn-outline btn-sm manage-classes-btn">
                    <span>Manage Classes</span>
                    <app-icon name="chevron-right" [size]="12"></app-icon>
                  </a>
                </div>
              </div>

              <div class="classes-list">
                @for (cls of data()?.assignedClasses; track cls.facultyAssignmentId) {
                  <div class="class-item card-subtle">
                    <div class="class-main-info">
                      <div class="class-code-badge font-mono">{{ cls.subjectCode }}</div>
                      <div class="class-text">
                        <div class="class-title-row">
                          <h4 class="class-name">{{ cls.subjectName }}</h4>
                          <span class="badge badge-amber badge-sm">{{ cls.credits }} Credits</span>
                        </div>
                        <div class="class-meta-row">
                          <span class="class-course-name">{{ cls.courseName }}</span>
                          <span class="meta-dot">&bull;</span>
                          <span class="class-spec font-mono">Sem {{ cls.semester }} (Sec {{ cls.section }})</span>
                          <span class="meta-dot">&bull;</span>
                          <span class="class-year font-mono">{{ cls.academicYear }}</span>
                        </div>
                      </div>
                    </div>

                    <div class="class-actions-cell">
                      <div class="class-stats-pill">
                        <div class="stat-group">
                          <app-icon name="profile" [size]="15" class="stat-icon"></app-icon>
                          <span class="stat-num">{{ cls.enrolledStudentsCount }}</span>
                          <span class="stat-lbl">{{ cls.enrolledStudentsCount === 1 ? 'Student' : 'Students' }}</span>
                        </div>
                      </div>
                      <a
                        [routerLink]="['/faculty/materials', cls.facultyAssignmentId]"
                        class="btn btn-secondary btn-sm view-tasks-btn"
                        [title]="'View Learning Materials for ' + cls.subjectName"
                      >
                        <app-icon name="materials" [size]="12"></app-icon>
                        <span>Materials</span>
                      </a>
                      <a
                        [routerLink]="['/faculty/assignments', cls.facultyAssignmentId]"
                        class="btn btn-secondary btn-sm view-tasks-btn"
                        [title]="'View Tasks and Assignments for ' + cls.subjectName"
                      >
                        <app-icon name="assignments" [size]="12"></app-icon>
                        <span>Tasks</span>
                      </a>
                      <a
                        [routerLink]="['/faculty/assessments', cls.facultyAssignmentId]"
                        class="btn btn-secondary btn-sm view-tasks-btn"
                        [title]="'Manage Quizzes & Assessments for ' + cls.subjectName"
                      >
                        <app-icon name="assessments" [size]="12"></app-icon>
                        <span>Quizzes</span>
                      </a>
                      <a
                        [routerLink]="['/faculty/classes', cls.facultyAssignmentId]"
                        class="btn btn-primary btn-sm view-roster-btn"
                        [title]="'View Student Roster for ' + cls.subjectName"
                      >
                        <span>Roster</span>
                        <app-icon name="chevron-right" [size]="12"></app-icon>
                      </a>
                    </div>
                  </div>
                } @empty {
                  <div class="empty-state">
                    <app-icon name="courses" [size]="36" class="empty-icon"></app-icon>
                    <p class="empty-text">No teaching classes are currently assigned in the database.</p>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Right Column: Recent Submissions Pending Review & Recent Class Sessions -->
          <div class="split-column side-col">
            <!-- Pending Grading Submissions -->
            <div class="card-tactile content-card">
              <div class="card-header">
                <div class="header-titles">
                  <h3 class="card-title font-editorial">Submissions to Grade</h3>
                  <p class="card-subtitle">Recent student uploads requiring evaluation</p>
                </div>
                <a routerLink="/faculty/assignments" class="btn btn-secondary btn-xs" title="Open Grading Console">
                  <span>Manage</span>
                  <app-icon name="chevron-right" [size]="12"></app-icon>
                </a>
              </div>

              <div class="pending-list">
                @for (sub of data()?.pendingGradingList; track sub.submissionId) {
                  <div class="pending-item">
                    <div class="pending-icon-box">
                      <app-icon name="assignments" [size]="16"></app-icon>
                    </div>
                    <div class="pending-details">
                      <div class="pending-assignment-title">{{ sub.assignmentTitle }}</div>
                      <div class="pending-student-meta">
                        <span class="student-name">{{ sub.studentName }}</span>
                        <span class="font-mono enrollment-code">({{ sub.enrollmentNumber }})</span>
                        <span class="meta-dot">&bull;</span>
                        <span class="subject-tag font-mono">{{ sub.subjectCode }}</span>
                      </div>
                      <div class="pending-time">Max Marks: {{ sub.maxMarks }} &bull; Submitted on {{ formatDate(sub.submittedAt) }}</div>
                    </div>
                  </div>
                } @empty {
                  <div class="empty-state-mini">
                    <app-icon name="badge-check" [size]="24" class="check-icon"></app-icon>
                    <p>All student submissions have been evaluated.</p>
                  </div>
                }
              </div>
            </div>

            <!-- Recent Class Sessions -->
            <div class="card-tactile content-card">
              <div class="card-header">
                <div class="header-titles">
                  <h3 class="card-title font-editorial">Recent Class Sessions</h3>
                  <p class="card-subtitle">Lectures and attendance entries logged</p>
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
                          <span class="meta-dot">&bull;</span>
                          <span>{{ session.startTime }} - {{ session.endTime }}</span>
                        }
                      </div>
                    </div>
                    <span class="badge badge-sage badge-sm">{{ session.sessionStatus }}</span>
                  </div>
                } @empty {
                  <div class="empty-state-mini">
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
      gap: 24px;
      padding-bottom: 32px;
    }

    /* Hero Frame */
    .hero-frame {
      background: linear-gradient(135deg, var(--color-forest) 0%, var(--color-forest-dark) 100%);
      border-radius: var(--radius-xl);
      padding: 32px;
      color: #FFFFFF;
      box-shadow: 0 4px 20px rgba(23, 63, 53, 0.15);
      position: relative;
      overflow: hidden;
    }

    .hero-frame::after {
      content: '';
      position: absolute;
      top: -40px;
      right: -40px;
      width: 220px;
      height: 220px;
      background: radial-gradient(circle, rgba(217, 119, 6, 0.18) 0%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
    }

    .hero-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      position: relative;
      z-index: 1;
    }

    .hero-text-block {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 680px;
    }

    .hero-meta-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.85);
    }

    .meta-dot {
      opacity: 0.5;
    }

    .hero-greeting {
      font-size: 28px;
      font-weight: 600;
      color: #FFFFFF;
      line-height: 1.2;
    }

    .faculty-highlight {
      color: #fde68a;
    }

    .hero-subtext {
      font-size: 14px;
      line-height: 1.5;
      color: rgba(255, 255, 255, 0.85);
      margin: 0;
    }

    .hero-subtext strong {
      color: #FFFFFF;
      font-weight: 700;
    }

    /* Dial Widget */
    .hero-tactile-widget {
      flex-shrink: 0;
    }

    .academic-badge-dial {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.12);
      border: 2px solid rgba(255, 255, 255, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .dial-inner {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: var(--color-forest-dark);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .dial-value {
      font-size: 22px;
      font-weight: 800;
      color: #FFFFFF;
      font-family: var(--font-editorial);
      line-height: 1;
    }

    .dial-label {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.7);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 3px;
    }

    /* KPI Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 18px;
    }

    .metric-card {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #FFFFFF;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle);
      transition: all var(--transition-fast);
      cursor: pointer;
    }

    .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-tactile-hover);
      border-color: var(--color-forest-border);
    }

    .metric-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .metric-icon-box {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .forest-box {
      background: var(--color-forest-surface);
      color: var(--color-forest);
    }

    .teal-box {
      background: rgba(13, 148, 136, 0.1);
      color: #0f766e;
    }

    .amber-box {
      background: rgba(217, 119, 6, 0.1);
      color: var(--color-amber-dark);
    }

    .sage-box {
      background: rgba(59, 130, 246, 0.1);
      color: #2563eb;
    }

    .metric-tag {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-muted);
      letter-spacing: 0.05em;
    }

    .metric-body {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .metric-value {
      font-size: 32px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1;
    }

    .metric-title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--color-forest);
    }

    .metric-caption {
      font-size: 12px;
      color: var(--text-muted);
    }

    .metric-footer {
      margin-top: auto;
      padding-top: 10px;
      border-top: 1px solid var(--border-subtle);
    }

    .view-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-forest);
    }

    /* Content Split Grid */
    .content-split {
      display: grid;
      grid-template-columns: 1.25fr 1fr;
      gap: 20px;
      align-items: start;
    }

    .split-column {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .content-card {
      background: #FFFFFF;
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-subtle);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .card-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--color-forest);
      margin: 0;
    }

    .card-subtitle {
      font-size: 12.5px;
      color: var(--text-secondary);
      margin: 0;
    }

    /* Classes List */
    .classes-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .class-item {
      padding: 16px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      transition: all var(--transition-fast);
    }

    .class-item:hover {
      background: #FFFFFF;
      border-color: var(--color-forest-border);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    .class-main-info {
      display: flex;
      align-items: center;
      gap: 14px;
      flex: 1;
      min-width: 0;
    }

    .class-code-badge {
      width: 64px;
      height: 48px;
      border-radius: var(--radius-md);
      background: var(--color-forest-surface);
      color: var(--color-forest);
      border: 1px solid var(--color-forest-border);
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .class-text {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }

    .class-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .class-name {
      font-size: 14.5px;
      font-weight: 700;
      color: var(--text-main);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .class-meta-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-muted);
      flex-wrap: wrap;
    }

    .class-course-name {
      color: var(--text-secondary);
      font-weight: 500;
    }

    .class-stats-pill {
      display: flex;
      align-items: center;
      background: #FFFFFF;
      border: 1px solid var(--border-subtle);
      padding: 6px 12px;
      border-radius: var(--radius-full);
      flex-shrink: 0;
    }

    .stat-group {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-main);
    }

    .stat-icon {
      color: var(--color-forest);
    }

    .stat-num {
      font-weight: 700;
      color: var(--color-forest);
    }

    .metric-card-link {
      text-decoration: none;
      color: inherit;
    }

    .manage-classes-btn {
      font-size: 11.5px;
      padding: 5px 12px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
    }

    .class-actions-cell {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    .view-roster-btn {
      font-size: 11.5px;
      padding: 5px 12px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      text-decoration: none;
    }

    .stat-lbl {
      color: var(--text-secondary);
    }

    /* Pending List */
    .pending-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .pending-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      background: var(--bg-surface-subtle);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
    }

    .pending-icon-box {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      background: rgba(217, 119, 6, 0.12);
      color: var(--color-amber-dark);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
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
      font-weight: 700;
      color: var(--text-main);
    }

    .pending-student-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-secondary);
    }

    .student-name {
      font-weight: 600;
      color: var(--color-forest);
    }

    .enrollment-code {
      color: var(--text-muted);
      font-size: 11px;
    }

    .subject-tag {
      color: var(--color-amber-dark);
      font-size: 11px;
      font-weight: 700;
    }

    .pending-time {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    /* Sessions List */
    .sessions-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .session-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      background: var(--bg-surface-subtle);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
    }

    .session-date-box {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-sm);
      background: var(--color-forest-surface);
      border: 1px solid var(--color-forest-border);
      color: var(--color-forest);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      line-height: 1.1;
      flex-shrink: 0;
    }

    .session-day {
      font-size: 14px;
      font-weight: 800;
    }

    .session-mon {
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 700;
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
      font-size: 12px;
      font-weight: 700;
      color: var(--color-forest);
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
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* Empty States */
    .empty-state {
      padding: 32px 16px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      color: var(--text-muted);
    }

    .empty-state-mini {
      padding: 20px 12px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      color: var(--text-muted);
      font-size: 12.5px;
    }

    .check-icon {
      color: var(--color-forest);
    }

    /* Skeletons */
    .skeleton-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .skeleton {
      background: linear-gradient(90deg, #f0ede4 25%, #f8f6f0 50%, #f0ede4 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: var(--radius-lg);
    }

    .hero-skeleton {
      height: 180px;
      border-radius: var(--radius-xl);
    }

    .card-skeleton {
      height: 140px;
    }

    .panel-skeleton {
      height: 380px;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .metrics-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .content-split {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
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
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
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
