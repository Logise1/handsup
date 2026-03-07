// HandsUp — Exam Printer (QR code generation + print layout)

const ExamPrinter = {
  examData: null,
  examId: null,

  async init() {
    const params = new URLSearchParams(window.location.search);
    this.examId = params.get('id');
    if (!this.examId) { Utils.showToast('No se especificó examen', 'error'); return; }
    await this.loadExam();
  },

  async loadExam() {
    Utils.showLoading('Cargando examen...');
    try {
      const doc = await db.collection('handsup_exams').doc(this.examId).get();
      if (!doc.exists) { Utils.showToast('Examen no encontrado', 'error'); return; }
      this.examData = doc.data();
      this.examData.id = this.examId;
      this.renderPrintView();
    } catch (err) {
      Utils.showToast('Error: ' + err.message, 'error');
    } finally {
      Utils.hideLoading();
    }
  },

  renderPrintView() {
    const d = this.examData;
    if (!d) return;
    const sheet = document.getElementById('exam-sheet');
    if (!sheet) return;
    const letters = ['A', 'B', 'C', 'D'];
    const today = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    const numQ = d.questions.length;

    // Build answer grid
    let gridHtml = d.questions.map((_, i) => `
          <div class="answer-grid-item">
            <span class="ag-num">${i + 1}</span>
            <div class="ag-bubbles">
              ${letters.map(l => `<span class="ag-bubble">${l}</span>`).join('')}
            </div>
          </div>
        `).join('');

    // Build questions for subsequent pages
    let questionsHtml = d.questions.map((q, i) => `
          <div class="print-question">
            <div class="print-question-text">
              <span class="print-question-num">${i + 1}.</span>
              <span>${Utils.renderMarkdown(q.text)}</span>
            </div>
            <div class="print-options">
              ${q.options.map((opt, j) => `
                <div class="print-option"><span class="bubble"></span>${letters[j]}) ${Utils.renderMarkdown(opt)}</div>
              `).join('')}
            </div>
          </div>
        `).join('');

    sheet.innerHTML = `
          <!-- ═══════ PAGE 1: ANSWER SHEET ═══════ -->
          <div class="exam-page exam-page-answer">
            <div class="corner-marker top-left"></div>
            <div class="corner-marker top-right"></div>
            <div class="corner-marker bottom-left"></div>
            <div class="corner-marker bottom-right"></div>

            <!-- QR top-right -->
            <div class="exam-qr-corner exam-qr-top-right">
              <div id="qr-code-tr"></div>
            </div>

            <div class="exam-sheet-header">
              <div class="exam-sheet-info">
                <h2>${Utils.renderMarkdown(d.title)}</h2>
                <div class="exam-meta">
                  <div class="exam-meta-item"><strong>Asignatura:</strong> ${Utils.renderMarkdown(d.subject || 'General')}</div>
                  <div class="exam-meta-item"><strong>Fecha:</strong> ${today}</div>
                  <div class="exam-meta-item"><strong>Preguntas:</strong> ${numQ}</div>
                </div>
              </div>
            </div>

            <div class="student-line-section">
              <div class="student-line-row">
                <strong>Nombre:</strong> <span class="student-line-blank"></span>
              </div>
              <div class="student-line-row">
                <strong>Grupo:</strong> <span class="student-line-blank short"></span>
                <strong style="margin-left:24px;">Fecha:</strong> <span class="student-line-blank short"></span>
              </div>
            </div>

            <div class="answer-instructions">
              <div class="instructions-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                Instrucciones
              </div>
              <ul class="instructions-list">
                <li>Rellena completamente el círculo de la respuesta correcta con bolígrafo negro o azul.</li>
                <li>Marca <strong>una sola respuesta</strong> por pregunta.</li>
                <li>No dobles ni arrugues esta hoja.</li>
              </ul>
            </div>

            <div class="answer-grid-section">
              <div class="answer-grid-title">Hoja de Respuestas</div>
              <div class="answer-grid">${gridHtml}</div>
            </div>
          </div>

          <!-- ═══════ PAGE 2+: QUESTIONS ═══════ -->
          <div class="exam-page exam-page-questions">
            <div class="questions-page-header">
              <h3>${Utils.renderMarkdown(d.title)} — Preguntas</h3>
              <p>${Utils.renderMarkdown(d.subject || 'General')} · ${numQ} preguntas</p>
            </div>
            ${questionsHtml}
          </div>
        `;

    this.generateQRCodes();
  },

  generateQRCodes() {
    const qrData = JSON.stringify({ app: 'handsup', examId: this.examId, v: 2 });
    if (typeof QRCode === 'undefined') return;

    // Top-right QR
    const trEl = document.getElementById('qr-code-tr');
    if (trEl) {
      trEl.innerHTML = '';
      new QRCode(trEl, {
        text: qrData, width: 200, height: 200,
        colorDark: '#000000', colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    }
  },

  printExam() {
    window.print();
  }
};
