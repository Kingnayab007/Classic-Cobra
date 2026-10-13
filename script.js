// Grab the <canvas id="game"> element and its 2D drawing context once.
const canvas = document.getElementById("game"),
    ctx = canvas.getContext("2d");
const W = 1080, // board width  in px
    H = 720, // board height in px
    CELL = 10, // size of one grid cell in px
    GAP = 90, // width of the centre opening (portal) in each wall
    CX = W / 2, // horizontal centre of the board
    CY = H / 2; // vertical centre of the board

// Moves per second, per difficulty.
const SPEED = { Easy: 10, Medium: 20, Hard: 35 };

const C = {
    bg: "#181818", // play field background
    grid: "#010202", // faint dot grid on the menu screen
    panel: "#1c212b", // button fill
    hover: "#2a313d", // button fill on hover / when selected
    edge: "#3c4451", // button outline (unselected)
    accent: "#f3aaaa", // amber: snake head, portals, selected state
    snake: "#fe9c9c", // darker amber: snake body segments
    steel: "#525c6b", // walls / inactive outlines
    food: "#ff4d3d", // food only — high urgency colour
    cream: "#e9e7e3", // primary text
    muted: "#7d8794", // secondary text
};

const F = {
    title: "bold 48px Consolas,monospace",
    normal: "22px Consolas,monospace",
    small: "16px Consolas,monospace",
};

// Factory for a button descriptor.
const btn = (x, y, w, h, label, action) => ({ x, y, w, h, label, action });

// All button rectangles, laid out relative to the board centre.
const B = {
    easy: btn(CX - 245, 235, 150, 48, "EASY", "easy"),
    medium: btn(CX - 75, 235, 150, 48, "MEDIUM", "medium"),
    hard: btn(CX + 95, 235, 150, 48, "HARD", "hard"),
    start: btn(CX - 115, 310, 230, 48, "START GAME", "start"),
    resume: btn(CX - 115, 270, 230, 48, "RESUME", "resume"),
    restart: btn(CX - 115, 335, 230, 48, "RESTART", "restart"),
    menu: btn(CX - 115, 400, 230, 48, "MAIN MENU", "menu"),
    quit: btn(CX - 115, 465, 230, 48, "QUIT", "quit"),
};

let state = "menu", // menu | playing | paused | gameover | won
    mode = "Medium", // selected difficulty
    snake = [], // [[x,y], ...] — head first, tail last
    direction = "RIGHT", // direction actually used by the last step
    nextDirection = "RIGHT", // direction queued by the player for the next step
    food = null, // [x, y] or null when the board is full (win)
    score = 0, // food eaten
    acc = 0, // leftover time in the fixed-timestep accumulator
    last = 0; // timestamp of the previous animation frame

// Latest pointer position in *canvas CSS pixels*; scaled to board space
const mouse = { x: 0, y: 0 };

// Pixel delta for each direction, sized to one cell.
const moves = {
    UP: [0, -CELL],
    DOWN: [0, CELL],
    LEFT: [-CELL, 0],
    RIGHT: [CELL, 0],
};

//    IMPORTANT: food is only ever spawned in the *interior* of the board, one
//    cell in from every wall.

function createFood() {
    // Fast lookup of every cell the snake currently covers.
    const occupied = new Set(snake.map(([x, y]) => `${x},${y}`));
    const free = [];

    // Walk the interior grid only — skip the border ring (see note above).
    for (let x = CELL; x <= W - 2 * CELL; x += CELL) {
        for (let y = CELL; y <= H - 2 * CELL; y += CELL) {
            // Skip cells the snake is sitting on.
            if (!occupied.has(`${x},${y}`)) free.push([x, y]);
        }
    }
    // No interior cell left to fill -> the player has cleared the board.
    if (free.length === 0) return null;
    // Uniformly random free cell.
    return free[Math.floor(Math.random() * free.length)];
}

// Reset to a fresh 3-segment snake, centred, pointing right.
function newGame() {
    const x = W / 2 - 100,
        y = H / 2;
    snake = [
        [x, y], // head
        [x - CELL, y], // body
        [x - 2 * CELL, y], // tail
    ];
    direction = nextDirection = "RIGHT";
    score = 0;
    food = createFood();
    acc = 0;
}
// Reset and immediately enter the "playing" state.
function startGame() {
    newGame();
    state = "playing";
}


function teleport(p) {
    const [x, y] = p,
        half = GAP / 2;
    // Does this cell horizontally fit through the top/bottom opening?
    const gapX = x >= CX - half && x + CELL <= CX + half;
    // Does this cell vertically fit through the left/right opening?
    const gapY = y >= CY - half && y + CELL <= CY + half;
    // Off the top -> drop through the top portal to the bottom.
    if (y < 0) {
        if (gapX) {
            p[1] = H - CELL;
            return true;
        }
        return false;
    }
    // Off the bottom -> reappear at the top.
    if (y >= H) {
        if (gapX) {
            p[1] = 0;
            return true;
        }
        return false;
    }
    // Off the left -> reappear on the right.
    if (x < 0) {
        if (gapY) {
            p[0] = W - CELL;
            return true;
        }
        return false;
    }
    // Off the right -> reappear on the left.
    if (x >= W) {
        if (gapY) {
            p[0] = 0;
            return true;
        }
        return false;
    }
    // Stayed on the board.
    return true;
}
function update() {
    // Safety net: if food somehow went missing (e.g. the board was restored
    // from a paused state), try to place it again rather than leaving the
    // player with nothing to chase.
    if (food === null) {
        food = createFood();
        if (food === null) {
            state = "won";
            return;
        }
    }
    // Commit the direction the player queued during the previous frame.
    direction = nextDirection;
    // Project the next head position one cell ahead.
    const d = moves[direction],
        head = [snake[0][0] + d[0], snake[0][1] + d[1]];
    // Portal wrap or wall death.
    if (!teleport(head)) {
        state = "gameover";
        return;
    }
    // Did the head land on the food?
    const ate = food !== null && head[0] === food[0] && head[1] === food[1];
    // Self-collision. When the snake grows the tail stays put this step, so
    // the whole body counts; otherwise the tail cell is about to be vacated
    // and must be ignored.
    const checking = ate ? snake : snake.slice(0, -1);
    if (checking.some((s) => s[0] === head[0] && s[1] === head[1])) {
        state = "gameover";
        return;
    }
    // Move: new head goes in front.
    snake.unshift(head);
    if (ate) {
        score++;
        food = createFood();
        // Board full -> win.
        if (food === null) {
            state = "won";
            return;
        }
    } else {
        // Normal step: drop the tail to keep the length constant.
        snake.pop();
    }
}
// Draw a single line of text centred vertically on (x, y).
function text(str, font, color, x, y, align = "center") {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(str, x, y);
}
// Draw a rounded rectangle, optionally filled and/or stroked.
function roundRect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}
// Render a button with hover highlight and "currently selected" state.
function drawButton(b) {
    // Convert the pointer position from CSS pixels to board space so hover
    // still works when the canvas is scaled down on small screens.
    const r = canvas.getBoundingClientRect(),
        mx = (mouse.x * W) / r.width,
        my = (mouse.y * H) / r.height;
    // Is the cursor inside this button?
    const hover = mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
    // Is this the difficulty button matching the active mode?
    const selected =
        (b.action === "easy" && mode === "Easy") ||
        (b.action === "medium" && mode === "Medium") ||
        (b.action === "hard" && mode === "Hard");
    // Fill: hovered or selected reads brighter. Outline: amber when selected.
    ctx.fillStyle = hover || selected ? C.hover : C.panel;
    ctx.strokeStyle = selected ? C.accent : C.edge;
    ctx.lineWidth = 2;
    roundRect(b.x, b.y, b.w, b.h, 12, true, true);
    text(b.label, F.normal, C.cream, b.x + b.w / 2, b.y + b.h / 2);
}

// Menu backdrop: flat fill plus a faint dot grid for texture.
function background() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.grid;
    for (let x = 25; x < W; x += 55)
        for (let y = 25; y < H; y += 55) {
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
        }
}
function drawWalls() {
    // Gap edges: a/b on the horizontal axis, c/d on the vertical axis.
    const a = CX - GAP / 2,
        b = CX + GAP / 2,
        c = CY - GAP / 2,
        d = CY + GAP / 2;
    ctx.strokeStyle = C.steel;
    ctx.lineWidth = 10;
    ctx.lineCap = "butt";
    ctx.beginPath();

    // Top wall (two segments, gap in the middle).
    ctx.moveTo(0, 0);
    ctx.lineTo(a, 0);
    ctx.moveTo(b, 0);
    ctx.lineTo(W, 0);
    // Bottom wall.
    ctx.moveTo(0, H - 1);
    ctx.lineTo(a, H - 1);
    ctx.moveTo(b, H - 1);
    ctx.lineTo(W, H - 1);
    // Left wall.
    ctx.moveTo(0, 0);
    ctx.lineTo(0, c);
    ctx.moveTo(0, d);
    ctx.lineTo(0, H);
    // Right wall.
    ctx.moveTo(W - 1, 0);
    ctx.lineTo(W - 1, c);
    ctx.moveTo(W - 1, d);
    ctx.lineTo(W - 1, H);
    ctx.stroke();
    // Portal corner markers — amber dots that show where you may cross.
    ctx.fillStyle = C.accent;
    for (const [x, y] of [
        [a, 0],
        [b, 0],
        [a, H - 1],
        [b, H - 1],
        [0, c],
        [0, d],
        [W - 1, c],
        [W - 1, d],
    ]) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

// The in-game playfield: walls, snake, food, and a lightweight HUD.
function drawGame() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    // HUD panel, drawn first and semi-transparent so anything underneath
    // (food or snake passing through) stays readable.
    ctx.fillStyle = "rgba(28,33,43,.72)";
    roundRect(12, 12, 220, 70, 12, true, false);
    text("SCORE  " + score, F.normal, C.cream, 120, 35);
    text("MODE  " + mode.toUpperCase(), F.small, C.accent, 120, 62);
    text(
        "ARROWS / WASD: MOVE     ESC: PAUSE",
        F.small,
        C.muted,
        W - 18,
        25,
        "right",
    );
    drawWalls();
    // Snake body, drawn tail -> head so the head ends up on top.
    for (let i = snake.length - 1; i >= 1; i--) {
        const [x, y] = snake[i];
        // Dark amber base with a lighter inset for a subtle bevel.
        ctx.fillStyle = C.snake;
        roundRect(x, y, CELL, CELL, 3, true, false);
        ctx.fillStyle = C.accent;
        roundRect(x + 2, y + 2, CELL - 4, CELL - 4, 2, true, false);
    }
    // Solid amber head.
    if (snake.length) {
        ctx.fillStyle = C.accent;
        roundRect(snake[0][0], snake[0][1], CELL, CELL, 3, true, false);
    }
    // Food last so it is never occluded. Drawn with a soft outer ring as a
    // low-contrast halo — guarantees it reads clearly on any background.
    if (food !== null) {
        const fx = food[0] + CELL / 2,
            fy = food[1] + CELL / 2;
        // Faint halo (drawn as a low-alpha disc slightly larger than the pellet).
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = C.food;
        ctx.beginPath();
        ctx.arc(fx, fy, CELL * 1.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Solid pellet on top of the halo.
        ctx.fillStyle = C.food;
        ctx.beginPath();
        ctx.arc(fx, fy, CELL / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}
// The main menu / difficulty picker.
function drawMenu() {
    background();
    text("SERPENT", F.title, C.accent, CX, 105);
    text("TELEPORT EDITION", F.small, C.steel, CX, 155);
    text("Choose your difficulty", F.normal, C.cream, CX, 205);
    drawButton(B.easy);
    drawButton(B.medium);
    drawButton(B.hard);
    drawButton(B.start);
    text(
        "Eat the food. Avoid yourself. Master the portals.",
        F.small,
        C.muted,
        CX,
        405,
    );
    text("ARROWS / WASD to move  |  ESC to pause", F.small, C.muted, CX, 440);
    // Palette name strip — matches the new charcoal/steel/amber theme.
    text("CHARCOAL  /  STEEL  /  AMBER", F.small, C.steel, CX, H - 35);
}
// Dim the whole board and print a title + subtitle (pause / game over / win).
function overlay(title, subtitle) {
    ctx.fillStyle = "rgba(9,11,15,.86)";
    ctx.fillRect(0, 0, W, H);
    text(title, F.title, C.cream, CX, 190);
    text(subtitle, F.small, C.muted, CX, 235);
}
// Buttons that appear on top of the pause / gameover / win overlays.
function drawOverlayMenu() {
    if (state === "paused") {
        overlay("PAUSED", "The game is paused");
        drawButton(B.resume);
        drawButton(B.restart);
        drawButton(B.menu);
        drawButton(B.quit);
    } else if (state === "gameover" || state === "won") {
        overlay(
            state === "won" ? "YOU WIN!" : "GAME OVER",
            "Final score: " + score,
        );
        drawButton(B.restart);
        drawButton(B.menu);
        drawButton(B.quit);
    }
}
// Single entry point for drawing — picks the right scene for the current
// state. Called every animation frame.
function render() {
    if (state === "menu") drawMenu();
    else {
        drawGame();
        if (["paused", "gameover", "won"].includes(state)) drawOverlayMenu();
    }
}
// Was the click at (e) inside button `b`? Converts client (viewport) coords
// to board space so hit-testing survives responsive canvas scaling.
function inside(b, e) {
    const r = canvas.getBoundingClientRect(),
        x = ((e.clientX - r.left) * W) / r.width,
        y = ((e.clientY - r.top) * H) / r.height;
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

// Track pointer position for button hover highlighting.
canvas.addEventListener("mousemove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
});

// Route clicks to the correct button set for the current state.
canvas.addEventListener("click", (e) => {
    if (state === "menu") {
        if (inside(B.easy, e)) mode = "Easy";
        else if (inside(B.medium, e)) mode = "Medium";
        else if (inside(B.hard, e)) mode = "Hard";
        else if (inside(B.start, e)) startGame();
        return;
    }
    if (state === "paused") {
        if (inside(B.resume, e)) {
            state = "playing";
            acc = 0;
        } else if (inside(B.restart, e)) startGame();
        else if (inside(B.menu, e) || inside(B.quit, e)) state = "menu";
        return;
    }
    if (state === "gameover" || state === "won") {
        if (inside(B.restart, e)) startGame();
        else if (inside(B.menu, e) || inside(B.quit, e)) state = "menu";
    }
});

// Keyboard input.
document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    // Stop arrow keys / space from scrolling the page.
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k))
        e.preventDefault();
    // Esc is the universal "back / pause" key.
    if (k === "escape") {
        if (state === "playing") state = "paused";
        else if (state === "paused") {
            state = "playing";
            acc = 0;
        } else if (state === "gameover" || state === "won") state = "menu";
        return;
    }
    // R / Enter restarts from the game-over or win screen.
    if (
        (state === "gameover" || state === "won") &&
        (k === "r" || k === "enter")
    ) {
        startGame();
        return;
    }
    // R restarts while paused.
    if (state === "paused") {
        if (k === "r") startGame();
        return;
    }
    // Movement only matters while playing.
    if (state !== "playing") return;
    // Movement: validate against `nextDirection` (not `direction`) so two
    // fast key presses in the same frame (e.g. UP then LEFT) can never queue
    // a 180° reversal that would drive the head straight into the body.
    const turn = (want, opposite) => {
        if (nextDirection !== opposite) nextDirection = want;
    };
    if (k === "arrowup" || k === "w") turn("UP", "DOWN");
    else if (k === "arrowdown" || k === "s") turn("DOWN", "UP");
    else if (k === "arrowleft" || k === "a") turn("LEFT", "RIGHT");
    else if (k === "arrowright" || k === "d") turn("RIGHT", "LEFT");
});

function loop(t) {
    // Seed `last` on the very first frame so delta starts at 0.
    if (!last) last = t;
    const delta = Math.min(t - last, 100); // cap delta to avoid huge catch-up bursts
    last = t;
    if (state === "playing") {
        acc += delta;
        const interval = 1000 / SPEED[mode]; // ms per step at the current speed
        // Step as many times as the accumulated time allows.
        while (acc >= interval && state === "playing") {
            update();
            acc -= interval;
        }
    } else {
        // Not playing -> drain the accumulator so resuming doesn't burst-step.
        acc = 0;
    }
    render();
    requestAnimationFrame(loop);
}
// Kick things off: seed the board, then start the loop.
newGame();
requestAnimationFrame(loop);
