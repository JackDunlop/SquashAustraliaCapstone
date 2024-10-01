
const path = require('path');
const fs = require('fs');
const util = require('../lib/util');
const { spawn } = require('child_process');
const fsExtra = require('fs-extra');

const upload = async (req, res, next) => {
  if (req.files && req.files.video) {
    const _path = path.join(
      `${__dirname}../../videos/${req.params.match_id}.${util.getVideoFileFormat(req.files.video.mimetype)}`
    );

    try {
      const result = await util.handleFileUpload(req.files.video, _path);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json('Unexpected error');
    }
  } else {
    return res.status(400).json('No video file provided.');
  }
};

const stream = async (req, res, next) => {
  try {
    const range = req.headers.range;

    if (!range) {
      return res.status(400).send('Requires Range header');
    }

    const videoFileFormats = ['mp4', 'mov', 'avi'];

    const findVideoFile = async () => {
      for (let videoFileFormat of videoFileFormats) {
        let _path = path.join(`${__dirname}../../videos/${req.params.match_id}.${videoFileFormat}`);

        if (fs.existsSync(_path)) return _path;
      }
      return '';
    };

    const videoFilePath = await findVideoFile();

    if (videoFilePath !== '') {
      const videoSize = fs.statSync(videoFilePath).size;

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
      return res.status(404).json('');
    }
  } catch (error) {
    return res.status(500).json({ message: 'Unexpected error' });
  }
};

const extractFirstFrame = async (req, res, next) => {
  try {
    if (req.params.filename) {
      const videoFilePath = path.join(`${__dirname}../../tempstorage/${req.params.filename}`);
      if (!fs.existsSync(videoFilePath)) {
        return res.status(500).json({ message: 'Process failed', code: 1, error: 'Video file not found' });
      }

      const scriptPath = path.join(__dirname, '../controllers/firstFrame.py');
      const pythonProcess = spawn('python', [scriptPath, videoFilePath]);
      let stderrData = '';

      pythonProcess.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
      });

      pythonProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      pythonProcess.on('close', async (code) => {
        if (code === 0) {
          const videoname = req.params.filename;
          const imagename = videoname.split('.')[0];
          const imagepath = path.join(__dirname, '../firstFrameExtracts', `${imagename}.jpg`);
          res.setHeader('Content-Type', 'image/jpeg');
          const readStream = fs.createReadStream(imagepath);
          readStream.pipe(res);
        } else {
          return res.status(500).json({ message: 'Process failed', code: code, error: stderrData });
        }
      });

      pythonProcess.on('error', (err) => {
        return res.status(500).json({ message: 'Failed to start process', error: err.message });
      });
    } else {
      return res.status(400).json('No Video Uploaded Matching That Match ID');
    }
  } catch (error) {
    return res.status(500).json({ message: 'Unexpected error' });
  }
};

const uploadTemp = async (req, res, next) => {
  if (req.files && req.files.video) {
    try {
      const originalFileName = req.files.video.name;
      const videoExtension = util.getVideoFileFormat(req.files.video.mimetype);
      const tempVideoPath = path.join(
        `${__dirname}../../tempstorage/${path.basename(originalFileName, path.extname(originalFileName))}.${videoExtension}`
      );
      if (!fs.existsSync(path.join(`${__dirname}../../tempstorage`))) {
        fs.mkdirSync(path.join(`${__dirname}../../tempstorage`), { recursive: true });
      }
      await util.handleFileUpload(req.files.video, tempVideoPath);
      return res.status(200).json({
        message: 'Video uploaded successfully',
        videoName: tempVideoPath,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Unexpected error' });
    }
  } else {
    return res.status(400).json('No video file provided.');
  }
};

module.exports = {
  upload,
  stream,
  extractFirstFrame,
  uploadTemp,
};
