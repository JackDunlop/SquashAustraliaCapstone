import sys
import os
import cv2
import pytest
from unittest.mock import MagicMock, patch, mock_open
import numpy as np
import msgpack
import matplotlib.pyplot as plt

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

TEST_DATA_FOLDER = os.path.join(current_dir, 'testData')

from velocity import (
    extract_numeric_time,
    calculateVelocity,
    plotVelocityAndSave,
    getVideoPathFromDataPath,
    playVideo,
    main
)

# Test 1: Test if extract_numeric_time correctly extracts numeric values from a timestamp string.
def test_extract_numeric_time():
    test_cases = [
        ("12.34s", 12.34),
        ("0s", 0.0),
        ("-5.67s", -5.67),
        ("123", 123.0),
        ("Time: 78.9s", 78.9),
        ("Time: -100.5s", -100.5),
        ("No numeric", None),
    ]
    for input_str, expected in test_cases:
        if expected is None:
            with pytest.raises(IndexError):
                extract_numeric_time(input_str)
        else:
            result = extract_numeric_time(input_str)
            assert result == expected, f"Expected {expected}, got {result} for input '{input_str}'"

# Test 2: Test if calculateVelocity computes the velocity between two points over time correctly.
def test_calculateVelocity():
    test_cases = [
        (([0, 0], [0, 0], 1.0), 0.0),
        (([1, 1], [0, 0], 1.0), np.sqrt(2)),
        (([2, 2], [0, 0], 2.0), np.sqrt(8) / 2),
        (([3, 4], [0, 0], 1.0), 5.0),
        (([0, 0], [0, 0], 0.0), ZeroDivisionError),  # Expect exception
        (([1, 1], [0, 0], 0.0), ZeroDivisionError),  # Expect exception
    ]
    for (p1, p0, delta_t), expected in test_cases:
        if delta_t == 0.0:
            with pytest.raises(ZeroDivisionError):
                calculateVelocity(p1, p0, delta_t)
        else:
            result = calculateVelocity(p1, p0, delta_t)
            assert result == pytest.approx(expected), f"Expected {expected}, got {result} for inputs {p1}, {p0}, {delta_t}"



# Test 3: Test if plotVelocityAndSave generates and saves a velocity plot correctly.
def test_plotVelocityAndSave():
    wristDataList = [
        {"timestamp": "0s", "velocity": 0.0},
        {"timestamp": "1s", "velocity": 1.0},
        {"timestamp": "2s", "velocity": 2.0},
    ]
    dataPath = "path/to/data.msgpack"
    with patch('velocity.plt.savefig') as mock_savefig, \
         patch('velocity.getMatchIDFromVideo', return_value='test_match_id'), \
         patch('os.makedirs') as mock_makedirs:
        plotVelocityAndSave(wristDataList, dataPath)
        mock_savefig.assert_called_once()
        saved_file_path = mock_savefig.call_args[0][0]
        assert 'test_match_id.png' in saved_file_path
        mock_makedirs.assert_called()

# Test 4: Test if plotVelocityAndSave handles an invalid or missing dataPath gracefully.
def test_plotVelocityAndSave_invalid_dataPath():
    wristDataList = [
        {"timestamp": "0s", "velocity": 0.0},
        {"timestamp": "1s", "velocity": 1.0},
        {"timestamp": "2s", "velocity": 2.0},
    ]
    dataPath = "invalid/path/to/data.msgpack"
    with patch('velocity.getMatchIDFromVideo', side_effect=FileNotFoundError("File not found")), \
         pytest.raises(FileNotFoundError):
        plotVelocityAndSave(wristDataList, dataPath)

# Test 5: Test if getVideoPathFromDataPath constructs the correct video path from the given data path.
def test_getVideoPathFromDataPath():
    dataPath = os.path.join('..', '..', 'data', '12345.msgpack')
    expected_video_path = os.path.join('..', '..', 'videos', '12345.mp4')
    with patch('os.path.exists', return_value=True):
        video_path = getVideoPathFromDataPath(dataPath)
        assert video_path == expected_video_path

# Test 6: Test if getVideoPathFromDataPath handles the case where the video file does not exist.
def test_getVideoPathFromDataPath_video_not_exist():
    dataPath = os.path.join('..', '..', 'data', '12345.msgpack')
    expected_video_path = os.path.join('..', '..', 'videos', '12345.mp4')
    with patch('os.path.exists', return_value=False), \
         patch('sys.exit') as mock_exit, \
         patch('builtins.print') as mock_print:
        getVideoPathFromDataPath(dataPath)
        mock_print.assert_called_with(f"Error: Video file {expected_video_path} not found.")
        mock_exit.assert_called_with(1)

# Test 7: Test if playVideo opens and plays a video correctly.
def test_playVideo():
    videoPath = "valid_video.mp4"
    cap_mock = MagicMock()
    cap_mock.isOpened.return_value = True
    cap_mock.read.side_effect = [(True, "frame1"), (True, "frame2"), (False, None)]
    with patch('cv2.VideoCapture', return_value=cap_mock) as mock_video_capture, \
         patch('cv2.imshow') as mock_imshow, \
         patch('cv2.waitKey', side_effect=[0, 0, ord('q')]) as mock_waitkey, \
         patch('cv2.destroyAllWindows') as mock_destroy:
        playVideo(videoPath, wristDataList=[])
        mock_video_capture.assert_called_with(videoPath)
        assert cap_mock.read.call_count == 3  # Two frames read, then False
        assert mock_imshow.call_count == 2
        mock_destroy.assert_called_once()

# Test 8: Test if playVideo handles an invalid video file path gracefully.
def test_playVideo_invalid_path():
    videoPath = "invalid_video.mp4"
    cap_mock = MagicMock()
    cap_mock.isOpened.return_value = False
    with patch('cv2.VideoCapture', return_value=cap_mock) as mock_video_capture, \
         patch('builtins.print') as mock_print:
        playVideo(videoPath, wristDataList=[])
        mock_video_capture.assert_called_with(videoPath)
        mock_print.assert_called_with(f"Error: Could not open video {videoPath}")

# Test 9: Test if main processes data correctly from a valid .msgpack file and calculates wrist velocities.
def test_main_valid_msgpack():
    dataPath = os.path.join(TEST_DATA_FOLDER, 'test_data.msgpack')
    leftOrRight = 'LEFT'
    sample_data = [
        {
            'track_id': 1,
            'timestamp': '0s',
            'keypoints': {
                'LEFT_WRIST': [0.0, 1.0],  # Changed to a valid point
            }
        },
        {
            'track_id': 1,
            'timestamp': '1s',
            'keypoints': {
                'LEFT_WRIST': [1.0, 1.0],
            }
        },
    ]
    mock_file = mock_open(read_data=msgpack.packb(sample_data, use_bin_type=True))
    with patch('builtins.open', mock_file), \
         patch('sys.argv', ['script_name', dataPath, leftOrRight]), \
         patch('velocity.plotVelocityAndSave') as mock_plot, \
         patch('poseEstimation.getMatchIDFromVideo', return_value='test_match_id'):
        main()
        mock_plot.assert_called_once()
        args, kwargs = mock_plot.call_args
        wristDataList = args[0]
        # Verify that velocities are calculated correctly
        assert len(wristDataList) == 2
        assert wristDataList[0]['velocity'] == 0
        expected_velocity = calculateVelocity([1.0, 1.0], [0.0, 1.0], 1.0)
        assert wristDataList[1]['velocity'] == pytest.approx(expected_velocity)


# Test 10: Test if main handles empty or corrupted .msgpack files gracefully.
def test_main_empty_msgpack():
    dataPath = os.path.join(TEST_DATA_FOLDER, 'empty_data.msgpack')
    leftOrRight = 'LEFT'
    mock_file = mock_open(read_data=b'')
    with patch('builtins.open', mock_file), \
         patch('sys.argv', ['script_name', dataPath, leftOrRight]), \
         pytest.raises(Exception):
        main()

# Test 11: Test if main handles missing command-line arguments gracefully.
def test_main_missing_arguments():
    with patch('sys.argv', ['script_name']), \
         pytest.raises(IndexError):
        main()

# Test 12: Test if main processes data when the wrist keypoints are [0, 0] and calculates velocities correctly.
def test_main_wrist_keypoints_zero_and_nonzero():
    dataPath = os.path.join(TEST_DATA_FOLDER, 'test_data.msgpack')
    leftOrRight = 'LEFT'
    sample_data = [
        {
            'track_id': 1,
            'timestamp': '0s',
            'keypoints': {
                'LEFT_WRIST': [0, 0],
            }
        },
        {
            'track_id': 1,
            'timestamp': '1s',
            'keypoints': {
                'LEFT_WRIST': [1, 1],
            }
        },
        {
            'track_id': 1,
            'timestamp': '2s',
            'keypoints': {
                'LEFT_WRIST': [0, 0],
            }
        },
        {
            'track_id': 1,
            'timestamp': '3s',
            'keypoints': {
                'LEFT_WRIST': [2, 2],
            }
        },
    ]
    mock_file = mock_open(read_data=msgpack.packb(sample_data, use_bin_type=True))
    with patch('builtins.open', mock_file), \
         patch('sys.argv', ['script_name', dataPath, leftOrRight]), \
         patch('velocity.plotVelocityAndSave') as mock_plot, \
         patch('poseEstimation.getMatchIDFromVideo', return_value='test_match_id'):
        main()
        mock_plot.assert_called_once()
        args, kwargs = mock_plot.call_args
        wristDataList = args[0]
        assert len(wristDataList) == 2
        assert wristDataList[0]['timestamp'] == '1s'
        assert wristDataList[1]['timestamp'] == '3s'
        delta_t = extract_numeric_time('3s') - extract_numeric_time('1s')
        expected_velocity = calculateVelocity([2, 2], [1, 1], delta_t)
        assert wristDataList[1]['velocity'] == pytest.approx(expected_velocity)
