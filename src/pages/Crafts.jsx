import ProgressBox from "../components/ProgressBox";
import CraftBox from "../components/CraftBox";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { initDB } from "../../db/indexedDB";
import { IoIosRefresh } from "react-icons/io";
const Crafts = () => {
  const [generatedImage, setGeneratedImage] = useState(null);
  const [crafts, setCrafts] = useState([]);
  const [suggestedCrafts, setSuggestedCrafts] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const sampleImage = "https://m.media-amazon.com/images/I/A1usmJwqcOL.jpg";

  const [otherCraftsArray, setOtherCraftsArray] = useState([]);

  const loadCraftsFromTempAIOther = async () => {
    try {
      const db = await initDB();
      const tx = db.transaction("tempAIOther", "readonly");
      const store = tx.objectStore("tempAIOther");
  
      const request = store.getAll();
      request.onsuccess = () => {
        setOtherCraftsArray(request.result);
      };
    } catch (err) {
      console.error("Failed to load tempAIOther crafts:", err);
    }
  };
  useEffect(() => {
    const load = async () => {
      await loadCraftsFromIndexedDB();
      await loadCollectionsFromIndexedDB();
      await loadCraftsFromTempAIOther(); // Add this

      await generateInitialOtherSuggestions();
    };
    load();
  }, []);

  const createOtherSuggestion = async (collections) => {
    try {
      const db = await initDB();
      const txCheck = db.transaction("tempAIOther", "readonly");
      const storeCheck = txCheck.objectStore("tempAIOther");
      const countRequest = storeCheck.count();
  
      countRequest.onsuccess = async () => {
        if (countRequest.result >= 4) {
          console.log("Reached 4 suggestions. Skipping creation.");
          return;
        }
  
        const formattedItems = collections
          .map((item, idx) =>
            `Item ${idx + 1}:\nName: ${item.name}\nDescription: ${item.description}`
          )
          .join("\n\n");
  
        const prompt = `
          You are given a list of recycled crafts with their names and descriptions. 
          Use inspiration from at least two of them to suggest **one new craft idea**.
  
          Respond strictly in this JSON format:
          {
            "name": "string",
            "description": "string",
            "steps": ["string", "string", "string"],
            "image": ""
          }
  
          Do NOT use triple backticks or any Markdown formatting.
          It must be reiterated that the start of the output should NOT start with \`\`\`JSON or end with \`\`\` either.
  
          Here are the crafts:
          ${formattedItems}
        `;
  
        const res = await axios.post(`https://${import.meta.env.VITE_API_URL}/gemini/text`, { prompt });
        const reply = res.data.reply.text.trim();
        const parsed = JSON.parse(reply);
  
        // Generate image
        const imagePrompt = `Generate an image for a recycled craft project called "${parsed.name}". It is described as: ${parsed.description}`;
        try {
          const imageRes = await axios.post(`https://${import.meta.env.VITE_API_URL}/gemini/image`, { prompt: imagePrompt });
          const imageReply = imageRes.data.reply;
          parsed.image = `data:${imageReply.mimeType};base64,${imageReply.image}`;
        } catch {
          parsed.image = sampleImage;
        }
  
        const tx = db.transaction("tempAIOther", "readwrite");
        const store = tx.objectStore("tempAIOther");
  
        const request = store.add({
          title: parsed.name,
          description: parsed.description,
          image: parsed.image,
          steps: parsed.steps,
          materials: parsed.name,
          progress: 0,
        });
  
        request.onsuccess = () => {
          console.log("Saved generated craft to tempAIOther");
          loadCraftsFromTempAIOther();
        };
      };
  
      countRequest.onerror = () => {
        console.error("Error checking tempAIOther count");
      };
    } catch (error) {
      console.error("Failed to generate suggestion:", error);
    }
  };
  

  const generateInitialOtherSuggestions = async () => {
    try {
      const db = await initDB();
      const tx = db.transaction("tempAIOther", "readonly");
      const store = tx.objectStore("tempAIOther");
  
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = async () => {
        const existing = getAllRequest.result;
        const remaining = 4 - existing.length;
  
        if (remaining <= 0) {
          console.log("Already have 4 other suggestions. Skipping.");
          return;
        }
  
        const collections = await loadCollectionsForSuggestions(); // see next step
        for (let i = 0; i < remaining; i++) {
          await createOtherSuggestion(collections);
        }
      };
    } catch (err) {
      console.error("Error generating batch:", err);
    }
  };

  const loadCollectionsForSuggestions = async () => {
    try {
      const db = await initDB();
      const tx = db.transaction("collections", "readonly");
      const store = tx.objectStore("collections");
  
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = reject;
      });
    } catch (err) {
      console.error("Failed to load collections:", err);
      return [];
    }
  };

  const clearTempAIOther = async () => {
    try {
      const db = await initDB();
      const tx = db.transaction("tempAIOther", "readwrite");
      const store = tx.objectStore("tempAIOther");
  
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        console.log("Cleared tempAIOther store");
        setOtherCraftsArray([]); // Reset UI
        generateInitialOtherSuggestions(); // Regenerate
      };
    } catch (err) {
      console.error("Failed to clear tempAIOther:", err);
    }
  };

  //Remove (addSampleCraftToIndexedDB + addSampleCollectionsToIndexedDB) after everything finishes
  const addSampleCraftToIndexedDB = async () => {
    try {
      const db = await initDB();
      const tx = db.transaction("crafts", "readwrite");
      const store = tx.objectStore("crafts");

      await store.put({
        id: 1, // Ensure ID is added if needed for deletion
        title: "Sample Craft",
        image: sampleImage,
        materials: "Plastic bottle, soil, plant",
        steps: "1. Cut bottle\n2. Add soil\n3. Plant seeds",
        description: "A bottle reused as a planter",
        progress: 20,
      });

      await tx.complete;
      console.log("Sample craft added successfully");
    } catch (error) {
      console.error("Failed to add craft:", error);
    }
  };

  const addSampleCollectionsToIndexedDB = async () => {
    try {
      const db = await initDB();
      const tx = db.transaction("collections", "readwrite");
      const store = tx.objectStore("collections");

      const sampleCollections = [
        {
          name: "Bottle Bird Feeder",
          image: "https://example.com/bottle-bird.jpg",
          description:
            "A bird feeder made from a plastic bottle and wooden spoons.",
          used: false,
        },
        {
          name: "Can Lantern",
          image: "https://example.com/can-lantern.jpg",
          description: "A lantern made by punching holes in recycled cans.",
          used: false,
        },
        {
          name: "Cardboard Organizer",
          image: "https://example.com/cardboard-organizer.jpg",
          description: "A desk organizer crafted from old cardboard boxes.",
          used: false,
        },
        {
          name: "CD Mosaic Art",
          image: "https://example.com/cd-mosaic.jpg",
          description: "A mosaic artwork created from broken CD pieces.",
          used: false,
        },
        {
          name: "Jar Herb Garden",
          image: "https://example.com/jar-herb.jpg",
          description: "Mason jars reused for planting kitchen herbs.",
          used: false,
        },
      ];

      for (const item of sampleCollections) {
        await store.put(item);
      }

      await tx.complete;
      console.log("Sample collections added successfully.");
    } catch (error) {
      console.error("Failed to add sample collections:", error);
    }
  };

  //Handle delete button on progressBox
  const handleDeleteCraft = async (id) => {
    try {
      const db = await initDB();
      const tx = db.transaction("crafts", "readwrite");
      const store = tx.objectStore("crafts");

      await store.delete(id);

      tx.oncomplete = () => {
        console.log(`Craft with id ${id} deleted`);
        setCrafts((prev) => prev.filter((c) => c.id !== id));
      };

      tx.onerror = (e) => console.error("Delete error", e);
    } catch (error) {
      console.error("IndexedDB delete error:", error);
    }
  };

  //Handle save button on craftBox
  const handleSaveCraft = (newCraft) => {
    setCrafts((prev) => [...prev, newCraft]);
  };

  //Retrieve craft data from IDB
  const loadCraftsFromIndexedDB = async () => {
    try {
      const db = await initDB();
      const tx = db.transaction("crafts", "readonly");
      const store = tx.objectStore("crafts");

      const craftsArray = [];
      const request = store.openCursor();

      request.onsuccess = async (event) => {
        const cursor = event.target.result;
        if (cursor) {
          craftsArray.push(cursor.value);
          cursor.continue();
        } else {
          setCrafts(craftsArray);
        }
      };

      request.onerror = (e) => {
        console.error("Error loading crafts:", e);
      };
    } catch (err) {
      console.error("IndexedDB error:", err);
    }
  };

  //Retrieve Collections from idb
  const loadCollectionsFromIndexedDB = async () => {
    try {
      const db = await initDB();
      const tx = db.transaction("collections", "readonly");
      const store = tx.objectStore("collections");

      const collectionsArray = [];
      const request = store.openCursor();

      request.onsuccess = async (event) => {
        const cursor = event.target.result;
        if (cursor) {
          collectionsArray.push(cursor.value);
          cursor.continue();
        } else {
          if (collectionsArray.length >= 2) {
            await createSuggestions(collectionsArray);
          }
        }
      };

      request.onerror = (e) => {
        console.error("Error loading collections:", e);
      };
    } catch (err) {
      console.error("IndexedDB error:", err);
    }
  };

  //Generate Text + Image
  const createSuggestions = async (collections) => {
    setSuggestedCrafts([]); // clear previous
    setLoadingSuggestions(true); // show loading state

    for (let i = 0; i < 4; i++) {
      const formattedItems = collections
        .map(
          (item, idx) =>
            `Item ${idx + 1}:\nName: ${item.name}\nDescription: ${
              item.description
            }`
        )
        .join("\n\n");

      const prompt = `
        You are given a list of recycled items with their names and descriptions. Use inspiration from at least two of them to suggest **one** new craft idea.
        Mind the size of the item and how it can be used regarding the size.

        Respond strictly in this text string format:
        {
          "craft": {
            "name": "string",
            "description": "string",
            "steps": ["string", "string", "string", "string"]
          }
        }

        Do NOT use triple backticks or any Markdown formatting.
        It must be reiterated that the start of the output should NOT start with \`\`\`JSON or end with \`\`\` either.

        Here are the crafts:
        ${formattedItems}
      `;

      try {
        const res = await axios.post(`https://${import.meta.env.VITE_API_URL}/gemini/text`, { prompt });
        const reply = res.data.reply.text.trim();
        const parsed = JSON.parse(reply);
        const craft = parsed.craft;

        // Generate image
        const imagePrompt = `Generate an image for a recycled craft project called "${craft.name}". It is described as: ${craft.description}`;
        try {
          const imageRes = await axios.post(`https://${import.meta.env.VITE_API_URL}/gemini/image`, {
            prompt: imagePrompt,
          });
          const imageReply = imageRes.data.reply;
          craft.image = `data:${imageReply.mimeType};base64,${imageReply.image}`;
        } catch {
          craft.image = sampleImage;
        }

        // Render each immediately
        setSuggestedCrafts((prev) => [...prev, craft]);
      } catch (error) {
        console.error("Failed to generate suggestion:", error);
      }
    }

    setLoadingSuggestions(false); // all done
  };

  useEffect(() => {
    const load = async () => {
      await loadCraftsFromIndexedDB();
      await loadCollectionsFromIndexedDB();
    };
    load();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">In Progress</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {crafts.map((craft) => (
            <ProgressBox
              key={craft.id}
              id={craft.id}
              item={craft.title}
              image={craft.image || sampleImage}
              progress={craft.progress}
              onDelete={handleDeleteCraft}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Other Possible Crafts</h1>
          {loadingSuggestions ? (
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-base">
                Generating more ideas...
              </span>
              <div className="w-5 h-5 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <button className="text-2xl text-gray-600 hover:text-black transition" onClick={clearTempAIOther}><IoIosRefresh /></button>
          )}
        {/* <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Other Possible Crafts</h1>
            <button className="text-2xl text-gray-600 hover:text-black transition" onClick={clearTempAIOther}><IoIosRefresh /></button>
            </div>
          <div className="grid grid-cols-4 gap-4">
          {otherCraftsArray.length === 0 ? ( 
       <p className="text-lg col-span-4">Loading...</p>
     ) : (
       otherCraftsArray.map((craft, index) => (
         <CraftBox
           key={index}
           item={craft.title}
           description={craft.description}
           steps={craft.steps}
           image={craft.image || sampleImage}
           saved={false}
           onSave={handleSaveCraft}
         />
       ))
     )}*/}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {suggestedCrafts.map((craft, index) => (
            <CraftBox
              key={index}
              item={craft.name}
              description={craft.description}
              steps={craft.steps}
              image={craft.image || sampleImage}
              saved={false}
              onSave={handleSaveCraft}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Crafts;
