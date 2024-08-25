const path = require('path');
const fs = require("fs");
const util = require('../lib/util');
const videoFileFormats = ['mp4', 'mov', 'avi'];

const {Match} = require('../models/Match')

// const findPathOutputData = async () => {
//     let _path = path.join(__dirname, `../poseEstimationData`);
//     if (fs.existsSync(_path)) return _path;
// }


const createMapLayout = async (req, res, next) => {
  const [result, err] = await util.handle(Match.findById(req.params.match_id));
  
  if (err || !result) {
    return res.status(400).json('Failed to get match.');
  }
  console.log(result.courtBounds)
  const courtBounds = result.courtBounds;

  // Return both match_id and courtBounds in the response
  return res.status(200).json({
    match_id: result._id,
    courtBounds: courtBounds
  });
};

const findVideoFileMatchID = async (match_id) => {
  for (let videoFileFormat of videoFileFormats) {
      let _path = path.join(`${__dirname}../../videos/${match_id}.${videoFileFormat}`);

      if (fs.existsSync(_path)) return _path;

  }
  return '';
}
const jsonFileFormats = ['json'];
const findDataFileMatchID = async (match_id) => {
  for (let jsonFileFormat of jsonFileFormats) {
      let _path = path.join(`${__dirname}../../poseEstimationData/${match_id}.${jsonFileFormats}`);

      if (fs.existsSync(_path)) return _path;

  }
  return '';
}


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
