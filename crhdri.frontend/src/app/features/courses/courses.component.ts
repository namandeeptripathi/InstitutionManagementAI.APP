import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoursesService } from '../../core/services/courses.service';
import { Course } from '../../core/models/student.models';
import { IconComponent } from '../../shared/components/icon.component';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="courses-page">
      <!-- Page Header -->
      <div class="page-header-clean">
        <div class="header-titles">
          <h2 class="page-title">Enrolled Academic Courses</h2>
          <p class="page-subtitle">Subjects registered for current semester curriculum ({{ filteredCourses().length }} subjects)</p>
        </div>

        <div class="header-actions">
          <div class="search-box-clean">
            <app-icon name="search" [size]="15" class="search-icon"></app-icon>
            <input 
              type="text" 
              [(ngModel)]="searchQuery" 
              placeholder="Search by code or subject name..." 
              class="search-input"
            />
            @if (searchQuery()) {
              <button class="clear-btn" (click)="searchQuery.set('')">✕</button>
            }
          </div>

          <div class="segmented-control">
            <button class="segment-btn" [class.active]="viewMode() === 'grid'" (click)="viewMode.set('grid')" title="Grid View">
              ⊞ Grid
            </button>
            <button class="segment-btn" [class.active]="viewMode() === 'list'" (click)="viewMode.set('list')" title="Table View">
              ☰ Table
            </button>
          </div>

          <button class="btn btn-secondary btn-sm" (click)="loadCourses()" title="Refresh Courses">
            <app-icon name="refresh" [size]="14"></app-icon> Refresh
          </button>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="skeleton-grid">
          <div class="skeleton course-skeleton" *ngFor="let i of [1,2,3]"></div>
        </div>
      }

      <!-- Error State -->
      @else if (errorMessage()) {
        <div class="error-banner card-modern" role="alert">
          <div class="error-icon-wrap">
            <app-icon name="alert" [size]="24"></app-icon>
          </div>
          <div class="error-text">
            <h3 class="error-title">Unable to Load Course Roster</h3>
            <p class="error-desc">{{ errorMessage() }}</p>
            <p class="error-hint">Ensure the backend API at <code>http://localhost:5083</code> is active with PostgreSQL.</p>
          </div>
          <button class="btn btn-primary btn-sm" (click)="loadCourses()">
            <app-icon name="refresh" [size]="14"></app-icon> Retry
          </button>
        </div>
      }

      <!-- Empty State -->
      @else if (filteredCourses().length === 0) {
        <div class="card-modern empty-state-box">
          <app-icon name="courses" [size]="40" class="empty-icon"></app-icon>
          <h3 class="empty-title">No Enrolled Courses Found</h3>
          <p class="empty-desc">
            @if (searchQuery()) {
              No course subjects matched "{{ searchQuery() }}". Try adjusting your search query.
            } @else {
              No registered subjects were found for this student enrollment profile.
            }
          </p>
          @if (searchQuery()) {
            <button class="btn btn-secondary btn-sm" (click)="searchQuery.set('')">Clear Search Filter</button>
          }
        </div>
      }

      <!-- Courses Grid View -->
      @else if (viewMode() === 'grid') {
        <div class="courses-grid">
          @for (course of filteredCourses(); track course.subjectCode) {
            <div class="card-modern card-interactive course-card">
              <div class="course-card-top">
                <span class="subject-badge font-mono">{{ course.subjectCode }}</span>
                <span class="badge badge-teal">{{ course.credits }} Credits</span>
              </div>

              <div class="course-card-body">
                <h3 class="subject-title">{{ course.subjectName }}</h3>
                <div class="program-tag-row">
                  <span class="prog-code font-mono">{{ course.courseCode }}</span>
                  <span class="prog-name">{{ course.courseName }}</span>
                </div>
              </div>

              <div class="course-card-footer">
                <div class="meta-row">
                  <span>Sem {{ course.semester }}</span>
                  <span class="meta-separator">&bull;</span>
                  <span>AY {{ course.academicYear }}</span>
                </div>
                <span class="badge badge-success">{{ course.enrollmentStatus || 'ACTIVE' }}</span>
              </div>
            </div>
          }
        </div>
      }

      <!-- Courses List / Table View -->
      @else {
        <div class="table-container-clean">
          <table class="table-modern" aria-label="Course Subject List">
            <thead>
              <tr>
                <th scope="col">Subject Code</th>
                <th scope="col">Subject Title</th>
                <th scope="col">Course Code</th>
                <th scope="col">Program / Degree</th>
                <th scope="col">Credits</th>
                <th scope="col">Semester</th>
                <th scope="col">Academic Year</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              @for (course of filteredCourses(); track course.subjectCode) {
                <tr>
                  <td><span class="font-mono subject-badge">{{ course.subjectCode }}</span></td>
                  <td><strong class="subject-row-title">{{ course.subjectName }}</strong></td>
                  <td><span class="font-mono prog-code">{{ course.courseCode }}</span></td>
                  <td class="prog-row-name">{{ course.courseName }}</td>
                  <td><span class="badge badge-teal">{{ course.credits }} Credits</span></td>
                  <td class="font-mono">Semester {{ course.semester }}</td>
                  <td class="font-mono">{{ course.academicYear }}</td>
                  <td><span class="badge badge-success">{{ course.enrollmentStatus || 'ACTIVE' }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .courses-page {
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

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .search-box-clean {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 11px;
      color: var(--text-muted);
      pointer-events: none;
    }

    .search-input {
      width: 260px;
      padding: 8px 30px 8px 34px;
      font-size: 13px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      color: var(--text-main);
      box-shadow: var(--shadow-sm);
      transition: all var(--transition-fast);
      outline: none;
    }

    .search-input:focus {
      border-color: var(--color-teal);
      box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
    }

    .clear-btn {
      position: absolute;
      right: 9px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 11px;
    }

    .segmented-control {
      display: flex;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 2px;
    }

    .segment-btn {
      padding: 6px 11px;
      font-size: 12px;
      font-weight: 600;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .segment-btn.active {
      background: #FFFFFF;
      color: var(--color-teal);
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
    }

    /* Skeleton */
    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .course-skeleton {
      height: 160px;
      border-radius: var(--radius-lg);
    }

    /* Courses Grid */
    .courses-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .course-card {
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .course-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
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

    .course-card-body {
      margin-bottom: 14px;
    }

    .subject-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.3;
      margin-bottom: 6px;
    }

    .program-tag-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .prog-code {
      display: inline-block;
      padding: 2px 6px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xs);
      font-size: 10.5px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .prog-name {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .course-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--border-subtle);
      padding-top: 12px;
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      color: var(--text-secondary);
    }

    .meta-separator {
      color: var(--border-medium);
    }

    /* Table specifics */
    .subject-row-title {
      color: var(--text-main);
      font-size: 13.5px;
    }

    .prog-row-name {
      color: var(--text-secondary);
      font-size: 12.5px;
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

    @media (max-width: 1024px) {
      .courses-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .courses-grid {
        grid-template-columns: 1fr;
      }
      .search-input {
        width: 100%;
      }
      .header-actions {
        width: 100%;
        flex-direction: column;
        align-items: stretch;
      }
    }
  `]
})
export class CoursesComponent implements OnInit {
  private readonly coursesService = inject(CoursesService);

  courses = signal<Course[]>([]);
  loading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);

  searchQuery = signal<string>('');
  viewMode = signal<'grid' | 'list'>('grid');

  filteredCourses = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.courses();
    if (!q) return list;
    return list.filter(c => 
      c.subjectName.toLowerCase().includes(q) ||
      c.subjectCode.toLowerCase().includes(q) ||
      (c.courseCode && c.courseCode.toLowerCase().includes(q)) ||
      (c.courseName && c.courseName.toLowerCase().includes(q))
    );
  });

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.coursesService.getCourses().subscribe({
      next: (list) => {
        this.courses.set(list || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Failed to load courses.');
        this.loading.set(false);
      }
    });
  }
}
