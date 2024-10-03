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

const convertMsgpackToCsv = (msgpackFilePath, match_id, res) => {
    const tempDir = path.join(`${__dirname}../../tempstorage/`);
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    const outputPath = path.join(tempDir, `pose_data_${match_id}.csv`);
    const readStream = fs.createReadStream(msgpackFilePath);
    const writeStream = fs.createWriteStream(outputPath);

    let headersWritten = false;
    let keypointNames = [];

    readStream.pipe(msgpack.createDecodeStream())
        .on('data', (decodedChunk) => {
            if (!headersWritten) {
         
                const keypointNamesSet = new Set();
                decodedChunk.forEach((data) => {
                    Object.keys(data.keypoints).forEach(kptName => {
                        keypointNamesSet.add(kptName);
                    });
                });
                keypointNames = Array.from(keypointNamesSet);

           
                let headers = ['track_id', 'timestamp'];
                keypointNames.forEach(kptName => {
                    headers.push(`${kptName}_x`, `${kptName}_y`);
                });
                writeStream.write(headers.join(',') + '\n');
                headersWritten = true;
            }

    
            decodedChunk.forEach((data) => {
                const trackId = data.track_id;
                const timestamp = data.timestamp;
                const keypoints = data.keypoints;
                const row = [trackId, timestamp];

                keypointNames.forEach(kptName => {
                    if (keypoints[kptName]) {
                        row.push(keypoints[kptName][0], keypoints[kptName][1]);
                    } else {
                        row.push('', '');
                    }
                });

                writeStream.write(row.join(',') + '\n');
            });
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
        case "pose_json":
            // search poseEstimationData for file with match id
            const poseFolderJson = "poseEstimationData";  
            const filePosePathJson = await findFile(match_id, poseFolderJson);  
            console.log(filePosePathJson);
            if (!filePosePathJson) {
            return res.status(404).json({ error: true, message: 'File not found' });
            }
            // convert and create a temp folder of the binary folder to json
            // pass the converted files path to be downloaded instead of binary    
            await convertMsgpackToJson(filePosePathJson, match_id, res); 
        break;
        case "pose_csv":
            // search poseEstimationData for file with match id
            const poseFolderCSV = "poseEstimationData";  
            const filePosePathCSV = await findFile(match_id, poseFolderCSV);  
            console.log(filePosePathCSV);
            if (!filePosePathCSV) {
            return res.status(404).json({ error: true, message: 'File not found' });
            }
            // convert and create a temp folder of the binary folder to json
            // pass the converted files path to be downloaded instead of binary    
            await convertMsgpackToCsv(filePosePathCSV, match_id, res); 
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
