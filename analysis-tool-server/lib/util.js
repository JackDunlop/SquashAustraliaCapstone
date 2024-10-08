const fs = require("fs");

const handle = (promise) => {
  return promise
    .then(result => ([result, undefined]))
    .catch(error => Promise.resolve([undefined, error]));
}

const transformMatches = (matches) => {
  return matches.map((match) => {
    return {
      id: match._id,
      title: match.title,
      players: {
        player1: [match.players.player1.firstName, match.players.player1.lastName].join(' '),
        player2: [match.players.player2.firstName, match.players.player2.lastName].join(' '),
      },
      description: match.description,
        duration: match.duration,
        annotations: match.annotations
    };
  });
};

const getAnnotation = (annotations, annotationIdToGet) => {
  return transformAnnotations(annotations.filter((annotation) => {
    return annotation._id.toString() === annotationIdToGet
  }))[0];
}

const transformAnnotations = (annotations) => {
  return annotations.map((annotation) => {
    return {
      id: annotation._id,
      timestamp: annotation.timestamp,
      playerNumber: annotation.playerNumber,
      components: annotation.components,
      playerPos: annotation.playerPos,
      opponentPos: annotation.opponentPos
    };
  });
};

const handleFileUpload = (_file, path) => {
  return new Promise((resolve, reject) => {
    if (!_file || !_file.mv) {
      console.error('Invalid file object or missing mv method');
      return reject(new Error('Invalid file object or missing mv method'));
    }

    _file.mv(path, function (err) {
      if (err) {
        console.error('Failed to upload file:', err);
        reject(new Error('Failed to upload file.'));
      } else {
        console.log('File successfully uploaded to', path);
        resolve('File successfully uploaded.');
      }
    });
  });
};

const getVideoFileFormat = (mimetype) => {
  return mimetype.slice(-3, mimetype.length)
}

/**
 * Returns a random number between min (inclusive) and max (inclusive)
 */
const between = (min, max) => {
  return Math.floor(
    Math.random() * (max - min + 1) + min
  )
}

module.exports = {
  handle,
  transformMatches,
  transformAnnotations,
  getAnnotation,
  handleFileUpload,
  getVideoFileFormat,
  between,
};
