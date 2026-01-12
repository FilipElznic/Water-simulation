export class WaterSpring {
  height: number; // Current height offset (y-position relative to base water level)
  targetHeight: number; // Rest position (usually 0)
  velocity: number;

  constructor() {
    this.height = 0;
    this.targetHeight = 0;
    this.velocity = 0;
  }

  update(k: number, damping: number) {
    const x = this.height - this.targetHeight;
    const acceleration = -k * x - damping * this.velocity;

    this.velocity += acceleration;
    this.height += this.velocity;
  }
}

export class Boat {
  x: number;
  y: number; // Position is center of mass
  width: number;
  height: number;
  vx: number;
  vy: number;
  angle: number; // radians
  vAngle: number;
  mass: number;

  // Physics constants for boat
  gravity: number = 0.15;
  airFriction: number = 0.99;
  waterFriction: number = 0.95;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.width = 180;
    this.height = 70;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.vAngle = 0;
    this.mass = 1;
  }

  update() {
    this.vy += this.gravity;

    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.vAngle;

    // Air friction (simplistic)
    this.vx *= this.airFriction;
    this.vy *= this.airFriction;
    this.vAngle *= this.airFriction;
  }
}

export class BoatSim {
  width: number;
  baseWaterLevel: number;
  springs: WaterSpring[] = [];
  spacing: number = 14; // Increased spacing for distinct "balls" look
  spread: number = 0.3; // Wave spread factor
  boat: Boat;

  // Physics constants
  springK: number = 0.025;
  springDamping: number = 0.0001; // Reduced damping for unlimited waves

  constructor(width: number, height: number) {
    this.width = width;
    this.baseWaterLevel = height / 2 + 50;

    const numSprings = Math.ceil(width / this.spacing) + 1;
    for (let i = 0; i < numSprings; i++) {
      this.springs.push(new WaterSpring());
    }

    this.boat = new Boat(width / 2, this.baseWaterLevel - 100);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.baseWaterLevel = height / 2 + 50;

    const numSprings = Math.ceil(width / this.spacing) + 1;
    // Resize springs array, preserving existing ones if possible?
    // For simplicity, let's just re-init or adjust length.
    if (this.springs.length < numSprings) {
      while (this.springs.length < numSprings) {
        this.springs.push(new WaterSpring());
      }
    } else if (this.springs.length > numSprings) {
      this.springs.length = numSprings;
    }
  }

  update() {
    // 1. Update Springs
    for (const spring of this.springs) {
      spring.update(this.springK, this.springDamping);
    }

    // 2. Wave Propagation
    const leftDeltas = new Array(this.springs.length).fill(0);
    const rightDeltas = new Array(this.springs.length).fill(0);

    // Run propagation passes (more passes = faster spread)
    // Optimization: Reduced from 8 to 4 for performance. 4 is enough for stable waves.
    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < this.springs.length; i++) {
        if (i > 0) {
          leftDeltas[i] =
            this.spread * (this.springs[i].height - this.springs[i - 1].height);
          this.springs[i - 1].velocity += leftDeltas[i];
        }
        if (i < this.springs.length - 1) {
          rightDeltas[i] =
            this.spread * (this.springs[i].height - this.springs[i + 1].height);
          this.springs[i + 1].velocity += rightDeltas[i];
        }
      }
      for (let i = 0; i < this.springs.length; i++) {
        if (i > 0) this.springs[i - 1].height += leftDeltas[i];
        if (i < this.springs.length - 1)
          this.springs[i + 1].height += rightDeltas[i];
      }
    }

    // 3. Boat Physics (Buoyancy)
    this.boat.update();
    this.handleBoatWaterInteraction();

    // Boundary check for boat
    if (this.boat.x < 0) {
      this.boat.x = 0;
      this.boat.vx *= -0.5;
    }
    if (this.boat.x > this.width) {
      this.boat.x = this.width;
      this.boat.vx *= -0.5;
    }
  }

  handleBoatWaterInteraction() {
    const b = this.boat;

    // Sample water level under the boat
    // We'll sample 2 points (left and right of boat) to get torque and lift

    // Simplified boat shape for calculation driven by bounding box
    // Calculate rotated bottom corners positions?
    // For simplicity in this spring model, let's treat the boat as a collection of probe points along its bottom width.

    // Optimization: Reduced probes from 10 to 5. Sufficient for buoyancy.
    const numProbes = 5;
    const dx = b.width / numProbes;

    // Get boat's bottom line in world space
    // Center (cx, cy) = (b.x, b.y)
    // Relative pos of bottom-left corner (-w/2, h/2) rotated by angle

    const cosA = Math.cos(b.angle);
    const sinA = Math.sin(b.angle);

    for (let i = 0; i <= numProbes; i++) {
      const relX = -b.width / 2 + i * dx;
      const relY = b.height / 2; // Bottom of the boat

      // World position of this probe point
      const wx = b.x + relX * cosA - relY * sinA;
      const wy = b.y + relX * sinA + relY * cosA;

      // Find corresponding spring
      const springIdx = Math.floor(wx / this.spacing);
      if (springIdx >= 0 && springIdx < this.springs.length) {
        const waterY = this.baseWaterLevel + this.springs[springIdx].height;

        // If probe is under water
        if (wy > waterY) {
          // Depth
          const depth = wy - waterY;

          // Buoyant force proprotional to depth
          const force = Math.min(depth, 50) * 0.15;

          // Apply force to boat (upwards)
          // We add to vertical velocity directly
          // F = ma => a = F/m. Let's assume uniform mass distribution.
          // But we are integrating velocity directly.

          // Lift
          b.vy -= force / numProbes;

          // Torque = r x F. r is vector from center to probe.
          // Torque is roughly (moment arm) * force.
          // Moment arm is relX (horizontal dist from center)
          // Actually it's cross product, but for small angles relX is close to moment arm.
          // Correct 2D torque: (rx * Fy - ry * Fx)
          // Here F is purely vertical (up), so Fx=0, Fy = -force.
          // Torque = rx * (-force) = -rx * force.
          // rx is the horizontal distance from CoM to application point in world space.
          // But simplified: use relative X in the boat frame usually works for stable boats.

          b.vAngle -= (relX * force * 0.0005) / numProbes;

          // Apply Friction/Drag from water
          b.vx *= b.waterFriction;
          b.vy *= b.waterFriction;
          b.vAngle *= b.waterFriction;

          // Reaction: Boat pushes water down
          this.springs[springIdx].velocity += force * 0.05;
          // Also add some horizontal drag to water to make waves when boat moves?
          this.springs[springIdx].velocity +=
            Math.abs(b.vx) *
            (b.vx > 0 ? -0.1 : 0.1) *
            (i < numProbes / 2 ? -1 : 1) *
            0.01;
        }
      }
    }
  }

  splash(x: number, speed: number) {
    const index = Math.floor(x / this.spacing);
    // Smaller waves: Reduced range significantly
    const range = 3; // Affect 3 springs on each side (was 12)
    for (let i = index - range; i <= index + range; i++) {
      if (i >= 0 && i < this.springs.length) {
        const dist = Math.abs(i - index);
        const factor = Math.cos((dist / range) * (Math.PI / 2));
        // Reduce speed impact for smaller waves
        this.springs[i].velocity += speed * factor * 0.3;
      }
    }
  }
}
