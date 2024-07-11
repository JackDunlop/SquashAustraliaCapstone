import { React, useState, useEffect } from 'react';
import axios from 'axios';

import { game } from './GameSessionClass';
import { Bar, Pie } from 'react-chartjs-2';
import { Player } from 'video-react';
//import { Player } from 'video-react';

export default function Statistics(props) {
    const { baseUrl } = props;
    const matchId = window.location.pathname.substring(7);
    const [annotations, setAnnotations] = useState([]);

    useEffect(() => {
        axios
            .get(baseUrl + '/annotate/' + matchId + '/all')
            .then((res) => res.data)
            .then((annotations) => setAnnotations(annotations));
    }, [baseUrl, matchId]);

    function getGameData(annotations) {
        let gamesData = [];

        let newGameAnnotations = annotations.filter((annotation) => annotation.components.type === 'game')
            .map((annotation) => annotation.timestamp);

        let gameShotAnnotations = [];

        // Find all annotations within each game & assign to store
        for (let i = 0; i < newGameAnnotations.length + 1; i++) {
            if (i === 0) {
                if (newGameAnnotations.length === 0) {
                    gameShotAnnotations[i] = annotations;
                } else {
                    gameShotAnnotations[i] = annotations
                        .filter((annotation) => (annotation.timestamp < newGameAnnotations[0]));
                }
            } else if (i === newGameAnnotations.length) {
                gameShotAnnotations[i] = annotations
                    .filter(
                        (annotation) => (annotation.timestamp > newGameAnnotations[newGameAnnotations.length - 1])
                    )
            } else {
                gameShotAnnotations[i] = annotations
                    .filter(
                        (annotation) => ((annotation.timestamp > newGameAnnotations[i - 1]) &
                            (annotation.timestamp < newGameAnnotations[i]))
                    )
            }
        }

        for (var i = 0; i < gameShotAnnotations.length; i++) {
            let tempGame = new game(gameShotAnnotations[i]);
            gamesData.push(tempGame);
        }

        return gamesData;
    }

    // Get all annotations function
    function getAllAnnotations(filteredGames) {
        let matchAnnotations = [];
        filteredGames.forEach((game) => {
            let gameAnnotations = [];
            game.gameAnnotations.forEach((annotation) => {
                if (annotation.components.type === 'shot') {
                    gameAnnotations.push(annotation);
                }
            })
            matchAnnotations = matchAnnotations.concat(gameAnnotations);
        })
        return matchAnnotations;
    }

    // Filtered Annotations
    const [filterGames, setFilterGames] = useState([]);
    const [filterLength, setFilterLength] = useState(false);

    const backgroundColors = [
        'rgb(0, 111, 58)',
        'rgb(255, 193, 7)',
        'rgb(27, 131, 190)',
        'rgb(128, 128, 128)',
        'rgb(255, 43, 43)',
        'rgb(189, 93, 56)',
        'rgb(254, 170, 169)',
        'rgb(175, 195, 255))',
        'rgb(13, 32, 47)',
        'rgb(229, 226, 209)',
        'rgb(193, 61, 229)',
        'rgb(186, 252, 193)',
    ];

    let gamesData = getGameData(annotations);

    let gameLabels = [];
    for (let i = 1; i <= gamesData.length; i++) {
        gameLabels.push(i);
    }
        
    const playerNums = [1, 2];
    
    const gameZoneLabels = ['Front Left', 'Front Right', 'Back Left', 'Back Right', 'T-Zone'];

    let uniqueShots = [
        ...new Set(
            annotations
                .filter((annotation) => annotation.components.type === 'shot')
                .map((annotation) => annotation.components.id)
        )
    ];

    const [tempUseState, setTempUseState] = useState(false);
    const [filterStatus, setFilterStatus] = useState(new Array(playerNums.length).fill(false));

    const setLengthOfFilters = () => {
        let neededFilterLength = gameLabels.length + uniqueShots.length + gameZoneLabels.length
            + playerNums.length + playerNums.length;
        while (filterStatus.length < neededFilterLength) {
            setFilterStatus(filterStatus.push(tempUseState));
        }
    }

    // SHOT COUNT GRAPH DATA
    let shotCount = Array(uniqueShots.length).fill(0);

    function getShotCount(annotations, shottypeID) {
        let shotCount = annotations.filter((item) =>
            item.components.id === shottypeID).length;

        return shotCount;
    }

    for (var i = 0; i < uniqueShots.length; i++) {
        for (let z = 0; z < filterGames.length; z++) {
            shotCount[i] = shotCount[i] + getShotCount(filterGames[z].gameAnnotations, uniqueShots[i]);
        }
    }

    const shotCountChart = {
        labels: uniqueShots,
        datasets: [
            {
                label: 'No. of Shots',
                borderColor: '#ffffff',
                borderWidth: 0,
                data: shotCount,
                backgroundColor: backgroundColors,
            },
        ],
        title: 'Shot Count',
    };

    // HAND COUNT GRAPH DATA

    function getHandCount(annotations, handLabel) {
        let handCount = annotations.filter((item) =>
            item.components.id.includes(handLabel)).length;
        return handCount;
    }

    const handLabels = ['BH', 'FH'];
    let handCount = [0, 0];
    for (let i = 0; i < handCount.length; i++) {
        for (let z = 0; z < filterGames.length; z++) {
            handCount[i] = handCount[i] + getHandCount(filterGames[z].gameAnnotations, handLabels[i]);
        }
    }

    const handCountChart = {
        labels: ['Backhand Shots', 'Forehand Shots'],
        datasets: [
            {
                label: 'No. of Shots',
                borderColor: '#ffffff',
                borderWidth: 5,
                data: handCount,
                backgroundColor: backgroundColors,
            },
        ],
        title: 'Backhand vs Forehand',
    };

    // PLAYERS SHOT COUNT GRAPH DATA

    function getPlayerCount(annotations, playerNum) {
        let handCount = annotations.filter((item) => (item.playerNumber === playerNum
        ) && item.components.type === 'shot').length;
        return handCount;
    }

    let playerShotCount = Array(playerNums.length).fill(0);
    for (let i = 0; i < playerShotCount.length; i++) {
        for (let x = 0; x < filterGames.length; x++) {
            playerShotCount[i] = playerShotCount[i] +
                getPlayerCount(filterGames[x].gameAnnotations, playerNums[i]);
        }
    }

    const playerShotsCountChart = {
        labels: playerNums,
        datasets: [
            {
                label: 'No. of Shots',
                borderColor: '#ffffff',
                borderWidth: 5,
                data: playerShotCount,
                backgroundColor: backgroundColors,
            },
        ],
        title: 'All Players',
    };

    //POINT WIN AND ERROR BY GRAPH DATA

    //need to get the shotCount for the annotations prior to a point won
    filterGames.forEach((game) => {
        game.gameAnnotations.sort((a, b) => a.timestamp - b.timestamp);
    });

    let shotWin = [];
    let shotError = [];

    filterGames.forEach((game) => {
        let gameShotWin = [];
        let gameShotError = [];

        game.shotWin.forEach((annotation) => {
            gameShotWin.push(annotation);
        })

        game.shotError.forEach((annotation) => {
            gameShotError.push(annotation);
        })
        shotWin = shotWin.concat(gameShotWin);
        shotError = shotError.concat(gameShotError);

    })

    let shotWinCount = [];
    let shotErrorCount = [];

    for (let i = 0; i < uniqueShots.length; i++) {
        shotWinCount[i] = getShotCount(shotWin, uniqueShots[i]);
        shotErrorCount[i] = getShotCount(shotError, uniqueShots[i]);
    }

    const shotWinCountChart = {
        labels: uniqueShots,
        datasets: [
            {
                label: 'No. of Shots',
                borderColor: '#ffffff',
                borderWidth: 5,
                data: shotWinCount,
                backgroundColor: backgroundColors,
            },
        ],
        title: 'Point Win By Shot Type',
    };

    const shotErrorCountChart = {
        labels: uniqueShots,
        datasets: [
            {
                label: 'No. of Shots',
                borderColor: '#ffffff',
                borderWidth: 5,
                data: shotErrorCount,
                backgroundColor: backgroundColors,
            },
        ],
        title: 'Error By Shot Type',
    };

    // SHOT TYPE PER GAME GRAPH DATA

    let labelData = [];

    let temp = [];
    // Create array full of the number of occurences in each shot
    for (let i = 0; i < filterGames.length; i++) {
        labelData.push("Game " + (i + 1));
        for (let k = 0; k < uniqueShots.length; k++) {
            temp.push(getShotCount(filterGames[i].gameAnnotations, uniqueShots[k]));
        }
    }

    let gameData = [];
    let fullGamesDataset = [];
    // Rearrange array so it can be passed into chartjs, puts all the shot occurrences for each shot across all games
    for (let k = 0; k < uniqueShots.length; k++) {
        let temp2 = [];
        for (let i = 0; i < filterGames.length + 1; i++) {
            temp2.push(temp[k + i * uniqueShots.length]);
        }
        gameData.push(temp2);
        // Create datasets for each shot type, label them as the shot id
        let data = {
            label: uniqueShots[k],
            data: gameData[k],
            backgroundColor: backgroundColors[k],
            borderWidth: 0,
        };
        fullGamesDataset.push(data);
    }

    //THIS IS FOR THE SHOT TYPE PER OPPONENT POSITION GRAPH

    // Find the unique opponent positions
    let uniqueOppoLoc = [];
    filterGames.forEach((game) => {
        game.gameAnnotations.forEach((annotation) => {
            if (!uniqueOppoLoc.includes(annotation.opponentPos)) {
                uniqueOppoLoc.push(annotation.opponentPos);
            }
        })
    })

    // Get all annotations into one array
    let matchAnnotations = [];
    filterGames.forEach((game) => {
        let gameAnnotations = [];
        game.gameAnnotations.forEach((annotation) => {
            if (annotation.components.type === 'shot') {
                gameAnnotations.push(annotation);
            }
        })
        matchAnnotations = matchAnnotations.concat(gameAnnotations);
    })

    // Find all shots made with each opponent position and create labels
    let opponentPositionData = [];
    let opponentPositionLabels = [];
    for (let i = 0; i < uniqueOppoLoc.length; i++) {

        opponentPositionData[i] = matchAnnotations
            .filter((annotation) => (annotation.opponentPos === uniqueOppoLoc[i])
                & annotation.components.type === 'shot');

        if (uniqueOppoLoc[i] === 1) {
            opponentPositionLabels.push(gameZoneLabels[0]);
        } else if (uniqueOppoLoc[i] === 2) {
            opponentPositionLabels.push(gameZoneLabels[1]);
        } else if (uniqueOppoLoc[i] === 3) {
            opponentPositionLabels.push(gameZoneLabels[2]);
        } else if (uniqueOppoLoc[i] === 4) {
            opponentPositionLabels.push(gameZoneLabels[3]);
        } else if (uniqueOppoLoc[i] === 5) {
            opponentPositionLabels.push(gameZoneLabels[4]);
        }
    }

    let positionData = [];
    temp = [];
    let fullOpponentPositionDataset = [];

    // Create array full of the number of occurences in each shot
    for (let i = 0; i < uniqueOppoLoc.length; i++) {
        for (let k = 0; k < uniqueShots.length; k++) {
            temp.push(getShotCount(opponentPositionData[i], uniqueShots[k]));
        }
    }
    // Rearrange array so it can be passed into chartjs, puts all the shot occurrences for each shot across all games
    for (let k = 0; k < uniqueShots.length; k++) {
        let temp2 = [];
        for (let i = 0; i < uniqueOppoLoc.length; i++) {
            temp2.push(temp[k + (i * uniqueShots.length)]);
        }
        positionData.push(temp2);

        // Create datasets for each shot type, label them as the shot id
        let data = {
            label: uniqueShots[k],
            data: positionData[k],
            backgroundColor: backgroundColors[k],
            borderWidth: 0,
        };
        fullOpponentPositionDataset.push(data);
    }

    // HEAT MAP GRAPH FUNCTION
    function drawHeatMap(allAnnotations) {

        var sortedHeatMapData = [gameZoneLabels.length];
        for (let i = 0; i < gameZoneLabels.length; i++) {
            sortedHeatMapData[i] = allAnnotations.filter(((annotation) => annotation.playerPos === (i + 1))).length;
                //+ allAnnotations.filter(((annotation) => annotation.opponentPos === (i + 1))).length;
        }

        var heatMapOpacity = [];
        for (let i = 0; i < sortedHeatMapData.length; i++) {
            heatMapOpacity.push(sortedHeatMapData[i] / Math.max(...sortedHeatMapData));
        }

        const canvas = document.getElementById("canvas");
        if (canvas.getContext) {
            const ctx = canvas.getContext("2d");

            //Black background
            ctx.fillStyle = "rgba(0,0,0,1)";
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, 350);
            ctx.lineTo(350, 350);
            ctx.lineTo(350, 0);
            ctx.closePath();
            ctx.fill();

            //Front Left
            ctx.fillStyle = "rgba(255,255,255)";
            ctx.beginPath();
            ctx.moveTo(2, 2);
            ctx.lineTo(2, 199);
            ctx.lineTo(149, 199);
            ctx.lineTo(149, 2);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "rgba(0,131,63," + heatMapOpacity[0] + ")";
            if (heatMapOpacity[0] === 0) {
                ctx.fillStyle = "rgba(239,239,240,1)";
            }
            ctx.beginPath();
            ctx.moveTo(2, 2);
            ctx.lineTo(2, 199);
            ctx.lineTo(149, 199);
            ctx.lineTo(149, 2);
            ctx.closePath();
            ctx.fill();

            //Front Right
            ctx.fillStyle = "rgba(255,255,255)";
            ctx.beginPath();
            ctx.moveTo(151, 2);
            ctx.lineTo(151, 199);
            ctx.lineTo(298, 199);
            ctx.lineTo(298, 2);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = "rgba(0,131,63," + heatMapOpacity[1] + ")";
            if (heatMapOpacity[1] === 0) {
                ctx.fillStyle = "rgba(239,239,240,1)";
            }
            ctx.beginPath();
            ctx.moveTo(151, 2);
            ctx.lineTo(151, 199);
            ctx.lineTo(298, 199);
            ctx.lineTo(298, 2);
            ctx.closePath();
            ctx.fill();

            //Back Left
            ctx.fillStyle = "rgba(255,255,255)";
            ctx.beginPath();
            ctx.moveTo(2, 201);
            ctx.lineTo(2, 348);
            ctx.lineTo(149, 348);
            ctx.lineTo(149, 201);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = "rgba(0,131,63," + heatMapOpacity[2] + ")";
            if (heatMapOpacity[2] === 0) {
                ctx.fillStyle = "rgba(210,215,211,1)";
            }
            ctx.beginPath();
            ctx.moveTo(2, 201);
            ctx.lineTo(2, 348);
            ctx.lineTo(149, 348);
            ctx.lineTo(149, 201);
            ctx.closePath();
            ctx.fill();

            //Back right
            ctx.fillStyle = "rgba(255,255,255)";
            ctx.beginPath();
            ctx.moveTo(151, 201);
            ctx.lineTo(151, 348);
            ctx.lineTo(298, 348);
            ctx.lineTo(298, 201);
            ctx.closePath();
            ctx.fill();


            ctx.fillStyle = "rgba(0,131,63," + heatMapOpacity[3] + ")";
            if (heatMapOpacity[3] === 0) {
                ctx.fillStyle = "rgba(239,239,240,1)";
            }
            ctx.beginPath();
            ctx.moveTo(151, 201);
            ctx.lineTo(151, 348);
            ctx.lineTo(298, 348);
            ctx.lineTo(298, 201);
            ctx.closePath();
            ctx.fill();

            //T-zone - set a white (or whatever colour background) and then add the opacity layer on top

            ctx.fillStyle = "rgba(0,0,0)";
            ctx.beginPath();
            ctx.moveTo(100, 150);
            ctx.lineTo(100, 250);
            ctx.lineTo(200, 250);
            ctx.lineTo(200, 150);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = "rgba(255,255,255)";
            ctx.beginPath();
            ctx.moveTo(102, 152);
            ctx.lineTo(102, 248);
            ctx.lineTo(198, 248);
            ctx.lineTo(198, 152);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = "rgba(0,131,63," + heatMapOpacity[4] + ")";
            if (heatMapOpacity[4] === 0) {
                ctx.fillStyle = "rgba(239,239,240,1)";
            }
            ctx.beginPath();
            ctx.moveTo(102, 152);
            ctx.lineTo(102, 248);
            ctx.lineTo(198, 248);
            ctx.lineTo(198, 152);
            ctx.closePath();
            ctx.fill();
        }
    }

    //This is the points won numeral
    let pointsWon = [0,0];
    //This is the games won numeral
    let gamesWon = [];
    for (let i = 0; i < playerNums.length; i++) {
        filterGames.forEach((game) => {
            pointsWon[i] = pointsWon[i] + ((game.gameAnnotations.filter((annotation) =>
                (annotation.components.type === 'score') && (annotation.playerNumber === i + 1))
            ).length)
        })
        gamesWon.push(filterGames.filter((game) => game.winner === i+1).length);
    }
    
    //Style for the square that contains the Points Won display
    var squareStyle = {
        margin: 'auto',
    };

    // This is what determines what the filters actually do
    const filterChange = (position) => {

        if (!filterLength) {
            setLengthOfFilters();
            setFilterLength(!filterLength);
        }

        const updatedFilterStatus = filterStatus.map((item, index) =>
            index === position ? !item : item);
        setFilterStatus(updatedFilterStatus);

        const playerFilterStatus = updatedFilterStatus.slice(0, playerNums.length);
        const gameFilterStatus = updatedFilterStatus.slice(playerNums.length, playerNums.length + gameLabels.length);
        const shotFilterStatus = updatedFilterStatus.slice(playerNums.length + gameLabels.length,
            playerNums.length + gameLabels.length + uniqueShots.length);
        const zoneFilterStatus = updatedFilterStatus.slice(playerNums.length + gameLabels.length + uniqueShots.length,
            playerNums.length + gameLabels.length + uniqueShots.length + gameZoneLabels.length);
        const gameWonByFilterStatus = updatedFilterStatus.slice(playerNums.length + gameLabels.length + uniqueShots.length + gameZoneLabels.length,
            playerNums.length + gameLabels.length + uniqueShots.length + gameZoneLabels.length + playerNums.length);

        const playerIndices = playerFilterStatus.reduce(
            (out, bool, index) => (bool ? out.concat(index) : out),
            []);
        const gameIndices = gameFilterStatus.reduce(
            (out, bool, index) => (bool ? out.concat(index) : out),
            []);
        const shotIndices = shotFilterStatus.reduce(
            (out, bool, index) => (bool ? out.concat(index) : out),
            []);
        const zoneIndices = zoneFilterStatus.reduce(
            (out, bool, index) => (bool ? out.concat(index) : out),
            []);
        const gameWonByIndices = gameWonByFilterStatus.reduce(
            (out, bool, index) => (bool ? out.concat(index) : out),
            []);

        var playerData = [];
        for (var i = 0; i < playerIndices.length; i++) {
            playerData.push(playerNums[playerIndices[i]]);
        }
        var gameData = [];
        for (i = 0; i < gameIndices.length; i++) {
            gameData.push(gameLabels[gameIndices[i]]);
        }
        var shotData = [];
        for (i = 0; i < shotIndices.length; i++) {
            shotData.push(uniqueShots[shotIndices[i]]);
        }
        let zoneData = [];
        for (i = 0; i < zoneIndices.length; i++) {
            zoneData.push(zoneIndices[i] + 1);
        }
        let gameWonByData = [];
        for (i = 0; i < gameWonByIndices.length; i++) {
            gameWonByData.push(playerNums[gameWonByIndices[i]]);
        }


        let playerChecker = (filterStatus) => filterStatus.slice(0, playerNums.length).every((v) => v === false);

        let gameChecker = (filterStatus) => filterStatus.slice(playerNums.length, playerNums.length + gameLabels.length).every((v) => v === false);

        let shotChecker = (filterStatus) => filterStatus.slice(playerNums.length + gameLabels.length,
            playerNums.length + gameLabels.length + uniqueShots.length).every((v) => v === false);

        let zoneChecker = (filterStatus) => filterStatus.slice(playerNums.length + gameLabels.length + uniqueShots.length,
            playerNums.length + gameLabels.length + uniqueShots.length + gameZoneLabels.length).every((v) => v === false);

        let wonByChecker = (filterStatus) => filterStatus.slice(playerNums.length + gameLabels.length + uniqueShots.length + gameZoneLabels.length,
            playerNums.length + gameLabels.length + uniqueShots.length + gameZoneLabels.length + playerNums.length).every((v) => v === false);

        let allChecker = (filterStatus) => filterStatus.every((v) => v === false);

        let filteredGames = [];
        //check to see if no filters are active
        if (allChecker(updatedFilterStatus)) {
            setFilterGames(gamesData);

            // THIS IS WHAT DRAWS THE HEAT MAP
            // first put all the annotations into one array
            let matchAnnotations = getAllAnnotations(gamesData);
            // then draw the actual heat map
            drawHeatMap(matchAnnotations);

        } else {
            filteredGames = gamesData;
            //check if the game filter is active
            if (!gameChecker(updatedFilterStatus)) {
                filteredGames = filteredGames.filter((match) => (gameData.includes(filteredGames.indexOf(match)+1)));
            }

            if (!playerChecker(updatedFilterStatus)) {
                //filter the matches annotations by the selected players
                for (i = 0; i < filteredGames.length; i++) {
                    filteredGames[i].gameAnnotations = filteredGames[i].gameAnnotations.filter((annotation) => (playerData.includes(annotation.playerNumber)
                        || annotation.components.type === "game" || annotation.components.type === "rally"));

                    filteredGames[i].shotWin = filteredGames[i].shotWin.filter((annotation) => (playerData.includes(annotation.playerNumber)
                        || annotation.components.type === "game" || annotation.components.type === "rally"));

                    filteredGames[i].shotError = filteredGames[i].shotError.filter((annotation) => (playerData.includes(annotation.playerNumber)
                        || annotation.components.type === "game" || annotation.components.type === "rally"));
                }
            }

            //check if the shot filter is active
            if (!shotChecker(updatedFilterStatus)) {
                for (let x = 0; x < filteredGames.length; x++) {
                    filteredGames[x].gameAnnotations = filteredGames[x].gameAnnotations.filter((annotation) =>
                    (shotData.includes(annotation.components.id) || annotation.components.type === "game"
                        || annotation.components.type === "rally" || annotation.components.type === "score"));

                    filteredGames[x].shotWin = filteredGames[x].shotWin.filter((annotation) =>
                        (shotData.includes(annotation.components.id)));

                    filteredGames[x].shotError = filteredGames[x].shotError.filter((annotation) =>
                        (shotData.includes(annotation.components.id)));
                }
            }

            //check if the won by filter is active
            if (!wonByChecker(updatedFilterStatus)) {
                //filter the matches annotations by the selected players
                filteredGames = filteredGames.filter((game) => (gameWonByData.includes(game.winner)));
            }
            //check if the position filter is active
            if (!zoneChecker(updatedFilterStatus)) {
                for (let x = 0; x < filteredGames.length; x++) {
                    filteredGames[x].gameAnnotations = filteredGames[x].gameAnnotations.filter((annotation) =>
                        (zoneData.includes(annotation.playerPos) || annotation.components.type === "game"
                            || annotation.components.type === "rally"));

                    filteredGames[x].shotWin = filteredGames[x].shotWin.filter((annotation) =>
                        (zoneData.includes(annotation.playerPos)));

                    filteredGames[x].shotError = filteredGames[x].shotError.filter((annotation) =>
                        (zoneData.includes(annotation.playerPos)));
                    }
            }
            setFilterGames(filteredGames);

            // THIS IS WHAT DRAWS THE HEAT MAP
            // first put all the annotations into one array
            let allAnnotations = getAllAnnotations(filteredGames);
            console.log(allAnnotations);
            // then draw the actual heat map
            drawHeatMap(allAnnotations);
        }

    };

    return (
        <div className="container mx-auto px-5 py-3">
            <h2 className="text-2xl sm:text-3xl font-bold leading-7 text-gray-900 mb-5">
                <span className="align-middle">Match Statistics</span>
            </h2>
            <div className="grid grid-cols-16">
                <div className="col-span-2">
                    <h3 className="font-bold text-lg mb-1 text-left">
                        Filter by Player
                    </h3>

                    {playerNums.map((player, index) => {
                        return (
                            <>
                                <div key={player}>
                                    <label className="block">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox"
                                            checked={filterStatus[index]}
                                            onChange={() => filterChange(index, player)}
                                        />
                                        <span className="ml-2">Player {player}</span>
                                    </label>
                                </div>
                            </>
                        );
                    })}
                </div>
                <div className="col-span-2">
                    <h3 className="font-bold text-lg mb-1 text-left">
                        Filter by Game 
                    </h3>

                    {gameLabels.map((game, index) => {
                        return (
                            <>
                                <div key={game}>
                                    <label className="block">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox"
                                            checked={filterStatus[index + playerNums.length]}
                                            onChange={() => filterChange(index + playerNums.length, game)}
                                        />
                                        <span className="ml-2">Game {game}</span>
                                    </label>
                                </div>
                            </>
                        );
                    })}
                </div>
                <div className="col-span-2">
                    <h3 className="font-bold text-lg mb-1 text-left">
                        Filter by Shot Type
                    </h3>

                    {uniqueShots.map((shot, index) => {
                        return (
                            <>
                                <div key={shot}>
                                    <label className="block">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox"
                                            checked={filterStatus[index + playerNums.length + gameLabels.length]}
                                            onChange={() => filterChange(index + playerNums.length + gameLabels.length, shot)}
                                        />
                                        <span className="ml-2">{shot}</span>
                                    </label>
                                </div>
                            </>
                        );
                    })}
                </div>
                <div className="col-span-2">
                    <h3 className="font-bold text-lg mb-1 text-left">
                        Filter by Player Position
                    </h3>

                    {gameZoneLabels.map((zone, index) => {
                        return (
                            <>
                                <div key={zone}>
                                    <label className="block">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox"
                                            checked={filterStatus[index + playerNums.length + gameLabels.length + uniqueShots.length]}
                                            onChange={() => filterChange(index + playerNums.length + gameLabels.length + uniqueShots.length, zone)}
                                        />
                                        <span className="ml-2">{zone}</span>
                                    </label>
                                </div>
                            </>
                        );
                    })}
                </div>
                <div className="col-span-2">
                    <h3 className="font-bold text-lg mb-1 text-left">
                        Filter by Game Won By
                    </h3>

                    {playerNums.map((player, index) => {
                        return (
                            <>
                                <div key={player}>
                                    <label className="block">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox"
                                            checked={filterStatus[index + playerNums.length + gameLabels.length + uniqueShots.length
                                                + gameZoneLabels.length]}
                                            onChange={() => filterChange(index + playerNums.length + gameLabels.length + uniqueShots.length
                                                + gameZoneLabels.length, player)}
                                        />
                                        <span className="ml-2">Player {player}</span>
                                    </label>
                                </div>
                            </>
                        );
                    })}
                </div>

                <div className="col-span-2" id="PointsWon" >
                    <h3 className="font-bold text-lg mb-1 text-left">
                        Points Won:
                    </h3>
                    <div className="grid grid-cols-2">
                        <div className="col-span-1">
                            Player 1: {pointsWon[0]}
                        </div>
                    </div>

                    <div className="col-span-1">
                        Player 2: {pointsWon[1]}
                    </div>
                </div>

                <div className="col-span-2" >
                    <h3 className="font-bold text-lg mb-1 text-left">
                        Games Won:
                    </h3>
                    <div className="col-span-1">
                        Player 1: {gamesWon[0]}
                    </div>

                    <div className="col-span-1">
                        Player 2: {gamesWon[1]}
                    </div>
                </div>

                <div className="col-span-7">
                    <Bar
                        data={shotCountChart}
                        options={{
                            legend: {
                                display: false,
                            },
                            scales: {
                                yAxes: [
                                    {
                                        ticks: {
                                            max: shotCount.maxY,
                                            min: 0,
                                            stepSize: 1,
                                        },
                                    },
                                ],
                            },
                            title: {
                                display: true,
                                text: shotCountChart.title,
                                fontSize: 18,
                            },
                        }}
                    />
                </div>

                <div className="col-span-7">
                    <Pie
                        data={handCountChart}
                        options={{
                            legend: {
                                display: false,
                            },

                            title: {
                                display: true,
                                text: handCountChart.title,
                                fontSize: 18,
                            },
                        }}
                    />
                </div>

                <div className="col-span-7">
                    <Pie
                        data={playerShotsCountChart}
                        options={{
                            legend: {
                                display: false,
                            },

                            title: {
                                display: true,
                                text: playerShotsCountChart.title,
                                fontSize: 18,
                            },
                        }}
                    />
                </div>

                <div className="col-span-7">
                    <Pie
                        data={shotWinCountChart}
                        options={{
                            legend: {
                                display: false,
                            },

                            title: {
                                display: true,
                                text: shotWinCountChart.title,
                                fontSize: 18,
                            },
                        }}
                    />
                </div>

                <div className="col-span-7">
                    <Pie
                        data={shotErrorCountChart}
                        options={{
                            legend: {
                                display: false,
                            },

                            title: {
                                display: true,
                                text: shotErrorCountChart.title,
                                fontSize: 18,
                            },
                        }}
                    />
                </div>
                <div className="col-span-7" style={squareStyle}>
                    <h3 className="font-bold text-lg mb-1 text-left">
                        Heat Map: Shots by Location
                    </h3>
                    <canvas id="canvas" width="300" height="400"></canvas>
                </div>

                <div className="col-span-7 mt-10">
                    <Bar
                        data={{
                            labels: labelData,
                            datasets: fullGamesDataset,
                        }}
                        options={{
                            title: {
                                display: true,
                                text: 'Shot Count per Game',
                                fontSize: 18,
                            },
                            scales: {
                                xAxes: [
                                    {
                                        display: true,
                                        gridLines: {
                                            display: true,
                                            color: 'red',
                                            lineWidth: 5,
                                            drawBorder: false,
                                        },
                                        ticks: {
                                            padding: 5,
                                        },
                                    },
                                ],
                                yAxes: [
                                    {
                                        ticks: {
                                            max: shotCount.maxY,
                                            min: 0,
                                            stepSize: 1,
                                        },
                                    },
                                ],
                            },
                        }}
                    />
                </div>

                <div className="col-span-7 mt-10">
                    <Bar
                        data={{
                            labels: opponentPositionLabels,
                            datasets: fullOpponentPositionDataset,
                        }}
                        options={{
                            title: {
                                display: true,
                                text: 'Shot Count per Opponent Position',
                                fontSize: 18,
                            },
                            scales: {
                                xAxes: [
                                    {
                                        display: true,
                                        gridLines: {
                                            display: true,
                                            color: 'red',
                                            lineWidth: 5,
                                            drawBorder: false,
                                        },
                                        ticks: {
                                            padding: 5,
                                        },
                                    },
                                ],
                                yAxes: [
                                    {
                                        ticks: {
                                            max: shotCount.maxY,
                                            min: 0,
                                            stepSize: 1,
                                        },
                                    },
                                ],
                            },
                        }}
                    />
                </div>

            </div>
        </div>
    );
}
