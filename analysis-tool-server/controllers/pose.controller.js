const path = require('path');
const fs = require("fs");
const util = require('../lib/util');
const videoFileFormats = ['mp4', 'mov', 'avi'];
const { spawn } = require('child_process');
const {Match} = require('../models/Match')



const runPythonScript = (res, scriptName, args = [], inn = null) => {
  const pythonScriptPath = path.join(__dirname, `../python_computer_vision/dev/${scriptName}`);
  
  // Spawn the Python process
  const pythonProcess = spawn('python', [pythonScriptPath, ...args]);
  
  if (inn) {
    pythonProcess.stdin.write(inn, 'utf-8', (err) => {
      if (err) {
        console.error('Error writing to stdin:', err);
        res.status(500).json({ message: 'Error writing to Python process', error: err.message });
      }      
      pythonProcess.stdin.end();
    });
  }
  let stdoutData = '';
  let stderrData = '';
  pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdoutData += output;
      console.log(output);  // Log the output for debugging
  });
  pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
  });
  pythonProcess.on('close', (code) => {
      if (code === 0) {
          console.log(`Script ${scriptName} executed successfully.`);
          res.status(200).json({ message: 'Finished', output: stdoutData });
      } else {
          console.error(`Script ${scriptName} failed with exit code ${code}: ${stderrData}`);
          res.status(500).json({ message: 'Process failed', code: code, error: stderrData });
      }
  });  
  pythonProcess.on('error', (err) => {
      console.error(`Failed to start script ${scriptName}: ${err}`);
      res.status(500).json({ message: 'Failed to start process', error: err.message });
  });
};

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
// upload video
const upload = async (req, res, next) => {
  if (req.files && req.files.video) {
    const _path = path.join(
      `${__dirname}../../poseOutputVideo/${req.params.match_id}.${util.getVideoFileFormat(req.files.video.mimetype)}`
    );
    try {
      const result = await util.handleFileUpload(req.files.video, _path);
      res.status(200).json(result);
    } catch (err) {
      console.log('err', err);
      res.status(400).json(err.message);
    }
  } else {
    res.status(400).json('No video file provided.');
  }
};
const stream = async (req, res, next) => {
  const range = req.headers.range;
  
  // If the request method is HEAD, respond with just the headers
  if (req.method === 'HEAD') {
    
    const videoFilePath = path.join(__dirname, '../poseOutputVideo', `${req.params.match_id}.mp4`);    
    console.log(videoFilePath)
    if (!fs.existsSync(videoFilePath)) {
      return res.status(404).send('Video not found');
    }

    const videoSize = fs.statSync(videoFilePath).size;
    res.writeHead(200, {
      'Content-Length': videoSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
    });
    return res.end();  // End the response without streaming content
  }

  // For GET requests, continue with streaming logic
  if (!range) {
    return res.status(400).send('Requires Range header');
  }

  const videoFilePath = path.join(__dirname, '../poseOutputVideo', `${req.params.match_id}.mp4`);
  
  if (!fs.existsSync(videoFilePath)) {
    return res.status(404).send('Video not found');
  }

  const videoSize = fs.statSync(videoFilePath).size;
  const CHUNK_SIZE = 10 ** 6; // 1MB chunk size
  const start = Number(range.replace(/\D/g, ''));
  const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
  const contentLength = end - start + 1;

  const headers = {
    'Content-Range': `bytes ${start}-${end}/${videoSize}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': contentLength,
    'Content-Type': 'video/mp4',
  };

  res.writeHead(206, headers); // HTTP 206 for partial content
  const videoStream = fs.createReadStream(videoFilePath, { start, end });
  videoStream.pipe(res);
};

// Send courtBounds to heatmap.py
const createMapLayout = async (req, res) => {
  const match_id = req.params.match_id;  
  try {
    const [result, err] = await util.handle(Match.findById(match_id));
    if (err || !result) {
        return res.status(400).json('Failed to get match.');
    }
    const courtDataPath = path.join(__dirname, '../python_computer_vision/courtData.json');
    const courtBounds = result.courtBounds;    
    const courtLayout = JSON.stringify(courtBounds);
    try {
      jsonPath = await findDataFileMatchID(match_id);
      if (!jsonPath) {
          return res.status(400).json({ message: 'Data file not found' });
      }
      } catch (Error) {
          console.error(`Error finding data file for match ${match_id}: ${Error.message}`);
          return res.status(500).json({ message: 'Error finding data file', error: Error.message });
      }
      try {            
          const videoFilePath = await findVideoFileMatchID(match_id);
          if (!videoFilePath) {
              return res.status(400).json({ message: 'Video file not found' });
          }
          const runScript = runPythonScript(res,'heatmap.py',[courtDataPath,jsonPath,videoFilePath],courtLayout)          
      } catch (error) {
          console.error(`Error finding video file for match ${match_id}: ${error.message}`);
          res.status(500).json({ message: 'Error finding video file', error: error.message });
      } 
    } catch (error) {
      console.error(`Unexpected error: ${error.message}`);
      res.status(500).json({ message: 'Unexpected error', error: error.message });
    }
};

module.exports = {
  upload,
  stream,
  findVideoFileMatchID,
  findDataFileMatchID,
  createMapLayout,
  runPythonScript  
};
