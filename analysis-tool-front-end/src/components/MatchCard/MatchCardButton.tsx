import { Link } from 'react-router-dom';

interface MatchCardButtonProps {
  id: string;
  color: string;
  label: string;
  href: string;
  onClick: () => void;
  isPoseReady?: boolean;
  isAnalyticsLoading?: boolean;
}

export default function MatchCardButton({
  id,
  color,
  label,
  href,
  onClick,
  isPoseReady,
  isAnalyticsLoading,
}: MatchCardButtonProps) {
  // Analytics button is handled slightly differently
  if (label === 'Analytics') {
    return isPoseReady ? (
      <Link to={`/analytics/${id}`}>
        <div>
          <button
            className={`bg-${color}-700 hover:bg-${color}-600 text-white font-bold py-2 px-4 mx-1 rounded-lg`}
          >
            Analytics Ready
          </button>
        </div>
      </Link>
    ) : (
      <button
        onClick={onClick}
        className={`bg-${color}-700 hover:bg-${color}-600 text-white font-bold py-2 px-4 mx-1 rounded-lg ${
          isAnalyticsLoading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        disabled={isAnalyticsLoading}
      >
        {isAnalyticsLoading ? 'Loading...' : 'Analytics'}
      </button>
    );
  }

  return (
    <a href={href}>
      <button
        className={`bg-${color}-700 hover:bg-${color}-600 text-white font-bold py-2 px-4 mx-1 rounded-lg`}
        onClick={onClick}
      >
        {label}
      </button>
    </a>
  );
}
