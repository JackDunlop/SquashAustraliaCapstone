const express = require('express');
const router = express.Router();
const poseController = require('../controllers/pose.controller');
const handle = require('../validators/handle');
const validate = require('../validators/validate');
const { matchIdSchema } = require('../validators/match.schemas');
const util = require('../lib/util');
const {Match} = require('../models/Match')

router.get('/:match_id', async (req, res) => {
    try {
        const match_id = req.params.match_id;
        const videoFilePath = await poseController.findVideoFileMatchID(match_id);
        if (!videoFilePath) {
            return res.status(400).json({ message: 'Video file not found' });
        }        
         const runScript = poseController.runPythonScript(res,'poseEstimation.py',[videoFilePath])
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
        runScript = poseController.runPythonScript(res,'velocity.py',[jsonPath,handType])
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
        runScript = poseController.runPythonScript(res,'jointangles.py',[jsonPath])
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

// courtMap layout and size
router.get('/createLayout/:match_id',
    handle(
      validate.params(matchIdSchema)
    ),
    poseController.createMapLayout
    
);

router.get('/generateMap/:match_id', async (req, res) => {
    try {
        const match_id = req.params.match_id;
        
        const [result, err] = await util.handle(Match.findById(match_id));
        if (err || !result) {
            return res.status(400).json('Failed to get match.');
        }
        const players = result.players;
        const playersJSON = JSON.stringify(players);
        try {
            jsonPath = await poseController.findDataFileMatchID(match_id);
            if (!jsonPath) {
                return res.status(400).json({ message: 'Data file not found' });
            }
        } catch (jsonPathError) {
            console.error(`Error finding data file for match ${match_id}: ${jsonPathError.message}`);
            return res.status(500).json({ message: 'Error finding data file', error: jsonPathError.message });
        }      
      
        const runScript = poseController.runPythonScript(res, 'heatmap.py', ['generateMap', jsonPath, match_id, playersJSON]);
    } catch (error) {
        console.error(`Unexpected error: ${error.message}`);
        res.status(500).json({ message: 'Unexpected error', error: error.message });
    }
});


module.exports = router;