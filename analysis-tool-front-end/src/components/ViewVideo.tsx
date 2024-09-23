import { useState, useEffect } from 'react';
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

interface ViewVideoProps {
  baseUrl: string;
}

export default function ViewVideo({ baseUrl }: ViewVideoProps) {
  const [videoUrl, setVideoUrl] = useState('');

  const matchId = window.location.pathname.substring(12);

  useEffect(() => {
    setVideoUrl(baseUrl + '/video/' + matchId + '/stream');
  }, [baseUrl, matchId]);

  return (
    <div className="w-full h-desktop">
      <div className="px-3 w-full h-full">
        <Player preload={'auto'} fluid={true} src={videoUrl}>
          <BigPlayButton position="center" />

          <ControlBar>
            <ReplayControl seconds={10} />
            <ForwardControl seconds={30} />
            <CurrentTimeDisplay order={4.1} />
            <TimeDivider order={4.2} />
            <PlaybackRateMenuButton rates={[5, 2, 1, 0.5, 0.1]} />
            <VolumeMenuButton />
          </ControlBar>
        </Player>
      </div>
    </div>
  );
}
