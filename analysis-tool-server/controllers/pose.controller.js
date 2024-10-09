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
      console.log('Python STDOUT:', output);
      //res.write(`data: ${output}\n\n`);
  });
  pythonProcess.on('close', (code) => {
      if (code === 0) {
          console.log(`Script ${scriptName} executed successfully.`);
          return res.status(200).json({ message: 'Finished' });
      } else {

          return res.status(500).json({ message: 'Process failed', code: code, error: stderrData });
      }
  });  
  pythonProcess.on('error', (err) => {

      return res.status(500).json({ message: 'Failed to start process', error: err.message });
  });
};

const findVideoFileMatchID = async (match_id) => {
  for (let videoFileFormat of videoFileFormats) {
    let _path = path.join(__dirname, '../videos', `${match_id}.${videoFileFormat}`);    
    if (fs.existsSync(_path)) return _path;
  }
  return '';
}
const findposeVideoFileMatchID = async (match_id) => {
  for (let videoFileFormat of videoFileFormats) {
    let _path = path.join(__dirname, '../poseOutputVideo', `${match_id}.${videoFileFormat}`);    
    if (fs.existsSync(_path)) return _path;
  }
  return '';
}
const dataFileFormats = ['json','msgpack','png','mp4'];
const findDataFileMatchID = async (match_id, folderName) => {
  for (let fileFormat of dataFileFormats) {
      let _path = path.join(__dirname, `../${folderName}`, `${match_id}.${fileFormat}`);      
      if (fs.existsSync(_path)) return _path;
  }
  return '';
}

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

// 2dmaps
const twoDMaps = (mapType) => {  
  return async (req, res) => {
    const match_id = req.params.match_id;  
   

    try {
      switch(mapType){
        case 'display2dMap': {
          const display2dMapFilePath = await findDataFileMatchID(match_id, "2dMap");
          console.log(display2dMapFilePath);
          if (display2dMapFilePath){
         
            return res.status(409).json({ message: `Data Already stored for ${match_id}` });
          }
          break;
        }
        case 'animated2dMap': {
          const animated2dMapFilePath = await findDataFileMatchID(match_id, "2dMapVideo");
          if (animated2dMapFilePath){
          
            return res.status(409).json({ message: `Data Already stored for ${match_id}` });
          }
          break;
        }
        case 'visualizeHeatmap': {
          const visualizeHeatmapFilePath = await findDataFileMatchID(match_id, "Heatmap");
          if (visualizeHeatmapFilePath){
          
            return res.status(409).json({ message: `Data Already stored for ${match_id}` });
          }
          break;
        }
        default:
          console.log('Invalid mapType:', mapType);
          return res.status(400).json({ message: `Invalid mapType: ${mapType}` });
      }

    

      let msgpckPath, videoFilePath;
      const [result, err] = await util.handle(Match.findById(match_id));
      if (err || !result) {
        console.log('Failed to get match.');
        return res.status(400).json('Failed to get match.');
      }

      const courtBounds = result.courtBounds;
      const players = result.players   
      const courtLayout = JSON.stringify(courtBounds);      
      const playersJson = JSON.stringify(players)      

      try {
        msgpckPath = await findDataFileMatchID(match_id, 'poseEstimationData');
        if (!msgpckPath) {
         
          return res.status(400).json({ message: 'Pose Estimation Data file not found' });
        }
      } catch (error) {
     
        return res.status(500).json({ message: 'Error finding Pose Estimation Data file', error: error.message });
      }      

      try {
        videoFilePath = await findposeVideoFileMatchID(match_id);
        if (!videoFilePath) {
       
          return res.status(400).json({ message: 'Video file not found' });
        }
      } catch (error) {
       
        return res.status(500).json({ message: 'Error finding video file', error: error.message });
      }

      
      runPythonScript(res, '2dMaps.py', [mapType, msgpckPath, videoFilePath, playersJson], courtLayout);         
      
    } catch (error) {
   
      return res.status(500).json({ message: 'Unexpected error', error: error.message });
    }
  };
};


module.exports = {  
  stream,
  findVideoFileMatchID,
  findDataFileMatchID,
  twoDMaps,
  runPythonScript,
  findposeVideoFileMatchID 
};
