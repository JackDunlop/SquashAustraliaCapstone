export interface AnnotationListFilterProps {
    player1IsChecked: boolean;
    player2IsChecked: boolean;
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
  }
  
  export interface Component {
    hand: string;
    id: string;
    type: number;
  }
  
  export interface FilterTime {
    startTimeM: number;
    startTimeS: number;
    endTimeM: number;
    endTimeS: number;
  }