// src/components/video_call_components/VideoCall.js
import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Space, Typography, message } from 'antd';
import {
  VideoCameraOutlined,
  PhoneOutlined,
  AudioOutlined,
  AudioMutedOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

const VideoCallComponent = ({ visible, onClose, appointment, userRole }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    if (visible) {
      startLocalStream();
    } else {
      stopLocalStream();
    }
    // cleanup when modal closes
    return () => stopLocalStream();
  }, [visible]);

  const startLocalStream = async () => {
    try {
      setIsConnecting(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // TODO: Hook with Twilio/Signaling server to connect remote
      // For now just simulate remote stream
      setTimeout(() => {
        setIsConnecting(false);
        message.success('Call connected');
      }, 1000);
    } catch (err) {
      console.error('Error accessing camera/mic:', err);
      message.error('Unable to access camera or microphone');
      setIsConnecting(false);
    }
  };

  const stopLocalStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(
        (track) => (track.enabled = isMuted) // toggle back
      );
    }
    setIsMuted(!isMuted);
    message.info(isMuted ? 'Microphone on' : 'Microphone muted');
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(
        (track) => (track.enabled = isVideoOff)
      );
    }
    setIsVideoOff(!isVideoOff);
    message.info(isVideoOff ? 'Video on' : 'Video off');
  };

  const endCall = () => {
    stopLocalStream();
    onClose();
  };

  return (
    <Modal
      open={visible}
      onCancel={endCall}
      footer={null}
      width={800}
      bodyStyle={{ padding: 0 }}
      destroyOnClose
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '600px' }}>
        {/* Remote Video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{
            flex: 1,
            backgroundColor: '#000',
            width: '100%',
            objectFit: 'cover',
          }}
        />

        {/* Local Video (your preview) */}
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: 'absolute',
            bottom: '80px',
            right: '20px',
            width: '200px',
            height: '150px',
            backgroundColor: '#000',
            borderRadius: '8px',
          }}
        />

        {/* Call Controls */}
        <div
          style={{
            padding: '16px',
            backgroundColor: '#fff',
            textAlign: 'center',
            borderTop: '1px solid #f0f0f0',
          }}
        >
          <Space size="large">
            <Button
              shape="circle"
              size="large"
              icon={isMuted ? <AudioMutedOutlined /> : <AudioOutlined />}
              onClick={toggleAudio}
              type={isMuted ? 'primary' : 'default'}
              danger={isMuted}
              disabled={isConnecting}
            />
            <Button
              shape="circle"
              size="large"
              icon={<PhoneOutlined />}
              onClick={endCall}
              type="primary"
              danger
            />
            <Button
              shape="circle"
              size="large"
              icon={<VideoCameraOutlined />}
              onClick={toggleVideo}
              type={isVideoOff ? 'primary' : 'default'}
              danger={isVideoOff}
              disabled={isConnecting}
            />
          </Space>
        </div>
      </div>
    </Modal>
  );
};

export default VideoCallComponent;
