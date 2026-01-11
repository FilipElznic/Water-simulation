import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  Eraser,
  Flame,
  Droplets,
  HardDrive,
  Square,
  FlaskConical,
  Cloud,
} from "lucide-react";
import { SandSim, GrainType } from "../SandSim";

export default function SandSimulation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<SandSim | null>(null);
  const [selectedType, setSelectedType] = useState<GrainType>(GrainType.SAND);

  // Mouse State
  const mouseRef = useRef({
    x: 0,
    y: 0,
    isDown: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Make canvas sharp on high DPI
    const width = 800;
    const height = 600;

    // Cell size for pixels (sand grains)
    // Optimization: Increased from 4 to 6 for significantly better performance (fewer cells)
    const cellSize = 6;

    // Initialize Simulation
    const sim = new SandSim(width, height, cellSize);
    simRef.current = sim;

    // We only need one loop that runs continuously
    let animId: number;

    const loop = () => {
      sim.step();

      if (mouseRef.current.isDown) {
        sim.addSand(
          mouseRef.current.x,
          mouseRef.current.y,
          20,
          typeRef.current // Use ref here
        );
      }

      // Draw
      ctx.fillStyle = "#111827";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let y = 0; y < sim.rows; y++) {
        for (let x = 0; x < sim.cols; x++) {
          const idx = x + y * sim.cols;
          const type = sim.grid[idx];
          if (type !== GrainType.EMPTY) {
            const px = x * cellSize;
            const py = y * cellSize;

            if (type === GrainType.SAND)
              ctx.fillStyle = `hsl(40, 80%, ${50 + (idx % 20)}%)`; // Amber
            else if (type === GrainType.WATER)
              ctx.fillStyle = `hsl(210, 90%, ${50 + (idx % 10)}%)`; // Blue
            else if (type === GrainType.STONE)
              ctx.fillStyle = "#6b7280"; // Gray
            else if (type === GrainType.WOOD)
              ctx.fillStyle = "#78350f"; // Brown
            else if (type === GrainType.FIRE)
              ctx.fillStyle = `hsl(${0 + Math.random() * 40}, 100%, 50%)`;
            // Fire
            else if (type === GrainType.SMOKE)
              ctx.fillStyle = `rgba(150, 150, 150, ${Math.min(
                1,
                sim.life[idx] / 50
              )})`;
            // Smoke
            else if (type === GrainType.ACID) ctx.fillStyle = "#a3e635"; // Lime Acid

            ctx.fillRect(px, py, cellSize, cellSize);
          }
        }
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []); // Only run once on mount

  const typeRef = useRef(GrainType.SAND);
  useEffect(() => {
    typeRef.current = selectedType;
  }, [selectedType]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    mouseRef.current.x = (e.clientX - rect.left) * scaleX;
    mouseRef.current.y = (e.clientY - rect.top) * scaleY;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseRef.current.isDown = true;
    handleMouseMove(e);
  };

  const handleMouseUp = () => {
    mouseRef.current.isDown = false;
  };

  const handleReset = () => {
    if (simRef.current) simRef.current.reset();
  };

  const buttons = [
    {
      id: GrainType.SAND,
      label: "Sand",
      icon: <Square size={16} />,
      color: "bg-amber-400 text-amber-900 border-amber-500",
    },
    {
      id: GrainType.WATER,
      label: "Water",
      icon: <Droplets size={16} />,
      color: "bg-blue-500 text-white border-blue-600",
    },
    {
      id: GrainType.STONE,
      label: "Stone",
      icon: <HardDrive size={16} />,
      color: "bg-gray-600 text-white border-gray-700",
    },
    {
      id: GrainType.WOOD,
      label: "Wood",
      icon: <Square size={16} className="text-amber-900" />,
      color: "bg-amber-800 text-amber-100 border-amber-900",
    },
    {
      id: GrainType.FIRE,
      label: "Fire",
      icon: <Flame size={16} />,
      color: "bg-red-500 text-white border-red-600",
    },
    {
      id: GrainType.ACID,
      label: "Acid",
      icon: <FlaskConical size={16} />,
      color: "bg-lime-400 text-lime-900 border-lime-500",
    },
    {
      id: GrainType.EMPTY,
      label: "Erase",
      icon: <Eraser size={16} />,
      color: "bg-red-50 text-red-900 border-red-200",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8">
      {/* Header */}
      <div className="w-full max-w-5xl px-4 flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <Link
          to="/"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Back</span>
        </Link>

        <div className="flex flex-wrap justify-center gap-2">
          {buttons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setSelectedType(btn.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all shadow-sm border ${
                selectedType === btn.id
                  ? btn.color + " ring-2 ring-offset-1 ring-blue-400"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {btn.icon}
              <span>{btn.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors shadow-sm"
        >
          <RefreshCw size={18} />
          <span>Reset</span>
        </button>
      </div>

      <div className="bg-white p-2 rounded-xl shadow-2xl border border-gray-200">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="border border-gray-100 rounded-lg cursor-crosshair active:cursor-grabbing bg-gray-900"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      <div className="mt-6 max-w-2xl text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Falling Sand Automata
        </h2>
        <p className="text-gray-600">
          Try burning wood with fire, or melting stone with acid!
        </p>
      </div>
    </div>
  );
}
