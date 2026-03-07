// ============================================
// HandsUp — Utility Functions
// ============================================

const Utils = {
    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    // Format date
    formatDate(date) {
        if (!date) return '';
        const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    // Format time
    formatTime(date) {
        if (!date) return '';
        const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Calculate grade (0-10, rounded to 2 decimals)
    calculateGrade(correct, total) {
        if (total === 0) return 0;
        return Math.round((correct / total) * 10 * 100) / 100;
    },

    // Get grade color class
    getGradeColor(grade) {
        if (grade >= 9) return 'grade-excellent';
        if (grade >= 7) return 'grade-good';
        if (grade >= 5) return 'grade-pass';
        return 'grade-fail';
    },

    // Get grade badge class
    getGradeBadge(grade) {
        if (grade >= 5) return 'badge-success';
        return 'badge-danger';
    },

    // Show toast notification
    showToast(message, type = 'info') {
        const container = document.querySelector('.toast-container') || (() => {
            const c = document.createElement('div');
            c.className = 'toast-container';
            document.body.appendChild(c);
            return c;
        })();

        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
    `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    },

    // Show/hide loading overlay
    showLoading(message = 'Cargando...') {
        let overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
        <div class="spinner spinner-lg"></div>
        <p id="loading-message">${message}</p>
      `;
            document.body.appendChild(overlay);
        } else {
            document.getElementById('loading-message').textContent = message;
            overlay.style.display = 'flex';
        }
    },

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'none';
    },

    // Open modal
    openModal(id) {
        document.getElementById(id)?.classList.add('active');
        document.getElementById(id + '-backdrop')?.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    // Close modal
    closeModal(id) {
        document.getElementById(id)?.classList.remove('active');
        document.getElementById(id + '-backdrop')?.classList.remove('active');
        document.body.style.overflow = '';
    },

    // Confirm dialog using modal
    async confirm(title, message) {
        return new Promise((resolve) => {
            let backdrop = document.getElementById('confirm-backdrop');
            let modal = document.getElementById('confirm-modal');

            if (!backdrop) {
                backdrop = document.createElement('div');
                backdrop.id = 'confirm-backdrop';
                backdrop.className = 'modal-backdrop';
                document.body.appendChild(backdrop);

                modal = document.createElement('div');
                modal.id = 'confirm-modal';
                modal.className = 'modal';
                modal.innerHTML = `
          <div class="modal-header">
            <h3 id="confirm-title"></h3>
          </div>
          <p id="confirm-message" class="text-secondary"></p>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="confirm-cancel">Cancelar</button>
            <button class="btn btn-primary" id="confirm-ok">Confirmar</button>
          </div>
        `;
                document.body.appendChild(modal);
            }

            document.getElementById('confirm-title').textContent = title;
            document.getElementById('confirm-message').textContent = message;

            Utils.openModal('confirm-modal');

            const cancel = document.getElementById('confirm-cancel');
            const ok = document.getElementById('confirm-ok');

            const cleanup = () => {
                Utils.closeModal('confirm-modal');
                cancel.removeEventListener('click', onCancel);
                ok.removeEventListener('click', onOk);
            };

            const onCancel = () => { cleanup(); resolve(false); };
            const onOk = () => { cleanup(); resolve(true); };

            cancel.addEventListener('click', onCancel);
            ok.addEventListener('click', onOk);
        });
    },

    // Debounce function
    debounce(fn, delay = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    },

    // Render inline Markdown to HTML (for exam text)
    // Supports: **bold**, *italic*, `code`, ~~strikethrough~~, ^super^, ~sub~
    renderMarkdown(text) {
        if (!text) return '';
        let html = this.escapeHtml(text);
        // Code blocks (inline)
        html = html.replace(/`([^`]+)`/g, '<code style="background:#F1F5F9;padding:1px 4px;border-radius:3px;font-size:0.9em;font-family:monospace;">$1</code>');
        // Bold
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // Italic
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        // Underline
        html = html.replace(/__(.+?)__/g, '<u>$1</u>');
        // Strikethrough
        html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');
        // Superscript x^2^
        html = html.replace(/\^(.+?)\^/g, '<sup>$1</sup>');
        // Subscript H~2~O
        html = html.replace(/~(.+?)~/g, '<sub>$1</sub>');
        // Line breaks
        html = html.replace(/\n/g, '<br>');
        return html;
    },

    // Escape HTML
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // Check auth and redirect
    requireAuth() {
        return new Promise((resolve) => {
            auth.onAuthStateChanged(user => {
                if (!user) {
                    window.location.href = 'index.html';
                    return;
                }
                resolve(user);
            });
        });
    },

    // Animate elements on scroll
    initScrollAnimations() {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1 }
        );

        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            observer.observe(el);
        });
    },

    // Init 3D card tilt effect
    init3DCards() {
        document.querySelectorAll('.card-3d').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = (y - centerY) / centerY * -8;
                const rotateY = (x - centerX) / centerX * 8;
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
            });
        });
    },

    // ── OMR (Optical Mark Recognition) Math utilities ──
    math: {
        getHomography(src, dst) {
            let A = [];
            for (let i = 0; i < 4; i++) {
                let x = src[i].x, y = src[i].y;
                let u = dst[i].x, v = dst[i].y;
                A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
                A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
            }

            let M = [], B = [];
            for (let i = 0; i < 8; i++) {
                M.push(A[i].slice(0, 8));
                B.push(-A[i][8]);
            }

            let h = this.gaussJordan(M, B);
            if (!h) return null;
            h.push(1);
            return h;
        },

        gaussJordan(A, b) {
            let n = A.length;
            let M = [];
            for (let i = 0; i < n; i++) M.push([...A[i], b[i]]);

            for (let i = 0; i < n; i++) {
                let maxRow = i;
                for (let j = i + 1; j < n; j++) {
                    if (Math.abs(M[j][i]) > Math.abs(M[maxRow][i])) maxRow = j;
                }
                let temp = M[i];
                M[i] = M[maxRow];
                M[maxRow] = temp;

                let div = M[i][i];
                if (Math.abs(div) < 1e-10) return null;

                for (let j = i; j <= n; j++) M[i][j] /= div;
                for (let j = 0; j < n; j++) {
                    if (i !== j) {
                        let factor = M[j][i];
                        for (let k = i; k <= n; k++) M[j][k] -= factor * M[i][k];
                    }
                }
            }
            let x = [];
            for (let i = 0; i < n; i++) x.push(M[i][n]);
            return x;
        },

        applyHomography(p, h) {
            let w = h[6] * p.x + h[7] * p.y + h[8];
            return {
                x: (h[0] * p.x + h[1] * p.y + h[2]) / w,
                y: (h[3] * p.x + h[4] * p.y + h[5]) / w
            };
        }
    }
};
