import { AnnotationListTableProps } from '../../types';
import AnnotationListEditModal from './AnnotationListEditModal';
import AnnotationListItem from './AnnotationListItem';

export default function AnnotationListTable({
  showModal,
  show,
  modalContent,
  handleTimeChange,
  handleNewChange,
  onEditAnnotation,
  match,
  filterAnnotations,
  onDeleteAnnotation,
  jumpToAnnotation,
}: AnnotationListTableProps) {
  const gameZoneLabels = [
    'Front Left',
    'Front Right',
    'Back Left',
    'Back Right',
    'T-Zone',
  ];

  const annotationListHeaders = [
    'Annotation',
    'Time',
    'Player Position',
    'Opponent Position',
  ];

  const player1Name = match.players ? match.players.player1 : 'Player 1';
  const player2Name = match.players ? match.players.player2 : 'Player 2';

  const player1Color = match.players
    ? `rgb(${match.players.player1Color.toString()})`
    : '#ca8a04';
  const player2Color = match.players
    ? `rgb(${match.players.player1Color.toString()})`
    : '#16a34a';

  return (
    <div className="flex-grow w-full p-1 border-2 border-gray-500 overflow-auto">
      <h1 className="text-center text-lg font-bold mb-1">{match.title}</h1>
      <table className="table-fixed w-full">
        <thead>
          <tr>
            <th
              className="w-6/8 border border-white rounded"
              style={{ backgroundColor: player1Color }}
            >
              {player1Name}{' '}
            </th>
            <th
              className="w-2/8 border border-white rounded"
              style={{ backgroundColor: player2Color }}
            >
              {player2Name}
            </th>
          </tr>
        </thead>
      </table>
      <table className="table-fixed w-full">
        <thead>
          {/* Table headers for the annotation list */}
          <tr>
            {annotationListHeaders.map((header) => (
              <th className={`w-${header === 'Annotation' ? '6/8' : '2/8'}`}>
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* Modal for editing annotations */}
          <AnnotationListEditModal
            showModal={showModal}
            show={show}
            modalContent={modalContent}
            handleTimeChange={handleTimeChange}
            handleNewChange={handleNewChange}
            onEditAnnotation={onEditAnnotation}
            matchId={match.id}
          />

          {/* List of Annotations */}
          {filterAnnotations.map((annotation) => (
            <AnnotationListItem
              annotation={annotation}
              showModal={showModal}
              onDeleteAnnotation={onDeleteAnnotation}
              jumpToAnnotation={jumpToAnnotation}
              gameZoneLabels={gameZoneLabels}
              filterAnnotations={filterAnnotations}
              matchId={match.id}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
