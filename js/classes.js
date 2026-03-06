// HandsUp — Class Management

const Classes = {
    async init() {
        this.loadClasses();
        document.getElementById('btn-add-class')?.addEventListener('click', () => {
            Utils.openModal('class-modal');
        });
        document.getElementById('btn-save-class')?.addEventListener('click', () => this.saveClass());
        document.getElementById('class-modal-close')?.addEventListener('click', () => {
            Utils.closeModal('class-modal');
        });
        document.getElementById('class-modal-backdrop')?.addEventListener('click', () => {
            Utils.closeModal('class-modal');
        });
    },

    async loadClasses() {
        const user = auth.currentUser;
        if (!user) return;
        try {
            const snap = await db.collection('handsup_classes').where('userId', '==', user.uid).orderBy('createdAt', 'desc').get();
            const grid = document.getElementById('classes-grid');
            if (!grid) return;
            let html = '';
            if (snap.empty) {
                html = `<div class="add-class-card" onclick="document.getElementById('btn-add-class').click()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <p>Crear primera clase</p>
        </div>`;
            } else {
                snap.forEach(doc => {
                    const c = doc.data();
                    const numStudents = (c.students || []).length;
                    html += `
            <div class="class-card" data-id="${doc.id}">
              <div class="class-card-header">
                <h3>${Utils.escapeHtml(c.name)}</h3>
                <p>${numStudents} alumno${numStudents !== 1 ? 's' : ''}</p>
              </div>
              <div class="class-card-body">
                <div class="class-stat-row">
                  <span class="class-stat-label">Alumnos</span>
                  <span class="class-stat-value">${numStudents}</span>
                </div>
                <div class="class-stat-row">
                  <span class="class-stat-label">Creada</span>
                  <span class="class-stat-value">${Utils.formatDate(c.createdAt)}</span>
                </div>
                <div class="students-list" id="students-${doc.id}">
                  ${(c.students || []).map(s => `
                    <div class="student-item">
                      <div class="student-item-info">
                        <div class="student-avatar">${s.name.charAt(0).toUpperCase()}</div>
                        <span class="student-name">${Utils.escapeHtml(s.name)}</span>
                      </div>
                      <button class="btn btn-ghost btn-sm" onclick="Classes.removeStudent('${doc.id}','${s.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  `).join('')}
                </div>
                <div class="add-student-row">
                  <input class="input" id="new-student-${doc.id}" placeholder="Nombre del alumno">
                  <button class="btn btn-primary btn-sm" onclick="Classes.addStudent('${doc.id}')">Añadir</button>
                </div>
              </div>
              <div class="class-card-footer">
                <button class="btn btn-danger btn-sm" onclick="Classes.deleteClass('${doc.id}')">Eliminar</button>
              </div>
            </div>`;
                });
                html += `<div class="add-class-card" onclick="document.getElementById('btn-add-class').click()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <p>Nueva clase</p>
        </div>`;
            }
            grid.innerHTML = html;
        } catch (err) {
            Utils.showToast('Error al cargar clases', 'error');
            console.error(err);
        }
    },

    async saveClass() {
        const user = auth.currentUser;
        if (!user) return;
        const name = document.getElementById('class-name')?.value?.trim();
        if (!name) { Utils.showToast('Introduce un nombre', 'error'); return; }
        try {
            await db.collection('handsup_classes').add({
                name, userId: user.uid, students: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            Utils.closeModal('class-modal');
            document.getElementById('class-name').value = '';
            Utils.showToast('Clase creada', 'success');
            this.loadClasses();
        } catch (err) {
            Utils.showToast('Error: ' + err.message, 'error');
        }
    },

    async addStudent(classId) {
        const input = document.getElementById(`new-student-${classId}`);
        const name = input?.value?.trim();
        if (!name) return;
        try {
            const student = { id: Utils.generateId(), name };
            await db.collection('handsup_classes').doc(classId).update({
                students: firebase.firestore.FieldValue.arrayUnion(student)
            });
            input.value = '';
            Utils.showToast(`${name} añadido`, 'success');
            this.loadClasses();
        } catch (err) {
            Utils.showToast('Error: ' + err.message, 'error');
        }
    },

    async removeStudent(classId, studentId) {
        const confirmed = await Utils.confirm('Eliminar alumno', '¿Estás seguro?');
        if (!confirmed) return;
        try {
            const doc = await db.collection('handsup_classes').doc(classId).get();
            const students = (doc.data().students || []).filter(s => s.id !== studentId);
            await db.collection('handsup_classes').doc(classId).update({ students });
            this.loadClasses();
            Utils.showToast('Alumno eliminado', 'success');
        } catch (err) {
            Utils.showToast('Error: ' + err.message, 'error');
        }
    },

    async deleteClass(classId) {
        const confirmed = await Utils.confirm('Eliminar clase', '¿Eliminar esta clase y todos sus datos?');
        if (!confirmed) return;
        try {
            await db.collection('handsup_classes').doc(classId).delete();
            Utils.showToast('Clase eliminada', 'success');
            this.loadClasses();
        } catch (err) {
            Utils.showToast('Error: ' + err.message, 'error');
        }
    }
};
