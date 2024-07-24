const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const videoFileFormats = ['mp4', 'mov', 'avi'];

const findVideoFile = async (match_id) => {
    for (let videoFileFormat of videoFileFormats) {
        let _path = path.join(__dirname, `../../videos/${match_id}.${videoFileFormat}`);
        console.log(`Checking path: ${_path}`);
        if (fs.existsSync(_path)) return _path;
    }
    return '';
}

router.get('/get/:match_id', async (req, res) => {
    const match_id = req.params.match_id;
    const videoFilePath = await findVideoFile(match_id);
    res.status(200).json({ message: 'Done' });

});

module.exports = router;
