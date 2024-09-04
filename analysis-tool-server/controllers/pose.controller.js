const path = require('path');
const fs = require("fs");
const util = require('../lib/util');
const videoFileFormats = ['mp4', 'mov', 'avi'];
const { spawn } = require('child_process');
const {Match} = require('../models/Match')

const runPythonScript = (res, scriptName, args = []) => {
  const pythonScriptPath = path.join(__dirname, `../python_computer_vision/dev/${scriptName}`); 
  //console.log(`Running script: ${scriptName} with args: ${args}`);
  const pythonProcess = spawn('python', [pythonScriptPath, ...args]);

  let stdoutData = '';
  let stderrData = '';

  pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdoutData += output
      console.log(output)
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

// Send courtBounds to heatmap.py
const createMapLayout = async (req, res) => {
  const match_id = req.params.match_id;
  try {    
    const [result,err] = await util.handle(Match.findById(match_id)); 
    if (err||!result) {
      return res.status(400).json('Failed to get match.');
    }
    const players = result.players
    const courtBounds = result.courtBounds;
    let stderrData = '';
    const courtLayout = JSON.stringify({
      match_id: match_id,
      courtBounds: courtBounds,
      
    });
    console.log(courtLayout)
       
    //console.log('Sending data to Python script:', courtLayout);    
    const pythonScriptPath = path.join(__dirname, '../python_computer_vision/dev/heatmap.py');
    const pythonProcess = spawn('python', [pythonScriptPath, 'createLayout']); 
    
    pythonProcess.stdin.write(courtLayout, 'utf-8', (err) => {
      if (err) {
          console.error('Error writing to stdin:', err);
          return res.status(500).json({ message: 'Error writing to Python process', error: err.message });
      }
      pythonProcess.stdin.end();
    });
    
        pythonProcess.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });
        pythonProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        pythonProcess.on('close', (code) => {
          console.log(`Python process exited with code ${code}`);
          if (code === 0) {
            res.status(200).json({ message: 'Finished' });
          } else {
            console.error(`Python stderr: ${stderrData}`);
            res.status(500).json({ message: 'Python script failed', code, error: stderrData });
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
      //console.log(_path)      
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
  createMapLayout,
  runPythonScript
};
