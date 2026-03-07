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

    // Build answer grid with absolute mm positioning
    let gridHtml = '';
    for (let i = 0; i < 50; i++) {
      const col = i % 5;
      const row = Math.floor(i / 5);
      const x = 8 + col * 27;
      const y = 24 + row * 9;

      let bubblesHtml = letters.map((l, j) => {
        const bx = 6.5 + j * 5.2;
        return `<span class="ag-bubble" style="position: absolute; left: ${bx}mm; top: 0; width: 4.2mm; height: 4.2mm; border: 0.4mm solid #475569; border-radius: 50%; display:flex; align-items:center; justify-content:center; font-size: 0.5rem; color: #475569; padding: 0;">${l}</span>`;
      }).join('');

      gridHtml += `
          <div class="answer-grid-item" style="position: absolute; left: ${x}mm; top: ${y}mm; width: 28mm; height: 4.2mm;">
            <span class="ag-num" style="position: absolute; left: 0; top: 0; width: 4.5mm; text-align: right; font-weight: bold; font-size: 0.75rem; line-height: 4.2mm; color: #1E293B;">${i + 1}</span>
            ${bubblesHtml}
          </div>
        `;
    }

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
          <div class="exam-page exam-page-answer" style="position:relative; height: 297mm; padding: 14mm;">
            <div class="corner-marker top-left"></div>
            <div class="corner-marker top-right"></div>
            <div class="corner-marker bottom-left"></div>
            <div class="corner-marker bottom-right"></div>

            <div class="exam-sheet-header" style="margin-bottom:8px; padding-bottom:8px; border-bottom: 2px solid #1E293B; padding-right: 0;">
              <div class="exam-sheet-info">
                <h2 style="font-size: 1.25rem; margin-bottom: 4px;">${Utils.renderMarkdown(d.title)}</h2>
                <div style="display: flex; gap: 16px; font-size: 0.75rem; color: #475569;">
                  <div><strong>Asignatura:</strong> ${Utils.renderMarkdown(d.subject || 'General')}</div>
                  <div><strong>Fecha:</strong> ${today}</div>
                  <div><strong>Preguntas:</strong> ${numQ}</div>
                </div>
              </div>
            </div>

            <div class="student-line-section" style="margin-bottom:8px; padding-bottom:8px; border-bottom: 1px solid #CBD5E1; padding-right: 0;">
              <div style="display: flex; gap: 8px; font-size: 0.8125rem; margin-bottom: 8px; align-items: baseline;">
                <strong>Nombre:</strong> <div style="flex: 1; border-bottom: 1.5px solid #94A3B8;"></div>
              </div>
              <div style="display: flex; gap: 8px; font-size: 0.8125rem; align-items: baseline;">
                <strong>Grupo:</strong> <div style="width: 80px; border-bottom: 1.5px solid #94A3B8;"></div>
                <strong style="margin-left:16px;">Fecha:</strong> <div style="width: 80px; border-bottom: 1.5px solid #94A3B8;"></div>
              </div>
            </div>

            <div class="answer-instructions" style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px; border-radius: 6px;">
              <div style="font-size: 0.6875rem; font-weight: 700; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                  INSTRUCCIONES
              </div>
              <ul style="font-size: 0.65rem; color: #475569; padding-left: 14px; margin: 0;">
                <li>Rellena completamente el círculo con rotulador, bolígrafo negro o azul.</li>
                <li>Marca <strong>una sola respuesta</strong> por pregunta. No dobles esta hoja.</li>
              </ul>
            </div>

            <!-- RIGID OMR BLOCK -->
            <div id="omr-anchor" style="position: absolute; bottom: 14mm; left: 14mm; width: 182mm; height: 130mm; border: 2.5px solid #1E293B; border-radius: 8px; background: white; box-sizing: border-box;">
                
                <div class="exam-qr-corner" style="position: absolute; top: 8mm; right: 8mm; width: 26.46mm; height: 26.46mm;">
                  <div id="qr-code-tr"></div>
                </div>

                <div style="position: absolute; top: 8mm; left: 8mm; font-weight: 800; font-size: 0.9rem; color: #1E293B; letter-spacing: 0.05em; background: #E2E8F0; padding: 4px 10px; border-radius: 4px;">
                    HOJA DE RESPUESTAS OFICIAL
                </div>
                
                <!-- Bubbles Container -->
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                    ${gridHtml}
                </div>
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
