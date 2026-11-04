import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FacultyService } from '../../../core/services/faculty.service';
import { FacultyAssignedClass } from '../../../core/models/faculty.models';
import { IconComponent } from '../../../shared/components/icon.component';

@Component({
  selector: 'app-faculty-classes',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, IconComponent],
  template: `
    <div class="classes-page">
      <!-- Page Header -->
      <div class="page-header-clean">
        <div class="header-titles">
          <div class="header-badge-row">
            <span class="badge badge-teal">ACADEMIC WORKLOAD</span>
            <span class="meta-separator">&bull;</span>
            <span class="font-mono text-muted" style="font-size: 11.5px;">AY 2026-2027</span>
          </div>
          <h2 class="page-title">My Teaching Classes</h2>
          <p class="page-subtitle">
            Manage your assigned subjects, instruction cohorts, and access official student rosters.
          </p>
        </div>

        <div class="header-actions">
          <button class="btn btn-secondary btn-sm" (click)="loadClasses()" [disabled]="loading()" title="Refresh class list">
            <app-icon name="refresh" [size]="14" [class.spin-icon]="loading()"></app-icon>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- Quick KPI Metric Cards -->
      <div class="stats-row">
        <div class="card-modern stat-card">
          <div class="metric-icon-wrap teal">
            <app-icon name="courses" [size]="20"></app-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ classes().length }}</span>
            <span class="stat-label">Assigned Classes</span>
          </div>
        </div>

        <div class="card-modern stat-card">
          <div class="metric-icon-wrap blue">
            <app-icon name="profile" [size]="20"></app-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ totalStudentsCount() }}</span>
            <span class="stat-label">Total Enrolled Students</span>
          </div>
        </div>

        <div class="card-modern stat-card">
          <div class="metric-icon-wrap amber">
            <app-icon name="badge-check" [size]="20"></app-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ totalCredits() }}</span>
            <span class="stat-label">Teaching Credits</span>
          </div>
        </div>
      </div>

      <!-- Search & Controls Bar -->
      <div class="card-modern controls-bar">
        <div class="search-box-clean">
          <app-icon name="search" [size]="15" class="search-icon"></app-icon>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Filter by subject code, name, or course..."
            class="search-input"
          />
          @if (searchQuery) {
            <button class="clear-search-btn" (click)="searchQuery = ''" aria-label="Clear filter">
              &times;
            </button>
          }
        </div>

        <div class="results-count-pill font-mono">
          {{ filteredClasses().length }} of {{ classes().length }} Classes
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="skeleton-grid" aria-busy="true" aria-label="Loading assigned classes">
          <div class="skeleton card-skeleton"></div>
          <div class="skeleton card-skeleton"></div>
          <div class="skeleton card-skeleton"></div>
        </div>
      }

      <!-- Error State -->
      @else if (errorMessage()) {
        <div class="error-banner card-modern" role="alert">
          <div class="error-icon-wrap">
            <app-icon name="alert" [size]="24"></app-icon>
          </div>
          <div class="error-text">
            <h3 class="error-title">Unable to Load Assigned Classes</h3>
            <p class="error-desc">{{ errorMessage() }}</p>
          </div>
          <button class="btn btn-primary btn-sm" (click)="loadClasses()">
            <app-icon name="refresh" [size]="14"></app-icon> Retry
          </button>
        </div>
      }

      <!-- Classes Grid -->
      @else if (filteredClasses().length > 0) {
        <div class="classes-grid">
          @for (cls of filteredClasses(); track cls.facultyAssignmentId) {
            <div class="card-modern class-card">
              <!-- Top -->
              <div class="card-top">
                <span class="subject-badge font-mono">{{ cls.subjectCode }}</span>
                <span class="badge badge-teal font-mono">{{ cls.credits }} Credits</span>
              </div>

              <!-- Body -->
              <div class="card-middle">
                <h3 class="subject-title">{{ cls.subjectName }}</h3>
                <p class="course-subtitle">{{ cls.courseName }}</p>

                <div class="cohort-tags-row">
                  <span class="cohort-tag">
                    <strong>Sem {{ cls.semester }}</strong> &bull; Sec {{ cls.section }}
                  </span>
                  <span class="cohort-tag font-mono">{{ cls.academicYear }}</span>
                </div>
              </div>

              <!-- Footer -->
              <div class="card-bottom">
                <div class="students-count-badge font-mono">
                  <app-icon name="profile" [size]="13"></app-icon>
                  <span>{{ cls.enrolledStudentsCount }} {{ cls.enrolledStudentsCount === 1 ? 'Student' : 'Students' }}</span>
                </div>

                <a
                  [routerLink]="['/faculty/classes', cls.facultyAssignmentId]"
                  class="btn btn-primary btn-sm"
                  [attr.aria-label]="'View student roster for ' + cls.subjectName"
                >
                  <span>View Roster</span>
                  <app-icon name="chevron-right" [size]="12"></app-icon>
                </a>
              </div>
            </div>
          }
        </div>
      }

      <!-- Empty State -->
      @else {
        <div class="card-modern empty-state-box">
          <app-icon name="courses" [size]="40" class="empty-icon"></app-icon>
          <h3 class="empty-title">No Classes Found</h3>
          <p class="empty-desc">
            @if (searchQuery) {
              No assigned classes match your search query "{{ searchQuery }}". Try clearing the filter.
            } @else {
              No teaching classes are currently assigned to your faculty profile in the database.
            }
          </p>
          @if (searchQuery) {
            <button class="btn btn-secondary btn-sm" (click)="searchQuery = ''">
              Clear Search Filter
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .classes-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .page-header-clean {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .header-badge-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .meta-separator {
      color: var(--border-medium);
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
      max-width: 600px;
    }

    /* Stats Row */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .stat-card {
      padding: 16px 18px;
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 22px;
      font-weight: 800;
      color: var(--text-main);
      line-height: 1.15;
    }

    .stat-label {
      font-size: 12px;
      color: var(--text-secondary);
      font-weight: 500;
      margin-top: 2px;
    }

    /* Controls Bar */
    .controls-bar {
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .search-box-clean {
      position: relative;
      display: flex;
      align-items: center;
      flex: 1;
      max-width: 360px;
    }

    .search-icon {
      position: absolute;
      left: 11px;
      color: var(--text-muted);
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: 8px 30px 8px 34px;
      font-size: 13px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      color: var(--text-main);
      box-shadow: var(--shadow-sm);
      outline: none;
      transition: all var(--transition-fast);
    }

    .search-input:focus {
      border-color: var(--color-teal);
      box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
    }

    .clear-search-btn {
      position: absolute;
      right: 9px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 14px;
    }

    .results-count-pill {
      font-size: 11.5px;
      color: var(--text-secondary);
      background: var(--bg-surface-subtle);
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
    }

    /* Classes Grid */
    .classes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }

    .class-card {
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 14px;
    }

    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .subject-badge {
      display: inline-block;
      padding: 3px 8px;
      background: var(--color-teal-surface);
      color: var(--color-teal);
      border: 1px solid var(--color-teal-border);
      border-radius: var(--radius-sm);
      font-size: 11.5px;
      font-weight: 700;
    }

    .card-middle {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .subject-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.3;
    }

    .course-subtitle {
      font-size: 12.5px;
      color: var(--text-secondary);
    }

    .cohort-tags-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 6px;
      flex-wrap: wrap;
    }

    .cohort-tag {
      font-size: 11.5px;
      color: var(--text-secondary);
      background: var(--bg-surface-subtle);
      padding: 2px 7px;
      border-radius: var(--radius-xs);
      border: 1px solid var(--border-subtle);
    }

    .card-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--border-subtle);
      padding-top: 12px;
      gap: 8px;
    }

    .students-count-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11.5px;
      color: var(--text-secondary);
    }

    /* Skeleton */
    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .card-skeleton {
      height: 160px;
      border-radius: var(--radius-lg);
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
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

    @media (max-width: 800px) {
      .stats-row {
        grid-template-columns: 1fr;
      }
      .skeleton-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class FacultyClassesComponent implements OnInit {
  private readonly facultyService = inject(FacultyService);
  private readonly router = inject(Router);

  classes = signal<FacultyAssignedClass[]>([]);
  loading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  searchQuery = '';

  filteredClasses = computed(() => {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return this.classes();

    return this.classes().filter(c =>
      c.subjectCode.toLowerCase().includes(query) ||
      c.subjectName.toLowerCase().includes(query) ||
      c.courseName.toLowerCase().includes(query) ||
      c.courseCode.toLowerCase().includes(query) ||
      c.section.toLowerCase().includes(query)
    );
  });

  totalStudentsCount = computed(() => {
    return this.classes().reduce((acc, c) => acc + (c.enrolledStudentsCount || 0), 0);
  });

  totalCredits = computed(() => {
    return this.classes().reduce((acc, c) => acc + (c.credits || 0), 0);
  });

  ngOnInit(): void {
    this.loadClasses();
  }

  loadClasses(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.facultyService.getMyClasses().subscribe({
      next: (list) => {
        this.classes.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.message || 'Failed to load assigned classes.');
      }
    });
  }
}
