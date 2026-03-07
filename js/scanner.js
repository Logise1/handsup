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
                    <div style="font-size:0.8125rem;color:var(--text-secondary)">${Utils.renderMarkdown(r.examTitle)} · <span style="color:var(--success)">${r.correct} ✓</span> <span style="color:var(--danger)">${r.incorrect} ✗</span></div>
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
                    if (data.app === 'handsup' && data.examId && data.loc) {
                        const detectedAnswers = this.detectBubbles(imageData, data);
                        if (!detectedAnswers) {
                            // Keep scanning until all 4 QRs are in view
                            requestAnimationFrame(() => this.scanLoop());
                            return;
                        }
                        this.scanning = false;
                        Utils.showToast('¡Examen detectado!', 'success');
                        this.loadExamForGrading(data.examId, detectedAnswers);
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

    async loadExamForGrading(examId, detectedAnswers = {}) {
        Utils.showLoading('Cargando examen...');
        try {
            const doc = await db.collection('handsup_exams').doc(examId).get();
            if (!doc.exists) { Utils.showToast('Examen no encontrado', 'error'); return; }
            this.detectedExam = { id: examId, ...doc.data() };
            this.studentAnswers = {};

            const numQ = this.detectedExam.questions.length;
            for (let i = 0; i < numQ; i++) {
                if (detectedAnswers[i] !== undefined) {
                    this.studentAnswers[i] = detectedAnswers[i];
                }
            }

            this.renderAnswerInput();
            this.loadStudentsForExam();
            document.getElementById('scan-result-section')?.classList.remove('hidden');
            document.getElementById('detected-exam-title').innerHTML = Utils.renderMarkdown(this.detectedExam.title);
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
            <button class="answer-option-btn ${this.studentAnswers[i] === j ? 'selected' : ''}" data-q="${i}" data-o="${j}" onclick="Scanner.selectAnswer(${i},${j},this)">${l}</button>
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
    },

    // ── Bubble Detection (OMR) ──────────────────
    detectBubbles(imgData, examData) {
        const w = imgData.width, h = imgData.height;
        const pixels = imgData.data;
        const detected = {};

        try {
            const qW = Math.floor(w * 0.55);
            const qH = Math.floor(h * 0.55);

            const scanRegion = (sx, sy) => {
                const sub = new Uint8ClampedArray(qW * qH * 4);
                for (let y = 0; y < qH; y++) {
                    const srcOff = ((sy + y) * w + sx) * 4;
                    const dstOff = y * qW * 4;
                    sub.set(pixels.subarray(srcOff, srcOff + qW * 4), dstOff);
                }
                const res = jsQR(sub, qW, qH, { inversionAttempts: 'dontInvert' });
                if (res) {
                    try {
                        const d = JSON.parse(res.data);
                        if (d.app === 'handsup' && d.loc) {
                            return {
                                loc: d.loc,
                                center: {
                                    x: sx + (res.location.topLeftCorner.x + res.location.bottomRightCorner.x) / 2,
                                    y: sy + (res.location.topLeftCorner.y + res.location.bottomRightCorner.y) / 2
                                },
                            };
                        }
                    } catch (e) { }
                }
                return null;
            };

            const foundAnchors = [
                scanRegion(0, 0),
                scanRegion(w - qW, 0),
                scanRegion(0, h - qH),
                scanRegion(w - qW, h - qH)
            ].filter(Boolean);

            const anchorMap = {};
            foundAnchors.forEach(a => anchorMap[a.loc] = a.center);

            if (Object.keys(anchorMap).length < 4) {
                return null;
            }

            // Ideal centers in MM natively matched to printed exam sheet (182x130mm OMR block)
            // 22mm QRs on 4mm margins. centers:
            // TL: x=15,  y=15
            // TR: x=167, y=15
            // BR: x=167, y=115
            // BL: x=15,  y=115
            const srcCorners = [
                { x: 15, y: 15 },    // TL
                { x: 167, y: 15 },   // TR
                { x: 167, y: 115 },  // BR
                { x: 15, y: 115 }    // BL
            ];

            const dstCorners = [
                anchorMap['TL'],
                anchorMap['TR'],
                anchorMap['BR'],
                anchorMap['BL']
            ];

            const homography = Utils.math.getHomography(srcCorners, dstCorners);
            if (!homography) return null;

            // OMR Block width is 182mm. Px distance from TL to TR anchor (152mm apart)
            const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
            const pxPerMM = dist(anchorMap['TL'], anchorMap['TR']) / 152;
            const bubbleRadiusPx = Math.max(2, Math.round(pxPerMM * 1.5));

            const getDarkness = (px, py) => {
                const cx = Math.round(px), cy = Math.round(py);
                const r = bubbleRadiusPx;
                let total = 0, count = 0;
                for (let dy = -r; dy <= r; dy++) {
                    for (let dx = -r; dx <= r; dx++) {
                        if (dx * dx + dy * dy <= r * r) {
                            const x = cx + dx, y = cy + dy;
                            if (x >= 0 && x < w && y >= 0 && y < h) {
                                const idx = (y * w + x) * 4;
                                total += pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;
                                count++;
                            }
                        }
                    }
                }
                return count > 0 ? total / count : 255;
            };

            const numQ = examData.questions ? examData.questions.length : 50;

            for (let q = 0; q < numQ; q++) {
                const col = q % 5;
                const row = Math.floor(q / 5);

                // mapping to the new generated HTML print coords!
                // HTML: <div class="answer-grid-item" style="position: absolute; left: ${x}mm; top: ${y}mm; width: 25mm; height: 4.2mm;">
                // Bubble container lefts are exactly: bx = 6 + j * 4.6 (where bx is left-edge of bubble)
                // Width is 4mm. So Center X is bx + 2.0 = 8.0 + j * 4.6
                const gridStartX = 32 + col * 26;
                const gridStartY = 30 + row * 8;

                // bubble is rendered at top: 0, height 4mm -> center Y = 2.0
                const bubbleCy = gridStartY + 2.0;

                let bestOpt = -1;
                let absoluteDarkest = 255;
                let highestLocalScore = -1;

                // Micro-sweep (+/- 2.0mm) 
                for (let dy = -2.0; dy <= 2.0; dy += 0.5) {
                    for (let dx = -2.0; dx <= 2.0; dx += 0.5) {
                        let darknesses = [];
                        for (let opt = 0; opt < 4; opt++) {
                            const bubbleCx = gridStartX + 8.0 + (opt * 4.6);
                            const mmP = { x: bubbleCx + dx, y: bubbleCy + dy };
                            const camP = Utils.math.applyHomography(mmP, homography);
                            darknesses.push(getDarkness(camP.x, camP.y));
                        }

                        let minD = Math.min(...darknesses);
                        let avgOther = (darknesses.reduce((a, b) => a + b, 0) - minD) / 3;
                        let contrast = avgOther - minD;

                        if (contrast > highestLocalScore) {
                            highestLocalScore = contrast;
                            bestOpt = darknesses.indexOf(minD);
                            absoluteDarkest = minD;
                        }
                    }
                }

                if (highestLocalScore > 20 && absoluteDarkest < 150) {
                    detected[q] = bestOpt;
                }
            }
        } catch (e) {
            console.warn('Bubble detection error:', e);
            return null;
        }

        return detected;
    }
};
