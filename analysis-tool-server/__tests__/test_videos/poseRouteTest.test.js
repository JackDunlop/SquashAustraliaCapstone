// __tests__/poseRoute.test.js


jest.mock('mongoose', () => ({
  Schema: class {},
  model: jest.fn(),
}));

jest.mock('fs');
jest.mock('../../controllers/pose.controller');


jest.mock('../../models/Match', () => ({
  Match: {
    findById: jest.fn(),
  },
}));

// Mock the validation middleware
jest.mock('../../validators/handle', () => (middleware) => (req, res, next) => next());
jest.mock('../../validators/validate', () => ({
  params: jest.fn(() => (req, res, next) => next()),
}));
jest.mock('../../validators/match.schemas', () => ({
  matchIdSchema: {},
}));

const request = require('supertest');
const express = require('express');
const app = express();
const poseRouter = require('../../routes/pose');
const fs = require('fs');
const poseController = require('../../controllers/pose.controller');
const { Match } = require('../../models/Match');

app.use(express.json());
app.use('/', poseRouter);

describe('Pose Route Tests', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  // Test 1: GET / with a non-existent match_id
  test('GET /:match_id with non-existent match_id returns 400 and "Video file not found"', async () => {
    const match_id = '507f1f77bcf86cd799439011'; // Valid ObjectId but non-existent

    // Simulate that data file does not exist
    poseController.findDataFileMatchID.mockResolvedValue('');

    // Simulate that video file does not exist
    poseController.findVideoFileMatchID.mockResolvedValue('');

    const response = await request(app).get(`/${match_id}`);

    expect(response.status).toBe(400);

  });

  // Test 2: GET / when an unexpected error occurs
  test('GET /:match_id when an unexpected error occurs returns 500 and "Unexpected error"', async () => {
    const match_id = '507f1f77bcf86cd799439011';

    // Mock poseController.findDataFileMatchID to throw an error
    poseController.findDataFileMatchID.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const response = await request(app).get(`/${match_id}`);

    expect(response.status).toBe(500);
 
  });

  // Test 3: GET /velocity/:match_id/:hand with data file not found
  test('GET /velocity/:match_id/:hand with data file not found returns 400 and "Data file not found"', async () => {
    const match_id = '507f1f77bcf86cd799439011';
    const handType = 'left';

    // Simulate that data file does not exist
    poseController.findDataFileMatchID.mockResolvedValue('');

    const response = await request(app).get(`/velocity/${match_id}/${handType}`);

    expect(response.status).toBe(400);
   
  });

  // Test 4: GET /velocity/:match_id/:hand when an unexpected error occurs
  test('GET /velocity/:match_id/:hand when an unexpected error occurs returns 500 and "Unexpected error"', async () => {
    const match_id = '507f1f77bcf86cd799439011';
    const handType = 'left';

    // Mock poseController.findDataFileMatchID to throw an error
    poseController.findDataFileMatchID.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const response = await request(app).get(`/velocity/${match_id}/${handType}`);

    expect(response.status).toBe(500);

  });

  // Test 5: GET /angles/:match_id with data file not found
  test('GET /angles/:match_id with data file not found returns 400 and "Data file not found"', async () => {
    const match_id = '507f1f77bcf86cd799439011';

    // Simulate that data file does not exist
    poseController.findDataFileMatchID.mockResolvedValue('');

    const response = await request(app).get(`/angles/${match_id}`);

    expect(response.status).toBe(400);

  });

  // Test 6: GET /angles/:match_id when an unexpected error occurs
  test('GET /angles/:match_id when an unexpected error occurs returns 500 and "Unexpected error"', async () => {
    const match_id = '507f1f77bcf86cd799439011';

    // Mock poseController.findDataFileMatchID to throw an error
    poseController.findDataFileMatchID.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const response = await request(app).get(`/angles/${match_id}`);

    expect(response.status).toBe(500);

  });

  
});
