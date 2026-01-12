import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import FluidSimulation from "./pages/FluidSimulation";
import SandSimulation from "./pages/SandSimulation";
import WindSimulation from "./pages/WindSimulation";
import BoatSimulation from "./pages/BoatSimulation";
import WaterFlowGame from "./pages/WaterFlowGame";
import LandingPage from "./pages/LandingPage";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/fluid" element={<FluidSimulation />} />
        <Route path="/sand" element={<SandSimulation />} />
        <Route path="/wind" element={<WindSimulation />} />
        <Route path="/boat" element={<BoatSimulation />} />
        <Route path="/game" element={<WaterFlowGame />} />
      </Routes>
    </Router>
  );
}

export default App;
