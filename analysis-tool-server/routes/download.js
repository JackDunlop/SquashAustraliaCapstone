const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');

const validFileFormats = ['mp4', 'mov', 'avi', 'msgpack', 'png']; // ew

const findFile= async (match_id, folder) => {
    for (const fileFormat of validFileFormats) {
      const _path = path.join(`${__dirname}../../${folder}/${match_id}.${fileFormat}`);
  
      if (fs.existsSync(_path)) return _path;
  
    }
    return '';
}

const convertMsgpackToJson = (msgpackFilePath, callback) => {
    fs.readFile(msgpackFilePath, (err, buffer) => {
        if (err) {
            return callback(err, null);
        }
  
        try {
            const data = msgpack.decode(buffer);
            return callback(null, data);
        } catch (decodeError) {
            return callback(decodeError, null);
        }
    });
  }

const downloadFile = async (folder, match_id, extension ,res) => {
    try {
        const filePath = await findFile(match_id, folder); 
        if (!filePath) {
            return res.status(404).json({ error: true, message: 'File not found' });
        }
        
        // download file
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                return res.status(404).json({ error: true, message: 'File not found' });
            }
            return res.download(filePath, (err) => {
                if (err) {
                    return res.status(404).json({ error: true, message: 'Error downloading file.' });
                }
            });
        });
    } catch (error) {
        return res.status(500).json({ error: true, message: 'Error finding file.' });
    }
}

// 
router.get('/:match_id/:extension/:typeofdata', async (req, res) => {
    
    const match_id = req.params.match_id;
    const extension = req.params.extension;
    const typeofdata = req.params.typeofdata;
    if(typeof(match_id) !== 'string' || typeof(extension) !== 'string' || typeof(typeofdata) !== 'string'){
        return res.status(404).json({error: true, message: 'Incorrect data types.'});
    }

    if(!match_id || !extension || !typeofdata){
        return res.status(404).json({ error: true,message: 'Missing required parameters'});
    }

    if(match_id.trim() === '' || extension.trim() === '' || typeofdata.trim() === ''){
        return res.status(404).json({ error: true, message: 'Required parameters blank...'});
    }

   
    switch(typeofdata){
        case "pose":
            // search poseEstimationData for file with match id
            const poseFolder = "poseEstimationData";       
            downloadFile(poseFolder, match_id, extension, res);
        break;
        case "jointangles":
            // search jointAngleCalculation for file with match id
            const  jointFolder = "poseEstimationData";       
            downloadFile(jointFolder, match_id , extension,res);
        break;
        case "heatmap":
            // search heatmapdata for file with match id
            const heatmap = "heatmapdata";   // folder unknown right now
            downloadFile(heatmap, match_id, extension ,res);
        break;
        case "velocity":
            // search wristDataChart for file with match id
            const wristFolder = "wristDataChart";   
            downloadFile(wristFolder, match_id, extension ,res);
        break;
        default:
        return res.status(400).json({error: true, message: 'Invalid type of data!'});
    }
});

module.exports = router;
