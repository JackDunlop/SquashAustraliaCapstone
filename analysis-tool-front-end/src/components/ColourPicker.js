import React, { useState, useEffect, useRef } from 'react';
import styles from './colorPicker.module.css';
import { copyColorToClipboard } from '../utils/copyColorToClipboard';
import { selectPlayerColor } from '../utils/selectPlayerColor';
import { withRouter } from 'react-router-dom';
const axios = require('axios').default;
const baseURL = "http://localhost:3001/";

function ColourPick(props) {
  const [color1, setColor1] = useState('#006F3A');
  const [color2, setColor2] = useState('#EBC015');
  const [playerOneColourRGB, setPlayerOneColourRGB] = useState([]);
  const [playerTwoColourRGB, setPlayerTwoColourRGB] = useState([]);
  const [image, setImage] = useState(null);
  const canvasRef = useRef(null);



  const videopath =  props.imagepath;
  const videoNameWithExtension = videopath.split('\\').pop(); 
  const videoName = videoNameWithExtension.split('.')[0];
  useEffect(() => {
    if (videoName) {
      axios.get(`${baseURL}colour/players/${videoName}`)
        .then(response => {
          setPlayerOneColourRGB(response.data.PlayerOne);
          setPlayerTwoColourRGB(response.data.PlayerTwo);
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
     <button type="button" onClick={swapColors}>Swap Colors</button>
      <h1 className={styles.bigHeadererFile}>
        <b>Player Selection</b>
      </h1>
      <div className={styles.ImageSelection}>
        <h5>
          <b>Choose Image By Selecting Below Text:</b>
        </h5>
        <div className={styles.formSectionImage}></div>
      </div>
      <div className={styles.Player1Selection}>
        <div className={styles.formSectionText}>
          <h5>
            <b>Pick Player 1 Colour:</b>
          </h5>
          <button
            type="button"
            className={styles.openPickerButton}
            onClick={() => selectPlayerColor(0, setColor1, props.rgbArray)}
          >
            Open Eyedropper
          </button>
        </div>

        <div className={styles.formSectionText}>
          <button
            type="button"
            className={styles.selectedColor}
            style={{ background: color1 }}
            onClick={() => copyColorToClipboard('First', color1)}
          >
            Copy Colour
          </button>
        </div>
      </div>
      <div className={styles.Player2Selection}>
        <div className={styles.formSectionText}>
          <h5>
            <b>Pick Player 2 Colour:</b>
          </h5>
          <button
            type="button"
            className={styles.openPickerButton}
            onClick={() => selectPlayerColor(1, setColor2, props.rgbArray)}
          >
            Open Eyedropper
          </button>
        </div>

        <div className={styles.formSectionText}>
          <button
            type="button"
            className={styles.selectedColor}
            style={{ background: color2 }}
            onClick={() => copyColorToClipboard('Second', color2)}
          >
            Copy Colour
          </button>
        </div>
      </div>

      <div className={styles.absoluteDiv4}>
        <div className={styles.rightColumn}>
          {image ? (
            <>
              <img src={image} alt="Working image" />
              <div
                style={{
                  backgroundImage: `url(${image})`,
                }}
              />
            </>
          ) : (
            <canvas ref={canvasRef} width={1280} height={720}></canvas>
          )}
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

  handleSubmit = (event) => {
    let form_error = this.formValidation();
    event.preventDefault();
    const players = this.state.value.player;
    const title = this.state.value.title;
    const duration = this.state.value.duration;
    const description = this.state.value.description;
    const video = this.state.value.video;
    const courtBounds = this.state.value.court_Bounds;
    const playerRGB = this.state.RGBArray;
    const formData = new FormData();
    formData.append('video', video);
    
   // fsExtra.emptyDir(path.join(`${__dirname}../../tempstorage`)); need to do in here somewhere
    if (!form_error) {
      axios
        .post(this.props.baseUrl + '/match/new', {
          players,
          title,
          duration,
          description,
          courtBounds,
          playerRGB,
        })
        .then((response) => {
          axios.post(
            this.props.baseUrl + '/video/' + response.data.match_id + '/upload',
            formData
          );
        })
        .then(
          this.props.history.push({
            pathname: '/home',
            state: this.state.value.from,
          })
        );
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
