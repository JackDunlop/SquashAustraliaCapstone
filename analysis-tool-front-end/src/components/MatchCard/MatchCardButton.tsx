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
  const [isPoseSubmenuOpen, setIsPoseSubmenuOpen] = useState(false);
  const [isVelocitySubmenuOpen, setIsVelocitySubmenuOpen] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isAnglesLoading, setIsAnglesLoading] = useState(false);
  const [anglesReady, setAnglesReady] = useState(false);
  const [anglesError, setAnglesError] = useState<string | null>(null);
  const [isDownloadPoseDataSubmenuOpen, setIsDownloadPoseDataSubmenuOpen] = useState(false); // New state
  // State variables for Left Hand Velocity
  const [isVelocityLoadingLeft, setIsVelocityLoadingLeft] = useState(false);
  const [velocityReadyLeft, setVelocityReadyLeft] = useState(false);
  const [velocityErrorLeft, setVelocityErrorLeft] = useState<string | null>(null);

  // State variables for Right Hand Velocity
  const [isVelocityLoadingRight, setIsVelocityLoadingRight] = useState(false);
  const [velocityReadyRight, setVelocityReadyRight] = useState(false);
  const [velocityErrorRight, setVelocityErrorRight] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

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
        setIsPoseSubmenuOpen(false);
        setIsVelocitySubmenuOpen(false);
        setIsDownloadPoseDataSubmenuOpen(false); 
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
          if (response.status === 200 || response.status === 409) {
            setAnglesReady(true);
          } else {
            setAnglesError('Failed to process angles data');
          }
        } catch (error: any) {
          if (error.response && error.response.status === 409) {
            setAnglesReady(true);
          } else {
            console.error(error);
            setAnglesError(error.response?.data?.message || 'Error fetching angles');
          }
        } finally {
          setIsAnglesLoading(false);
        }
      };

      const handleViewVelocity = async (hand: string) => {
        if (hand === 'left') {
          setIsVelocityLoadingLeft(true);
          setVelocityErrorLeft(null);
        } else {
          setIsVelocityLoadingRight(true);
          setVelocityErrorRight(null);
        }

        try {
          const response = await axios.get(`http://localhost:3001/pose/velocity/${id}/${hand}`);
          if (response.status === 200 || response.status === 409) {
            if (hand === 'left') {
              setVelocityReadyLeft(true);
            } else {
              setVelocityReadyRight(true);
            }
          } else {
            if (hand === 'left') {
              setVelocityErrorLeft('Failed to process velocity data');
            } else {
              setVelocityErrorRight('Failed to process velocity data');
            }
          }
        } catch (error: any) {
          if (error.response && error.response.status === 409) {
            if (hand === 'left') {
              setVelocityReadyLeft(true);
            } else {
              setVelocityReadyRight(true);
            }
          } else {
            console.error(error);
            if (hand === 'left') {
              setVelocityErrorLeft(error.response?.data?.message || 'Error fetching velocity');
            } else {
              setVelocityErrorRight(error.response?.data?.message || 'Error fetching velocity');
            }
          }
        } finally {
          if (hand === 'left') {
            setIsVelocityLoadingLeft(false);
          } else {
            setIsVelocityLoadingRight(false);
          }
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
          link.setAttribute('download', `angles_${id}.csv`);

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (error: any) {
          console.error(error);
          setAnglesError('Error downloading angles data');
        }
      };

      const handleDownloadVideo = async () => {
        try {
          const response = await axios.get(`http://localhost:3001/download/${id}/video`, {
            responseType: 'blob',
          });

          const blob = new Blob([response.data], { type: response.data.type });
          const url = window.URL.createObjectURL(blob);

          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `pose_video${id}.mp4`);

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (error: any) {
          console.error(error);
          setVideoError('Error downloading angles data');
        }
      };

      const handleDownloadVelocity = async (hand: string) => {
        try {
          const response = await axios.get(
            `http://localhost:3001/download/${id}/velocity`, // change velcoity and download to accomdate downloading and saving each type of hand.
            {
              responseType: 'blob',
            }
          );

          const blob = new Blob([response.data], { type: response.data.type });
          const url = window.URL.createObjectURL(blob);

          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `velocity_${hand}_${id}.csv`);

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (error: any) {
          console.error(error);
          if (hand === 'left') {
            setVelocityErrorLeft('Error downloading velocity data');
          } else {
            setVelocityErrorRight('Error downloading velocity data');
          }
        }
      };

      const handleDownloadPoseData = async (type: string) => {
        try {
          const response = await axios.get(
            `http://localhost:3001/download/${id}/${type}`, // change velcoity and download to accomdate downloading and saving each type of hand.
            {
              responseType: 'blob',
            }
          );

          const blob = new Blob([response.data], { type: response.data.type });
          const url = window.URL.createObjectURL(blob);

          const link = document.createElement('a');
          link.href = url;
          let fileType;
          if(type === "pose_csv"){
            fileType = "csv"
          }
          else if(type === "pose_json"){
            fileType = "json"
          }
          link.setAttribute('download', `pose_data_${id}.${fileType}`);

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (error: any) {
          console.error(error);
          setDownloadError('Error downloading pose data');
          
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isDropdownOpen && (
            <div
              className="origin-top-left absolute left-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20"
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="menu-button"
            >
              <div className="py-1" role="none">
            
                <div className="relative">
                  <button
                    onClick={() => setIsPoseSubmenuOpen(!isPoseSubmenuOpen)}
                    className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex justify-between items-center"
                    role="menuitem"
                  >
                    Pose
                    <svg
                      className="ml-2 h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {isPoseSubmenuOpen && (
                  <div
                    className="origin-top-left absolute left-full top-0 mt-0 w-72 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-30"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="pose-submenu-button"
                  >
                    <div className="py-1" role="none">
                  
                      <Link
                        to={`/view_video/${id}`}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          setIsPoseSubmenuOpen(false);
                        }}
                      >
                        View Video
                      </Link>
                      <button
                        onClick={handleDownloadVideo} 
                        className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        Download Video
                      </button>
                      <div className="relative">
                      <button
                        onClick={() => setIsDownloadPoseDataSubmenuOpen(!isDownloadPoseDataSubmenuOpen)}
                        className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex justify-between items-center"
                        role="menuitem"
                      >
                        Download Pose Data
                        <svg
                          className="ml-2 h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
             
                      {isDownloadPoseDataSubmenuOpen && (
                        <div
                          className="origin-top-left absolute left-full top-0 mt-0 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-40"
                          role="menu"
                          aria-orientation="vertical"
                          aria-labelledby="download-pose-data-submenu-button"
                        >
                          <div className="py-1" role="none">
                           
                            <button
                              onClick={() => {
                                handleDownloadPoseData("pose_json");
                              }}
                              className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              role="menuitem"
                            >
                              Download as JSON
                            </button>
                        
                            <button
                              onClick={() => {
                                handleDownloadPoseData("pose_csv");
                              }}
                              className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              role="menuitem"
                            >
                              Download as CSV
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    </div>
                  </div>
                )}

                </div>

             
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
                      className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                    >
                      Download Angles Data
                    </button>
                  </div>
                )}

            
                <div className="relative">
                  <button
                    onClick={() => setIsVelocitySubmenuOpen(!isVelocitySubmenuOpen)}
                    className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex justify-between items-center"
                    role="menuitem"
                  >
                    Process Velocity
                    <svg
                      className="ml-2 h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {isVelocitySubmenuOpen && (
                    <div
                      className="origin-top-left absolute left-full top-0 mt-0 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-30"
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="velocity-submenu-button"
                    >
                      <div className="py-1" role="none">
                       
                        <button
                          onClick={() => {
                            handleViewVelocity('left');
                          
                          }}
                          className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          role="menuitem"
                          disabled={isVelocityLoadingLeft}
                        >
                          {isVelocityLoadingLeft ? 'Processing Left Hand Velocity...' : 'Process Left Hand Velocity'}
                        </button>

                        {velocityReadyLeft && (
                          <div className="ml-4">
                            <button
                              onClick={() => handleDownloadVelocity('left')}
                              className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              role="menuitem"
                            >
                              Download Left Hand Velocity Data
                            </button>
                          </div>
                        )}

                        {velocityErrorLeft && (
                          <div className="px-4 py-2 text-sm text-red-500">{velocityErrorLeft}</div>
                        )}

                    
                        <button
                          onClick={() => {
                            handleViewVelocity('right');
                         
                          }}
                          className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          role="menuitem"
                          disabled={isVelocityLoadingRight}
                        >
                          {isVelocityLoadingRight ? 'Processing Right Hand Velocity...' : 'Process Right Hand Velocity'}
                        </button>

                        {velocityReadyRight && (
                          <div className="ml-4">
                            <button
                              onClick={() => handleDownloadVelocity('right')}
                              className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              role="menuitem"
                            >
                              Download Right Hand Velocity Data
                            </button>
                          </div>
                        )}

                        {velocityErrorRight && (
                          <div className="px-4 py-2 text-sm text-red-500">{velocityErrorRight}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

        
              {anglesError && (
                <div className="px-4 py-2 text-sm text-red-500">{anglesError}</div>
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
