// HandsUp — Exam Creator Logic

const ExamCreator = {
    currentExam: { title: '', subject: '', classId: '', questions: [] },
    editingExamId: null,

    init() {
        this.bindEvents();
        this.loadClasses();
        const params = new URLSearchParams(window.location.search);
        if (params.get('id')) {
            this.editingExamId = params.get('id');
            this.loadExam(this.editingExamId);
        }
    },

    bindEvents() {
        document.getElementById('exam-title')?.addEventListener('input', e => {
            this.currentExam.title = e.target.value;
        });
        document.getElementById('exam-subject')?.addEventListener('input', e => {
            this.currentExam.subject = e.target.value;
        });
        document.getElementById('exam-class')?.addEventListener('change', e => {
            this.currentExam.classId = e.target.value;
        });

        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        document.getElementById('btn-generate-ai')?.addEventListener('click', () => this.generateWithAI());
        document.getElementById('btn-add-question')?.addEventListener('click', () => this.addQuestion());
        document.getElementById('btn-save-exam')?.addEventListener('click', () => this.saveExam());
        document.getElementById('btn-save-print')?.addEventListener('click', () => this.saveAndPrint());
    },

    async loadClasses() {
        const user = auth.currentUser;
        if (!user) return;
        const snap = await db.collection('handsup_classes').where('userId', '==', user.uid).get();
        const select = document.getElementById('exam-class');
        if (!select) return;
        select.innerHTML = '<option value="">Sin clase asignada</option>';
        snap.forEach(doc => {
            const c = doc.data();
            select.innerHTML += `<option value="${doc.id}">${Utils.escapeHtml(c.name)}</option>`;
        });
        if (this.currentExam.classId) select.value = this.currentExam.classId;
    },

    async generateWithAI() {
        const subject = document.getElementById('exam-subject')?.value;
        const topic = document.getElementById('exam-topic')?.value || subject;
        const numQ = parseInt(document.getElementById('num-questions')?.value) || 10;
        const difficulty = document.querySelector('.difficulty-btn.active')?.dataset.difficulty || 'medium';
        if (!subject) { Utils.showToast('Introduce una asignatura', 'error'); return; }
        Utils.showLoading('Generando examen con IA...');
        try {
            const exam = await AI.generateExam(subject, topic, numQ, difficulty);
            this.currentExam.title = exam.title || `Examen de ${subject}`;
            this.currentExam.questions = exam.questions;
            document.getElementById('exam-title').value = this.currentExam.title;
            this.renderQuestions();
            Utils.showToast(`${exam.questions.length} preguntas generadas`, 'success');
        } catch (err) {
            console.error(err);
            Utils.showToast('Error al generar: ' + err.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    addQuestion() {
        this.currentExam.questions.push({
            text: '', options: ['', '', '', ''], correct: 0
        });
        this.renderQuestions();
        const cards = document.querySelectorAll('.question-card');
        cards[cards.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    removeQuestion(index) {
        this.currentExam.questions.splice(index, 1);
        this.renderQuestions();
    },

    setCorrectAnswer(qIndex, oIndex) {
        this.currentExam.questions[qIndex].correct = oIndex;
        this.renderQuestions();
    },

    renderQuestions() {
        const container = document.getElementById('questions-list');
        if (!container) return;
        const count = document.getElementById('question-count');
        if (count) count.textContent = this.currentExam.questions.length;
        if (this.currentExam.questions.length === 0) {
            container.innerHTML = `<div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
        <h3>Sin preguntas</h3>
        <p>Genera preguntas con IA o añade manualmente</p>
      </div>`;
            return;
        }
        const letters = ['A', 'B', 'C', 'D'];
        container.innerHTML = this.currentExam.questions.map((q, i) => `
      <div class="question-card" data-index="${i}">
        <div class="question-header">
          <div class="question-number"><span>${i + 1}</span> Pregunta</div>
          <div class="question-actions">
            <button class="btn btn-ghost btn-icon btn-sm" onclick="ExamCreator.removeQuestion(${i})" title="Eliminar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </div>
        <textarea class="question-text" placeholder="Escribe la pregunta..." oninput="ExamCreator.currentExam.questions[${i}].text=this.value">${Utils.escapeHtml(q.text)}</textarea>
        <div class="options-grid">
          ${q.options.map((opt, j) => `
            <div class="option-input-group">
              <button class="option-letter ${q.correct === j ? 'correct' : ''}" onclick="ExamCreator.setCorrectAnswer(${i},${j})">${letters[j]}</button>
              <input class="option-input" placeholder="Opción ${letters[j]}" value="${Utils.escapeHtml(opt)}" oninput="ExamCreator.currentExam.questions[${i}].options[${j}]=this.value">
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
    },

    async saveExam() {
        const user = auth.currentUser;
        if (!user) return;
        if (!this.currentExam.title) { Utils.showToast('Añade un título', 'error'); return; }
        if (this.currentExam.questions.length === 0) { Utils.showToast('Añade preguntas', 'error'); return; }
        Utils.showLoading('Guardando examen...');
        try {
            const data = {
                title: this.currentExam.title,
                subject: this.currentExam.subject,
                classId: this.currentExam.classId || '',
                questions: this.currentExam.questions,
                userId: user.uid,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            if (this.editingExamId) {
                await db.collection('handsup_exams').doc(this.editingExamId).update(data);
            } else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                const ref = await db.collection('handsup_exams').add(data);
                this.editingExamId = ref.id;
            }
            Utils.showToast('Examen guardado', 'success');
            return this.editingExamId;
        } catch (err) {
            Utils.showToast('Error al guardar: ' + err.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    async saveAndPrint() {
        const id = await this.saveExam();
        if (id) window.location.href = `print-exam.html?id=${id}`;
    },

    async loadExam(id) {
        Utils.showLoading('Cargando examen...');
        try {
            const doc = await db.collection('handsup_exams').doc(id).get();
            if (!doc.exists) { Utils.showToast('Examen no encontrado', 'error'); return; }
            const data = doc.data();
            this.currentExam = {
                title: data.title || '',
                subject: data.subject || '',
                classId: data.classId || '',
                questions: data.questions || []
            };
            document.getElementById('exam-title').value = this.currentExam.title;
            document.getElementById('exam-subject').value = this.currentExam.subject;
            this.renderQuestions();
        } catch (err) {
            Utils.showToast('Error al cargar', 'error');
        } finally {
            Utils.hideLoading();
        }
    }
};
