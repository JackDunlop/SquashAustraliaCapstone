import React, { useState, useEffect, useRef } from 'react';
import styles from './colorPicker.module.css';
import { copyColorToClipboard } from '../utils/copyColorToClipboard';
import { selectPlayerColor } from '../utils/selectPlayerColor';
import { withRouter } from 'react-router-dom';
const axios = require('axios').default;
const baseURL = "http://localhost:3001/";

function ColourPick(props) {
  const [color1, setColor1] = useState('');
  const [color2, setColor2] = useState('');
  const [playerOneColourRGB, setPlayerOneColourRGB] = useState([]);
  const [playerTwoColourRGB, setPlayerTwoColourRGB] = useState([]);
  const [image, setImage] = useState(null);
  const canvasRef = useRef(null);

// TEMP USE INSTEAD OF PLAYER ONE AND PLAYER TWO
  useEffect(() => {
    console.log("Players array:", props.players);
  }, []);

  const player1 = props.players.player1.firstName;
  const player2 = props.players.player2.firstName;
  const videopath =  props.imagepath;
  const videoNameWithExtension = videopath.split('\\').pop(); 
  const videoName = videoNameWithExtension.split('.')[0];
  useEffect(() => {
    if (videoName) {
      axios.get(`${baseURL}colour/players/${videoName}`)
        .then(response => {
          setPlayerOneColourRGB(response.data.PlayerOne);
          setPlayerTwoColourRGB(response.data.PlayerTwo);
          props.onUpdatePlayercolors(response.data.PlayerOne, response.data.PlayerTwo);
        })
        .catch(error => {
          console.error('Error occurred while fetching player data:', error);
        });
    }
  }, [videoName]);
  
  function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  }
  
  useEffect(() => {
    if (playerOneColourRGB.length > 0 && playerTwoColourRGB.length > 0) {
      setColor1(rgbToHex(...playerOneColourRGB));
      setColor2(rgbToHex(...playerTwoColourRGB));
    }
  }, [playerOneColourRGB, playerTwoColourRGB]);

  const swapColors = () => {
    const temp = color1;
    setColor1(color2);
    setColor2(temp);
  };
  
  useEffect(() => {
    const loadImageToCanvas = async () => {
      if (!props.imagepath) {
        console.error("imagepath is not defined");
        return;
      }

      console.log("Imagepath:", props.imagepath);
      const fileName = props.imagepath.split('\\').pop();
      try {
        const response = await fetch(`${baseURL}video/${fileName}/firstFrame`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const blob = await response.blob();
        const imageURL = URL.createObjectURL(blob);

        const image = new Image();
        image.src = imageURL;

        image.onload = () => {
          const context = canvasRef.current.getContext('2d');
          context.clearRect(0, 0, props.width, props.height);
          context.drawImage(image, 0, 0, props.width, props.height);
          URL.revokeObjectURL(imageURL);
        };

        image.onerror = (error) => {
          console.error('Failed to load image:', error);
        };
      } catch (error) {
        console.error('Error fetching first frame:', error);
      }
    };

    if (props.imagepath) {
      loadImageToCanvas();
    }
  }, [props.imagepath]);

  return (
    <>
      <h1 className={styles.bigHeadererFile}>
        <b>Player Colour Selection</b>
      </h1>
      <div className={styles.mainContent}>
        <div className={styles.imageAndCanvas}>
          {image ? (
            <img src={image} alt="Working image" />
          ) : (
            <canvas ref={canvasRef} width={1280} height={720}></canvas>
          )}
        </div>

        <div className={styles.selectionAndSwapContainer}>
          <div className={styles.playerSelectionContainer}>

            <div className={styles.Player1Selection}>
              <div className={styles.formSectionText}>
                <h5>
                  <b> {player1} Colour:</b>
                </h5>
              </div>

              <div className={styles.formSectionText}>
                <button
                  type="button"
                  className={styles.selectedColor}
                  style={{ background: color1 }}
                  onClick={() => copyColorToClipboard('First', color1)}
                >
                  {color1 ? 'Copy Colour' : 'Loading'}
                </button>
              </div>
            </div>

            <div className={styles.Player2Selection}>
              <div className={styles.formSectionText}>
                <h5>
                  <b> {player2} Colour:</b>
                </h5>
              </div>
              <div className={styles.formSectionText}>
                <button
                  type="button"
                  className={styles.selectedColor}
                  style={{ background: color2 }}
                  onClick={() => copyColorToClipboard('Second', color2)}
                >
                  {color2 ? 'Copy Colour' : 'Loading'}
                </button>
              </div>
            </div>
          </div>
          <button type="button" onClick={swapColors} className={styles.swapButton}>Swap Colours</button>
        </div>
      </div>
    </>
  );
}
class ColourPicker extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: this.props.location.state,
      RGBArray: [[], []],
    };
  
  }

  formValidation = () => {
    let error = false;
    if (this.state.RGBArray.length === 0) {
      error = true;
    }
    return error;
  };

  updatePlayerColors = (player1Color, player2Color) => {
    const playerOneColor = player1Color;
    const playerTwoColor = player2Color;

    this.setState({
      RGBArray: [playerOneColor, playerTwoColor],
    });
  }

  handleSubmit = async (event) => {
    let form_error = this.formValidation();
    event.preventDefault();
    const baseUrl = this.props.baseUrl;
    const from = this.state.value.from;
    const players = this.state.value.player;
    const title = this.state.value.title;
    const duration = this.state.value.duration;
    const description = this.state.value.description;
    const video = this.state.value.video;
    const courtBounds = this.state.value.court_Bounds;
    const playerRGB = this.state.RGBArray;
    console.log('playerRGB:', playerRGB);
    const formData = new FormData();
    formData.append('video', video);
    
   // fsExtra.emptyDir(path.join(`${__dirname}../../tempstorage`)); need to do in here somewhere

    if (form_error) {
      console.error('Error occurred while creating a new match: Form validation');
      return;
    }

    try {
      const newMatchResponse = await axios.post(baseUrl + '/match/new', {
        players,
        title,
        duration,
        description,
        courtBounds,
        playerRGB,
      });

      if (!newMatchResponse || !newMatchResponse.data.match_id) {
        throw new Error('Failed to create a new match');
      };

      await axios.post(baseUrl + '/video/' + newMatchResponse.data.match_id + '/upload', formData);

      this.props.history.push({ pathname: '/home', state: from });
    } catch (error) {
      console.error('Error occurred while creating a new match:', error);
      this.props.history.push({ pathname: '/home', state: from });
    }
  };

  render() {
    return (
      <>
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Player Selection</title>
        </head>

        <body>
       
          <div className={styles.relativeDiv}>
            <form onSubmit={this.handleSubmit}>
              <ColourPick
                rgbArray={this.state.RGBArray}
                imagepath={this.state.value.imagepath}  
                width={1280}
                height={720}
                players={this.state.value.player} 
                onUpdatePlayercolors={this.updatePlayerColors}
              />
              <div type="submit" className={styles.ProcessDiv}>
                <button className={styles.NextButtonColour}>Process</button>
              </div>
            </form>
          </div>
        </body>
      </>
    );
  }
}



export default withRouter(ColourPicker);
