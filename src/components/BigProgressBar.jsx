const BigProgressBar = ({progress}) => {
  return (
      <>
        <div className="w-full h-full rounded-xl bg-white shadow-lg flex items-center p-4 gap-4 font-bold">
            Progress
            <div className="flex-1 h-3 rounded bg-gray-200 ">
            <div className="flex h-3 rounded bg-emerald-500"
                            style={{ width: `${progress}%`}}>
            </div>
            </div>
           {progress}%
        </div>
      </>
  );
}

export default BigProgressBar;