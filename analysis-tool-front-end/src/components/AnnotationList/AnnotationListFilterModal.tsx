import { v4 as uuidv4 } from 'uuid';
import { AnnotationListFilterProps } from '../../types';

export default function AnnotationListFilterModal({
  player1IsChecked,
  player2IsChecked,
  checkedState,
  filterTime,
  playerFilterChange1,
  playerFilterChange2,
  match,
  unique_shots,
  shotFilterChange,
  filterTimeChange,
  clearFilters,
  toggleFilter,
}: AnnotationListFilterProps) {
  return (
    <div className="modal" id="modal">
      <h2 className="text-center">Filter Annotations</h2>
      <div className="content">
        <div className="container">
          <div className="grid grid-cols-12">
            <div className="col-start-1 col-end-13 border-2 p-2">
              <h3 className="font-bold text-lg mb-1 text-left">
                Filter by Player
              </h3>
              <div className="grid grid-cols-10">
                <label className="col-start-1 col-end-5 p-2">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={player1IsChecked}
                    name={match.players['player1']}
                    onChange={playerFilterChange1}
                  />
                  <span className="ml-2">{match.players['player1']}</span>
                </label>

                <label className="col-start-6 col-end-10 p-2">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    name={match.players['player2']}
                    checked={player2IsChecked}
                    onChange={playerFilterChange2}
                  />
                  <span className="ml-2">{match.players['player2']}</span>
                </label>
              </div>
            </div>
            <br></br>
            <div className="col-start-1 col-end-6  border-2 p-2">
              <h3 className="font-bold text-lg mb-1 text-center">
                Filter by shot
              </h3>
              {unique_shots?.length && unique_shots.map((shot, index) => {
                return (
                  <div key={uuidv4()}>
                    <label className="block">
                      <input
                        type="checkbox"
                        className="form-checkbox"
                        checked={checkedState[index]}
                        onChange={() => shotFilterChange(index)}
                      />
                      <span className="ml-2">{shot}</span>
                    </label>
                  </div>
                );
              })}
            </div>

            <div className="col-start-7 col-end-13 border-2 p-2">
              <h3 className="font-bold text-lg mb-1 text-center">
                Filter by time
              </h3>
              <h5 className="">Start Time:</h5>

              <div className="">
                <label className="inline">
                  <span className="">Min</span>

                  <input
                    type="number"
                    min="0"
                    name="startTimeM"
                    value={filterTime.startTimeM}
                    onChange={(event) => filterTimeChange(event, 'startTimeM')}
                    className="w-1/4 ml-2 form-text border-2 mr-1 pl-1"
                  />
                </label>

                <label className="inline">
                  <span className="">Sec</span>

                  <input
                    type="number"
                    max="60"
                    min="0"
                    name="startTimeS"
                    value={filterTime.startTimeS}
                    onChange={(event) => filterTimeChange(event, 'startTimeS')}
                    className="w-1/4 ml-2 form-text border-2 pl-1"
                  />
                </label>
              </div>
              <h5 className="">End Time:</h5>

              <div className="">
                <label className="inline">
                  <span className="">Min</span>

                  <input
                    type="number"
                    min="0"
                    name="endTimeM"
                    value={filterTime.endTimeM}
                    onChange={(event) => filterTimeChange(event, 'endTimeM')}
                    className="w-1/4 ml-2 form-text border-2 mr-1 pl-1"
                  />
                </label>

                <label className="inline">
                  <span className="">Sec</span>

                  <input
                    type="number"
                    max="60"
                    name="endTimeS"
                    value={filterTime.endTimeS}
                    onChange={(event) => filterTimeChange(event, 'endTimeS')}
                    className="w-1/4 ml-2 form-text border-2 pl-1"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="actions">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 mr-2"
          onClick={clearFilters}
        >
          {' '}
          Clear Filters{' '}
        </button>
        <button
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4"
          onClick={toggleFilter}
        >
          {' '}
          Close{' '}
        </button>
      </div>
    </div>
  );
}
