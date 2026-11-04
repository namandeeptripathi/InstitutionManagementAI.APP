import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttendanceService } from '../../core/services/attendance.service';
import { AttendanceResponse } from '../../core/models/student.models';
import { IconComponent } from '../../shared/components/icon.component';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="attendance-page">
      <!-- Page Header -->
      <div class="page-header-clean">
        <div>
          <h2 class="page-title">Attendance & Class Analytics</h2>
          <p class="page-subtitle">
            Academic session attendance tracking across conducted sessions
            @if (data()) {
              <span class="header-count font-mono">&bull; {{ data()!.subjects.length }} subjects</span>
            }
          </p>
        </div>

        <button class="btn btn-secondary btn-sm" (click)="loadAttendance()" title="Refresh Attendance">
          <app-icon name="refresh" [size]="14"></app-icon> Refresh
        </button>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="skeleton-layout">
          <div class="skeleton banner-skeleton"></div>
          <div class="skeleton-grid">
            <div class="skeleton card-skeleton" *ngFor="let i of [1, 2, 3]"></div>
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
            <h3 class="error-title">Unable to Load Attendance Records</h3>
            <p class="error-desc">{{ errorMessage() }}</p>
            <p class="error-hint">Ensure the backend API at <code>http://localhost:5083</code> is active with PostgreSQL.</p>
          </div>
          <button class="btn btn-primary btn-sm" (click)="loadAttendance()">
            <app-icon name="refresh" [size]="14"></app-icon> Retry
          </button>
        </div>
      }

      <!-- Empty State -->
      @else if (data() && data()!.subjects.length === 0) {
        <div class="card-modern empty-state-box">
          <app-icon name="attendance" [size]="40" class="empty-icon"></app-icon>
          <h3 class="empty-title">No Attendance Records Found</h3>
          <p class="empty-desc">
            No conducted academic sessions have been recorded for {{ data()!.enrollmentNumber }}.
          </p>
          <button class="btn btn-secondary btn-sm" (click)="loadAttendance()">
            <app-icon name="refresh" [size]="14"></app-icon> Check Again
          </button>
        </div>
      }

      <!-- Loaded Attendance Data -->
      @else if (data(); as att) {
        <!-- Overall Summary Banner -->
        <section class="card-modern overall-banner">
          <div class="overall-info">
            <div class="status-badge-row">
              <span class="badge" [class.badge-success]="att.overallAttendancePercentage >= 75" [class.badge-danger]="att.overallAttendancePercentage < 75">
                {{ att.overallAttendancePercentage >= 75 ? 'Institutional Compliant' : 'Below 75% Requirement' }}
              </span>
              <span class="enroll-badge font-mono">{{ att.enrollmentNumber }}</span>
            </div>

            <h3 class="overall-headline">
              Overall Attendance Rate: <span class="rate-val">{{ att.overallAttendancePercentage }}%</span>
            </h3>

            <p class="overall-caption">
              Conducted Classes: <strong>{{ att.totalClasses }}</strong> &bull; Attended: <strong>{{ att.attendedClasses }}</strong> &bull; Absent: <strong>{{ att.absentClasses }}</strong>
            </p>

            <div class="overall-chips-row">
              <div class="stat-pill-mini total">
                <span class="pill-label">Total Held</span>
                <span class="pill-num font-mono">{{ att.totalClasses }}</span>
              </div>
              <div class="stat-pill-mini present">
                <span class="pill-label">Attended</span>
                <span class="pill-num font-mono">{{ att.attendedClasses }}</span>
              </div>
              <div class="stat-pill-mini absent">
                <span class="pill-label">Absences</span>
                <span class="pill-num font-mono">{{ att.absentClasses }}</span>
              </div>
              <div class="stat-pill-mini eligibility">
                <span class="pill-label">Eligibility</span>
                <span class="pill-num font-mono" [style.color]="att.overallAttendancePercentage >= 75 ? 'var(--color-success)' : 'var(--color-danger)'">
                  {{ att.overallAttendancePercentage >= 75 ? 'ELIGIBLE' : 'SHORTAGE' }}
                </span>
              </div>
            </div>
          </div>

          <div class="overall-dial-container">
            <div class="overall-ring" [style.background]="getConicGradient(att.overallAttendancePercentage)">
              <div class="ring-core">
                <span class="ring-pct">{{ att.overallAttendancePercentage }}%</span>
                <span class="ring-sub">Cumulative</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Subject Wise Attendance Breakdown -->
        <section class="subjects-section">
          <div class="section-header">
            <div>
              <h3 class="section-title">Subject Breakdown</h3>
              <p class="section-subtitle">Individual session attendance and compliance ratio for each enrolled course</p>
            </div>
            <span class="section-count font-mono">{{ att.subjects.length }} Subjects</span>
          </div>

          <div class="subject-cards-grid">
            @for (subj of att.subjects; track subj.subjectCode) {
              <div class="card-modern card-interactive subject-att-card">
                <div class="subject-att-header">
                  <div class="subject-title-area">
                    <span class="subject-code-tag font-mono">{{ subj.subjectCode }}</span>
                    <h4 class="subject-name">{{ subj.subjectName }}</h4>
                  </div>
                  <span class="badge" [class.badge-success]="subj.attendancePercentage >= 75" [class.badge-danger]="subj.attendancePercentage < 75">
                    {{ subj.attendancePercentage }}%
                  </span>
                </div>

                <div class="attendance-progress-wrap">
                  <div class="progress-info-row">
                    <span class="progress-label">Compliance Ratio</span>
                    <span class="progress-val font-mono">{{ subj.attendedClasses }} / {{ subj.totalClasses }} Sessions</span>
                  </div>
                  <div class="bar-track">
                    <div 
                      class="bar-fill" 
                      [class.fill-low]="subj.attendancePercentage < 75" 
                      [style.width.%]="subj.attendancePercentage"
                    ></div>
                  </div>
                </div>

                <div class="subject-att-stats">
                  <div class="stat-pill attended">
                    <span class="stat-label">Attended</span>
                    <span class="stat-num font-mono">{{ subj.attendedClasses }}</span>
                  </div>
                  <div class="stat-pill absent">
                    <span class="stat-label">Absent</span>
                    <span class="stat-num font-mono">{{ subj.absentClasses }}</span>
                  </div>
                  <div class="stat-pill total">
                    <span class="stat-label">Total</span>
                    <span class="stat-num font-mono">{{ subj.totalClasses }}</span>
                  </div>
                </div>
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .attendance-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .page-header-clean {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 14px;
    }

    .page-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.01em;
    }

    .page-subtitle {
      font-size: 13px;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .header-count {
      color: var(--color-teal);
      font-weight: 600;
    }

    /* Skeleton Loading */
    .skeleton-layout {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .banner-skeleton {
      height: 160px;
      border-radius: var(--radius-xl);
    }

    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .card-skeleton {
      height: 180px;
      border-radius: var(--radius-lg);
    }

    /* Overall Summary Banner */
    .overall-banner {
      padding: 24px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 28px;
    }

    .overall-info {
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
    }

    .status-badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .enroll-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: var(--radius-sm);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
    }

    .overall-headline {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.25;
      letter-spacing: -0.01em;
    }

    .rate-val {
      color: var(--color-teal);
    }

    .overall-caption {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .overall-chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 4px;
    }

    .stat-pill-mini {
      display: flex;
      flex-direction: column;
      padding: 6px 12px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
    }

    .stat-pill-mini.present .pill-num {
      color: var(--color-teal);
    }

    .stat-pill-mini.absent .pill-num {
      color: var(--color-danger);
    }

    .pill-label {
      font-size: 9.5px;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.04em;
    }

    .pill-num {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text-main);
    }

    /* Overall Radial Dial */
    .overall-dial-container {
      flex-shrink: 0;
    }

    .overall-ring {
      width: 108px;
      height: 108px;
      border-radius: 50%;
      padding: 8px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.4s ease;
    }

    .ring-core {
      width: 100%;
      height: 100%;
      background: var(--bg-surface);
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .ring-pct {
      font-size: 20px;
      font-weight: 800;
      color: var(--color-teal);
      line-height: 1;
    }

    .ring-sub {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      margin-top: 3px;
    }

    /* Subjects Section */
    .subjects-section {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
    }

    .section-subtitle {
      font-size: 12.5px;
      color: var(--text-secondary);
      margin-top: 1px;
    }

    .section-count {
      font-size: 11.5px;
      color: var(--text-secondary);
      background: var(--bg-surface-subtle);
      padding: 3px 8px;
      border-radius: var(--radius-full);
      border: 1px solid var(--border-subtle);
    }

    .subject-cards-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .subject-att-card {
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .subject-att-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
    }

    .subject-title-area {
      flex: 1;
      min-width: 0;
    }

    .subject-code-tag {
      display: inline-block;
      font-size: 10.5px;
      font-weight: 700;
      color: var(--color-teal);
      background: var(--color-teal-surface);
      border: 1px solid var(--color-teal-border);
      padding: 1px 6px;
      border-radius: var(--radius-xs);
      margin-bottom: 4px;
    }

    .subject-name {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.3;
    }

    .attendance-progress-wrap {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .progress-info-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
    }

    .progress-label {
      color: var(--text-muted);
      font-weight: 500;
    }

    .progress-val {
      font-weight: 600;
      color: var(--text-secondary);
    }

    .bar-track {
      width: 100%;
      height: 6px;
      background: var(--bg-surface-subtle);
      border-radius: var(--radius-full);
      overflow: hidden;
      border: 1px solid var(--border-subtle);
    }

    .bar-fill {
      height: 100%;
      background: var(--color-teal);
      border-radius: var(--radius-full);
      transition: width 0.5s ease;
    }

    .bar-fill.fill-low {
      background: var(--color-danger);
    }

    .subject-att-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }

    .stat-pill {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 6px 8px;
      background: var(--bg-surface-subtle);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
    }

    .stat-label {
      font-size: 9.5px;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 1px;
    }

    .stat-num {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-main);
    }

    .stat-pill.attended .stat-num {
      color: var(--color-teal);
    }

    .stat-pill.absent .stat-num {
      color: var(--color-danger);
    }

    /* Error Banner */
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

    /* Empty state */
    .empty-state-box {
      padding: 48px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .empty-icon {
      color: var(--text-muted);
    }

    .empty-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--text-main);
    }

    .empty-desc {
      font-size: 13px;
      color: var(--text-secondary);
      max-width: 400px;
      line-height: 1.45;
    }

    @media (max-width: 1024px) {
      .subject-cards-grid,
      .skeleton-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .subject-cards-grid,
      .skeleton-grid {
        grid-template-columns: 1fr;
      }
      .overall-banner {
        flex-direction: column;
        align-items: flex-start;
      }
      .overall-dial-container {
        align-self: center;
      }
    }
  `]
})
export class AttendanceComponent implements OnInit {
  private readonly attendanceService = inject(AttendanceService);

  loading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);
  data = signal<AttendanceResponse | null>(null);

  ngOnInit(): void {
    this.loadAttendance();
  }

  loadAttendance(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.attendanceService.getAttendance().subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Failed to load attendance records.');
        this.loading.set(false);
      }
    });
  }

  getConicGradient(pct: number): string {
    const validPct = Math.min(100, Math.max(0, pct || 0));
    const color = validPct >= 75 ? '#0F766E' : '#B91C1C';
    return `conic-gradient(${color} 0% ${validPct}%, #E2E8F0 ${validPct}% 100%)`;
  }
}
