import { useState, useEffect } from 'react';
import Modal from '../Modal';
import axios from 'axios';
import AnnotationListFilter from './AnnotationListFilter';
import AnnotationListActions from './AnnotationListActions';
import AnnotationListItem from './AnnotationListItem';

export default function AnnotationList({
  baseUrl,
  match,
  annotations,
  annotationsUpdated,
  jumpToAnnotation,
  clearFilter,
  pauseVideo,
}) {
  const [filterAnnotations, setFilterAnnotations] = useState([]);
  const [annotationToRemove, setAnnotationToRemove] = useState({});
  const [annotationToEdit, setAnnotationToEdit] = useState({});
  const [show, setShow] = useState(false);
  const [showFilter, setFilterShow] = useState(false);
  const [filterTime, setFilterTime] = useState({
    startTimeM: 0,
    startTimeS: 0,
    endTimeM: 0,
    endTimeS: 0,
  });
  const [checkedState, setCheckedState] = useState(new Array(12).fill(false));
  const [modalContent, setModalContent] = useState({});
  const gameZoneLabels = [
    'Front Left',
    'Front Right',
    'Back Left',
    'Back Right',
    'T-Zone',
  ];

  const unique_shots = [
    ...new Set(
      annotations
        .filter((annotation) => annotation.components.type === 'shot')
        .map((annotation) => annotation.components.id)
    ),
  ];

  useEffect(() => {
    setFilterAnnotations(annotations);

    if (Object.entries(annotationToRemove).length !== 0) {
      axios
        .post(
          baseUrl +
            '/annotate/' +
            match.id +
            '/' +
            annotationToRemove.id +
            '/remove'
        )
        .then((res) => {
          setAnnotationToRemove({});
          annotationsUpdated();
        });
    }
    if (Object.entries(annotationToEdit).length !== 0) {
      const timeinSecs =
        Number(annotationToEdit.timeTextH) * 3600 +
        Number(annotationToEdit.timeTextM) * 60 +
        Number(annotationToEdit.timeTextS);
      annotationToEdit.annotation.timestamp = timeinSecs;
      annotationToEdit.annotation.playerPos = annotationToEdit.playerPosition;
      annotationToEdit.annotation.opponentPos =
        annotationToEdit.opponentPosition;

      axios
        .post(
          baseUrl +
            '/annotate/' +
            match.id +
            '/' +
            annotationToEdit.annotation.id +
            '/edit',
          annotationToEdit.annotation
        )
        .then((res) => {
          setAnnotationToEdit({});
          annotationsUpdated();
        });
    }
  }, [
    annotationToRemove,
    annotationToEdit,
    annotations,
    annotationsUpdated,
    baseUrl,
    match,
  ]);

  const clearFilters = () => {
    const updatedCheckedState = new Array(12).fill(false);
    setCheckedState(updatedCheckedState);
    clearFilter();
    setFilterAnnotations(annotations);
    setFilterTime({
      startTimeM: 0,
      startTimeS: 0,
      endTimeM: 0,
      endTimeS: 0,
    });
  };

  useEffect(() => {
    // Fetch annotations when the component mounts
    const fetchAnnotations = async () => {
      try {
        const response = await axios.get(`${baseUrl}/annotate/${match.id}/all`);
        setFilterAnnotations(response.data);
      } catch (error) {
        console.error('Error fetching annotations:', error);
      }
    };

    fetchAnnotations();
  }, [baseUrl, match.id]);

  const handleClearAll = async () => {
    try {
      await axios.delete(`${baseUrl}/annotate/${match.id}/annotations/clear`);
      setFilterAnnotations([]); // Clear annotations in the state
    } catch (error) {
      console.error('Error clearing annotations:', error);
    }
  };

  // I have no idea how this works other than the fact that it does
  const [player1IsChecked, player1SetIsChecked] = useState(false);
  const [player2IsChecked, player2SetIsChecked] = useState(false);

  const playerFilterChange1 = () => {
    if (!player1IsChecked && player2IsChecked) {
      let newAnnotations = annotations.filter(
        (annotation) =>
          annotation.playerNumber === 1 || annotation.playerNumber === 2
      );
      setFilterAnnotations(newAnnotations);
    } else if (!player1IsChecked) {
      let newAnnotations = annotations.filter(
        (annotation) => annotation.playerNumber === 1
      );
      setFilterAnnotations(newAnnotations);
    } else if (player2IsChecked) {
      let newAnnotations = annotations.filter(
        (annotation) => annotation.playerNumber === 2
      );
      setFilterAnnotations(newAnnotations);
    } else {
      clearFilters();
    }
    player1SetIsChecked(!player1IsChecked);
  };

  const playerFilterChange2 = () => {
    player2SetIsChecked(!player2IsChecked);

    let newAnnotations = [...annotations];

    if (player1IsChecked && !player2IsChecked) {
      newAnnotations = annotations.filter(
        (annotation) =>
          annotation.playerNumber === 1 || annotation.playerNumber === 2
      );
    } else if (player1IsChecked) {
      newAnnotations = annotations.filter(
        (annotation) => annotation.playerNumber === 1
      );
    } else if (!player2IsChecked) {
      newAnnotations = annotations.filter(
        (annotation) => annotation.playerNumber === 2
      );
    } else {
      clearFilters();
    }

    setFilterAnnotations(newAnnotations);
  };

  const shotFilterChange = (position) => {
    const updatedCheckedState = checkedState.map((item, index) =>
      index === position ? !item : item
    );

    const indices = updatedCheckedState.reduce(
      (out, bool, index) => (bool ? out.concat(index) : out),
      []
    );
    var unique = [];
    for (var i = 0; i < indices.length; i++) {
      unique.push(unique_shots[indices[i]]);
    }

    let newAnnotations = annotations.filter((item) =>
      unique.includes(item.components.id)
    );

    setFilterAnnotations(newAnnotations);

    setCheckedState(updatedCheckedState);

    let checker = (checkedState) => checkedState.every((v) => v === false);
    if (checker(updatedCheckedState)) {
      setFilterAnnotations(annotations);
    }
  };

  const filterTimeChange = (evt, field) => {
    let newAnnotations = filterTime;
    newAnnotations[field] = evt.target.value;
    const startS =
      Number(newAnnotations.startTimeM) * 60 +
      Number(newAnnotations.startTimeS);
    const endS =
      Number(newAnnotations.endTimeM) * 60 + Number(newAnnotations.endTimeS);
    newAnnotations = annotations.filter(
      (item) => item.timestamp >= startS && item.timestamp <= endS
    );
    setFilterAnnotations(newAnnotations);
  };

  const toggleFilter = () => {
    setFilterShow(!showFilter);
    pauseVideo();
  };

  const showModal = (
    shotText,
    timeText,
    annotation,
    playerPosition,
    opponentPosition
  ) => {
    if (shotText && timeText) {
      const hours = Math.floor(timeText / 3600);
      const minutes = Math.floor((timeText % 3600) / 60);
      const seconds = Math.floor((timeText % 3600) % 60);

      setModalContent({
        annotation: annotation,
        shotText: shotText,
        timeTextH: hours,
        timeTextM: minutes,
        timeTextS: seconds,
        playerPosition: playerPosition,
        opponentPosition: opponentPosition,
      });
    } else {
      const hours = 0;
      const minutes = 0;
      const seconds = 0;

      setModalContent({
        annotation: annotation,
        shotText: shotText,
        timeTextH: hours,
        timeTextM: minutes,
        timeTextS: seconds,
        playerPosition: playerPosition,
        opponentPosition: opponentPosition,
      });
    }
    setShow(!show);
  };

  const handleTimeChange = (event, timeTextX) => {
    let newTime = modalContent;
    newTime[timeTextX] = event.target.value;

    setModalContent({
      annotation: newTime['annotation'],
      shotText: newTime.shotText,
      timeTextH: newTime.timeTextH,
      timeTextM: newTime.timeTextM,
      timeTextS: newTime.timeTextS,
      playerPosition: newTime.playerPosition,
      opponentPosition: newTime.opponentPosition,
    });
  };

  const handleNewChange = (event, newText) => {
    let newChange = modalContent;
    newChange[newText] = event.target.value;

    setModalContent({
      annotation: newChange['annotation'],
      shotText: newChange.shotText,
      timeTextH: newChange.timeTextH,
      timeTextM: newChange.timeTextM,
      timeTextS: newChange.timeTextS,
      playerPosition: newChange.playerPosition,
      opponentPosition: newChange.opponentPosition,
    });
  };

  const removeAnnotation = (annotation) => {
    setAnnotationToRemove(annotation);
  };

  const player1Color = match.players
    ? `rgb(${match.players.player1Color.toString()})`
    : '#ca8a04';
  const player2Color = match.players
    ? `rgb(${match.players.player1Color.toString()})`
    : '#16a34a';

  return (
    //This is the left hand side of the screen. The annotation log and resulting menus
    <div className="h-full flex flex-col">
      <div className="flex-grow w-full p-1 border-2 border-gray-500 overflow-auto">
        <h1 className="text-center text-lg font-bold mb-1">{match.title}</h1>
        <table className="table-fixed w-full">
          <thead>
            <tr>
              <th
                className="w-6/8 border border-white rounded"
                style={{ backgroundColor: player1Color }}
              >
                {match.players ? match.players.player1 : 'Player 1'}{' '}
              </th>
              <th
                className="w-2/8 border border-white rounded"
                style={{ backgroundColor: player2Color }}
              >
                {match.players ? match.players.player2 : 'Player 2'}
              </th>
            </tr>
          </thead>
        </table>
        <table className="table-fixed w-full">
          <thead>
            <tr>
              <th className="w-6/8">Annotation </th>
              <th className="w-2/8">Time</th>
              <th className="w-2/8">Player Position</th>
              <th className="w-2/8">Opponent Position</th>
            </tr>
          </thead>
          <tbody>
            <Modal onClose={showModal} show={show} title={'Edit Annotation'}>
              <div className="content">
                <div className="border-2 p-2">
                  <h3 className="text-lg mb-1 inline">
                    {' '}
                    <span className="font-bold"> Annotation: </span>{' '}
                    {modalContent.shotText}{' '}
                  </h3>{' '}
                  <br />
                  <h3 className="font-bold text-lg mb-1 inline"> Time: </h3>
                  <label className="inline">
                    <span className="ml-2">H:</span>

                    <input
                      type="number"
                      min="0"
                      value={modalContent.timeTextH}
                      onChange={(event) => handleTimeChange(event, 'timeTextH')}
                      className="w-1/5 ml-1 form-text border-2 pl-1"
                    />
                  </label>
                  <label className="inline ml-2">
                    <span className="">M:</span>

                    <input
                      type="number"
                      min="0"
                      value={modalContent.timeTextM}
                      onChange={(event) => handleTimeChange(event, 'timeTextM')}
                      className="w-1/5 ml-1 form-text border-2 pl-1"
                    />
                  </label>
                  <label className="inline ml-2">
                    <span className="">S:</span>

                    <input
                      type="number"
                      max="60"
                      min="0"
                      value={modalContent.timeTextS}
                      onChange={(event) => handleTimeChange(event, 'timeTextS')}
                      className="w-1/5 ml-1 form-text border-2 pl-1"
                    />
                  </label>
                  <br></br>
                  <h3 className="font-bold text-lg mb-1 inline">
                    {' '}
                    Player Location:{' '}
                  </h3>
                  <label className="inline ml-2">
                    <input
                      type="number"
                      max="5"
                      min="1"
                      value={modalContent.playerPosition}
                      onChange={(event) =>
                        handleNewChange(event, 'playerPosition')
                      }
                      className="w-1/5 ml-1 form-text border-2 pl-1"
                    />
                  </label>
                  <br></br>
                  <h3 className="font-bold text-lg mb-1 inline">
                    {' '}
                    Opponent Location:{' '}
                  </h3>
                  <label className="inline ml-2">
                    <input
                      type="number"
                      max="5"
                      min="1"
                      value={modalContent.opponentPosition}
                      onChange={(event) =>
                        handleNewChange(event, 'opponentPosition')
                      }
                      className="w-1/5 ml-1 form-text border-2 pl-1"
                    />
                  </label>
                  <br></br>
                  <h3 className="font-bold text-lg mb-1 inline">Locations: </h3>
                  <ol class="list-group list-group-numbered">
                    <li class="list-group-item">1. Front Left</li>
                    <li class="list-group-item">2. Front Right</li>
                    <li class="list-group-item">3. Back Left</li>
                    <li class="list-group-item">4. Back Right</li>
                    <li class="list-group-item">5. T-Zone</li>
                  </ol>
                </div>
              </div>
              <div className="actions">
                <button
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 mr-2"
                  onClick={(e) => {
                    setAnnotationToEdit(modalContent);
                  }}
                >
                  Save
                </button>
                <button
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4"
                  onClick={showModal}
                >
                  Close
                </button>
              </div>
            </Modal>

            {/* List of Annotations */}
            {filterAnnotations.map((annotation) => (
              <AnnotationListItem
                annotation={annotation}
                showModal={showModal}
                removeAnnotation={removeAnnotation}
                jumpToAnnotation={jumpToAnnotation}
                gameZoneLabels={gameZoneLabels}
                filterAnnotations={filterAnnotations}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Filter, Statistics & Clear All buttons */}
      <AnnotationListActions
        id={match.id}
        handleClearAll={handleClearAll}
        toggleFilter={toggleFilter}
      />

      {showFilter ? (
        <AnnotationListFilter
          player1IsChecked={player1IsChecked}
          player2IsChecked={player2IsChecked}
          checkedState={checkedState}
          filterTime={filterTime}
          playerFilterChange1={playerFilterChange1}
          playerFilterChange2={playerFilterChange2}
          match={match}
          unique_shots={unique_shots}
          shotFilterChange={shotFilterChange}
          filterTimeChange={filterTimeChange}
          clearFilters={clearFilters}
          toggleFilter={toggleFilter}
        />
      ) : null}
    </div>
  );
}
