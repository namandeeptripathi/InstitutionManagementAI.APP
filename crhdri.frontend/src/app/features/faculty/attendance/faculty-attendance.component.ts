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
      <div class="page-header card-tactile">
        <div class="header-titles">
          <div class="badge-row">
            <span class="badge badge-sage">SESSION MANAGER</span>
            <span class="meta-dot">&bull;</span>
            <span class="meta-year font-mono">AY 2026-2027</span>
          </div>
          <h2 class="page-title font-editorial">Faculty Attendance Manager</h2>
          <p class="page-subtitle">
            Schedule lecture sessions, verify student rosters, and log institutional attendance records.
          </p>
        </div>

        <!-- Class Selection Dropdown/Tabs -->
        <div class="class-picker-wrap">
          <label class="picker-label font-mono">SELECTED CLASS:</label>
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
        <div class="error-banner card-tactile" role="alert">
          <div class="error-icon-wrap">
            <app-icon name="alert" [size]="28"></app-icon>
          </div>
          <div class="error-text">
            <h3 class="error-title">Unable to Load Assigned Classes</h3>
            <p class="error-desc">{{ classesError() }}</p>
          </div>
          <button class="btn btn-primary" (click)="loadClasses()">
            <app-icon name="refresh" [size]="16"></app-icon>
            Retry Connection
          </button>
        </div>
      } @else if (selectedClass()) {
        <div class="attendance-split-layout">
          <!-- LEFT COLUMN: Class Sessions Log & Creator -->
          <div class="split-col sessions-col">
            <div class="card-tactile panel-card">
              <div class="panel-header">
                <div class="panel-header-title">
                  <h3 class="panel-title font-editorial">Class Sessions</h3>
                  <span class="badge badge-amber badge-sm font-mono">{{ sessions().length }} Logged</span>
                </div>
                <button
                  class="btn btn-primary btn-sm new-session-btn"
                  (click)="toggleCreateSessionModal()"
                  [disabled]="creatingSession()"
                  title="Schedule a new lecture session"
                >
                  <app-icon name="plus" [size]="14"></app-icon>
                  <span>New Session</span>
                </button>
              </div>

              <!-- Create Session Form / Dropdown Drawer -->
              @if (showCreateForm()) {
                <div class="create-session-drawer card-subtle">
                  <div class="drawer-header">
                    <span class="drawer-title font-editorial">Schedule Class Session</span>
                    <button class="close-drawer-btn" (click)="showCreateForm.set(false)" aria-label="Close drawer">
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
                        class="form-input font-mono"
                      />
                    </div>

                    <div class="form-row">
                      <div class="form-group">
                        <label class="form-label">Start Time</label>
                        <input
                          type="time"
                          [(ngModel)]="newSessionStartTime"
                          name="startTime"
                          class="form-input font-mono"
                        />
                      </div>
                      <div class="form-group">
                        <label class="form-label">End Time</label>
                        <input
                          type="time"
                          [(ngModel)]="newSessionEndTime"
                          name="endTime"
                          class="form-input font-mono"
                        />
                      </div>
                    </div>

                    <div class="form-group">
                      <label class="form-label">Status</label>
                      <select [(ngModel)]="newSessionStatus" name="sessionStatus" class="form-select font-mono">
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
                      <button type="button" class="btn btn-outline btn-sm" (click)="showCreateForm.set(false)">
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
                  <app-icon name="attendance" [size]="32" class="empty-icon"></app-icon>
                  <p class="empty-text">No lecture sessions recorded for this class yet.</p>
                  <button class="btn btn-outline btn-sm" (click)="showCreateForm.set(true)">
                    Schedule First Session
                  </button>
                </div>
              } @else {
                <div class="sessions-scroll-list">
                  @for (s of sessions(); track s.sessionId) {
                    <div
                      class="session-list-item card-interactive"
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
                            [class.badge-forest]="s.sessionStatus === 'CONDUCTED'"
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
                          <span class="meta-note font-mono">
                            ({{ s.totalMarked }}/{{ s.totalEnrolled }} Logged)
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
              <div class="card-tactile panel-card">
                <div class="skeleton-container" aria-busy="true">
                  <div class="skeleton header-skeleton"></div>
                  <div class="skeleton body-skeleton"></div>
                </div>
              </div>
            } @else if (selectedSession()) {
              <div class="card-tactile panel-card workstation-card">
                <!-- Session Workstation Banner -->
                <div class="workstation-banner">
                  <div class="banner-titles">
                    <div class="banner-badges">
                      <span class="badge badge-sage">
                        <app-icon name="badge-check" [size]="12"></app-icon>
                        LECTURE SESSION
                      </span>
                      <span class="meta-dot">&bull;</span>
                      <span class="font-mono text-date">{{ formatDateFull(selectedSession()?.sessionDate) }}</span>
                      <span class="meta-dot">&bull;</span>
                      <span class="font-mono">{{ selectedSession()?.startTime || '10:00' }} - {{ selectedSession()?.endTime || '11:00' }}</span>
                    </div>

                    <h3 class="banner-subject font-editorial">
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
                      <span class="stat-dial-val font-editorial">{{ attendancePercentage() }}%</span>
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
                <div class="workstation-actions-bar card-subtle">
                  <div class="bulk-actions-group">
                    <span class="group-label">Quick Actions:</span>
                    <button class="btn btn-outline btn-sm" (click)="markAll('PRESENT')" [disabled]="savingAttendance()">
                      <app-icon name="badge-check" [size]="14"></app-icon>
                      <span>Mark All Present</span>
                    </button>
                    <button class="btn btn-outline btn-sm" (click)="markAll('ABSENT')" [disabled]="savingAttendance()">
                      <app-icon name="close" [size]="14"></app-icon>
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
                <div class="roster-table-wrap">
                  <table class="roster-table" aria-label="Student Session Attendance">
                    <thead>
                      <tr>
                        <th scope="col" class="th-student">Enrolled Student</th>
                        <th scope="col" class="th-roll">Enrollment No.</th>
                        <th scope="col" class="th-status text-center">Attendance Verification</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of studentRows(); track row.studentId) {
                        <tr class="student-row" [class.row-absent]="row.status === 'ABSENT'">
                          <!-- Student Info -->
                          <td class="td-student">
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
                          <td class="td-roll">
                            <span class="roll-pill font-mono">{{ row.enrollmentNumber }}</span>
                          </td>

                          <!-- Attendance Selector Buttons -->
                          <td class="td-status">
                            <div class="attendance-btn-group">
                              <button
                                type="button"
                                class="toggle-btn present-btn"
                                [class.active]="row.status === 'PRESENT'"
                                (click)="setStudentStatus(row, 'PRESENT')"
                                [attr.aria-pressed]="row.status === 'PRESENT'"
                              >
                                <app-icon name="badge-check" [size]="14"></app-icon>
                                <span>Present</span>
                              </button>

                              <button
                                type="button"
                                class="toggle-btn absent-btn"
                                [class.active]="row.status === 'ABSENT'"
                                (click)="setStudentStatus(row, 'ABSENT')"
                                [attr.aria-pressed]="row.status === 'ABSENT'"
                              >
                                <app-icon name="close" [size]="14"></app-icon>
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
                  <div class="footer-meta font-mono">
                    Session: <strong>{{ selectedSession()?.sessionStatus }}</strong> &bull; Total Students: {{ studentRows().length }}
                  </div>

                  <button
                    class="btn btn-primary save-btn"
                    (click)="saveAttendance()"
                    [disabled]="savingAttendance() || studentRows().length === 0"
                  >
                    @if (savingAttendance()) {
                      <span class="spin-icon">&#9696;</span>
                      <span>Saving Records...</span>
                    } @else {
                      <app-icon name="badge-check" [size]="16"></app-icon>
                      <span>Save Attendance Records</span>
                    }
                  </button>
                </div>
              </div>
            } @else {
              <!-- Empty Session Selection Placeholder -->
              <div class="card-tactile empty-select-card">
                <app-icon name="attendance" [size]="48" class="empty-icon"></app-icon>
                <h3 class="empty-title font-editorial">Select a Class Session</h3>
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
      padding-bottom: 36px;
    }

    /* Page Header */
    .page-header {
      background: #FFFFFF;
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-subtle);
      padding: 24px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      flex-wrap: wrap;
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11.5px;
    }

    .meta-dot {
      color: var(--border-strong);
    }

    .meta-year {
      color: var(--text-muted);
      font-size: 12px;
    }

    .page-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--color-forest);
      margin: 0;
      line-height: 1.2;
    }

    .page-subtitle {
      font-size: 13px;
      color: var(--text-secondary);
      margin: 0;
      max-width: 540px;
    }

    /* Class Picker */
    .class-picker-wrap {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .picker-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--text-muted);
    }

    .class-selector-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-surface-subtle);
      padding: 4px;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle);
    }

    .class-tab-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: var(--radius-md);
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-secondary);
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .class-tab-btn:hover {
      background: #FFFFFF;
      color: var(--color-forest);
    }

    .class-tab-btn.active {
      background: #FFFFFF;
      border-color: var(--color-forest-border);
      color: var(--color-forest);
      box-shadow: 0 1px 3px rgba(23, 63, 53, 0.08);
      font-weight: 700;
    }

    .tab-code {
      font-weight: 700;
    }

    .tab-sec {
      font-size: 11px;
      color: var(--text-muted);
    }

    /* Split Layout */
    .attendance-split-layout {
      display: grid;
      grid-template-columns: 360px 1fr;
      gap: 20px;
      align-items: start;
    }

    .split-col {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .panel-card {
      background: #FFFFFF;
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
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
      gap: 8px;
    }

    .panel-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--color-forest);
      margin: 0;
    }

    .new-session-btn {
      font-size: 11.5px;
      padding: 5px 10px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    /* Create Session Drawer */
    .create-session-drawer {
      padding: 16px;
      background: var(--color-forest-surface);
      border-bottom: 1px solid var(--color-forest-border);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .drawer-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--color-forest);
    }

    .close-drawer-btn {
      background: none;
      border: none;
      font-size: 18px;
      color: var(--text-muted);
      cursor: pointer;
      line-height: 1;
    }

    .drawer-form {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .form-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .form-input, .form-select {
      padding: 7px 10px;
      font-size: 12px;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      background: #FFFFFF;
      outline: none;
      font-family: inherit;
    }

    .form-input:focus, .form-select:focus {
      border-color: var(--color-forest);
      box-shadow: 0 0 0 2px rgba(23, 63, 53, 0.1);
    }

    .drawer-error {
      font-size: 11px;
      color: #b91c1c;
      background: #fef2f2;
      padding: 6px 10px;
      border-radius: var(--radius-sm);
      border: 1px solid #fecaca;
    }

    .drawer-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 4px;
    }

    /* Sessions Scroll List */
    .sessions-scroll-list {
      display: flex;
      flex-direction: column;
      max-height: 600px;
      overflow-y: auto;
    }

    .session-list-item {
      padding: 14px 18px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      gap: 14px;
      cursor: pointer;
      transition: background-color var(--transition-fast);
    }

    .session-list-item:hover {
      background-color: var(--bg-surface-subtle);
    }

    .session-list-item.active {
      background-color: var(--color-forest-surface);
      border-left: 4px solid var(--color-forest);
    }

    .session-date-col {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      background: #FFFFFF;
      border: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      line-height: 1;
    }

    .session-list-item.active .session-date-col {
      background: var(--color-forest);
      color: #FFFFFF;
      border-color: var(--color-forest);
    }

    .date-day {
      font-size: 14px;
      font-weight: 800;
    }

    .date-month {
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 700;
    }

    .session-info-col {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .session-time-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .session-time {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-main);
    }

    .session-stats-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
    }

    .stat-pill {
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--text-secondary);
    }

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .green-dot { background-color: #16a34a; }
    .red-dot { background-color: #dc2626; }

    .meta-note {
      color: var(--text-muted);
      font-size: 10px;
    }

    .session-arrow-col {
      color: var(--text-muted);
    }

    /* Workstation Right Panel */
    .workstation-banner {
      padding: 22px 28px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      background: linear-gradient(to right, #FFFFFF, var(--bg-surface-subtle));
    }

    .banner-titles {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .banner-badges {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text-muted);
    }

    .text-date {
      color: var(--color-forest);
      font-weight: 600;
    }

    .banner-subject {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-main);
      margin: 2px 0 0 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .subject-code-tag {
      font-size: 13px;
      color: var(--color-forest);
      background: var(--color-forest-surface);
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-forest-border);
    }

    .banner-course {
      font-size: 12.5px;
      color: var(--text-secondary);
      margin: 0;
    }

    .banner-stats {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-shrink: 0;
    }

    .stat-dial-card {
      padding: 10px 18px;
      background: var(--color-forest-surface);
      border: 1px solid var(--color-forest-border);
      border-radius: var(--radius-lg);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .stat-dial-val {
      font-size: 22px;
      font-weight: 800;
      color: var(--color-forest);
      line-height: 1;
    }

    .stat-dial-lbl {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-forest-dark);
      margin-top: 2px;
    }

    .count-breakdown {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .count-badge {
      font-size: 11.5px;
      padding: 3px 8px;
      border-radius: var(--radius-sm);
    }

    .green-badge {
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }

    .red-badge {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    /* Actions Bar */
    .workstation-actions-bar {
      padding: 12px 24px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      background: var(--bg-surface-subtle);
    }

    .bulk-actions-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .group-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .unsaved-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      color: var(--color-amber-dark);
      background: rgba(217, 119, 6, 0.1);
      padding: 3px 10px;
      border-radius: var(--radius-full);
      border: 1px solid rgba(217, 119, 6, 0.25);
    }

    .pulse-indicator {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: var(--color-amber-dark);
      box-shadow: 0 0 0 2px rgba(217, 119, 6, 0.3);
    }

    /* Roster Table */
    .roster-table-wrap {
      overflow-x: auto;
    }

    .roster-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .roster-table th {
      padding: 12px 24px;
      background: var(--bg-surface-subtle);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-subtle);
    }

    .student-row {
      border-bottom: 1px solid var(--border-subtle);
      transition: background-color var(--transition-fast);
    }

    .student-row:hover {
      background-color: rgba(247, 245, 239, 0.4);
    }

    .student-row.row-absent {
      background-color: rgba(254, 242, 242, 0.4);
    }

    .roster-table td {
      padding: 14px 24px;
      font-size: 13.5px;
      vertical-align: middle;
    }

    .student-cell {
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

    .student-name {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text-main);
    }

    .student-email {
      font-size: 11.5px;
      color: var(--text-muted);
    }

    .roll-pill {
      font-size: 12px;
      font-weight: 700;
      color: var(--color-forest);
      background: var(--color-forest-surface);
      border: 1px solid var(--color-forest-border);
      padding: 3px 8px;
      border-radius: var(--radius-sm);
    }

    .attendance-btn-group {
      display: inline-flex;
      align-items: center;
      background: var(--bg-surface-subtle);
      padding: 3px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      gap: 4px;
    }

    .toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
      background: transparent;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      color: var(--text-muted);
      transition: all var(--transition-fast);
    }

    .toggle-btn:hover {
      color: var(--text-main);
    }

    .present-btn.active {
      background: #16a34a;
      color: #FFFFFF;
      box-shadow: 0 1px 3px rgba(22, 163, 74, 0.3);
    }

    .absent-btn.active {
      background: #dc2626;
      color: #FFFFFF;
      box-shadow: 0 1px 3px rgba(220, 38, 38, 0.3);
    }

    /* Footer Action Bar */
    .workstation-footer {
      padding: 16px 24px;
      background: #FFFFFF;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .footer-meta {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .footer-meta strong {
      color: var(--color-forest);
    }

    .save-btn {
      padding: 9px 20px;
      font-size: 13.5px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    /* Empty States & Placeholders */
    .empty-select-card {
      padding: 64px 24px;
      background: #FFFFFF;
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 12px;
    }

    .empty-icon {
      color: var(--text-muted);
    }

    .empty-title {
      font-size: 20px;
      color: var(--color-forest);
      margin: 0;
    }

    .empty-desc {
      font-size: 13.5px;
      color: var(--text-muted);
      max-width: 400px;
      margin: 0;
    }

    .empty-sessions-box {
      padding: 36px 16px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: var(--text-muted);
    }

    /* Skeletons */
    .skeleton-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .skeleton {
      background: linear-gradient(90deg, #f0ede4 25%, #f8f6f0 50%, #f0ede4 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: var(--radius-lg);
    }

    .header-skeleton { height: 100px; }
    .body-skeleton { height: 400px; }
    .item-skeleton { height: 60px; margin: 8px 16px; }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .spin-icon {
      display: inline-block;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    @media (max-width: 1024px) {
      .attendance-split-layout {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class FacultyAttendanceComponent implements OnInit {
  private readonly facultyService = inject(FacultyService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  // Assigned Classes
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

  // Create Session Drawer
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
          // Check query or route param for pre-selected class
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
            s.attendanceStatus === 'ABSENT' ? 'ABSENT' : 'PRESENT'; // default to PRESENT if not marked
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
    // Trigger signal reactivity
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

        // Update originalStatus to current status so unsaved badge disappears
        const rows = this.studentRows().map(r => ({ ...r, originalStatus: r.status }));
        this.studentRows.set(rows);

        // Refresh session counts locally
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

        // Reload sessions list and select new session
        this.loadSessionsForClass(cls.facultyAssignmentId);
      },
      error: (err) => {
        this.creatingSession.set(false);
        this.createError.set(err.message || 'Failed to create class session.');
      }
    });
  }

  // Format Helpers
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
