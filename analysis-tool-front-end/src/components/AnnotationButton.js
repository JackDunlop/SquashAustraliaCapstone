import React from 'react';
import { darkenColor } from '../utils/darkenColor';

export default function AnnotationButton(props) {
  const {
    default: defaultColor,
    hover: hoverColor,
    selected: selectedColor,
  } = getDefaultColors(props.type);

  const playerColor = getPlayerColor(props.name, props.match);

  const buttonClass = `w-full h-full rounded-xl focus:outline-none text-lg ${
    playerColor ? '' : `bg-${defaultColor} hover:bg-${hoverColor}`
  }`;

  // If button is disabled have it greyed out. These are typically the shot type buttons
  if (props.disabled) {
    return (
      <button className="w-full h-full rounded-xl bg-gray-500 focus:outline-none text-lg">
        {props.name}
      </button>
    );
  }

  // What happens to the buttons if they are selected
  if (props.selected) {
    return (
      <button
        className={`w-full h-full rounded-xl focus:outline-none text-lg bg-${selectedColor}`}
        style={playerColor ? { backgroundColor: darkenColor(playerColor) } : {}}
      >
        {props.name}
      </button>
    );
  }

  // What happens to the buttons if they aren't disabled or selected
  return (
    <button
      className={buttonClass}
      style={playerColor ? { backgroundColor: playerColor } : {}}
    >
      {props.name}
    </button>
  );
}

const getDefaultColors = (type) => {
  switch (type) {
    case 'game':
      return { default: 'red-600', hover: 'red-500', selected: 'red-700' };
    case 'player':
      return { default: 'blue-500', hover: 'blue-400', selected: 'blue-900' };
    case 'rally':
      return {
        default: 'yellow-600',
        hover: 'yellow-500',
        selected: 'yellow-700',
      };
    case 'score':
      return {
        default: 'green-500',
        hover: 'green-400',
        selected: 'green-600',
      };
    default:
      return {
        default: 'yellow-500',
        hover: 'yellow-400',
        selected: 'yellow-600',
      };
  }
};

const getPlayerColor = (label, match) => {
  if (!label || !match || !match.players) {
    return '';
  }

  const playerColors = {
    'Player 1': `rgb(${match.players.player1Color.toString()})`,
    'Player 2': `rgb(${match.players.player2Color.toString()})`,
  };

  for (let player in playerColors) {
    if (label.includes(player)) {
      return playerColors[player];
    }
  }

  return '';
};