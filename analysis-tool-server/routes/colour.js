const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Stolen from video controller
const videoFileFormats = ['mp4', 'mov', 'avi'];
const findVideoFileMatchID = async (match_id) => {
  for (let videoFileFormat of videoFileFormats) {
    let _path = path.join(`${__dirname}../../videos/${match_id}.${videoFileFormat}`);

    if (fs.existsSync(_path)) return _path;

  }
  return '';
}


router.get('/players/:match_id', async (req, res) => {
  const match_id = req.params.match_id;
  const videoFilePath = await findVideoFileMatchID(match_id);

  const pythonProcess = spawn('python', ['./python_computer_vision/kmeans/kmeansplayerselection.py', videoFilePath]); // kmeans python script will take args video path
  let scriptOutput = '';


  pythonProcess.stdout.on('data', (data) => {
    scriptOutput += data.toString();
  });


  pythonProcess.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
    if (code === 0) {
      const cleanedOutput = scriptOutput.replace(/[\r\n]/g, '');
      let jsonOutput = JSON.parse(cleanedOutput);
      const { PlayerOne, PlayerTwo } = jsonOutput;
      res.status(200).json({ message: 'Process completed', PlayerOne, PlayerTwo });
    } else {
      res.status(500).json({ message: 'Process failed', code: code });
    }
  });

  pythonProcess.on('error', (err) => {
    console.error(`Failed to start process: ${err}`);
    res.status(500).json({ message: 'Failed to start process', error: err });
  });

});

module.exports = router;
