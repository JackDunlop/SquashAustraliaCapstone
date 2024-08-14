import { React, useState, useEffect , useRef} from 'react';
import axios from 'axios';

import {
  Player,
  ControlBar,
  ReplayControl,
  ForwardControl,
  CurrentTimeDisplay,
  TimeDivider,
  PlaybackRateMenuButton,
  VolumeMenuButton,
  BigPlayButton,
} from 'video-react';
import 'video-react/dist/video-react.css';

export default function ViewAnalytics({ baseUrl }) {  
  const matchId = window.location.pathname.substring(11); 
  

  const [loading, setLoading] = useState(true);  
  const playerRef = useRef(null);  // Reference to the Player component
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState(null); // State to handle errors
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {    
  const fetchVideoStream = async () => {
    try {
      console.log(`Requesting video stream with URL: ${baseUrl}/pose/${matchId}`);
      const response = await axios.get(`${baseUrl}/pose/${matchId}`
      );        
      if (response.status === 200) {
        const stream = `${baseUrl}/pose/${matchId}/stream`
        setVideoUrl(stream);
        setIsReady(true); // Video URL is ready to be played       
            
      } else {
        console.log('Video is not ready, status code:', response.status);
        setError('The video is not ready. Please try again later.');
      }
    } catch (error) {
      console.error('Error fetching the video stream:', error);
      setError('There was an issue loading the video. Please try again later.');        
    } finally {
      setLoading(false); // Ensure loading state is set to false in all cases      
    }
  };  
  fetchVideoStream();
}, [baseUrl, matchId]);

 // Handle play button press
 const handlePlayButton = () => {
  if (playerRef.current && isReady) {
    playerRef.current.video.play(); // Start playing the video
  }
};

return (
  <div className="relative w-full h-desktop">
    {loading && (
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
        <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )}
    {error ? (
      <div className="text-center text-white">
        <p>{error}</p>
      </div>
    ) : (
      <Player
        ref={playerRef}
        preload="auto"
        fluid={false}
        height="100%"
        src={videoUrl}
        onReady={() => setLoading(false)}
      >
        <BigPlayButton position="center" onClick= {handlePlayButton}/>
        <ControlBar>
          <ReplayControl seconds={10} order={1.1} />
          <ForwardControl seconds={30} order={1.2} />
          <CurrentTimeDisplay order={4.1} />
          <TimeDivider order={4.2} />
          <PlaybackRateMenuButton rates={[5, 2, 1, 0.5, 0.1]} order={7.1} />
          <VolumeMenuButton enabled />
        </ControlBar>
      </Player>
    )}
  </div>
);
}