export enum CellType {
  EMPTY = 0,
  WALL = 1,
  WATER = 2,
  DOOR_CLOSED = 3,
  DOOR_OPEN = 4, // Visual distinction? Or just treat as empty for physics?
  // If I make it specific, I can draw it differently.
  // But for physics, if it's open, water passes.
  // Let's use logic: physics treats DOOR_OPEN same as EMPTY.
}

export class WaterMazeSim {
  width: number;
  height: number;
  cols: number;
  rows: number;
  grid: Int8Array;
  updated: Uint8Array;
  cellSize: number = 4; // Use smaller cells for higher resolution fluid

  levelIndex: number = 0;
  isGameOver: boolean = false;
  bucketFillCount: number = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cols = Math.ceil(width / this.cellSize);
    this.rows = Math.ceil(height / this.cellSize);
    this.grid = new Int8Array(this.cols * this.rows).fill(CellType.EMPTY);
    this.updated = new Uint8Array(this.cols * this.rows).fill(0);

    this.loadLevel(0);
  }

  loadLevel(index: number) {
    this.levelIndex = index;
    this.grid.fill(CellType.EMPTY);
    this.isGameOver = false;
    this.bucketFillCount = 0;

    const cx = this.cols;
    const cy = this.rows;

    const fillRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      type: number
    ) => {
      for (let j = y; j < y + h; j++) {
        for (let i = x; i < x + w; i++) {
          if (i >= 0 && i < cx && j >= 0 && j < cy) {
            this.grid[j * cx + i] = type;
          }
        }
      }
    };

    // Border
    fillRect(0, 0, cx, 2, CellType.WALL); // Top
    fillRect(0, cy - 2, cx, 2, CellType.WALL); // Bottom
    fillRect(0, 0, 2, cy, CellType.WALL); // Left
    fillRect(cx - 2, 0, 2, cy, CellType.WALL); // Right

    if (index === 0) {
      // LEVEL 1: Simple Drop
      // Water at top
      fillRect(cx / 2, 20, 20, 20, CellType.WATER);

      fillRect(0, cy / 2, cx, 2, CellType.WALL);
      // Hole in funnel (Door)
      fillRect(cx / 2, cy / 2, 10, 2, CellType.DOOR_CLOSED);
      // Funnel
      fillRect(0, cy / 2, cx, 2, CellType.WALL);
      // Hole in funnel (Door)
      fillRect(cx / 2, cy / 2, 10, 2, CellType.DOOR_CLOSED);

      // Bucket at bottom
      // Walls for bucket
      fillRect(cx / 2 - 25, cy - 20, 2, 18, CellType.WALL); // Left side
      fillRect(cx / 2 + 23, cy - 20, 2, 18, CellType.WALL); // Right side
    } else if (index === 1) {
      // LEVEL 2: Two paths
      // Water at top
      fillRect(0, 0, 20, 20, CellType.WATER);

      // Funnel
      fillRect(0, cy / 2, cx, 2, CellType.WALL);
      fillRect(0, cy / 5, cx, 2, CellType.WALL);
      fillRect(cx / 6, cy / 5, 10, 2, CellType.DOOR_CLOSED);
      // Hole in funnel (Door)
      fillRect(cx / 2, cy / 2, 10, 2, CellType.DOOR_CLOSED);

      // Bucket at bottom
      // Walls for bucket
      fillRect(cx / 2 - 25, cy - 20, 2, 18, CellType.WALL); // Left side
      fillRect(cx / 2 + 23, cy - 20, 2, 18, CellType.WALL); // Right side
    } else if (index === 2) {
      // LEVEL 3: Zig Zag
      fillRect(10, 5, 20, 20, CellType.WATER);
      fillRect(80, 30, 2, 20, CellType.WALL);

      // Shelf 1
      fillRect(0, cy / 4, cx, 2, CellType.WALL);
      fillRect(30, cy / 4, 10, 2, CellType.DOOR_CLOSED);
      fillRect(cx - 30, cy / 4, 10, 2, CellType.DOOR_CLOSED);

      // Shelf 2
      fillRect(0, cy / 2, cx, 2, CellType.WALL);
      fillRect(20, cy / 2, 10, 2, CellType.DOOR_CLOSED);

      // Bucket bottom left
      fillRect(10, cy - 20, 2, 18, CellType.WALL);
      fillRect(40, cy - 20, 2, 18, CellType.WALL);
    } else if (index === 3) {
      // LEVEL 4: The Reservoir
      fillRect(0, 5, cx, 20, CellType.WATER); // Huge water

      // Floor with 3 doors
      fillRect(0, cy / 3, cx, 2, CellType.WALL);
      fillRect(cx / 4 - 5, cy / 3, 10, 2, CellType.DOOR_CLOSED);
      fillRect(cx / 2 - 5, cy / 3, 10, 2, CellType.DOOR_CLOSED);
      fillRect((3 * cx) / 4 - 5, cy / 3, 10, 2, CellType.DOOR_CLOSED);

      // Second floor filtering
      fillRect(0, (2 * cy) / 3, cx, 2, CellType.WALL);
      fillRect(cx / 2 - 5, (2 * cy) / 3, 10, 2, CellType.DOOR_CLOSED);

      // Bucket
      fillRect(cx / 2 - 20, cy - 20, 2, 18, CellType.WALL);
      fillRect(cx / 2 + 20, cy - 20, 2, 18, CellType.WALL);
    }
  }

  update() {
    this.updated.fill(0);
    this.bucketFillCount = 0;

    let targetZone = { x: 0, y: 0, w: this.cols, h: this.rows };
    // Define bucket zones based on level (simplified: bottom area)
    if (this.levelIndex === 0)
      targetZone = { x: this.cols / 2 - 25, y: this.rows - 20, w: 50, h: 20 };

    // FIX: Match the visual bucket position (Center) instead of the old position (Right)
    if (this.levelIndex === 1)
      targetZone = {
        x: this.cols / 2 - 25,
        y: this.rows - 20,
        w: 50,
        h: 20,
      };

    if (this.levelIndex === 2)
      targetZone = { x: 10, y: this.rows - 20, w: 30, h: 20 };
    if (this.levelIndex === 3)
      targetZone = { x: this.cols / 2 - 20, y: this.rows - 20, w: 40, h: 20 };

    for (let y = this.rows - 1; y >= 0; y--) {
      // Pick random direction for processing symmetry
      const ltr = Math.random() > 0.5;
      const startX = ltr ? 0 : this.cols - 1;
      const endX = ltr ? this.cols : -1;
      const stepX = ltr ? 1 : -1;

      for (let x = startX; x !== endX; x += stepX) {
        const idx = y * this.cols + x;

        // Count bucket
        if (this.grid[idx] === CellType.WATER) {
          if (
            x >= targetZone.x &&
            x < targetZone.x + targetZone.w &&
            y >= targetZone.y &&
            y < targetZone.y + targetZone.h
          ) {
            this.bucketFillCount++;
          }
        }

        if (this.updated[idx]) continue;

        if (this.grid[idx] === CellType.WATER) {
          this.updateWater(x, y, idx);
        }
      }
    }

    // Win condition - rough estimate of full bucket
    if (this.bucketFillCount > 200) {
      // arbitrary threshold
      this.isGameOver = true;
    }
  }

  updateWater(x: number, y: number, idx: number) {
    if (y >= this.rows - 1) return; // Bottom

    const belowIdx = idx + this.cols;
    const below = this.grid[belowIdx];

    // 1. Fall down
    if (below === CellType.EMPTY || below === CellType.DOOR_OPEN) {
      this.move(idx, belowIdx);
      return;
    }

    // 2. Fall diagonal
    const belowLeftIdx = belowIdx - 1;
    const belowRightIdx = belowIdx + 1;

    let canLeft =
      x > 0 &&
      (this.grid[belowLeftIdx] === CellType.EMPTY ||
        this.grid[belowLeftIdx] === CellType.DOOR_OPEN);
    let canRight =
      x < this.cols - 1 &&
      (this.grid[belowRightIdx] === CellType.EMPTY ||
        this.grid[belowRightIdx] === CellType.DOOR_OPEN);

    if (canLeft && canRight) {
      // Randomly choose
      if (Math.random() < 0.5) {
        this.move(idx, belowLeftIdx);
      } else {
        this.move(idx, belowRightIdx);
      }
    } else if (canLeft) {
      this.move(idx, belowLeftIdx);
    } else if (canRight) {
      this.move(idx, belowRightIdx);
    } else {
      // 3. Slide sideways (Liquidity)
      const flowRate = 5;
      let moveL = -1;
      let moveR = -1;

      // Check Left
      for (let i = 1; i <= flowRate; i++) {
        if (x - i < 0) break;
        const t = this.grid[idx - i];
        if (t !== CellType.EMPTY && t !== CellType.DOOR_OPEN) break;
        moveL = idx - i;
      }

      // Check Right
      for (let i = 1; i <= flowRate; i++) {
        if (x + i >= this.cols) break;
        const t = this.grid[idx + i];
        if (t !== CellType.EMPTY && t !== CellType.DOOR_OPEN) break;
        moveR = idx + i;
      }

      if (moveL !== -1 && moveR !== -1) {
        this.move(idx, Math.random() < 0.5 ? moveL : moveR);
      } else if (moveL !== -1) {
        this.move(idx, moveL);
      } else if (moveR !== -1) {
        this.move(idx, moveR);
      }
    }
  }

  move(from: number, to: number) {
    this.grid[to] = this.grid[from];
    this.grid[from] = CellType.EMPTY;
    this.updated[to] = 1;
  }

  // Interaction
  toggleDoor(worldX: number, worldY: number) {
    const cx = Math.floor(worldX / this.cellSize);
    const cy = Math.floor(worldY / this.cellSize);
    const r = 2; // radius of click

    // We only want to open doors, not break walls
    for (let j = cy - r; j <= cy + r; j++) {
      for (let i = cx - r; i <= cx + r; i++) {
        if (i >= 0 && i < this.cols && j >= 0 && j < this.rows) {
          const idx = j * this.cols + i;
          if (this.grid[idx] === CellType.DOOR_CLOSED) {
            this.grid[idx] = CellType.DOOR_OPEN;
            // Play sound or effect?
          }
        }
      }
    }
  }
}
