import { React, useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import MatchCard from './MatchCard/MatchCard';

const axios = require('axios').default;

export default function MainMenu(props) {
  const history = useHistory();
  const { baseUrl } = props;
  const [matches, setMatches] = useState([]);

  const removeMatch = async (matchId) => {
    const confirmed = window.confirm(
      'Are you sure you want to remove this match?'
    );

    if (confirmed) {
      const response = await axios.post(`${baseUrl}/match/${matchId}/remove`);

      if (response.status !== 200) {
        alert('Error removing match. Please try again later.');
        return;
      }

      const newMatches = matches.filter((match) => match.id !== matchId);

      setMatches(newMatches);
      alert(response.data);
    }
  };

  useEffect(() => {
    if (
      matches.length === 0 ||
      history.location.state?.from === '/new/match/'
    ) {
      axios
        .get(baseUrl + '/match/all')
        .then((res) => res.data)
        .then((matches) => setMatches(matches.reverse()));
    }
  }, [baseUrl, matches.length, history.location.state]);

  return (
    <div className="container mx-auto mb-10">
      <div className="px-5 py-3 col-span-12">
        <h2 className="text-2xl sm:text-3xl font-bold leading-7 text-gray-900">
          <span className="align-middle">Matches</span>
          <Link to="new/match/">
            <button className="float-right text-xl hidden sm:block bg-green-700 text-white font-bold py-2 px-4 mx-1 rounded-full hover:rounded-none hover:bg-green-600 hover:text-yellow-400 hover:font-extrabold">
              New Match
            </button>
          </Link>

          <Link to="/all/stats">
            <button className="float-right text-xl hidden sm:block bg-green-700 text-white font-bold py-2 px-4 mx-1 rounded-full hover:rounded-none hover:bg-green-600 hover:text-yellow-400 hover:font-extrabold">
              All Statistics
            </button>
          </Link>
          <button
            className="
              float-right text-xl block sm:hidden bg-green-700 hover:bg-green-600 text-white font-bold pb-2 px-4 mx-1
            "
          >
            <span className="align-middle">+</span>
          </button>
        </h2>
      </div>

      {matches.length === 0 ? (
        <div className="px-5 py-3 col-span-12">No matches found.</div>
      ) : (
        <div className="grid grid-cols-12">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              baseUrl={baseUrl}
              onRemoveMatch={removeMatch}
            />
          ))}
        </div>
      )}
    </div>
  );
}
