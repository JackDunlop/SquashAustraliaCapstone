import { React, useState, useEffect } from 'react';
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

export default function ViewAnalytics() {
  const matchId = window.location.pathname.substring(12);
  const [videoUrl, setVideoUrl] = useState(''); 
  const [error, setError] = useState(null);  
    
    useEffect(() => {
      // Fetch the video URL from the backend
      const fetchVideo = async () => {
          try {
            console.log(matchId)
              const response = await axios.get('http://localhost:3001/pose/' + matchId, {
                  responseType: 'blob'
              });
              const videoBlob = new Blob([response.data]);
              const videoUrl = URL.createObjectURL(videoBlob);
              console.log(videoUrl)
              setVideoUrl(videoUrl);
          } catch (error) {
              console.error('Error fetching the video:', error);
          }
      };
      fetchVideo();
  }, []);

  return (
    <div className="w-full h-desktop">
      <div className="px-3 w-full h-full">
        <Player preload={'auto'} fluid={false} height={'100%'} src={videoUrl}>
          <BigPlayButton position="center" />          
          <ControlBar>
            <ReplayControl seconds={10} order={1.1} />
            <ForwardControl seconds={30} order={1.2} />
            <CurrentTimeDisplay order={4.1} />
            <TimeDivider order={4.2} />
            <PlaybackRateMenuButton rates={[5, 2, 1, 0.5, 0.1]} order={7.1} />
            <VolumeMenuButton enabled />
          </ControlBar>
        </Player>
      </div>
    </div>
  );
}