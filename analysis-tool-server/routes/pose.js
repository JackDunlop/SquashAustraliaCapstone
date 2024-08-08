const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const videoFileFormats = ['mp4', 'mov', 'avi'];

const findVideoFileMatchID = async (match_id) => {
    for (let videoFileFormat of videoFileFormats) {
        let _path = path.join(`${__dirname}../../videos/${match_id}.${videoFileFormat}`);

        if (fs.existsSync(_path)) return _path;

    }
    return '';
}
const findPathOutputData = async () => {

    let _path = path.join(__dirname, `../poseEstimationData`);
    if (fs.existsSync(_path)) return _path;

}

router.get('/:match_id', async (req, res) => {
    try {
        const match_id = req.params.match_id;
        const videoFilePath = await findVideoFileMatchID(match_id);
        const outPutDataPath = await findPathOutputData();

        if (!videoFilePath) {
            return res.status(400).json({ message: 'Video file not found' });
        }
        if (!outPutDataPath) {
            return res.status(400).json({ message: 'Output data path not found' });
        }

        const pythonProcess = spawn('python', ['./python_computer_vision/dev/poseEstimation.py', outPutDataPath, videoFilePath]);

        pythonProcess.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
            if (code === 0) {
                res.status(200).json({ message: 'Finished' });
            } else {
                res.status(500).json({ message: 'Process failed', code: code });
            }
        });

        pythonProcess.on('error', (err) => {
            console.error(`Failed to start process: ${err}`);
            res.status(500).json({ message: 'Failed to start process', error: err });
        });

    } catch (error) {
        console.error(`Unexpected error: ${error}`);
        res.status(500).json({ message: 'Unexpected error', error: error.message });
    }
});
module.exports = router;
