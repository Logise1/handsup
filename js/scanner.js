// HandsUp — QR Scanner + Answer Input + Mobile Session

const Scanner = {
    stream: null,
    scanning: false,
    detectedExam: null,
    studentAnswers: {},
    mobileSessionId: null,
    mobileSessionToken: null,
    resultsListener: null,

    async init() {
        this.loadExamsForManual();
        document.getElementById('btn-start-scan')?.addEventListener('click', () => this.startCamera());
        document.getElementById('btn-stop-scan')?.addEventListener('click', () => this.stopCamera());
        document.getElementById('btn-submit-answers')?.addEventListener('click', () => this.submitAnswers());
        document.getElementById('manual-exam-select')?.addEventListener('change', (e) => {
            if (e.target.value) this.loadExamForGrading(e.target.value);
        });
        document.getElementById('btn-mobile-session')?.addEventListener('click', () => this.createMobileSession());
        document.getElementById('btn-close-session')?.addEventListener('click', () => this.closeMobileSession());
    },

    // ── Mobile Session System ──────────────────
    generateToken(length = 48) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        const arr = new Uint8Array(length);
        crypto.getRandomValues(arr);
        arr.forEach(v => { token += chars[v % chars.length]; });
        return token;
    },

    async createMobileSession() {
        const user = auth.currentUser;
        if (!user) return;
        Utils.showLoading('Creando sesión móvil...');
        try {
            this.mobileSessionToken = this.generateToken();
            const ref = await db.collection('handsup_scan_sessions').add({
                token: this.mobileSessionToken,
                userId: user.uid,
                userName: Auth.getDisplayName(),
                active: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            this.mobileSessionId = ref.id;

            // Generate QR
            const baseUrl = window.location.href.replace('scan.html', 'scan-mobile.html');
            const mobileUrl = `${baseUrl}?token=${this.mobileSessionToken}`;
            this.showMobileQR(mobileUrl);

            // Listen for results from mobile
            this.listenForMobileResults();

            Utils.showToast('Sesión móvil creada — escanea el QR con tu teléfono', 'success');
        } catch (err) {
            Utils.showToast('Error: ' + err.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    showMobileQR(url) {
        const section = document.getElementById('mobile-qr-section');
        if (!section) return;
        section.classList.remove('hidden');
        document.getElementById('camera-section')?.classList.add('hidden');
        document.getElementById('btn-mobile-session')?.classList.add('hidden');

        const qrContainer = document.getElementById('mobile-qr-code');
        qrContainer.innerHTML = '';
        if (typeof QRCode !== 'undefined') {
            new QRCode(qrContainer, {
                text: url, width: 220, height: 220,
                colorDark: '#1E293B', colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });
        }
        document.getElementById('mobile-url-display').textContent = url;
    },

    listenForMobileResults() {
        if (!this.mobileSessionId) return;
        this.resultsListener = db.collection('handsup_results')
            .where('sessionId', '==', this.mobileSessionId)
            .onSnapshot(snap => {
                snap.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const r = change.doc.data();
                        this.addMobileResultCard(r);
                    }
                });
            });
    },

    addMobileResultCard(r) {
        const list = document.getElementById('mobile-results-list');
        if (!list) return;
        document.getElementById('mobile-results-empty')?.classList.add('hidden');
        const gradeClass = r.grade >= 5 ? 'pass' : 'fail';
        const card = document.createElement('div');
        card.className = 'card card-elevated mb-4';
        card.style.animation = 'bounceIn 0.5s ease-out';
        card.innerHTML = `
            <div style="display:flex;align-items:center;gap:var(--space-4);">
                <div style="width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.125rem;font-weight:800;${gradeClass === 'pass' ? 'background:var(--success-light);color:var(--success-dark)' : 'background:var(--danger-light);color:var(--danger-dark)'}">
                    ${r.grade.toFixed(2)}
                </div>
                <div style="flex:1">
                    <div style="font-weight:700;font-size:0.9375rem;">${Utils.escapeHtml(r.studentName)}</div>
                    <div style="font-size:0.8125rem;color:var(--text-secondary)">${Utils.escapeHtml(r.examTitle)} · <span style="color:var(--success)">${r.correct} ✓</span> <span style="color:var(--danger)">${r.incorrect} ✗</span></div>
                </div>
            </div>
        `;
        list.prepend(card);
    },

    async closeMobileSession() {
        if (this.mobileSessionId) {
            try {
                await db.collection('handsup_scan_sessions').doc(this.mobileSessionId).update({ active: false });
            } catch (e) { /* ignore */ }
        }
        if (this.resultsListener) this.resultsListener();
        this.mobileSessionId = null;
        this.mobileSessionToken = null;
        document.getElementById('mobile-qr-section')?.classList.add('hidden');
        document.getElementById('camera-section')?.classList.remove('hidden');
        document.getElementById('btn-mobile-session')?.classList.remove('hidden');
        Utils.showToast('Sesión móvil cerrada', 'info');
    },

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            const video = document.getElementById('scan-video');
            video.srcObject = this.stream;
            video.play();
            document.getElementById('camera-placeholder')?.classList.add('hidden');
            document.getElementById('scan-frame-el')?.classList.remove('hidden');
            document.querySelector('.camera-status .dot')?.classList.add('active');
            document.getElementById('btn-start-scan').classList.add('hidden');
            document.getElementById('btn-stop-scan').classList.remove('hidden');
            this.scanning = true;
            this.scanLoop();
        } catch (err) {
            Utils.showToast('No se pudo acceder a la cámara: ' + err.message, 'error');
        }
    },

    stopCamera() {
        this.scanning = false;
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
        const video = document.getElementById('scan-video');
        if (video) video.srcObject = null;
        document.getElementById('camera-placeholder')?.classList.remove('hidden');
        document.getElementById('scan-frame-el')?.classList.add('hidden');
        document.querySelector('.camera-status .dot')?.classList.remove('active');
        document.getElementById('btn-start-scan')?.classList.remove('hidden');
        document.getElementById('btn-stop-scan')?.classList.add('hidden');
    },

    scanLoop() {
        if (!this.scanning) return;
        const video = document.getElementById('scan-video');
        const canvas = document.getElementById('scan-canvas');
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
            requestAnimationFrame(() => this.scanLoop());
            return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (typeof jsQR !== 'undefined') {
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
                try {
                    const data = JSON.parse(code.data);
                    if (data.app === 'handsup' && data.examId) {
                        this.scanning = false;
                        Utils.showToast('¡Examen detectado!', 'success');
                        this.loadExamForGrading(data.examId);
                        return;
                    }
                } catch (e) { /* not our QR */ }
            }
        }
        requestAnimationFrame(() => this.scanLoop());
    },

    async loadExamsForManual() {
        const user = auth.currentUser;
        if (!user) return;
        try {
            const snap = await db.collection('handsup_exams').where('userId', '==', user.uid).orderBy('createdAt', 'desc').limit(20).get();
            const select = document.getElementById('manual-exam-select');
            if (!select) return;
            select.innerHTML = '<option value="">Selecciona un examen</option>';
            snap.forEach(doc => {
                const d = doc.data();
                select.innerHTML += `<option value="${doc.id}">${Utils.escapeHtml(d.title)}</option>`;
            });
        } catch (err) { console.error(err); }
    },

    async loadExamForGrading(examId) {
        Utils.showLoading('Cargando examen...');
        try {
            const doc = await db.collection('handsup_exams').doc(examId).get();
            if (!doc.exists) { Utils.showToast('Examen no encontrado', 'error'); return; }
            this.detectedExam = { id: examId, ...doc.data() };
            this.studentAnswers = {};
            this.renderAnswerInput();
            this.loadStudentsForExam();
            document.getElementById('scan-result-section')?.classList.remove('hidden');
            document.getElementById('detected-exam-title').textContent = this.detectedExam.title;
            this.stopCamera();
        } catch (err) {
            Utils.showToast('Error: ' + err.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    renderAnswerInput() {
        const grid = document.getElementById('answer-input-grid');
        if (!grid || !this.detectedExam) return;
        const letters = ['A', 'B', 'C', 'D'];
        grid.innerHTML = this.detectedExam.questions.map((q, i) => `
      <div class="answer-input-item">
        <span class="q-label">${i + 1}</span>
        <div class="answer-options">
          ${letters.map((l, j) => `
            <button class="answer-option-btn" data-q="${i}" data-o="${j}" onclick="Scanner.selectAnswer(${i},${j},this)">${l}</button>
          `).join('')}
        </div>
      </div>
    `).join('');
    },

    selectAnswer(qIndex, oIndex, btn) {
        const siblings = btn.parentElement.querySelectorAll('.answer-option-btn');
        siblings.forEach(s => s.classList.remove('selected'));
        btn.classList.add('selected');
        this.studentAnswers[qIndex] = oIndex;
    },

    async loadStudentsForExam() {
        const classId = this.detectedExam.classId;
        const select = document.getElementById('student-select');
        if (!select) return;
        select.innerHTML = '<option value="">Selecciona alumno</option>';
        if (!classId) return;
        try {
            const doc = await db.collection('handsup_classes').doc(classId).get();
            if (!doc.exists) return;
            const students = doc.data().students || [];
            students.forEach(s => {
                select.innerHTML += `<option value="${s.id}" data-name="${Utils.escapeHtml(s.name)}">${Utils.escapeHtml(s.name)}</option>`;
            });
        } catch (err) { console.error(err); }
    },

    async submitAnswers() {
        const user = auth.currentUser;
        if (!user || !this.detectedExam) return;
        const select = document.getElementById('student-select');
        const studentId = select?.value;
        const studentName = select?.options[select.selectedIndex]?.dataset.name || select?.options[select.selectedIndex]?.text;
        if (!studentId) { Utils.showToast('Selecciona un alumno', 'error'); return; }
        const total = this.detectedExam.questions.length;
        const answers = [];
        let correct = 0;
        for (let i = 0; i < total; i++) {
            const ans = this.studentAnswers[i] !== undefined ? this.studentAnswers[i] : -1;
            answers.push(ans);
            if (ans === this.detectedExam.questions[i].correct) correct++;
        }
        const incorrect = total - correct;
        const grade = Utils.calculateGrade(correct, total);

        // Show results visually
        this.showGradingResults(answers);

        Utils.showLoading('Guardando resultado...');
        try {
            await db.collection('handsup_results').add({
                examId: this.detectedExam.id,
                examTitle: this.detectedExam.title,
                classId: this.detectedExam.classId || '',
                studentId, studentName,
                answers, correct, incorrect, grade,
                total,
                userId: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            Utils.showToast(`${studentName}: ${grade}/10 (${correct}/${total} correctas)`, 'success');
        } catch (err) {
            Utils.showToast('Error: ' + err.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    showGradingResults(answers) {
        if (!this.detectedExam) return;
        const btns = document.querySelectorAll('.answer-option-btn');
        btns.forEach(btn => {
            const q = parseInt(btn.dataset.q);
            const o = parseInt(btn.dataset.o);
            const correctO = this.detectedExam.questions[q].correct;
            btn.classList.remove('selected');
            if (o === correctO) btn.classList.add('correct');
            else if (answers[q] === o) btn.classList.add('incorrect');
        });
    }
};
