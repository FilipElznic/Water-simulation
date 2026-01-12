import React from "react";
import "katex/dist/katex.min.css";
import { BlockMath, InlineMath } from "react-katex";

const PaperSection: React.FC<{
  title: React.ReactNode;
  number?: string;
  rotation?: string;
  children: React.ReactNode;
}> = ({ title, number, rotation = "rotate-0", children }) => (
  <div
    className={`sketch-border bg-white p-6 relative z-10 shadow-paper transform ${rotation} transition-transform hover:scale-[1.01] h-full`}
  >
    {/* Pin effect */}
    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-800 shadow-md z-20 border border-white/30 hidden md:block"></div>

    <h2 className="text-2xl font-hand font-bold mb-4 text-ocean flex items-center gap-3 border-b-2 border-ocean/10 pb-2">
      {number && <span className="text-3xl text-ocean/40">{number}</span>}
      {title}
    </h2>
    <div className="text-ink/80 leading-relaxed font-mono text-sm">
      {children}
    </div>
  </div>
);

const SimulationInfo: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 mb-16 relative font-mono">
      {/* Title Section (Separate Card) */}
      <div className="sketch-border bg-white p-6 relative z-10 shadow-paper transform -rotate-1 mb-10 max-w-3xl mx-auto">
        <div className="text-center relative">
          <h1 className="text-4xl md:text-5xl font-hand text-ink font-bold mb-2">
            Mathematical Models
          </h1>
          <div className="w-24 h-1 bg-ink/10 mx-auto rounded-full"></div>
          <p className="mt-2 text-ink/60 italic text-sm">
            "Mathematics is the language in which God has written the universe."
            - Galileo
          </p>
        </div>
        {/* Decorative background elements behind the title */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-ocean/5 rounded-full blur-xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        {/* Fluid Simulation */}
        <PaperSection title="Fluid Simulation" number="#1" rotation="rotate-1">
          <p className="mb-4">
            Hybrid <strong>PIC/FLIP</strong> solver.
          </p>

          <div className="pl-4 border-l-2 border-ocean/20 space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-2 text-ink font-hand bg-ocean/5 inline-block px-2 py-0.5 rounded-sm transform -rotate-1">
                1. Advection
              </h3>
              <p className="mb-2">Gravity & Velocity:</p>
              <div className="my-2 bg-slate-50 p-3 rounded-sm border border-slate-200 shadow-inner overflow-x-auto text-xs">
                <BlockMath math={"v_i \\leftarrow v_i + \\Delta t \\cdot g"} />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-2 text-ink font-hand bg-ocean/5 inline-block px-2 py-0.5 rounded-sm transform rotate-1">
                2. Pressure (Incompressibility)
              </h3>
              <p className="mb-2">
                Remove divergence (<InlineMath math="\nabla \cdot u = 0" />) via
                Gauss-Seidel:
              </p>
              <div className="my-2 bg-slate-50 p-3 rounded-sm border border-slate-200 shadow-inner overflow-x-auto text-xs">
                <BlockMath
                  math={"u_{i,j} \\leftarrow u_{i,j} - \\text{grad}(p)"}
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-2 text-ink font-hand bg-ocean/5 inline-block px-2 py-0.5 rounded-sm transform -rotate-1">
                3. Update
              </h3>
              <p className="mb-2">
                Mix stable (PIC) and detailed (FLIP) velocities:
              </p>
              <div className="my-2 bg-slate-50 p-3 rounded-sm border border-slate-200 shadow-inner overflow-x-auto text-xs">
                <BlockMath
                  math={"v_{new} = 0.95 \\text{FLIP} + 0.05 \\text{PIC}"}
                />
              </div>
            </div>
          </div>
        </PaperSection>

        {/* Wind Simulation */}
        <PaperSection title="Wind Simulation" number="#2" rotation="-rotate-1">
          <p className="mb-4">
            Eulerian grid-based fluid solver (Stable Fluids).
          </p>

          <div className="pl-4 border-l-2 border-ocean/20 space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-2 text-ink font-hand bg-ocean/5 inline-block px-2 py-0.5 rounded-sm transform rotate-1">
                1. Advection
              </h3>
              <p className="mb-2">Semi-Lagrangian backtrace interpolation:</p>
              <div className="my-2 bg-slate-50 p-3 rounded-sm border border-slate-200 shadow-inner overflow-x-auto text-xs">
                <BlockMath math={"d_{new}(x) = d_{old}(x - v\\Delta t)"} />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-2 text-ink font-hand bg-ocean/5 inline-block px-2 py-0.5 rounded-sm transform -rotate-1">
                2. Diffusion
              </h3>
              <p className="mb-2">Viscosity solving via linear system:</p>
              <div className="my-2 bg-slate-50 p-3 rounded-sm border border-slate-200 shadow-inner overflow-x-auto text-xs">
                <BlockMath math={"(I - \\nu \\Delta t \\nabla^2)u^{new} = u"} />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-2 text-ink font-hand bg-ocean/5 inline-block px-2 py-0.5 rounded-sm transform rotate-1">
                3. Projection
              </h3>
              <p className="mb-2">
                Subtract gradient of pressure to enforce mass conservation:
              </p>
              <div className="my-2 bg-slate-50 p-3 rounded-sm border border-slate-200 shadow-inner overflow-x-auto text-xs">
                <BlockMath math={"u \\leftarrow u - \\nabla p"} />
              </div>
            </div>
          </div>
        </PaperSection>

        {/* Sand Simulation */}
        <PaperSection title="Sand Simulation" number="#3" rotation="rotate-1">
          <p className="mb-4">Cellular Automata (Pixel logic).</p>

          <div className="pl-4 border-l-2 border-ocean/20 space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-2 text-ink font-hand bg-ocean/5 inline-block px-2 py-0.5 rounded-sm transform rotate-1">
                Rule Set
              </h3>
              <p className="mb-2">Iterate grid (Bottom to Top):</p>
              <ul className="list-disc pl-5 mb-2 space-y-1 text-sm">
                <li>
                  If <strong>Below</strong> is Empty{" "}
                  <InlineMath math="\rightarrow" /> Fall.
                </li>
                <li>
                  Else if <strong>Down-Left</strong> Empty{" "}
                  <InlineMath math="\rightarrow" /> Slide Left.
                </li>
                <li>
                  Else if <strong>Down-Right</strong> Empty{" "}
                  <InlineMath math="\rightarrow" /> Slide Right.
                </li>
                <li>
                  Else <InlineMath math="\rightarrow" /> Stay.
                </li>
              </ul>
            </div>
          </div>

          {/* Stamp */}
          <div className="absolute bottom-4 right-4 border-4 border-ink/20 rounded-full w-20 h-20 flex items-center justify-center transform -rotate-12 opacity-50 pointer-events-none">
            <span className="font-hand font-bold text-ink/40 text-xs uppercase">
              Approved
            </span>
          </div>
        </PaperSection>
      </div>
    </div>
  );
};

export default SimulationInfo;
