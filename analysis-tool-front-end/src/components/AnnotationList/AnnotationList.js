import { useState, useEffect } from 'react';
import AnnotationListFilterModal from './AnnotationListFilterModal';
import AnnotationListActions from './AnnotationListActions';
import AnnotationListTable from './AnnotationListTable';
import {
  deleteAllAnnotations,
  deleteAnnotation,
  editAnnotation,
  getAnnotations,
} from './helpers';

export default function AnnotationList({
  match,
  annotations,
  annotationsUpdated,
  jumpToAnnotation,
  clearFilter,
  pauseVideo,
}) {
  const [filterAnnotations, setFilterAnnotations] = useState([]);
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

  const unique_shots = [
    ...new Set(
      annotations
        .filter((annotation) => annotation.components.type === 'shot')
        .map((annotation) => annotation.components.id)
    ),
  ];

  /**
   * Handles removing an annotation.
   *
   * @param annotationId - The ID of the annotation to remove
   * @param {string} matchId - The ID of the match the annotation belongs to
   * @returns void
   */
  const handleDeleteAnnotation = async ({ annotationId, matchId }) => {
    const isSuccess = await deleteAnnotation({ annotationId, matchId });

    if (isSuccess) {
      annotationsUpdated();
    }
  };

  /**
   * Fetches annotations for a given match.
   *
   * @param {string} matchId - The ID of the match to fetch annotations for
   * @return void
   */
  const handleGetAnnotations = async (matchId) => {
    const annotations = await getAnnotations(matchId);

    if (annotations.length) {
      setFilterAnnotations(annotations);
    }
  };

  /**
   * Handles clearing all annotations.
   *
   * @return void
   */
  const handleClearAllAnnotations = async () => {
    const isSuccess = await deleteAllAnnotations(match.id);

    if (isSuccess) {
      setFilterAnnotations([]); // Clear annotations in the state
    }
  };

  /**
   * Handles editing an annotation.
   *
   * @param annotationToEdit - The annotation to edit
   * @param {string} matchId - The ID of the match the annotation belongs to
   * @returns void
   */
  const handleEditAnnotation = async ({ annotationToEdit, matchId }) => {
    const isSuccess = await editAnnotation({ annotationToEdit, matchId });

    if (isSuccess) {
      annotationsUpdated();
      setShow(false);
    }
  };

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

  /**
   * Fetch annotations when the component mounts or match.id changes.
   */
  useEffect(() => {
    const fetchAndSetAnnotations = async () => {
      await handleGetAnnotations(match.id);
      setFilterAnnotations(annotations); 
    };
  
    fetchAndSetAnnotations();
  }, [match.id, annotations]);

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

  return (
    //This is the left hand side of the screen. The annotation log and resulting menus
    <div className="h-full flex flex-col">
      {/* Annotations Table - List of annotations */}
      <AnnotationListTable
        showModal={showModal}
        show={show}
        modalContent={modalContent}
        handleTimeChange={handleTimeChange}
        handleNewChange={handleNewChange}
        onEditAnnotation={handleEditAnnotation}
        match={match}
        filterAnnotations={filterAnnotations}
        onDeleteAnnotation={handleDeleteAnnotation}
        jumpToAnnotation={jumpToAnnotation}
      />

      {/* Filter, Statistics & Clear All buttons */}
      <AnnotationListActions
        id={match.id}
        handleClearAll={handleClearAllAnnotations}
        toggleFilter={toggleFilter}
      />

      {/* Filter Modal */}
      {showFilter ? (
        <AnnotationListFilterModal
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
