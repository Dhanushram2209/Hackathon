import React, { useState, useEffect, useRef } from 'react';
import {
  Modal, Button, Space, Typography, Card, Row, Col,
  List, Progress, Tag, Alert, Statistic, Divider, Switch,
  Slider, Select, Input, Tooltip, message
} from 'antd';
import {
  PhoneOutlined, AudioOutlined, StopOutlined, PlayCircleOutlined,
  PauseCircleOutlined, SoundOutlined, CustomerServiceOutlined,
  MessageOutlined, UserOutlined, RobotOutlined,CheckCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

const VoiceIVR = ({ userType, userData, onCallInitiated, visible, onClose }) => {
  const [callStatus, setCallStatus] = useState('idle'); // idle, calling, in-progress, ended
  const [currentMenu, setCurrentMenu] = useState('main');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [selectedOption, setSelectedOption] = useState(null);
  const [callHistory, setCallHistory] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioRef = useRef(null);

  // IVR menu structure
  const ivrMenus = {
    main: {
      title: "Main Menu",
      message: "Thank you for calling MediCare Virtual Assistant. Please select an option:",
      options: userType === 'patient' ? [
        { key: '1', label: 'Schedule Appointment', target: 'appointment' },
        { key: '2', label: 'Medication Refill', target: 'medication' },
        { key: '3', label: 'Test Results', target: 'results' },
        { key: '4', label: 'Billing Inquiry', target: 'billing' },
        { key: '5', label: 'Speak to a Representative', target: 'representative' }
      ] : [
        { key: '1', label: 'Patient Consultations', target: 'consultations' },
        { key: '2', label: 'Schedule Management', target: 'schedule' },
        { key: '3', label: 'Prescription Refills', target: 'prescriptions' },
        { key: '4', label: 'Lab Results Review', target: 'labresults' },
        { key: '5', label: 'Emergency Contact', target: 'emergency' }
      ]
    },
    appointment: {
      title: "Appointment Scheduling",
      message: "Appointment scheduling. Please say the reason for your visit after the tone.",
      options: [
        { key: '1', label: 'Confirm Appointment', target: 'confirm' },
        { key: '2', label: 'Reschedule Appointment', target: 'reschedule' },
        { key: '3', label: 'Cancel Appointment', target: 'cancel' },
        { key: '0', label: 'Return to Main Menu', target: 'main' }
      ]
    },
    medication: {
      title: "Medication Refill",
      message: "Medication refill service. Please say the name of your medication after the tone.",
      options: [
        { key: '1', label: 'Request Refill', target: 'request' },
        { key: '2', label: 'Check Refill Status', target: 'status' },
        { key: '0', label: 'Return to Main Menu', target: 'main' }
      ]
    },
    // Additional menu options would be defined here
  };

  // Simulate call initiation
  const startCall = () => {
    setCallStatus('calling');
    message.info('Connecting to IVR system...');
    
    // Simulate call connection delay
    setTimeout(() => {
      setCallStatus('in-progress');
      setCurrentMenu('main');
      
      // Start call timer
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      
      // Simulate text-to-speech for the menu
      speak(ivrMenus.main.message);
    }, 2000);
  };

  // End the call
  const endCall = () => {
    setCallStatus('ended');
    clearInterval(timerRef.current);
    
    // Add to call history
    setCallHistory(prev => [...prev, {
      date: new Date(),
      duration: callDuration,
      menuPath: [currentMenu],
      transcript
    }]);
    
    // Reset after a delay
    setTimeout(() => {
      resetCall();
      onClose();
    }, 3000);
  };

  // Reset call state
  const resetCall = () => {
    setCallStatus('idle');
    setCurrentMenu('main');
    setCallDuration(0);
    setSelectedOption(null);
    setTranscript('');
    clearInterval(timerRef.current);
  };

  // Simulate text-to-speech
  const speak = (text) => {
    // In a real implementation, this would use the Web Speech API
    console.log("IVR says:", text);
    
    // For demo purposes, we'll show the message in an alert
    message.info(`IVR: ${text}`, 4);
  };

  // Handle menu option selection
  const selectOption = (option) => {
    setSelectedOption(option.key);
    
    // Find the selected option
    const selected = ivrMenus[currentMenu].options.find(opt => opt.key === option.key);
    
    if (selected) {
      if (selected.target === 'representative' || selected.target === 'emergency') {
        // Transfer to representative
        setCallStatus('transferring');
        message.info('Transferring to a representative...');
        
        setTimeout(() => {
          if (onCallInitiated) {
            onCallInitiated('representative');
          }
          endCall();
        }, 3000);
      } else {
        // Navigate to another menu
        setCurrentMenu(selected.target);
        speak(ivrMenus[selected.target].message);
      }
    }
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    message.info(!isMuted ? 'Microphone muted' : 'Microphone unmuted');
  };

  // Format time for display (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      title={
        <Space>
          <PhoneOutlined />
          <span>Voice IVR System</span>
          {callStatus !== 'idle' && (
            <Tag color={
              callStatus === 'calling' ? 'blue' : 
              callStatus === 'in-progress' ? 'green' : 
              callStatus === 'transferring' ? 'orange' : 'red'
            }>
              {callStatus.toUpperCase()}
            </Tag>
          )}
        </Space>
      }
      visible={visible}
      onCancel={onClose}
      footer={null}
      width={700}
      style={{ top: 20 }}
    >
      {callStatus === 'idle' && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <CustomerServiceOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
          <Title level={4}>MediCare Voice IVR System</Title>
          <Text>
            Connect to our automated voice system for quick access to services and information.
          </Text>
          <div style={{ marginTop: '24px' }}>
            <Button 
              type="primary" 
              icon={<PhoneOutlined />} 
              size="large"
              onClick={startCall}
            >
              Start IVR Call
            </Button>
          </div>
        </div>
      )}
      
      {callStatus === 'calling' && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ marginBottom: '24px' }}>
            <PlayCircleOutlined style={{ fontSize: '64px', color: '#1890ff' }} spin />
          </div>
          <Title level={4}>Connecting to IVR System...</Title>
          <Text>Please wait while we connect your call.</Text>
        </div>
      )}
      
      {(callStatus === 'in-progress' || callStatus === 'transferring') && (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card 
              title={
                <Space>
                  <SoundOutlined />
                  <span>{ivrMenus[currentMenu]?.title || 'IVR Menu'}</span>
                </Space>
              }
              size="small"
            >
              <div style={{ marginBottom: '16px' }}>
                <Text>{ivrMenus[currentMenu]?.message}</Text>
              </div>
              
              <List
                size="small"
                dataSource={ivrMenus[currentMenu]?.options || []}
                renderItem={item => (
                  <List.Item>
                    <Button 
                      type="text" 
                      style={{ textAlign: 'left', width: '100%' }}
                      onClick={() => selectOption(item)}
                    >
                      <Space>
                        <Text keyboard>{item.key}</Text>
                        <Text>{item.label}</Text>
                      </Space>
                    </Button>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          
          <Col span={24}>
            <Card title="Call Controls" size="small">
              <Row gutter={[16, 16]} align="middle">
                <Col span={8}>
                  <Statistic title="Call Duration" value={formatTime(callDuration)} />
                </Col>
                <Col span={8}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>Microphone</Text>
                    <Switch
                      checkedChildren="Unmuted"
                      unCheckedChildren="Muted"
                      checked={!isMuted}
                      onChange={toggleMute}
                    />
                  </Space>
                </Col>
                <Col span={8}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>Volume</Text>
                    <Slider
                      min={0}
                      max={100}
                      value={volume}
                      onChange={setVolume}
                    />
                  </Space>
                </Col>
              </Row>
              
              <Divider />
              
              <div style={{ textAlign: 'center' }}>
                <Button 
                  type="primary" 
                  danger 
                  icon={<StopOutlined />}
                  onClick={endCall}
                >
                  End Call
                </Button>
              </div>
            </Card>
          </Col>
          
          {callStatus === 'transferring' && (
            <Col span={24}>
              <Alert
                message="Transferring Call"
                description="Please wait while we connect you to a representative."
                type="info"
                showIcon
              />
            </Col>
          )}
        </Row>
      )}
      
      {callStatus === 'ended' && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
          <Title level={4}>Call Ended</Title>
          <Text>Your IVR call lasted {formatTime(callDuration)}</Text>
          <div style={{ marginTop: '24px' }}>
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default VoiceIVR;