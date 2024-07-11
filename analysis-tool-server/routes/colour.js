const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');


const videoFileFormats = ['mp4', 'mov', 'avi'];

const findVideoFile = async (match_id) => {
  for (let videoFileFormat of videoFileFormats) {
    let _path = path.join(`${__dirname}../../videos/${match_id}.${videoFileFormat}`);


    if (fs.existsSync(_path)) return _path;
  }

  return '';
}

router.get('/players/get/:match_id', async (req, res) => {
  const match_id = req.params.match_id;
  const videoFilePath = await findVideoFile(match_id);

  //console.log(videoFilePath);
  //console.log(match_id);


  const pythonProcess = spawn('python', ['./python_computer_vision/kmeans/kmeansplayerselection.py', videoFilePath]); // kmeans python script will take args video path

  let scriptOutput = '';

  // Handle stdout data
  pythonProcess.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
    scriptOutput += data.toString();
  });

  // Handle process exit
  pythonProcess.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
    if (code === 0) {
      // Clean the script output by removing \r and \n
      const cleanedOutput = scriptOutput.replace(/[\r\n]/g, '');
      res.status(200).json({ message: 'Process completed', output: cleanedOutput });
    } else {
      res.status(500).json({ message: 'Process failed', code: code });
    }
  });

  // Handle process error
  pythonProcess.on('error', (err) => {
    console.error(`Failed to start process: ${err}`);
    res.status(500).json({ message: 'Failed to start process', error: err });
  });

});

module.exports = router;
