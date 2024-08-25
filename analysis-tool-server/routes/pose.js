const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

const poseController = require('../controllers/pose.controller');
const handle = require('../validators/handle');
const validate = require('../validators/validate');
const { matchIdSchema } = require('../validators/match.schemas');


router.get('/:match_id', async (req, res) => {
    try {
        const match_id = req.params.match_id;
        const videoFilePath = await poseController.findVideoFileMatchID(match_id);
        if (!videoFilePath) {
            return res.status(400).json({ message: 'Video file not found' });
        }
        const pythonScriptPath = path.join(__dirname, '../../analysis-tool-server/python_computer_vision/dev/poseEstimation.py');
        const pythonProcess = spawn('python', [pythonScriptPath, videoFilePath]);
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


router.get('/velocity/:match_id/:hand', async (req, res) => {
    try {
        const match_id = req.params.match_id;
        const handType = req.params.hand;
        const jsonPath = await poseController.findDataFileMatchID(match_id);
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
        const jsonPath = await poseController.findDataFileMatchID(match_id);
        if (!jsonPath) {
            return res.status(400).json({ message: 'Data file not found' });
        }        
        const pythonScriptPath = path.join(__dirname, '../python_computer_vision/dev/jointangles.py');        
        const pythonProcess = spawn('python', [pythonScriptPath, jsonPath]);
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

router.get('/:match_id/stream', async (req, res) => {
    handle(
        validate.params(matchIdSchema)
      ),
    await poseController.stream(req,res)
       
});

// 6 points of court WIP
router.get('/createLayout/:match_id',
    handle(
      validate.params(matchIdSchema)
    ),
    poseController.createMapLayout
);


module.exports = router;