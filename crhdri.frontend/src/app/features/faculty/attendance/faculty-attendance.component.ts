import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { FacultyService } from '../../../core/services/faculty.service';
import { ToastService } from '../../../core/services/toast.service';
import { 
  FacultyAssignedClass, 
  FacultyClassDetails, 
  FacultySessionItem, 
  SessionAttendanceStudent,
  UpdateAttendanceRecord
} from '../../../core/models/faculty.models';
import { IconComponent } from '../../../shared/components/icon.component';

interface StudentAttendanceRow {
  studentId: string;
  enrollmentNumber: string;
  fullName: string;
  email: string;
  status: 'PRESENT' | 'ABSENT';
  originalStatus: 'PRESENT' | 'ABSENT' | 'NOT_MARKED';
}

@Component({
  selector: 'app-faculty-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="attendance-page">
      <!-- Page Header & Class Selector Bar -->
      <div class="faculty-page-header">
        <div class="faculty-header-titles">
          <div class="badge-row">
            <span class="badge badge-teal badge-sm">
              <app-icon name="badge-check" [size]="12"></app-icon>
              SESSION MANAGER
            </span>
            <span class="meta-dot">&bull;</span>
            <span class="meta-year font-mono text-muted">AY 2026-2027</span>
          </div>
          <h2 class="faculty-page-title">Faculty Attendance Manager</h2>
          <p class="faculty-page-subtitle">
            Schedule lecture sessions, verify student rosters, and log institutional attendance records.
          </p>
        </div>

        <!-- Class Selection Dropdown/Tabs -->
        <div class="class-picker-wrap">
          <span class="picker-label font-mono">Assigned Class:</span>
          <div class="class-selector-box">
            @for (cls of assignedClasses(); track cls.facultyAssignmentId) {
              <button
                class="class-tab-btn"
                [class.active]="selectedClass()?.facultyAssignmentId === cls.facultyAssignmentId"
                (click)="selectClass(cls)"
                [attr.aria-label]="cls.subjectName"
              >
                <span class="tab-code font-mono">{{ cls.subjectCode }}</span>
                <span class="tab-sec">Sec {{ cls.section }}</span>
              </button>
            }
          </div>
        </div>
      </div>

      <!-- Main Two-Column Layout: Left (Sessions List) | Right (Attendance Marker) -->
      @if (classesLoading()) {
        <div class="skeleton-container" aria-busy="true" aria-label="Loading assigned classes">
          <div class="skeleton header-skeleton"></div>
          <div class="skeleton body-skeleton"></div>
        </div>
      } @else if (classesError()) {
        <div class="error-banner card-modern" role="alert">
          <div class="error-icon-wrap">
            <app-icon name="alert" [size]="24"></app-icon>
          </div>
          <div class="error-text">
            <h3 class="error-title">Unable to Load Assigned Classes</h3>
            <p class="error-desc">{{ classesError() }}</p>
          </div>
          <button class="btn btn-primary btn-sm" (click)="loadClasses()">
            <app-icon name="refresh" [size]="14"></app-icon>
            Retry Connection
          </button>
        </div>
      } @else if (selectedClass()) {
        <div class="attendance-split-layout">
          <!-- LEFT COLUMN: Class Sessions Log & Creator -->
          <div class="split-col sessions-col">
            <div class="card-modern panel-card">
              <div class="panel-header">
                <div class="panel-header-title">
                  <h3 class="panel-title">Class Sessions</h3>
                  <span class="badge badge-teal badge-sm font-mono">{{ sessions().length }} Logged</span>
                </div>
                <button
                  class="btn btn-primary btn-sm"
                  (click)="toggleCreateSessionModal()"
                  [disabled]="creatingSession()"
                  title="Schedule a new lecture session"
                >
                  <app-icon name="plus" [size]="13"></app-icon>
                  <span>New Session</span>
                </button>
              </div>

              <!-- Create Session Inline Form -->
              @if (showCreateForm()) {
                <div class="create-session-drawer card-modern">
                  <div class="drawer-header">
                    <span class="drawer-title">Schedule Class Session</span>
                    <button class="close-drawer-btn" (click)="showCreateForm.set(false)" aria-label="Close form">
                      &times;
                    </button>
                  </div>

                  <form (ngSubmit)="submitCreateSession()" class="drawer-form">
                    <div class="form-group">
                      <label class="form-label">Session Date</label>
                      <input
                        type="date"
                        [(ngModel)]="newSessionDate"
                        name="sessionDate"
                        required
                        class="form-control font-mono"
                      />
                    </div>

                    <div class="form-row">
                      <div class="form-group flex-1">
                        <label class="form-label">Start Time</label>
                        <input
                          type="time"
                          [(ngModel)]="newSessionStartTime"
                          name="startTime"
                          class="form-control font-mono"
                        />
                      </div>
                      <div class="form-group flex-1">
                        <label class="form-label">End Time</label>
                        <input
                          type="time"
                          [(ngModel)]="newSessionEndTime"
                          name="endTime"
                          class="form-control font-mono"
                        />
                      </div>
                    </div>

                    <div class="form-group">
                      <label class="form-label">Status</label>
                      <select [(ngModel)]="newSessionStatus" name="sessionStatus" class="form-control">
                        <option value="CONDUCTED">CONDUCTED (Active Lecture)</option>
                        <option value="SCHEDULED">SCHEDULED (Upcoming)</option>
                      </select>
                    </div>

                    @if (createError()) {
                      <div class="drawer-error font-mono">
                        {{ createError() }}
                      </div>
                    }

                    <div class="drawer-actions">
                      <button type="button" class="btn btn-secondary btn-sm" (click)="showCreateForm.set(false)">
                        Cancel
                      </button>
                      <button type="submit" class="btn btn-primary btn-sm" [disabled]="creatingSession()">
                        @if (creatingSession()) {
                          <span class="spin-icon">&#9696;</span>
                          <span>Creating...</span>
                        } @else {
                          <span>Save Session</span>
                        }
                      </button>
                    </div>
                  </form>
                </div>
              }

              <!-- Sessions List -->
              @if (sessionsLoading()) {
                <div class="sessions-skeleton-list">
                  <div class="skeleton item-skeleton"></div>
                  <div class="skeleton item-skeleton"></div>
                  <div class="skeleton item-skeleton"></div>
                </div>
              } @else if (sessions().length === 0) {
                <div class="empty-sessions-box">
                  <div class="empty-icon-wrap">
                    <app-icon name="attendance" [size]="28"></app-icon>
                  </div>
                  <p class="empty-text">No lecture sessions recorded for this class yet.</p>
                  <button class="btn btn-outline btn-sm" (click)="showCreateForm.set(true)">
                    Schedule First Session
                  </button>
                </div>
              } @else {
                <div class="sessions-scroll-list">
                  @for (s of sessions(); track s.sessionId) {
                    <div
                      class="session-list-item"
                      [class.active]="selectedSession()?.sessionId === s.sessionId"
                      (click)="selectSession(s)"
                    >
                      <div class="session-date-col font-mono">
                        <span class="date-day">{{ formatDay(s.sessionDate) }}</span>
                        <span class="date-month">{{ formatMonth(s.sessionDate) }}</span>
                      </div>

                      <div class="session-info-col">
                        <div class="session-time-row">
                          <span class="session-time font-mono">
                            {{ s.startTime || '10:00' }} - {{ s.endTime || '11:00' }}
                          </span>
                          <span
                            class="badge badge-sm"
                            [class.badge-teal]="s.sessionStatus === 'CONDUCTED'"
                            [class.badge-amber]="s.sessionStatus === 'SCHEDULED'"
                            [class.badge-danger]="s.sessionStatus === 'CANCELLED'"
                          >
                            {{ s.sessionStatus }}
                          </span>
                        </div>

                        <div class="session-stats-row">
                          <span class="stat-pill present-pill">
                            <span class="dot green-dot"></span>
                            <span>{{ s.presentCount }} Present</span>
                          </span>
                          <span class="stat-pill absent-pill">
                            <span class="dot red-dot"></span>
                            <span>{{ s.absentCount }} Absent</span>
                          </span>
                          <span class="meta-note font-mono text-muted">
                            ({{ s.totalMarked }}/{{ s.totalEnrolled }})
                          </span>
                        </div>
                      </div>

                      <div class="session-arrow-col">
                        <app-icon name="chevron-right" [size]="14"></app-icon>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- RIGHT COLUMN: Session Attendance Workstation -->
          <div class="split-col attendance-col">
            @if (attendanceLoading()) {
              <div class="card-modern panel-card">
                <div class="skeleton-container" aria-busy="true">
                  <div class="skeleton header-skeleton"></div>
                  <div class="skeleton body-skeleton"></div>
                </div>
              </div>
            } @else if (selectedSession()) {
              <div class="card-modern panel-card workstation-card">
                <!-- Session Workstation Banner -->
                <div class="workstation-banner">
                  <div class="banner-titles">
                    <div class="banner-badges">
                      <span class="badge badge-teal badge-sm">
                        <app-icon name="badge-check" [size]="12"></app-icon>
                        LECTURE SESSION
                      </span>
                      <span class="meta-dot">&bull;</span>
                      <span class="font-mono text-date">{{ formatDateFull(selectedSession()?.sessionDate) }}</span>
                      <span class="meta-dot">&bull;</span>
                      <span class="font-mono text-muted">{{ selectedSession()?.startTime || '10:00' }} - {{ selectedSession()?.endTime || '11:00' }}</span>
                    </div>

                    <h3 class="banner-subject">
                      {{ selectedClass()?.subjectName }}
                      <span class="font-mono subject-code-tag">({{ selectedClass()?.subjectCode }})</span>
                    </h3>
                    <p class="banner-course">
                      {{ selectedClass()?.courseName }} &bull; Semester {{ selectedClass()?.semester }} (Section {{ selectedClass()?.section }})
                    </p>
                  </div>

                  <!-- Quick Stats & Dial -->
                  <div class="banner-stats">
                    <div class="stat-dial-card">
                      <span class="stat-dial-val">{{ attendancePercentage() }}%</span>
                      <span class="stat-dial-lbl">Present Rate</span>
                    </div>

                    <div class="count-breakdown">
                      <span class="count-badge green-badge">
                        <strong>{{ presentCount() }}</strong> Present
                      </span>
                      <span class="count-badge red-badge">
                        <strong>{{ absentCount() }}</strong> Absent
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Fast Actions & Controls -->
                <div class="workstation-actions-bar">
                  <div class="bulk-actions-group">
                    <span class="group-label">Quick Actions:</span>
                    <button class="btn btn-secondary btn-sm" (click)="markAll('PRESENT')" [disabled]="savingAttendance()">
                      <app-icon name="badge-check" [size]="13"></app-icon>
                      <span>Mark All Present</span>
                    </button>
                    <button class="btn btn-secondary btn-sm" (click)="markAll('ABSENT')" [disabled]="savingAttendance()">
                      <app-icon name="close" [size]="13"></app-icon>
                      <span>Mark All Absent</span>
                    </button>
                  </div>

                  @if (hasUnsavedChanges()) {
                    <div class="unsaved-badge font-mono">
                      <span class="pulse-indicator"></span>
                      <span>Unsaved modifications</span>
                    </div>
                  }
                </div>

                <!-- Student Attendance Table -->
                <div class="table-responsive">
                  <table class="table-modern" aria-label="Student Session Attendance">
                    <thead>
                      <tr>
                        <th scope="col" style="width: 320px;">Enrolled Student</th>
                        <th scope="col" style="width: 180px;">Enrollment No.</th>
                        <th scope="col" class="text-center" style="width: 220px;">Attendance Verification</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of studentRows(); track row.studentId) {
                        <tr [class.row-absent]="row.status === 'ABSENT'">
                          <!-- Student Info -->
                          <td>
                            <div class="student-cell">
                              <div class="student-avatar font-mono">
                                {{ getInitials(row.fullName) }}
                              </div>
                              <div class="student-text">
                                <span class="student-name">{{ row.fullName }}</span>
                                <span class="student-email">{{ row.email }}</span>
                              </div>
                            </div>
                          </td>

                          <!-- Enrollment No -->
                          <td>
                            <span class="font-mono text-bold">{{ row.enrollmentNumber }}</span>
                          </td>

                          <!-- Attendance Selector Buttons -->
                          <td class="text-center">
                            <div class="attendance-btn-group">
                              <button
                                type="button"
                                class="toggle-btn present-btn"
                                [class.active]="row.status === 'PRESENT'"
                                (click)="setStudentStatus(row, 'PRESENT')"
                                [attr.aria-pressed]="row.status === 'PRESENT'"
                              >
                                <app-icon name="badge-check" [size]="13"></app-icon>
                                <span>Present</span>
                              </button>

                              <button
                                type="button"
                                class="toggle-btn absent-btn"
                                [class.active]="row.status === 'ABSENT'"
                                (click)="setStudentStatus(row, 'ABSENT')"
                                [attr.aria-pressed]="row.status === 'ABSENT'"
                              >
                                <app-icon name="close" [size]="13"></app-icon>
                                <span>Absent</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      } @empty {
                        <tr>
                          <td colspan="3" class="empty-cell">
                            No enrolled students found in this section.
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <!-- Footer Action Bar -->
                <div class="workstation-footer">
                  <div class="footer-meta font-mono text-muted">
                    Session: <strong class="text-main">{{ selectedSession()?.sessionStatus }}</strong> &bull; Total: {{ studentRows().length }}
                  </div>

                  <button
                    class="btn btn-primary"
                    (click)="saveAttendance()"
                    [disabled]="savingAttendance() || studentRows().length === 0"
                  >
                    @if (savingAttendance()) {
                      <span class="spin-icon">&#9696;</span>
                      <span>Saving Records...</span>
                    } @else {
                      <app-icon name="badge-check" [size]="15"></app-icon>
                      <span>Save Attendance Records</span>
                    }
                  </button>
                </div>
              </div>
            } @else {
              <!-- Empty Session Selection Placeholder -->
              <div class="card-modern empty-select-card">
                <div class="empty-icon-wrap large">
                  <app-icon name="attendance" [size]="36"></app-icon>
                </div>
                <h3 class="empty-title">Select a Class Session</h3>
                <p class="empty-desc">
                  Choose a lecture session from the left log to view student records and update attendance.
                </p>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .attendance-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding-bottom: 30px;
    }

    .badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .meta-dot {
      color: var(--border-medium);
    }

    /* Skeleton Loading */
    .skeleton-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .header-skeleton {
      height: 90px;
      border-radius: var(--radius-lg);
    }

    .body-skeleton {
      height: 480px;
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

    /* Split Layout */
    .attendance-split-layout {
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 20px;
      align-items: start;
    }

    @media (max-width: 1024px) {
      .attendance-split-layout {
        grid-template-columns: 1fr;
      }
    }

    .panel-card {
      overflow: hidden;
    }

    .panel-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .panel-header-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .panel-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
    }

    /* Create Session Drawer */
    .create-session-drawer {
      margin: 16px;
      padding: 16px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
    }

    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .drawer-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-main);
    }

    .close-drawer-btn {
      background: none;
      border: none;
      font-size: 18px;
      color: var(--text-muted);
      cursor: pointer;
    }

    .drawer-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .form-row {
      display: flex;
      gap: 10px;
    }

    .flex-1 {
      flex: 1;
    }

    .drawer-error {
      font-size: 12px;
      color: var(--color-danger);
    }

    .drawer-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 6px;
    }

    /* Sessions Scroll List */
    .sessions-scroll-list {
      max-height: 600px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    .session-list-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 18px;
      border-bottom: 1px solid var(--border-subtle);
      cursor: pointer;
      transition: all var(--transition-fast);
      position: relative;
    }

    .session-list-item:hover {
      background-color: #F8FAFC;
    }

    .session-list-item.active {
      background-color: var(--color-teal-surface);
      border-left: 4px solid var(--color-teal);
    }

    .session-date-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      background: var(--bg-surface-inset);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      flex-shrink: 0;
    }

    .session-list-item.active .session-date-col {
      background: #FFFFFF;
      border-color: var(--color-teal-border);
      color: var(--color-teal);
    }

    .date-day {
      font-size: 16px;
      font-weight: 800;
      line-height: 1;
    }

    .date-month {
      font-size: 9.5px;
      font-weight: 700;
      color: var(--text-muted);
    }

    .session-info-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .session-time-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .session-time {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-main);
    }

    .session-stats-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11.5px;
      flex-wrap: wrap;
    }

    .stat-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .dot {
      width: 6px;
      height: 6px;
      border-radius: var(--radius-full);
    }

    .green-dot {
      background: var(--color-success);
    }

    .red-dot {
      background: var(--color-danger);
    }

    .session-arrow-col {
      color: var(--text-muted);
    }

    .empty-sessions-box {
      padding: 36px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .empty-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-full);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
    }

    .empty-icon-wrap.large {
      width: 64px;
      height: 64px;
    }

    .empty-text {
      font-size: 13.5px;
      color: var(--text-secondary);
    }

    /* Workstation Banner */
    .workstation-banner {
      padding: 20px 24px;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
    }

    .banner-titles {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .banner-badges {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      flex-wrap: wrap;
    }

    .banner-subject {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-main);
    }

    .subject-code-tag {
      color: var(--color-teal);
      font-size: 14px;
    }

    .banner-course {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .banner-stats {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-dial-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--color-teal-surface);
      border: 1px solid var(--color-teal-border);
      padding: 10px 18px;
      border-radius: var(--radius-md);
      text-align: center;
    }

    .stat-dial-val {
      font-size: 24px;
      font-weight: 800;
      color: var(--color-teal);
      line-height: 1;
    }

    .stat-dial-lbl {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .count-breakdown {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .count-badge {
      font-size: 12px;
      padding: 3px 8px;
      border-radius: var(--radius-sm);
    }

    .green-badge {
      background: var(--color-success-surface);
      color: var(--color-success);
      border: 1px solid var(--color-success-border);
    }

    .red-badge {
      background: var(--color-danger-surface);
      color: var(--color-danger);
      border: 1px solid var(--color-danger-border);
    }

    /* Actions Bar */
    .workstation-actions-bar {
      padding: 12px 20px;
      background: var(--bg-surface-subtle);
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .bulk-actions-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .group-label {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .unsaved-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      color: var(--color-warning);
      background: var(--color-warning-surface);
      border: 1px solid var(--color-warning-border);
      padding: 3px 8px;
      border-radius: var(--radius-sm);
    }

    .pulse-indicator {
      width: 6px;
      height: 6px;
      border-radius: var(--radius-full);
      background: var(--color-warning);
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.8); }
    }

    /* Table & Roster */
    .student-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .student-avatar {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-full);
      background: var(--color-teal-surface);
      color: var(--color-teal);
      border: 1px solid var(--color-teal-border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11.5px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .student-text {
      display: flex;
      flex-direction: column;
    }

    .student-name {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text-main);
    }

    .student-email {
      font-size: 11.5px;
      color: var(--text-muted);
    }

    .attendance-btn-group {
      display: inline-flex;
      background: var(--bg-surface-inset);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 2px;
      gap: 2px;
    }

    .toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      border: none;
      background: transparent;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .present-btn.active {
      background: var(--color-success);
      color: #FFFFFF;
      box-shadow: var(--shadow-sm);
    }

    .absent-btn.active {
      background: var(--color-danger);
      color: #FFFFFF;
      box-shadow: var(--shadow-sm);
    }

    .row-absent {
      background-color: rgba(254, 242, 242, 0.4);
    }

    .workstation-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--border-subtle);
      background: var(--bg-surface-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .empty-select-card {
      padding: 60px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .empty-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
    }

    .empty-desc {
      font-size: 13.5px;
      color: var(--text-secondary);
      max-width: 380px;
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class FacultyAttendanceComponent implements OnInit {
  private readonly facultyService = inject(FacultyService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  // Assigned Classes List
  assignedClasses = signal<FacultyAssignedClass[]>([]);
  selectedClass = signal<FacultyAssignedClass | null>(null);
  classesLoading = signal<boolean>(false);
  classesError = signal<string | null>(null);

  // Sessions for Selected Class
  sessions = signal<FacultySessionItem[]>([]);
  selectedSession = signal<FacultySessionItem | null>(null);
  sessionsLoading = signal<boolean>(false);

  // Attendance Workstation
  studentRows = signal<StudentAttendanceRow[]>([]);
  attendanceLoading = signal<boolean>(false);
  savingAttendance = signal<boolean>(false);

  // Create Session Form
  showCreateForm = signal<boolean>(false);
  creatingSession = signal<boolean>(false);
  createError = signal<string | null>(null);
  newSessionDate = new Date().toISOString().split('T')[0];
  newSessionStartTime = '10:00';
  newSessionEndTime = '11:00';
  newSessionStatus = 'CONDUCTED';

  // Derived Computed Stats
  presentCount = computed(() => {
    return this.studentRows().filter(r => r.status === 'PRESENT').length;
  });

  absentCount = computed(() => {
    return this.studentRows().filter(r => r.status === 'ABSENT').length;
  });

  attendancePercentage = computed(() => {
    const total = this.studentRows().length;
    if (total === 0) return 0;
    return Math.round((this.presentCount() * 100) / total);
  });

  hasUnsavedChanges = computed(() => {
    return this.studentRows().some(r => r.status !== r.originalStatus);
  });

  ngOnInit(): void {
    this.loadClasses();
  }

  loadClasses(): void {
    this.classesLoading.set(true);
    this.classesError.set(null);

    this.facultyService.getMyClasses().subscribe({
      next: (list) => {
        this.assignedClasses.set(list);
        this.classesLoading.set(false);

        if (list.length > 0) {
          const paramId = this.route.snapshot.paramMap.get('facultyAssignmentId') ||
                          this.route.snapshot.queryParamMap.get('assignmentId');
          const matched = list.find(c => c.facultyAssignmentId === paramId) || list[0];
          this.selectClass(matched);
        }
      },
      error: (err) => {
        this.classesLoading.set(false);
        this.classesError.set(err.message || 'Failed to load assigned classes.');
      }
    });
  }

  selectClass(cls: FacultyAssignedClass): void {
    this.selectedClass.set(cls);
    this.loadSessionsForClass(cls.facultyAssignmentId);
  }

  loadSessionsForClass(assignmentId: string): void {
    this.sessionsLoading.set(true);
    this.sessions.set([]);
    this.selectedSession.set(null);
    this.studentRows.set([]);

    this.facultyService.getClassSessions(assignmentId).subscribe({
      next: (res) => {
        this.sessions.set(res.sessions);
        this.sessionsLoading.set(false);

        if (res.sessions.length > 0) {
          this.selectSession(res.sessions[0]);
        }
      },
      error: (err) => {
        this.sessionsLoading.set(false);
        this.toast.error(err.message || 'Failed to load class sessions.', 'Error');
      }
    });
  }

  selectSession(session: FacultySessionItem): void {
    this.selectedSession.set(session);
    this.loadAttendanceForSession(session.sessionId);
  }

  loadAttendanceForSession(sessionId: string): void {
    this.attendanceLoading.set(true);
    this.studentRows.set([]);

    this.facultyService.getSessionAttendance(sessionId).subscribe({
      next: (res) => {
        const rows: StudentAttendanceRow[] = res.students.map(s => {
          const currentStatus: 'PRESENT' | 'ABSENT' =
            s.attendanceStatus === 'ABSENT' ? 'ABSENT' : 'PRESENT';
          return {
            studentId: s.studentId,
            enrollmentNumber: s.enrollmentNumber,
            fullName: s.fullName,
            email: s.email,
            status: currentStatus,
            originalStatus: s.attendanceStatus as any
          };
        });

        this.studentRows.set(rows);
        this.attendanceLoading.set(false);
      },
      error: (err) => {
        this.attendanceLoading.set(false);
        this.toast.error(err.message || 'Failed to load student attendance for this session.', 'Error');
      }
    });
  }

  setStudentStatus(row: StudentAttendanceRow, status: 'PRESENT' | 'ABSENT'): void {
    row.status = status;
    this.studentRows.set([...this.studentRows()]);
  }

  markAll(status: 'PRESENT' | 'ABSENT'): void {
    const updated = this.studentRows().map(r => ({ ...r, status }));
    this.studentRows.set(updated);
  }

  saveAttendance(): void {
    const session = this.selectedSession();
    if (!session) return;

    this.savingAttendance.set(true);

    const payloadRecords: UpdateAttendanceRecord[] = this.studentRows().map(r => ({
      studentId: r.studentId,
      attendanceStatus: r.status
    }));

    this.facultyService.updateSessionAttendance(session.sessionId, {
      records: payloadRecords,
      markSessionConducted: true
    }).subscribe({
      next: (res) => {
        this.savingAttendance.set(false);
        this.toast.success('Attendance records successfully updated and synchronized.', 'Saved');

        const rows = this.studentRows().map(r => ({ ...r, originalStatus: r.status }));
        this.studentRows.set(rows);

        const currentSessions = this.sessions().map(s => {
          if (s.sessionId === session.sessionId) {
            return {
              ...s,
              presentCount: this.presentCount(),
              absentCount: this.absentCount(),
              totalMarked: this.studentRows().length,
              sessionStatus: 'CONDUCTED'
            };
          }
          return s;
        });
        this.sessions.set(currentSessions);
      },
      error: (err) => {
        this.savingAttendance.set(false);
        this.toast.error(err.message || 'Failed to save attendance records.', 'Error');
      }
    });
  }

  toggleCreateSessionModal(): void {
    this.createError.set(null);
    this.showCreateForm.set(!this.showCreateForm());
  }

  submitCreateSession(): void {
    const cls = this.selectedClass();
    if (!cls) return;

    this.creatingSession.set(true);
    this.createError.set(null);

    this.facultyService.createClassSession(cls.facultyAssignmentId, {
      sessionDate: this.newSessionDate,
      startTime: this.newSessionStartTime ? this.newSessionStartTime + ':00' : undefined,
      endTime: this.newSessionEndTime ? this.newSessionEndTime + ':00' : undefined,
      sessionStatus: this.newSessionStatus
    }).subscribe({
      next: (res) => {
        this.creatingSession.set(false);
        this.showCreateForm.set(false);
        this.toast.success(`Lecture session on ${res.sessionDate} scheduled successfully.`, 'Session Created');

        this.loadSessionsForClass(cls.facultyAssignmentId);
      },
      error: (err) => {
        this.creatingSession.set(false);
        this.createError.set(err.message || 'Failed to create class session.');
      }
    });
  }

  formatDay(dateString: string): string {
    try {
      const parts = dateString.split('-');
      return parts.length >= 3 ? parts[2].slice(0, 2) : '01';
    } catch {
      return '01';
    }
  }

  formatMonth(dateString: string): string {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    } catch {
      return 'OCT';
    }
  }

  formatDateFull(dateString?: string): string {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  }

  getInitials(fullName: string): string {
    const parts = (fullName || '').split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (fullName || '').slice(0, 2).toUpperCase() || 'ST';
  }
}
