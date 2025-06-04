import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";
import { initDB } from "../db/indexedDB";
import { useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Camera from "./pages/Camera";
import Collection from "./pages/Collection";
import Crafts from "./pages/Crafts";
import CraftDetails from "./pages/CraftDetails";
import NotFound from "./pages/NotFound";
import Camera_Results from "./pages/Camera_Results";
import ViewDetails from "./pages/ViewDetails";

function App() {
  useEffect(() => {
    initDB()
      .then((db) => {
        console.log("Database initialized", db);
      })
      .catch((err) => {
        console.error("DB init error:", err);
      });
  }, []);

  return (
    <>
      <div className="w-screen h-screen flex flex-row overflow-hidden">
        <Sidebar />
        <div className="flex-1 bg-gray-100 px-6 py-8 z-0 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/camera" replace />} />

            <Route path="/camera" element={<Camera />} />
            <Route path="/camera_results" element={<Camera_Results />} />
            <Route path="/collection" element={<Collection />} />
            <Route path="/crafts" element={<Crafts />} />
            <Route path="/craftdetails" element={<CraftDetails />} />
            <Route path="/viewdetails/:id" element={<ViewDetails />} />
            <Route path="/404" element={<NotFound />} />

            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </div>
      </div>
    </>
  );
}

export default App;
