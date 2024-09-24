import { useState, useEffect } from 'react';
import axios from 'axios';
import AnnotationListFilterModal from './AnnotationListFilterModal';
import AnnotationListActions from './AnnotationListActions';
import AnnotationListTable from './AnnotationListTable';

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
        setAnnotationToEdit={setAnnotationToEdit}
        match={match}
        filterAnnotations={filterAnnotations}
        removeAnnotation={removeAnnotation}
        jumpToAnnotation={jumpToAnnotation}
        gameZoneLabels={gameZoneLabels}
      />

      {/* Filter, Statistics & Clear All buttons */}
      <AnnotationListActions
        id={match.id}
        handleClearAll={handleClearAll}
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

