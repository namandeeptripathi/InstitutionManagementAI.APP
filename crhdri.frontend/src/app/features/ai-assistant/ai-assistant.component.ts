import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../shared/components/icon.component';

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="ai-page">
      <!-- Main Overview Hero Card -->
      <section class="card-modern hero-ai-card">
        <div class="ai-crest-box">
          <app-icon name="ai" [size]="32"></app-icon>
        </div>

        <div class="badge-row">
          <span class="badge badge-info font-mono">Future Roadmap &bull; Phase 2</span>
          <span class="badge badge-teal">Backend Audit Complete</span>
        </div>

        <h2 class="ai-title">CRHDRI Academic Copilot</h2>
        <p class="ai-subtitle">
          Intelligent curriculum assistant, personalized study scheduling, and syllabus inquiry.
        </p>

        <!-- Audit Status Notice -->
        <div class="status-banner" role="status">
          <app-icon name="alert" [size]="16" class="banner-icon"></app-icon>
          <div class="banner-text">
            <strong>Backend Capability Audit:</strong> The current ASP.NET Core API (<code>http://localhost:5083</code>) does not implement an AI assistant endpoint or LLM inference pipeline. In adherence to university governance, mock replies are prohibited.
          </div>
        </div>

        <!-- Capability Audit Summary Grid -->
        <div class="audit-grid">
          <div class="audit-item">
            <span class="audit-label">Backend AI Endpoint</span>
            <span class="audit-val font-mono">None (Unmapped in API)</span>
          </div>
          <div class="audit-item">
            <span class="audit-label">LLM Provider</span>
            <span class="audit-val font-mono">Awaiting Gateway Key</span>
          </div>
          <div class="audit-item">
            <span class="audit-label">Chat Session Storage</span>
            <span class="audit-val font-mono">No Chat Tables in DB</span>
          </div>
          <div class="audit-item">
            <span class="audit-label">Data Privacy Audit</span>
            <span class="audit-val font-mono">Institutional Review Pending</span>
          </div>
        </div>
      </section>

      <!-- Proposed Architecture & API Specification -->
      <section class="card-modern spec-card">
        <div class="spec-header">
          <div>
            <h3 class="spec-title">Proposed Backend API Contract (Phase 2)</h3>
            <p class="spec-subtitle">Technical blueprint required for enterprise AI integration in a future release</p>
          </div>
          <span class="badge badge-teal font-mono">POST /api/students/&#123;enrollment&#125;/copilot/query</span>
        </div>

        <div class="schema-cols">
          <div class="schema-box">
            <span class="schema-box-label">Proposed Request Payload</span>
            <pre class="code-block font-mono">&#123;
  "prompt": "string (required, max 1000 chars)",
  "subjectCode": "string (optional context filter)",
  "conversationId": "uuid (optional session thread)"
&#125;</pre>
          </div>

          <div class="schema-box">
            <span class="schema-box-label">Proposed Response Payload</span>
            <pre class="code-block font-mono">&#123;
  "response": "string (markdown formatted text)",
  "citations": ["Subject Code / Lecture Ref"],
  "conversationId": "uuid",
  "generatedAt": "ISO 8601 timestamp"
&#125;</pre>
          </div>
        </div>
      </section>

      <!-- Planned Capabilities Grid -->
      <section class="card-modern capabilities-card">
        <h3 class="section-title">Planned Academic Copilot Capabilities</h3>
        <p class="section-subtitle">Features scheduled for deployment once the backend LLM gateway is approved and provisioned</p>

        <div class="capabilities-grid">
          <div class="cap-card">
            <div class="cap-icon-box">
              <app-icon name="materials" [size]="18"></app-icon>
            </div>
            <h4 class="cap-title">Syllabus & Lecture Q&A</h4>
            <p class="cap-desc">Direct semantic inquiry over faculty lecture slide decks and syllabus reference documents.</p>
          </div>

          <div class="cap-card">
            <div class="cap-icon-box">
              <app-icon name="assessments" [size]="18"></app-icon>
            </div>
            <h4 class="cap-title">Exam Prep & Practice Quizzes</h4>
            <p class="cap-desc">Adaptive question generation based on personal assessment scorecards and syllabus topics.</p>
          </div>

          <div class="cap-card">
            <div class="cap-icon-box">
              <app-icon name="clock" [size]="18"></app-icon>
            </div>
            <h4 class="cap-title">Deadline Prioritization</h4>
            <p class="cap-desc">Automated task urgency scheduling based on course credits and assignment submission deadlines.</p>
          </div>
        </div>
      </section>

      <!-- Static Academic Help & Guidelines -->
      <section class="card-modern faq-card">
        <div class="faq-header">
          <div>
            <h3 class="section-title">Institutional Academic Knowledge Base</h3>
            <p class="section-subtitle">
              Verified university policies and portal guidelines (Static institutional records, not AI-generated).
            </p>
          </div>
          <span class="badge badge-teal font-mono">Official Policy</span>
        </div>

        <div class="faq-list">
          @for (faq of faqs; track faq.question; let i = $index) {
            <div 
              class="faq-item" 
              [class.expanded]="expandedFaq() === i"
              (click)="toggleFaq(i)"
              role="button"
              tabindex="0"
              (keydown.enter)="toggleFaq(i)"
              (keydown.space)="toggleFaq(i)"
            >
              <div class="faq-question-row">
                <span class="faq-category font-mono">{{ faq.category }}</span>
                <span class="faq-question">{{ faq.question }}</span>
                <span class="faq-toggle font-mono">{{ expandedFaq() === i ? '−' : '+' }}</span>
              </div>
              @if (expandedFaq() === i) {
                <div class="faq-answer">
                  {{ faq.answer }}
                </div>
              }
            </div>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .ai-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 980px;
      margin: 0 auto;
    }

    /* Hero Card */
    .hero-ai-card {
      padding: 32px 28px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }

    .ai-crest-box {
      width: 60px;
      height: 60px;
      border-radius: var(--radius-xl);
      background: var(--color-teal-surface);
      color: var(--color-teal);
      border: 1px solid var(--color-teal-border);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(15, 118, 110, 0.15);
    }

    .badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .ai-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.01em;
    }

    .ai-subtitle {
      font-size: 13.5px;
      color: var(--text-secondary);
      max-width: 520px;
      line-height: 1.45;
    }

    /* Status Banner */
    .status-banner {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 16px;
      background: var(--color-amber-surface);
      border: 1px solid var(--color-amber-border);
      border-radius: var(--radius-md);
      font-size: 12.5px;
      color: var(--color-amber);
      text-align: left;
      line-height: 1.45;
      max-width: 760px;
      width: 100%;
    }

    .status-banner code {
      background: rgba(180, 83, 9, 0.1);
      padding: 1px 4px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 11.5px;
    }

    .banner-icon {
      color: var(--color-amber);
      flex-shrink: 0;
      margin-top: 1px;
    }

    .banner-text {
      flex: 1;
    }

    /* Audit Grid */
    .audit-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      width: 100%;
      margin-top: 6px;
      text-align: left;
    }

    .audit-item {
      padding: 12px 14px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .audit-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    .audit-val {
      font-size: 11.5px;
      color: var(--text-main);
      font-weight: 600;
    }

    /* Spec Card */
    .spec-card {
      padding: 24px 26px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .spec-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .spec-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
    }

    .spec-subtitle {
      font-size: 12.5px;
      color: var(--text-secondary);
      margin-top: 1px;
    }

    .schema-cols {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
    }

    .schema-box {
      padding: 14px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .schema-box-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-teal);
    }

    .code-block {
      font-size: 11.5px;
      color: var(--text-main);
      background: #FFFFFF;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      overflow-x: auto;
      line-height: 1.45;
    }

    /* Capabilities */
    .capabilities-card {
      padding: 24px 26px;
      display: flex;
      flex-direction: column;
      gap: 14px;
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

    .capabilities-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 4px;
    }

    .cap-card {
      padding: 14px 16px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .cap-icon-box {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      background: var(--color-teal-surface);
      color: var(--color-teal);
      border: 1px solid var(--color-teal-border);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cap-title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text-main);
    }

    .cap-desc {
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    /* FAQ */
    .faq-card {
      padding: 24px 26px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .faq-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .faq-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .faq-item {
      padding: 12px 14px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: all var(--transition-fast);
      outline: none;
    }

    .faq-item:hover {
      background: #FFFFFF;
      border-color: var(--border-medium);
    }

    .faq-question-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .faq-category {
      font-size: 10.5px;
      font-weight: 700;
      color: var(--color-teal);
      background: var(--color-teal-surface);
      border: 1px solid var(--color-teal-border);
      padding: 1px 6px;
      border-radius: var(--radius-xs);
    }

    .faq-question {
      flex: 1;
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text-main);
    }

    .faq-toggle {
      font-size: 14px;
      color: var(--text-muted);
      font-weight: 700;
    }

    .faq-answer {
      font-size: 12.5px;
      color: var(--text-secondary);
      line-height: 1.45;
      padding-top: 6px;
      border-top: 1px solid var(--border-subtle);
    }

    @media (max-width: 800px) {
      .audit-grid,
      .schema-cols,
      .capabilities-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AiAssistantComponent {
  expandedFaq = signal<number | null>(0);

  readonly faqs: FaqItem[] = [
    {
      category: 'ATTENDANCE',
      question: 'What is the minimum attendance requirement for semester exam eligibility?',
      answer: 'According to institutional policy, students must maintain a minimum of 75% attendance across all conducted class sessions to be eligible to sit for final semester examinations.'
    },
    {
      category: 'ASSIGNMENTS',
      question: 'How do I submit course assignments and what file formats are supported?',
      answer: 'Deliverables can be uploaded directly under the Assignments portal. Supported formats include PDF, DOC, and DOCX with a maximum file size of 10 MB per submission.'
    },
    {
      category: 'QUIZZES',
      question: 'Can I re-take an assessment after submitting my answers?',
      answer: 'Standard quizzes allow one completed attempt per student enrollment. Once submitted, your score is permanently recorded, and you can review your completed questions and answer breakdown anytime.'
    },
    {
      category: 'MATERIALS',
      question: 'Where can I find lecture slide decks and syllabus notes?',
      answer: 'All faculty-published lecture slides and syllabus notes are hosted in the Learning Materials repository, accessible with authenticated direct PDF download.'
    }
  ];

  toggleFaq(index: number): void {
    this.expandedFaq.update(curr => curr === index ? null : index);
  }
}
