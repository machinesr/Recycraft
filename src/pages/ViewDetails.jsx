import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { initDB } from "../../db/indexedDB";
import CraftImageCard from "../components/CraftImageCard";
import CraftCard from "../components/CraftCard";
import CraftStepCard from "../components/CraftStepCard";
import BigProgressBar from "../components/BigProgressBar";

const ViewDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [craft, setCraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stepProgress, setStepProgress] = useState(0);

  const updateCraftProgress = async (craftId, progressValue) => {
    try {
      const db = await initDB();
      const tx = db.transaction("crafts", "readwrite");
      const store = tx.objectStore("crafts");

      const craft = await new Promise((resolve, reject) => {
        const req = store.get(craftId);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (craft) {
        craft.progress = Math.floor((progressValue / steps.length) * 100);
        await store.put(craft);
        await tx.complete;
        console.log("Craft progress updated:", craft.progress);
      }
    } catch (err) {
      console.error("Failed to update craft progress:", err);
    }
  };

  const deleteCraft = async (craftId) => {
    try {
      const db = await initDB();
      const tx = db.transaction("crafts", "readwrite");
      const store = tx.objectStore("crafts");
      await store.delete(craftId);
      await tx.complete;
      console.log("Craft deleted.");
      navigate("/crafts"); // Redirect after deletion
    } catch (err) {
      console.error("Failed to delete craft:", err);
    }
  };

  useEffect(() => {
    const fetchCraft = async () => {
      try {
        const db = await initDB();
        const tx = db.transaction("crafts", "readonly");
        const store = tx.objectStore("crafts");
        const request = store.get(Number(id));

        request.onsuccess = () => {
          const result = request.result;

          setCraft(result);

          let stepsLength = 0;
          if (Array.isArray(result.steps)) {
            stepsLength = result.steps.length;
          } else if (typeof result.steps === "string") {
            stepsLength = result.steps.split("\n").length;
          }

          const completedSteps = Math.floor(
            (result.progress / 100) * stepsLength
          );
          setStepProgress(completedSteps);
          setLoading(false);
        };

        request.onerror = (e) => {
          console.error("Failed to get craft:", e);
          setLoading(false);
        };
      } catch (error) {
        console.error("IndexedDB error:", error);
        setLoading(false);
      }
    };

    fetchCraft();
  }, [id]);

  if (loading) return <p className="text-center">Loading craft...</p>;
  if (!craft) return <p className="text-center">Craft not found.</p>;

  const steps = Array.isArray(craft.steps)
    ? craft.steps
    : typeof craft.steps === "string"
    ? craft.steps.split("\n")
    : [];

  const barProgress = Math.floor((stepProgress / steps.length) * 100);
  const allStepsCompleted = stepProgress === steps.length;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Craft Description</h1>
      <div className="flex gap-4">
        <CraftImageCard CraftImage={craft.image} />
        <CraftCard
          CraftName={craft.title}
          CraftDescription={craft.description}
          CraftMaterials={craft.materials}
        />
      </div>
      <div className="flex flex-col gap-4 w-full">
        <h2 className="text-xl flex items-center font-semibold">
          Instructions ({stepProgress}/{steps.length})
        </h2>
        <BigProgressBar progress={barProgress} />
      </div>
      {steps.map((step, index) => (
        <CraftStepCard
          key={index}
          StepNumber={index + 1}
          StepTitle=""
          StepDescription={step}
          isClicked={index < stepProgress}
          onClick={() => {
            if (index === stepProgress) {
              const newProgress = stepProgress + 1;
              setStepProgress(newProgress);
              updateCraftProgress(Number(id), newProgress);
            }
          }}
        />
      ))}

      <button
        className={`mt-4 px-6 py-2 rounded-lg font-semibold transition ${
          allStepsCompleted
            ? "bg-green-500 text-white hover:bg-green-600"
            : "bg-gray-300 text-gray-600 cursor-not-allowed"
        }`}
        disabled={!allStepsCompleted}
        onClick={() => {
          if (allStepsCompleted) {
            deleteCraft(Number(id));
          }
        }}
      >
        Finish
      </button>
    </div>
  );
};

export default ViewDetails;
