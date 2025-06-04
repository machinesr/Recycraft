import { FaHammer } from "react-icons/fa6";
import { FaBookmark, FaRegBookmark } from "react-icons/fa";
import { initDB } from "../../db/indexedDB";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const CraftBox = (props) => {
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (props.saved) setSaved(true);
  }, [props.saved]);





  const saveCraftToIndexedDB = async (
      itemName,
      itemDesc,
      itemSteps,
      itemImage,
      itemMat
    ) => {
      const db = await initDB();
      const tx = db.transaction("crafts", "readwrite");
      const store = tx.objectStore("crafts");
     
      const craftData = {
        title: itemName,
        description: itemDesc,
        steps: itemSteps,
        image: itemImage,
        progress: 0, // starting progress
        materials: itemMat
      };
      

    

    return new Promise((resolve, reject) => {
      const request = store.add(craftData);
      request.onsuccess = (e) => {
        const newId = e.target.result;
        console.log("Saved to DB with id:", newId);
        setSaved(true);
        setSavedId(newId);
        if (props.onSave) props.onSave({ ...craftData, id: newId });
        resolve(newId);
      };
      request.onerror = (e) => reject(e);
    });
  };

  const removeCraftFromIndexedDB = async () => {
    if (savedId == null) {
      console.warn("Cannot delete: No saved ID found");
      return;
    }

    const db = await initDB();
    const tx = db.transaction("crafts", "readwrite");
    const store = tx.objectStore("crafts");

    const request = store.delete(savedId);

    request.onsuccess = () => {
      console.log("Removed from DB");
      setSaved(false);
      setSavedId(null);
    };
    request.onerror = (e) => console.error("Delete error", e);
  };

  

  const checkMatUsedCollectionDB = async(matId) =>{
    const db = await initDB()
    const tx = db.transaction("collections", "readwrite")
    const store = tx.objectStore("collections")

    const request = store.openCursor();

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const item = cursor.value;
        if (item.name === matId) {
          item.used = true;
          cursor.update(item);
          console.log("Material:", item.name);
        }
        cursor.continue();
      } else {
        console.log("Said materials marked as used");
      }
    };

    request.onerror = (event) => {
      console.error("Error marking materials as used", event.target.error);
    };
  }

  const toggleSave = () => {
    if (saved) {
      removeCraftFromIndexedDB();
    } else {
      saveCraftToIndexedDB(
        props.item,
        props.description,
        props.steps,
        props.image,
        props.materials,
        props.image,
      );
      checkMatUsedCollectionDB(props.materials);
    }
  };

  

  const handleCraftClick = async () => {
    if (saved) {
      navigate(`/viewdetails/${savedId}`);
    } else {
      try {
        const newId = await saveCraftToIndexedDB(
          props.item,
          props.description,
          props.steps,
          props.image,
          props.materials
        );
        checkMatUsedCollectionDB(props.materials);
        navigate(`/viewdetails/${newId}`);
      } catch (e) {
        console.error("Failed to auto-save before navigating:", e);
      }
    }
  };

  return (
    <div className="card w-full bg-base-100 shadow-lg p-4 mx-auto h-full">
      <div className="rounded-lg overflow-hidden mb-2">
        <img
          src={props.image}
          alt={props.item}
          className="h-40 w-full object-cover rounded-lg max-sm:h-32"
        />
      </div>

      <div className="card-body p-1">
        <div className="flex justify-between items-start mb-1 max-sm:flex-col max-sm:gap-2">
          <h2 className="card-title text-lg">{props.item}</h2>
          <h1
            className="text-lg transition-colors cursor-pointer pt-2:text-emerald-600"
            onClick={toggleSave}
          >
            {saved ? (
              <FaBookmark className="text-emerald-600" />
            ) : (
              <FaRegBookmark />
            )}
          </h1>
        </div>

        <p className="text-sm text-gray-600 mb-4 max-sm:text-xs max-sm:mb-2">
          {props.description}
        </p>

        <button
          onClick={handleCraftClick}
          className="btn btn-ghost btn-sm w-full flex items-center justify-center gap-2 border mt-1 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition rounded-md
                          max-sm:text-sm"
        >
          <FaHammer className="text-lg" />
          Craft
        </button>
      </div>
    </div>
  );
};

export default CraftBox;
