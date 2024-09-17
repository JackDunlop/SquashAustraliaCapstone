const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');
const videoFileFormats = ['mp4', 'mov', 'avi'];
const findVideoFileMatchID = async (match_id) => {
  for (let videoFileFormat of videoFileFormats) {
    let _path = path.join(`${__dirname}../../tempstorage/${match_id}.${videoFileFormat}`);

    if (fs.existsSync(_path)) return _path;

  }
  return '';
}


router.get('/players/:videofilename', async (req, res) => {
  const match_id = req.params.videofilename;
  const videoFilePath = await findVideoFileMatchID(match_id);

  const pythonScriptPath = path.join(__dirname, '../../analysis-tool-server/python_computer_vision/kmeans/kmeansplayerselection.py');

  const pythonProcess = spawn('python', [pythonScriptPath, videoFilePath]);
  let scriptOutput = '';


  pythonProcess.stdout.on('data', (data) => {
    scriptOutput += data.toString();
  });

  pythonProcess.on('close', async (code) => {
    console.log(`child process exited with code ${code}`);
    if (code === 0) {
      try {
        const startIndex = scriptOutput.indexOf('"PlayerOne"');
        if (startIndex !== -1) {
          const jsonString = `{${scriptOutput.substring(startIndex)}`;
          const jsonOutput = JSON.parse(jsonString);

          const { PlayerOne, PlayerTwo } = jsonOutput;

         // await fsExtra.emptyDir(path.join(`${__dirname}../../tempstorage`));

          res.status(200).json({ message: 'Process completed', PlayerOne, PlayerTwo });
        } else {
          res.status(500).json({ message: 'Error: JSON output not found' });
        }
      } catch (err) {
        res.status(500).json({ message: 'Error parsing JSON', error: err });
      }
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
