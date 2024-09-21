const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');
const msgpack = require("msgpack-lite");

const validFileFormats = ['mp4', 'mov', 'avi', 'msgpack', 'png']; // ew

const findFile= async (match_id, folder) => {
    for (const fileFormat of validFileFormats) {
      const _path = path.join(`${__dirname}../../${folder}/${match_id}.${fileFormat}`);
  
      if (fs.existsSync(_path)) return _path;
  
    }
    return '';
}
const convertMsgpackToJson = (msgpackFilePath, match_id, res) => {
    const tempDir = path.join(`${__dirname}../../tempstorage/`);
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    const outputPath = path.join(tempDir, `pose_data_${match_id}.json`);
    const readStream = fs.createReadStream(msgpackFilePath);
    const writeStream = fs.createWriteStream(outputPath);

    readStream.pipe(msgpack.createDecodeStream()) 
        .on('data', (decodedChunk) => {
            writeStream.write(JSON.stringify(decodedChunk)); 
        })
        .on('end', () => {
            writeStream.end(() => {
                downloadFile(outputPath, res); 
            });
        })
        .on('error', (readError) => {
            fs.unlinkSync(outputPath); 
            res.status(500).json({ error: true, message: 'Error reading or decoding the input file.' });
        });

    writeStream.on('error', (writeError) => {
        res.status(500).json({ error: true, message: 'Error writing the output file.' });
    });
};

const downloadFile = async (folder, res) => {
    try {
        fs.access(folder, fs.constants.F_OK, (err) => {
            if (err) {
                return res.status(404).json({ error: true, message: 'File not found to download' });
            }
            return res.download(folder, (err) => {
                fsExtra.emptyDir(path.join(`${__dirname}../../tempstorage`));
                if (err) {
                    return res.status(404).json({ error: true, message: 'Error downloading file.' });
                }
            });
        });
    } catch (error) {
        return res.status(500).json({ error: true, message: 'Error finding file to download.' });
    }
}


router.get('/:match_id/:typeofdata', async (req, res) => {
    
    const match_id = req.params.match_id;
    const typeofdata = req.params.typeofdata;
    console.log(typeofdata);
    if(typeof(match_id) !== 'string'  || typeof(typeofdata) !== 'string'){
        return res.status(404).json({error: true, message: 'Incorrect data types.'});
    }

    if(!match_id  || !typeofdata){
        return res.status(404).json({ error: true,message: 'Missing required parameters'});
    }

    if(match_id.trim() === '' || typeofdata.trim() === ''){
        return res.status(404).json({ error: true, message: 'Required parameters blank...'});
    }

   
    switch(typeofdata){
        case "pose":
            // search poseEstimationData for file with match id
            const poseFolder = "poseEstimationData";  
            const filePosePath = await findFile(match_id, poseFolder);  
            console.log(filePosePath);
            if (!filePosePath) {
            return res.status(404).json({ error: true, message: 'File not found' });
            }
            // convert and create a temp folder of the binary folder to json
            // pass the converted files path to be downloaded instead of binary    
            await convertMsgpackToJson(filePosePath, match_id, res); 
        break;
        case "jointangles":
            // search jointAngleCalculation for file with match id
            const  jointFolder = "poseEstimationData";       
            const fileJointPath = await findFile(match_id, jointFolder); 
            if (!fileJointPath) {
            return res.status(404).json({ error: true, message: 'File not found' });
            }
            downloadFile(fileJointPath,res);
        break;
        case "heatmap":
            // search heatmapdata for file with match id
            const heatmap = "heatmapdata";   // folder unknown right now
            const fileHeatmapPath = await findFile(match_id, heatmap); 
            if (!fileHeatmapPath) {
            return res.status(404).json({ error: true, message: 'File not found' });
            }
            downloadFile(fileHeatmapPath,res);
        break;
        case "velocity":
            // search wristDataChart for file with match id
            const wristFolder = "wristDataChart";   
            const fileWristPath = await findFile(match_id, wristFolder); 
            if (!fileWristPath) {
            return res.status(404).json({ error: true, message: 'File not found' });
            }
            downloadFile(fileWristPath,res);
        break;
        case "video":
            const videoFolder = "videos";
            const videoPath = await findFile(match_id, videoFolder); 
            if (!videoPath) {
            return res.status(404).json({ error: true, message: 'File not found' });
            }
            downloadFile(videoPath ,res);
        break;
        default:
        return res.status(400).json({error: true, message: 'Invalid type of data!'});
    }

   
});

module.exports = router;
