// HandsUp — Results Management

const Results = {
    async init() {
        this.loadFilters();
        document.getElementById('filter-class')?.addEventListener('change', () => this.loadResults());
        document.getElementById('filter-exam')?.addEventListener('change', () => this.loadResults());
        this.loadResults();
    },

    async loadFilters() {
        const user = auth.currentUser;
        if (!user) return;
        try {
            const classSnap = await db.collection('handsup_classes').where('userId', '==', user.uid).get();
            const classSelect = document.getElementById('filter-class');
            if (classSelect) {
                classSelect.innerHTML = '<option value="">Todas las clases</option>';
                classSnap.forEach(doc => {
                    classSelect.innerHTML += `<option value="${doc.id}">${Utils.escapeHtml(doc.data().name)}</option>`;
                });
            }
            const examSnap = await db.collection('handsup_exams').where('userId', '==', user.uid).orderBy('createdAt', 'desc').get();
            const examSelect = document.getElementById('filter-exam');
            if (examSelect) {
                examSelect.innerHTML = '<option value="">Todos los exámenes</option>';
                examSnap.forEach(doc => {
                    examSelect.innerHTML += `<option value="${doc.id}">${Utils.escapeHtml(doc.data().title)}</option>`;
                });
            }
        } catch (err) { console.error(err); }
    },

    async loadResults() {
        const user = auth.currentUser;
        if (!user) return;
        const classId = document.getElementById('filter-class')?.value;
        const examId = document.getElementById('filter-exam')?.value;
        try {
            let query = db.collection('handsup_results').where('userId', '==', user.uid);
            if (classId) query = query.where('classId', '==', classId);
            if (examId) query = query.where('examId', '==', examId);
            const snap = await query.orderBy('createdAt', 'desc').limit(100).get();
            const results = [];
            snap.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
            this.renderSummary(results);
            this.renderTable(results);
        } catch (err) {
            console.error(err);
            // Try without ordering if index not created
            try {
                let query = db.collection('handsup_results').where('userId', '==', user.uid);
                const snap = await query.limit(100).get();
                const results = [];
                snap.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
                this.renderSummary(results);
                this.renderTable(results);
            } catch (e) { console.error(e); }
        }
    },

    renderSummary(results) {
        const totalStudents = new Set(results.map(r => r.studentId)).size;
        const totalExams = new Set(results.map(r => r.examId)).size;
        const avgGrade = results.length ? (results.reduce((s, r) => s + r.grade, 0) / results.length) : 0;
        const passRate = results.length ? ((results.filter(r => r.grade >= 5).length / results.length) * 100) : 0;

        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('summary-students', totalStudents);
        set('summary-exams', totalExams);
        set('summary-avg', avgGrade.toFixed(2));
        set('summary-pass', passRate.toFixed(0) + '%');
    },

    renderTable(results) {
        const tbody = document.getElementById('results-tbody');
        if (!tbody) return;
        if (results.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-secondary)">No hay resultados</td></tr>`;
            return;
        }
        tbody.innerHTML = results.map(r => {
            const gradeClass = r.grade >= 5 ? 'pass' : 'fail';
            return `<tr>
        <td><strong>${Utils.escapeHtml(r.studentName || 'Desconocido')}</strong></td>
        <td>${Utils.escapeHtml(r.examTitle || 'Sin título')}</td>
        <td class="correct-cell">${r.correct}</td>
        <td class="incorrect-cell">${r.incorrect}</td>
        <td><strong>${r.total || (r.correct + r.incorrect)}</strong></td>
        <td class="grade-cell ${gradeClass}">${r.grade.toFixed(2)}</td>
        <td>${Utils.formatDate(r.createdAt)}</td>
      </tr>`;
        }).join('');
    },

    async deleteResult(resultId) {
        const confirmed = await Utils.confirm('Eliminar resultado', '¿Estás seguro?');
        if (!confirmed) return;
        try {
            await db.collection('handsup_results').doc(resultId).delete();
            Utils.showToast('Resultado eliminado', 'success');
            this.loadResults();
        } catch (err) {
            Utils.showToast('Error: ' + err.message, 'error');
        }
    }
};
