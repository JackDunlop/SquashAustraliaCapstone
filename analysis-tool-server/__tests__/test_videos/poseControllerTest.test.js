
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

const request = require('supertest');
const express = require('express');
const app = express();
const poseRouter = require('../../routes/pose'); // Adjust the path
const fs = require('fs');
const poseController = require('../../controllers/pose.controller');
const { Match } = require('../../models/Match'); // Match is now properly mocked

app.use(express.json());
app.use('/', poseRouter);

describe('Pose Routes Tests', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  // Test 1: GET / with a non-existent match_id
  test('GET /:match_id with non-existent match_id returns 400 and "Video file not found"', async () => {
    const match_id = 'nonexistent_match_id';

    fs.existsSync.mockReturnValue(false);
    poseController.findDataFileMatchID.mockResolvedValue(null);

    const response = await request(app).get(`/${match_id}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Video file not found' });
  });

  // Test 2: GET / when an unexpected error occurs
  test('GET /:match_id when an unexpected error occurs returns 500 and "Unexpected error"', async () => {
    const match_id = '66f93f9c728b890c58714882';

    poseController.findDataFileMatchID.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const response = await request(app).get(`/${match_id}`);

    expect(response.status).toBe(500);
    expect(response.body.message).toEqual('Unexpected error');
  });
  // Test 3: GET /velocity/ with data file not found
  test('GET /velocity/:match_id/:hand with data file not found returns 400 and "Data file not found"', async () => {
    const match_id = 'some_match_id';
    const handType = 'left';

    poseController.findDataFileMatchID.mockResolvedValue(null);

    const response = await request(app).get(`/velocity/${match_id}/${handType}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Data file not found' });
  });

  // Test 4: GET /velocity/ when an unexpected error occurs
  test('GET /velocity/:match_id/:hand when an unexpected error occurs returns 500 and "Unexpected error"', async () => {
    const match_id = '66f93f9c728b890c58714882';
    const handType = 'left';

    poseController.findDataFileMatchID.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const response = await request(app).get(`/velocity/${match_id}/${handType}`);

    expect(response.status).toBe(500);
    expect(response.body.message).toEqual('Unexpected error');
  });

  // Test 5: GET /angles/ with data file not found
  test('GET /angles/:match_id with data file not found returns 400 and "Data file not found"', async () => {
    const match_id = 'some_match_id';

    poseController.findDataFileMatchID.mockResolvedValue(null);

    const response = await request(app).get(`/angles/${match_id}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Data file not found' });
  });

  // Test 6: GET /angles/ when an unexpected error occurs
  test('GET /angles/:match_id when an unexpected error occurs returns 500 and "Unexpected error"', async () => {
    const match_id = '66f93f9c728b890c58714882';

    poseController.findDataFileMatchID.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const response = await request(app).get(`/angles/${match_id}`);

    expect(response.status).toBe(500);
    expect(response.body.message).toEqual('Unexpected error');
  });
});
