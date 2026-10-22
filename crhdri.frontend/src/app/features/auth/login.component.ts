import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/components/icon.component';
import { UserRole } from '../../core/models/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="login-wrapper">
      <div class="login-container">
        <!-- Brand Header -->
        <div class="brand-header">
          <div class="brand-crest">
            <span class="crest-letter font-editorial">C</span>
          </div>
          <div class="brand-titles">
            <h1 class="brand-name font-editorial">CRHDRI<span>.AI</span></h1>
            <span class="brand-sub">
              {{ activeRole() === 'FACULTY' ? 'FACULTY PORTAL • ACADEMIC OPERATIONS' : 'STUDENT PORTAL • INSTITUTION STUDIO' }}
            </span>
          </div>
        </div>

        <!-- Main Login Tactile Card -->
        <div class="card-tactile login-card">
          <!-- Role Switcher Tabs -->
          <div class="role-selector" role="tablist" aria-label="Portal Selection">
            <button
              type="button"
              class="role-tab"
              [class.active]="activeRole() === 'STUDENT'"
              (click)="selectRole('STUDENT')"
              role="tab"
              [attr.aria-selected]="activeRole() === 'STUDENT'"
            >
              <app-icon name="courses" [size]="16"></app-icon>
              <span>Student Portal</span>
            </button>

            <button
              type="button"
              class="role-tab"
              [class.active]="activeRole() === 'FACULTY'"
              (click)="selectRole('FACULTY')"
              role="tab"
              [attr.aria-selected]="activeRole() === 'FACULTY'"
            >
              <app-icon name="profile" [size]="16"></app-icon>
              <span>Faculty Portal</span>
            </button>
          </div>

          <!-- Card Header Block -->
          <div class="card-header-block">
            <div class="auth-icon-badge" [class.faculty-badge]="activeRole() === 'FACULTY'">
              <app-icon [name]="activeRole() === 'FACULTY' ? 'profile' : 'lock'" [size]="22"></app-icon>
            </div>
            <h2 class="auth-title font-editorial">
              {{ activeRole() === 'FACULTY' ? 'Faculty Authentication' : 'Student Authentication' }}
            </h2>
            <p class="auth-subtitle">
              @if (activeRole() === 'FACULTY') {
                Sign in with your institutional faculty email to manage course subjects, attendance, student rosters, and assessments.
              } @else {
                Sign in with your enrollment number or institutional email to access coursework, attendance, and academic records.
              }
            </p>
          </div>

          <!-- Error Alert Banner -->
          @if (errorMessage()) {
            <div class="error-banner" role="alert">
              <app-icon name="alert" [size]="18" class="error-icon"></app-icon>
              <div class="error-text">{{ errorMessage() }}</div>
            </div>
          }

          <!-- Login Form -->
          <form class="login-form" (ngSubmit)="onSubmit()">
            <!-- Identifier Field -->
            <div class="form-group">
              <label for="identifier" class="form-label">
                {{ activeRole() === 'FACULTY' ? 'Faculty Institutional Email' : 'Enrollment Number or Institutional Email' }}
              </label>
              <div class="input-wrap">
                <app-icon name="profile" [size]="16" class="input-icon"></app-icon>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  [(ngModel)]="identifier"
                  [placeholder]="activeRole() === 'FACULTY' ? 'e.g. demo.faculty@crhdri.ai' : 'e.g. STU-DEMO-001 or demo.student@crhdri.ai'"
                  class="form-control"
                  autocomplete="username"
                  [disabled]="loading()"
                  required
                />
              </div>
            </div>

            <!-- Password Field -->
            <div class="form-group">
              <div class="label-row">
                <label for="password" class="form-label">
                  {{ activeRole() === 'FACULTY' ? 'Faculty Password' : 'Account Password' }}
                </label>
              </div>
              <div class="input-wrap">
                <app-icon name="lock" [size]="16" class="input-icon"></app-icon>
                <input
                  id="password"
                  name="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  [(ngModel)]="password"
                  [placeholder]="activeRole() === 'FACULTY' ? 'Enter your faculty password' : 'Enter your student password'"
                  class="form-control"
                  autocomplete="current-password"
                  [disabled]="loading()"
                  required
                />
                <button
                  type="button"
                  class="password-toggle-btn"
                  (click)="togglePasswordVisibility()"
                  [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                  tabindex="-1"
                >
                  <app-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="16"></app-icon>
                </button>
              </div>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              class="btn btn-primary submit-btn"
              [disabled]="loading() || !identifier.trim() || !password"
            >
              @if (loading()) {
                <app-icon name="refresh" [size]="16" class="spin-icon"></app-icon>
                Authenticating...
              } @else {
                <app-icon name="badge-check" [size]="16"></app-icon>
                {{ activeRole() === 'FACULTY' ? 'Sign In to Faculty Portal' : 'Sign In to Student Portal' }}
              }
            </button>
          </form>

          <!-- Institutional Demo Assistance Notice -->
          <div class="institutional-hint" (click)="fillDemoCredentials()" title="Click to fill demo credentials">
            <div class="hint-header">
              <span class="hint-badge font-mono">Demo Account</span>
              <span class="hint-title">
                {{ activeRole() === 'FACULTY' ? 'Default Faculty Identity' : 'Default Student Identity' }}
              </span>
              <span class="auto-fill-tag">(Click to fill)</span>
            </div>
            <div class="hint-body">
              @if (activeRole() === 'FACULTY') {
                Email: <code class="font-mono">demo.faculty&#64;crhdri.ai</code> &bull; <span class="sub-hint">FAC-DEMO-001 (Dept of AI & ML)</span>
              } @else {
                Identifier: <code class="font-mono">STU-DEMO-001</code> &bull; <code class="font-mono">demo.student&#64;crhdri.ai</code>
              }
            </div>
          </div>
        </div>

        <!-- Footer Notice -->
        <footer class="login-footer">
          <p>Verified institutional system &bull; All access is monitored and logged in compliance with university academic security guidelines.</p>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      background: var(--bg-surface-subtle);
    }

    .login-container {
      width: 100%;
      max-width: 480px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Brand Header */
    .brand-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
    }

    .brand-crest {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      background: var(--color-forest);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(23, 63, 53, 0.2);
    }

    .crest-letter {
      font-size: 24px;
      font-weight: 700;
    }

    .brand-titles {
      display: flex;
      flex-direction: column;
    }

    .brand-name {
      font-size: 22px;
      font-weight: 700;
      color: var(--color-forest);
      letter-spacing: -0.01em;
      line-height: 1.1;
    }

    .brand-name span {
      color: var(--color-amber);
    }

    .brand-sub {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: var(--text-muted);
      margin-top: 2px;
    }

    /* Login Card */
    .login-card {
      padding: 32px 32px;
      background: #FFFFFF;
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-tactile);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Role Selector Tabs */
    .role-selector {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      padding: 4px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
    }

    .role-tab {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 9px 12px;
      border: none;
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .role-tab:hover {
      color: var(--color-forest);
    }

    .role-tab.active {
      background: #FFFFFF;
      color: var(--color-forest);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      font-weight: 700;
    }

    .card-header-block {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .auth-icon-badge {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--color-forest-surface);
      color: var(--color-forest);
      border: 1px solid var(--color-forest-border);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 2px;
      transition: all var(--transition-normal);
    }

    .auth-icon-badge.faculty-badge {
      background: rgba(180, 83, 9, 0.1);
      color: var(--color-amber-dark);
      border-color: rgba(180, 83, 9, 0.25);
    }

    .auth-title {
      font-size: 24px;
      font-weight: 600;
      color: var(--color-forest);
    }

    .auth-subtitle {
      font-size: 13.5px;
      color: var(--text-secondary);
      line-height: 1.45;
    }

    /* Error Banner */
    .error-banner {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 16px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-left: 4px solid #dc2626;
      border-radius: var(--radius-md);
      font-size: 13px;
      color: #991b1b;
      line-height: 1.4;
    }

    .error-icon {
      color: #dc2626;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .error-text {
      flex: 1;
    }

    /* Form */
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .form-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-forest);
    }

    .input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 14px;
      color: var(--text-muted);
      pointer-events: none;
    }

    .form-control {
      width: 100%;
      padding: 12px 14px 12px 42px;
      font-size: 14px;
      color: var(--text-main);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      transition: all 0.15s ease;
      outline: none;
      font-family: inherit;
    }

    .form-control:focus {
      background: #FFFFFF;
      border-color: var(--color-forest);
      box-shadow: 0 0 0 3px rgba(23, 63, 53, 0.1);
    }

    .form-control:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .password-toggle-btn {
      position: absolute;
      right: 12px;
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: var(--radius-sm);
      transition: color 0.15s ease;
    }

    .password-toggle-btn:hover {
      color: var(--color-forest);
    }

    .submit-btn {
      margin-top: 6px;
      width: 100%;
      height: 44px;
      font-size: 14.5px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* Hint Box */
    .institutional-hint {
      padding: 14px 16px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 12px;
      color: #92400e;
      cursor: pointer;
      transition: background-color var(--transition-fast), border-color var(--transition-fast);
    }

    .institutional-hint:hover {
      background: #fef3c7;
      border-color: #f59e0b;
    }

    .auto-fill-tag {
      font-size: 11px;
      color: #b45309;
      font-weight: 500;
      margin-left: auto;
    }

    .hint-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .hint-badge {
      font-size: 10px;
      font-weight: 700;
      color: #92400e;
      background: rgba(146, 64, 14, 0.12);
      padding: 1px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }

    .hint-title {
      font-weight: 600;
    }

    .hint-body {
      color: #78350f;
    }

    .hint-body code {
      background: rgba(146, 64, 14, 0.08);
      padding: 2px 5px;
      border-radius: 3px;
      font-size: 11.5px;
    }

    .sub-hint {
      font-size: 11px;
      opacity: 0.9;
    }

    /* Footer */
    .login-footer {
      text-align: center;
      font-size: 11.5px;
      color: var(--text-muted);
      line-height: 1.45;
    }
  `]
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  activeRole = signal<UserRole>('STUDENT');
  identifier = '';
  password = '';

  loading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal<boolean>(false);

  ngOnInit(): void {
    const roleParam = this.route.snapshot.queryParams['role'];
    if (roleParam && roleParam.toUpperCase() === 'FACULTY') {
      this.activeRole.set('FACULTY');
    }
  }

  selectRole(role: UserRole): void {
    if (this.activeRole() !== role) {
      this.activeRole.set(role);
      this.identifier = '';
      this.password = '';
      this.errorMessage.set(null);
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  fillDemoCredentials(): void {
    if (this.activeRole() === 'FACULTY') {
      this.identifier = 'demo.faculty@crhdri.ai';
      this.password = 'DemoFaculty@2026';
    } else {
      this.identifier = 'STU-DEMO-001';
      this.password = 'DemoStudent@2026';
    }
  }

  onSubmit(): void {
    if (!this.identifier.trim() || !this.password) {
      this.errorMessage.set('Please enter both identifier/email and password.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const creds = {
      identifier: this.identifier.trim(),
      password: this.password
    };

    if (this.activeRole() === 'FACULTY') {
      this.authService.loginFaculty(creds).subscribe({
        next: () => {
          this.loading.set(false);
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/faculty/dashboard';
          this.router.navigateByUrl(returnUrl);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err.message || 'Faculty login failed. Please verify your credentials.');
        }
      });
    } else {
      this.authService.login(creds).subscribe({
        next: () => {
          this.loading.set(false);
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
          this.router.navigateByUrl(returnUrl);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err.message || 'Student login failed. Please verify your credentials.');
        }
      });
    }
  }
}
