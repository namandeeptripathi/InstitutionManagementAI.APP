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
      <section class="card-tactile hero-ai-card">
        <div class="ai-crest-box">
          <app-icon name="ai" [size]="36"></app-icon>
        </div>

        <div class="badge-row">
          <span class="badge badge-amber font-mono">Future Roadmap &bull; Phase 2</span>
          <span class="badge badge-forest">Backend Audit Complete</span>
        </div>

        <h2 class="ai-title font-editorial">CRHDRI Academic Copilot</h2>
        <p class="ai-subtitle">
          Intelligent curriculum assistant, personalized study scheduling, and syllabus inquiry.
        </p>

        <!-- Audit Status Notice -->
        <div class="status-banner" role="status">
          <app-icon name="alert" [size]="18" class="banner-icon"></app-icon>
          <div class="banner-text">
            <strong>Backend Capability Audit:</strong> The current ASP.NET Core API (<code>http://localhost:5083</code>) does not implement an AI assistant endpoint or LLM inference pipeline. In adherence to institutional data governance, simulated or mock AI replies are strictly prohibited.
          </div>
        </div>

        <!-- Capability Audit Summary Grid -->
        <div class="audit-grid">
          <div class="audit-item">
            <span class="audit-label">Backend AI Endpoint</span>
            <span class="audit-val font-mono">None (Unmapped in Program.cs)</span>
          </div>
          <div class="audit-item">
            <span class="audit-label">LLM Provider / Model</span>
            <span class="audit-val font-mono">Unconfigured (Awaiting Key/Gateway)</span>
          </div>
          <div class="audit-item">
            <span class="audit-label">Chat Session Storage</span>
            <span class="audit-val font-mono">No Chat Tables in PostgreSQL</span>
          </div>
          <div class="audit-item">
            <span class="audit-label">Data Privacy Audit</span>
            <span class="audit-val font-mono">Institutional Review Pending</span>
          </div>
        </div>
      </section>

      <!-- Proposed Architecture & API Specification -->
      <section class="card-tactile spec-card">
        <div class="spec-header">
          <div>
            <h3 class="spec-title font-editorial">Proposed Backend API Contract (Phase 2)</h3>
            <p class="spec-subtitle">Technical blueprint required for enterprise AI integration in a future backend release</p>
          </div>
          <span class="badge badge-forest font-mono">POST /api/students/&#123;enrollment&#125;/copilot/query</span>
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
      <section class="card-tactile capabilities-card">
        <h3 class="section-title font-editorial">Planned Academic Copilot Capabilities</h3>
        <p class="section-subtitle">Features scheduled for deployment once the backend LLM gateway is approved and provisioned</p>

        <div class="capabilities-grid">
          <div class="cap-card">
            <div class="cap-icon-box">
              <app-icon name="materials" [size]="20"></app-icon>
            </div>
            <h4 class="cap-title font-editorial">Syllabus & Lecture Q&A</h4>
            <p class="cap-desc">Direct semantic inquiry over faculty lecture slide decks and syllabus reference documents.</p>
          </div>

          <div class="cap-card">
            <div class="cap-icon-box">
              <app-icon name="assessments" [size]="20"></app-icon>
            </div>
            <h4 class="cap-title font-editorial">Exam Prep & Practice Quizzes</h4>
            <p class="cap-desc">Adaptive question generation based on your personal assessment scorecards and syllabus topics.</p>
          </div>

          <div class="cap-card">
            <div class="cap-icon-box">
              <app-icon name="clock" [size]="20"></app-icon>
            </div>
            <h4 class="cap-title font-editorial">Deadline Prioritization</h4>
            <p class="cap-desc">Automated task urgency scheduling based on course credits and assignment submission deadlines.</p>
          </div>
        </div>
      </section>

      <!-- Static Academic Help & Guidelines (Clearly Labeled as NOT AI) -->
      <section class="card-tactile faq-card">
        <div class="faq-header">
          <div>
            <h3 class="section-title font-editorial">Institutional Academic Knowledge Base</h3>
            <p class="section-subtitle">
              Verified university policies and portal guidelines. 
              <strong>Note:</strong> These answers are static institutional records and do not use AI generation.
            </p>
          </div>
          <span class="badge badge-forest font-mono">Institutional Policy</span>
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
                <span class="faq-question font-editorial">{{ faq.question }}</span>
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
      gap: 24px;
      max-width: 1040px;
      margin: 0 auto;
    }

    /* Hero Card */
    .hero-ai-card {
      padding: 40px 36px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      background: linear-gradient(135deg, #FFFFFF 0%, #FAF8F2 100%);
      border-radius: var(--radius-xl);
    }

    .ai-crest-box {
      width: 72px;
      height: 72px;
      border-radius: var(--radius-xl);
      background: var(--color-amber-surface);
      color: var(--color-amber-dark);
      border: 2px solid var(--color-amber-border);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(214, 168, 95, 0.2);
    }

    .badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .ai-title {
      font-size: 32px;
      font-weight: 600;
      color: var(--color-forest);
      letter-spacing: -0.01em;
    }

    .ai-subtitle {
      font-size: 15px;
      color: var(--text-secondary);
      max-width: 560px;
      line-height: 1.5;
    }

    /* Status Banner */
    .status-banner {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 20px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-left: 4px solid var(--color-amber);
      border-radius: var(--radius-md);
      font-size: 13.5px;
      color: #92400e;
      text-align: left;
      line-height: 1.45;
      max-width: 800px;
      width: 100%;
    }

    .status-banner code {
      background: rgba(146, 64, 14, 0.1);
      padding: 1px 5px;
      border-radius: 4px;
      font-family: monospace;
    }

    .banner-icon {
      color: var(--color-amber);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .banner-text {
      flex: 1;
    }

    /* Audit Grid */
    .audit-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      width: 100%;
      margin-top: 8px;
      text-align: left;
    }

    .audit-item {
      padding: 14px 16px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .audit-label {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    .audit-val {
      font-size: 12.5px;
      color: var(--text-main);
      font-weight: 600;
    }

    /* Spec Card */
    .spec-card {
      padding: 28px 32px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      background: #FFFFFF;
      border-radius: var(--radius-xl);
    }

    .spec-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .spec-title {
      font-size: 20px;
      font-weight: 600;
      color: var(--color-forest);
    }

    .spec-subtitle {
      font-size: 13.5px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .schema-cols {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .schema-box {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .schema-box-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-forest);
    }

    .code-block {
      margin: 0;
      padding: 16px;
      background: #181d24;
      color: #e2e8f0;
      border-radius: var(--radius-md);
      font-size: 12.5px;
      line-height: 1.5;
      overflow-x: auto;
    }

    /* Capabilities Section */
    .capabilities-card {
      padding: 28px 32px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: #FFFFFF;
      border-radius: var(--radius-xl);
    }

    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: var(--color-forest);
    }

    .section-subtitle {
      font-size: 13.5px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .capabilities-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 6px;
    }

    .cap-card {
      padding: 20px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: transform 0.15s ease, border-color 0.15s ease;
    }

    .cap-card:hover {
      border-color: var(--border-medium);
      transform: translateY(-2px);
    }

    .cap-icon-box {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      background: var(--color-forest-surface);
      color: var(--color-forest);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cap-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--color-forest);
    }

    .cap-desc {
      font-size: 12.5px;
      color: var(--text-muted);
      line-height: 1.45;
    }

    /* FAQ Section */
    .faq-card {
      padding: 28px 32px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      background: #FFFFFF;
      border-radius: var(--radius-xl);
    }

    .faq-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .faq-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .faq-item {
      padding: 16px 20px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: all 0.15s ease;
    }

    .faq-item:hover, .faq-item.expanded {
      background: #FFFFFF;
      border-color: var(--border-medium);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    .faq-question-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .faq-category {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-forest);
      background: var(--color-forest-surface);
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      white-space: nowrap;
    }

    .faq-question {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-main);
      flex: 1;
    }

    .faq-toggle {
      font-size: 18px;
      font-weight: bold;
      color: var(--text-muted);
    }

    .faq-answer {
      font-size: 13.5px;
      color: var(--text-secondary);
      line-height: 1.5;
      padding-top: 8px;
      border-top: 1px dashed var(--border-subtle);
    }

    @media (max-width: 900px) {
      .audit-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .schema-cols {
        grid-template-columns: 1fr;
      }
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
      question: 'How is attendance recorded and calculated for each course?',
      answer: 'Attendance is calculated dynamically from live class session registers using (Attended Classes ÷ Total Classes) × 100. Institutional policy mandates a minimum 75% attendance threshold for semester examination eligibility.'
    },
    {
      category: 'ASSIGNMENTS',
      question: 'Can I re-upload an assignment after submitting it?',
      answer: 'The portal accepts a single formal submission per assignment in PDF, DOC, or DOCX formats (max 10MB). Once submitted, subsequent uploads return an institutional lock (409 Conflict) to ensure academic integrity.'
    },
    {
      category: 'ASSESSMENTS',
      question: 'How are quizzes scored and when do results appear?',
      answer: 'Quiz submissions are scored deterministically by comparing student selections against verified question answer keys. Results and score summaries are permanently recorded into the student registry and immediately visible on your Results scorecard.'
    },
    {
      category: 'LEARNING',
      question: 'How are course learning materials and lecture notes organized?',
      answer: 'Faculty members upload syllabus resources, slide decks, and lab manuals categorized by course code and academic term. Materials can be searched and opened directly through the Learning Materials repository.'
    }
  ];

  toggleFaq(index: number): void {
    this.expandedFaq.update(current => current === index ? null : index);
  }
}
