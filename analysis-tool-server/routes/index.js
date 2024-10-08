const router = require('express').Router();

const matchRouter = require('./match');
const videoRouter = require('./video');
const annotationRouter = require('./annotate');
const colourRouter = require('./colour');
const poseRouter = require('./pose');
const downloadRouter = require('./download');

// index route
router.get('/', (req, res) => {
  res.status(200).json('OK');
});

// match router
router.use('/match', matchRouter);

// video router
router.use('/video', videoRouter);

// annotation router
router.use('/annotate', annotationRouter);


// colour router
router.use('/colour', colourRouter);


router.use('/pose', poseRouter);

router.use('/download', downloadRouter);


module.exports = router;
