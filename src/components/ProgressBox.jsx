import { IoSearch } from "react-icons/io5";
import { FaRegTrashCan } from "react-icons/fa6";
import { Link } from "react-router-dom";

const ProgressBox = ({ id, item, image, progress, onDelete }) => {
  return (
    <div className="card w-full max-w-sm bg-base-100 shadow-lg p-4 mx-auto">
      <div className="rounded-lg overflow-hidden mb-2">
        <img
          src={image}
          alt={item}
          className="h-40 w-full object-cover rounded-lg"
        />
      </div>

      <div className="card-body p-1 flex flex-col justify-between">
        <div className="flex justify-between items-start mb-1">
          <h2 className="card-title text-lg">{item}</h2>
          <button
            className="hover:text-red-600"
            onClick={() => onDelete?.(id)}
            title="Delete"
          >
            <FaRegTrashCan className="text-lg transition-colors cursor-pointer" />
          </button>
        </div>

        <div className="flex flex-col">
          <Link
            to={`/viewdetails/${id}`}
            className="btn btn-ghost btn-sm w-full flex items-center justify-center gap-2 border mt-1 bg-emerald-100 text-emerald-600"
          >
            <IoSearch className="text-lg" />
            View
          </Link>

          <div className="flex items-center gap-2 mt-3">
            <p className="text-sm text-gray-500 whitespace-nowrap">Progress</p>
            <progress
              className="progress progress-success flex-grow"
              value={progress}
              max="100"
            ></progress>
            <p className="text-sm text-gray-700 whitespace-nowrap">{progress}%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressBox;
