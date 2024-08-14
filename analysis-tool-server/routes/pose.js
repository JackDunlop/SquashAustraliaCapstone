

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

router.get('/:match_id', async (req, res) => {
    try {
        const match_id = req.params.match_id;
        const videoFilePath = await findVideoFileMatchID(match_id);
        if (!videoFilePath) {
            return res.status(400).json({ message: 'Video file not found' });
        }
        const pythonProcess = spawn('python', ['./python_computer_vision/dev/poseEstimation.py', videoFilePath]);
        let stderrData = '';
        pythonProcess.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });
        pythonProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });
        pythonProcess.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
            if (code === 0) {
                res.status(200).json({ message: 'Finished' });
            } else {
                res.status(500).json({ message: 'Process failed', code: code, error: stderrData });
            }
        });
        pythonProcess.on('error', (err) => {
            console.error(`Failed to start process: ${err}`);
            res.status(500).json({ message: 'Failed to start process', error: err.message });
        });
    } catch (error) {
        console.error(`Unexpected error: ${error}`);
        res.status(500).json({ message: 'Unexpected error', error: error.message });
    }
});

const jsonFileFormats = ['json'];
const findDataFileMatchID = async (match_id) => {
    for (let jsonFileFormat of jsonFileFormats) {
        let _path = path.join(`${__dirname}../../poseEstimationData/${match_id}.${jsonFileFormats}`);

        if (fs.existsSync(_path)) return _path;

    }
    return '';
}

router.get('/velocity/:match_id/:hand', async (req, res) => {
    try {
        const match_id = req.params.match_id;
        const handType = req.params.hand;
        const jsonPath = await findDataFileMatchID(match_id);
        if (!jsonPath) {
            return res.status(400).json({ message: 'Data file not found' });
        }
        const pythonProcess = spawn('python', ['./python_computer_vision/dev/velocity.py', jsonPath, handType]);
        let stderrData = '';
        pythonProcess.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });
        pythonProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });
        pythonProcess.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
            if (code === 0) {
                res.status(200).json({ message: 'Finished' });
            } else {
                res.status(500).json({ message: 'Process failed', code: code, error: stderrData });
            }
        });
        pythonProcess.on('error', (err) => {
            console.error(`Failed to start process: ${err}`);
            res.status(500).json({ message: 'Failed to start process', error: err.message });
        });
    } catch (error) {
        console.error(`Unexpected error: ${error}`);
        res.status(500).json({ message: 'Unexpected error', error: error.message });
    }
});


router.get('/angles/:match_id', async (req, res) => {
    try {
        const match_id = req.params.match_id;
        const jsonPath = await findDataFileMatchID(match_id);
        if (!jsonPath) {
            return res.status(400).json({ message: 'Data file not found' });
        }
        const pythonProcess = spawn('python', ['./python_computer_vision/dev/jointangles.py', jsonPath]);
        let stderrData = '';
        pythonProcess.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });
        pythonProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });
        pythonProcess.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
            if (code === 0) {
                res.status(200).json({ message: 'Finished' });
            } else {
                res.status(500).json({ message: 'Process failed', code: code, error: stderrData });
            }
        });
        pythonProcess.on('error', (err) => {
            console.error(`Failed to start process: ${err}`);
            res.status(500).json({ message: 'Failed to start process', error: err.message });
        });
    } catch (error) {
        console.error(`Unexpected error: ${error}`);
        res.status(500).json({ message: 'Unexpected error', error: error.message });
    }
});



module.exports = router;
