import axios from 'axios';
import { useState } from 'react';
import { Link } from 'react-router-dom';

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

  const handleAnalyticsClick = async (matchId: string) => {
    setIsAnalyticsLoading(true);

    try {
      const poseResponse = await axios.get(`${baseUrl}/pose/${matchId}`);

      if (!poseResponse || poseResponse.status !== 200) {
        throw new Error('Error fetching pose data');
      }

      setIsPoseReady(true);
    } catch (error) {
      console.error(
        `Error fetching pose data or stream for match ${matchId}:`,
        error
      );
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  return (
    <div key={id} className="p-5 col-span-12 sm:col-span-6 lg:col-span-4">
      <div className="overflow-hidden shadow-xl border-2 border-gray-100">
        <div className="p-4">
          <div className="font-bold text-xl mb-3">{title}</div>
          <video
            src={baseUrl + '/video/' + id + '/stream'}
            muted
            preload={'auto'}
          ></video>
          <p className="text-gray-700 mt-2 text-base">
            <strong>
              {players.player1} vs {players.player2}
            </strong>
          </p>
          <p className="whitespace-normal">{description}</p>
          <div className="pt-3 pb-2">
            <a href={'/view_video/' + id}>
              <button className="bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 mx-1 rounded-lg">
                View
              </button>
            </a>
            <a href={'/match/' + id}>
              <button className="bg-blue-700 hover:bg-blue-600 text-white font-bold py-2 px-4 mx-1 rounded-lg">
                Edit
              </button>
            </a>
            {isPoseReady ? (
              <Link to={`/analytics/${id}`}>
                <div>
                  <button className="bg-purple-700 hover:bg-purple-600 text-white font-bold py-2 px-4 mx-1 rounded-lg">
                    Analytics Ready
                  </button>
                </div>
              </Link>
            ) : (
              <button
                onClick={() => handleAnalyticsClick(id)}
                className={`bg-purple-700 hover:bg-purple-600 text-white font-bold py-2 px-4 mx-1 rounded-lg ${
                  isAnalyticsLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isAnalyticsLoading}
              >
                {isAnalyticsLoading ? 'Loading...' : 'Analytics'}
              </button>
            )}
            <button
              onClick={() => onRemoveMatch(id)}
              className="bg-red-700 hover:bg-red-600 text-white font-bold py-2 px-4 mx-1 rounded-lg"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}