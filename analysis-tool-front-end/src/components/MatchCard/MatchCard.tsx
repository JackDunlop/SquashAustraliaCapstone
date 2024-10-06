// MatchCard.tsx
import axios from 'axios';
import { useState, useEffect } from 'react';
import MatchCardButton from './MatchCardButton';

interface MatchCardProps {
  match: Match;
  baseUrl: string;
  onRemoveMatch: (id: string) => void;
}

interface Match {
  annotations: any[];
  description: string;
  duration: number;
  id: string;
  players: Players;
  title: string;
}

interface Players {
  player1: string;
  player2: string;
  player1Color: string[];
  player2Color: string[];
}

export default function MatchCard({
  match: { id, title, description, players },
  baseUrl,
  onRemoveMatch,
}: MatchCardProps) {
  const [isPoseReady, setIsPoseReady] = useState(false);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);

  useEffect(() => {
    const checkPoseDataStatus = async () => {
      try {
        const response = await axios.get(`${baseUrl}/pose/status/${id}`);
        if (response.status === 200 && response.data.poseReady) {
          setIsPoseReady(true);
        }
      } catch (error) {
        console.error(`Error checking pose data status for match ${id}:`, error);
      }
    };

    checkPoseDataStatus();
  }, [id, baseUrl]);

  const handleAnalyticsClick = async (matchId: string) => {
    setIsAnalyticsLoading(true);

    try {
      const poseResponse = await axios.get(`${baseUrl}/pose/${matchId}`);

      if (!poseResponse || poseResponse.status !== 200) {
        throw new Error('Error fetching pose data');
      }

      setIsPoseReady(true);
    } catch (error: any) {
      if (error.response && error.response.status === 409) {
        console.log(`Pose data already processed for match ${matchId}`);
        setIsPoseReady(true);
      } else {
        console.error(
          `Error fetching pose data or stream for match ${matchId}:`,
          error
        );
      }
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  const buttons = [
    {
      label: 'View',
      href: `/view_video/${id}`,
      color: 'green',
      onClick: () => {},
    },
    {
      label: 'Edit',
      href: `/match/${id}`,
      color: 'blue',
      onClick: () => {},
    },
    {
      label: 'Remove',
      href: '#',
      color: 'red',
      onClick: () => onRemoveMatch(id),
    },
  ];

  return (
    <div key={id} className="p-5 col-span-12 sm:col-span-6 lg:col-span-4">
      <div className="shadow-xl border-2 border-gray-100">
        <div className="p-4">
          <div className="font-bold text-xl mb-3">{title}</div>
          <video
            src={`${baseUrl}/video/${id}/stream`}
            muted
            preload="auto"
            className="w-full h-auto"
          ></video>
          <p className="text-gray-700 mt-2 text-base">
            <strong>
              {players.player1} vs {players.player2}
            </strong>
          </p>
          <p className="whitespace-normal">{description}</p>
          <div className="pt-3 pb-2 flex flex-wrap gap-2">
    
            {buttons.map((button) => (
              <MatchCardButton
                key={button.label}
                id={id}
                color={button.color}
                label={button.label}
                href={button.href}
                onClick={button.onClick}
                isPoseReady={isPoseReady}
                isAnalyticsLoading={isAnalyticsLoading}
              />
            ))}

            <MatchCardButton
              id={id}
              color="purple"
              label="Analytics"
              href="#"
              onClick={() => handleAnalyticsClick(id)}
              isPoseReady={isPoseReady}
              isAnalyticsLoading={isAnalyticsLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
