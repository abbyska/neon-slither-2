/**
 * Neon Slither 2 - Game Logic
 */

// --- Constants & Config ---
const CONFIG = {
    gridWidth: 40, // Number of tiles horizontally
    gameSpeed: 100, // ms per move (lower = faster)
    colors: {
        neon: {
            snakeHead: '#00ff9d',
            snakeBody: '#00ccff',
            food: '#ff00ff'
        },
        lego: {
            snakeHead: '#e3000b', // Lego Red
            snakeBody: '#ffd500', // Lego Yellow
            food: '#0055bf'      // Lego Blue
        }
    },
    // Random Name Generator Data
    adjectives: ['Neon', 'Glowing', 'Cyber', 'Pixel', 'Electric', 'Hyper', 'Glitchy', 'Quantum', 'Laser', 'Retro', 'Turbo', 'Mega'],
    nouns: ['Snake', 'Python', 'Cobra', 'Viper', 'Serpent', 'Noodle', 'Worm', 'Byte', 'Glitch', 'Slither', 'Bot', 'Dragon']
};

// --- Game State ---
let state = {
    loopId: null,
    lastTime: 0,
    tileCountX: 20,
    tileCountY: 20,
    tileSize: 0,
    isPlaying: false,
    isPaused: false,
    isGameOver: false,
    score: 0,
    gameSpeed: 100, // Default to Beginner
    playerName: '',
    leaderboard: [],
    highScore: 0, // Will load from leaderboard
    isPlaying: false,
    isGameOver: false,
    snake: [],
    velocity: { x: 0, y: 0 },
    food: { x: 0, y: 0 },
    nextDirection: { x: 0, y: 0 },
    theme: 'neon'
};

// --- DOM Elements ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreVal = document.getElementById('score-value');
const highScoreVal = document.getElementById('highscore-value');
const finalScoreVal = document.getElementById('final-score-value');
const startScreen = document.getElementById('start-screen');
const hud = document.getElementById('hud');
const gameOverScreen = document.getElementById('game-over-screen');
const restartBtn = document.getElementById('restart-btn');
const startNameVal = document.getElementById('start-name');
const hudNameVal = document.getElementById('hud-name');
const leaderboardList = document.getElementById('leaderboard-list');
const difficultyBtns = document.querySelectorAll('.btn-diff');
const backToMainHud = document.getElementById('back-to-main-hud');
const backToMainGameOver = document.getElementById('back-to-main-gameover');
const pauseBtnHud = document.getElementById('pause-btn-hud');
const pauseScreen = document.getElementById('pause-screen');
const resumeBtn = document.getElementById('resume-btn');
const quitBtn = document.getElementById('quit-btn');
const themeBtns = document.querySelectorAll('.btn-theme');

// --- Helper Functions ---
function generateFunnyName() {
    const adj = CONFIG.adjectives[Math.floor(Math.random() * CONFIG.adjectives.length)];
    const noun = CONFIG.nouns[Math.floor(Math.random() * CONFIG.nouns.length)];
    return `${adj} ${noun}`;
}

function loadLeaderboard() {
    const stored = localStorage.getItem('neon_snake_leaderboard');
    if (stored) {
        state.leaderboard = JSON.parse(stored);
        state.highScore = state.leaderboard.length > 0 ? state.leaderboard[0].score : 0;
    } else {
        // Migration from old simple high score if exists
        const oldHigh = localStorage.getItem('neon_snake_highscore');
        if (oldHigh) {
            state.leaderboard.push({ name: 'Legacy Player', score: parseInt(oldHigh) });
            state.highScore = oldHigh;
        }
    }
}

function saveScore(name, score) {
    state.leaderboard.push({ name, score });
    state.leaderboard.sort((a, b) => b.score - a.score);
    state.leaderboard = state.leaderboard.slice(0, 5); // Keep top 5
    localStorage.setItem('neon_snake_leaderboard', JSON.stringify(state.leaderboard));

    // Update local high score reference
    if (state.leaderboard.length > 0) {
        state.highScore = state.leaderboard[0].score;
    }
}

function renderLeaderboard() {
    leaderboardList.innerHTML = '';
    state.leaderboard.forEach((entry, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="rank">#${index + 1}</span>
            <span class="name">${entry.name}</span>
            <span class="score">${entry.score}</span>
        `;
        leaderboardList.appendChild(li);
    });
}

// --- Initialization ---
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    loadLeaderboard();
    state.playerName = generateFunnyName();
    if (startNameVal) startNameVal.textContent = state.playerName;

    // Input Listeners
    initInput();

    // Difficulty Listeners
    difficultyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent triggering start game

            // Visual Update
            difficultyBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // State Update
            state.gameSpeed = parseInt(btn.dataset.speed);
        });
    });

    // Theme Listeners
    themeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            themeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.theme = btn.dataset.theme;

            // Toggle class on body for CSS changes
            if (state.theme === 'lego') {
                document.body.classList.add('theme-lego');
            } else {
                document.body.classList.remove('theme-lego');
            }
            render();
        });
    });

    // UI Listeners
    const tapToStartBtn = document.getElementById('tap-to-start');
    if (tapToStartBtn) {
        tapToStartBtn.addEventListener('click', startGame);
    }
    restartBtn.addEventListener('click', startGame);

    // Back to Main Listeners
    if (backToMainHud) {
        backToMainHud.addEventListener('click', returnToMain);
    }
    if (backToMainGameOver) {
        backToMainGameOver.addEventListener('click', returnToMain);
    }

    // Pause Listeners
    if (pauseBtnHud) pauseBtnHud.addEventListener('click', togglePause);
    if (resumeBtn) resumeBtn.addEventListener('click', togglePause);
    if (quitBtn) quitBtn.addEventListener('click', returnToMain);

    // Initial Render
    highScoreVal.textContent = state.highScore;
    if (hudNameVal) hudNameVal.textContent = state.playerName;
    render();
}

function returnToMain() {
    // Stop game if playing
    if (state.isPlaying || state.isPaused) {
        state.isPlaying = false;
        state.isPaused = false;
        cancelAnimationFrame(state.loopId);
    }

    // Reset game state
    state.isGameOver = false;

    // Hide all screens except start
    hud.classList.add('hidden');
    backToMainHud.classList.add('hidden');
    pauseBtnHud.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');

    // Generate new name for next game
    state.playerName = generateFunnyName();
    if (startNameVal) startNameVal.textContent = state.playerName;
    if (hudNameVal) hudNameVal.textContent = state.playerName;
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Calculate Grid
    // Use smaller grid width on mobile to make the snake look bigger
    const gridWidth = window.innerWidth < 600 ? 15 : CONFIG.gridWidth;
    state.tileSize = Math.max(10, Math.floor(canvas.width / gridWidth));
    state.tileCountX = gridWidth;
    state.tileCountY = Math.floor(canvas.height / state.tileSize);

    // Center the game area vertically if there's extra space
    // (For this simple version, we'll just use the full height available for tiles)

    if (!state.isPlaying && !state.isGameOver) {
        render(); // Re-render static background if waiting
    }
}

function startGame() {
    state.isPlaying = true;
    state.isGameOver = false;
    state.score = 0;
    // Start in the middle
    const midX = Math.floor(state.tileCountX / 2);
    const midY = Math.floor(state.tileCountY / 2);

    state.snake = [
        { x: midX, y: midY },
        { x: midX - 1, y: midY },
        { x: midX - 2, y: midY }
    ];
    state.velocity = { x: 1, y: 0 };
    state.nextDirection = { x: 1, y: 0 };

    placeFood();

    scoreVal.textContent = 0;

    // UI logic
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    backToMainHud.classList.remove('hidden');
    pauseBtnHud.classList.remove('hidden');

    state.lastTime = performance.now();
    state.loopId = requestAnimationFrame(gameLoop);
}

function gameOver() {
    state.isPlaying = false;
    state.isGameOver = true;
    pauseBtnHud.classList.add('hidden');
    cancelAnimationFrame(state.loopId);

    // Save Score
    saveScore(state.playerName, state.score);
    highScoreVal.textContent = state.highScore;
    renderLeaderboard();

    // Prepare next name
    state.playerName = generateFunnyName();
    if (startNameVal) startNameVal.textContent = state.playerName;
    if (hudNameVal) hudNameVal.textContent = state.playerName;

    finalScoreVal.textContent = state.score;
    hud.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
}

// --- Game Loop ---
function gameLoop(timestamp) {
    if (!state.isPlaying) return;

    const deltaTime = timestamp - state.lastTime;

    if (deltaTime >= state.gameSpeed) {
        update();
        state.lastTime = timestamp;
    }

    render();

    if (state.isPlaying) {
        state.loopId = requestAnimationFrame(gameLoop);
    }
}

function update() {
    // Apply buffered direction
    state.velocity = { ...state.nextDirection };

    const head = { ...state.snake[0] };
    head.x += state.velocity.x;
    head.y += state.velocity.y;

    // Wall Collision
    if (head.x < 0 || head.x >= state.tileCountX ||
        head.y < 0 || head.y >= state.tileCountY) {
        return gameOver();
    }

    // Self Collision
    for (let part of state.snake) {
        if (head.x === part.x && head.y === part.y) {
            return gameOver();
        }
    }

    state.snake.unshift(head);

    // Eat Food
    if (head.x === state.food.x && head.y === state.food.y) {
        state.score += 10;
        scoreVal.textContent = state.score;
        placeFood();
        // Don't pop tail, so it grows
    } else {
        state.snake.pop();
    }
}

function placeFood() {
    let valid = false;
    while (!valid) {
        state.food = {
            x: Math.floor(Math.random() * state.tileCountX),
            y: Math.floor(Math.random() * state.tileCountY)
        };

        valid = true;
        // Check if food spawns on snake
        for (let part of state.snake) {
            if (part.x === state.food.x && part.y === state.food.y) {
                valid = false;
                break;
            }
        }
    }
}

// --- Rendering ---
function render() {
    // Clear Canvas
    if (state.theme === 'neon') {
        ctx.fillStyle = '#050510';
    } else {
        ctx.fillStyle = '#4b6584'; // Match lego bg
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- Draw Helpers ---
    function drawGlowRect(x, y, color, shadowBlur) {
        ctx.shadowBlur = shadowBlur;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        const padding = 1;
        ctx.fillRect(
            x * state.tileSize + padding,
            y * state.tileSize + padding,
            state.tileSize - 2 * padding,
            state.tileSize - 2 * padding
        );
        ctx.shadowBlur = 0;
    }

    function drawLegoBrick(x, y, color) {
        const padding = 1;
        const size = state.tileSize - 2 * padding;
        const px = x * state.tileSize + padding;
        const py = y * state.tileSize + padding;

        // Main Brick
        ctx.fillStyle = color;
        ctx.fillRect(px, py, size, size);

        // Highlight/Shadow lines
        ctx.lineWidth = Math.max(1, size / 10);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.strokeRect(px + ctx.lineWidth / 2, py + ctx.lineWidth / 2, size - ctx.lineWidth, size - ctx.lineWidth);

        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.strokeRect(px + ctx.lineWidth, py + ctx.lineWidth, size - 2 * ctx.lineWidth, size - 2 * ctx.lineWidth);

        // Central Stud
        const studRadius = size * 0.25;
        const centerX = px + size / 2;
        const centerY = py + size / 2;

        ctx.beginPath();
        ctx.arc(centerX + 1, centerY + 1, studRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX, centerY, studRadius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Stud Detail (LEGO text circle)
        ctx.beginPath();
        ctx.arc(centerX, centerY, studRadius * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // --- Render Objects ---
    const themeColors = CONFIG.colors[state.theme];

    // Draw Food
    if (state.theme === 'neon') {
        drawGlowRect(state.food.x, state.food.y, themeColors.food, 20);
    } else {
        drawLegoBrick(state.food.x, state.food.y, themeColors.food);
    }

    // Draw Snake
    state.snake.forEach((part, index) => {
        const isHead = index === 0;
        const color = isHead ? themeColors.snakeHead : themeColors.snakeBody;

        if (state.theme === 'neon') {
            const blur = isHead ? 20 : 10;
            drawGlowRect(part.x, part.y, color, blur);
        } else {
            drawLegoBrick(part.x, part.y, color);
        }
    });
}

// --- Input Handling ---
function togglePause() {
    // Only toggle if game is active (playing or already paused)
    if (!state.isPlaying && !state.isPaused) return;

    state.isPaused = !state.isPaused;

    if (state.isPaused) {
        state.isPlaying = false;
        cancelAnimationFrame(state.loopId);
        pauseScreen.classList.remove('hidden');
    } else {
        state.isPlaying = true;
        pauseScreen.classList.add('hidden');
        state.lastTime = performance.now();
        state.loopId = requestAnimationFrame(gameLoop);
    }
}

function initInput() {
    document.addEventListener('keydown', e => {
        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
            togglePause();
            return;
        }

        // Prevent default scrolling for arrow keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }

        switch (e.key) {
            case 'ArrowUp': changeDirection(0, -1); break;
            case 'ArrowDown': changeDirection(0, 1); break;
            case 'ArrowLeft': changeDirection(-1, 0); break;
            case 'ArrowRight': changeDirection(1, 0); break;
        }
    });

    // Touch Swipe
    let touchStartX = 0;
    let touchStartY = 0;

    document.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: false });

    document.addEventListener('touchmove', e => {
        e.preventDefault(); // Prevent scrolling
    }, { passive: false });

    document.addEventListener('touchend', e => {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
    });
}

function changeDirection(x, y) {
    // Prevent reversing direction directly
    if (state.velocity.x === -x && state.velocity.y === -y) return;
    // Update buffered direction
    state.nextDirection = { x, y };
}

function handleSwipe(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;

    if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal
        if (Math.abs(dx) > 30) { // Threshold
            if (dx > 0) changeDirection(1, 0);
            else changeDirection(-1, 0);
        }
    } else {
        // Vertical
        if (Math.abs(dy) > 30) {
            if (dy > 0) changeDirection(0, 1);
            else changeDirection(0, -1);
        }
    }
}

// Start
init();
