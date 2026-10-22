import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssessmentsService } from '../../core/services/assessments.service';
import { Assessment, QuizQuestionsResponse, QuizSubmissionResult } from '../../core/models/student.models';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon.component';

@Component({
  selector: 'app-assessments',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="assessments-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h2 class="page-title font-editorial">Quiz & Assessment Center</h2>
          <p class="page-subtitle">
            Standardized tests, multiple choice evaluations, and knowledge checks
            @if (assessments().length > 0) {
              <span class="header-count font-mono">&bull; {{ filteredAssessments().length }} available</span>
            }
          </p>
        </div>

        <div class="header-controls">
          <div class="search-box">
            <app-icon name="search" [size]="16" class="search-icon"></app-icon>
            <input 
              type="text" 
              [ngModel]="searchQuery()" 
              (ngModelChange)="searchQuery.set($event)" 
              placeholder="Search assessment or subject..." 
              class="search-input"
            />
            @if (searchQuery()) {
              <button class="clear-btn" (click)="searchQuery.set('')" title="Clear search">✕</button>
            }
          </div>

          <button class="btn btn-secondary btn-sm" (click)="loadAssessments()" title="Refresh Assessments">
            <app-icon name="refresh" [size]="14"></app-icon> Refresh
          </button>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="skeleton-grid">
          <div class="skeleton item-skeleton" *ngFor="let i of [1, 2]"></div>
        </div>
      }

      <!-- Error State -->
      @else if (errorMessage()) {
        <div class="error-banner card-tactile" role="alert">
          <div class="error-icon-wrap">
            <app-icon name="alert" [size]="28"></app-icon>
          </div>
          <div class="error-text">
            <h3 class="error-title">Unable to Load Assessments</h3>
            <p class="error-desc">{{ errorMessage() }}</p>
            <p class="error-hint">Ensure the backend API at <code>http://localhost:5083</code> is running with PostgreSQL.</p>
          </div>
          <button class="btn btn-primary" (click)="loadAssessments()">
            <app-icon name="refresh" [size]="16"></app-icon>
            Retry Connection
          </button>
        </div>
      }

      <!-- Empty State -->
      @else if (filteredAssessments().length === 0) {
        <div class="card-tactile empty-state">
          <app-icon name="assessments" [size]="48" class="empty-icon"></app-icon>
          <h3 class="font-editorial empty-title">No Assessments Scheduled</h3>
          <p class="empty-desc">
            @if (searchQuery()) {
              No assessments matched your search "{{ searchQuery() }}".
            } @else {
              There are no quizzes or examinations currently scheduled for your courses.
            }
          </p>
          @if (searchQuery()) {
            <button class="btn btn-secondary" (click)="searchQuery.set('')">Clear Search Filter</button>
          } @else {
            <button class="btn btn-secondary" (click)="loadAssessments()">Check Again</button>
          }
        </div>
      }

      <!-- Assessments Cards -->
      @else {
        <div class="assessments-grid">
          @for (item of filteredAssessments(); track item.assessmentId) {
            <div class="card-tactile assessment-card">
              <div>
                <div class="card-top">
                  <div class="tag-group">
                    <span class="badge badge-forest font-mono">{{ item.assessmentType }}</span>
                    <span class="subject-tag font-mono">{{ item.subjectCode }}</span>
                  </div>
                  <span class="max-badge font-mono">Max: {{ item.maxMarks }} Marks</span>
                </div>

                <div class="card-body">
                  <h3 class="assessment-title font-editorial">{{ item.assessmentName }}</h3>
                  <span class="subject-title">{{ item.subjectName }}</span>
                  
                  @if (item.marksObtained !== null) {
                    <div class="evaluated-box">
                      <div class="eval-header-row">
                        <span class="eval-label">Score Recorded:</span>
                        <strong class="eval-score font-mono">{{ item.marksObtained }} / {{ item.maxMarks }}</strong>
                        @if (safePercentage(item.marksObtained, item.maxMarks) !== null) {
                          <span class="badge badge-forest font-mono">
                            {{ safePercentage(item.marksObtained, item.maxMarks) }}%
                          </span>
                        }
                      </div>
                      @if (item.feedback) {
                        <p class="eval-comment">"{{ item.feedback }}"</p>
                      }
                      @if (item.evaluatedAt) {
                        <span class="eval-date font-mono">Evaluated {{ item.evaluatedAt | date:'mediumDate' }}</span>
                      }
                    </div>
                  }
                </div>
              </div>

              <div class="card-footer">
                <div class="meta-date">
                  <app-icon name="clock" [size]="13"></app-icon>
                  <span>{{ item.assessmentDate ? (item.assessmentDate | date:'mediumDate') : 'Scheduled' }}</span>
                </div>

                <button 
                  class="btn btn-primary btn-sm" 
                  (click)="startQuiz(item)" 
                  [disabled]="loadingQuiz()">
                  <app-icon name="assessments" [size]="14"></app-icon>
                  {{ item.marksObtained !== null ? 'Review Questions' : 'Launch Assessment' }}
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Interactive Quiz Runner Modal -->
      @if (activeQuiz(); as quiz) {
        <div class="modal-overlay" (click)="closeQuiz()">
          <div class="card-tactile quiz-dialog" (click)="$event.stopPropagation()">
            <!-- Quiz Header -->
            <div class="quiz-header">
              <div class="quiz-header-meta">
                <span class="badge badge-forest font-mono">CRHDRI Quiz Engine</span>
                <h3 class="quiz-dialog-title font-editorial">{{ quiz.assessmentName }}</h3>
                <span class="quiz-marks-info">Total Marks: {{ quiz.maxMarks }} &bull; {{ quiz.questions.length }} Questions</span>
              </div>
              <button class="btn-ghost dialog-close" (click)="closeQuiz()" [disabled]="submitting()">✕</button>
            </div>

            <!-- Quiz Result View if Just Submitted -->
            @if (submissionResult(); as result) {
              <div class="quiz-result-view">
                <div class="result-crest">
                  <app-icon name="check" [size]="36"></app-icon>
                </div>
                <h4 class="result-headline font-editorial">{{ result.message }}</h4>
                <div class="result-score-dial">
                  <span class="result-score-val font-editorial">{{ result.marksObtained }} / {{ result.maxMarks }}</span>
                  <span class="result-score-pct font-mono">({{ result.percentage }}%)</span>
                </div>
                <p class="result-stats">
                  Answered: <strong>{{ result.answeredQuestions }}</strong> of <strong>{{ result.totalQuestions }}</strong> questions.
                </p>
                <div class="result-actions">
                  <button class="btn btn-primary" (click)="finishQuizSession()">Close Assessment</button>
                </div>
              </div>
            }

            <!-- Active Question Runner -->
            @else {
              <!-- Question Index Tracker -->
              <div class="question-tracker-bar">
                <span class="tracker-label">Question Progress:</span>
                <div class="tracker-pills">
                  @for (q of quiz.questions; track q.questionId; let i = $index) {
                    <button 
                      class="tracker-btn font-mono" 
                      [class.active]="currentQuestionIndex() === i"
                      [class.answered]="userAnswers()[q.questionId]"
                      (click)="currentQuestionIndex.set(i)">
                      {{ i + 1 }}
                    </button>
                  }
                </div>
              </div>

              <!-- Question Display Area -->
              @if (quiz.questions[currentQuestionIndex()]; as currentQ) {
                <div class="question-container">
                  <div class="question-meta-row">
                    <span class="question-num-tag font-mono">Question {{ currentQuestionIndex() + 1 }} of {{ quiz.questions.length }}</span>
                    <span class="question-marks font-mono">{{ currentQ.marks }} Marks</span>
                  </div>

                  <h4 class="question-prompt font-editorial">{{ currentQ.questionText }}</h4>

                  <!-- Multiple Choice Options -->
                  <div class="options-group">
                    @for (entry of getOptionEntries(currentQ.options); track entry.key) {
                      <label 
                        class="option-item" 
                        [class.selected]="userAnswers()[currentQ.questionId] === entry.key"
                        (click)="selectAnswer(currentQ.questionId, entry.key)">
                        <span class="option-key font-mono">{{ entry.key }}</span>
                        <span class="option-label">{{ entry.val }}</span>
                      </label>
                    }
                  </div>
                </div>
              }

              <!-- Error Banner inside quiz if submission fails -->
              @if (quizError()) {
                <div class="quiz-error-banner">
                  <app-icon name="alert" [size]="16"></app-icon>
                  <span>{{ quizError() }}</span>
                </div>
              }

              <!-- Quiz Dialog Footer -->
              <div class="quiz-footer">
                <div class="footer-nav-buttons">
                  <button 
                    class="btn btn-secondary btn-sm" 
                    [disabled]="currentQuestionIndex() === 0"
                    (click)="currentQuestionIndex.update(i => i - 1)">
                    ← Previous
                  </button>
                  <button 
                    class="btn btn-secondary btn-sm" 
                    [disabled]="currentQuestionIndex() === quiz.questions.length - 1"
                    (click)="currentQuestionIndex.update(i => i + 1)">
                    Next →
                  </button>
                </div>

                <div class="footer-submit-block">
                  <span class="answered-count-text font-mono">
                    {{ getAnsweredCount() }} / {{ quiz.questions.length }} Answered
                  </span>
                  <button 
                    class="btn btn-primary" 
                    (click)="confirmSubmitQuiz()"
                    [disabled]="submitting() || getAnsweredCount() === 0">
                    @if (submitting()) {
                      <app-icon name="refresh" [size]="14" class="spin"></app-icon> Submitting...
                    } @else {
                      Submit Assessment
                    }
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .assessments-page {
      display: flex;
      flex-direction: column;
      gap: 22px;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
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

    .header-count {
      color: var(--color-forest);
      font-weight: 600;
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      color: var(--text-muted);
      pointer-events: none;
    }

    .search-input {
      width: 280px;
      padding: 9px 34px 9px 36px;
      font-size: 13.5px;
      background: var(--bg-surface);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      color: var(--text-main);
      box-shadow: inset 0 1px 2px rgba(32, 40, 36, 0.04);
      transition: border-color var(--transition-fast);
    }

    .search-input:focus {
      outline: none;
      border-color: var(--color-forest);
      box-shadow: 0 0 0 3px rgba(23, 63, 53, 0.1);
    }

    .clear-btn {
      position: absolute;
      right: 10px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 12px;
    }

    /* Skeleton */
    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 18px;
    }

    .item-skeleton {
      height: 200px;
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

    /* Assessments Grid */
    .assessments-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 18px;
    }

    .assessment-card {
      padding: 24px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      gap: 16px;
    }

    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
      gap: 10px;
    }

    .tag-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .subject-tag {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-forest);
      background: rgba(23, 63, 53, 0.08);
      padding: 3px 8px;
      border-radius: var(--radius-sm);
    }

    .max-badge {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 600;
    }

    .card-body {
      margin-bottom: 14px;
    }

    .assessment-title {
      font-size: 20px;
      font-weight: 600;
      color: var(--color-forest);
      margin-bottom: 4px;
      line-height: 1.35;
    }

    .subject-title {
      font-size: 13px;
      color: var(--color-sage);
      font-weight: 600;
    }

    .evaluated-box {
      margin-top: 14px;
      padding: 12px 16px;
      background: rgba(23, 63, 53, 0.05);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .eval-header-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .eval-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--color-forest);
      letter-spacing: 0.05em;
    }

    .eval-score {
      font-size: 14px;
      color: var(--color-forest-dark);
    }

    .eval-comment {
      font-size: 12.5px;
      color: var(--text-main);
      font-style: italic;
      margin-top: 2px;
    }

    .eval-date {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--border-subtle);
      padding-top: 14px;
      gap: 12px;
      flex-wrap: wrap;
    }

    .meta-date {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      color: var(--text-muted);
    }

    /* Quiz Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(32, 40, 36, 0.45);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .quiz-dialog {
      width: 100%;
      max-width: 680px;
      background: var(--bg-surface);
      padding: 28px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .quiz-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 14px;
    }

    .quiz-header-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .quiz-dialog-title {
      font-size: 22px;
      font-weight: 600;
      color: var(--color-forest);
    }

    .quiz-marks-info {
      font-size: 12px;
      color: var(--text-muted);
    }

    .dialog-close {
      font-size: 16px;
      padding: 4px 8px;
    }

    /* Tracker Bar */
    .question-tracker-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      padding: 10px 14px;
      background: var(--bg-surface-subtle);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
    }

    .tracker-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-secondary);
    }

    .tracker-pills {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .tracker-btn {
      width: 30px;
      height: 30px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-medium);
      background: var(--bg-surface);
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);
    }

    .tracker-btn.active {
      border-color: var(--color-forest);
      background: var(--color-forest);
      color: #FFFFFF;
      box-shadow: 0 2px 4px rgba(23, 63, 53, 0.25);
    }

    .tracker-btn.answered:not(.active) {
      background: rgba(23, 63, 53, 0.1);
      border-color: var(--color-forest);
      color: var(--color-forest);
    }

    /* Question Container */
    .question-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .question-meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .question-num-tag {
      font-size: 12px;
      font-weight: 700;
      color: var(--color-forest);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .question-marks {
      font-size: 12px;
      color: var(--text-muted);
    }

    .question-prompt {
      font-size: 19px;
      font-weight: 600;
      color: var(--color-forest);
      line-height: 1.4;
    }

    .options-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .option-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 18px;
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .option-item:hover {
      background: var(--bg-surface-subtle);
      border-color: var(--border-medium);
    }

    .option-item.selected {
      background: rgba(23, 63, 53, 0.06);
      border-color: var(--color-forest);
      box-shadow: 0 0 0 2px rgba(23, 63, 53, 0.15);
    }

    .option-key {
      width: 30px;
      height: 30px;
      border-radius: var(--radius-sm);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      color: var(--text-secondary);
      flex-shrink: 0;
    }

    .option-item.selected .option-key {
      background: var(--color-forest);
      color: #FFFFFF;
      border-color: var(--color-forest);
    }

    .option-label {
      font-size: 14px;
      color: var(--text-main);
      font-weight: 500;
    }

    .quiz-error-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: rgba(184, 66, 51, 0.08);
      border: 1px solid rgba(184, 66, 51, 0.25);
      border-radius: var(--radius-md);
      color: var(--color-danger);
      font-size: 13px;
    }

    .quiz-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--border-subtle);
      padding-top: 16px;
      gap: 12px;
      flex-wrap: wrap;
    }

    .footer-nav-buttons {
      display: flex;
      gap: 8px;
    }

    .footer-submit-block {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .answered-count-text {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 600;
    }

    /* Result View */
    .quiz-result-view {
      padding: 32px 16px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .result-crest {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(23, 63, 53, 0.08);
      color: var(--color-forest);
      border: 2px solid var(--color-forest);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .result-headline {
      font-size: 24px;
      font-weight: 600;
      color: var(--color-forest);
    }

    .result-score-dial {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }

    .result-score-val {
      font-size: 36px;
      font-weight: 700;
      color: var(--color-forest-dark);
    }

    .result-score-pct {
      font-size: 18px;
      color: var(--text-muted);
    }

    .result-stats {
      font-size: 14px;
      color: var(--text-secondary);
    }

    .result-actions {
      margin-top: 8px;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* Empty */
    .empty-state {
      padding: 56px 32px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }

    .empty-icon {
      color: var(--text-muted);
      opacity: 0.7;
    }

    .empty-title {
      font-size: 22px;
      font-weight: 600;
      color: var(--color-forest);
    }

    .empty-desc {
      font-size: 14px;
      color: var(--text-muted);
      max-width: 440px;
      line-height: 1.5;
    }

    @media (max-width: 768px) {
      .assessments-grid {
        grid-template-columns: 1fr;
      }
      .skeleton-grid {
        grid-template-columns: 1fr;
      }
      .search-input {
        width: 100%;
      }
      .header-controls {
        width: 100%;
      }
    }
  `]
})
export class AssessmentsComponent implements OnInit {
  private readonly assessmentsService = inject(AssessmentsService);
  private readonly toast = inject(ToastService);

  assessments = signal<Assessment[]>([]);
  loading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);

  searchQuery = signal<string>('');
  filteredAssessments = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.assessments();
    if (!q) return list;
    return list.filter(a => 
      a.assessmentName.toLowerCase().includes(q) ||
      a.subjectName.toLowerCase().includes(q) ||
      a.subjectCode.toLowerCase().includes(q)
    );
  });

  loadingQuiz = signal<boolean>(false);
  activeQuiz = signal<QuizQuestionsResponse | null>(null);
  currentAssessment = signal<Assessment | null>(null);
  currentQuestionIndex = signal<number>(0);
  userAnswers = signal<Record<string, string>>({});
  submitting = signal<boolean>(false);
  quizError = signal<string | null>(null);
  submissionResult = signal<QuizSubmissionResult | null>(null);

  ngOnInit(): void {
    this.loadAssessments();
  }

  loadAssessments(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.assessmentsService.getAssessments().subscribe({
      next: (res) => {
        this.assessments.set(res?.assessments || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Failed to load assessments.');
        this.loading.set(false);
      }
    });
  }

  startQuiz(item: Assessment): void {
    this.currentAssessment.set(item);
    this.loadingQuiz.set(true);
    this.quizError.set(null);
    this.submissionResult.set(null);
    this.userAnswers.set({});
    this.currentQuestionIndex.set(0);

    this.assessmentsService.getQuizQuestions(item.assessmentId).subscribe({
      next: (quizData) => {
        this.activeQuiz.set(quizData);
        this.loadingQuiz.set(false);
      },
      error: (err) => {
        this.toast.error(err.message || 'Unable to open quiz.', 'Quiz Error');
        this.loadingQuiz.set(false);
      }
    });
  }

  closeQuiz(): void {
    if (this.submitting()) return;
    if (this.submissionResult()) {
      this.finishQuizSession();
      return;
    }
    this.activeQuiz.set(null);
  }

  finishQuizSession(): void {
    this.activeQuiz.set(null);
    this.submissionResult.set(null);
    this.userAnswers.set({});
    this.loadAssessments();
  }

  getOptionEntries(options: Record<string, string> | any): { key: string; val: string }[] {
    if (!options || typeof options !== 'object') return [];
    return Object.keys(options).map(key => ({
      key,
      val: options[key]
    }));
  }

  selectAnswer(questionId: string, optionKey: string): void {
    this.userAnswers.update(curr => ({
      ...curr,
      [questionId]: optionKey
    }));
  }

  getAnsweredCount(): number {
    return Object.keys(this.userAnswers()).length;
  }

  safePercentage(obtained: number | null | undefined, max: number | null | undefined): number | null {
    if (typeof max === 'number' && max > 0 && typeof obtained === 'number' && obtained >= 0) {
      return Math.round((obtained * 100) / max);
    }
    return null;
  }

  confirmSubmitQuiz(): void {
    this.executeQuizSubmission();
  }

  private executeQuizSubmission(): void {
    const quiz = this.activeQuiz();
    if (!quiz) return;

    this.submitting.set(true);
    this.quizError.set(null);

    this.assessmentsService.submitQuiz(quiz.assessmentId, this.userAnswers()).subscribe({
      next: (result) => {
        this.submitting.set(false);
        this.submissionResult.set(result);
        this.toast.success(
          `Scored ${result.marksObtained} / ${result.maxMarks} (${result.percentage}%)`,
          'Quiz Completed'
        );
      },
      error: (err) => {
        this.submitting.set(false);
        this.quizError.set(err.message || 'Failed to submit quiz.');
      }
    });
  }
}
