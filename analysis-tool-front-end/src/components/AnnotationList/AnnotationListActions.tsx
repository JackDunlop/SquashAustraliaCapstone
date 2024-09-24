import { AnnotationListActionsProps } from "../../types";


export default function AnnotationListActions({
  id,
  toggleFilter,
  handleClearAll,
}: AnnotationListActionsProps) {
  return (
    <div className="w-full mt-auto">
      <div className="mt-1">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold border-r-4 border-white py-2 px-4 w-1/2"
          onClick={toggleFilter}
        >
          {' '}
          Filter{' '}
        </button>
        <a href={'/stats/' + id}>
          <button className="bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 w-1/2">
            Statistics
          </button>
        </a>
      </div>
      <div className="mt-1">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold border-r-4 border-white py-2 px-4 w-full"
          onClick={handleClearAll}
        >
          {' '}
          Clear all{' '}
        </button>
      </div>
    </div>
  );
}
