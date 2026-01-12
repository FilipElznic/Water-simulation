export enum GrainType {
  EMPTY = 0,
  SAND = 1,
  WATER = 2,
  STONE = 3,
  WOOD = 4,
  FIRE = 5,
  SMOKE = 6,
  ACID = 7,
}

export class SandSim {
  width: number;
  height: number;
  cols: number;
  rows: number;
  grid: Int8Array;
  // Store extra state like lifetime for fire/smoke
  life: Uint8Array;
  updated: Uint8Array; // Track updates per frame to prevent double-moves
  cellSize: number;

  constructor(width: number, height: number, cellSize: number) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.cols = Math.floor(width / cellSize);
    this.rows = Math.floor(height / cellSize);
    this.grid = new Int8Array(this.cols * this.rows).fill(GrainType.EMPTY);
    this.life = new Uint8Array(this.cols * this.rows).fill(0);
    this.updated = new Uint8Array(this.cols * this.rows).fill(0);
  }

  reset() {
    this.grid.fill(GrainType.EMPTY);
    this.life.fill(0);
    this.updated.fill(0);
  }

  // Draw circle of grains at x,y
  addSand(x: number, y: number, radius: number, type: GrainType) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const r = Math.floor(radius / this.cellSize);

    for (let i = -r; i <= r; i++) {
      for (let j = -r; j <= r; j++) {
        if (i * i + j * j <= r * r) {
          const col = cx + i;
          const row = cy + j;
          if (this.isValid(col, row)) {
            // Only replace if empty or different type (optional rule)
            if (Math.random() > 0.1) {
              this.setCell(col, row, type);
              // Init life
              const idx = col + row * this.cols;
              if (type === GrainType.FIRE)
                this.life[idx] = 100 + Math.random() * 50;
              if (type === GrainType.SMOKE)
                this.life[idx] = 30 + Math.random() * 30;
            }
          }
        }
      }
    }
  }

  isValid(col: number, row: number) {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  getCell(col: number, row: number) {
    if (!this.isValid(col, row)) return GrainType.STONE; // Treat out of bounds as stone
    return this.grid[col + row * this.cols];
  }

  setCell(col: number, row: number, type: GrainType) {
    if (this.isValid(col, row)) {
      const idx = col + row * this.cols;
      this.grid[idx] = type;
      this.updated[idx] = 1;
      if (type === GrainType.FIRE) this.life[idx] = 60 + Math.random() * 40;
      else if (type === GrainType.SMOKE)
        this.life[idx] = 20 + Math.random() * 20;
      else this.life[idx] = 0;
    }
  }

  step() {
    // Iterate based on random direction to avoid left/right bias over frames?
    // Or just randomize checks inside loop.
    // We iterate bottom-up.
    this.updated.fill(0);

    for (let y = this.rows - 1; y >= 0; y--) {
      // Randomize X traversal direction each row or just allow random checks
      const startX = Math.random() < 0.5 ? 0 : this.cols - 1;
      const xDir = startX === 0 ? 1 : -1;

      for (let i = 0; i < this.cols; i++) {
        const x = startX + i * xDir;
        const idx = x + y * this.cols;

        if (this.updated[idx]) continue;

        const type = this.grid[idx];

        if (
          type === GrainType.EMPTY ||
          type === GrainType.STONE ||
          type === GrainType.WOOD
        )
          continue;

        if (type === GrainType.SAND) this.updateSand(x, y);
        else if (type === GrainType.WATER) this.updateWater(x, y);
        else if (type === GrainType.FIRE) this.updateFire(x, y);
        else if (type === GrainType.SMOKE) this.updateSmoke(x, y);
        else if (type === GrainType.ACID) this.updateAcid(x, y);
      }
    }
  }

  // --- Update Logic ---

  updateSand(x: number, y: number) {
    if (y >= this.rows - 1) return;

    const below = this.getCell(x, y + 1);
    if (
      below === GrainType.EMPTY ||
      below === GrainType.WATER ||
      below === GrainType.ACID
    ) {
      this.move(x, y, x, y + 1);
      return;
    }

    // Randomize diagonal fall
    const dir = Math.random() < 0.5 ? -1 : 1;
    const t1 = this.getCell(x + dir, y + 1); // Random side
    const t2 = this.getCell(x - dir, y + 1); // Other side

    // Check first random dir
    if (
      t1 === GrainType.EMPTY ||
      t1 === GrainType.WATER ||
      t1 === GrainType.ACID
    ) {
      this.move(x, y, x + dir, y + 1);
    } else if (
      t2 === GrainType.EMPTY ||
      t2 === GrainType.WATER ||
      t2 === GrainType.ACID
    ) {
      this.move(x, y, x - dir, y + 1);
    }
  }

  updateWater(x: number, y: number) {
    if (y < this.rows - 1) {
      const below = this.getCell(x, y + 1);
      // Fall down through Empty or Acid (Note: Doesn't displace SAND, Sand is heavier)
      if (below === GrainType.EMPTY || below === GrainType.ACID) {
        this.move(x, y, x, y + 1);
        return;
      }

      // Randomize diagonal fall
      const dir = Math.random() < 0.5 ? -1 : 1;
      const t1 = this.getCell(x + dir, y + 1);
      const t2 = this.getCell(x - dir, y + 1);

      if (t1 === GrainType.EMPTY || t1 === GrainType.ACID) {
        this.move(x, y, x + dir, y + 1);
        return;
      } else if (t2 === GrainType.EMPTY || t2 === GrainType.ACID) {
        this.move(x, y, x - dir, y + 1);
        return;
      }
    }

    // Move Sideways
    const dir = Math.random() < 0.5 ? -1 : 1;
    const t1 = this.getCell(x + dir, y);
    const t2 = this.getCell(x - dir, y);

    if (t1 === GrainType.EMPTY || t1 === GrainType.ACID) {
      this.move(x, y, x + dir, y);
    } else if (t2 === GrainType.EMPTY || t2 === GrainType.ACID) {
      this.move(x, y, x - dir, y);
    }
  }

  updateFire(x: number, y: number) {
    // Randomly extinguish
    const idx = x + y * this.cols;
    if (this.life[idx] > 0) this.life[idx]--;
    if (this.life[idx] <= 0) {
      // Turn to smoke sometimes before dying
      this.setCell(x, y, GrainType.EMPTY);
      return;
    }

    // Rise
    if (y > 0) {
      const above = this.getCell(x, y - 1);
      if (above === GrainType.EMPTY) {
        this.move(x, y, x, y - 1);
      } else if (Math.random() < 0.5) {
        // Diag up
        const dir = Math.random() < 0.5 ? -1 : 1;
        if (this.getCell(x + dir, y - 1) === GrainType.EMPTY) {
          this.move(x, y, x + dir, y - 1);
        }
      }
    }

    // Interact with neighbors (Burn Wood, Evaporate Water)
    for (let nx = x - 1; nx <= x + 1; nx++) {
      for (let ny = y - 1; ny <= y + 1; ny++) {
        if (nx === x && ny === y) continue;
        const neighbor = this.getCell(nx, ny);

        if (neighbor === GrainType.WOOD) {
          if (Math.random() < 0.05) this.setCell(nx, ny, GrainType.FIRE);
        } else if (neighbor === GrainType.WATER) {
          this.setCell(nx, ny, GrainType.EMPTY); // Steam removed
          this.setCell(x, y, GrainType.EMPTY); // Fire extinguished
        }
      }
    }
  }

  updateSmoke(x: number, y: number) {
    const idx = x + y * this.cols;
    if (this.life[idx] > 0) this.life[idx]--;
    if (this.life[idx] <= 0) {
      this.setCell(x, y, GrainType.EMPTY);
      return;
    }

    // Rise with turbulence
    if (y > 0) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      // Check Up then Up-Diag
      if (this.getCell(x, y - 1) === GrainType.EMPTY) {
        this.move(x, y, x, y - 1);
      } else if (this.getCell(x + dir, y - 1) === GrainType.EMPTY) {
        this.move(x, y, x + dir, y - 1);
      } else if (this.getCell(x - dir, y - 1) === GrainType.EMPTY) {
        this.move(x, y, x - dir, y - 1);
      } else if (this.getCell(x + dir, y) === GrainType.EMPTY) {
        this.move(x, y, x + dir, y); // Drift side
      }
    }
  }

  updateAcid(x: number, y: number) {
    if (y < this.rows - 1) {
      const below = this.getCell(x, y + 1);
      if (below === GrainType.EMPTY) {
        this.move(x, y, x, y + 1);
        return;
      } else if (
        below !== GrainType.ACID &&
        below !== GrainType.STONE &&
        below !== GrainType.EMPTY
      ) {
        // Dissolve below (except stone)
        if (Math.random() < 0.1) {
          this.setCell(x, y, GrainType.EMPTY);
          this.setCell(x, y + 1, GrainType.SMOKE);
          return;
        }
      }
    }

    // Move Sideways like loose liquid
    const dir = Math.random() < 0.5 ? -1 : 1;
    const t1 = this.getCell(x + dir, y);
    if (t1 === GrainType.EMPTY) {
      this.move(x, y, x + dir, y);
    } else if (
      t1 !== GrainType.ACID &&
      t1 !== GrainType.STONE &&
      t1 !== GrainType.EMPTY &&
      Math.random() < 0.05
    ) {
      this.setCell(x, y, GrainType.EMPTY);
      this.setCell(x + dir, y, GrainType.SMOKE);
    }
  }

  move(x1: number, y1: number, x2: number, y2: number) {
    const idx1 = x1 + y1 * this.cols;
    const idx2 = x2 + y2 * this.cols;

    const t1 = this.grid[idx1];
    const t2 = this.grid[idx2];
    const l1 = this.life[idx1];
    const l2 = this.life[idx2];

    // Swap type and life

    this.updated[idx1] = 1;
    this.updated[idx2] = 1;
    this.grid[idx2] = t1;
    this.grid[idx1] = t2;
    this.life[idx2] = l1;
    this.life[idx1] = l2;
  }
}
