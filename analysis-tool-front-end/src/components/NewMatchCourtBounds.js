import React from 'react';
import { useRef, useEffect} from 'react';
import { withRouter } from 'react-router-dom';
import styles from './courtBounds.module.css';
import { ChooseImageButton } from './ChooseImageButton';

//import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
//import { faUpload } from '@fortawesome/free-solid-svg-icons';
const baseURL = "http://localhost:3001/"
const positions = {
  fL: {
    description: 'Front Left',
    id: 1,
  },
  fR: {
    description: 'Front Right',
    id: 2,
  },
  bL: {
    description: 'Back Left',
    id: 3,
  },
  bR: {
    description: 'Back Right',
    id: 4,
  },
  mL: {
    description: 'Short Line Left',
    id: 5,
  },
  mR: {
    description: 'Short Line Right',
    id: 6,
  },
};

const PositionMarker = ({ label, positionId, onMarkPosition }) => {
  const buttonStyles = {
    width: '150px',
    height: '45px',
    background: '#006f3a',
    border: '3px solid #006f3a',
    borderRadius: '20px',
    color: 'white',
    fontSize: '1rem',
    cursor: 'pointer',
    marginRight: 12,
  };

  const canvasStyles = {
    position: 'relative',
    backgroundColor: 'red',
  };

  return (
    <div
      style={{
        margin: '0 12px 40px 12px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <button
        type="button"
        style={buttonStyles}
        onClick={() => onMarkPosition(positionId)}
      >
        {label}
      </button>
      <canvas
        id={positionId}
        width={25}
        height={25}
        style={canvasStyles}
      ></canvas>
    </div>
  );
};
  
  const NextButton = ({onNextStep })  => { 
    return (
      <form onSubmit={onNextStep}>
        <button type="submit" class={styles.customFileLabel}>
          Next
        </button>
      </form>
    );
  }; 

function Canvas(props) {
  const canvasRef = useRef(null);
  const coordRef = useRef(0);

  const image = new Image();

  image.onload = () => {
    canvasRef.current
      .getContext('2d')
      .drawImage(image, 0, 0, props.width, props.height);
  };

  const markPosition = (positionId) => {
    const confirm = document.getElementById(positionId).getContext('2d');
    confirm.fillStyle = 'red';
    confirm.fillRect(0, 0, 25, 25);

    coordRef.current = positions[positionId].id || 0;
  };

  const handleFileInput = (event) => {
    image.src = URL.createObjectURL(event.target.files[0]);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    context.fillStyle = 'green';
    context.fillRect(0, 0, props.width, props.height);
    const clickHandler = (event) => {
      const rect = canvas.getBoundingClientRect();
      if (coordRef.current === 1) {
        props.court_bounds[0] = [
          Math.floor(event.clientX - rect.left),
          Math.floor(event.clientY - rect.top),
        ];
        coordRef.current = 0;
        const confirm = document.getElementById('fL').getContext('2d');
        confirm.fillStyle = 'lime';
        confirm.fillRect(0, 0, 25, 25);
        console.log(1);
      } else if (coordRef.current === 2) {
        props.court_bounds[1] = [
          Math.floor(event.clientX - rect.left),
          Math.floor(event.clientY - rect.top),
        ];
        coordRef.current = 0;
        const confirm = document.getElementById('fR').getContext('2d');
        confirm.fillStyle = 'lime';
        confirm.fillRect(0, 0, 25, 25);
        console.log(2);
      } else if (coordRef.current === 3) {
        props.court_bounds[2] = [
          Math.floor(event.clientX - rect.left),
          Math.floor(event.clientY - rect.top),
        ];
        coordRef.current = 0;
        const confirm = document.getElementById('bL').getContext('2d');
        confirm.fillStyle = 'lime';
        confirm.fillRect(0, 0, 25, 25);
        console.log(3);
      } else if (coordRef.current === 4) {
        props.court_bounds[3] = [
          Math.floor(event.clientX - rect.left),
          Math.floor(event.clientY - rect.top),
        ];
        coordRef.current = 0;
        const confirm = document.getElementById('bR').getContext('2d');
        confirm.fillStyle = 'lime';
        confirm.fillRect(0, 0, 25, 25);
        console.log(4);
      } else if (coordRef.current === 5) {
        props.court_bounds[4] = [
          Math.floor(event.clientX - rect.left),
          Math.floor(event.clientY - rect.top),
        ];
        coordRef.current = 0;
        const confirm = document.getElementById('mL').getContext('2d');
        confirm.fillStyle = 'lime';
        confirm.fillRect(0, 0, 25, 25);
        console.log(5);
      } else if (coordRef.current === 6) {
        props.court_bounds[5] = [
          Math.floor(event.clientX - rect.left),
          Math.floor(event.clientY - rect.top),
        ];
        coordRef.current = 0;
        const confirm = document.getElementById('mR').getContext('2d');
        confirm.fillStyle = 'lime';
        confirm.fillRect(0, 0, 25, 25);
        console.log(6);
      } else {
        console.log(props.court_bounds);
      }
    };

    canvas.addEventListener('click', clickHandler);
    return () => {
      canvas.removeEventListener('click', clickHandler);
    };
  }, []);

  const chunkArray = (array, chunkSize) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  };

  const positionEntries = Object.entries(positions);
  const positionChunks = chunkArray(positionEntries, 2);

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
      }}
    >
      <section
        style={{
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <canvas ref={canvasRef} width={props.width} height={props.height} />
      </section>

      <section
        style={{
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
          marginTop: 24,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ marginBottom: 36 }}>
          <ChooseImageButton onFileInput={handleFileInput} />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            margin: '0 24px',
            padding: '0 160px',
          }}
        >
          {positionChunks.map((chunk, index) => (
            <div
              key={index}
              className="position-group"
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              {chunk.map(([key, value]) => (
                <PositionMarker
                  key={value.id}
                  label={value.description}
                  positionId={key}
                  onMarkPosition={markPosition}
                />
              ))}
            </div>
          ))}
        </div>

        <div>
          <NextButton onNextStep={props.onNextStep} />
        </div>
      </section>
    </section>
  );
}

class CourtBounds extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: this.props.location.state,
      courtBounds: [[], [], [], [], [], []],
    };
  }
  

  formValidation = () => {
    let error = false;
    if (this.state.courtBounds[0].length !== 2) {
      error = true;
    }
    if (this.state.courtBounds[1].length !== 2) {
      error = true;
    }
    if (this.state.courtBounds[2].length !== 2) {
      error = true;
    }
    if (this.state.courtBounds[3].length !== 2) {
      error = true;
    }
    if (this.state.courtBounds[4].length !== 2) {
      error = true;
    }
    if (this.state.courtBounds[5].length !== 2) {
      error = true;
    }

    return error;
  };

  handleSubmit = async (event) => {
    event.preventDefault();
    let form_error = this.formValidation();
  
    if (!form_error) {
      try {
        const courtUrl = `${baseURL}pose/newmatch/positions`;
  
        const response = await fetch(courtUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(this.state.courtBounds), // Send the court bounds data to the backend
        });
  
        if (!response.ok) {
          throw new Error(`Status: ${response.status}`);
        }
  
        const data = await response.json();
        console.log('Positions sent successfully:', data);
  
        this.props.history.push({
          pathname: '/new/colourPick',
          state: {
            from: this.props.location.pathname,
            player: this.state.value.player,
            title: this.state.value.title,
            duration: this.state.value.duration,
            description: this.state.value.description,
            video: this.state.value.video,
            court_Bounds: this.state.courtBounds,
          },
        });
      } catch (error) {
        console.error('Error sending positions:', error);
      }
    }
  };

  render() {
    return (
      <section style={{ display: 'flex', flexDirection: 'column' }}>
        <section style={{ marginBottom: 24, display: 'flex' }}>
          <Canvas
            width={1280}
            height={720}
            court_bounds={this.state.courtBounds}
            onNextStep={this.handleSubmit}
          ></Canvas>
        </section>
      </section>
    );
  }
}
export default withRouter(CourtBounds);
