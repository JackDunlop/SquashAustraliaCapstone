export interface AnnotationListFilterProps {
  isPlayerOneChecked: boolean;
  isPlayerTwoChecked: boolean;
  checkedState: boolean[];
  filterTime: FilterTime;
  playerFilterChange1: () => void;
  playerFilterChange2: () => void;
  match: Match;
  unique_shots: string[];
  shotFilterChange: (position: number) => void;
  filterTimeChange: (evt: any, field: any) => void;
  clearFilters: () => void;
  toggleFilter: () => void;
}

export interface Match {
  annotations: Annotation[];
  description: string;
  duration: number;
  id: string;
  players: Players;
  title: string;
}

export interface Players {
  player1: string;
  player1Color: string[];
  player2: string;
  player2Color: string[];
}

export interface Annotation {
  components: Component;
  id: string;
  timestamp: number;
  playerNumber: number;
  playerPos?: number;
  opponentPos?: number;
}

export interface Component {
  approach?: string;
  hand: string;
  id: string;
  type: string;
}

export interface FilterTime {
  startTimeM: number;
  startTimeS: number;
  endTimeM: number;
  endTimeS: number;
}

export interface AnnotationListItemProps {
  annotation: Annotation;
  showModal: (
    id: string,
    timestamp: number,
    annotation: Annotation,
    playerPos?: number,
    opponentPos?: number
  ) => void;
  onDeleteAnnotation: ({
    annotationId,
    matchId,
  }: OnDeleteAnnotationProps) => Promise<void>;
  jumpToAnnotation: (
    annotationTimeStamp: number,
    filterAnnotations: Annotation[]
  ) => void;
  filterAnnotations: Annotation[];
  gameZoneLabels: string[];
  matchId: string;
}

export interface AnnotationListTableProps {
  showModal: () => void;
  show: boolean;
  modalContent: any;
  handleTimeChange: (event: any, time: string) => void;
  handleNewChange: (event: any, time: string) => void;
  onEditAnnotation: ({
    annotationToEdit,
    matchId,
  }: OnEditAnnotationProps) => Promise<void>;
  annotationListHeaders: string[];
  match: Match;
  filterAnnotations: Annotation[];
  onDeleteAnnotation: ({
    annotationId,
    matchId,
  }: OnDeleteAnnotationProps) => Promise<void>;
  jumpToAnnotation: (
    annotationTimeStamp: number,
    filterAnnotations: Annotation[]
  ) => void;
  gameZoneLabels: string[];
}

export interface AnnotationListActionsProps {
  id: String;
  toggleFilter: () => void;
  handleClearAll: () => void;
}

export interface EditAnnotationProps {
  annotationToEdit: AnnotationToEdit;
  matchId: string;
}

export interface DeleteAnnotationProps {
  annotationId: string;
  matchId: string;
}

export interface AnnotationListEditModalProps {
  showModal: () => void;
  show: boolean;
  modalContent: any;
  onEditAnnotation: ({
    annotationToEdit,
    matchId,
  }: OnEditAnnotationProps) => Promise<void>;
  handleTimeChange: (event: any, time: string) => void;
  handleNewChange: (event: any, time: string) => void;
  matchId: string;
}

interface AnnotationToEdit {
  annotation: Annotation;
  timeTextH: number;
  timeTextM: number;
  timeTextS: number;
  playerPosition: number;
  opponentPosition: number;
}

interface OnEditAnnotationProps {
  annotationToEdit: AnnotationToEdit;
  matchId: string;
}

interface OnDeleteAnnotationProps {
  annotationId: string;
  matchId: string;
}