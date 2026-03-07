// Utility functions for HandsUp

// Toast notification system
export function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        info: '💡',
        success: '✅',
        error: '❌',
        warning: '⚠️'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icons[type] || '💡'}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Format date
export function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
}

// Generate unique ID
export function generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Generate a game PIN (6 digits)
export function generateGamePin() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Escape HTML
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Debounce
export function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

// Require auth - redirect to login if not authenticated
export function requireAuth(auth, onAuthStateChanged) {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            if (!user) {
                window.location.href = 'login.html';
            } else {
                resolve(user);
            }
        });
    });
}

// Mistral AI API call
const MISTRAL_API_KEY = 'evxly62Xv91b752fbnHA2I3HD988C5RT';

export async function callMistralAI(prompt) {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
            model: 'mistral-large-latest',
            messages: [
                {
                    role: 'system',
                    content: 'You are a quiz generator for educational purposes. Always respond with valid JSON only, no markdown formatting, no code blocks. Just pure JSON.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 4000
        })
    });

    if (!response.ok) {
        throw new Error('Error calling Mistral AI: ' + response.statusText);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Try to extract JSON from the response
    let jsonStr = content.trim();
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    return JSON.parse(jsonStr);
}

// 5x5 Plickers-style code generation
// Each code encodes a student number (0-63)
// The code has orientation markers so when rotated, we can detect A/B/C/D
export function generateHandsUpCode(studentNumber) {
    // The 5x5 grid:
    // - Corner cells (0,0), (0,4), (4,0), (4,4) are orientation markers
    // - The remaining 21 cells encode the student number and orientation detection

    // Orientation markers: exactly one corner is filled to detect rotation
    // Corner (0,0) = filled, others = empty → this is "up" position (Answer A)
    // When rotated 90° CW: Corner (0,4) appears at top-left → Answer B
    // When rotated 180°: Corner (4,4) appears at top-left → Answer C
    // When rotated 270° CW: Corner (4,0) appears at top-left → Answer D

    const grid = Array(5).fill(null).map(() => Array(5).fill(0));

    // Set the orientation marker at top-left corner (for answer A position)
    grid[0][0] = 1;

    // Additional orientation: make the pattern asymmetric
    // Use edge midpoints as secondary orientation
    grid[0][2] = 1; // Top edge middle - helps confirm orientation

    // Encode student number (0-63 = 6 bits) in the inner cells
    // Inner cells we'll use (avoiding corners and orientation markers):
    const dataCells = [
        [1, 1], [1, 2], [1, 3],
        [2, 1], [2, 3],
        [3, 1], [3, 2], [3, 3]
    ];

    // Use first 6 data cells for the student number
    const bits = studentNumber.toString(2).padStart(6, '0');
    for (let i = 0; i < 6; i++) {
        const [r, c] = dataCells[i];
        grid[r][c] = parseInt(bits[i]);
    }

    // Add some pattern cells for visual distinction
    // Use remaining data cells with a checksum-like pattern
    const checksum = (studentNumber * 7 + 3) % 4;
    const checksumBits = checksum.toString(2).padStart(2, '0');
    for (let i = 6; i < 8; i++) {
        const [r, c] = dataCells[i];
        grid[r][c] = parseInt(checksumBits[i - 6]);
    }

    // Fill some border cells based on student number for visual variety
    grid[2][0] = (studentNumber >> 1) & 1;
    grid[0][1] = (studentNumber >> 2) & 1;
    grid[0][3] = (studentNumber >> 3) & 1;
    grid[4][1] = (studentNumber >> 4) & 1;
    grid[4][2] = (studentNumber >> 5) & 1;
    grid[4][3] = studentNumber & 1;
    grid[1][0] = (studentNumber >> 3) & 1;
    grid[3][0] = studentNumber & 1;
    grid[1][4] = (studentNumber >> 2) & 1;
    grid[3][4] = (studentNumber >> 1) & 1;
    grid[2][4] = (studentNumber >> 4) & 1;

    // Always keep (4,0) and (0,4) and (4,4) empty as orientation reference
    grid[0][4] = 0;
    grid[4][0] = 0;
    grid[4][4] = 0;

    // Center cell pattern
    grid[2][2] = 1;

    return grid;
}

// Draw a HandsUp code onto a canvas
export function drawHandsUpCode(canvas, grid, label, size = 200) {
    canvas.width = size;
    canvas.height = size + 36;
    const ctx = canvas.getContext('2d');

    const cellSize = Math.floor(size / 7); // Add padding around the grid
    const offset = Math.floor((size - cellSize * 5) / 2);

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size + 36);

    // Draw outer border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(offset - 4, offset - 4, cellSize * 5 + 8, cellSize * 5 + 8);

    // Draw grid cells
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            const x = offset + c * cellSize;
            const y = offset + r * cellSize;

            if (grid[r][c] === 1) {
                ctx.fillStyle = '#000000';
                ctx.fillRect(x, y, cellSize, cellSize);
            } else {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(x, y, cellSize, cellSize);
                ctx.strokeStyle = '#E0E0E0';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x, y, cellSize, cellSize);
            }
        }
    }

    // Draw answer labels on each side
    ctx.fillStyle = '#666';
    ctx.font = `bold ${Math.max(10, cellSize * 0.5)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // A = top
    ctx.fillStyle = '#E74C3C';
    ctx.fillText('A', size / 2, offset - 14);

    // B = right
    ctx.fillStyle = '#3498DB';
    ctx.save();
    ctx.translate(offset + cellSize * 5 + 14, size / 2);
    ctx.fillText('B', 0, 0);
    ctx.restore();

    // C = bottom
    ctx.fillStyle = '#F1C40F';
    ctx.fillText('C', size / 2, offset + cellSize * 5 + 14);

    // D = left
    ctx.fillStyle = '#2ECC71';
    ctx.fillText('D', offset - 14, size / 2);

    // Draw label at bottom
    ctx.fillStyle = '#333';
    ctx.font = `bold ${Math.max(11, size * 0.065)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(label, size / 2, size + 22);
}

// Rotate a 5x5 grid 90° clockwise
export function rotateGrid90(grid) {
    const n = grid.length;
    const rotated = Array(n).fill(null).map(() => Array(n).fill(0));
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            rotated[c][n - 1 - r] = grid[r][c];
        }
    }
    return rotated;
}

// Detect which answer (A/B/C/D) based on the orientation of a scanned code
export function detectAnswer(grid) {
    // Check which corner has the orientation marker (filled cell)
    // A = top-left (0,0), B = top-right (0,4), C = bottom-right (4,4), D = bottom-left (4,0)
    if (grid[0][0] === 1 && grid[0][4] === 0 && grid[4][4] === 0 && grid[4][0] === 0) return 'A';
    if (grid[0][0] === 0 && grid[0][4] === 1 && grid[4][4] === 0 && grid[4][0] === 0) return 'B';
    if (grid[0][0] === 0 && grid[0][4] === 0 && grid[4][4] === 1 && grid[4][0] === 0) return 'C';
    if (grid[0][0] === 0 && grid[0][4] === 0 && grid[4][4] === 0 && grid[4][0] === 1) return 'D';
    return null; // Unknown orientation
}

// Decode student number from grid (assuming grid is in canonical orientation - answer A)
export function decodeStudentNumber(grid) {
    // First normalize to answer A orientation
    let normalized = grid;
    const answer = detectAnswer(grid);
    if (answer === 'B') {
        // Rotate 270° (or 3 times 90° CW)
        normalized = rotateGrid90(rotateGrid90(rotateGrid90(grid)));
    } else if (answer === 'C') {
        normalized = rotateGrid90(rotateGrid90(grid));
    } else if (answer === 'D') {
        normalized = rotateGrid90(grid);
    }

    const dataCells = [
        [1, 1], [1, 2], [1, 3],
        [2, 1], [2, 3],
        [3, 1]
    ];

    let bits = '';
    for (const [r, c] of dataCells) {
        bits += normalized[r][c];
    }

    return parseInt(bits, 2);
}

// SVG icons as strings
export const icons = {
    hand: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 13"/></svg>`,

    users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,

    quiz: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9.5 15.5 12 18l2.5-2.5"/></svg>`,

    play: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,

    plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,

    grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,

    scan: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10"/></svg>`,

    trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,

    ai: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/><path d="M9 18h6"/></svg>`,

    logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,

    settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,

    printer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,

    trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,

    edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,

    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,

    clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,

    home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,

    chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,

    camera: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,

    zap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,

    star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
};

// Navbar HTML generator
export function getNavbarHTML(activePage = '') {
    return `
    <nav class="navbar" id="appNavbar">
      <div class="navbar-inner">
        <a href="dashboard.html" class="navbar-brand">
          ${icons.hand}
          <span>Hands<span class="text-gradient">Up</span></span>
        </a>
        <div class="navbar-links">
          <a href="dashboard.html" class="navbar-link ${activePage === 'dashboard' ? 'active' : ''}">Dashboard</a>
          <a href="my-classes.html" class="navbar-link ${activePage === 'classes' ? 'active' : ''}">Mis Clases</a>
          <a href="my-quizzes.html" class="navbar-link ${activePage === 'quizzes' ? 'active' : ''}">Mis Quizzes</a>
          <button onclick="window.handleLogout()" class="btn btn-ghost btn-sm" id="logoutBtn">${icons.logout} Salir</button>
        </div>
      </div>
    </nav>
    <script>
      (function() {
        const nb = document.getElementById('appNavbar');
        if (nb) {
          window.addEventListener('scroll', () => {
            nb.classList.toggle('scrolled', window.scrollY > 10);
          });
          // Initial check
          nb.classList.toggle('scrolled', window.scrollY > 10);
        }
      })();
    </script>
  `;
}
