const path = require('path');
const fs = require("fs");
const util = require('../lib/util');
const videoFileFormats = ['mp4', 'mov', 'avi'];
const { spawn } = require('child_process');
const {Match} = require('../models/Match')

// const findPathOutputData = async () => {
//     let _path = path.join(__dirname, `../poseEstimationData`);
//     if (fs.existsSync(_path)) return _path;
// }

const findVideoFileMatchID = async (match_id) => {
  for (let videoFileFormat of videoFileFormats) {
    let _path = path.join(__dirname, '../videos', `${match_id}.${videoFileFormat}`);    
    if (fs.existsSync(_path)) return _path;
  }
  return '';
}

const dataFileFormats = ['json','msgpack'];
const findDataFileMatchID = async (match_id) => {
  for (let fileFormat of dataFileFormats) {
      let _path = path.join(__dirname, '../poseEstimationData', `${match_id}.${fileFormat}`);      
      if (fs.existsSync(_path)) return _path;
  }
  return '';
}

// Send courtBounds to heatmap.py
const createMapLayout = async (req, res) => {
  const [result, err] = await util.handle(Match.findById(req.params.match_id)); 
  if (err || !result) {
    return res.status(400).json('Failed to get match.');
  }
  try {
    match_id = req.params.match_id
    const jsonPath = await findDataFileMatchID(match_id);
    if (!jsonPath) {
      return res.status(400).json({ message: 'Data file not found' });
    } 
    const courtBounds = result.courtBounds;
    const courtLayout = JSON.stringify({
      match_id: match_id,
      courtBounds: courtBounds
  });    
    console.log(courtLayout)   
    const pythonScriptPath = path.join(__dirname, '../python_computer_vision/dev/heatmap.py');

    const cleanLayout  = courtLayout.replace(/"/g, '\\"');
    const pythonProcess = spawn('python', [pythonScriptPath, ...cleanLayout]);
    pythonProcess.stdin.write(courtLayout);
    pythonProcess.stdin.end();
    pythonProcess.stdout.on('data', (data) => {
      console.log(`Python stdout: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
      if (code === 0) {
        res.status(200).json({ message: 'Finished' });
      } else {
        res.status(500).json({ message: 'Python script failed', code });
      }
    });
    pythonProcess.on('error', (err) => {      
      res.status(500).json({ message: 'Failed to start Python process', error: err.message });
    });

  } catch (error) {
    console.error(`Unexpected error: ${error}`);
    res.status(500).json({ message: 'Unexpected error', error: error.message });
  }    
};

// upload video
const upload = async (req, res, next) => {
  if (req.files && req.files.video) {
    const _path =
      path.join(
        `${__dirname}../../poseOutputVideo/${req.params.match_id}.${util.getVideoFileFormat(req.files.video.mimetype)}`
      );
    const [result, err] = await util.handleFileUpload(req.files.video, _path);

    if (err) return res.status(400).json(err.message);
  } else {
    res.status(400).json('No video file provided.');
  }
};

// stream video
const stream = async (req, res, next) => {  
  // ensure there is a range given for the video
  const range = req.headers.range;
  if (!range) {
    res.status(400).send('Requires Range header');
    
  }
  
  // Find video in output folder
  const findVideoFile = async () => {
    for (let videoFileFormat of videoFileFormats) {
      let _path = path.join(`${__dirname}../../poseOutputVideo/${req.params.match_id}.${videoFileFormat}`);
      console.log(_path)      
      // ensure that the video file exists
      if (fs.existsSync(_path)) return _path;
    }

    return '';
  }

  const videoFilePath = await findVideoFile();

  if (videoFilePath !== '') {
    const videoSize = fs.statSync(videoFilePath).size;

    // parse range
    const CHUNK_SIZE = 10 ** 6; // 1MB
    const start = Number(range.replace(/\D/g, ''));
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

    const contentLength = end - start + 1;
    const headers = {
      'Content-Range': `bytes ${start}-${end}/${videoSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': contentLength,
      'Content-Type': 'video/mp4',
    };

    res.writeHead(206, headers);

    const videoStream = fs.createReadStream(videoFilePath, { start, end });

    videoStream.pipe(res);
  } else {
    res.status(404).json('');
  }
};

module.exports = {
  upload,
  stream,
  findVideoFileMatchID,
  findDataFileMatchID,
  createMapLayout
};
