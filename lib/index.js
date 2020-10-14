import React, { Component } from 'react';
import {
  View,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Text,
  InteractionManager,
} from 'react-native';
import PropTypes from 'prop-types'
import Modal from "react-native-modal";
import { RNCamera } from 'react-native-camera';
import RecordingButton from './RecordingButton';
import styles, { 
  buttonClose, 
  durationText, 
  renderClose, 
  renderDone, 
  buttonSwitchCamera,
  renderSwitchCamera
} from './style';

export default class VideoRecorder extends Component {
  static propTypes = {
    isOpen: PropTypes.bool,
    runAfterInteractions: PropTypes.bool,
    cameraOptions: PropTypes.shape({}),
    recordOptions: PropTypes.shape({}),
    buttonCloseStyle: PropTypes.shape({}),
    durationTextStyle: PropTypes.shape({}),
    buttonSwitchCameraStyle: PropTypes.shape({}),
    renderClose: PropTypes.func,
    renderSwitchCamera: PropTypes.func,
    renderDone: PropTypes.func,
  }

  static defaultProps = {
    isOpen: false,
    runAfterInteractions: true,
    cameraOptions: {},
    recordOptions: {},
    buttonCloseStyle: buttonClose,
    buttonSwitchCameraStyle: buttonSwitchCamera,
    durationTextStyle: durationText,
    renderClose,
    renderSwitchCamera: renderSwitchCamera,
    renderDone,
  }

  constructor(...props) {
    super(...props);
    this.state = {
      isOpen: this.props.isOpen,
      loading: true,
      time: 0,
      recorded: false,
      recordedData: null,
      cameraType: this.props.cameraOptions.type || RNCamera.Constants.Type.back
    };
  }

  componentDidMount() {
    const doPostMount = () => this.setState({ loading: false });
    if (this.props.runAfterInteractions) {
      InteractionManager.runAfterInteractions(doPostMount);
    } else {
      doPostMount();
    }
  }

  onSave = () => {
    if (this.callback) {
      this.callback(this.state.recordedData);
    } 
    
    
  }
  
  switchCamera = () => {
    let type = (this.state.cameraType === RNCamera.Constants.Type.back ? RNCamera.Constants.Type.front : RNCamera.Constants.Type.back)
    if (!this.state.isRecording){
      this.setState({cameraType: type })
    }
  }
  
  secondToTime = (time) => {
    return ~~(time / 60) + ":" + (time % 60 < 10 ? "0" : "") + time % 60;
  };

  open = (options, callback) => {
    this.callback = callback;
    this.setState({
      maxLength: -1,
      ...options,
      isOpen: true,
      isRecording: false,
      time: 0,
      recorded: false,
      recordedData: null,
      converting: false,
    });
  }

  close = () => {
    this.setState({ isOpen: false });
    if (typeof this.props.onClose === 'function') {
      this.props.onClose()
    }
  }

  startCapture = () => {
    const shouldStartCapture = () => {
      this.camera.recordAsync(this.props.recordOptions)
      .then((data) => {
        if (!data){return }
        console.log('video capture', data);
        this.setState({
          recorded: true,
          recordedData: data,
        });
        this.onSave()
      }).catch(err => console.error(err));
      setTimeout(() => {
        this.startTimer();
        this.setState({
          isRecording: true,
          recorded: false,
          recordedData: null,
          time: 0,
        });
      });
    };
    if ((this.state.maxLength > 0) || (this.state.maxLength < 0)) {
      if (this.props.runAfterInteractions) {
        InteractionManager.runAfterInteractions(shouldStartCapture);
      } else {
        shouldStartCapture();
      }
    }
  }

  stopCapture = () => {
    const shouldStopCapture = () => {
      this.stopTimer();
      this.camera.stopRecording();
      this.setState({
        isRecording: false,
      });
    };
    if (this.props.runAfterInteractions) {
      InteractionManager.runAfterInteractions(shouldStopCapture);
    } else {
      shouldStopCapture();
    }
  }

  startTimer = () => {
    this.timer = setInterval(() => {
      const time = this.state.time + 1;
      this.setState({ time });
      if (this.state.maxLength > 0 && time >= this.state.maxLength) {
        this.stopCapture();
      }
    }, 1000);
  }

  stopTimer = () => {
    if (this.timer) clearInterval(this.timer);
  }

  

  renderTimer() {
    const { isRecording, time, recorded } = this.state;
    return (
      <View style={styles.durationWrapper}>
        {
          (recorded || isRecording) &&
          <View style={styles.durationBackground}>
            <Text style={styles.dotText}>●</Text>
            <Text style={styles.durationText}>
               {this.secondToTime(time)}
            </Text>
          </View>
        }
      </View>
    );
  }

  renderContent() {
    const { isRecording, recorded } = this.state;
    return (
      <View style={styles.controlLayer}>
        {this.renderTimer()}
        <View style={[styles.controls]}>
          <RecordingButton style={styles.recodingButton} isRecording={isRecording} onStartPress={this.startCapture}
            onStopPress={this.stopCapture} />
          {
            recorded &&
              <TouchableOpacity onPress={this.onSave} style={styles.btnUse}>
                {this.props.renderDone()}
              </TouchableOpacity>
          }
        </View>
      </View>
    );
  }

  renderCamera() {
    return (
      <RNCamera
        ref={(cam) => { this.camera = cam; }}
        style={styles.preview}
        {...this.props.cameraOptions}
        type={this.state.cameraType}
        captureAudio
      >
        {this.renderContent()}
      </RNCamera>
    );
  }

  render() {
    const { loading, isOpen } = this.state;
    if (loading) return <View />;
    return (
      <Modal
        style={{margin:0,padding:0}} 
        visible={isOpen} 
        hasBackdrop={false}
        animationType="fade"
        swipeDirection={['up','down']}
        propagateSwipe={false}
        onSwipeThreshold={200}
        onSwipeComplete={ this.close.bind(this)}
        >
        <View style={styles.modal}>
          <TouchableWithoutFeedback onPress={this.close}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={styles.container}>
            <View style={styles.content}>
              {this.renderCamera()}
            </View>
            <TouchableOpacity onPress={this.close} style={[this.props.buttonCloseStyle,{padding:5,borderRadius:5,marginTop:20}]}>
              {this.props.renderClose()}
            </TouchableOpacity>
            <TouchableOpacity onPress={this.switchCamera} style={this.props.buttonSwitchCameraStyle}>
              {this.props.renderSwitchCamera()}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }
}
