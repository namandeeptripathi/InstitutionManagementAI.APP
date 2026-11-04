import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssessmentsService } from '../../core/services/assessments.service';
import { Assessment, QuizQuestionsResponse, QuizReviewResponse, QuizSubmissionResult } from '../../core/models/student.models';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon.component';

@Component({
  selector: 'app-assessments',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="assessments-page">
      <!-- Header -->
      <div class="page-header-clean">
        <div>
          <h2 class="page-title">Quiz & Assessment Center</h2>
          <p class="page-subtitle">
            Standardized evaluations, quizzes, and automated knowledge checks
            @if (assessments().length > 0) {
              <span class="header-count font-mono">&bull; {{ filteredAssessments().length }} available</span>
            }
          </p>
        </div>

        <div class="header-controls">
          <div class="search-box-clean">
            <app-icon name="search" [size]="15" class="search-icon"></app-icon>
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
        <div class="error-banner card-modern" role="alert">
          <div class="error-icon-wrap">
            <app-icon name="alert" [size]="24"></app-icon>
          </div>
          <div class="error-text">
            <h3 class="error-title">Unable to Load Assessments</h3>
            <p class="error-desc">{{ errorMessage() }}</p>
            <p class="error-hint">Ensure the backend API at <code>http://localhost:5083</code> is active with PostgreSQL.</p>
          </div>
          <button class="btn btn-primary btn-sm" (click)="loadAssessments()">
            <app-icon name="refresh" [size]="14"></app-icon> Retry
          </button>
        </div>
      }

      <!-- Empty State -->
      @else if (filteredAssessments().length === 0) {
        <div class="card-modern empty-state-box">
          <app-icon name="assessments" [size]="40" class="empty-icon"></app-icon>
          <h3 class="empty-title">No Assessments Scheduled</h3>
          <p class="empty-desc">
            @if (searchQuery()) {
              No assessments matched your search "{{ searchQuery() }}".
            } @else {
              There are no quizzes or examinations currently scheduled for your courses.
            }
          </p>
          @if (searchQuery()) {
            <button class="btn btn-secondary btn-sm" (click)="searchQuery.set('')">Clear Search Filter</button>
          } @else {
            <button class="btn btn-secondary btn-sm" (click)="loadAssessments()">Check Again</button>
          }
        </div>
      }

      <!-- Assessments Cards -->
      @else {
        <div class="assessments-grid">
          @for (item of filteredAssessments(); track item.assessmentId) {
            <div class="card-modern assessment-card" [class.card-completed]="isAssessmentCompleted(item)">
              <div class="assessment-card-body">
                <div class="card-top">
                  <div class="tag-group">
                    <span class="badge badge-teal font-mono">{{ item.assessmentType }}</span>
                    <span class="subject-tag font-mono">{{ item.subjectCode }}</span>
                    @if (isAssessmentCompleted(item)) {
                      <span class="badge badge-success font-mono">
                        <app-icon name="check" [size]="11"></app-icon> COMPLETED
                      </span>
                    } @else {
                      <span class="badge badge-amber font-mono">AVAILABLE</span>
                    }
                  </div>
                  <span class="max-badge font-mono">Max: {{ item.maxMarks }} Marks</span>
                </div>

                <div class="card-content">
                  <h3 class="assessment-title">{{ item.assessmentName }}</h3>
                  <span class="subject-title">{{ item.subjectName }}</span>
                  
                  @if (item.marksObtained !== null) {
                    <div class="evaluated-box">
                      <div class="eval-header-row">
                        <span class="eval-label">Score Recorded:</span>
                        <strong class="eval-score font-mono">{{ item.marksObtained }} / {{ item.maxMarks }}</strong>
                        @if (safePercentage(item.marksObtained, item.maxMarks) !== null) {
                          <span class="badge badge-success font-mono">
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

                @if (isAssessmentCompleted(item)) {
                  <button 
                    class="btn btn-secondary btn-sm" 
                    (click)="openReview(item)" 
                    [disabled]="loadingReviewId() === item.assessmentId">
                    @if (loadingReviewId() === item.assessmentId) {
                      <app-icon name="refresh" [size]="13" class="spinning"></app-icon>
                      <span>Loading...</span>
                    } @else {
                      <app-icon name="assessments" [size]="13"></app-icon>
                      <span>Review Answers</span>
                    }
                  </button>
                } @else {
                  <button 
                    class="btn btn-primary btn-sm" 
                    (click)="startQuiz(item)" 
                    [disabled]="loadingQuiz()">
                    <app-icon name="assessments" [size]="13"></app-icon>
                    <span>Launch Quiz</span>
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Dedicated Quiz Attempt Review Modal -->
      @if (activeReview(); as review) {
        <div class="modal-overlay" (click)="closeReview()">
          <div class="card-modern review-dialog" (click)="$event.stopPropagation()">
            <!-- Review Header -->
            <div class="quiz-header">
              <div class="quiz-header-meta">
                <div class="tag-group">
                  <span class="badge badge-success font-mono">
                    <app-icon name="check" [size]="11"></app-icon> COMPLETED ATTEMPT
                  </span>
                  <span class="badge badge-teal font-mono">{{ review.subjectCode }}</span>
                </div>
                <h3 class="quiz-dialog-title">{{ review.assessmentName }}</h3>
                <span class="quiz-marks-info font-mono">
                  {{ review.subjectName }} &bull; Completed {{ review.evaluatedAt ? (review.evaluatedAt | date:'medium') : 'Recorded' }}
                </span>
              </div>
              <button class="btn-ghost dialog-close" (click)="closeReview()" title="Close Review">✕</button>
            </div>

            <!-- Review Scorecard Overview -->
            <div class="review-scorecard">
              <div class="scorecard-main">
                <div class="score-display">
                  <span class="score-number">{{ review.marksObtained }} / {{ review.maxMarks }}</span>
                  <span class="badge badge-success font-mono">{{ review.percentage }}%</span>
                  @if (review.attemptMarks !== null && review.attemptMarks !== undefined && review.attemptMarks !== review.marksObtained) {
                    <span class="stat-pill-sm font-mono text-muted">
                      Attempt: {{ review.attemptMarks }} / {{ review.maxMarks }}
                    </span>
                  }
                </div>
                <div class="score-status-summary">
                  <span class="stat-pill-sm stat-correct font-mono">
                    <strong>{{ review.correctCount }}</strong> Correct
                  </span>
                  <span class="stat-pill-sm stat-incorrect font-mono">
                    <strong>{{ review.incorrectCount }}</strong> Incorrect
                  </span>
                  <span class="stat-pill-sm stat-total font-mono">
                    <strong>{{ review.totalQuestions }}</strong> Questions
                  </span>
                </div>
              </div>
              @if (review.feedback) {
                <div class="review-feedback-quote">
                  <span class="feedback-label font-mono">Feedback: </span>
                  <span>"{{ review.feedback }}"</span>
                </div>
              }
            </div>

            <!-- Historical Notice if answer data wasn't preserved -->
            @if (!review.hasAnswerData) {
              <div class="review-notice-banner">
                <app-icon name="alert" [size]="15"></app-icon>
                <span>
                  <strong>Historical Record Notice:</strong>
                  Individual answer logs were not recorded for this legacy attempt. Authoritative question breakdown and correct answer keys are shown below.
                </span>
              </div>
            }

            <!-- Questions Review List -->
            <div class="review-questions-list">
              <div class="review-list-header">
                <h4 class="review-section-title">Question Breakdown & Answer Key</h4>
                <span class="font-mono text-xs text-muted">Authoritative Evaluation Data</span>
              </div>

              @if (review.questions.length === 0) {
                <div class="empty-questions-state">
                  <app-icon name="assessments" [size]="28"></app-icon>
                  <p>No itemized question breakdown is available for this assessment.</p>
                </div>
              }

              @for (q of review.questions; track q.questionId) {
                <div class="review-question-card" [class.card-correct]="q.isCorrect" [class.card-incorrect]="!q.isCorrect && q.isAnswered" [class.card-unanswered]="!q.isAnswered">
                  <!-- Header -->
                  <div class="review-question-header">
                    <div class="q-header-left">
                      <span class="question-num-tag font-mono">Question {{ q.questionNumber }} of {{ review.totalQuestions }}</span>
                      <span class="question-marks font-mono">&bull; Marks: {{ q.earnedMarks }} / {{ q.marks }}</span>
                    </div>

                    <div class="q-header-status">
                      @if (q.isCorrect) {
                        <span class="badge badge-success font-mono">
                          <app-icon name="check" [size]="11"></app-icon> CORRECT
                        </span>
                      } @else if (q.isAnswered) {
                        <span class="badge badge-danger font-mono">
                          ✕ INCORRECT
                        </span>
                      } @else {
                        <span class="badge badge-neutral font-mono">
                          NOT ANSWERED
                        </span>
                      }
                    </div>
                  </div>

                  <!-- Prompt -->
                  <h5 class="review-question-prompt">{{ q.questionText }}</h5>

                  <!-- Options List -->
                  <div class="review-options-group">
                    @for (entry of getOptionEntries(q.options); track entry.key) {
                      <div 
                        class="review-option-item"
                        [class.opt-correct-answer]="entry.key === q.correctAnswer"
                        [class.opt-user-wrong]="entry.key === q.studentAnswer && !q.isCorrect"
                        [class.opt-user-correct]="entry.key === q.studentAnswer && q.isCorrect">
                        <div class="opt-left">
                          <span class="option-key font-mono">{{ entry.key }}</span>
                          <span class="option-label">{{ entry.val }}</span>
                        </div>

                        <div class="opt-badges">
                          @if (entry.key === q.studentAnswer && q.isCorrect) {
                            <span class="opt-status-badge badge-user-correct font-mono">✓ Your Answer (Correct)</span>
                          } @else if (entry.key === q.studentAnswer && !q.isCorrect) {
                            <span class="opt-status-badge badge-user-wrong font-mono">✕ Your Answer (Incorrect)</span>
                          } @else if (entry.key === q.correctAnswer) {
                            <span class="opt-status-badge badge-correct-key font-mono">✓ Correct Answer</span>
                          }
                        </div>
                      </div>
                    }
                  </div>

                  <!-- Summary Footer -->
                  <div class="review-question-footer font-mono">
                    @if (q.isCorrect) {
                      <span class="footer-msg text-success">
                        <app-icon name="check" [size]="11"></app-icon> Correctly answered Option {{ q.correctAnswer }}. Earned {{ q.marks }} marks.
                      </span>
                    } @else if (q.isAnswered) {
                      <span class="footer-msg text-danger">
                        Selected Option {{ q.studentAnswer }} ({{ q.studentAnswerText || 'Selected' }}). Authoritative answer is Option {{ q.correctAnswer }} ({{ q.correctAnswerText }}).
                      </span>
                    } @else {
                      <span class="footer-msg text-muted">
                        Not answered. Authoritative answer is Option {{ q.correctAnswer }} ({{ q.correctAnswerText }}).
                      </span>
                    }
                  </div>

                  <!-- Explanation if present -->
                  @if (q.explanation) {
                    <div class="review-explanation font-mono">
                      <span class="explanation-title">Explanation: </span>{{ q.explanation }}
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Footer -->
            <div class="quiz-footer">
              <button class="btn btn-secondary btn-sm" (click)="closeReview()">
                ← Back to Assessments
              </button>
              <button class="btn btn-primary btn-sm" (click)="closeReview()">
                Done Reviewing
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Interactive Quiz Runner Modal -->
      @if (activeQuiz(); as quiz) {
        <div class="modal-overlay" (click)="closeQuiz()">
          <div class="card-modern quiz-dialog" (click)="$event.stopPropagation()">
            <!-- Header -->
            <div class="quiz-header">
              <div class="quiz-header-meta">
                <span class="badge badge-teal font-mono">CRHDRI Quiz Engine</span>
                <h3 class="quiz-dialog-title">{{ quiz.assessmentName }}</h3>
                <span class="quiz-marks-info">Total Marks: {{ quiz.maxMarks }} &bull; {{ quiz.questions.length }} Questions</span>
              </div>
              <button class="btn-ghost dialog-close" (click)="closeQuiz()" [disabled]="submitting()">✕</button>
            </div>

            <!-- Quiz Result View if Just Submitted -->
            @if (submissionResult(); as result) {
              <div class="quiz-result-view">
                <div class="result-crest">
                  <app-icon name="check" [size]="32"></app-icon>
                </div>
                <h4 class="result-headline">{{ result.message }}</h4>
                <div class="result-score-dial">
                  <span class="result-score-val">{{ result.marksObtained }} / {{ result.maxMarks }}</span>
                  <span class="result-score-pct font-mono">({{ result.percentage }}%)</span>
                </div>
                <p class="result-stats">
                  Answered: <strong>{{ result.answeredQuestions }}</strong> of <strong>{{ result.totalQuestions }}</strong> questions.
                </p>
                <div class="result-actions">
                  <button class="btn btn-primary btn-sm" (click)="finishQuizSession()">Close Assessment</button>
                </div>
              </div>
            }

            <!-- Active Question Runner -->
            @else {
              <!-- Question Progress Tracker -->
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

              <!-- Question Container -->
              @if (quiz.questions[currentQuestionIndex()]; as currentQ) {
                <div class="question-container">
                  <div class="question-meta-row">
                    <span class="question-num-tag font-mono">Question {{ currentQuestionIndex() + 1 }} of {{ quiz.questions.length }}</span>
                    <span class="question-marks font-mono">{{ currentQ.marks }} Marks</span>
                  </div>

                  <h4 class="question-prompt">{{ currentQ.questionText }}</h4>

                  <!-- Options -->
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

              <!-- Quiz Error Banner -->
              @if (quizError()) {
                <div class="quiz-error-banner">
                  <app-icon name="alert" [size]="15"></app-icon>
                  <span>{{ quizError() }}</span>
                </div>
              }

              <!-- Footer -->
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
                    class="btn btn-primary btn-sm" 
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

    .header-controls {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
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
      outline: none;
      transition: all var(--transition-fast);
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

    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .item-skeleton {
      height: 180px;
      border-radius: var(--radius-lg);
    }

    /* Cards Grid */
    .assessments-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .assessment-card {
      padding: 20px 22px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .assessment-card.card-completed {
      border-left: 3px solid var(--color-success);
    }

    .assessment-card-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .tag-group {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .subject-tag {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-teal);
      background: var(--color-teal-surface);
      border: 1px solid var(--color-teal-border);
      padding: 1px 6px;
      border-radius: var(--radius-xs);
    }

    .max-badge {
      font-size: 11px;
      color: var(--text-muted);
    }

    .card-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .assessment-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.3;
    }

    .subject-title {
      font-size: 12.5px;
      color: var(--text-secondary);
    }

    .evaluated-box {
      margin-top: 8px;
      padding: 10px 12px;
      background: var(--bg-surface-subtle);
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
      font-size: 12px;
    }

    .eval-label {
      color: var(--text-secondary);
      font-weight: 500;
    }

    .eval-score {
      color: var(--text-main);
    }

    .eval-comment {
      font-size: 12px;
      font-style: italic;
      color: var(--text-secondary);
    }

    .eval-date {
      font-size: 10.5px;
      color: var(--text-muted);
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--border-subtle);
      padding-top: 12px;
      margin-top: 14px;
      gap: 10px;
    }

    .meta-date {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11.5px;
      color: var(--text-muted);
    }

    /* Modal Overlay & Dialog */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(2px);
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
      border-radius: var(--radius-xl);
      padding: 24px;
      box-shadow: var(--shadow-modal);
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .review-dialog {
      max-width: 760px;
    }

    .quiz-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 14px;
    }

    .quiz-header-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .quiz-dialog-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-main);
    }

    .quiz-marks-info {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .dialog-close {
      font-size: 16px;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px 8px;
    }

    /* Scorecard in Review */
    .review-scorecard {
      padding: 14px 16px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .scorecard-main {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .score-display {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .score-number {
      font-size: 20px;
      font-weight: 800;
      color: var(--color-teal);
    }

    .score-status-summary {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .stat-pill-sm {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      background: var(--bg-surface);
    }

    .stat-correct { color: var(--color-success); background: var(--color-success-surface); border-color: var(--color-success-border); }
    .stat-incorrect { color: var(--color-danger); background: var(--color-danger-surface); border-color: var(--color-danger-border); }
    .stat-total { color: var(--text-secondary); }

    .review-feedback-quote {
      font-size: 12px;
      color: var(--text-secondary);
      border-left: 3px solid var(--color-teal);
      padding-left: 8px;
    }

    .feedback-label { font-weight: 700; color: var(--color-teal); }

    .review-notice-banner {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 12px;
      background: var(--color-amber-surface);
      border: 1px solid var(--color-amber-border);
      border-radius: var(--radius-md);
      font-size: 11.5px;
      color: var(--color-amber);
    }

    /* Review Questions List */
    .review-questions-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .review-list-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 6px;
    }

    .review-section-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
    }

    .review-question-card {
      padding: 14px 16px;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .review-question-card.card-correct { border-left: 4px solid var(--color-success); }
    .review-question-card.card-incorrect { border-left: 4px solid var(--color-danger); }
    .review-question-card.card-unanswered { border-left: 4px solid var(--text-muted); }

    .review-question-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }

    .question-num-tag {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-secondary);
    }

    .question-marks {
      font-size: 11px;
      color: var(--text-muted);
    }

    .review-question-prompt {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-main);
      line-height: 1.4;
    }

    .review-options-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .review-option-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 8px 12px;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      background: var(--bg-surface-subtle);
      font-size: 13px;
    }

    .review-option-item .opt-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .review-option-item.opt-correct-answer {
      border-color: var(--color-success);
      background: var(--color-success-surface);
    }

    .review-option-item.opt-user-wrong {
      border-color: var(--color-danger);
      background: var(--color-danger-surface);
    }

    .review-option-item.opt-user-correct {
      border-color: var(--color-success);
      background: var(--color-success-surface);
    }

    .opt-status-badge {
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: var(--radius-xs);
      white-space: nowrap;
    }

    .badge-correct-key, .badge-user-correct { background: var(--color-success); color: #FFFFFF; }
    .badge-user-wrong { background: var(--color-danger); color: #FFFFFF; }

    .review-question-footer {
      font-size: 11.5px;
      padding-top: 6px;
      border-top: 1px solid var(--border-subtle);
    }

    .text-success { color: var(--color-success); display: inline-flex; align-items: center; gap: 4px; }
    .text-danger { color: var(--color-danger); }

    .review-explanation {
      font-size: 11.5px;
      color: var(--text-secondary);
      background: var(--bg-surface-subtle);
      padding: 6px 10px;
      border-radius: var(--radius-sm);
    }

    .explanation-title { font-weight: 700; color: var(--text-main); }

    /* Interactive Quiz Runner */
    .question-tracker-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      padding: 10px 12px;
      background: var(--bg-surface-subtle);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
    }

    .tracker-label {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .tracker-pills {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .tracker-btn {
      width: 26px;
      height: 26px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      background: var(--bg-surface);
      font-size: 11px;
      font-weight: 700;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);
    }

    .tracker-btn.answered {
      background: var(--color-teal-surface);
      color: var(--color-teal);
      border-color: var(--color-teal-border);
    }

    .tracker-btn.active {
      background: var(--color-teal);
      color: #FFFFFF;
      border-color: var(--color-teal);
    }

    .question-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .question-meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .question-prompt {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.4;
    }

    .options-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .option-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      cursor: pointer;
      transition: all var(--transition-fast);
      user-select: none;
    }

    .option-item:hover {
      border-color: var(--color-teal);
      background: var(--bg-surface-subtle);
    }

    .option-item.selected {
      border-color: var(--color-teal);
      background: var(--color-teal-surface);
      box-shadow: 0 0 0 1px var(--color-teal);
    }

    .option-key {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11.5px;
      font-weight: 700;
      color: var(--text-secondary);
      flex-shrink: 0;
    }

    .option-item.selected .option-key {
      background: var(--color-teal);
      color: #FFFFFF;
      border-color: var(--color-teal);
    }

    .option-label {
      font-size: 13.5px;
      color: var(--text-main);
    }

    .quiz-error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: var(--color-danger-surface);
      border: 1px solid var(--color-danger-border);
      border-radius: var(--radius-md);
      font-size: 12px;
      color: var(--color-danger);
    }

    .quiz-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--border-subtle);
      padding-top: 14px;
      gap: 12px;
      flex-wrap: wrap;
    }

    .footer-nav-buttons {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .footer-submit-block {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .answered-count-text {
      font-size: 11.5px;
      color: var(--text-secondary);
    }

    /* Result View */
    .quiz-result-view {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 24px;
      gap: 12px;
    }

    .result-crest {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: var(--color-success-surface);
      color: var(--color-success);
      border: 1px solid var(--color-success-border);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .result-headline {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-main);
    }

    .result-score-dial {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }

    .result-score-val {
      font-size: 28px;
      font-weight: 800;
      color: var(--color-teal);
    }

    .result-score-pct {
      font-size: 16px;
      color: var(--text-secondary);
    }

    .result-stats {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .spinning {
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

    @media (max-width: 800px) {
      .assessments-grid,
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

  activeReview = signal<QuizReviewResponse | null>(null);
  loadingReviewId = signal<string | null>(null);
  reviewError = signal<string | null>(null);

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

  isAssessmentCompleted(item: Assessment): boolean {
    return item.isCompleted === true || item.marksObtained !== null || !!item.attemptId;
  }

  openReview(item: Assessment): void {
    if (this.loadingReviewId()) return;
    this.loadingReviewId.set(item.assessmentId);
    this.reviewError.set(null);

    this.assessmentsService.getQuizReview(item.assessmentId).subscribe({
      next: (reviewData) => {
        this.activeReview.set(reviewData);
        this.loadingReviewId.set(null);
      },
      error: (err) => {
        this.loadingReviewId.set(null);
        this.toast.error(err.message || 'Unable to open quiz review.', 'Review Error');
      }
    });
  }

  closeReview(): void {
    this.activeReview.set(null);
    this.reviewError.set(null);
  }

  @HostListener('document:keydown.escape')
  handleEscapeKey(): void {
    if (this.activeReview()) {
      this.closeReview();
    } else if (this.activeQuiz() && !this.submitting()) {
      this.closeQuiz();
    }
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
