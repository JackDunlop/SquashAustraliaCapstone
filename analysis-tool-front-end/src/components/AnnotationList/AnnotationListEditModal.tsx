import { AnnotationListEditModalProps } from '../../types';
import Modal from '../Modal';

export default function AnnotationListEditModal({
  showModal,
  show,
  modalContent,
  handleTimeChange,
  handleNewChange,
  onEditAnnotation,
  matchId,
}: AnnotationListEditModalProps) {
  return (
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
          <h3 className="font-bold text-lg mb-1 inline"> Player Location: </h3>
          <label className="inline ml-2">
            <input
              type="number"
              max="5"
              min="1"
              value={modalContent.playerPosition}
              onChange={(event) => handleNewChange(event, 'playerPosition')}
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
              onChange={(event) => handleNewChange(event, 'opponentPosition')}
              className="w-1/5 ml-1 form-text border-2 pl-1"
            />
          </label>
          <br></br>
          <h3 className="font-bold text-lg mb-1 inline">Locations: </h3>
          <ol className="list-group list-group-numbered">
            <li className="list-group-item">1. Front Left</li>
            <li className="list-group-item">2. Front Right</li>
            <li className="list-group-item">3. Back Left</li>
            <li className="list-group-item">4. Back Right</li>
            <li className="list-group-item">5. T-Zone</li>
          </ol>
        </div>
      </div>
      <div className="actions">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 mr-2"
          onClick={(e) =>
            onEditAnnotation({ annotationToEdit: modalContent, matchId })
          }
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
  );
}
