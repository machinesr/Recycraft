import CollectionBox from "../components/CollectionBox";
import { useState, useEffect, useRef } from "react";
import { initDB } from "../../db/indexedDB";

const Collection = () => {

  const [box, setBox] = useState([]);
  const [sortedItems, setSortedItems] = useState([])

  // delete function
  const deleteItem= async(boxName)=>{
    const db = await initDB();
    const tx = db.transaction("collections", "readwrite")
    const store = tx.objectStore("collections")

    const request = store.getAll();
    request.onsuccess = () => {
      const allObjs = request.result

      const match = allObjs.find(obj => obj.name === boxName);
      if(match){
        store.delete(match.id)
        console.log("delete success:", allObjs);
        const awaiting = async() =>{
          const renderedBox = await fetchBox()
          const renderableBox = renderedBox.map(item =>({
            ...item,
            image: URL.createObjectURL(item.image)
          }))
          setBox(renderableBox)
        }
        awaiting()
      }
    }
  }

  // trigger a rerender after delete
  const fetchBox = async()=>{
    const db = await initDB()
    const tx = db.transaction("collections", "readwrite")
    const store = tx.objectStore("collections")

    const request = store.getAll()
    return await new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result)
      request.onerror=()=>reject(request.result)
    })
  }


  // adding test object
  // const addObj = async() => {
  //   const db = await initDB();
  //   const tx = db.transaction("collections", "readwrite");
  //   const store = tx.objectStore("collections");

  //   const request = store.put({name:"hello", image:"blob:http://localhost:5173/bbe514ad-5e6a-4654-bb18-30bc86d4338d", description:"WOWIE", used:false})
  //   return await new Promise((resolve,reject)=>{
  //     request.onsuccess=()=>{
  //       resolve(request.result)
  //       console.log("Added nicely")
  //   }
  //     request.onerror=()=>reject(request.result)
  //   })
  // }


  // loading to Object Array
  const getBoxes = async() => {
    const db = await initDB();
    const tx = db.transaction("collections", "readonly")
    const store = tx.objectStore("collections");
    
    const request = store.getAll();
    return await new Promise((resolve,reject) => {
      request.onsuccess=()=> resolve(request.result)
      request.onerror=()=> reject(request.result)
    })
  }
  useEffect(()=>{
    const awaiting = async() => {
      const allBox = await getBoxes();
      const renderableBox = allBox.map(item =>({
        ...item,
        image: URL.createObjectURL(item.image)
      }))
      setBox(renderableBox);
    }
    awaiting();
  },[])
  
  useEffect(() => {
    const sorted = [...box].sort((a, b) => a.used - b.used)
    setSortedItems(sorted);
  }, [box]);

  console.log("box", box);

  
  if (sortedItems.length === 0) {
    return <p>No items at this time</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">All items</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sortedItems
        .map((item, index) => (
          <CollectionBox
            key={index}
            name={item.name}
            image={item.image}
            used={item.used}
            onDelete={deleteItem} 
          />
        ))}
      </div>
    </div>
  );
};

export default Collection;
