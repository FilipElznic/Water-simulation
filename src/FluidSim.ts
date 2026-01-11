// src/FluidSim.ts

export const CellType = {
  FLUID: 0,
  AIR: 1,
  SOLID: 2,
} as const;

export class Particle {
  x: number;
  y: number;
  u: number;
  v: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.u = 0;
    this.v = 0;
  }
}

export class FluidSim {
  // Simulation parameters
  density: number;
  // Gravity: 2500 is good for pixel-scale (energetic splash)
  gravity: number = 2500;

  // CRITICAL FIX: This was missing, breaking the solver!
  overRelaxation: number = 1.9;

  fNumX: number;
  fNumY: number;
  h: number; // Cell size

  // Arrays
  u: Float32Array;
  v: Float32Array;
  du: Float32Array;
  dv: Float32Array;
  uNew: Float32Array;
  vNew: Float32Array;
  uWeight: Float32Array;
  vWeight: Float32Array;
  pDensity: Float32Array;
  cellType: Int8Array;

  particles: Particle[] = [];

  // Wave generator
  totalTime: number = 0;

  constructor(width: number, height: number, spacing: number) {
    this.h = spacing;
    // Add small padding to grid to avoid edge cases
    this.fNumX = Math.floor(width / spacing) + 1;
    this.fNumY = Math.floor(height / spacing) + 1;
    this.density = 1000;

    const uSize = (this.fNumX + 1) * this.fNumY;
    const vSize = this.fNumX * (this.fNumY + 1);
    const cellSize = this.fNumX * this.fNumY;

    this.u = new Float32Array(uSize);
    this.v = new Float32Array(vSize);
    this.du = new Float32Array(uSize);
    this.dv = new Float32Array(vSize);
    this.uNew = new Float32Array(uSize);
    this.vNew = new Float32Array(vSize);
    this.uWeight = new Float32Array(uSize);
    this.vWeight = new Float32Array(vSize);
    this.pDensity = new Float32Array(cellSize);
    this.cellType = new Int8Array(cellSize);

    this.initGrid();
    this.initParticles();
  }

  reset() {
    this.u.fill(0);
    this.v.fill(0);
    this.uWeight.fill(0);
    this.vWeight.fill(0);
    this.uNew.fill(0);
    this.vNew.fill(0);
    this.du.fill(0);
    this.dv.fill(0);
    this.pDensity.fill(0);
    // cellType doesn't need reset as walls don't move
    this.initParticles();
  }

  initGrid() {
    for (let i = 0; i < this.fNumX; i++) {
      for (let j = 0; j < this.fNumY; j++) {
        let type = CellType.AIR;
        // Create a wall ring around the domain
        if (
          i === 0 ||
          i === this.fNumX - 1 ||
          j === 0 ||
          j === this.fNumY - 1
        ) {
          type = CellType.SOLID;
        }
        this.cellType[i + j * this.fNumX] = type;
      }
    }
  }

  initParticles() {
    this.particles = [];

    // NEW: Initialize as a hydrostatic block at the bottom
    // Full width (minus padding)
    const startX = this.h * 2;
    const width = (this.fNumX - 4) * this.h;

    // Fill bottom 40% of the container
    const fillPercent = 0.4;
    const height = (this.fNumY - 2) * this.h * fillPercent;

    const maxH = (this.fNumY - 1) * this.h;
    const startY = maxH - height;

    // Fix drift: More uniform density (2x2 per cell = 0.5h spacing)
    // Reduce particle count to ~1/3 (0.55 -> 0.85) to improve performance
    const particleSpacing = this.h * 0.85;

    for (let x = startX; x < startX + width; x += particleSpacing) {
      for (let y = startY; y < maxH; y += particleSpacing) {
        // Add random jitter to prevent stacking artifacts/grid alignment bias
        const jitter = (Math.random() - 0.5) * (this.h * 0.1);
        this.particles.push(new Particle(x + jitter, y + jitter));
      }
    }
  }

  // --- Helpers for grid access ---
  getUIndex(i: number, j: number): number {
    return i + j * (this.fNumX + 1);
  }
  getVIndex(i: number, j: number): number {
    return i + j * this.fNumX;
  }
  getCellIndex(i: number, j: number): number {
    return i + j * this.fNumX;
  }

  integrate(dt: number) {
    // 1. Advect (Gravity + Move + Separation + Wall Clamp)
    this.totalTime += dt;
    this.advectParticles(dt);

    // 2. Transfer Particles -> Grid
    this.transferParticlesToGrid();
    this.calculateParticleDensity();

    // Wave Generator: Force velocity at the left boundary (Piston)
    // Applies a sine wave to the u-velocity components near the left wall.
    // Limit height to bottom half to simulate a paddle.
    const waveAmp = 400.0; // Stronger push
    const waveFreq = 1.0; // Lower frequency = Longer waves that travel further
    const paddleHeight = this.fNumY * 0.7; // Slightly deeper paddle

    const uForce = waveAmp * Math.sin(this.totalTime * waveFreq);

    // Apply near i=1 (left boundary fluid)
    for (let j = 1; j < paddleHeight; j++) {
      // index for u at (1, j) which is the left-most fluid face
      // (0, j) is the solid wall face
      const idx = 1 + j * (this.fNumX + 1);
      this.u[idx] = uForce;

      // Ensure the wall condition doesn't override this immediately in solve?
      // The solver respects current velocities as starting guess, but we need to enforce potential boundary?
      // Actually, just setting it here provides the 'divergence' source for the solver.
    }

    // 3. Save old grid for FLIP difference
    this.du.set(this.u);
    this.dv.set(this.v);

    // 4. Solve Pressure (The Physics)
    this.solveIncompressibility();

    // 5. Update Particles (95% FLIP / 5% PIC)
    this.transferGridToParticles(0.95);
  }

  advectParticles(dt: number) {
    const width = this.fNumX * this.h;
    const height = this.fNumY * this.h;

    // Using a slightly smaller domain for particles to avoid grid index errors
    const buffer = this.h * 1.1;

    // 1. Apply Forces & Integration
    for (const p of this.particles) {
      p.v += this.gravity * dt;
      p.x += p.u * dt;
      p.y += p.v * dt;
    }

    // 2. Push Particles Apart (Separation)
    // Run BEFORE clamping so we don't push them into walls
    this.separateParticles();

    // 3. Wall Collisions (Clamp)
    for (const p of this.particles) {
      // Left Wall
      if (p.x < buffer) {
        p.x = buffer;
        p.u = 0; // Kill velocity
      }
      // Right Wall
      if (p.x > width - buffer) {
        p.x = width - buffer;
        p.u = 0;
      }
      // Floor
      if (p.y > height - buffer) {
        p.y = height - buffer;
        p.v = 0; // Kill downward momentum
      }
      // Ceiling
      if (p.y < buffer) {
        p.y = buffer;
        p.v = 0;
      }
    }
  }

  separateParticles() {
    // Spatial Hashing for O(N) neighbor lookup
    const numCells = this.fNumX * this.fNumY;
    const invH = 1.0 / this.h;

    // Arrays for linked list (Optimization: allocate once or use typed arrays)
    // Reset heads
    const firstHead = new Int32Array(numCells).fill(-1);
    const nextParticle = new Int32Array(this.particles.length).fill(-1);

    // Fill Hash
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      // Clamp indices to be safe
      const cx = Math.max(0, Math.min(this.fNumX - 1, Math.floor(p.x * invH)));
      const cy = Math.max(0, Math.min(this.fNumY - 1, Math.floor(p.y * invH)));
      const cIdx = cx + cy * this.fNumX;

      nextParticle[i] = firstHead[cIdx];
      firstHead[cIdx] = i;
    }

    // Resolve Collisions - Stabilized
    // Use 2 iterations of softer force (0.5) instead of 1 hard iteration (1.0) to prevent jitter/pulsing.
    // Increased check radius to create space between particles
    const radius = this.h;
    const radiusSq = radius * radius;

    // Optimization: Reduced iterations from 2 to 1
    for (let iter = 0; iter < 1; iter++) {
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        const cx = Math.floor(p.x * invH);
        const cy = Math.floor(p.y * invH);

        // Check neighbor cells (3x3)
        for (let nx = cx - 1; nx <= cx + 1; nx++) {
          for (let ny = cy - 1; ny <= cy + 1; ny++) {
            // Bounds check for grid
            if (nx < 0 || nx >= this.fNumX || ny < 0 || ny >= this.fNumY)
              continue;

            const nIdx = nx + ny * this.fNumX;
            let neighborIdx = firstHead[nIdx];

            while (neighborIdx !== -1) {
              if (neighborIdx !== i) {
                const pn = this.particles[neighborIdx];
                const dx = p.x - pn.x;
                const dy = p.y - pn.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < radiusSq && distSq > 0.000001) {
                  const dist = Math.sqrt(distSq);
                  const overlap = radius - dist;
                  const force = overlap * 0.5; // Softened force

                  const fx = (dx / dist) * force;
                  const fy = (dy / dist) * force;

                  p.x += fx;
                  p.y += fy;
                  pn.x -= fx;
                  pn.y -= fy;
                }
              }
              neighborIdx = nextParticle[neighborIdx];
            }
          }
        }
      }
    }
  }

  // 3. Mouse Interaction Helper
  addExternalForce(
    x: number,
    y: number,
    vx: number,
    vy: number,
    radius: number
  ) {
    const rSq = radius * radius;
    for (const p of this.particles) {
      const dx = p.x - x;
      const dy = p.y - y;
      const distSq = dx * dx + dy * dy;

      if (distSq < rSq) {
        // Add velocity based on proximity (linear falloff)
        const strength = 1.0 - Math.sqrt(distSq) / radius;
        // Add a bit of mouse velocity to particle
        p.u += vx * strength;
        p.v += vy * strength;
      }
    }
  }

  transferParticlesToGrid() {
    this.u.fill(0);
    this.v.fill(0);
    this.uWeight.fill(0);
    this.vWeight.fill(0);

    for (const p of this.particles) {
      this.splatToGrid(
        p.x,
        p.y,
        p.u,
        this.u,
        this.uWeight,
        0.0,
        0.5,
        this.fNumX + 1,
        this.fNumY
      );
      this.splatToGrid(
        p.x,
        p.y,
        p.v,
        this.v,
        this.vWeight,
        0.5,
        0.0,
        this.fNumX,
        this.fNumY + 1
      );
    }

    for (let i = 0; i < this.u.length; i++)
      if (this.uWeight[i] > 0) this.u[i] /= this.uWeight[i];
    for (let i = 0; i < this.v.length; i++)
      if (this.vWeight[i] > 0) this.v[i] /= this.vWeight[i];

    this.enforceBoundaries();
  }

  calculateParticleDensity() {
    this.pDensity.fill(0);
    for (const p of this.particles) {
      this.splatToScalarGrid(
        p.x,
        p.y,
        1.0,
        this.pDensity,
        0.5,
        0.5,
        this.fNumX,
        this.fNumY
      );
    }
  }

  solveIncompressibility() {
    const numIters = 30; // Optimization: Reduced from 50 (still good stability)
    const cp = this.overRelaxation; // Now correctly defined!

    // Density correction parameters
    const restDensity = 2.5;
    const kDensity = 1.0;

    for (let iter = 0; iter < numIters; iter++) {
      for (let j = 1; j < this.fNumY - 1; j++) {
        for (let i = 1; i < this.fNumX - 1; i++) {
          const cellIdx = i + j * this.fNumX;
          if (this.cellType[cellIdx] === CellType.SOLID) continue;

          // Indices
          const idxU = i + j * (this.fNumX + 1);
          const idxV = i + j * this.fNumX;

          const uLeft = this.u[idxU];
          const uRight = this.u[idxU + 1];
          const vBot = this.v[idxV];
          const vTop = this.v[idxV + this.fNumX];

          let div = uRight - uLeft + (vTop - vBot);

          // Density Correction
          const density = this.pDensity[cellIdx];
          let targetDiv = 0;
          if (density > restDensity) {
            targetDiv = kDensity * (density - restDensity);
          }
          div -= targetDiv;

          if (Math.abs(div) < 0.00001) continue;

          const sLeft =
            this.cellType[i - 1 + j * this.fNumX] === CellType.SOLID ? 0 : 1;
          const sRight =
            this.cellType[i + 1 + j * this.fNumX] === CellType.SOLID ? 0 : 1;
          const sBot =
            this.cellType[i + (j - 1) * this.fNumX] === CellType.SOLID ? 0 : 1;
          const sTop =
            this.cellType[i + (j + 1) * this.fNumX] === CellType.SOLID ? 0 : 1;

          const sTot = sLeft + sRight + sBot + sTop;
          if (sTot === 0) continue;

          const flux = -(div * cp) / sTot;

          if (sLeft) this.u[idxU] -= flux;
          if (sRight) this.u[idxU + 1] += flux;
          if (sBot) this.v[idxV] -= flux;
          if (sTop) this.v[idxV + this.fNumX] += flux;
        }
      }
    }
  }

  transferGridToParticles(flipRatio: number) {
    for (const p of this.particles) {
      const uPIC = this.sampleGrid(
        p.x,
        p.y,
        this.u,
        0.0,
        0.5,
        this.fNumX + 1,
        this.fNumY
      );
      const vPIC = this.sampleGrid(
        p.x,
        p.y,
        this.v,
        0.5,
        0.0,
        this.fNumX,
        this.fNumY + 1
      );

      const uOld = this.sampleGrid(
        p.x,
        p.y,
        this.du,
        0.0,
        0.5,
        this.fNumX + 1,
        this.fNumY
      );
      const vOld = this.sampleGrid(
        p.x,
        p.y,
        this.dv,
        0.5,
        0.0,
        this.fNumX,
        this.fNumY + 1
      );

      const uFLIP = p.u + (uPIC - uOld);
      const vFLIP = p.v + (vPIC - vOld);

      p.u = uFLIP * flipRatio + uPIC * (1 - flipRatio);
      p.v = vFLIP * flipRatio + vPIC * (1 - flipRatio);
    }
  }

  enforceBoundaries() {
    const n = this.fNumY;
    const m = this.fNumX;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < m; i++) {
        if (this.cellType[i + j * m] === CellType.SOLID) {
          this.u[i + j * (m + 1)] = 0;
          this.u[i + 1 + j * (m + 1)] = 0;
          this.v[i + j * m] = 0;
          this.v[i + (j + 1) * m] = 0;
        }
      }
    }
  }

  // Helper Splat/Sample functions unchanged but simplified for brevity
  splatToGrid(
    x: number,
    y: number,
    val: number,
    grid: Float32Array,
    weight: Float32Array,
    ox: number,
    oy: number,
    cols: number,
    rows: number
  ) {
    let gx = x / this.h - ox;
    let gy = y / this.h - oy;
    if (isNaN(gx) || isNaN(gy)) return;
    gx = Math.max(0, Math.min(gx, cols - 2));
    gy = Math.max(0, Math.min(gy, rows - 2));
    const ix = Math.floor(gx);
    const iy = Math.floor(gy);
    const fx = gx - ix;
    const fy = gy - iy;
    const w00 = (1 - fx) * (1 - fy),
      w10 = fx * (1 - fy),
      w01 = (1 - fx) * fy,
      w11 = fx * fy;
    const idx = ix + iy * cols;
    grid[idx] += val * w00;
    weight[idx] += w00;
    grid[idx + 1] += val * w10;
    weight[idx + 1] += w10;
    grid[idx + cols] += val * w01;
    weight[idx + cols] += w01;
    grid[idx + cols + 1] += val * w11;
    weight[idx + cols + 1] += w11;
  }

  splatToScalarGrid(
    x: number,
    y: number,
    val: number,
    grid: Float32Array,
    ox: number,
    oy: number,
    cols: number,
    rows: number
  ) {
    let gx = x / this.h - ox;
    let gy = y / this.h - oy;
    gx = Math.max(0, Math.min(gx, cols - 2));
    gy = Math.max(0, Math.min(gy, rows - 2));
    const ix = Math.floor(gx);
    const iy = Math.floor(gy);
    const fx = gx - ix;
    const fy = gy - iy;
    const idx = ix + iy * cols;
    grid[idx] += val * (1 - fx) * (1 - fy);
    grid[idx + 1] += val * fx * (1 - fy);
    grid[idx + cols] += val * (1 - fx) * fy;
    grid[idx + cols + 1] += val * fx * fy;
  }

  sampleGrid(
    x: number,
    y: number,
    grid: Float32Array,
    ox: number,
    oy: number,
    cols: number,
    rows: number
  ) {
    let gx = x / this.h - ox;
    let gy = y / this.h - oy;
    if (isNaN(gx) || isNaN(gy)) return 0;
    gx = Math.max(0, Math.min(gx, cols - 2));
    gy = Math.max(0, Math.min(gy, rows - 2));
    const ix = Math.floor(gx);
    const iy = Math.floor(gy);
    const fx = gx - ix;
    const fy = gy - iy;
    const idx = ix + iy * cols;
    return (
      grid[idx] * (1 - fx) * (1 - fy) +
      grid[idx + 1] * fx * (1 - fy) +
      grid[idx + cols] * (1 - fx) * fy +
      grid[idx + cols + 1] * fx * fy
    );
  }
}
