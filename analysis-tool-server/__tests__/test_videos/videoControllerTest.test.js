// __tests__/videoRoute.test.js

jest.mock('mongoose', () => ({
    Schema: class {},
    model: jest.fn(),
  }));
  
  jest.mock('fs');
  jest.mock('fs-extra');
  jest.mock('child_process');
  
  // Mock validators to bypass actual validation
  jest.mock('../../validators/handle', () => (middleware) => (req, res, next) => next());
  jest.mock('../../validators/validate', () => ({
    params: jest.fn(() => (req, res, next) => next()),
  }));
  jest.mock('../../validators/match.schemas', () => ({
    matchIdSchema: {},
  }));
  
  // Mock utility functions
  jest.mock('../../lib/util', () => ({
    getVideoFileFormat: jest.fn(() => 'mp4'),
    handleFileUpload: jest.fn(),
  }));
  
  const request = require('supertest');
  const express = require('express');
  const expressFileUpload = require('express-fileupload');
  const path = require('path');
  const EventEmitter = require('events');
  const videoRouter = require('../../routes/video');
  const fs = require('fs');
  const fsExtra = require('fs-extra');
  const { spawn } = require('child_process');
  const util = require('../../lib/util');
  
  describe('Video Route Tests', () => {
    let app;
  
    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use(expressFileUpload());
      app.use('/', videoRouter);
    });
  
    afterEach(() => {
      jest.resetAllMocks();
    });
  
    // TC1: Test POST /:match_id/upload with valid match_id and video file
    test('TC1: POST /:match_id/upload with valid match_id and video file', async () => {
      const match_id = '66f93f9c728b890c58714882'; // Valid ObjectId
  
      util.handleFileUpload.mockResolvedValue({ message: 'Upload successful' });
  
      const response = await request(app)
        .post(`/${match_id}/upload`)
        .attach('video', Buffer.from('fake video data'), 'test_video.mp4');
  
      expect(response.status).toBe(200);
      expect(util.handleFileUpload).toHaveBeenCalled();
    });
  
    // TC2: Test POST /:match_id/upload without video file
    test('TC2: POST /:match_id/upload without video file', async () => {
      const match_id = '66f93f9c728b890c58714882';
  
      const response = await request(app).post(`/${match_id}/upload`);
  
      expect(response.status).toBe(400);
      expect(response.body).toBe('No video file provided.');
    });
  
    // TC3: Test POST /:match_id/upload with invalid match_id
    test('TC3: POST /:match_id/upload with invalid match_id', async () => {
      const match_id = 'invalid_match_id';
  
      // Since we mocked the validators to pass, we need to simulate the validation failure
      const validate = require('../../validators/validate');
      validate.params.mockImplementation(() => (req, res, next) => {
        res.status(400).json('Invalid match_id');
      });
  
      const response = await request(app).post(`/${match_id}/upload`);
  
      expect(response.status).toBe(400);
    
    });
  
  
    // TC5: Test GET /:match_id/stream with non-existing video file
    test('TC5: GET /:match_id/stream with non-existing video file', async () => {
      const match_id = '66f93f9c728b890c58714882';
  
      // Mock fs.existsSync to return false
      fs.existsSync.mockReturnValue(false);
  
      const response = await request(app)
        .get(`/${match_id}/stream`)
        .set('Range', 'bytes=0-');
  
      expect(response.status).toBe(404);
      expect(response.body).toBe('');
    });
  
    // TC6: Test GET /:match_id/stream without Range header
    test('TC6: GET /:match_id/stream without Range header', async () => {
      const match_id = '66f93f9c728b890c58714882';
  
      const response = await request(app).get(`/${match_id}/stream`);
  
      expect(response.status).toBe(400);
      expect(response.text).toBe('Requires Range header');
    });
  

    // TC8: Test GET /:filename/firstframe with non-existing video file
    test('TC8: GET /:filename/firstframe with non-existing video file', async () => {
      const filename = 'nonexistent_video.mp4';
  
      // Mock fs.existsSync to return false
      fs.existsSync.mockReturnValue(false);
  
      // Mock spawn to return a process object
      const mockProcess = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      spawn.mockReturnValue(mockProcess);
  
      const response = await request(app).get(`/${filename}/firstframe`);
  
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Process failed', code: 1, error: 'Video file not found' });
    });
  
    // TC9: Test POST /uploadTemp with valid video file
    test('TC9: POST /uploadTemp with valid video file', async () => {
      util.handleFileUpload.mockResolvedValue({ message: 'Upload successful' });
  
      const response = await request(app)
        .post('/uploadTemp')
        .attach('video', Buffer.from('fake video data'), 'test_video.mp4');
  
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Video uploaded successfully');
      expect(util.handleFileUpload).toHaveBeenCalled();
    });
  
    // TC10: Test POST /uploadTemp without video file
    test('TC10: POST /uploadTemp without video file', async () => {
      const response = await request(app).post('/uploadTemp');
  
      expect(response.status).toBe(400);
      expect(response.body).toBe('No video file provided.');
    });
  
    // TC11: Test POST /:match_id/upload when an unexpected error occurs
    test('TC11: POST /:match_id/upload when an unexpected error occurs', async () => {
      const match_id = '66f93f9c728b890c58714882';
  
      util.handleFileUpload.mockImplementation(() => {
        throw new Error('Unexpected error');
      });
  
      const response = await request(app)
        .post(`/${match_id}/upload`)
        .attach('video', Buffer.from('fake video data'), 'test_video.mp4');
  
      expect(response.status).toBe(500);
      expect(response.body).toBe('Unexpected error');
    });
  
    // TC12: Test GET /:match_id/stream when an unexpected error occurs
    test('TC12: GET /:match_id/stream when an unexpected error occurs', async () => {
      const match_id = '66f93f9c728b890c58714882';
  
      // Mock fs.existsSync to throw an error
      fs.existsSync.mockImplementation(() => {
        throw new Error('Unexpected error');
      });
  
      const response = await request(app)
        .get(`/${match_id}/stream`)
        .set('Range', 'bytes=0-');
  
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Unexpected error' });
    });
  
    // TC13: Test GET /:filename/firstframe when an unexpected error occurs
    test('TC13: GET /:filename/firstframe when an unexpected error occurs', async () => {
      const filename = '66f93f9c728b890c58714882.mp4';
  
      // Mock fs.existsSync to return true
      fs.existsSync.mockReturnValue(true);
  
      // Mock spawn to throw an error
      spawn.mockImplementation(() => {
        throw new Error('Unexpected error');
      });
  
      const response = await request(app).get(`/${filename}/firstframe`);
  
      expect(response.status).toBe(500);
    });
  
    // TC14: Test POST /uploadTemp when an unexpected error occurs
    test('TC14: POST /uploadTemp when an unexpected error occurs', async () => {
      util.handleFileUpload.mockImplementation(() => {
        throw new Error('Unexpected error');
      });
  
      const response = await request(app)
        .post('/uploadTemp')
        .attach('video', Buffer.from('fake video data'), 'test_video.mp4');
  
      expect(response.status).toBe(500);
    
    });
  });
  