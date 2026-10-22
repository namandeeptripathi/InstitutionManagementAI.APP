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
      <!-- Left: Mobile Toggle & Page Title -->
      <div class="topbar-left">
        <button class="menu-toggle-btn" (click)="toggleNav.emit()" aria-label="Toggle navigation drawer">
          <app-icon name="menu" [size]="20"></app-icon>
        </button>

        <div class="breadcrumbs-wrap">
          <span class="portal-root">{{ isFaculty() ? 'Faculty Portal' : 'Student Portal' }}</span>
          <span class="crumb-separator">/</span>
          <h1 class="page-title">{{ currentPageTitle() }}</h1>
        </div>
      </div>

      <!-- Right: Server Health, Authenticated Session Chip, Profile & Logout -->
      <div class="topbar-right">
        <!-- Live Backend Status -->
        <div class="backend-pill" [class.connected]="isConnected()" [class.disconnected]="!isConnected()" [title]="backendStatusTooltip()">
          <span class="status-dot"></span>
          <span class="status-label">{{ isConnected() ? 'API 5083 Active' : 'API Offline' }}</span>
        </div>

        <!-- Authenticated Session Chip -->
        <div class="session-chip" [title]="'Authenticated Identifier: ' + userIdentifier()">
          <span class="session-dot" [class.faculty-dot]="isFaculty()"></span>
          <span class="chip-label">{{ isFaculty() ? 'FACULTY:' : 'STUDENT:' }}</span>
          <span class="chip-val font-mono">{{ userIdentifier() }}</span>
        </div>

        <!-- User Profile Mini Header -->
        <div class="user-badge" [title]="userEmail()">
          <div class="user-avatar" [class.faculty-avatar]="isFaculty()">
            {{ userInitials() }}
          </div>
          <div class="user-info-text">
            <span class="user-display-name">{{ displayName() }}</span>
            <span class="user-role">{{ departmentRole() }}</span>
          </div>
        </div>

        <!-- Sign Out Action -->
        <button class="logout-btn" (click)="logout()" title="Sign Out of CRHDRI.AI Portal">
          <app-icon name="logout" [size]="16"></app-icon>
          <span class="logout-text">Sign Out</span>
        </button>
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      height: 64px;
      background-color: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--border-subtle);
      padding: 0 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 90;
      box-shadow: 0 1px 3px rgba(32, 40, 36, 0.02);
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .menu-toggle-btn {
      display: none;
      background: transparent;
      border: 1px solid var(--border-subtle);
      padding: 6px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      color: var(--text-main);
    }

    .breadcrumbs-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .portal-root {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted);
    }

    .crumb-separator {
      font-size: 12px;
      color: var(--border-strong);
    }

    .page-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.02em;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    /* Backend Connection Pill */
    .backend-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: 11.5px;
      font-weight: 600;
      border: 1px solid transparent;
      transition: all var(--transition-fast);
    }

    .backend-pill.connected {
      background-color: var(--color-success-surface);
      color: var(--color-success);
      border-color: var(--color-success-border);
    }

    .backend-pill.connected .status-dot {
      background-color: var(--color-success);
      box-shadow: 0 0 0 2px rgba(32, 110, 78, 0.2);
    }

    .backend-pill.disconnected {
      background-color: var(--color-danger-surface);
      color: var(--color-danger);
      border-color: var(--color-danger-border);
    }

    .backend-pill.disconnected .status-dot {
      background-color: var(--color-danger);
      box-shadow: 0 0 0 2px rgba(184, 66, 51, 0.2);
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }

    /* Session Chip */
    .session-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      background-color: var(--color-forest-surface);
      border: 1px solid var(--color-forest-border);
      border-radius: var(--radius-full);
      font-size: 12px;
      font-weight: 600;
    }

    .session-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: var(--color-forest);
      box-shadow: 0 0 0 2px rgba(23, 63, 53, 0.2);
    }

    .session-dot.faculty-dot {
      background-color: var(--color-amber-dark);
      box-shadow: 0 0 0 2px rgba(180, 83, 9, 0.25);
    }

    .chip-label {
      color: var(--color-forest);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .chip-val {
      color: var(--color-forest-dark);
      font-weight: 700;
    }

    /* User Badge */
    .user-badge {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 8px;
      border-radius: var(--radius-md);
      transition: background-color var(--transition-fast);
    }

    .user-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: var(--color-forest);
      color: #FFFFFF;
      font-weight: 700;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(23, 63, 53, 0.2);
    }

    .user-avatar.faculty-avatar {
      background: var(--color-amber-dark);
    }

    .user-info-text {
      display: flex;
      flex-direction: column;
    }

    .user-display-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.2;
    }

    .user-role {
      font-size: 11px;
      color: var(--text-muted);
    }

    /* Logout Button */
    .logout-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: transparent;
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .logout-btn:hover {
      background: var(--color-danger-surface);
      color: var(--color-danger);
      border-color: var(--color-danger-border);
    }

    @media (max-width: 900px) {
      .menu-toggle-btn {
        display: flex;
      }
      .user-info-text,
      .session-chip {
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
      this.currentPageTitle.set('Session Attendance Manager');
    } else if (url.includes('/faculty/assignments')) {
      this.currentPageTitle.set('Assignments & Grading Console');
    } else if (url.includes('/faculty/materials')) {
      this.currentPageTitle.set('Learning Materials Repository');
    } else if (url.includes('/faculty/assessments')) {
      this.currentPageTitle.set('Assessments & Quizzes Console');
    } else if (url.includes('/faculty/dashboard') || url === '/faculty') {
      this.currentPageTitle.set('Faculty Operations Dashboard');
    } else if (url.includes('/faculty')) {
      this.currentPageTitle.set('Faculty Workspace');
    } else if (url.includes('/courses')) {
      this.currentPageTitle.set('My Enrolled Courses');
    } else if (url.includes('/attendance')) {
      this.currentPageTitle.set('Attendance & Analytics');
    } else if (url.includes('/assignments')) {
      this.currentPageTitle.set('Assignments & Submissions');
    } else if (url.includes('/learning-materials')) {
      this.currentPageTitle.set('Learning Materials & Resources');
    } else if (url.includes('/results')) {
      this.currentPageTitle.set('Academic Results & Transcripts');
    } else if (url.includes('/assessments')) {
      this.currentPageTitle.set('Quiz & Assessment Center');
    } else if (url.includes('/profile')) {
      this.currentPageTitle.set('Student Academic Profile');
    } else if (url.includes('/ai-assistant')) {
      this.currentPageTitle.set('CRHDRI AI Copilot');
    } else {
      this.currentPageTitle.set('Academic Dashboard');
    }
  }

  backendStatusTooltip(): string {
    return this.isConnected()
      ? 'Backend ASP.NET Core API at http://localhost:5083 is healthy and connected to PostgreSQL.'
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
