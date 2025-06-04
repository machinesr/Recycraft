import BigProgressBar from "../components/BigProgressBar";
import CraftCard from "../components/CraftCard";
import chido from "../assets/react.svg";
import CraftImageCard from "../components/CraftImageCard";
import CraftStepCard from "../components/CraftStepCard";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { initDB } from "../../db/indexedDB";

const Crafts = () => {
  const location = useLocation();
  const craft = location.state?.craft;
  const steps = craft?.steps;

  const callCraft = async () => {
    const db = await initDB();
    const tx = db.transaction("crafts", "readonly");
    const store = tx.objectStore("crafts");

    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const allCrafts = request.result;
        const foundCraft = allCrafts.find((craft) => craft.name === craftName);
        if (foundCraft) {
          resolve(foundCraft.materials); // or any other attribute you want
        } else {
          resolve(null); // or reject("Craft not found")
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  };

  console.log(" gfdsagfdsjgfdsja", callCraft());

  const [clickedSteps, setClickedSteps] = useState(() =>
    steps ? steps.map(() => false) : []
  );
  const handleStepClick = (index) => {
    const updated = [...clickedSteps];
    updated[index] = !updated[index];
    setClickedSteps(updated);
  };

  const StepProgress = clickedSteps.filter(Boolean).length;
  const barProgress = Math.floor((StepProgress / steps.length) * 100);

  return (
    <>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Craft Details</h1>
        <div className="flex flex-row gap-4">
          <CraftImageCard CraftImage={craft.image} />
          <CraftCard
            CraftName={craft.name}
            CraftDescription={craft.description}
            CraftMaterials={callCraft()}
          />
        </div>
        <div className="flex flex-col gap-4 w-full">
          <h1 className="text-2xl flex items-center font-semibold">
            Instructions ({StepProgress}/{steps.length})
          </h1>
          <BigProgressBar progress={barProgress} />
        </div>
        {steps.map((step, index) => (
          <CraftStepCard
            key={index}
            StepNumber={index + 1}
            StepTitle=""
            StepDescription={step}
            isClicked={clickedSteps[index]}
            onClick={() => handleStepClick(index)}
          />
        ))}
      </div>
    </>
  );
};

export default Crafts;
