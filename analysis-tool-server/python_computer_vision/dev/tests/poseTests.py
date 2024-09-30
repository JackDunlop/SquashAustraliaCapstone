
import sys
import os
import cv2


current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)   
sys.path.insert(0, parent_dir)  

import pytest
from unittest.mock import MagicMock, patch, mock_open
import json
import numpy as np


import poseEstimation
from poseEstimation import (
    getMatchIDFromVideo,
    extractKeypointData,
    initialiseVideoCapture,
    process_video,
    store_pose_estimation_data,
    load_pose_estimation_data,
    processDetection,
    videoWriter,
    main
)

TEST_DATA_FOLDER = os.path.join(current_dir, 'testData')

# 1. Test if the initialiseVideoCapture function opens a valid video file correctly.
def test_initialiseVideoCapture_valid_video():
    video_path = os.path.join(TEST_DATA_FOLDER, '66f93f9c728b890c58714882.mp4')
    with patch('cv2.VideoCapture') as mock_VideoCapture:
        mock_cap = MagicMock()
        mock_cap.isOpened.return_value = True
        mock_VideoCapture.return_value = mock_cap
        cap = initialiseVideoCapture(video_path)
        assert cap == mock_cap, "initialiseVideoCapture should return the VideoCapture object for valid video paths."
        mock_VideoCapture.assert_called_with(video_path)

# 2. Test if the initialiseVideoCapture function handles an invalid video file path.
def test_initialiseVideoCapture_invalid_video():
    video_path = os.path.join(TEST_DATA_FOLDER, 'nonexistent_video.mp4')  
    with patch('cv2.VideoCapture') as mock_VideoCapture:
        mock_cap = MagicMock()
        mock_cap.isOpened.return_value = False
        mock_VideoCapture.return_value = mock_cap
        cap = initialiseVideoCapture(video_path)
        assert cap is None, "initialiseVideoCapture should return None for invalid video paths."
        mock_VideoCapture.assert_called_with(video_path)

# 3. Test if the process_video function initializes the YOLO model correctly.
def test_process_video_initializes_yolo_correctly():
    video_path = os.path.join(TEST_DATA_FOLDER, '66f93f9c728b890c58714882.mp4')
    
    with patch('poseEstimation.YOLO') as mock_YOLO:
        # Mock the YOLO model initialization
        mock_model_instance = MagicMock()
        mock_YOLO.return_value = mock_model_instance
        
        # Mock initialiseVideoCapture to return a valid VideoCapture object
        with patch('poseEstimation.initialiseVideoCapture') as mock_init_video:
            mock_cap = MagicMock()
            mock_cap.isOpened.return_value = True
            mock_init_video.return_value = mock_cap
            
            # Mock videoWriter to return empty frameData
            with patch('poseEstimation.videoWriter') as mock_video_writer:
                mock_video_writer.return_value = []
                
                # Call the function under test
                frame_data = process_video(video_path)
                
                # Construct the expected model path
                script_dir = os.path.dirname(os.path.abspath(poseEstimation.__file__))
                models_dir = os.path.join(script_dir, '..', 'models')
                expected_model_path = os.path.join(models_dir, 'yolov8s-pose.pt')
                
                # Assert YOLO was initialized with the correct path
                mock_YOLO.assert_called_with(expected_model_path)
                
                # Optionally, assert that the model was used in videoWriter
                mock_video_writer.assert_called_with(
                    mock_cap,
                    video_path,
                    mock_model_instance,
                    0.80,
                    [0]
                )
                
                # Assert the returned frame data
                assert frame_data == [], "process_video should return frameData from videoWriter."
# 4. Test if process_video creates output directories if they do not exist.
def test_process_video_creates_output_directories():
    video_path = os.path.join(TEST_DATA_FOLDER, '66f93f9c728b890c58714882.mp4')

    with patch('poseEstimation.YOLO') as mock_YOLO, \
         patch('poseEstimation.initialiseVideoCapture') as mock_init_video, \
         patch('poseEstimation.videoWriter') as mock_video_writer, \
         patch('os.path.exists') as mock_exists, \
         patch('os.makedirs') as mock_makedirs:

        # Mock the YOLO model
        mock_model_instance = MagicMock()
        mock_YOLO.return_value = mock_model_instance

        # Mock VideoCapture
        mock_cap = MagicMock()
        mock_cap.isOpened.return_value = True
        mock_init_video.return_value = mock_cap

        # Mock videoWriter
        mock_video_writer.return_value = []

        # Simulate that 'models_dir' does not exist, others do
        def mock_exists_side_effect(path):
            script_dir = os.path.dirname(os.path.abspath(poseEstimation.__file__))
            models_dir = os.path.join(script_dir, '..', 'models')
            if os.path.normpath(path) == os.path.normpath(models_dir):
                return False  # 'models_dir' does not exist
            return True  # All other directories exist

        mock_exists.side_effect = mock_exists_side_effect

        # Call the function under test
        process_video(video_path)

        # Construct the expected models directory path
        script_dir = os.path.dirname(os.path.abspath(poseEstimation.__file__))
        models_dir = os.path.join(script_dir, '..', 'models')
        output_video_dir = os.path.join(script_dir, '..', '..', 'poseOutputVideo')

        # Assert that os.makedirs was called for models_dir
        mock_makedirs.assert_any_call(models_dir)

        # Assert that os.makedirs was NOT called for output_video_dir
        from unittest.mock import call
        expected_output_dir_call = call(output_video_dir, exist_ok=True)
        assert expected_output_dir_call not in mock_makedirs.call_args_list, \
            f"os.makedirs should not be called with {output_video_dir}"

# 5. Test if videoWriter function processes a video and writes output correctly.
def test_videoWriter_processes_video_and_writes_output():
    video_path = os.path.join(TEST_DATA_FOLDER, '66f93f9c728b890c58714882.mp4')
    mock_model = MagicMock()
    confThresh = 0.80
    modelClass = [0]
    
    # Mock VideoCapture properties and methods
    mock_cap = MagicMock()
    mock_cap.get.side_effect = lambda prop: {
        cv2.CAP_PROP_FRAME_WIDTH: 640,
        cv2.CAP_PROP_FRAME_HEIGHT: 480,
        cv2.CAP_PROP_FPS: 30,
        cv2.CAP_PROP_POS_MSEC: 1000
    }.get(prop, 0)
    
    # Mock frame reading
    mock_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    mock_cap.read.side_effect = [
        (True, mock_frame),
        (False, None)  # End of video
    ]
    
    with patch('poseEstimation.getMatchIDFromVideo') as mock_get_match_id, \
         patch('poseEstimation.getDetection') as mock_get_detection, \
         patch('poseEstimation.extractKeypointData') as mock_extract_keypoints, \
         patch('poseEstimation.getFrameTimestamp') as mock_get_frame_timestamp, \
         patch('poseEstimation.processDetection') as mock_process_detection, \
         patch('cv2.VideoWriter') as mock_VideoWriter, \
         patch('cv2.resize') as mock_resize:
        
        # Setup match ID
        mock_get_match_id.return_value = 'match123'
        
        # Setup getDetection to return a mock detection
        mock_detection = [MagicMock()]
        mock_detection[0].boxes.id.cpu().numpy.return_value = [1]
        mock_detection[0].keypoints.xy.cpu().numpy.return_value = [[100, 200, 0]]  # Example keypoints
        mock_get_detection.return_value = mock_detection
        
        # Setup extractKeypointData to return dummy data
        mock_extract_keypoints.return_value = {'HIP': [320, 240]}
        
        # Mock getFrameTimestamp
        mock_get_frame_timestamp.return_value = '1.00s'
        
        # Mock processDetection
        mock_process_detection.return_value = None  # Assuming it doesn't return anything
        
        # Mock VideoWriter
        mock_out = MagicMock()
        mock_VideoWriter.return_value = mock_out
        
        # Mock resize
        mock_resize.return_value = mock_frame
        
        # Call the function under test
        frame_data = videoWriter(mock_cap, video_path, mock_model, confThresh, modelClass)
        
        # Assertions
        mock_VideoWriter.assert_called_once()
        mock_out.write.assert_called_with(mock_frame)
        mock_out.release.assert_called_once()
        
        # Verify that processDetection was called correctly
        mock_process_detection.assert_called_once_with(
            mock_detection,
            '1.00s',
            frame_data,
            mock_frame
        )
   


# 6. Test if store_pose_estimation_data stores frame data correctly in .msgpack format.
def test_store_pose_estimation_data_stores_frame_data_correctly():
    frame_data = [
        {
            'track_id': 1,
            'timestamp': '1.00s',
            'keypoints': {'HIP': [320, 240]}
        }
    ]
    video_path = os.path.join(TEST_DATA_FOLDER, '66f93f9c728b890c58714882.mp4')
    match_id = 'match123'
    expected_file_path = os.path.join(os.path.dirname(os.path.abspath(poseEstimation.__file__)), '..', '..', 'poseEstimationData', f'{match_id}.msgpack')
    
    with patch('poseEstimation.getMatchIDFromVideo') as mock_get_match_id, \
         patch('builtins.open', mock_open()) as mock_file, \
         patch('poseEstimation.json.dumps') as mock_json_dumps, \
         patch('msgpack.packb') as mock_packb, \
         patch('os.makedirs') as mock_makedirs:
        
        mock_get_match_id.return_value = match_id
        mock_json_dumps.return_value = json.dumps("Frame Data being stored:", indent=2)
        mock_packb.return_value = b'packed_data'
        
        # Call the function under test
        returned_match_id = store_pose_estimation_data(frame_data, video_path)
        
        # Assertions
        mock_get_match_id.assert_called_with(video_path)
        mock_makedirs.assert_called_with(os.path.join(os.path.dirname(os.path.abspath(poseEstimation.__file__)), '..', '..', 'poseEstimationData'), exist_ok=True)
        mock_file.assert_called_with(expected_file_path, 'wb')
        mock_packb.assert_called_with(frame_data, use_bin_type=True)
        mock_file().write.assert_called_with(b'packed_data')
        assert returned_match_id == match_id, "store_pose_estimation_data should return the correct match_id."

# 7. Test if processDetection correctly appends detection data to frameData.
def test_processDetection_appends_detection_data_correctly():
    detection = [MagicMock()]
    # Mock the return of cpu() -> numpy()
    detection[0].boxes.id.cpu.return_value.numpy.return_value = [1]
    
    # Set up keypoints
    kptArrayMock = MagicMock()
    kptArrayMock.cpu.return_value.numpy.return_value = [[100, 200]]
    detection[0].keypoints.xy = [kptArrayMock]
    
    frame_timestamp = "1.00s"
    frame_data = []
    frame = np.zeros((480, 640, 3), dtype=np.uint8)

    # Patch 'extractKeypointData' where it's used, not where it's defined
    with patch('poseEstimation.extractKeypointData', return_value={'HIP': [320, 240]}) as mock_extract_keypoints:
        # Call the function under test
        processDetection(detection, frame_timestamp, frame_data, frame)

        # Ensure extractKeypointData was called with the correct arguments
        mock_extract_keypoints.assert_called_with(kptArrayMock, frame, 1)

        # Assertions
        assert len(frame_data) == 1, "processDetection should append one detection to frameData."
        assert frame_data[0] == {
            'track_id': 1,
            'timestamp': '1.00s',
            'keypoints': {'HIP': [320, 240]}
        }, "Detection data should be appended correctly."


def test_extractKeypointData_handles_keypoints_correctly():
    # Create a mock kptArray with the required methods
    kptArrayMock = MagicMock()
    kptArrayMock.cpu.return_value.numpy.return_value = np.array([
        [0, 0],        # Keypoint 0
        [0, 0],        # Keypoint 1
        [0, 0],        # Keypoint 2
        [400, 300],    # LEFT_EAR (index 3)
        [500, 400],    # RIGHT_EAR (index 4)
        [0, 0],        # Keypoint 5
        [0, 0],        # Keypoint 6
        [0, 0],        # Keypoint 7
        [0, 0],        # Keypoint 8
        [0, 0],        # Keypoint 9
        [0, 0],        # Keypoint 10
        [100, 200],    # LEFT_HIP (index 11)
        [300, 400],    # RIGHT_HIP (index 12)
        [0, 0],        # Keypoint 13
        [0, 0],        # Keypoint 14
        [0, 0],        # Keypoint 15
        [0, 0],        # Keypoint 16
    ])

    track_id = 1
    frame = np.zeros((480, 640, 3), dtype=np.uint8)

    with patch('poseEstimation.cv2.circle') as mock_cv2_circle:
        # Call the function under test
        keypoint_data = extractKeypointData(kptArrayMock, frame, track_id)

        # Expected keypoint data
        expected_keypoint_data = {
            'HEAD': [450, 350],  # Average of LEFT_EAR and RIGHT_EAR
            'HIP': [200, 300],   # Average of LEFT_HIP and RIGHT_HIP
        }

        # Assertions
        assert keypoint_data == expected_keypoint_data, "Keypoint data should be extracted correctly."

        # Verify cv2.circle calls
        expected_calls = [
            ((frame, (450, 350), 3, (0, 0, 255), -1),),  # HEAD
            ((frame, (200, 300), 3, (255, 0, 0), -1),),  # HIP
        ]
        mock_cv2_circle.assert_has_calls(expected_calls, any_order=True)


# 9. Test if getMatchIDFromVideo correctly extracts the match ID from the video file path.
def test_getMatchIDFromVideo_extracts_correctly():
    video_path = '/path/to/videos/match123.mp4'
    expected_match_id = 'match123'
    
    # Call the function under test
    match_id = getMatchIDFromVideo(video_path)
    
    # Assertions
    assert match_id == expected_match_id, "getMatchIDFromVideo should extract the correct match ID."

# 10. Test if load_pose_estimation_data correctly loads and unpacks .msgpack data.
def test_load_pose_estimation_data_loads_correctly():
    file_path = os.path.join(TEST_DATA_FOLDER, 'match123.msgpack')
    packed_data = b'\x81\xa9track_id\x01\xa9timestamp\x0b1.00s\xa9keypoints\x81\xa3HIP\x82\x01\x40'
    
    with patch('builtins.open', mock_open(read_data=packed_data)) as mock_file, \
         patch('msgpack.unpackb') as mock_unpackb:
        
        # Setup unpackb to return the expected data
        expected_data = [
            {
                'track_id': 1,
                'timestamp': '1.00s',
                'keypoints': {'HIP': [1, 64]}
            }
        ]
        mock_unpackb.return_value = expected_data
        
        # Call the function under test
        data = load_pose_estimation_data(file_path)
        
        # Assertions
        mock_file.assert_called_with(file_path, 'rb')
        mock_unpackb.assert_called_with(packed_data, raw=False)
        assert data == expected_data, "load_pose_estimation_data should return the unpacked data correctly."

# 11. Test if main handles missing command-line arguments correctly.
def test_main_with_valid_arguments(capsys):
    video_path = os.path.join(TEST_DATA_FOLDER, '66f93f9c728b890c58714882.mp4')
    test_args = ['poseEstimation.py', video_path]
    
    with patch.object(sys, 'argv', test_args):
        with patch('poseEstimation.process_video', autospec=True) as mock_process_video, \
             patch('poseEstimation.store_pose_estimation_data', autospec=True) as mock_store_data, \
             patch('sys.exit', autospec=True) as mock_sys_exit:
            
            # Mock the return value of process_video
            mock_process_video.return_value = [{
                'track_id': 1,
                'timestamp': '1.00s',
                'keypoints': {'HIP': [320, 240]}
            }]
            
            # Call the function under test
            main()
            
            # Assertions
            mock_process_video.assert_called_once_with(video_path)
            mock_store_data.assert_called_once_with(mock_process_video.return_value, video_path)
            mock_sys_exit.assert_not_called()
            
            # Capture printed output
            captured = capsys.readouterr()
            # Optionally, verify that no usage message was printed
            assert "usage:" not in captured.err.lower(), \
                "main should not print usage message when arguments are provided."

# 12. Test if process_video correctly processes and returns data from an empty video.
def test_process_video_handles_empty_video():
    video_path = os.path.join(TEST_DATA_FOLDER, 'empty_video.mp4')
    
    with patch('poseEstimation.YOLO') as mock_YOLO, \
         patch('poseEstimation.initialiseVideoCapture') as mock_init_video, \
         patch('poseEstimation.videoWriter') as mock_video_writer, \
         patch('os.path.exists') as mock_exists, \
         patch('os.makedirs') as mock_makedirs:
        
        # Mock the YOLO model
        mock_model_instance = MagicMock()
        mock_YOLO.return_value = mock_model_instance
        
        # Mock VideoCapture to simulate empty video
        mock_cap = MagicMock()
        mock_cap.isOpened.return_value = True
        mock_init_video.return_value = mock_cap
        
        # Mock videoWriter to return empty frameData
        mock_video_writer.return_value = []
        
        # Simulate that directories exist
        mock_exists.return_value = True
        
        # Call the function under test
        frame_data = process_video(video_path)
        
        # Assertions
        assert frame_data == [], "process_video should return empty frameData for empty videos."
        mock_video_writer.assert_called_with(
            mock_cap,
            video_path,
            mock_model_instance,
            0.80,
            [0]
        )

# 13. Test if process_video performs as expected with different video resolutions and formats.
@pytest.mark.parametrize("resolution, format_ext", [
    ((1280, 720), 'avi'),
    ((1920, 1080), 'mov'),
    ((640, 480), 'mkv'),
    ((3840, 2160), 'mp4'),
])
def test_process_video_with_various_resolutions_and_formats(resolution, format_ext):
    video_filename = f'video_{resolution[0]}x{resolution[1]}.{format_ext}'
    video_path = os.path.join(TEST_DATA_FOLDER, video_filename)
    
    with patch('poseEstimation.YOLO') as mock_YOLO, \
         patch('poseEstimation.initialiseVideoCapture') as mock_init_video, \
         patch('poseEstimation.videoWriter') as mock_video_writer, \
         patch('os.path.exists') as mock_exists, \
         patch('os.makedirs') as mock_makedirs:
        
        # Mock the YOLO model
        mock_model_instance = MagicMock()
        mock_YOLO.return_value = mock_model_instance
        
        # Mock VideoCapture
        mock_cap = MagicMock()
        mock_cap.isOpened.return_value = True
        mock_init_video.return_value = mock_cap
        
        # Mock videoWriter to return dummy frameData
        mock_video_writer.return_value = [{'track_id': 1, 'timestamp': '1.00s', 'keypoints': {'HIP': [320, 240]}}]
        
        # Simulate that directories exist
        mock_exists.return_value = True
        
        # Call the function under test
        frame_data = process_video(video_path)
        
        # Assertions
        mock_video_writer.assert_called_with(
            mock_cap,
            video_path,
            mock_model_instance,
            0.80,
            [0]
        )
        assert frame_data == [{'track_id': 1, 'timestamp': '1.00s', 'keypoints': {'HIP': [320, 240]}}], "process_video should return correct frameData for various resolutions and formats."
