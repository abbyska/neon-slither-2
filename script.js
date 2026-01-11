/**
 * Neon Slither 2 - Game Logic
 */

// --- Constants & Config ---
const CONFIG = {
    gridWidth: 40, // Number of tiles horizontally
    gameSpeed: 100, // ms per move (lower = faster)
    colors: {
        snakeHead: '#00ff9d',
        snakeBody: '#00ccff',
        food: '#ff00ff',
        wall: '#ff3333'
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
    nextDirection: { x: 0, y: 0 } // Buffer input to prevent self-collision on rapid turns
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

    // UI Listeners
    const tapToStartBtn = document.getElementById('tap-to-start');
    if (tapToStartBtn) {
        tapToStartBtn.addEventListener('click', startGame);
    }
    restartBtn.addEventListener('click', startGame);

    // Initial Render
    highScoreVal.textContent = state.highScore;
    if (hudNameVal) hudNameVal.textContent = state.playerName;
    render();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Calculate Grid
    // Use Math.max to prevent zero/negative values if window is weirdly small
    state.tileSize = Math.max(10, Math.floor(canvas.width / CONFIG.gridWidth));
    state.tileCountX = CONFIG.gridWidth;
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

    state.lastTime = performance.now();
    state.loopId = requestAnimationFrame(gameLoop);
}

function gameOver() {
    state.isPlaying = false;
    state.isGameOver = true;
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
    ctx.fillStyle = '#050510'; // Match CSS bg
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid (Optional, low opacity)
    /*
    ctx.strokeStyle = 'rgba(26, 26, 46, 0.5)';
    ctx.lineWidth = 1;
    for(let i=0; i<=state.tileCountX; i++) {
        ctx.beginPath();
        ctx.moveTo(i * state.tileSize, 0);
        ctx.lineTo(i * state.tileSize, state.tileCountY * state.tileSize);
        ctx.stroke();
    }
    for(let i=0; i<=state.tileCountY; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * state.tileSize);
        ctx.lineTo(state.tileCountX * state.tileSize, i * state.tileSize);
        ctx.stroke();
    }
    */

    // Helper for glowing rects
    function drawGlowRect(x, y, color, shadowBlur) {
        ctx.shadowBlur = shadowBlur;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        // Add a small padding for 'cell' look
        const padding = 1;
        ctx.fillRect(
            x * state.tileSize + padding,
            y * state.tileSize + padding,
            state.tileSize - 2 * padding,
            state.tileSize - 2 * padding
        );
        ctx.shadowBlur = 0; // Reset
    }

    // Draw Food
    drawGlowRect(state.food.x, state.food.y, CONFIG.colors.food, 20);

    // Draw Snake
    state.snake.forEach((part, index) => {
        const isHead = index === 0;
        const color = isHead ? CONFIG.colors.snakeHead : CONFIG.colors.snakeBody;
        const blur = isHead ? 20 : 10;
        drawGlowRect(part.x, part.y, color, blur);
    });
}

// --- Input Handling ---
function initInput() {
    // Keyboard
    document.addEventListener('keydown', e => {
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
