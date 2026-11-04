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
      <!-- Page Header -->
      <header class="page-header-clean">
        <div>
          <h2 class="page-title">Student Academic Profile</h2>
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
        <div class="error-banner card-modern" role="alert">
          <div class="error-icon-wrap">
            <app-icon name="alert" [size]="24"></app-icon>
          </div>
          <div class="error-text">
            <h3 class="error-title">Unable to Retrieve Student Profile</h3>
            <p class="error-desc">{{ errorMessage() }}</p>
            <p class="error-hint">Ensure the backend API at <code>http://localhost:5083</code> is active with PostgreSQL.</p>
          </div>
          <button class="btn btn-primary btn-sm" (click)="loadProfile()">
            <app-icon name="refresh" [size]="14"></app-icon> Retry
          </button>
        </div>
      }

      <!-- Empty State -->
      @else if (!profile()) {
        <div class="card-modern empty-state-box">
          <app-icon name="profile" [size]="40" class="empty-icon"></app-icon>
          <h3 class="empty-title">No Student Profile Found</h3>
          <p class="empty-desc">
            No official student credentials were found for enrollment number 
            <strong>{{ studentService.activeEnrollmentNumber() }}</strong>.
          </p>
          <button class="btn btn-secondary btn-sm" (click)="loadProfile()">
            <app-icon name="refresh" [size]="14"></app-icon> Check Again
          </button>
        </div>
      }

      <!-- Loaded Profile Card -->
      @else if (profile(); as p) {
        <div class="profile-layout">
          <div class="card-modern identity-card">
            <!-- Top Identity Banner -->
            <div class="identity-banner">
              <div class="avatar-large" [attr.aria-label]="p.fullName">
                {{ getInitials(p.fullName) }}
              </div>
              <div class="identity-details">
                <div class="name-status-row">
                  <h3 class="student-full-name">{{ p.fullName }}</h3>
                  <span class="badge badge-success">
                    <app-icon name="badge-check" [size]="12"></app-icon>
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
                <h4 class="credentials-title">Institutional Enrollment Details</h4>
                <span class="badge badge-success">
                  <app-icon name="check" [size]="11"></app-icon> Registrar Verified
                </span>
              </div>

              <div class="credentials-grid">
                <div class="cred-item">
                  <span class="cred-label">Program & Degree</span>
                  <span class="cred-value">
                    {{ p.courseName || p.course || 'Degree Program' }}
                    @if (p.courseCode) {
                      <span class="cred-sub-code font-mono">({{ p.courseCode }})</span>
                    }
                  </span>
                </div>

                <div class="cred-item">
                  <span class="cred-label">Academic Department</span>
                  <span class="cred-value">{{ p.department || 'General Department' }}</span>
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
                  <span class="cred-value font-mono id-hash" [title]="p.studentId">{{ p.studentId || 'Internal ID' }}</span>
                </div>

                <div class="cred-item">
                  <span class="cred-label">Platform User ID</span>
                  <span class="cred-value font-mono id-hash" [title]="p.userId">{{ p.userId || 'User ID' }}</span>
                </div>
              </div>
            </div>

            <!-- Read Only Notice -->
            <div class="readonly-notice">
              <app-icon name="assessments" [size]="16" class="notice-icon"></app-icon>
              <span>
                Academic records are officially verified by the university registrar and are read-only. For profile corrections, course changes, or updates, submit a formal request to Academic Administration.
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
      gap: 20px;
      max-width: 980px;
    }

    .page-header-clean {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
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

    /* Skeleton Loading */
    .skeleton-layout {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .banner-skeleton {
      height: 140px;
      border-radius: var(--radius-xl);
    }

    .grid-skeleton {
      height: 240px;
      border-radius: var(--radius-lg);
    }

    /* Identity Card */
    .identity-card {
      padding: 26px 28px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .identity-banner {
      display: flex;
      align-items: center;
      gap: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-subtle);
      flex-wrap: wrap;
    }

    .avatar-large {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: var(--color-teal);
      color: #FFFFFF;
      font-size: 24px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(15, 118, 110, 0.25);
      flex-shrink: 0;
    }

    .identity-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .name-status-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .student-full-name {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.25;
    }

    .student-email {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .enrollment-pill {
      margin-top: 4px;
      display: inline-block;
      align-self: flex-start;
      padding: 3px 10px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      font-size: 11.5px;
      color: var(--color-teal);
    }

    /* Credentials */
    .credentials-section {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .section-heading-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }

    .credentials-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
    }

    .credentials-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .cred-item {
      padding: 14px 16px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .cred-label {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    .cred-value {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text-main);
    }

    .cred-sub-code {
      font-size: 11.5px;
      color: var(--text-secondary);
      margin-left: 4px;
    }

    .id-hash {
      font-size: 12px;
      color: var(--text-secondary);
      word-break: break-all;
    }

    /* Read Only Notice */
    .readonly-notice {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--color-teal-surface);
      border: 1px solid var(--color-teal-border);
      border-radius: var(--radius-md);
      font-size: 12px;
      color: var(--color-teal-dark);
      line-height: 1.45;
    }

    .notice-icon {
      color: var(--color-teal);
      flex-shrink: 0;
    }

    /* Error and Empty */
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
