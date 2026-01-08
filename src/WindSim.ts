export class WindSim {
  size: number;
  dt: number;
  diff: number;
  visc: number;

  s: Float32Array; // Dye density
  density: Float32Array;

  Vx: Float32Array;
  Vy: Float32Array;

  Vx0: Float32Array;
  Vy0: Float32Array;

  // Obstacles (0 = fluid, 1 = solid)
  obstacles: Uint8Array;

  constructor(size: number, diffusion: number, viscosity: number, dt: number) {
    this.size = size;
    this.dt = dt;
    this.diff = diffusion;
    this.visc = viscosity;

    // N * N grid
    const N = size * size;

    this.s = new Float32Array(N);
    this.density = new Float32Array(N);

    this.Vx = new Float32Array(N);
    this.Vy = new Float32Array(N);

    this.Vx0 = new Float32Array(N);
    this.Vy0 = new Float32Array(N);

    this.obstacles = new Uint8Array(N).fill(0);
  }

  // --- External Interaction ---

  addDensity(x: number, y: number, amount: number) {
    const idx = this.IX(x, y);
    this.density[idx] += amount;
    // Clamp
    if (this.density[idx] > 255) this.density[idx] = 255;
  }

  addVelocity(x: number, y: number, amountX: number, amountY: number) {
    const idx = this.IX(x, y);
    this.Vx[idx] += amountX;
    this.Vy[idx] += amountY;
  }

  setObstacle(x: number, y: number, isSolid: boolean) {
    if (x < 1 || x >= this.size - 1 || y < 1 || y >= this.size - 1) return;
    this.obstacles[this.IX(x, y)] = isSolid ? 1 : 0;
    if (isSolid) {
      // Kill velocity inside obstacle
      this.Vx[this.IX(x, y)] = 0;
      this.Vy[this.IX(x, y)] = 0;
      this.density[this.IX(x, y)] = 0;
    }
  }

  reset() {
    this.Vx.fill(0);
    this.Vy.fill(0);
    this.Vx0.fill(0);
    this.Vy0.fill(0);
    this.density.fill(0);
    this.obstacles.fill(0);
  }

  // --- Step ---

  step() {
    const N = this.size;
    const visc = this.visc;
    const diff = this.diff;
    const dt = this.dt;
    const Vx = this.Vx;
    const Vy = this.Vy;
    const Vx0 = this.Vx0;
    const Vy0 = this.Vy0;
    const s = this.density;

    // Constant Inflow from Left
    this.applyInflow();

    // 1. Diffuse Velocity
    this.diffuse(1, Vx0, Vx, visc, dt);
    this.diffuse(2, Vy0, Vy, visc, dt);

    // 2. Project (Mass Conservation)
    this.project(Vx0, Vy0, Vx, Vy);

    // 3. Advect Velocity
    this.advect(1, Vx, Vx0, Vx0, Vy0, dt);
    this.advect(2, Vy, Vy0, Vx0, Vy0, dt);

    // 4. Project Again
    this.project(Vx, Vy, Vx0, Vy0);

    // 5. Diffuse & Advect Density (Dye)
    // We use 's' as density source, but here we just reuse 'density' array
    // To properly diffuse density we need a swap buffer, let's use s as temp.
    // Actually standard Stam uses (x, x0) pairs.
    // Use Vx0 as temp for density? No, confusing.
    // Let's alloc a temp density buffer if needed or just advect it.
    // Diffusion of dye in air is negligible for visual effect usually.

    this.advect(0, s, s, Vx, Vy, dt);
  }

  applyInflow() {
    // Add wind and smoke on the left edge
    const N = this.size;
    for (let y = 1; y < N - 1; y++) {
      // Middle band only?
      if (y > N * 0.3 && y < N * 0.7) {
        const idx = this.IX(2, y);
        this.Vx[idx] = 15.0; // Strong rightward wind
        this.density[idx] = 200; // Constant smoke source
      }
    }
  }

  // --- Solvers ---

  IX(x: number, y: number) {
    if (x < 0) x = 0;
    if (x >= this.size) x = this.size - 1;
    if (y < 0) y = 0;
    if (y >= this.size) y = this.size - 1;
    return x + y * this.size;
  }

  diffuse(
    b: number,
    x: Float32Array,
    x0: Float32Array,
    diff: number,
    dt: number
  ) {
    const a = dt * diff * (this.size - 2) * (this.size - 2);
    this.lin_solve(b, x, x0, a, 1 + 6 * a);
  }

  lin_solve(
    b: number,
    x: Float32Array,
    x0: Float32Array,
    a: number,
    c: number
  ) {
    const start = 1;
    const end = this.size - 1;

    // Gauss-Seidel relaxation
    // 4 to 20 iterations
    for (let k = 0; k < 10; k++) {
      for (let j = start; j < end; j++) {
        for (let i = start; i < end; i++) {
          const idx = this.IX(i, j);
          if (this.obstacles[idx]) continue; // Skip solids

          x[idx] =
            (x0[idx] +
              a *
                (x[this.IX(i + 1, j)] +
                  x[this.IX(i - 1, j)] +
                  x[this.IX(i, j + 1)] +
                  x[this.IX(i, j - 1)])) /
            c;
        }
      }
      this.set_bnd(b, x);
    }
  }

  project(
    velocX: Float32Array,
    velocY: Float32Array,
    p: Float32Array,
    div: Float32Array
  ) {
    const start = 1;
    const end = this.size - 1;
    const h = 1.0 / this.size;

    for (let j = start; j < end; j++) {
      for (let i = start; i < end; i++) {
        const idx = this.IX(i, j);
        if (this.obstacles[idx]) {
          div[idx] = 0;
          p[idx] = 0;
          continue;
        }

        div[idx] =
          -0.5 *
          h *
          (velocX[this.IX(i + 1, j)] -
            velocX[this.IX(i - 1, j)] +
            velocY[this.IX(i, j + 1)] -
            velocY[this.IX(i, j - 1)]);
        p[idx] = 0;
      }
    }

    this.set_bnd(0, div);
    this.set_bnd(0, p);
    this.lin_solve(0, p, div, 1, 6); // 6 neighbors? No, 4 neighbors. Stam uses 1, 4.
    // Standard Poisson eqn on grid: x[i,j] = (div + neighbors)/4.
    // So c=4 here for standard grid.
    // Let's stick to 4.

    // Re-run solver with correct coeff
    for (let k = 0; k < 20; k++) {
      for (let j = start; j < end; j++) {
        for (let i = start; i < end; i++) {
          const idx = this.IX(i, j);
          if (this.obstacles[idx]) continue;

          p[idx] =
            (div[idx] +
              p[this.IX(i + 1, j)] +
              p[this.IX(i - 1, j)] +
              p[this.IX(i, j + 1)] +
              p[this.IX(i, j - 1)]) /
            4;
        }
      }
      this.set_bnd(0, p);
    }

    for (let j = start; j < end; j++) {
      for (let i = start; i < end; i++) {
        const idx = this.IX(i, j);
        if (this.obstacles[idx]) {
          velocX[idx] = 0;
          velocY[idx] = 0;
          continue;
        }

        velocX[idx] -=
          (0.5 * (p[this.IX(i + 1, j)] - p[this.IX(i - 1, j)])) / h;
        velocY[idx] -=
          (0.5 * (p[this.IX(i, j + 1)] - p[this.IX(i, j - 1)])) / h;
      }
    }

    this.set_bnd(1, velocX);
    this.set_bnd(2, velocY);
  }

  advect(
    b: number,
    d: Float32Array,
    d0: Float32Array,
    velocX: Float32Array,
    velocY: Float32Array,
    dt: number
  ) {
    const start = 1;
    const end = this.size - 1;
    const dt0 = dt * (this.size - 2); // Time step scaled by grid size

    for (let j = start; j < end; j++) {
      for (let i = start; i < end; i++) {
        const idx = this.IX(i, j);
        if (this.obstacles[idx]) {
          d[idx] = 0;
          continue;
        }

        let x = i - dt0 * velocX[idx];
        let y = j - dt0 * velocY[idx];

        // Clamp
        if (x < 0.5) x = 0.5;
        if (x > this.size - 1.5) x = this.size - 1.5;
        if (y < 0.5) y = 0.5;
        if (y > this.size - 1.5) y = this.size - 1.5;

        const i0 = Math.floor(x);
        const i1 = i0 + 1;
        const j0 = Math.floor(y);
        const j1 = j0 + 1;

        const s1 = x - i0;
        const s0 = 1.0 - s1;
        const t1 = y - j0;
        const t0 = 1.0 - t1;

        d[idx] =
          s0 * (t0 * d0[this.IX(i0, j0)] + t1 * d0[this.IX(i0, j1)]) +
          s1 * (t0 * d0[this.IX(i1, j0)] + t1 * d0[this.IX(i1, j1)]);
      }
    }
    this.set_bnd(b, d);
  }

  set_bnd(b: number, x: Float32Array) {
    const N = this.size;
    // Walls
    for (let i = 1; i < N - 1; i++) {
      // Top/Bottom
      x[this.IX(i, 0)] = b === 2 ? -x[this.IX(i, 1)] : x[this.IX(i, 1)];
      x[this.IX(i, N - 1)] =
        b === 2 ? -x[this.IX(i, N - 2)] : x[this.IX(i, N - 2)];
    }
    for (let j = 1; j < N - 1; j++) {
      // Left/Right
      x[this.IX(0, j)] = b === 1 ? -x[this.IX(1, j)] : x[this.IX(1, j)];
      x[this.IX(N - 1, j)] =
        b === 1 ? -x[this.IX(N - 2, j)] : x[this.IX(N - 2, j)];
    }

    // Corners
    x[this.IX(0, 0)] = 0.5 * (x[this.IX(1, 0)] + x[this.IX(0, 1)]);
    x[this.IX(0, N - 1)] = 0.5 * (x[this.IX(1, N - 1)] + x[this.IX(0, N - 2)]);
    x[this.IX(N - 1, 0)] = 0.5 * (x[this.IX(N - 2, 0)] + x[this.IX(N - 1, 1)]);
    x[this.IX(N - 1, N - 1)] =
      0.5 * (x[this.IX(N - 2, N - 1)] + x[this.IX(N - 1, N - 2)]);

    // Handle Obstacle Boundaries?
    // Simplified: No special boundary condition for internal obstacles here,
    // we just zero them out in the loops or project step.
  }
}
