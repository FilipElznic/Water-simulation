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
    <div className="min-h-screen py-8 px-4 font-mono overflow-y-auto max-h-screen">
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-8 pb-20">
        {/* Header */}
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4">
          <Link
            to="/"
            className="sketch-btn flex items-center gap-2 text-ink group"
          >
            <ArrowLeft
              size={20}
              className="group-hover:-translate-x-1 transition-transform"
            />
            <span className="font-hand text-xl font-bold">Back to Index</span>
          </Link>

          <div className="text-center relative">
            <h1 className="text-5xl font-hand font-bold text-ink transform rotate-1">
              Granular Matter
            </h1>
            <div className="w-32 h-1 bg-ink/10 mx-auto rounded-full mt-2"></div>
          </div>

          <button
            onClick={handleReset}
            className="sketch-btn flex items-center gap-2 text-ink bg-white/50"
          >
            <RefreshCw size={18} />
            <span className="font-hand font-bold text-lg">Reset Box</span>
          </button>
        </div>

        {/* Controls */}
        <div className="glass-panel p-4 flex flex-wrap justify-center gap-3 w-full max-w-4xl transform -rotate-1 relative z-20">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs font-hand text-ink/40 bg-[#f2e8d5] px-2">
            Select Element
          </div>
          {buttons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setSelectedType(btn.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-sm font-hand font-bold text-lg transition-all border-2 ${
                selectedType === btn.id
                  ? "bg-white border-ink shadow-sm transform -translate-y-1"
                  : "bg-transparent border-transparent hover:bg-white/30 text-ink/60 hover:text-ink"
              }`}
            >
              <span
                className={selectedType === btn.id ? "text-ink" : "opacity-50"}
              >
                {btn.icon}
              </span>
              <span>{btn.label}</span>
            </button>
          ))}
        </div>

        {/* Canvas Area */}
        <div className="relative group flex flex-col xl:flex-row gap-8 items-start">
          <div className="relative">
            <div className="sketch-border bg-white p-2 md:p-4 shadow-paper transform rotate-1 relative z-10">
              {/* Pin effect */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-800 shadow-md z-20 border border-white/30"></div>

              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="border-2 border-ink/10 cursor-crosshair active:cursor-grabbing bg-[#1a1a1a] rounded-sm shadow-inner w-full max-w-[800px]"
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>
            {/* Decorative tape */}
            <div className="absolute -top-4 -right-4 w-24 h-8 bg-yellow-100/30 backdrop-blur-sm border border-white/20 transform rotate-45 shadow-sm z-20"></div>
          </div>

          {/* Instructions Note */}
          <div className="paper-note p-6 w-full xl:max-w-xs transform rotate-2 xl:mt-10 bg-[#fff9c4] relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-blue-800 shadow-md z-20 border border-white/30 block"></div>
            <h3 className="font-hand font-bold text-xl mb-3 text-ink border-b border-ink/10 pb-1">
              Field Guide
            </h3>
            <ul className="list-disc pl-4 space-y-2 text-sm text-ink/90 font-hand font-bold leading-relaxed">
              <li>Select an element from the toolbar above.</li>
              <li>Click & Drag on the black canvas to spawn particles.</li>
              <li>
                Observe distinct physical reactions (e.g., Fire burns Wood, Acid
                dissolves Stone).
              </li>
              <li>
                Use the 'Erase' tool to clear specific areas, or 'Reset Box' for
                a blank slate.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer info */}
        <div className="glass-panel p-6 max-w-2xl text-center transform -rotate-2">
          <h2 className="text-2xl font-hand font-bold text-ink mb-2">
            Falling Sand Automata
          </h2>
          <p className="text-ink/80 text-sm">
            Try burning wood with fire, or melting stone with acid! The
            simulation uses Cellular Automata rules to determine particle
            interaction.
          </p>
        </div>
      </div>
    </div>
  );
}
