const CraftStepCard = ({StepNumber, StepTitle, StepDescription, isClicked, onClick}) => {
    
  return(
        <>
        <div 
             className={`w-full h-fit rounded-xl shadow-lg flex flex-col px-6 py-4 transition-colors duration-300
                         ${isClicked ? 'bg-green-200' : 'bg-white'}`}>
          
            <div className="flex gap-6 items-center">
              
              <div className="flex justify-right">
            <input 
                type="checkbox" 
                className="checkbox checkbox-success" 
                 checked={isClicked}
                 onChange={onClick} />
                </div>
                <div className="flex flex-col">
            <div className="font-bold flex items-center gap-2">
                Step {StepNumber} 
                
            </div>
            <div>
              <p className="whitespace-pre-line">
              {StepDescription}
              </p>
            </div>
            </div>
            </div>
            </div>
           
        
      </>
  );
}

export default CraftStepCard;