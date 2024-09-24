import { faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AnnotationListItemProps } from '../../types';
import { convertSecondsToMilliseconds } from '../../utils/convertSecondsToMilliseconds';

export default function AnnotationListItem({
  annotation,
  showModal,
  onDeleteAnnotation,
  jumpToAnnotation,
  filterAnnotations,
  gameZoneLabels,
  matchId,
}: AnnotationListItemProps) {
  return (
    <tr
      className="hasTooltip text-center border-t-2 border-fuchsia-600"
      key={annotation.id}
    >
      <td className="w-1/2">
        <div className="tooltip-container has-tooltip">
          <div className="overflow-hidden text-center">
            {annotation.components.id === 'New Game' && (
              <span className="grid place-items-center text-red-600 font-bold overflow-x-hidden w-full px-2">
                {annotation.components.id}
              </span>
            )}
            {(annotation.components.type === 'shot' ||
              annotation.components.type === 'score') &&
              annotation.playerNumber === 1 && (
                <span className="grid place-items-center bg-yellow-600 overflow-x-hidden w-full px-2">
                  {annotation.components.id}
                </span>
              )}
            {(annotation.components.type === 'shot' ||
              annotation.components.type === 'score') &&
              annotation.playerNumber === 2 && (
                <span className="grid place-items-center bg-green-600 overflow-x-hidden w-full px-2">
                  {annotation.components.id}
                </span>
              )}
            {annotation.components.type === 'rally' && (
              <span className="grid place-items-center overflow-x-hidden w-full px-2">
                {annotation.components.id}
              </span>
            )}
          </div>
          <div className="tooltip shadow-lg px-3 py-1 bg-blue-600 text-white">
            <button
              type="button"
              onClick={(e) => {
                showModal(
                  annotation.components.id,
                  annotation.timestamp,
                  annotation,
                  annotation.playerPos,
                  annotation.opponentPos
                );
              }}
            >
              <FontAwesomeIcon className="pr-1" icon={faEdit} />
              Edit{' '}
            </button>{' '}
            |
            <button
              type="button"
              className="pl-2"
              onClick={() => {
                onDeleteAnnotation({ annotationId: annotation.id, matchId })
              }}
            >
              <FontAwesomeIcon icon={faTrash} /> Remove
            </button>
          </div>
        </div>
      </td>
      <td>
        <button
          className="hover:text-blue-500"
          onClick={() =>
            jumpToAnnotation(annotation.timestamp, filterAnnotations)
          }
        >
          {convertSecondsToMilliseconds(annotation.timestamp)}
        </button>
      </td>
      {annotation?.playerPos && (
        <td>{gameZoneLabels[annotation.playerPos - 1]}</td>
      )}
      {annotation?.opponentPos && (
        <td>{gameZoneLabels[annotation.opponentPos - 1]}</td>
      )}
    </tr>
  );
}
