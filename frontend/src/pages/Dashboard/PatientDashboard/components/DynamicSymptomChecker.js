import React, { useState, useEffect } from 'react';
import {
  Card, Button, Form, Radio, Input, Slider, Select, Alert,
  Typography, Steps, Progress, Row, Col, Tag, Modal, List, Divider,
  Collapse, Space, Spin, message, DatePicker
} from 'antd';
import {
  QuestionCircleOutlined, CheckCircleOutlined,
  WarningOutlined, ClockCircleOutlined, UserOutlined,
  PlusOutlined, MedicineBoxOutlined, CalendarOutlined,
  ShareAltOutlined
} from '@ant-design/icons';
import api from '../../../../services/api';
import moment from 'moment'; 

const { Title, Text } = Typography;
const { Step } = Steps;
const { Panel } = Collapse;

const DynamicSymptomChecker = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [appointmentModalVisible, setAppointmentModalVisible] = useState(false);
  const [appointmentForm] = Form.useForm();
  const [doctors, setDoctors] = useState([]);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  useEffect(() => {
    fetchCategories();
    fetchDoctors();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/triage/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      message.error('Failed to load symptom categories');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await api.get('/doctors');
      setDoctors(response.data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const handleResponse = (questionId, value) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleCategorySelect = (categoryId) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  const nextStep = () => {
    const currentCategory = categories.find(cat => cat.id === selectedCategories[currentCategoryIndex]);
    
    if (currentQuestionIndex < currentCategory.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (currentCategoryIndex < selectedCategories.length - 1) {
      setCurrentCategoryIndex(currentCategoryIndex + 1);
      setCurrentQuestionIndex(0);
    } else {
      submitAssessment();
    }
  };

  const prevStep = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex(currentCategoryIndex - 1);
      const prevCategory = categories.find(cat => cat.id === selectedCategories[currentCategoryIndex - 1]);
      setCurrentQuestionIndex(prevCategory.questions.length - 1);
    }
  };

  const submitAssessment = async () => {
    try {
      setLoading(true);
      const symptoms = Object.entries(responses).map(([questionId, response]) => ({
        id: questionId,
        response: response.toString()
      }));

      const result = await api.post('/triage/assess', { symptoms });
      setResult(result.data);
      setShowResults(true);
    } catch (error) {
      console.error('Error submitting assessment:', error);
      message.error('Failed to submit assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleAppointment = async (values) => {
    try {
      await api.post('/patient/appointments', {
        doctorId: values.doctorId,
        dateTime: values.dateTime.format('YYYY-MM-DDTHH:mm:ss'),
        type: 'Follow-up',
        notes: `Symptom assessment follow-up: ${result.level} priority`
      });
      
      message.success('Appointment scheduled successfully');
      setAppointmentModalVisible(false);
      appointmentForm.resetFields();
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      message.error('Failed to schedule appointment');
    }
  };

  const handleShareWithDoctor = async () => {
    if (!selectedDoctor) {
      message.error('Please select a doctor to share with');
      return;
    }

    try {
      // Create an alert for the doctor
      await api.post('/doctor/share-assessment', {
        doctorId: selectedDoctor,
        assessmentId: result.assessmentId,
        patientId: (await api.get('/patient/profile')).data.id, // Assuming profile contains patient ID
        triageLevel: result.level,
        confidence: result.confidence,
        symptoms: Object.entries(responses).map(([questionId, response]) => ({
          id: questionId,
          response: response.toString()
        }))
      });

      message.success('Assessment shared with doctor successfully');
      setShareModalVisible(false);
      setSelectedDoctor(null);
    } catch (error) {
      console.error('Error sharing assessment:', error);
      message.error('Failed to share assessment with doctor');
    }
  };

  const renderQuestionInput = (question) => {
    switch (question.type) {
      case 'boolean':
        return (
          <Radio.Group
            onChange={(e) => handleResponse(question.id, e.target.value)}
            value={responses[question.id]}
          >
            <Radio value={true}>Yes</Radio>
            <Radio value={false}>No</Radio>
          </Radio.Group>
        );
      
      case 'scale':
        return (
          <div>
            <Slider
              min={0}
              max={10}
              marks={{
                0: '0 (None)',
                5: '5 (Moderate)',
                10: '10 (Severe)'
              }}
              onChange={(value) => handleResponse(question.id, value)}
              value={responses[question.id] || 0}
            />
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Text strong>Selected: {responses[question.id] || 0}/10</Text>
            </div>
          </div>
        );
      
      case 'multiple_choice':
        return (
          <Select
            placeholder="Select an option"
            onChange={(value) => handleResponse(question.id, value)}
            value={responses[question.id]}
            style={{ width: '100%' }}
          >
            {question.options.map(option => (
              <Select.Option key={option} value={option}>
                {option}
              </Select.Option>
            ))}
          </Select>
        );
      
      default:
        return (
          <Input
            placeholder="Describe your symptom"
            onChange={(e) => handleResponse(question.id, e.target.value)}
            value={responses[question.id] || ''}
          />
        );
    }
  };

  const getTriageColor = (level) => {
    switch (level) {
      case 'Emergency': return '#ff4d4f';
      case 'Urgent': return '#faad14';
      case 'Routine': return '#1890ff';
      case 'Self-care': return '#52c41a';
      default: return '#d9d9d9';
    }
  };

  if (showResults && result) {
    return (
      <Card 
        title="Symptom Assessment Results" 
        className="dashboard-section-card"
        extra={
          <Button onClick={() => {
            setShowResults(false);
            setSelectedCategories([]);
            setCurrentCategoryIndex(0);
            setCurrentQuestionIndex(0);
            setResponses({});
            setResult(null);
          }}>
            Start New Assessment
          </Button>
        }
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>
            {result.level === 'Emergency' && <WarningOutlined style={{ color: getTriageColor(result.level) }} />}
            {result.level === 'Urgent' && <WarningOutlined style={{ color: getTriageColor(result.level) }} />}
            {result.level === 'Routine' && <ClockCircleOutlined style={{ color: getTriageColor(result.level) }} />}
            {result.level === 'Self-care' && <CheckCircleOutlined style={{ color: getTriageColor(result.level) }} />}
          </div>
          <Title level={2} style={{ color: getTriageColor(result.level) }}>
            {result.level}
          </Title>
          <Text type="secondary">
            Confidence: {(result.confidence * 100).toFixed(0)}%
          </Text>
        </div>

        <Alert
          message={result.recommendation}
          type={
            result.level === 'Emergency' ? 'error' :
            result.level === 'Urgent' ? 'warning' :
            result.level === 'Routine' ? 'info' : 'success'
          }
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Card title="Assessment Details" size="small">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Text strong>Assessment ID:</Text>
              <br />
              <Text>{result.assessmentId}</Text>
            </Col>
            <Col span={12}>
              <Text strong>Date:</Text>
              <br />
              <Text>{new Date().toLocaleDateString()}</Text>
            </Col>
          </Row>
        </Card>

        <Divider />

        <Row gutter={16}>
          <Col span={12}>
            <Button 
              type="primary" 
              block
              onClick={() => setAppointmentModalVisible(true)}
            >
              Schedule Appointment
            </Button>
          </Col>
          <Col span={12}>
            <Button 
              block
              icon={<ShareAltOutlined />}
              onClick={() => setShareModalVisible(true)}
            >
              Share with Doctor
            </Button>
          </Col>
        </Row>

        {/* Appointment Scheduling Modal */}
        <Modal
          title="Schedule Appointment"
          visible={appointmentModalVisible}
          onCancel={() => setAppointmentModalVisible(false)}
          footer={null}
        >
          <Form
            form={appointmentForm}
            layout="vertical"
            onFinish={handleScheduleAppointment}
          >
            <Form.Item
              name="doctorId"
              label="Doctor"
              rules={[{ required: true, message: 'Please select a doctor' }]}
            >
              <Select placeholder="Select doctor">
                {doctors.map(doctor => (
                  <Select.Option key={doctor.id} value={doctor.id}>
                    {doctor.name} ({doctor.specialization})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item
              name="dateTime"
              label="Date & Time"
              rules={[{ required: true, message: 'Please select date and time' }]}
            >
              <DatePicker 
                showTime 
                format="YYYY-MM-DD HH:mm"
                disabledDate={(current) => current && current < moment().startOf('day')}
                style={{ width: '100%' }}
              />
            </Form.Item>
            
            <Form.Item>
              <Button type="primary" htmlType="submit" style={{ marginRight: 8 }}>
                Schedule
              </Button>
              <Button onClick={() => setAppointmentModalVisible(false)}>
                Cancel
              </Button>
            </Form.Item>
          </Form>
        </Modal>

        {/* Share with Doctor Modal */}
        <Modal
          title="Share Assessment with Doctor"
          visible={shareModalVisible}
          onCancel={() => {
            setShareModalVisible(false);
            setSelectedDoctor(null);
          }}
          footer={[
            <Button key="cancel" onClick={() => {
              setShareModalVisible(false);
              setSelectedDoctor(null);
            }}>
              Cancel
            </Button>,
            <Button 
              key="share" 
              type="primary" 
              onClick={handleShareWithDoctor}
              disabled={!selectedDoctor}
            >
              Share Assessment
            </Button>
          ]}
        >
          <div style={{ marginBottom: 16 }}>
            <Text>Select a doctor to share your symptom assessment results with:</Text>
          </div>
          
          <Select
            placeholder="Select a doctor"
            value={selectedDoctor}
            onChange={setSelectedDoctor}
            style={{ width: '100%' }}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {doctors.map(doctor => (
              <Select.Option key={doctor.id} value={doctor.id}>
                {doctor.name} - {doctor.specialization} ({doctor.hospital})
              </Select.Option>
            ))}
          </Select>
          
          {selectedDoctor && (
            <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f9f9f9', borderRadius: 4 }}>
              <Text strong>Assessment Summary:</Text>
              <div>Triage Level: <Tag color={getTriageColor(result.level)}>{result.level}</Tag></div>
              <div>Confidence: {(result.confidence * 100).toFixed(0)}%</div>
              <div>Recommendation: {result.recommendation}</div>
            </div>
          )}
        </Modal>
      </Card>
    );
  }

  if (selectedCategories.length === 0) {
    return (
      <Card title="Symptom Checker" className="dashboard-section-card" loading={loading}>
        <Title level={4}>Select Symptom Categories</Title>
        <Text>Choose the categories that best describe your symptoms:</Text>
        
        <div style={{ marginTop: 16 }}>
          <Row gutter={[16, 16]}>
            {categories.map(category => (
              <Col xs={24} sm={12} md={8} key={category.id}>
                <Card 
                  size="small" 
                  hoverable
                  onClick={() => handleCategorySelect(category.id)}
                  style={{ 
                    borderColor: selectedCategories.includes(category.id) ? '#1890ff' : '#d9d9d9',
                    backgroundColor: selectedCategories.includes(category.id) ? '#e6f7ff' : 'white'
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <MedicineBoxOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                    <div>
                      <Text strong>{category.name}</Text>
                    </div>
                    <div>
                      <Text type="secondary">{category.questions.length} questions</Text>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Button 
            type="primary" 
            size="large"
            disabled={selectedCategories.length === 0}
            onClick={() => setCurrentCategoryIndex(0)}
          >
            Start Assessment ({selectedCategories.length} categories selected)
          </Button>
        </div>
      </Card>
    );
  }

  const currentCategory = categories.find(cat => cat.id === selectedCategories[currentCategoryIndex]);
  const currentQuestion = currentCategory.questions[currentQuestionIndex];
  const totalQuestions = selectedCategories.reduce((total, catId) => {
    const cat = categories.find(c => c.id === catId);
    return total + cat.questions.length;
  }, 0);
  const completedQuestions = Object.keys(responses).length;
  const currentQuestionNumber = selectedCategories.slice(0, currentCategoryIndex)
    .reduce((total, catId) => {
      const cat = categories.find(c => c.id === catId);
      return total + cat.questions.length;
    }, 0) + currentQuestionIndex + 1;

  return (
    <Card 
      title="Symptom Checker" 
      className="dashboard-section-card"
      loading={loading}
      extra={
        <Button 
          size="small" 
          onClick={() => {
            setSelectedCategories([]);
            setCurrentCategoryIndex(0);
            setCurrentQuestionIndex(0);
            setResponses({});
          }}
        >
          Change Categories
        </Button>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Progress 
          percent={Math.round((completedQuestions / totalQuestions) * 100)} 
          showInfo={true} 
        />
        <Text type="secondary">
          Question {currentQuestionNumber} of {totalQuestions} • {currentCategory.name}
        </Text>
      </div>

      <Card size="small" style={{ marginBottom: 24 }}>
        <Title level={4}>{currentQuestion.text}</Title>
      </Card>

      <div style={{ marginBottom: 24 }}>
        {renderQuestionInput(currentQuestion)}
      </div>

      <Row gutter={16}>
        <Col span={12}>
          <Button 
            onClick={prevStep} 
            disabled={currentCategoryIndex === 0 && currentQuestionIndex === 0}
            block
          >
            Previous
          </Button>
        </Col>
        <Col span={12}>
          <Button 
            type="primary" 
            onClick={nextStep}
            disabled={responses[currentQuestion.id] === undefined && currentQuestion.type !== 'scale'}
            block
          >
            {currentQuestionIndex === currentCategory.questions.length - 1 && 
             currentCategoryIndex === selectedCategories.length - 1 ? 
             'Finish Assessment' : 'Next'}
          </Button>
        </Col>
      </Row>
    </Card>
  );
};

export default DynamicSymptomChecker;