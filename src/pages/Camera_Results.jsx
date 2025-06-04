import CraftBox from "../components/CraftBox";
import { useState, useEffect } from "react";
import { initDB } from "../../db/indexedDB";
import axios from "axios";
import Crafts from "./CraftDetails";
import { IoIosRefresh } from "react-icons/io";

const Camera_Results = () => {
  const [imageSrc, setImageSrc] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [craftsArray, setCraftsArray] = useState([]);
  const [multiCraftsArray, setMultiCraftsArray] = useState([]);
  const [itemDetails, setItemDetails] = useState(null);
  const [suggestionBatchStarted, setSuggestionBatchStarted] = useState(false);
  const [multiSuggestionBatchStarted, setMultiSuggestionBatchStarted] =
    useState(false);
  const [objectDetected, setObjectDetected] = useState(false);
  const [isLoadingSimpleSuggestions, setIsLoadingSimpleSuggestions] =
    useState(true);
  const [isLoadingMultifacet, setIsLoadingMultifacet] = useState(true);
  // const [genImageBase64, setGenImageBase64] = useState(null);  // this state isn't used anywhere
  const [genImageSrc, setGenImageSrc] = useState(null);
  const sampleImage = "https://m.media-amazon.com/images/I/A1usmJwqcOL.jpg";

  useEffect(() => {
    loadImage();
    loadCraftsFromTempAI();
    loadCraftsFromTempAIMulti();
  }, []);

  useEffect(() => {
    const hey = async () => {
      const itemDetailsExists = await checkCamAi();
      if (itemDetailsExists.length > 0) {
        const renderItemDetails = {
          name: itemDetailsExists[0].name,
          description: itemDetailsExists[0].description,
          size_estimate: itemDetailsExists[0].size,
          recyclable: itemDetailsExists[0].recyclable,
        };
        setItemDetails(renderItemDetails);
        setObjectDetected(true);
      } else if (imageBase64 && !objectDetected) {
        detectObject(imageBase64);
        setObjectDetected(true);
      }
    };
    hey();
  }, [imageBase64]);

  useEffect(() => {
    if (itemDetails && imageBase64 && !suggestionBatchStarted) {
      if (itemDetails.recyclable) {
        generateInitialSuggestions();
        saveDetails();
        saveCameraAi();
      }
      setSuggestionBatchStarted(true);
    }

    if (itemDetails && !multiSuggestionBatchStarted) {
      if (itemDetails.recyclable) {
        generateInitialMultiSuggestions();
      }
      setMultiSuggestionBatchStarted(true);
    }
  }, [itemDetails, imageBase64]);

  const checkCamAi = async () => {
    const db = await initDB();
    const tx = db.transaction("cameraTemp", "readonly");
    const store = tx.objectStore("cameraTemp");

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result); // This is an array of all stored objects
      };

      request.onerror = (event) => {
        reject("Failed to get all items: " + event.target.error);
      };
    });
  };

  const loadImage = async () => {
    const db = await initDB();
    const tx = db.transaction("camera", "readonly");
    const store = tx.objectStore("camera");

    const request = store.get(1); // fixed ID

    request.onsuccess = async (e) => {
      const record = e.target.result;
      if (record) {
        if (typeof record.image === "string" && isBase64File(record.image)) {
          const objectURL = base64ToBlobUrl(record.image, "image/jpeg");
          setImageBase64(record.image);
          setImageSrc(objectURL);
        } else if (record.image instanceof Blob) {
          const base64 = await blobToBase64(record.image);
          const objectURL = URL.createObjectURL(record.image);
          setImageBase64(base64);
          setImageSrc(objectURL);
        } else {
          console.warn("Unsupported image format in store");
        }
      }
    };

    request.onerror = (e) => {
      console.error("Failed to load image:", e);
    };
  };

  // Checks if image is base64
  function isBase64File(str) {
    return (
      typeof str === "string" &&
      str.startsWith("data:") &&
      str.includes("base64,")
    );
  }

  // Create blob url from base64 for render
  function base64ToBlobUrl(base64, contentType = "") {
    const byteCharacters = atob(base64.split(",")[1] || base64);
    const byteArrays = [];

    for (let i = 0; i < byteCharacters.length; i += 512) {
      const slice = byteCharacters.slice(i, i + 512);
      const byteNumbers = new Array(slice.length)
        .fill(0)
        .map((_, j) => slice.charCodeAt(j));
      byteArrays.push(new Uint8Array(byteNumbers));
    }

    const blob = new Blob(byteArrays, { type: contentType });
    return URL.createObjectURL(blob);
  }

  //  // Converts blob file to base64
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(",")[1]); // strip the data:image/... part
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Converts base64 to blob
  const base64ToBlob = (base64Data) => {
    const mime = "image/png";
    const byteCharacters = atob(base64Data);
    const byteArrays = [];

    for (let i = 0; i < byteCharacters.length; i += 512) {
      const slice = byteCharacters.slice(i, i + 512);
      const byteNumbers = new Array(slice.length);
      for (let j = 0; j < slice.length; j++) {
        byteNumbers[j] = slice.charCodeAt(j);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: mime });
  };

  const saveDetails = async () => {
    const db = await initDB();
    const transaction = db.transaction("collections", "readwrite");
    const store = transaction.objectStore("collections");
    const imageBlob = base64ToBlob(imageBase64);

    const readAll = await new Promise((resolve, reject) => {
      const readReq = store.getAll();
      readReq.onsuccess = () => resolve(readReq.result);
      readReq.onerror = () => reject(readReq.error);
    });
    const found = readAll.some((item) => item.name === itemDetails.name);
    if (!found) {
      const request = await store.put({
        name: itemDetails.name,
        image: imageBlob,
        description: itemDetails.description,
        used: 0,
      });
      request.onerror = (error) =>
        console.error("Failed to put descriptions in collection idb", error);
      request.onsuccess = () =>
        console.log("Descriptions successfully in collections idb");
    }
  };

  const saveCameraAi = async () => {
    const db = await initDB();
    const tx = db.transaction("cameraTemp", "readwrite");
    const store = tx.objectStore("cameraTemp");

    const request = store.put({
      id: 1,
      name: itemDetails.name,
      description: itemDetails.description,
      size: itemDetails.size_estimate,
      recyclable: itemDetails.recyclable,
    });
    request.onerror = (error) =>
      console.error("Failed to keep temporary details in camera idb", error);
    request.onsuccess = () =>
      console.log("temporary details successfully in cameraidb");
  };

  // --------------------------------------------------------------------------------------------------------------------------------------
  const detectObject = async (image) => {
    const prompt = `
      Analyze the image and return the most likely object it depicts. Focus on clear and identifiable features of the object. 
      If the object is in a container, do not confuse it with common bottles or jars. 
      If the object is being held by a hand, do not focus on anything else in the background

      Strictly follow this format below. Do not include any commentary or explanation, only the string text block with no other formatting in this template:

      {
        "name": "string",                // The name of the item detected
        "description": "string",         // A detailed description of the item, 5-6 sentences, imagine the user isn't able to see the image and you need to describe it to a blind man. ignoring the environment of the item. describe it straightforwardly skipping buzzwords and start with an immediate "A/An...", no saying what is "visible", just say it how it is and describe the image instead of trying to tell someone what you see. Avoid pronoun usage. Include a size estimate in the description as well, match it with the next attribute. (L x W x H, e.g., "30cm x 20cm x 10cm"
        "size_estimate": "string",       // Estimate the size in the format L x W x H, e.g., "30cm x 20cm x 10cm"
        "recyclable": true | false       // Use a boolean: true if it can be reused/recycled, false if not. Recyclable is defined by the ability to make something new from the current item being parsed. avoid marking true if the item is organic, looks expensive, or looks like absolute junk that has barely any uses and cannot be made into much stuff.
      }

      Do NOT use triple backticks or any Markdown formatting.
      It must be reiterated that the start of the output should NOT start with \`\`\`JSON or end with \`\`\` either.
      `;
    try {
      const res = await axios.post(`https://${import.meta.env.VITE_API_URL}/gemini/text`, { prompt, image });
      const reply = res.data.reply.text;
      console.log(`https://${import.meta.env.VITE_API_URL}/gemini/text`);

      // Attempt to parse the AI's response as JSON
      let parsed;
      try {
        parsed = JSON.parse(reply);
        setItemDetails(parsed);

        console.log("Parsed Gemini object detection:", parsed);
      } catch (jsonError) {
        console.error("Failed to parse Gemini reply as JSON:", jsonError);
        console.log("Raw reply from Gemini:", reply);
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
    }
  };

  const loadCraftsFromTempAI = async () => {
    const db = await initDB();
    const tx = db.transaction("tempAI", "readonly");
    const store = tx.objectStore("tempAI");

    const request = store.getAll();
    request.onsuccess = () => {
      setCraftsArray(request.result);
    };
  };

  const clearTempAI = async () => {
    const db = await initDB();
    const tx = db.transaction("tempAI", "readwrite");
    const store = tx.objectStore("tempAI");

    const clearRequest = store.clear();

    clearRequest.onsuccess = () => {
      console.log("Cleared tempAI store");
      setCraftsArray([]); // Reset UI list
      setSuggestionBatchStarted(false); // Allow regenerate
      generateInitialSuggestions(); // Trigger regeneration
    };

    clearRequest.onerror = (e) => {
      console.error("Failed to clear tempAI store:", e);
    };
  };

  const createSuggestion = async (image) => {
    const blockedCraftNames = craftsArray.map((craft) => craft.title);

    const prompt = `
      You are to analyze an array of recyclable materials and return one of several possible recyclable ideas made out of it, including the individual parts of the object you can separate from the main object. You are not needed to use to whole object, but you can use only a part of the object given.
      Think creatively and provide new ideas. Avoid repeating suggestions.

      Strictly follow this format below. Do not include any commentary or explanation, only the string text block with no other formatting in this template:

      {
        "name": "string",         // Name of decided craft
        "description": "string",  // Concise description of craft, 1-2 sentences. Assume the user does not have an image of the craft and is only able to use this description as a means of seeing the object.
        "image": "string",        // Leave empty on output for now
        "steps": [                // Steps as to what the user must do in order to make this craft by themselves.
          "string",       
          "string",
          "string"                // There can be more than 3 steps if needed. make the steps detailed 
        ]
      }

      Do NOT use triple backticks or any Markdown formatting.
      It must be reiterated that the start of the output should NOT start or end with \`\`\` either.
      Dont create the things that are already listed in this list of names, and ones that serve the same function: ${JSON.stringify(
        blockedCraftNames
      )}.
    `;

    try {
      const res = await axios.post(`https://${import.meta.env.VITE_API_URL}/gemini/text`, { prompt, image });

      const reply = res.data.reply.text;

      // // Getting stored itemDetails.name
      // const db = await initDB();
      // const tx = db.transaction("camera", "readonly");
      // const store = tx.objectStore("camera");
      // const materialName = store.get(1);

      let parsed;
      try {
        const parsed = JSON.parse(reply);
        const imageSrc = await generateImage(parsed.name, parsed.description);
        parsed.image = imageSrc;
        parsed.progress = 0;

        const db = await initDB();
        const tx = db.transaction("tempAI", "readwrite");
        const store = tx.objectStore("tempAI");
        const request = store.add({
          title: parsed.name,
          description: parsed.description,
          image: parsed.image,
          steps: parsed.steps,
          progress: parsed.progress,
          materials: itemDetails.name,
        });

        request.onsuccess = () => {
          console.log("Saved generated craft to tempAI");
          loadCraftsFromTempAI();
        };

        console.log("Parsed Gemini suggestion:", genImageSrc);
      } catch (jsonError) {
        console.error("Failed to parse Gemini reply as JSON:", jsonError);
        console.log("Raw reply from Gemini:", reply);
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
    }
  };

  //1
  const generateInitialSuggestions = async () => {
    setIsLoadingSimpleSuggestions(true);
    const db = await initDB();
    const tx = db.transaction("tempAI", "readonly");
    const store = tx.objectStore("tempAI");

    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = async () => {
      const existing = getAllRequest.result;
      const remaining = 4 - existing.length;

      if (remaining <= 0) {
        console.log("Already have 4 suggestions. Skipping generation.");
        setIsLoadingSimpleSuggestions(false);
        return;
      }

      for (let i = 0; i < remaining; i++) {
        await createSuggestion(imageBase64);
      }

      await loadCraftsFromTempAI();
      setIsLoadingSimpleSuggestions(false);
    };

    getAllRequest.onerror = (e) => {
      console.error("Failed to count existing suggestions:", e);
      setIsLoadingSimpleSuggestions(false);
    };
  };

  const generateImage = async (item, description) => {
    const prompt = `
      Generate an image of a/an ${item}.
      Description: ${description}
      Make it photorealistic, and the only subject of the scene.
    `;

    try {
      const res = await axios.post(`https://${import.meta.env.VITE_API_URL}/gemini/image`, { prompt });
      const reply = res.data.reply;

      const imageSrc = base64ToImageSrc(reply.image, reply.mimeType);
      // console.log("Gemini image generation:", imageSrc);

      return imageSrc; // ✅ return the formatted image string
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      return null;
    }
  };

  const base64ToImageSrc = (base64, mimeType = "image/png") => {
    return `data:${mimeType};base64,${base64}`;
  };

  // --------------------------------------------------------------------------------------------------------------------------------------

  //2
  const generateInitialMultiSuggestions = async () => {
    setIsLoadingMultifacet(true);
    const db = await initDB();
    const tx = db.transaction("tempAIMulti", "readonly");
    const store = tx.objectStore("tempAIMulti");

    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = async () => {
      const existing = getAllRequest.result;
      let remaining = 4 - existing.length;
      if (remaining === 0) {
        console.log(
          "Already have 4 multifaceted suggestions. Skipping generation."
        );
        return;
      }

      for (let i = 0; i < remaining; i++) {
        const materials = await gatherMultiMat();
        console.log("array of materials used for multifaceted", materials);
        await createMultiSuggestion(materials);
      }

      await loadCraftsFromTempAIMulti();
    };

    getAllRequest.onerror = (e) => {
      console.error("Failed to count existing suggestions:", e);
    };
  };

  const loadCraftsFromTempAIMulti = async () => {
    const db = await initDB();
    const tx = db.transaction("tempAIMulti", "readonly");
    const store = tx.objectStore("tempAIMulti");

    const request = store.getAll();
    request.onsuccess = () => {
      setMultiCraftsArray(request.result);
    };
  };

  const gatherMultiMat = async () => {
    const db = await initDB();
    const tx = db.transaction("collections", "readonly");
    const store = tx.objectStore("collections");
    const index = store.index("used");
    return new Promise((resolve, reject) => {
      const request = index.getAll(IDBKeyRange.only(0));

      request.onsuccess = () => {
        const allItems = request.result;

        if (allItems.length === 0) {
          return resolve([]);
        }

        if (allItems.length === 1) {
          return resolve([allItems[0].name]);
        }

        // Sort by createdAt or ID to find the latest
        const sortedByLatest = allItems.sort(
          (a, b) => b.createdAt - a.createdAt
        ); // or `b.id - a.id`
        const latestItem = sortedByLatest[0];

        // Remove latestItem from list to avoid duplication
        const rest = allItems.filter((item) => item !== latestItem);

        // Shuffle the rest
        const shuffledRest = rest.sort(() => 0.5 - Math.random());

        // Pick up to 2 more to join latest
        const selected = [latestItem, ...shuffledRest.slice(0, 2)];

        // Extract only the desired attribute, e.g., 'name'
        const namesOnly = selected.map((item) => item.name);

        resolve(namesOnly);
      };

      request.onerror = (e) => {
        reject("Failed to fetch materials from IndexedDB: " + e.target.error);
      };
    });
  };

  const createMultiSuggestion = async (nameArray) => {
    const blockedMultiCraftNames = multiCraftsArray.map((craft) => craft.title);

    const prompt = `
      You are to analyze an array of recyclable materials and return one of several possible recyclable ideas made out of it, including the individual parts of the object you can separate from the main object. You are not needed to use to whole object, but you can use only a part of the object given.
      Think creatively and provide new ideas. Avoid repeating suggestions. 

      Use only the items in this list:
      ${JSON.stringify(nameArray)}

      Strictly follow this format below. Do not include any commentary or explanation, only the string text block with no other formatting in this template:

      {
        "name": "string",         // Name of decided craft
        "description": "string",  // Concise description of craft, 1-2 sentences. Assume the user does not have an image of the craft and is only able to use this description as a means of seeing the object.
        "image": "string",        // Leave empty on output for now
        "steps": [                // Steps as to what the user must do in order to make this craft by themselves.
          "string",       
          "string",
          "string"                // There can be more than 3 steps if needed. make the steps detailed 
        ]
      }

      Do NOT use triple backticks or any Markdown formatting.
      It must be reiterated that the start of the output should NOT start or end with \`\`\` either.
      Dont create the things that are already listed in this list of names: ${JSON.stringify(
        blockedMultiCraftNames
      )}.
    `;

    try {
      const res = await axios.post(`https://${import.meta.env.VITE_API_URL}/gemini/text`, { prompt });
      const reply = res.data.reply.text;

      let parsed;
      try {
        const parsed = JSON.parse(reply);
        const imageSrc = await generateImage(parsed.name, parsed.description);
        parsed.image = imageSrc;
        parsed.progress = 0;

        const db = await initDB();
        const tx = db.transaction("tempAIMulti", "readwrite");
        const store = tx.objectStore("tempAIMulti");
        const request = store.add({
          title: parsed.name,
          description: parsed.description,
          image: parsed.image,
          steps: parsed.steps,
          progress: parsed.progress,
          materials: nameArray,
        });

        request.onsuccess = () => {
          console.log("Saved generated craft to tempAIMulti");
          loadCraftsFromTempAIMulti();
        };

        console.log("Parsed Gemini suggestion:", genImageSrc);
      } catch (jsonError) {
        console.error("Failed to parse Gemini reply as JSON:", jsonError);
        console.log("Raw reply from Gemini:", reply);
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
    }
  };

  const clearTempAIMulti = async () => {
    const db = await initDB();
    const tx = db.transaction("tempAIMulti", "readwrite");
    const store = tx.objectStore("tempAIMulti");

    const clearRequest = store.clear();

    clearRequest.onsuccess = () => {
      console.log("Cleared tempAIMulti store");
      setMultiCraftsArray([]); // Reset UI list
      setMultiSuggestionBatchStarted(false); // Allow regenerate
      generateInitialMultiSuggestions(); // Trigger regeneration
    };

    clearRequest.onerror = (e) => {
      console.error("Failed to clear tempAIMulti store:", e);
    };
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold">Item Description</h1>

          <div className="flex flex-row items-stretch gap-4 w-full max-sm:flex-col">
            <img
              src={imageSrc}
              alt="Picture recently taken"
              className="object-cover w-1/4 rounded-lg shadow-lg max-sm:w-full"
            />
            {itemDetails ? (
              <>
                <div
                  className={`flex flex-col text-lg ${
                    itemDetails.recyclable
                      ? "text-gray-800 bg-white"
                      : "text-red-800 bg-red-100"
                  } rounded-lg p-4 shadow-md w-3/4 justify-center gap-4 max-sm:w-full`}
                >
                  <p
                    className={`text-lg font-medium ${
                      itemDetails.recyclable
                        ? "text-emerald-600 bg-emerald-100"
                        : "text-red-600 bg-red-200"
                    } px-3 py-1 rounded-full w-fit`}
                  >
                    {itemDetails.recyclable ? "Recyclable" : "Non-Recyclable"}
                  </p>
                  <div className="flex flex-col gap-4">
                    <p>
                      <strong>Item</strong>: {itemDetails.name}
                    </p>
                    <p>
                      <strong>Description</strong>: {itemDetails.description}
                    </p>
                    <p>
                      <strong>Size</strong>: {itemDetails.size_estimate}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <h1>Loading...</h1>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Simple Recycle Suggestions</h1>
            {itemDetails &&
              (itemDetails.recyclable ? (
                isLoadingSimpleSuggestions ? (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-base">
                      Generating more ideas...
                    </span>
                    <div className="w-5 h-5 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <button
                    className="text-2xl text-gray-600 hover:text-black transition"
                    onClick={clearTempAI}
                  >
                    <IoIosRefresh />
                  </button>
                )
              ) : null)}
          </div>
          <div className="flex flex-row gap-4 max-sm:flex-col">
            {itemDetails ? (
              itemDetails.recyclable ? (
                craftsArray.length > 0 ? (
                  craftsArray.map((craft, index) => (
                    <div
                      key={index}
                      className="w-full sm:w-1/2 lg:w-1/4"
                    >
                      <CraftBox
                        craft={craft}
                        item={craft.title}
                        image={craft.image || sampleImage}
                        description={craft.description}
                        steps={craft.steps}
                        aiOutput={craft}
                        saved={false}
                        materials={itemDetails.name}
                      />
                    </div>
                  ))
                ) : (
                  <h1>Loading recycle suggestions...</h1>
                )
              ) : (
                <h1>Craft is non-recyclable</h1>
              )
            ) : (
              <h1>Please wait for item details...</h1>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              Multifaceted Recycle Suggestions
            </h1>
            {itemDetails &&
              (itemDetails.recyclable ? (
                isLoadingMultifacet ? (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-base">
                      Generating more ideas...
                    </span>
                    <div className="w-5 h-5 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <button
                    className="text-2xl text-gray-600 hover:text-black transition"
                    onClick={clearTempAIMulti}
                  >
                    <IoIosRefresh />
                  </button>
                )
              ) : null)}
          </div>
          <div className="flex flex-row gap-4 max-sm:flex-col">
            {itemDetails ? (
              itemDetails.recyclable ? (
                multiCraftsArray.length > 0 ? (
                  multiCraftsArray.map((craft, index) => (
                    <div
                      key={index}
                      className="w-full sm:w-1/2 lg:w-1/4"
                    >
                      <CraftBox
                        craft={craft}
                        item={craft.title}
                        image={craft.image || sampleImage}
                        description={craft.description}
                        steps={craft.steps}
                        aiOutput={craft}
                        saved={false}
                        materials={itemDetails.name}
                      />
                    </div>
                  ))
                ) : (
                  <h1>Loading...</h1>
                )
              ) : (
                <h1>Craft is non-recyclable</h1>
              )
            ) : (
              <h1>Please wait for item details...</h1>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Camera_Results;
