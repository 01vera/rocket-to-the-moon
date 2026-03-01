/**
 * Rocket to the Moon - Game Logic with Sound and Win Condition
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// HUD Elements
const fuelBarFill = document.getElementById('fuel-bar-fill');
const currentScoreEl = document.getElementById('current-score');
const highScoreEl = document.getElementById('high-score');
const stageNameEl = document.getElementById('stage-name');
const distanceBarFill = document.getElementById('distance-bar-fill');
const finalScoreEl = document.getElementById('final-score');
const bestScoreEl = document.getElementById('best-score');
const deathReasonEl = document.getElementById('death-reason');

// Win Screen Elements
const winScreen = document.getElementById('win-screen');
const winFinalScoreEl = document.getElementById('win-final-score');
const winBestScoreEl = document.getElementById('win-best-score');
const restartWinBtn = document.getElementById('restart-win-btn');

// Screens
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Audio Objects
const rocketAmbient = new Audio('sounds/ambient.mp3');
rocketAmbient.loop = true;
const fuelPickupSound = new Audio('sounds/fuel.mp3');
const crashSound = new Audio('sounds/crash.mp3');
const gameOverSound = new Audio('sounds/gameover.mp3');
const winSound = new Audio('sounds/win.mp3');

// Volume Control
let masterVolume = 0.7;
const volumeRange = document.getElementById('volume-range');

function applyMasterVolume() {
    rocketAmbient.volume = 0.2 * masterVolume;
    fuelPickupSound.volume = 0.6 * masterVolume;
    crashSound.volume = 0.8 * masterVolume;
    gameOverSound.volume = 0.6 * masterVolume;
    winSound.volume = 0.7 * masterVolume;
}

if (volumeRange) {
    volumeRange.value = Math.round(masterVolume * 100);
    volumeRange.addEventListener('input', () => {
        masterVolume = Number(volumeRange.value) / 100;
        applyMasterVolume();
    });
}

// Initial volume application
applyMasterVolume();

// Game Constants
const BASE_CANVAS_WIDTH = 400;
const BASE_CANVAS_HEIGHT = 700;
let CANVAS_WIDTH = BASE_CANVAS_WIDTH;
let CANVAS_HEIGHT = BASE_CANVAS_HEIGHT;
let scaleX = 1;
let scaleY = 1;

const ROCKET_WIDTH = 22;
const ROCKET_HEIGHT = 60;
const FUEL_CONSUMPTION_BASE = 0.03;
const FUEL_CONSUMPTION_BOOST = 0.1;
const BASE_SCROLL_SPEED = 1.5;
const BOOST_SCROLL_SPEED = 4;
const WIN_DISTANCE = 4000; // СОКРАЩЕНО ЕЩЕ: Было 6000
// Game State
let gameState = 'START'; // START, PLAYING, GAMEOVER, WIN
let score = 0;
let highScore = localStorage.getItem('rocketHighScore') || 0;
let fuel = 100;
let progress = 0;
let scrollSpeed = BASE_SCROLL_SPEED;

// Explosion State
let explosionActive = false;
let explosionTimer = 0;

// Obstacle Spawning
let obstacleSpawnTimer = 0;

// Rocket Object
const rocket = {
    x: CANVAS_WIDTH / 2 - ROCKET_WIDTH / 2,
    y: CANVAS_HEIGHT - 100,
    w: ROCKET_WIDTH,
    h: ROCKET_HEIGHT,
    speed: 3.5,
    dx: 0,
    isBoosting: false
};

// Game Objects
let obstacles = [];
let fuelBonuses = [];
let stars = [];

// Input Handling
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Touch Controls
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnBoost = document.getElementById('btn-boost');

if (btnLeft) {
    btnLeft.addEventListener('pointerdown', (e) => { e.preventDefault(); keys['ArrowLeft'] = true; });
    btnLeft.addEventListener('pointerup', (e) => { e.preventDefault(); keys['ArrowLeft'] = false; });
    btnLeft.addEventListener('pointerleave', (e) => { e.preventDefault(); keys['ArrowLeft'] = false; });
}

if (btnRight) {
    btnRight.addEventListener('pointerdown', (e) => { e.preventDefault(); keys['ArrowRight'] = true; });
    btnRight.addEventListener('pointerup', (e) => { e.preventDefault(); keys['ArrowRight'] = false; });
    btnRight.addEventListener('pointerleave', (e) => { e.preventDefault(); keys['ArrowRight'] = false; });
}

if (btnBoost) {
    btnBoost.addEventListener('pointerdown', (e) => { e.preventDefault(); keys['ArrowUp'] = true; });
    btnBoost.addEventListener('pointerup', (e) => { e.preventDefault(); keys['ArrowUp'] = false; });
    btnBoost.addEventListener('pointerleave', (e) => { e.preventDefault(); keys['ArrowUp'] = false; });
}

// Resize Handling
function resizeCanvas() {
    const aspectRatio = BASE_CANVAS_WIDTH / BASE_CANVAS_HEIGHT;
    let newWidth = window.innerWidth;
    let newHeight = window.innerHeight;

    if (newWidth / newHeight > aspectRatio) {
        newWidth = newHeight * aspectRatio;
    } else {
        newHeight = newWidth / aspectRatio;
    }

    // Cap at base size for desktop to keep it sharp
    if (newWidth > BASE_CANVAS_WIDTH && window.innerWidth > BASE_CANVAS_WIDTH) {
        newWidth = BASE_CANVAS_WIDTH;
        newHeight = BASE_CANVAS_HEIGHT;
    }

    canvas.width = newWidth;
    canvas.height = newHeight;

    scaleX = newWidth / BASE_CANVAS_WIDTH;
    scaleY = newHeight / BASE_CANVAS_HEIGHT;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Initialize Stars for background
function initStars() {
    stars = [];
    for (let i = 0; i < 60; i++) {
        stars.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: Math.random() * 2,
            speed: Math.random() * 0.05 + 0.01 // Звезды стали гораздо медленнее
        });
    }
}

// Stop all sounds
function stopAllSounds() {
    rocketAmbient.pause();
    rocketAmbient.currentTime = 0;
    winSound.pause();
    winSound.currentTime = 0;
    gameOverSound.pause();
    gameOverSound.currentTime = 0;
    crashSound.pause();
    crashSound.currentTime = 0;
}

// Start Game
function startGame() {
    stopAllSounds();
    
    gameState = 'PLAYING';
    score = 0;
    fuel = 100;
    progress = 0;
    obstacles = [];
    fuelBonuses = [];
    rocket.x = CANVAS_WIDTH / 2 - ROCKET_WIDTH / 2;
    rocket.dx = 0;
    obstacleSpawnTimer = 60; // Start with a small delay
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    winScreen.classList.add('hidden');
    
    highScoreEl.innerText = `Рекорд: ${highScore}`;
    
    // Play ambient sound
    rocketAmbient.play().catch(e => console.log("Audio play blocked by browser policy"));
    
    requestAnimationFrame(gameLoop);
}

// Game Over
function gameOver(reason) {
    gameState = 'GAMEOVER';
    
    // Stop ambient
    rocketAmbient.pause();
    rocketAmbient.currentTime = 0;
    
    // Play sounds
    crashSound.play().catch(e => {});
    gameOverSound.play().catch(e => {});

    if (reason === 'collision') {
        explosionActive = true;
        explosionTimer = 45; // количество кадров, пока виден взрыв (увеличено)
    }

    deathReasonEl.innerText = reason === 'collision' ? 'СТОЛКНОВЕНИЕ!' : 'ТОПЛИВО ЗАКОНЧИЛОСЬ!';
    finalScoreEl.innerText = Math.floor(score);
    
    if (score > highScore) {
        highScore = Math.floor(score);
        localStorage.setItem('rocketHighScore', highScore);
    }
    
    bestScoreEl.innerText = highScore;
    
    // Показываем экран с задержкой, если был взрыв, чтобы его было видно
    if (reason === 'collision') {
        setTimeout(() => {
            gameOverScreen.classList.remove('hidden');
        }, 1200); // Задержка увеличена
    } else {
        gameOverScreen.classList.remove('hidden');
    }
}

// Handle Win
function handleWin() {
    gameState = 'WIN';
    
    // Stop ambient
    rocketAmbient.pause();
    rocketAmbient.currentTime = 0;
    
    // Play win sound
    winSound.play().catch(e => {});

    // Draw one last frame to show the moon at its final size
    draw();

    // Delay showing the win screen
    setTimeout(() => {
        winFinalScoreEl.innerText = Math.floor(score);
        
        if (score > highScore) {
            highScore = Math.floor(score);
            localStorage.setItem('rocketHighScore', highScore);
        }
        
        winBestScoreEl.innerText = highScore;
        winScreen.classList.remove('hidden');
    }, 1500); // 1.5 second delay
}

// Collision Detection (AABB) with forgiving hitboxes
function checkCollision(rect1, rect2, isRocket = false) {
    // Уменьшаем хитбокс для более честной игры (на 20% для астероидов и на 15% для ракеты)
    const paddingW1 = rect1.w * 0.15;
    const paddingH1 = rect1.h * 0.15;
    const paddingW2 = rect2.w * 0.2;
    const paddingH2 = rect2.h * 0.2;

    // Для ракеты используем её визуальную Y координату, если она взлетает в конце
    let r1y = rect1.y;
    if (isRocket && typeof progress !== 'undefined') {
        if (progress > 3500) {
            const landingProgress = (progress - 3500) / (WIN_DISTANCE - 3500);
            r1y -= landingProgress * 150;
        }
    }

    return (rect1.x + paddingW1) < (rect2.x + rect2.w - paddingW2) &&
           (rect1.x + rect1.w - paddingW1) > (rect2.x + paddingW2) &&
           (r1y + paddingH1) < (rect2.y + rect2.h - paddingH2) &&
           (r1y + rect1.h - paddingH1) > (rect2.y + paddingH2);
}

// Update Logic
function update() {
    if (explosionActive) {
        explosionTimer--;
        if (explosionTimer <= 0) {
            explosionActive = false;
        }
    }

    if (gameState !== 'PLAYING') return;

    // Handle Input
    if (keys['ArrowLeft']) {
        rocket.dx = -rocket.speed;
    } else if (keys['ArrowRight']) {
        rocket.dx = rocket.speed;
    } else {
        rocket.dx = 0;
    }

    rocket.isBoosting = keys['ArrowUp'];
    scrollSpeed = rocket.isBoosting ? BOOST_SCROLL_SPEED : BASE_SCROLL_SPEED;

    // Move Rocket
    rocket.x += rocket.dx;

    // Boundaries
    if (rocket.x < 0) rocket.x = 0;
    if (rocket.x + rocket.w > CANVAS_WIDTH) rocket.x = CANVAS_WIDTH - rocket.w;

    // Fuel Logic
    const consumption = rocket.isBoosting ? FUEL_CONSUMPTION_BOOST : FUEL_CONSUMPTION_BASE;
    fuel -= consumption;
    if (fuel <= 0) {
        fuel = 0;
        gameOver('fuel');
        return;
    }

    // Progress & Stage
    progress += scrollSpeed * 0.1;
    score += scrollSpeed * 0.05;

    // Check Win Condition
    if (progress >= WIN_DISTANCE) {
        handleWin();
        return;
    }

    updateStage();

    // Update Stars
    stars.forEach(star => {
        star.y += scrollSpeed * star.speed;
        if (star.y > CANVAS_HEIGHT) {
            star.y = 0;
            star.x = Math.random() * CANVAS_WIDTH;
        }
    });

    // Spawn Obstacles
    obstacleSpawnTimer--;
    if (obstacleSpawnTimer <= 0) {
        // Constant spawn interval to prevent increasing density near the Moon
        const baseInterval = 210;
        // Add some randomness to the interval (±20%)
        obstacleSpawnTimer = baseInterval * (0.8 + Math.random() * 0.4);

        obstacles.push({
            x: Math.random() * (CANVAS_WIDTH - 30),
            y: -50,
            w: 30 + Math.random() * 20,
            h: 30 + Math.random() * 20,
            // Vary speed significantly: some slow, some fast
            speed: scrollSpeed * (0.4 + Math.random() * 0.6)
        });
    }

    // Spawn Fuel
    if (Math.random() < 0.005) {
        fuelBonuses.push({
            x: Math.random() * (CANVAS_WIDTH - 25),
            y: -50,
            w: 25,
            h: 25
        });
    }

    // Update Obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.y += obs.speed;

        // Collision with rocket
        if (checkCollision(rocket, obs, true)) {
            gameOver('collision');
            return;
        }

        // Remove if off screen
        if (obs.y > CANVAS_HEIGHT) {
            obstacles.splice(i, 1);
        }
    }

    // Update Fuel Bonuses
    for (let i = fuelBonuses.length - 1; i >= 0; i--) {
        const f = fuelBonuses[i];
        f.y += scrollSpeed * 0.6;

        // Collision with rocket
        if (checkCollision(rocket, f, true)) {
            fuel = Math.min(100, fuel + 20);
            score += 50;
            fuelPickupSound.currentTime = 0;
            fuelPickupSound.play().catch(e => {});
            fuelBonuses.splice(i, 1);
            continue;
        }

        // Remove if off screen
        if (f.y > CANVAS_HEIGHT) {
            fuelBonuses.splice(i, 1);
        }
    }

    // Update HUD
    fuelBarFill.style.width = `${fuel}%`;
    currentScoreEl.innerText = `Очки: ${Math.floor(score)}`;
    
    // Update Distance Bar
    const distPercent = Math.min(100, (progress / WIN_DISTANCE) * 100);
    distanceBarFill.style.width = `${distPercent}%`;
    
    // Change color based on progress
    if (distPercent > 90) {
        distanceBarFill.style.backgroundColor = "#FFD700"; // Gold near Moon
    } else if (distPercent > 60) {
        distanceBarFill.style.backgroundColor = "#ffffff"; // White in Orbit
    } else if (distPercent > 30) {
        distanceBarFill.style.backgroundColor = "#B026FF"; // Purple in Space
    } else {
        distanceBarFill.style.backgroundColor = "#00d4ff"; // Cyan in Stratosphere
    }
}

function updateStage() {
    let stage = "Стратосфера";
    let color = "#1e3c72";

    // Равномерное распределение этапов (каждые 1000 единиц прогресса при дистанции 4000)
    if (progress > 3000) {
        stage = "Луна";
        color = "#e0e0e0";
    } else if (progress > 2000) {
        stage = "Орбита";
        color = "#434343";
    } else if (progress > 1000) {
        stage = "Космос";
        color = "#0f0c29";
    }

    stageNameEl.innerText = stage;
    stageNameEl.style.color = progress > 3000 ? "#333" : "#00d4ff";
}

// Draw Logic
function draw() {
    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(scaleX, scaleY);

    // Draw Background Gradient based on progress
    let bgGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    if (progress < 1000) {
        bgGradient.addColorStop(0, '#1e3c72');
        bgGradient.addColorStop(1, '#2a5298');
    } else if (progress < 2000) {
        bgGradient.addColorStop(0, '#000000');
        bgGradient.addColorStop(1, '#0f0c29');
    } else if (progress < 3000) {
        bgGradient.addColorStop(0, '#000000');
        bgGradient.addColorStop(1, '#434343');
    } else {
        bgGradient.addColorStop(0, '#000000');
        bgGradient.addColorStop(1, '#e0e0e0');
    }
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Stars
    ctx.fillStyle = "white";
    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw Earth at the start
    const earthEndProgress = 400;
    if (progress < earthEndProgress) {
        const earthProgress = progress / earthEndProgress;
        const earthRadius = 800; 
        const earthY = CANVAS_HEIGHT + 750 + (earthProgress * 1000); // Уходит вниз
        
        ctx.save();
        // Атмосферное свечение Земли
        const glow = ctx.createRadialGradient(CANVAS_WIDTH / 2, earthY, earthRadius * 0.9, CANVAS_WIDTH / 2, earthY, earthRadius * 1.1);
        glow.addColorStop(0, 'rgba(0, 212, 255, 0.4)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(CANVAS_WIDTH / 2, earthY, earthRadius * 1.1, 0, Math.PI * 2);
        ctx.fill();

        // Тело Земли (Океаны)
        ctx.fillStyle = "#1e3c72";
        ctx.beginPath();
        ctx.arc(CANVAS_WIDTH / 2, earthY, earthRadius, 0, Math.PI * 2);
        ctx.fill();

        // Материки (упрощенно зелеными пятнами)
        ctx.fillStyle = "#2d5a27";
        ctx.beginPath();
        ctx.arc(CANVAS_WIDTH / 2 - 100, earthY - 750, 200, 0, Math.PI * 2);
        ctx.arc(CANVAS_WIDTH / 2 + 150, earthY - 780, 150, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Draw Moon if close to winning
    const moonStartProgress = 3000; // Начинает появляться на этапе "Луна"
    if (progress > moonStartProgress) {
        const moonProgress = Math.min(1, (progress - moonStartProgress) / (WIN_DISTANCE - moonStartProgress));
        const moonRadius = moonProgress * 400; // Луна растет до 400px
        // Луна опускается так, чтобы ее край коснулся ракеты
        const moonY = -100 + (moonProgress * 380); 
        
        ctx.save();
        // Свечение Луны
        const glow = ctx.createRadialGradient(CANVAS_WIDTH / 2, moonY, moonRadius * 0.8, CANVAS_WIDTH / 2, moonY, moonRadius * 1.2);
        glow.addColorStop(0, 'rgba(255, 255, 255, 1)');
        glow.addColorStop(0.5, 'rgba(200, 200, 255, 0.3)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(CANVAS_WIDTH / 2, moonY, moonRadius * 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Тело Луны
        ctx.fillStyle = "#e0e0e0";
        ctx.beginPath();
        ctx.arc(CANVAS_WIDTH / 2, moonY, moonRadius, 0, Math.PI * 2);
        ctx.fill();

        // Кратеры
        ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        if (moonRadius > 50) {
            ctx.beginPath();
            ctx.arc(CANVAS_WIDTH / 2 - moonRadius * 0.3, moonY + moonRadius * 0.2, moonRadius * 0.15, 0, Math.PI * 2);
            ctx.arc(CANVAS_WIDTH / 2 + moonRadius * 0.4, moonY - moonRadius * 0.1, moonRadius * 0.1, 0, Math.PI * 2);
            ctx.arc(CANVAS_WIDTH / 2 + moonRadius * 0.1, moonY + moonRadius * 0.4, moonRadius * 0.2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // Draw Fuel Bonuses
    ctx.fillStyle = "#ec9f05";
    fuelBonuses.forEach(f => {
        // Draw a simple fuel canister shape
        ctx.fillRect(f.x, f.y, f.w, f.h);
        ctx.fillStyle = "white";
        ctx.font = "bold 12px Arial";
        ctx.fillText("F", f.x + 8, f.y + 18);
        ctx.fillStyle = "#ec9f05";
    });

    // Draw Obstacles (Asteroids)
    obstacles.forEach(obs => {
        ctx.save();
        // Используем x координату как сид для детерминированной случайности формы
        const seed = Math.floor(obs.x);
        
        ctx.beginPath();
        const points = 9;
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2;
            // Создаем неровности, зависящие от сида и индекса точки
            const variation = Math.sin(seed + i * 1.5) * 0.15 + 0.85;
            const px = obs.x + obs.w / 2 + Math.cos(angle) * (obs.w / 2) * variation;
            const py = obs.y + obs.h / 2 + Math.sin(angle) * (obs.h / 2) * variation;
            
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();

        // Градиент для объема
        const gradient = ctx.createRadialGradient(
            obs.x + obs.w * 0.3, obs.y + obs.h * 0.3, obs.w * 0.05,
            obs.x + obs.w * 0.5, obs.y + obs.h * 0.5, obs.w * 0.6
        );
        gradient.addColorStop(0, "#888");
        gradient.addColorStop(1, "#444");
        ctx.fillStyle = gradient;
        ctx.fill();

        // Добавляем "кратеры" для текстуры
        ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        for (let j = 0; j < 3; j++) {
            const cx = obs.x + obs.w * (0.3 + (Math.sin(seed + j * 2) * 0.2 + 0.2));
            const cy = obs.y + obs.h * (0.4 + (Math.cos(seed + j * 3) * 0.2 + 0.2));
            const cr = obs.w * (0.05 + Math.abs(Math.sin(seed + j)) * 0.1);
            ctx.beginPath();
            ctx.arc(cx, cy, cr, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    });

    // Draw Rocket
    ctx.save();
    // На финальном этапе ракета немного взлетает навстречу Луне
    let rocketVisualY = rocket.y;
    if (progress > 3500) {
        const landingProgress = (progress - 3500) / (WIN_DISTANCE - 3500);
        rocketVisualY -= landingProgress * 150;
    }
    ctx.translate(rocket.x + rocket.w / 2, rocketVisualY + rocket.h / 2);
    
    // Flame
    if (gameState === 'PLAYING') {
        const flameHeight = rocket.isBoosting ? 40 : 20;
        const flameGradient = ctx.createLinearGradient(0, rocket.h / 2, 0, rocket.h / 2 + flameHeight);
        flameGradient.addColorStop(0, '#ff4e00');
        flameGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = flameGradient;
        ctx.beginPath();
        ctx.moveTo(-rocket.w / 4, rocket.h / 2);
        ctx.lineTo(rocket.w / 4, rocket.h / 2);
        ctx.lineTo(0, rocket.h / 2 + flameHeight + Math.random() * 10);
        ctx.fill();
    }

    // --- Realistic Rocket Drawing ---
    
    // 1. Fins (Wings) - Draw these first so they are behind the body
    ctx.fillStyle = "#a0a0a0";
    ctx.beginPath();
    // Left Fin
    ctx.moveTo(-rocket.w / 2, rocket.h / 2);
    ctx.lineTo(-rocket.w * 0.8, rocket.h / 2 + 10);
    ctx.lineTo(-rocket.w / 2, rocket.h / 2 - 20);
    ctx.fill();
    // Right Fin
    ctx.moveTo(rocket.w / 2, rocket.h / 2);
    ctx.lineTo(rocket.w * 0.8, rocket.h / 2 + 10);
    ctx.lineTo(rocket.w / 2, rocket.h / 2 - 20);
    ctx.fill();

    // 2. Main Body (Cylinder)
    const bodyGradient = ctx.createLinearGradient(-rocket.w / 2, 0, rocket.w / 2, 0);
    bodyGradient.addColorStop(0, "#cccccc");
    bodyGradient.addColorStop(0.5, "#ffffff");
    bodyGradient.addColorStop(1, "#999999");
    ctx.fillStyle = bodyGradient;
    
    // Draw body as a slightly rounded rectangle
    const bodyTop = -rocket.h / 2 + 15;
    const bodyBottom = rocket.h / 2;
    ctx.beginPath();
    ctx.moveTo(-rocket.w / 2, bodyTop);
    ctx.lineTo(rocket.w / 2, bodyTop);
    ctx.lineTo(rocket.w / 2, bodyBottom);
    ctx.lineTo(-rocket.w / 2, bodyBottom);
    ctx.closePath();
    ctx.fill();

    // 3. Nose Cone
    const noseGradient = ctx.createLinearGradient(-rocket.w / 2, 0, rocket.w / 2, 0);
    noseGradient.addColorStop(0, "#cc0000");
    noseGradient.addColorStop(0.5, "#ff3333");
    noseGradient.addColorStop(1, "#990000");
    ctx.fillStyle = noseGradient;
    ctx.beginPath();
    ctx.moveTo(-rocket.w / 2, bodyTop);
    ctx.quadraticCurveTo(0, -rocket.h / 2 - 10, rocket.w / 2, bodyTop);
    ctx.fill();

    // 4. Window
    // Outer Frame
    ctx.fillStyle = "#444";
    ctx.beginPath();
    ctx.arc(0, -5, 7, 0, Math.PI * 2);
    ctx.fill();
    // Glass
    const glassGradient = ctx.createRadialGradient(-2, -7, 1.5, 0, -5, 6);
    glassGradient.addColorStop(0, "#ffffff");
    glassGradient.addColorStop(0.2, "#00d4ff");
    glassGradient.addColorStop(1, "#005577");
    ctx.fillStyle = glassGradient;
    ctx.beginPath();
    ctx.arc(0, -5, 5, 0, Math.PI * 2);
    ctx.fill();

    // 5. Panel Lines (Rivets)
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-rocket.w / 2, 0);
    ctx.lineTo(rocket.w / 2, 0);
    ctx.stroke();

    ctx.restore();

    // Draw Explosion
    if (explosionActive) {
        ctx.save();
        const centerX = rocket.x + rocket.w / 2;
        const centerY = rocket.y + rocket.h / 2;
        const maxRadius = 250; // максимальный радиус взрыва (увеличен)
        const progress = explosionTimer / 45; // от 1 до 0 (обновлено под 45 кадров)
        const radius = maxRadius * (1 - progress); // круг расширяется
        ctx.globalAlpha = 0.8 * progress; // постепенно исчезает (начальная прозрачность выше)
        const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, radius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 200, 50, 0.9)');
        gradient.addColorStop(0.6, 'rgba(255, 100, 0, 0.7)');
        gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    ctx.restore();
}

// Main Game Loop
function gameLoop() {
    if (gameState === 'PLAYING' || explosionActive) {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
}

// Initial Setup
initStars();
highScoreEl.innerText = `Рекорд: ${highScore}`;

// Event Listeners for buttons
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
restartWinBtn.addEventListener('click', startGame);

// Initial Draw
draw();
