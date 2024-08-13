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

export default function ViewAnalytics({baseUrl}) {
  const matchId = window.location.pathname.substring(11);
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const playerRef = useRef(null);  // Reference to the Player component 
    
    useEffect(() => {
      // Fetch the video URL from the backend
      const fetchVideo = async () => {
          try {
              console.log(`Requesting video with URL: ${baseUrl}/pose/${matchId}`);
              const response = await axios.get(`${baseUrl}/pose/${matchId}`, {
                  responseType: 'blob'
              });                            
              const videoBlob = new Blob([response.data]);
              const videoUrl = URL.createObjectURL(videoBlob);              
              console.log(videoUrl)
              setVideoUrl(videoUrl);
              setLoading(false);
          } catch (error) {
              console.error('Error fetching the video:', error);
              setLoading(false);
          }
      };
      fetchVideo();
  }, [baseUrl,matchId]);

  useEffect(() => {
    if (playerRef.current) {
      // Event listener to the BigPlayButton
      const player = playerRef.current;
      player.subscribeToStateChange((state, prevState) => {
        if (state.paused !== prevState.paused) {
          console.log(`Video is now ${state.paused ? 'paused' : 'playing'}`);
        }
      });
    }
  }, [videoUrl]); 

  return (
    <div className="w-full h-desktop">
      <div className="px-3 w-full h-full">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <Player
            ref={playerRef}
            preload={'auto'}
            fluid={false}
            height={'100%'}
            src={videoUrl}
            autoPlay
            muted
          >
            <BigPlayButton position="center"/>
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
    </div>
  );
}
