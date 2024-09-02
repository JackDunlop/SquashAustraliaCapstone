const express = require('express');
const router = express.Router();
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

// map After Data is loaded
router.get('/generateMap/:match_id', async (req, res) => {
    try {
        const match_id = req.params.match_id;
        const jsonPath = await poseController.findDataFileMatchID(match_id);
        if (!jsonPath) {
            return res.status(400).json({ message: 'Data file not found' });
        }
        runScript = poseController.runPythonScript(res, 'createMap.py', ['generateMap', jsonPath])
    } catch (error) {
        console.error(`Unexpected error: ${error.message}`);
        res.status(500).json({ message: 'Unexpected error', error: error.message });
    }
});


module.exports = router;