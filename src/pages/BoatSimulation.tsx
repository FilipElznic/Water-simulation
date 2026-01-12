import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, Anchor } from "lucide-react";
import { BoatSim } from "../BoatSim";

export default function BoatSimulation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<BoatSim | null>(null);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Initial setup
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const sim = new BoatSim(canvas.width, canvas.height);
    simRef.current = sim;

    const render = () => {
      if (!ctx || !sim) return;

      // Update Physics
      sim.update();

      // Clear Screen
      ctx.fillStyle = "skyblue";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Sun
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.arc(canvas.width - 100, 100, 60, 0, Math.PI * 2);
      ctx.fill();

      // Draw Water as Disconnected Balls (Filling to Bottom)
      const rowSpacing = sim.spacing;
      // Calculate how many rows needed to fill to the bottom
      const waterDepth = canvas.height - sim.baseWaterLevel;
      const numRows = Math.ceil(waterDepth / rowSpacing) + 2;

      for (let i = 0; i < sim.springs.length; i++) {
        for (let j = 0; j < numRows; j++) {
          const attenuation = Math.exp(-j * 0.1);
          const x = i * sim.spacing;
          const y =
            sim.baseWaterLevel +
            sim.springs[i].height * attenuation +
            j * rowSpacing;

          ctx.beginPath();
          if (j === 0) {
            // Surface Ball (Bigger, Active Color)
            const speed = Math.abs(sim.springs[i].velocity);
            const t = Math.min(speed / 10.0, 1.0);
            const r = Math.floor(30 + (224 - 30) * t);
            const g = Math.floor(144 + (255 - 144) * t);
            const b = Math.floor(255 + (255 - 255) * t);

            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.arc(x, y, 5, 0, Math.PI * 2);
          } else {
            // Subsurface Ball (Blue, Unconnected)
            ctx.fillStyle = "rgba(0, 100, 255, 0.4)";
            ctx.arc(x, y, 3, 0, Math.PI * 2);
          }
          ctx.fill();
        }
      }

      // Draw Gradient overlay for water
      //   const gradient = ctx.createLinearGradient(0, sim.baseWaterLevel, 0, canvas.height);
      //   gradient.addColorStop(0, "rgba(0, 100, 255, 0.4)");
      //   gradient.addColorStop(1, "rgba(0, 0, 100, 0.9)");
      //   ctx.fillStyle = gradient;
      //   ctx.fill();

      // Draw Boat
      const b = sim.boat;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);

      // Boat Body
      ctx.fillStyle = "#A0522D";
      ctx.beginPath();
      ctx.moveTo(-b.width / 2, -b.height / 2);
      ctx.lineTo(b.width / 2, -b.height / 2); // Deck
      ctx.lineTo(b.width / 2 - 10, b.height / 2); // Bow/Stern
      ctx.lineTo(-b.width / 2 + 10, b.height / 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#5C3317";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Mast
      ctx.fillStyle = "#5C3317";
      ctx.fillRect(-5, -b.height / 2 - 60, 10, 60);

      // Sail
      ctx.fillStyle = "#FFF8DC";
      ctx.beginPath();
      ctx.moveTo(5, -b.height / 2 - 55);
      ctx.lineTo(60, -b.height / 2 - 30);
      ctx.lineTo(5, -b.height / 2 - 10);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      sim.resize(canvas.width, canvas.height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!simRef.current) return;
    // Splash on click
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    simRef.current.splash(x, 100); // Hard splash
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!simRef.current) return;
    // Maybe interact?
    if (e.buttons === 1) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      simRef.current.splash(x, 100); // Drag splash
    }
  };

  const handleReset = () => {
    // Reload page or reset logic
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-sky-300">
      {/* UI Overlay */}
      <div className="absolute top-4 left-4 z-10 flex gap-4">
        <Link
          to="/"
          className="p-2 bg-white/90 backdrop-blur rounded-full shadow-lg hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </Link>
        <div className="p-3 bg-white/90 backdrop-blur rounded-lg shadow-lg">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Anchor className="w-6 h-6 text-blue-600" />
            Boat & Waves
          </h1>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={handleReset}
          className="p-2 bg-white/90 backdrop-blur rounded-full shadow-lg hover:bg-white transition-colors"
          title="Reset Simulation"
        >
          <RefreshCw className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-white/80 px-6 py-2 rounded-full shadow text-gray-700 font-medium text-sm">
          Click/Drag freely to make waves • Boat reacts to physics
        </div>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        className="block touch-none cursor-pointer"
      />
    </div>
  );
}
