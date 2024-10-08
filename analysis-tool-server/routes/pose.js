const express = require('express');
const router = express.Router();
const poseController = require('../controllers/pose.controller');
const handle = require('../validators/handle');
const validate = require('../validators/validate');
const { matchIdSchema } = require('../validators/match.schemas');


router.get('/:match_id', async (req, res) => {
    try {
        const match_id = req.params.match_id;
        const dataFilePath = await poseController.findDataFileMatchID(match_id,"poseEstimationData");
        if (dataFilePath){
            return res.status(409).json({message: `Data Already stored for ${match_id}`})
        }
        const videoFilePath = await poseController.findVideoFileMatchID(match_id);
        if (!videoFilePath) {
            return res.status(400).json({ message: 'Video file not found' });
        }        
        await poseController.runPythonScript(res,'poseEstimation.py',[videoFilePath])
    } catch (error) {
        return res.status(500).json({ message: 'Unexpected error', error: error.message });
    }
});

router.get('/poll/:match_id/:', async (req, res) => {});



router.get('/velocity/:match_id/:hand', async (req, res) => {
    try {
        const match_id = req.params.match_id;
        const handType = req.params.hand;
        const jsonPath = await poseController.findDataFileMatchID(match_id,"poseEstimationData");
        if (!jsonPath) {
            return res.status(400).json({ message: 'Data file not found' });
        }
        runScript = poseController.runPythonScript(res,'velocity.py',[jsonPath,handType])
    } catch (error) {
      
        res.status(500).json({ message: 'Unexpected error', error: error.message });
    }
});

router.get('/angles/:match_id', async (req, res) => {
    try {
        const match_id = req.params.match_id;
        const jsonPath = await poseController.findDataFileMatchID(match_id,"poseEstimationData");
        if (!jsonPath) {
            return res.status(400).json({ message: 'Data file not found' });
        }    
        const dataFilePath = await poseController.findDataFileMatchID(match_id,"jointAngleCalculation");
        if (dataFilePath){
            return res.status(409).json({message: `Data Already stored for ${match_id}`})
        }
        runScript = poseController.runPythonScript(res,'jointangles.py',[jsonPath])
    } catch (error) {
     
        res.status(500).json({ message: 'Unexpected error', error: error.message });
    }
});

router.get('/:match_id/stream', async (req, res) => {    
    const matchId = req.params.match_id       
    if (!matchId){
        return res.status(400).json({message: "no Match ID"})
    }    
    await poseController.stream(req,res)
       
});

router.get('/display2dMap/:match_id',
    handle(
      validate.params(matchIdSchema)
    ),
    poseController.twoDMaps("display2dMap")  
);

router.get('/animated2dMap/:match_id',
    handle(
      validate.params(matchIdSchema)
    ),
    poseController.twoDMaps("animated2dMap")   
);

router.get('/visualizeHeatmap/:match_id',
    handle(
      validate.params(matchIdSchema)
    ),
    poseController.twoDMaps("visualizeHeatmap")   
);
module.exports = router;