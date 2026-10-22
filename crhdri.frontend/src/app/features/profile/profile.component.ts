import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudentService } from '../../core/services/student.service';
import { StudentProfile } from '../../core/models/student.models';
import { IconComponent } from '../../shared/components/icon.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="profile-page">
      <!-- Header -->
      <header class="page-header">
        <div>
          <h2 class="page-title font-editorial">Student Academic Profile</h2>
          <p class="page-subtitle">Official institutional registration credentials and student record</p>
        </div>

        <button 
          class="btn btn-secondary btn-sm" 
          (click)="loadProfile()" 
          [disabled]="loading()"
          title="Refresh profile data from backend API"
        >
          <app-icon name="refresh" [size]="14"></app-icon> Refresh Record
        </button>
      </header>

      <!-- Loading Skeleton -->
      @if (loading()) {
        <div class="skeleton-layout">
          <div class="skeleton banner-skeleton"></div>
          <div class="skeleton grid-skeleton"></div>
        </div>
      }

      <!-- Error State -->
      @else if (errorMessage()) {
        <div class="error-banner card-tactile" role="alert">
          <div class="error-icon-wrap">
            <app-icon name="alert" [size]="28"></app-icon>
          </div>
          <div class="error-text">
            <h3 class="error-title">Unable to Retrieve Student Profile</h3>
            <p class="error-desc">{{ errorMessage() }}</p>
            <p class="error-hint">Ensure the backend API at <code>http://localhost:5083</code> is running with PostgreSQL.</p>
          </div>
          <button class="btn btn-primary" (click)="loadProfile()">
            <app-icon name="refresh" [size]="16"></app-icon>
            Retry Connection
          </button>
        </div>
      }

      <!-- Empty State -->
      @else if (!profile()) {
        <div class="card-tactile empty-state">
          <div class="empty-icon-wrap">
            <app-icon name="profile" [size]="48" class="empty-icon"></app-icon>
          </div>
          <h3 class="font-editorial empty-title">No Student Profile Found</h3>
          <p class="empty-desc">
            No official student credentials were found for enrollment number 
            <strong>{{ studentService.activeEnrollmentNumber() }}</strong>.
          </p>
          <button class="btn btn-secondary" (click)="loadProfile()">
            <app-icon name="refresh" [size]="14"></app-icon> Check Again
          </button>
        </div>
      }

      <!-- Loaded Profile Card -->
      @else if (profile(); as p) {
        <div class="profile-layout">
          <!-- Main Identity Card -->
          <div class="card-tactile identity-card">
            <!-- Top Identity Banner -->
            <div class="identity-banner">
              <div class="avatar-large" [attr.aria-label]="p.fullName">
                {{ getInitials(p.fullName) }}
              </div>
              <div class="identity-details">
                <div class="name-status-row">
                  <h3 class="student-full-name font-editorial">{{ p.fullName }}</h3>
                  <span class="badge badge-forest">
                    <app-icon name="badge-check" [size]="13"></app-icon>
                    {{ p.enrollmentStatus || 'ACTIVE' }}
                  </span>
                </div>
                <p class="student-email">{{ p.email }}</p>
                <div class="enrollment-pill font-mono">
                  Enrollment ID: <strong>{{ p.enrollmentNumber }}</strong>
                </div>
              </div>
            </div>

            <!-- Credentials Section -->
            <div class="credentials-section">
              <div class="section-heading-row">
                <h4 class="credentials-title font-editorial">Institutional Enrollment Details</h4>
                <span class="verified-tag">
                  <app-icon name="check" [size]="12"></app-icon> Registrar Verified
                </span>
              </div>

              <div class="credentials-grid">
                <div class="cred-item">
                  <span class="cred-label">Program & Degree</span>
                  <span class="cred-value">
                    {{ p.courseName || p.course || 'Degree Program' }}
                    @if (p.courseCode) {
                      <span class="cred-sub-code">({{ p.courseCode }})</span>
                    }
                  </span>
                </div>

                <div class="cred-item">
                  <span class="cred-label">Academic Department</span>
                  <span class="cred-value">{{ p.department || 'General' }}</span>
                </div>

                <div class="cred-item">
                  <span class="cred-label">Current Term</span>
                  <span class="cred-value">Semester {{ p.semester || 'N/A' }} &bull; Section {{ p.section || 'A' }}</span>
                </div>

                <div class="cred-item">
                  <span class="cred-label">Academic Year</span>
                  <span class="cred-value font-mono">{{ p.academicYear || 'Current Year' }}</span>
                </div>

                <div class="cred-item">
                  <span class="cred-label">Student System ID</span>
                  <span class="cred-value font-mono id-hash" [title]="p.studentId">{{ p.studentId || 'Internal UUID' }}</span>
                </div>

                <div class="cred-item">
                  <span class="cred-label">Platform User ID</span>
                  <span class="cred-value font-mono id-hash" [title]="p.userId">{{ p.userId || 'User UUID' }}</span>
                </div>
              </div>
            </div>

            <!-- Read Only Notice -->
            <div class="readonly-notice">
              <app-icon name="assessments" [size]="16" class="notice-icon"></app-icon>
              <span>
                Academic records are officially verified by the institutional registrar and read-only. For profile corrections, course changes, or contact updates, please submit an official request through the Academic Administration Office.
              </span>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .profile-page {
      display: flex;
      flex-direction: column;
      gap: 22px;
      max-width: 1040px;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .page-title {
      font-size: 26px;
      font-weight: 600;
      color: var(--color-forest);
      letter-spacing: -0.01em;
    }

    .page-subtitle {
      font-size: 13.5px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    /* Skeleton Loading */
    .skeleton-layout {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .banner-skeleton {
      height: 180px;
      border-radius: var(--radius-xl);
    }

    .grid-skeleton {
      height: 280px;
      border-radius: var(--radius-lg);
    }

    /* Error Banner */
    .error-banner {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 24px 28px;
      background: linear-gradient(135deg, rgba(254, 242, 242, 0.95), rgba(255, 255, 255, 0.98));
      border: 1px solid rgba(220, 38, 38, 0.25);
      border-left: 5px solid #dc2626;
      border-radius: var(--radius-lg);
      box-shadow: 0 4px 16px rgba(220, 38, 38, 0.08);
    }

    .error-icon-wrap {
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #fee2e2;
      color: #dc2626;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .error-text {
      flex: 1;
    }

    .error-title {
      font-size: 16px;
      font-weight: 600;
      color: #991b1b;
      margin-bottom: 4px;
    }

    .error-desc {
      font-size: 13.5px;
      color: #7f1d1d;
      margin-bottom: 4px;
    }

    .error-hint {
      font-size: 12px;
      color: #b91c1c;
    }

    .error-hint code {
      background: rgba(220, 38, 38, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }

    /* Empty State */
    .empty-state {
      padding: 56px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }

    .empty-icon-wrap {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: var(--bg-surface-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
    }

    .empty-title {
      font-size: 22px;
      font-weight: 600;
      color: var(--color-forest);
    }

    .empty-desc {
      font-size: 14px;
      color: var(--text-muted);
      max-width: 460px;
      line-height: 1.5;
    }

    /* Identity Card */
    .identity-card {
      padding: 32px;
      display: flex;
      flex-direction: column;
      gap: 28px;
      background: #FFFFFF;
      border-radius: var(--radius-xl);
    }

    .identity-banner {
      display: flex;
      align-items: center;
      gap: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border-subtle);
      flex-wrap: wrap;
    }

    .avatar-large {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--color-forest) 0%, #1c5244 100%);
      color: #FFFFFF;
      font-family: var(--font-editorial);
      font-size: 30px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 20px rgba(23, 63, 53, 0.28);
      flex-shrink: 0;
      letter-spacing: 0.04em;
    }

    .identity-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .name-status-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .student-full-name {
      font-size: 28px;
      font-weight: 600;
      color: var(--color-forest);
      line-height: 1.2;
    }

    .student-email {
      font-size: 14px;
      color: var(--text-muted);
    }

    .enrollment-pill {
      margin-top: 6px;
      display: inline-block;
      align-self: flex-start;
      padding: 4px 12px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-sm);
      font-size: 12.5px;
      color: var(--color-forest);
    }

    /* Credentials */
    .credentials-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section-heading-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }

    .credentials-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--color-forest);
    }

    .verified-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11.5px;
      font-weight: 600;
      color: #15803d;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      padding: 3px 8px;
      border-radius: var(--radius-sm);
    }

    .credentials-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .cred-item {
      padding: 16px 18px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      gap: 5px;
      transition: border-color 0.15s ease;
    }

    .cred-item:hover {
      border-color: var(--border-medium);
    }

    .cred-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    .cred-value {
      font-size: 14.5px;
      font-weight: 600;
      color: var(--text-main);
      overflow-wrap: break-word;
    }

    .cred-sub-code {
      font-size: 12.5px;
      color: var(--text-muted);
      font-weight: 500;
      margin-left: 4px;
      white-space: nowrap;
    }

    .id-hash {
      font-size: 12.5px;
      color: var(--text-secondary);
      word-break: break-all;
    }

    /* Read Only Notice */
    .readonly-notice {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 18px;
      background: var(--color-forest-surface);
      border: 1px solid var(--color-forest-border);
      border-radius: var(--radius-md);
      font-size: 13px;
      color: var(--color-forest);
      line-height: 1.45;
    }

    .notice-icon {
      flex-shrink: 0;
    }

    @media (max-width: 768px) {
      .credentials-grid {
        grid-template-columns: 1fr;
      }
      .identity-banner {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class ProfileComponent implements OnInit {
  readonly studentService = inject(StudentService);

  loading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);
  profile = signal<StudentProfile | null>(null);

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.studentService.getProfile().subscribe({
      next: (data) => {
        this.profile.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Failed to retrieve student profile.');
        this.loading.set(false);
      }
    });
  }

  getInitials(name?: string): string {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
}
