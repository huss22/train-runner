const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const instructionsEl = document.getElementById('instructions');
const gameOverEl = document.getElementById('gameOver');

// Game Constants
const TRAIN_WIDTH = 60; // Slightly wider
const TRAIN_HEIGHT = 35; // Slightly taller
const OBSTACLE_MIN_WIDTH = 25;
const OBSTACLE_MAX_WIDTH = 45;
const OBSTACLE_MIN_HEIGHT = 25;
const OBSTACLE_MAX_HEIGHT = 40;
const NUM_LANES = 3;
const LANE_HEIGHT = canvas.height / NUM_LANES;
const TRAIN_START_X = 50;
// Colors (more realistic/stylized)
const OBSTACLE_COLOR_ROCK = ['#8B8989', '#696969', '#5A5A5A']; // Shades of grey
const TRAIN_BODY_COLOR = '#B22222'; // Firebrick Red
const TRAIN_ROOF_COLOR = '#4A4A4A';
const TRAIN_UNDER_COLOR = '#333333';
const TRAIN_WINDOW_COLOR = '#ADD8E6'; // Light Blue
const TRACK_RAIL_COLOR = '#505050'; // Darker Grey
const TRACK_TIE_COLOR = '#8B4513'; // Saddle Brown
const GROUND_COLOR_NEAR = '#A0522D'; // Sienna Brown
const GROUND_COLOR_FAR = '#8B7355'; // Tan Brown (for subtle gradient)
const SKY_COLOR_TOP = '#4682B4'; // Steel Blue
const SKY_COLOR_BOTTOM = '#87CEEB'; // Sky Blue

// Game Variables
let train;
let obstacles;
let score;
let gameSpeed;
let obstacleSpawnTimer;
let baseObstacleSpawnRate = 90; // Spawn a bit faster
let isGameOver;
let animationFrameId;
let worldOffset = 0; // For scrolling background elements like ties

// --- Player (Train) Object ---
class Train {
    constructor() {
        this.width = TRAIN_WIDTH;
        this.height = TRAIN_HEIGHT;
        this.x = TRAIN_START_X;
        this.currentLane = 1;
        this.targetLane = 1;
        this.y = this.calculateY(this.currentLane);
        this.moveSpeed = 9; // Slightly faster lane change
    }

    calculateY(laneIndex) {
        return laneIndex * LANE_HEIGHT + (LANE_HEIGHT / 2) - (this.height / 2);
    }

    changeLane(direction) {
        this.targetLane += direction;
        this.targetLane = Math.max(0, Math.min(NUM_LANES - 1, this.targetLane));
    }

    update() {
        const targetY = this.calculateY(this.targetLane);
        if (Math.abs(this.y - targetY) > this.moveSpeed / 2) {
            if (this.y < targetY) {
                this.y += this.moveSpeed;
            } else if (this.y > targetY) {
                this.y -= this.moveSpeed;
            }
        } else {
            this.y = targetY;
            this.currentLane = this.targetLane;
        }
        this.y = Math.max(0, Math.min(canvas.height - this.height, this.y));
    }

    draw() {
        const bodyHeight = this.height * 0.6;
        const roofHeight = this.height * 0.2;
        const underHeight = this.height * 0.2;
        const windowWidth = this.width * 0.25;
        const windowHeight = bodyHeight * 0.5;

        // Undercarriage
        ctx.fillStyle = TRAIN_UNDER_COLOR;
        ctx.fillRect(this.x, this.y + bodyHeight + roofHeight, this.width, underHeight);

        // Main Body with Gradient
        const bodyGradient = ctx.createLinearGradient(this.x, this.y + roofHeight, this.x, this.y + roofHeight + bodyHeight);
        bodyGradient.addColorStop(0, TRAIN_BODY_COLOR);
        bodyGradient.addColorStop(1, '#8B0000'); // Darker Red at bottom
        ctx.fillStyle = bodyGradient;
        ctx.fillRect(this.x, this.y + roofHeight, this.width, bodyHeight);

        // Roof
        ctx.fillStyle = TRAIN_ROOF_COLOR;
        ctx.fillRect(this.x, this.y, this.width, roofHeight);

        // Window
        ctx.fillStyle = TRAIN_WINDOW_COLOR;
        ctx.fillRect(this.x + this.width * 0.6, this.y + roofHeight + bodyHeight * 0.15, windowWidth, windowHeight);
        // Window Frame
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x + this.width * 0.6, this.y + roofHeight + bodyHeight * 0.15, windowWidth, windowHeight);


        // Headlight
        ctx.fillStyle = '#FFFFE0'; // Light Yellow
        ctx.beginPath();
        ctx.arc(this.x + this.width - 6, this.y + this.height / 2, 4, 0, Math.PI * 2);
        ctx.fill();
        // Subtle glow
        ctx.fillStyle = 'rgba(255, 255, 224, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x + this.width - 6, this.y + this.height / 2, 7, 0, Math.PI * 2);
        ctx.fill();

        // Simple coupling shape at front
        ctx.fillStyle = TRAIN_UNDER_COLOR;
        ctx.fillRect(this.x + this.width, this.y + this.height * 0.6, 5, this.height * 0.3);
    }
}

// --- Obstacle Object (Rocks) ---
class Obstacle {
    constructor(laneIndex) {
        // Randomize size slightly
        this.width = OBSTACLE_MIN_WIDTH + Math.random() * (OBSTACLE_MAX_WIDTH - OBSTACLE_MIN_WIDTH);
        this.height = OBSTACLE_MIN_HEIGHT + Math.random() * (OBSTACLE_MAX_HEIGHT - OBSTACLE_MIN_HEIGHT);
        this.x = canvas.width;
        this.laneIndex = laneIndex;
        // Center the rock vertically in the lane
        this.y = laneIndex * LANE_HEIGHT + (LANE_HEIGHT / 2) - (this.height / 2);
        // Pick a random shade of grey
        this.color = OBSTACLE_COLOR_ROCK[Math.floor(Math.random() * OBSTACLE_COLOR_ROCK.length)];
        this.darkerColor = shadeColor(this.color, -30); // Function to calculate darker shade
    }

    update() {
        this.x -= gameSpeed;
    }

    draw() {
        // Draw rock with simple gradient for depth
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, this.darkerColor);

        ctx.fillStyle = gradient;
        // Slightly irregular top/bottom for 'rock' feel - draw simple polygon
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height * 0.1); // Top leftish
        ctx.lineTo(this.x + this.width * 0.9, this.y); // Top rightish
        ctx.lineTo(this.x + this.width, this.y + this.height * 0.9); // Bottom rightish
        ctx.lineTo(this.x + this.width * 0.1 , this.y + this.height); // Bottom leftish
        ctx.closePath();
        ctx.fill();

        // Add a subtle dark outline
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

// --- Utility function to darken a hex color ---
function shadeColor(color, percent) {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;

    R = (R > 0) ? R : 0;
    G = (G > 0) ? G : 0;
    B = (B > 0) ? B : 0;


    const RR = ((R.toString(16).length == 1) ? "0" + R.toString(16) : R.toString(16));
    const GG = ((G.toString(16).length == 1) ? "0" + G.toString(16) : G.toString(16));
    const BB = ((B.toString(16).length == 1) ? "0" + B.toString(16) : B.toString(16));

    return "#" + RR + GG + BB;
}


// --- Game Functions ---

function initGame() {
    train = new Train();
    obstacles = [];
    score = 0;
    gameSpeed = 4; // Start a little slower maybe
    obstacleSpawnTimer = baseObstacleSpawnRate;
    isGameOver = false;
    worldOffset = 0; // Reset scroll offset

    scoreEl.textContent = `Score: 0`;
    gameOverEl.classList.add('hidden');
    instructionsEl.classList.remove('hidden');

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null; // Ensure it's reset
    }
    drawInitialState();
}

function drawInitialState() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    train.draw();
}

function spawnObstacle() {
    obstacleSpawnTimer--;
    if (obstacleSpawnTimer <= 0) {
        const laneIndex = Math.floor(Math.random() * NUM_LANES);

        // Avoid spawning multiple obstacles too close in the same lane (basic check)
        let canSpawn = true;
        for (const obs of obstacles) {
            if (obs.laneIndex === laneIndex && obs.x > canvas.width - obs.width * 3) {
                canSpawn = false;
                break;
            }
        }

        if (canSpawn) {
            obstacles.push(new Obstacle(laneIndex));
        }

        // Slightly randomize next spawn time
        const spawnRateDecrease = Math.floor(score / 150);
        const randomFactor = (Math.random() - 0.5) * 20; // +/- 10 frames
        obstacleSpawnTimer = Math.max(25, baseObstacleSpawnRate - spawnRateDecrease + randomFactor);
    }
}

function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].update();
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            score += 10;
        }
    }
}

function drawObstacles() {
    obstacles.forEach(obstacle => obstacle.draw());
}

function drawBackground() {
    // Sky Gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.6); // Gradient covers top 60%
    skyGradient.addColorStop(0, SKY_COLOR_TOP);
    skyGradient.addColorStop(1, SKY_COLOR_BOTTOM);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill whole canvas first

    // Ground Gradient
    const groundGradient = ctx.createLinearGradient(0, canvas.height * 0.0, 0, canvas.height); // Subtle gradient for ground
    groundGradient.addColorStop(0, GROUND_COLOR_FAR); // Lighter at horizon
    groundGradient.addColorStop(1, GROUND_COLOR_NEAR); // Darker near bottom
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill ground area


    // Draw Tracks (Rails and Ties)
    const railWidth = 4;
    const railSpacing = TRAIN_HEIGHT * 0.5; // Space between rails of a single track
    const tieWidth = 15;
    const tieHeight = 6;
    const tieSpacing = 40; // Horizontal distance between ties

    ctx.fillStyle = TRACK_TIE_COLOR;
    ctx.strokeStyle = TRACK_RAIL_COLOR;
    ctx.lineWidth = railWidth;

    for (let i = 0; i < NUM_LANES; i++) {
        const laneCenterY = i * LANE_HEIGHT + (LANE_HEIGHT / 2);
        const railTopY = laneCenterY - railSpacing / 2;
        const railBottomY = laneCenterY + railSpacing / 2;

        // Draw Ties - looping and scrolling
        // Calculate the starting position based on the offset, ensuring it wraps
        let startX = worldOffset % tieSpacing;
        if (startX > 0) startX -= tieSpacing; // Ensure we start drawing ties from off-screen left

        for (let x = startX; x < canvas.width; x += tieSpacing) {
            // Draw tie centered horizontally under the rails
            ctx.fillRect(x - tieWidth / 2, laneCenterY - tieHeight / 2, tieWidth, tieHeight);
        }

         // Draw Rails (draw on top of ties)
        // Top Rail
        ctx.beginPath();
        ctx.moveTo(0, railTopY);
        ctx.lineTo(canvas.width, railTopY);
        ctx.stroke();

        // Bottom Rail
        ctx.beginPath();
        ctx.moveTo(0, railBottomY);
        ctx.lineTo(canvas.width, railBottomY);
        ctx.stroke();
    }
}


function checkCollisions() {
    const trainHitbox = { // Slightly smaller hitbox for leniency
        x: train.x + 5,
        y: train.y + 5,
        width: train.width - 10,
        height: train.height - 10
    };

    for (const obstacle of obstacles) {
        if (
            trainHitbox.x < obstacle.x + obstacle.width &&
            trainHitbox.x + trainHitbox.width > obstacle.x &&
            trainHitbox.y < obstacle.y + obstacle.height &&
            trainHitbox.y + trainHitbox.height > obstacle.y
        ) {
            endGame();
            return;
        }
    }
}

function updateScore() {
    scoreEl.textContent = `Score: ${score}`;
}

function increaseDifficulty() {
    // Increase game speed more gradually
    gameSpeed += 0.0015;
    // Spawn rate decreases automatically based on score in spawnObstacle()
}

function endGame() {
    isGameOver = true;
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null; // Important! Reset the ID
    gameOverEl.classList.remove('hidden');
    instructionsEl.classList.add('hidden');
}

// --- Game Loop ---
function gameLoop() {
    if (isGameOver) return;

    // Update world offset for scrolling background elements
    worldOffset -= gameSpeed;
    // Optional: Reset worldOffset periodically to prevent it becoming a huge negative number
    // Although JavaScript numbers handle large values, resetting can be conceptually cleaner
    // if (worldOffset < -10000) worldOffset = worldOffset % tieSpacing; // Reset based on tie spacing

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    train.update();
    spawnObstacle();
    updateObstacles();
    increaseDifficulty();
    train.draw();
    drawObstacles();
    checkCollisions();
    updateScore();

    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Input Handling ---
function handleInput(e) {
    if (isGameOver) {
        if (e.key === 'Enter') {
            initGame(); // Re-initialize, will draw initial state but not start loop
        }
        return;
    }

    // Start game on first relevant key press or Enter
    // Check if animationFrameId is null to know if the loop is running
    if (!animationFrameId && (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key.toLowerCase() === 'w' || e.key.toLowerCase() === 's')) {
        if (!isGameOver) {
            instructionsEl.classList.add('hidden');
            // Make sure animationFrameId is null before starting
            if (!animationFrameId) {
                 animationFrameId = requestAnimationFrame(gameLoop); // Start the loop
            }
            // Handle the first move immediately if it wasn't Enter
            if (e.key !== 'Enter') {
                handleGameInput(e.key);
            }
        }
    } else if (animationFrameId) { // Only handle game input if loop is running
        handleGameInput(e.key);
    }
}

function handleGameInput(key) {
     switch (key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            train.changeLane(-1); // Move up
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            train.changeLane(1); // Move down
            break;
    }
}

// --- Event Listener ---
window.addEventListener('keydown', handleInput);

// --- Initial Setup ---
initGame(); // Set up initial variables and draw the start screen