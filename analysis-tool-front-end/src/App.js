import { BrowserRouter as Router, Route, Redirect } from 'react-router-dom';
import Navbar from './components/Navbar';
import MainMenu from './components/MainMenu';
import NewMatch from './components/NewMatch';
import AnnotationInterface from './components/AnnotationInterface';
import Statistics from './components/Statistics';
import ViewVideo from './components/ViewVideo';
import CourtBounds from './components/NewMatchCourtBounds';
import ColourPicker from './components/ColourPicker';
import AllStatistics from './components/AllStatistics';
import ViewAnalytics from './components/ViewAnalytics';


//<Route path="/new/canvas">
//<CanvasTest baseUrl={baseUrl} />
//</Route>
import { BASE_URL } from './constants';

function App() {
  return (
    <div className="App">
      <Navbar />
      <Router>
        <Route path="/home">
          <MainMenu baseUrl={BASE_URL} />
        </Route>
        <Route exact path="/">
          <Redirect to="/home"></Redirect>
        </Route>
        <Route path="/new/match">
          <NewMatch baseUrl={BASE_URL} />
        </Route>
        <Route path="/new/court">
          <CourtBounds baseUrl={BASE_URL} />
        </Route>
        <Route path="/new/colourPick">
          <ColourPicker baseUrl={BASE_URL} />
        </Route>
        <Route path="/match/:id">
          <AnnotationInterface baseUrl={BASE_URL} />
        </Route>
        <Route path="/view_video/:id">
          <ViewVideo baseUrl={BASE_URL} />
        </Route>
        <Route path="/analytics/:id">
          <ViewAnalytics baseUrl={BASE_URL} />
        </Route> 
        <Route path="/stats/:id">
          <Statistics baseUrl={BASE_URL} />
        </Route>
        <Route path="/all/stats">
            <AllStatistics baseUrl={BASE_URL} />
        </Route>
               
      </Router>
    </div>
  );
}

export default App;
