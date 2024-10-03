// MatchCardButton.tsx
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAnglesLoading, setIsAnglesLoading] = useState(false);
  const [anglesReady, setAnglesReady] = useState(false);
  const [anglesError, setAnglesError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const colorClasses: { [key: string]: string } = {
    green: 'bg-green-700 hover:bg-green-600',
    blue: 'bg-blue-700 hover:bg-blue-600',
    red: 'bg-red-700 hover:bg-red-600',
    purple: 'bg-purple-700 hover:bg-purple-600',
  
  };

 
  const appliedColor = colorClasses[color] || 'bg-gray-700 hover:bg-gray-600';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isDropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);


  if (label === 'Analytics') {
    if (isPoseReady) {

      const handleViewAngles = async () => {
        setIsAnglesLoading(true);
        setAnglesError(null);

        try {
          const response = await axios.get(`http://localhost:3001/pose/angles/${id}`);
          if (response.status === 200) {
            setAnglesReady(true);
          } else {
            setAnglesError('Failed to process angles data');
          }
        } catch (error: any) {
          console.log(error);
          setAnglesError(error.response?.data?.message || 'Error fetching angles');
        } finally {
          setIsAnglesLoading(false);
        }
      };


const handleDownloadAngles = async () => {
  try {
    const response = await axios.get(`http://localhost:3001/download/${id}/jointangles`, {
      responseType: 'blob', 
    });

   
    const blob = new Blob([response.data], { type: response.data.type });

  
    const url = window.URL.createObjectURL(blob);


    const link = document.createElement('a');
    link.href = url;

    link.setAttribute('download', `joint_angles_${id}.csv`); 

    
    document.body.appendChild(link);

  
    link.click();


    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    console.log(error);
    setAnglesError('Error downloading angles data');
  }
};


      return (
        <div className="relative inline-block text-left mx-1" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 ${appliedColor} text-white font-bold text-base focus:outline-none`}
          >
            Pose Estimation
            <svg
              className="-mr-1 ml-2 h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isDropdownOpen && (
            <div
              className="origin-top-left absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10"
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="menu-button"
            >
              <div className="py-1" role="none">
                <Link
                  to={`/view_video/${id}`}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  View Video
                </Link>
             
                <button
                  onClick={handleViewAngles}
                  className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                  disabled={isAnglesLoading}
                >
                  {isAnglesLoading ? 'Processing Angles...' : 'Process Angles'}
                </button>

      
                {anglesReady && (
                  <div className="ml-4">
                    <button
                      onClick={handleDownloadAngles}
                      className="w-full text-left block px-4 py-2 text-sm text-blue-700 hover:bg-gray-100"
                      role="menuitem"
                    >
                      Download Angles Data
                    </button>
                  </div>
                )}
              </div>
       
              {anglesError && (
                <div className="px-4 py-2 text-sm text-red-500">
                  {anglesError}
                </div>
              )}
            </div>
          )}
        </div>
      );
    } else {
  
      return (
        <button
          onClick={onClick}
          className={`rounded-lg py-2 px-4 mx-1 ${appliedColor} text-white font-bold text-base ${
            isAnalyticsLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={isAnalyticsLoading}
        >
          {isAnalyticsLoading ? 'Loading...' : 'Analytics'}
        </button>
      );
    }
  }


  return (
    <a href={href}>
      <button
        className={`rounded-lg py-2 px-4 mx-1 ${appliedColor} text-white font-bold text-base`}
        onClick={onClick}
      >
        {label}
      </button>
    </a>
  );
}
