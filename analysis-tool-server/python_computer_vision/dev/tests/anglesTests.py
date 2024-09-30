import sys
import os
import cv2
import msgpack


current_dir = os.path.dirname(os.path.abspath(__file__))  
parent_dir = os.path.dirname(current_dir)   
sys.path.insert(0, parent_dir) 

import pytest
from unittest.mock import MagicMock, patch, mock_open
import json
import numpy as np
TEST_DATA_FOLDER = os.path.join(current_dir, 'testData')

from jointangles import (
    extract_numeric_time,
    playVideo,
    calculateAngle,
    calculateAngleJoints,
    saveData,
    main,
    getMatchIDFromVideo 
)
#1
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

#2
def test_playVideo_valid_video():
    videoPath = "valid_video.mp4"

    cap_mock = MagicMock()
    cap_mock.isOpened.return_value = True
    cap_mock.read.side_effect = [(True, "frame1"), (True, "frame2"), (False, None)]

    with patch('cv2.VideoCapture', return_value=cap_mock) as mock_video_capture, \
         patch('cv2.imshow') as mock_imshow, \
         patch('cv2.waitKey', side_effect=[0, 0, ord('q')]) as mock_waitkey, \
         patch('cv2.destroyAllWindows') as mock_destroy:

        playVideo(videoPath)

        mock_video_capture.assert_called_with(videoPath)
        assert cap_mock.read.call_count == 3  # Two frames read, then False
        assert mock_imshow.call_count == 2
        mock_destroy.assert_called_once()
#3
def test_playVideo_invalid_video():
    videoPath = "invalid_video.mp4"

    cap_mock = MagicMock()
    cap_mock.isOpened.return_value = False

    with patch('cv2.VideoCapture', return_value=cap_mock) as mock_video_capture, \
         patch('builtins.print') as mock_print:

        playVideo(videoPath)

        mock_video_capture.assert_called_with(videoPath)
        mock_print.assert_called_with(f"Error: Could not open video {videoPath}")
#4
def test_calculateAngle():
    test_cases = [
        (([2, 0], [1, 0], [1, 1]), 90.0),
        (([2, 0], [1, 0], [2, 1]), 45.0),
        # Add more test cases as needed, avoiding [0, 0]
    ]
    for points, expected_angle in test_cases:
        p1, p2, p3 = points
        angle = calculateAngle(p1, p2, p3)
        assert angle == pytest.approx(expected_angle), f"Expected {expected_angle}, got {angle}"


#5
def test_calculateAngle_degenerate_cases():
    test_cases = [
        ([0, 0], [0, 0], [0, 0]),
        ([1, 1], [1, 1], [1, 1]),
        ([1, 1], [1, 1], [2, 2]),
        ([1, 1], [2, 2], [2, 2]),
        ([1, 1], [2, 2], [0, 0]),
        ([0, 0], [1, 1], [2, 2]),
    ]
    for p1, p2, p3 in test_cases:
        angle = calculateAngle(p1, p2, p3)
        assert angle is None, f"Expected None, got {angle} for points {p1}, {p2}, {p3}"
#6
def test_calculateAngleJoints():
    keypointData = {
        'LEFT_SHOULDER': [2, 0],
        'LEFT_ELBOW': [1, 0],
        'LEFT_WRIST': [1, 1],
    }
    calculateAngleJoints(keypointData, 'LEFT_SHOULDER', 'LEFT_ELBOW', 'LEFT_WRIST', 'LEFT_ARM_ANGLE')
    expected_angle = 90.0
    assert keypointData['LEFT_ARM_ANGLE'] == pytest.approx(expected_angle), f"Expected {expected_angle}, got {keypointData['LEFT_ARM_ANGLE']}"

#7
def test_saveData():
    dataPath = os.path.join(TEST_DATA_FOLDER, '66f93f9c728b890c58714882.mp4')
    angleDataList = [{'some': 'data'}]

    mock_file = mock_open()
    with patch('builtins.open', mock_file), \
         patch('os.makedirs'), \
         patch('jointangles.getMatchIDFromVideo', return_value='66f93f9c728b890c58714882'):

        saveData(dataPath, angleDataList)

        args, kwargs = mock_file.call_args
        opened_file_path = args[0]

        # Construct the expected absolute path
        script_dir = os.path.dirname(os.path.abspath(__file__))
        output_dir = os.path.join('..', '..',   'jointAngleCalculation')
        expected_filesave = os.path.join(output_dir, '66f93f9c728b890c58714882.json')

        assert os.path.abspath(opened_file_path) == os.path.abspath(expected_filesave)
        mock_file().write.assert_called()
#8
def test_saveData_directory_creation():
    dataPath = os.path.join(TEST_DATA_FOLDER, '66f93f9c728b890c58714882.mp4')
    angleDataList = [{'some': 'data'}]

    mock_file = mock_open()

    with patch('builtins.open', mock_file), \
         patch('os.makedirs') as mock_makedirs, \
         patch('jointangles.getMatchIDFromVideo', return_value='66f93f9c728b890c58714882'):

        saveData(dataPath, angleDataList)

        mock_makedirs.assert_called()
#9
def test_main_valid_msgpack():
    dataPath = os.path.join(TEST_DATA_FOLDER, '66f93f9c728b890c58714882.msgpack')

    sample_data = [
        {
            'track_id': 1,
            'timestamp': '12.34s',
            'keypoints': {
                'LEFT_SHOULDER': [2, 0],
                'LEFT_ELBOW': [1, 0],
                'LEFT_WRIST': [1, 1],
                'RIGHT_SHOULDER': [2, 0],
                'RIGHT_ELBOW': [1, 0],
                'RIGHT_WRIST': [1, -1],
                'LEFT_HIP': [2, 0],
                'LEFT_KNEE': [1, -1],
                'LEFT_ANKLE': [1, -2],
                'RIGHT_HIP': [2, 0],
                'RIGHT_KNEE': [1, -1],
                'RIGHT_ANKLE': [1, -2],
            }
        }
    ]

    expected_angles = {
        'LEFT_ARM_ANGLE': 90.0,
        'RIGHT_ARM_ANGLE': 90.0,
        'LEFT_LEG_ANGLE': 135.0,
        'RIGHT_LEG_ANGLE': 135.0,
    }

    mock_file = mock_open(read_data=msgpack.packb(sample_data, use_bin_type=True))

    with patch('builtins.open', mock_file), \
         patch('sys.argv', ['script_name', dataPath]), \
         patch('json.dump') as mock_json_dump, \
         patch('jointangles.getMatchIDFromVideo', return_value='66f93f9c728b890c58714882'), \
         patch('os.makedirs'), \
         patch('os.path.dirname') as mock_dirname, \
         patch('os.path.abspath') as mock_abspath:

        current_dir = os.path.dirname(os.path.abspath(__file__))
        parent_dir = os.path.dirname(current_dir)
        script_dir = os.path.join(parent_dir, 'jointangles.py')
        mock_abspath.return_value = script_dir
        mock_dirname.return_value = script_dir

        main()

        args, kwargs = mock_json_dump.call_args
        angleDataList = args[0]
        for angle_data in angleDataList:
            angles = angle_data['angles']
            for angle_key in expected_angles.keys():
                assert angles[angle_key] == pytest.approx(expected_angles[angle_key]), \
                    f"Expected {expected_angles[angle_key]} for {angle_key}, got {angles[angle_key]}"

#10
def test_main_empty_msgpack():
    dataPath = os.path.join(TEST_DATA_FOLDER, '66f93f9c728b890c58714882.msgpack')

    mock_file = mock_open(read_data=b'')

    with patch('builtins.open', mock_file), \
         patch('sys.argv', ['jointangles.py', dataPath]), \
         pytest.raises(Exception):

        main()
# 11
def test_main_no_arguments():
    with patch('sys.argv', ['jointangles.py']), \
         pytest.raises(IndexError):

        main()
#12
def test_calculateAngleJoints_missing_keypoints():
    keypointData = {
        'LEFT_SHOULDER': [1, 0],
        'LEFT_ELBOW': [1, 1],
        # 'LEFT_WRIST' is missing
    }
    with pytest.raises(KeyError):
        calculateAngleJoints(keypointData, 'LEFT_SHOULDER', 'LEFT_ELBOW', 'LEFT_WRIST', 'LEFT_ARM_ANGLE')