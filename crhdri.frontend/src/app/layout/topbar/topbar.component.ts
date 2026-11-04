import { Component, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { StudentService } from '../../core/services/student.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <header class="topbar">
      <!-- Left: Mobile Nav Toggle & Breadcrumb Title -->
      <div class="topbar-left">
        <button class="menu-toggle-btn" (click)="toggleNav.emit()" aria-label="Toggle navigation drawer">
          <app-icon name="menu" [size]="18"></app-icon>
        </button>

        <div class="breadcrumbs-clean">
          <span class="portal-root">{{ isFaculty() ? 'Faculty' : 'Student' }}</span>
          <span class="crumb-slash">/</span>
          <h1 class="page-title">{{ currentPageTitle() }}</h1>
        </div>
      </div>

      <!-- Right: API Health Status, Session Info, User Profile & Logout -->
      <div class="topbar-right">
        <!-- Live API Status Pill -->
        <div class="api-status-pill" [class.connected]="isConnected()" [class.disconnected]="!isConnected()" [title]="backendStatusTooltip()">
          <span class="status-dot"></span>
          <span class="status-text">{{ isConnected() ? 'API Active' : 'API Offline' }}</span>
        </div>

        <!-- Session Chip -->
        <div class="session-chip-clean" [title]="'Authenticated: ' + userIdentifier()">
          <span class="chip-role">{{ isFaculty() ? 'FACULTY' : 'STUDENT' }}</span>
          <span class="chip-val font-mono">{{ userIdentifier() }}</span>
        </div>

        <!-- User Profile -->
        <div class="user-profile-header" [title]="userEmail()">
          <div class="user-avatar" [class.faculty-avatar]="isFaculty()">
            {{ userInitials() }}
          </div>
          <div class="user-details">
            <span class="user-name">{{ displayName() }}</span>
            <span class="user-role">{{ departmentRole() }}</span>
          </div>
        </div>

        <!-- Sign Out Button -->
        <button class="logout-btn-nav" (click)="logout()" title="Sign Out">
          <app-icon name="logout" [size]="15"></app-icon>
          <span class="logout-lbl">Sign Out</span>
        </button>
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      height: 60px;
      background-color: var(--bg-surface);
      border-bottom: 1px solid var(--border-subtle);
      padding: 0 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 90;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .menu-toggle-btn {
      display: none;
      background: transparent;
      border: 1px solid var(--border-subtle);
      padding: 5px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      color: var(--text-main);
    }

    .breadcrumbs-clean {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .portal-root {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .crumb-slash {
      font-size: 12px;
      color: var(--border-medium);
    }

    .page-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.01em;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    /* API Status Pill */
    .api-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 9px;
      border-radius: var(--radius-full);
      font-size: 11.5px;
      font-weight: 600;
      border: 1px solid transparent;
      transition: all var(--transition-fast);
    }

    .api-status-pill.connected {
      background-color: var(--color-success-surface);
      color: var(--color-success);
      border-color: var(--color-success-border);
    }

    .api-status-pill.connected .status-dot {
      background-color: var(--color-success);
    }

    .api-status-pill.disconnected {
      background-color: var(--color-danger-surface);
      color: var(--color-danger);
      border-color: var(--color-danger-border);
    }

    .api-status-pill.disconnected .status-dot {
      background-color: var(--color-danger);
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    /* Session Chip */
    .session-chip-clean {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background-color: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-full);
      font-size: 11.5px;
    }

    .chip-role {
      color: var(--text-secondary);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .chip-val {
      color: var(--color-teal);
      font-weight: 700;
    }

    /* User Profile */
    .user-profile-header {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 3px 6px;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--color-teal-surface);
      color: var(--color-teal);
      border: 1px solid var(--color-teal-border);
      font-weight: 700;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .user-avatar.faculty-avatar {
      background: var(--color-amber-surface);
      color: var(--color-amber);
      border-color: var(--color-amber-border);
    }

    .user-details {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-size: 12.5px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.2;
    }

    .user-role {
      font-size: 11px;
      color: var(--text-secondary);
      max-width: 140px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Logout Button */
    .logout-btn-nav {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 11px;
      background: transparent;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .logout-btn-nav:hover {
      background: var(--color-danger-surface);
      color: var(--color-danger);
      border-color: var(--color-danger-border);
    }

    @media (max-width: 900px) {
      .menu-toggle-btn {
        display: flex;
      }
      .user-details,
      .session-chip-clean,
      .logout-lbl {
        display: none;
      }
      .topbar {
        padding: 0 16px;
      }
    }
  `]
})
export class TopbarComponent {
  private readonly studentService = inject(StudentService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  toggleNav = output<void>();

  currentPageTitle = signal<string>('Academic Dashboard');

  isConnected = this.studentService.isConnected;
  isFaculty = this.authService.isFaculty;

  userIdentifier = computed(() => {
    if (this.isFaculty()) {
      return this.authService.currentFaculty()?.employeeCode || 'FAC-DEMO-001';
    }
    return this.authService.currentUser()?.enrollmentNumber || this.studentService.activeEnrollmentNumber();
  });

  displayName = computed(() => {
    if (this.isFaculty()) {
      return this.authService.currentFaculty()?.fullName || 'Faculty Member';
    }
    return this.authService.currentUser()?.fullName || this.studentService.studentProfile()?.fullName || 'Demo Student';
  });

  departmentRole = computed(() => {
    if (this.isFaculty()) {
      return this.authService.currentFaculty()?.designation || 'Faculty Member';
    }
    return this.studentService.studentProfile()?.department || 'Department of AI & ML';
  });

  userEmail = computed(() => {
    if (this.isFaculty()) {
      return this.authService.currentFaculty()?.email || 'demo.faculty@crhdri.ai';
    }
    return this.authService.currentUser()?.email || 'student@crhdri.ai';
  });

  constructor() {
    this.updateTitleByUrl(this.router.url);
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateTitleByUrl(event.urlAfterRedirects || event.url);
    });
  }

  private updateTitleByUrl(url: string): void {
    if (url.includes('/faculty/classes/')) {
      this.currentPageTitle.set('Class Student Roster');
    } else if (url.includes('/faculty/classes')) {
      this.currentPageTitle.set('My Teaching Classes');
    } else if (url.includes('/faculty/attendance')) {
      this.currentPageTitle.set('Attendance Manager');
    } else if (url.includes('/faculty/assignments')) {
      this.currentPageTitle.set('Assignments & Grading');
    } else if (url.includes('/faculty/materials')) {
      this.currentPageTitle.set('Learning Materials Repository');
    } else if (url.includes('/faculty/assessments')) {
      this.currentPageTitle.set('Quiz & Assessments Console');
    } else if (url.includes('/faculty/dashboard') || url === '/faculty') {
      this.currentPageTitle.set('Faculty Operations Dashboard');
    } else if (url.includes('/faculty')) {
      this.currentPageTitle.set('Faculty Workspace');
    } else if (url.includes('/courses')) {
      this.currentPageTitle.set('My Enrolled Courses');
    } else if (url.includes('/attendance')) {
      this.currentPageTitle.set('Attendance Analytics');
    } else if (url.includes('/assignments')) {
      this.currentPageTitle.set('Assignments & Submissions');
    } else if (url.includes('/learning-materials')) {
      this.currentPageTitle.set('Learning Materials & Resources');
    } else if (url.includes('/results')) {
      this.currentPageTitle.set('Academic Results');
    } else if (url.includes('/assessments')) {
      this.currentPageTitle.set('Quiz & Assessments');
    } else if (url.includes('/profile')) {
      this.currentPageTitle.set('Student Academic Profile');
    } else if (url.includes('/ai-assistant')) {
      this.currentPageTitle.set('AI Academic Copilot');
    } else {
      this.currentPageTitle.set('Academic Dashboard');
    }
  }

  backendStatusTooltip(): string {
    return this.isConnected()
      ? 'Backend ASP.NET Core API (http://localhost:5083) is active and connected to PostgreSQL.'
      : 'Cannot reach backend at http://localhost:5083. Check if CRHDRI.API is running.';
  }

  userInitials(): string {
    const name = this.displayName();
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase() || (this.isFaculty() ? 'FC' : 'ST');
  }

  logout(): void {
    this.toast.info('You have safely signed out.', 'Session Ended');
    this.authService.logout();
  }
}
