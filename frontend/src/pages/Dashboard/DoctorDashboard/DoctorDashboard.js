import React, { useState, useEffect } from 'react';
import {
  Layout, Menu, Typography, Card, Row, Col, Table, Statistic,
  Badge, Tabs, Avatar, List, Tag, Divider, Collapse, Spin, Button, message,
  Modal, Form, Input, Select, DatePicker, Space, Progress, Tooltip, Alert,
  Descriptions
} from 'antd';
import {
  UserOutlined, TeamOutlined, MedicineBoxOutlined, DashboardOutlined,
  ClockCircleOutlined, CalendarOutlined, BellOutlined, FileTextOutlined,
  SafetyCertificateOutlined, PhoneOutlined, HomeOutlined, ExclamationCircleOutlined,
  PlusOutlined, SyncOutlined, EyeOutlined, ArrowUpOutlined, ArrowDownOutlined,
  CheckCircleOutlined, LineChartOutlined, BarChartOutlined, RobotOutlined,
  FileSearchOutlined, CheckCircleFilled, CloseCircleFilled
} from '@ant-design/icons';
import Header from '../../../components/Header';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import './DoctorDashboard.css';
import moment from 'moment';
import VideoCall from '../../../components/video_call_components/VideoCall';
import VoiceIVR from '../../../components/VoiceIVR';

const { Header: AntHeader, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Option } = Select;
const { TextArea } = Input;

const DoctorDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [patientQueue, setPatientQueue] = useState([]);
  const [selectedQueuePatient, setSelectedQueuePatient] = useState(null);
  const [triageModalVisible, setTriageModalVisible] = useState(false);
  const [medicationStock, setMedicationStock] = useState({});
  const [doctorAvailability, setDoctorAvailability] = useState([]);
  const [ivrModalVisible, setIvrModalVisible] = useState(false);
  const [ivrVisible, setIvrVisible] = useState(false);
  const [stats, setStats] = useState({
    totalPatients: 0,
    criticalPatients: 0,
    pendingActions: 0,
    todayAppointments: 0,
    pendingAssessments: 0
  });
  const [appointments, setAppointments] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [symptomAssessments, setSymptomAssessments] = useState([]);
  const navigate = useNavigate();
  const [videoCallVisible, setVideoCallVisible] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState(null);
  const [patientDetailsVisible, setPatientDetailsVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [prescriptionFormVisible, setPrescriptionFormVisible] = useState(false);
  const [prescriptionForm] = Form.useForm();
  const [patientMedications, setPatientMedications] = useState([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [assessmentDetailsVisible, setAssessmentDetailsVisible] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [reviewForm] = Form.useForm();
  const [reviewLoading, setReviewLoading] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [loadingMedicines, setLoadingMedicines] = useState(false);

  useEffect(() => {
    if (activeTab === 'profile') {
      fetchProfileData();
    } else if (activeTab === 'dashboard') {
      fetchDashboardData();
    } else if (activeTab === 'patients') {
      fetchPatientsData();
    } else if (activeTab === 'appointments') {
      fetchAppointments();
    } else if (activeTab === 'alerts') {
      fetchAlerts();
    } else if (activeTab === 'symptom-assessments') {
      fetchSymptomAssessments();
    } else if (activeTab === 'patient-queue') {
      fetchPatientQueue();
      fetchMedicationStock();
      fetchDoctorAvailability();
    }
  }, [activeTab]);

  const fetchPatientQueue = async () => {
    try {
      const response = await api.get('/doctor/patient-queue');
      setPatientQueue(response.data);
    } catch (error) {
      console.error('Error fetching patient queue:', error);
      message.error('Failed to load patient queue');
    }
  };

  const fetchMedicationStock = async () => {
    try {
      const response = await api.get('/pharmacy/stock');
      setMedicationStock(response.data);
    } catch (error) {
      console.error('Error fetching medication stock:', error);
    }
  };

  const fetchDoctorAvailability = async () => {
    try {
      const response = await api.get('/doctor/availability');
      setDoctorAvailability(response.data);
    } catch (error) {
      console.error('Error fetching doctor availability:', error);
    }
  };

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/doctor/profile');
      setProfileData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile data:', error);
      message.error('Failed to fetch profile data');
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await fetchPatientsData();
      await fetchRecentAppointments();
      await fetchUnreadAlerts();
      await fetchSymptomAssessments();
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      message.error('Failed to load dashboard data');
      setLoading(false);
    }
  };

  const fetchPatientsData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/doctor/patients');

      if (response.data && response.data.patients) {
        const processedPatients = response.data.patients.map(patient => ({
          ...patient,
          key: patient.id,
          lastChecked: patient.lastChecked || 'Not available',
          status: getStatusFromRiskScore(patient.riskScore)
        }));

        setPatients(processedPatients);

        // Calculate statistics
        const criticalPatients = processedPatients.filter(
          p => p.status === 'Critical'
        ).length;

        const pendingActions = processedPatients.reduce(
          (total, patient) => total + (patient.pendingActions || 0), 0
        );

        const todayAppointments = appointments.filter(app =>
          moment(app.dateTime).isSame(moment(), 'day') && app.status === 'Scheduled'
        ).length;

        setStats({
          totalPatients: processedPatients.length,
          criticalPatients,
          pendingActions,
          todayAppointments
        });
      } else {
        setPatients([]);
        setStats({
          totalPatients: 0,
          criticalPatients: 0,
          pendingActions: 0,
          todayAppointments: 0
        });
      }
    } catch (error) {
      console.error('Error fetching patients data:', error);
      message.error('Failed to fetch patients data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSymptomAssessments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/doctor/symptom-assessments');
      setSymptomAssessments(response.data);

      // Update stats with pending assessments count
      const pendingAssessments = response.data.filter(
        assessment => assessment.reviewStatus === 'Pending'
      ).length;

      setStats(prev => ({ ...prev, pendingAssessments }));
    } catch (error) {
      console.error('Error fetching symptom assessments:', error);
      message.error('Failed to fetch symptom assessments');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssessmentDetails = async (assessmentId) => {
    try {
      setReviewLoading(true);
      const response = await api.get(`/doctor/symptom-assessments/${assessmentId}`);
      setSelectedAssessment(response.data);
    } catch (error) {
      console.error('Error fetching assessment details:', error);
      message.error('Failed to fetch assessment details');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleReviewSubmit = async (values) => {
    try {
      setReviewLoading(true);
      console.log('Updating assessment:', selectedAssessment.id, 'with status:', values.status);
      
      const response = await api.put(`/doctor/symptom-assessments/${selectedAssessment.id}/review`, {
        status: values.status,
        notes: values.notes
      });

      console.log('Update response:', response.data);
      
      message.success('Assessment review status updated');
      setAssessmentDetailsVisible(false);
      fetchSymptomAssessments(); // Refresh the list
    } catch (error) {
      console.error('Error updating assessment:', error);
      console.error('Error response:', error.response);
      message.error('Failed to update assessment');
    } finally {
      setReviewLoading(false);
    }
  };

  const fetchPatientMedications = async (patientId) => {
    try {
      const response = await api.get(`/doctor/patient/${patientId}/medications`);
      setPatientMedications(response.data);
    } catch (error) {
      console.error('Error fetching patient medications:', error);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/doctor/appointments');
      setAppointments(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      message.error('Failed to fetch appointments');
      setLoading(false);
    }
  };

  const fetchRecentAppointments = async () => {
    try {
      const response = await api.get('/doctor/appointments?limit=5');
      setAppointments(response.data);
    } catch (error) {
      console.error('Error fetching recent appointments:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/doctor/alerts');
      setAlerts(response.data);
      setUnreadAlerts(response.data.filter(alert => !alert.isRead).length);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      message.error('Failed to fetch alerts');
      setLoading(false);
    }
  };

  const fetchUnreadAlerts = async () => {
    try {
      const response = await api.get('/doctor/alerts?unread=true&limit=5');
      setAlerts(response.data);
      setUnreadAlerts(response.data.filter(alert => !alert.isRead).length);
    } catch (error) {
      console.error('Error fetching unread alerts:', error);
    }
  };

  const markAlertAsRead = async (alertId) => {
    try {
      await api.post(`/doctor/alerts/${alertId}/read`);
      setAlerts(alerts.filter(alert => alert.alertId !== alertId));
      setUnreadAlerts(unreadAlerts - 1);
      message.success('Alert marked as read');
    } catch (error) {
      console.error('Error marking alert as read:', error);
      message.error('Failed to mark alert as read');
    }
  };

  const getStatusFromRiskScore = (score) => {
    if (!score) return 'Normal';
    if (score > 70) return 'Critical';
    if (score > 40) return 'Warning';
    return 'Normal';
  };

  const showPatientDetails = async (patient) => {
    setSelectedPatient(patient);
    setPatientDetailsVisible(true);
    await fetchPatientMedications(patient.id);
  };

  const handleAddPrescription = () => {
    setPatientDetailsVisible(false);
    setPrescriptionFormVisible(true);
  };

  const fetchAvailableMedicines = async () => {
    try {
      setLoadingMedicines(true);
      const response = await api.get('/medicines/available');
      setMedicines(response.data);
    } catch (error) {
      console.error('Error fetching medicines:', error);
      message.error('Failed to load available medicines');
    } finally {
      setLoadingMedicines(false);
    }
  };

  const handlePrescriptionSubmit = async (values) => {
    try {
      // Format the data for API submission
      const prescriptionData = {
        patientId: selectedPatient.id,
        medication: values.medication || values.customMedication,
        dosage: values.dosage,
        frequency: values.frequency,
        duration: values.duration,
        instructions: values.instructions,
        startDate: values.startDate.format('YYYY-MM-DD'),
        endDate: values.endDate.format('YYYY-MM-DD')
      };

      const response = await api.post('/doctor/prescriptions', prescriptionData);
      message.success(response.data.message || 'Prescription added successfully');
      setPrescriptionFormVisible(false);
      prescriptionForm.resetFields();

      // Refresh patient data to show the new prescription
      if (activeTab === 'patients') {
        fetchPatientsData();
      }
    } catch (error) {
      console.error('Error adding prescription:', error);
      message.error(error.response?.data?.message || 'Failed to add prescription');
    }
  };

  const patientColumns = [
    {
      title: 'Patient',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <div style={{ fontSize: 12 }}>
            {record.gender}, {record.dob ? moment(record.dob).format('MMM D, YYYY') : 'No DOB'}
          </div>
        </div>
      ),
    },
    {
      title: 'Contact',
      dataIndex: 'contact',
      key: 'contact',
      render: (_, record) => (
        <div>
          <div>{record.email}</div>
          <div>{record.phone || 'No phone'}</div>
        </div>
      ),
    },
    {
      title: 'Risk Score',
      dataIndex: 'riskScore',
      key: 'riskScore',
      render: (score) => (
        <Tag color={
          !score ? 'default' :
            score > 70 ? 'error' :
              score > 40 ? 'warning' : 'success'
        }>
          {score || 'N/A'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge
          status={
            status === 'Critical' ? 'error' :
              status === 'Warning' ? 'warning' : 'success'
          }
          text={status}
        />
      ),
    },
    {
      title: 'Actions Needed',
      dataIndex: 'pendingActions',
      key: 'pendingActions',
      render: (count) => (
        <Tag color={count > 0 ? 'gold' : 'default'}>
          {count} pending
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => showPatientDetails(record)}
        >
          View Details
        </Button>
      ),
    },
  ];

  const appointmentColumns = [
    {
      title: 'Patient',
      dataIndex: 'patientName',
      key: 'patientName',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Date & Time',
      dataIndex: 'dateTime',
      key: 'dateTime',
      render: (text) => (
        <div>
          <div>{text ? new Date(text).toLocaleDateString() : '--'}</div>
          <Text type="secondary">{text ? new Date(text).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</Text>
        </div>
      ),
      sorter: (a, b) => new Date(a.dateTime) - new Date(b.dateTime)
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag
          color={
            status === 'Completed' ? 'green' :
              status === 'Cancelled' ? 'red' : 'blue'
          }
        >
          {status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.status === 'Scheduled' && (
            <Button
              type="primary"
              onClick={() => {
                setCurrentAppointment(record);
                setVideoCallVisible(true);
              }}
            >
              Start
            </Button>
          )}
          <Button onClick={() => handleAppointmentAction(record, 'details')}>
            Details
            </Button>
        </Space>
      ),
    }
  ];

  const alertColumns = [
    {
      title: 'Patient',
      dataIndex: 'patientName',
      key: 'patientName',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      render: (text, record) => (
        <div>
          <ExclamationCircleOutlined
            style={{
              color: record.severity === 'High' ? '#ff4d4f' :
                record.severity === 'Medium' ? '#faad14' : '#52c41a',
              marginRight: 8
            }}
          />
          {text}
        </div>
      ),
    },
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (date) => moment(date).fromNow(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button type="link" onClick={() => markAlertAsRead(record.alertId)}>
          Mark as Read
        </Button>
      ),
    },
  ];

  const symptomAssessmentColumns = [
    {
      title: 'Patient',
      dataIndex: 'patientName',
      key: 'patientName',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Symptoms',
      dataIndex: 'symptoms',
      key: 'symptoms',
      render: (symptoms, record) => {
        try {
          // Try to parse if it's JSON
          const parsedSymptoms = typeof symptoms === 'string' ? JSON.parse(symptoms) : symptoms;
          const symptomText = Array.isArray(parsedSymptoms) 
            ? parsedSymptoms.map(s => typeof s === 'object' ? s.response || s.text : s).join(', ')
            : 'No symptoms data';
          
          return (
            <Text ellipsis={{ tooltip: symptomText }} style={{ maxWidth: 200 }}>
              {symptomText.substring(0, 50) + (symptomText.length > 50 ? '...' : '')}
            </Text>
          );
        } catch (e) {
          return (
            <Text ellipsis={{ tooltip: symptoms }} style={{ maxWidth: 200 }}>
              {symptoms && typeof symptoms === 'string' ? symptoms.substring(0, 50) + (symptoms.length > 50 ? '...' : '') : 'No symptoms data'}
            </Text>
          );
        }
      },
    },
    {
      title: 'Triage Level',
      dataIndex: 'triageLevel',
      key: 'triageLevel',
      render: (level) => (
        <Tag color={
          level === 'Emergency' ? 'error' :
            level === 'Urgent' ? 'warning' :
              level === 'Routine' ? 'processing' : 'success'
        }>
          {level}
        </Tag>
      ),
    },
    {
      title: 'Confidence',
      dataIndex: 'confidenceScore',
      key: 'confidenceScore',
      render: (score) => {
        // Ensure score is a number and convert from decimal to percentage
        const numericScore = typeof score === 'number' ? score : 
                            typeof score === 'string' ? parseFloat(score) : 0;
        const percentage = Math.round(numericScore * 100);
        
        return (
          <Progress
            type="circle"
            percent={percentage}
            width={50}
            format={percent => `${percent}%`}
            status={percentage > 80 ? 'success' : percentage > 60 ? 'normal' : 'exception'}
          />
        );
      }
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => moment(date).format('MMM D, YYYY'),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    },
    {
      title: 'Status',
      dataIndex: 'reviewStatus',
      key: 'reviewStatus',
      render: (status, record) => (
        <Tag color={
          status === 'Approved' ? 'green' : 
          status === 'Pending' ? 'orange' : 
          status === 'Modified' ? 'blue' : 'red'
        }>
          {status}
        </Tag>
      ),
      filters: [
        { text: 'Pending', value: 'Pending' },
        { text: 'Approved', value: 'Approved' },
        { text: 'Modified', value: 'Modified' },
        { text: 'Rejected', value: 'Rejected' },
      ],
      onFilter: (value, record) => record.reviewStatus === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => {
            fetchAssessmentDetails(record.id);
            setAssessmentDetailsVisible(true);
          }}
        >
          Review
        </Button>
      ),
    },
  ];

  const handleAppointmentAction = async (appointment, action) => {
    try {
      if (action === 'start') {
        message.info(`Starting appointment with ${appointment.patientName}`);
        // You would typically navigate to a telemedicine session here
        // For now, we'll mark it as completed
        await api.put(`/appointments/${appointment.appointmentId}/status`, {
          status: 'Completed'
        });
        message.success('Appointment marked as completed');
        fetchAppointments();
      } else if (action === 'cancel') {
        await api.put(`/appointments/${appointment.appointmentId}/status`, {
          status: 'Cancelled'
        });
        message.success('Appointment cancelled');
        fetchAppointments();
      } else if (action === 'details') {
        Modal.info({
          title: 'Appointment Details',
          content: (
            <div>
              <p><strong>Patient:</strong> {appointment.patientName}</p>
              <p><strong>Time:</strong> {moment(appointment.dateTime).format('MMMM Do YYYY, h:mm a')}</p>
              <p><strong>Type:</strong> {appointment.type}</p>
              <p><strong>Status:</strong> {appointment.status}</p>
              {appointment.notes && <p><strong>Notes:</strong> {appointment.notes}</p>}
            </div>
          )
        });
      }
    } catch (error) {
      console.error('Error handling appointment action:', error);
      message.error('Failed to perform action');
    }
  };

  const PrescriptionFormModal = ({ visible, onCancel, onSubmit, loading, patient }) => {
    const [form] = Form.useForm();
    const [medicines, setMedicines] = useState([]);
    const [loadingMedicines, setLoadingMedicines] = useState(false);

    useEffect(() => {
      if (visible) {
        fetchAvailableMedicines();
      }
    }, [visible]);

    const fetchAvailableMedicines = async () => {
      try {
        setLoadingMedicines(true);
        const response = await api.get('/medicines/available');
        setMedicines(response.data);
      } catch (error) {
        console.error('Error fetching medicines:', error);
        message.error('Failed to load available medicines');
      } finally {
        setLoadingMedicines(false);
      }
    };

    const handleSubmit = async (values) => {
      try {
        await onSubmit({
          ...values,
          medication: values.medication || values.customMedication
        });
        form.resetFields();
      } catch (error) {
        console.error('Error submitting prescription:', error);
      }
    };

    return (
      <Modal
        title={`Add Prescription for ${patient?.name || 'Patient'}`}
        visible={visible}
        onCancel={onCancel}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="medication"
            label="Select Medicine"
            rules={[{ required: true, message: 'Please select or enter a medicine' }]}
          >
            <Select
              placeholder="Select from available medicines"
              loading={loadingMedicines}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
              notFoundContent={loadingMedicines ? <Spin size="small" /> : null}
            >
              {medicines.map(medicine => (
                <Option key={medicine.MedicineID} value={medicine.Name}>
                  {medicine.Name} - {medicine.Category} ({medicine.Manufacturer})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="customMedication"
            label="Or Enter Custom Medicine"
          >
            <Input placeholder="Enter medicine name if not in list" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dosage"
                label="Dosage"
                rules={[{ required: true, message: 'Please enter dosage' }]}
              >
                <Input placeholder="e.g., 5mg" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="frequency"
                label="Frequency"
                rules={[{ required: true, message: 'Please select frequency' }]}
              >
                <Select placeholder="Select frequency">
                  <Option value="once daily">Once Daily</Option>
                  <Option value="twice daily">Twice Daily</Option>
                  <Option value="three times daily">Three Times Daily</Option>
                  <Option value="four times daily">Four Times Daily</Option>
                  <Option value="as needed">As Needed</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="duration"
            label="Duration"
            rules={[{ required: true, message: 'Please enter duration' }]}
          >
            <Input placeholder="e.g., 7 days" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startDate"
                label="Start Date"
                rules={[{ required: true, message: 'Please select start date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endDate"
                label="End Date"
                rules={[{ required: true, message: 'Please select end date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="instructions"
            label="Additional Instructions"
          >
            <TextArea rows={3} placeholder="Enter any additional instructions for the patient" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: '8px' }}>
              Submit Prescription
            </Button>
            <Button onClick={onCancel}>
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    );
  };

  const renderDashboard = () => (
    <>
      {alerts.some(alert => alert.severity === 'High' && !alert.isRead) && (
        <Alert
          message="Critical Alert"
          description="You have high priority alerts that require immediate attention."
          type="error"
          showIcon
          closable
          style={{ marginBottom: '24px' }}
          action={
            <Button
              type="primary"
              size="small"
              onClick={() => setActiveTab('alerts')}
            >
              View Alerts
            </Button>
          }
        />
      )}

      <Row gutter={[16, 16]} className="dashboard-stats">
        <Col xs={24} sm={12} md={6}>
          <Card className="dashboard-card" hoverable>
            <Statistic
              title="Total Patients"
              value={stats.totalPatients}
              prefix={<TeamOutlined />}
            />
            <Text type="secondary">{patients.length} under your care</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="dashboard-card" hoverable>
            <Statistic
              title="Critical Patients"
              value={stats.criticalPatients}
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
            />
            <Text type="secondary">Require immediate attention</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="dashboard-card" hoverable>
            <Statistic
              title="Pending Assessments"
              value={stats.pendingAssessments}
              prefix={<FileSearchOutlined style={{ color: '#faad14' }} />}
            />
            <Text type="secondary">Symptom reviews needed</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="dashboard-card" hoverable>
            <Statistic
              title="Today's Appointments"
              value={stats.todayAppointments}
              prefix={<CalendarOutlined style={{ color: '#52c41a' }} />}
            />
            <Text type="secondary">Scheduled for today</Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="dashboard-sections">
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <BellOutlined />
                <span>Recent Alerts</span>
                <Badge count={unreadAlerts} style={{ backgroundColor: '#52c41a' }} />
              </Space>
            }
            className="dashboard-section-card"
            hoverable
            extra={<Button type="link" onClick={() => setActiveTab('alerts')}>View All</Button>}
          >
            {alerts.length > 0 ? (
              <Table
                columns={alertColumns}
                dataSource={alerts.slice(0, 5)}
                size="middle"
                pagination={false}
                loading={loading}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                <BellOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />
                <div>No alerts at this time</div>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <CalendarOutlined />
                <span>Upcoming Appointments</span>
              </Space>
            }
            className="dashboard-section-card"
            hoverable
            extra={<Button type="link" onClick={() => setActiveTab('appointments')}>View All</Button>}
          >
            {appointments.length > 0 ? (
              <Table
                columns={appointmentColumns}
                dataSource={appointments.slice(0, 5)}
                size="middle"
                pagination={false}
                loading={loading}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                <CalendarOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />
                <div>No upcoming appointments</div>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24}>
          <Card
            title={
              <Space>
                <TeamOutlined />
                <span>Patient List</span>
              </Space>
            }
            className="dashboard-section-card"
            hoverable
            extra={<Button type="link" onClick={() => setActiveTab('patients')}>View All</Button>}
          >
            {patients.length > 0 ? (
              <Table
                columns={patientColumns}
                dataSource={patients}
                size="middle"
                pagination={{ pageSize: 5 }}
                loading={loading}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                <TeamOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />
                <div>No patients assigned</div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </>
  );

  const renderPatients = () => (
    <Card
      title={
        <Space>
          <TeamOutlined />
          <span>Your Patients</span>
        </Space>
      }
      className="dashboard-section-card"
      hoverable
      extra={
        <Button
          icon={<SyncOutlined />}
          onClick={fetchPatientsData}
          loading={loading}
        >
          Refresh
        </Button>
      }
    >
      <Table
        columns={patientColumns}
        dataSource={patients}
        size="middle"
        pagination={{ pageSize: 10 }}
        loading={loading}
      />
    </Card>
  );

  const renderAppointments = () => (
    <Card
      title={
        <Space>
          <CalendarOutlined />
          <span>Appointments</span>
        </Space>
      }
      className="dashboard-section-card"
      hoverable
      extra={
        <Button
          icon={<SyncOutlined />}
          onClick={fetchAppointments}
          loading={loading}
        >
          Refresh
        </Button>
      }
    >
      <Tabs defaultActiveKey="upcoming">
        <TabPane tab="Upcoming" key="upcoming">
          <Table
            columns={appointmentColumns}
            dataSource={appointments.filter(a => a.status === 'Scheduled')}
            size="middle"
            pagination={{ pageSize: 10 }}
            loading={loading}
          />
        </TabPane>
        <TabPane tab="Completed" key="completed">
          <Table
            columns={appointmentColumns}
            dataSource={appointments.filter(a => a.status === 'Completed')}
            size="middle"
            pagination={{ pageSize: 10 }}
            loading={loading}
          />
        </TabPane>
        <TabPane tab="Cancelled" key="cancelled">
          <Table
            columns={appointmentColumns}
            dataSource={appointments.filter(a => a.status === 'Cancelled')}
            size="middle"
            pagination={{ pageSize: 10 }}
            loading={loading}
          />
        </TabPane>
        <TabPane tab="All" key="all">
          <Table
            columns={appointmentColumns}
            dataSource={appointments}
            size="middle"
            pagination={{ pageSize: 10 }}
            loading={loading}
          />
        </TabPane>
      </Tabs>
    </Card>
  );

  const renderAlerts = () => (
    <Card
      title={
        <Space>
          <BellOutlined />
          <span>Patient Alerts</span>
          <Badge count={unreadAlerts} style={{ backgroundColor: '#52c41a' }} />
        </Space>
      }
      className="dashboard-section-card"
      hoverable
    >
      <Tabs defaultActiveKey="unread">
        <TabPane tab="Unread" key="unread">
          <Table
            columns={alertColumns}
            dataSource={alerts.filter(a => !a.isRead)}
            size="middle"
            pagination={{ pageSize: 10 }}
            loading={loading}
          />
        </TabPane>
        <TabPane tab="All Alerts" key="all">
          <Table
            columns={alertColumns}
            dataSource={alerts}
            size="middle"
            pagination={{ pageSize: 10 }}
            loading={loading}
          />
        </TabPane>
      </Tabs>
    </Card>
  );

  const renderProfile = () => (
    <Card
      title={
        <Space>
          <UserOutlined />
          <span>Your Profile</span>
        </Space>
      }
      className="dashboard-section-card"
      hoverable
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <Spin />
        </div>
      ) : profileData ? (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card className="dashboard-card">
              <div style={{ textAlign: 'center' }}>
                <Avatar size={100} icon={<UserOutlined />} />
                <Title level={4} style={{ marginTop: '16px' }}>
                  {profileData.firstName} {profileData.lastName}
                </Title>
                <Tag color="blue" style={{ marginBottom: '16px' }}>
                  Doctor
                </Tag>
              </div>

              <List size="small">
                <List.Item>
                  <List.Item.Meta
                    title="Email"
                    description={profileData.email}
                  />
                </List.Item>
                <List.Item>
                  <List.Item.Meta
                    title="Phone"
                    description={profileData.phoneNumber || 'Not provided'}
                  />
                </List.Item>
              </List>
            </Card>
          </Col>
          <Col xs={24} md={16}>
            <Card title="Professional Information" className="dashboard-card">
              <Collapse defaultActiveKey={['1']}>
                <Panel header="Basic Information" key="1">
                  <Row gutter={16}>
                    <Col span={12}>
                      <List.Item>
                        <List.Item.Meta
                          avatar={<SafetyCertificateOutlined />}
                          title="Specialization"
                          description={profileData.specialization || 'Not specified'}
                        />
                      </List.Item>
                    </Col>
                    <Col span={12}>
                      <List.Item>
                        <List.Item.Meta
                          avatar={<FileTextOutlined />}
                          title="License Number"
                          description={profileData.licenseNumber || 'Not provided'}
                        />
                      </List.Item>
                    </Col>
                  </Row>
                </Panel>
                <Panel header="Contact Information" key="2">
                  <Row gutter={16}>
                    <Col span={12}>
                      <List.Item>
                        <List.Item.Meta
                          avatar={<PhoneOutlined />}
                          title="Phone Number"
                          description={profileData.phoneNumber || 'Not provided'}
                        />
                      </List.Item>
                    </Col>
                    <Col span={12}>
                      <List.Item>
                        <List.Item.Meta
                          avatar={<HomeOutlined />}
                          title="Hospital Affiliation"
                          description={profileData.hospitalAffiliation || 'Not specified'}
                        />
                      </List.Item>
                    </Col>
                  </Row>
                </Panel>
              </Collapse>
            </Card>
          </Col>
        </Row>
      ) : (
        <Text type="secondary">No profile data available</Text>
      )}
    </Card>
  );

  const renderSymptomAssessments = () => (
    <Card
      title={
        <Space>
          <FileSearchOutlined />
          <span>Patient Symptom Assessments</span>
          <Badge count={stats.pendingAssessments} style={{ backgroundColor: '#faad14' }} />
        </Space>
      }
      className="dashboard-section-card"
      hoverable
      extra={
        <Button
          icon={<SyncOutlined />}
          onClick={fetchSymptomAssessments}
          loading={loading}
        >
          Refresh
        </Button>
      }
    >
      <Table
        columns={symptomAssessmentColumns}
        dataSource={symptomAssessments}
        size="middle"
        pagination={{ pageSize: 10 }}
        loading={loading}
        rowKey="id"
      />
    </Card>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'patients':
        return renderPatients();
      case 'appointments':
        return renderAppointments();
      case 'symptom-assessments':
        return renderSymptomAssessments();
      case 'alerts':
        return renderAlerts();
      case 'profile':
        return renderProfile();
      default:
        return renderDashboard();
    }
  };

  return (
    <Layout className="doctor-dashboard-layout">
      <Header />
      <Layout>
        <Sider width={200} className="dashboard-sider">
          <Menu
              mode="inline"
              defaultSelectedKeys={['dashboard']}
              selectedKeys={[activeTab]}
              style={{ height: '100%', borderRight: 0 }}
              onSelect={({ key }) => {
                if (key === 'voice-ivr') {
                  setIvrModalVisible(true); // Open IVR modal instead of changing tab
                } else {
                  setActiveTab(key); // Normal tab change
                }
              }}
            >
            <Menu.Item key="dashboard" icon={<DashboardOutlined />}>
              Dashboard
            </Menu.Item>
            <Menu.Item key="patients" icon={<TeamOutlined />}>
              Patients
            </Menu.Item>
            <Menu.Item key="appointments" icon={<CalendarOutlined />}>
              Appointments
            </Menu.Item>
            <Menu.Item key="symptom-assessments" icon={<FileSearchOutlined />}>
              Symptom Assessments
              {stats.pendingAssessments > 0 && (
                <Badge count={stats.pendingAssessments} style={{ backgroundColor: '#faad14', marginLeft: 8 }} />
              )}
            </Menu.Item>
            <Menu.Item key="alerts" icon={<BellOutlined />}>
              Alerts <Badge count={unreadAlerts} style={{ backgroundColor: '#52c41a' }} />
            </Menu.Item>
            <Menu.Item key="profile" icon={<UserOutlined />}>
              Profile
            </Menu.Item>
            <Menu.Item key="voice-ivr" icon={<PhoneOutlined />}>
              Voice IVR System
            </Menu.Item>
          </Menu>
        </Sider>
        <Layout style={{ padding: '0 24px 24px', marginLeft: 200, marginTop: 64 }}>
          <Content
            className="dashboard-content"
            style={{
              padding: 24,
              margin: 0,
              minHeight: 280,
              background: '#f0f2f5',
            }}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="large" />
                <div>Loading your dashboard data...</div>
              </div>
            ) : (
              <>
                <Title level={3} style={{ marginBottom: '24px' }}>
                  {activeTab === 'dashboard' ? 'Doctor Dashboard' :
                    activeTab === 'patients' ? 'Patient Management' :
                      activeTab === 'appointments' ? 'Appointments' :
                        activeTab === 'alerts' ? 'Patient Alerts' :
                          activeTab === 'profile' ? 'Your Profile' : ''}
                </Title>
                {renderContent()}
              </>
            )}
          </Content>
        </Layout>
      </Layout>

      <VideoCall
        visible={videoCallVisible}
        onClose={() => setVideoCallVisible(false)}
        appointment={currentAppointment}
        userRole="doctor"
      />

      <Modal
        title="Symptom Assessment Review"
        visible={assessmentDetailsVisible}
        onCancel={() => setAssessmentDetailsVisible(false)}
        footer={null}
        width={800}
      >
        {reviewLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div>Loading assessment details...</div>
          </div>
        ) : selectedAssessment ? (
          <div>
            <Descriptions title="Assessment Information" bordered column={1}>
              <Descriptions.Item label="Patient">
                {selectedAssessment.patientName}
                {selectedAssessment.patientEmail && (
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {selectedAssessment.patientEmail}
                    {selectedAssessment.patientPhone && ` • ${selectedAssessment.patientPhone}`}
                  </div>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Triage Level">
                <Tag color={
                  selectedAssessment.triageLevel === 'Emergency' ? 'error' : 
                  selectedAssessment.triageLevel === 'Urgent' ? 'warning' : 
                  selectedAssessment.triageLevel === 'Routine' ? 'processing' : 'success'
                }>
                  {selectedAssessment.triageLevel}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Confidence Score">
                <Progress 
                  percent={Math.round((selectedAssessment.confidenceScore || 0) * 100)} 
                  status="active" 
                  format={percent => `${percent}%`}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Reported Symptoms">
                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                  {selectedAssessment.symptoms && (
                    (() => {
                      try {
                        const parsedSymptoms = typeof selectedAssessment.symptoms === 'string' 
                          ? JSON.parse(selectedAssessment.symptoms) 
                          : selectedAssessment.symptoms;
                        
                        if (Array.isArray(parsedSymptoms)) {
                          return (
                            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                              {parsedSymptoms.map((symptom, index) => (
                                <li key={index}>
                                  {typeof symptom === 'object' 
                                    ? `${symptom.id || 'Symptom'}: ${symptom.response || JSON.stringify(symptom)}`
                                    : symptom
                                  }
                                </li>
                              ))}
                            </ul>
                          );
                        } else {
                          return selectedAssessment.symptoms;
                        }
                      } catch (e) {
                        return selectedAssessment.symptoms;
                      }
                    })()
                  )}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Recommended Action">
                {selectedAssessment.recommendedAction}
              </Descriptions.Item>
              <Descriptions.Item label="Assessment Date">
                {moment(selectedAssessment.createdAt).format('MMMM Do YYYY, h:mm a')}
              </Descriptions.Item>
              <Descriptions.Item label="Current Status">
                <Tag color={
                  selectedAssessment.reviewStatus === 'Reviewed' ? 'green' : 
                  selectedAssessment.reviewStatus === 'Pending' ? 'orange' : 
                  selectedAssessment.reviewStatus === 'Modified' ? 'blue' : 'red'
                }>
                  {selectedAssessment.reviewStatus}
                </Tag>
              </Descriptions.Item>
              {selectedAssessment.reviewedByDoctor && (
                <Descriptions.Item label="Reviewed By">
                  {selectedAssessment.reviewedByDoctor}
                </Descriptions.Item>
              )}
            </Descriptions>
            
            <Divider />
            
            <Form
              form={reviewForm}
              layout="vertical"
              onFinish={handleReviewSubmit}
              initialValues={{ status: selectedAssessment.reviewStatus === 'Reviewed' ? 'Approved' : selectedAssessment.reviewStatus }}
            >
              <Form.Item
                name="status"
                label="Review Status"
                rules={[{ required: true, message: 'Please select a status' }]}
              >
                <Select placeholder="Select review status">
                <Option value="Approved">Approved</Option>
                <Option value="Modified">Modified</Option>
                <Option value="Rejected">Rejected</Option>
              </Select>
              </Form.Item>
              
              <Form.Item
                name="notes"
                label="Review Notes"
              >
                <TextArea rows={3} placeholder="Add any notes about this assessment..." />
              </Form.Item>
              
              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={reviewLoading}
                  style={{ marginRight: '8px' }}
                >
                  Update Review
                </Button>
                <Button onClick={() => setAssessmentDetailsVisible(false)}>
                  Cancel
                </Button>
              </Form.Item>
            </Form>
          </div>
        ) : (
          <Alert message="No assessment data available" type="warning" />
        )}
      </Modal>

      <VoiceIVR
        userType="doctor"
        userData={profileData}
        visible={ivrModalVisible}
        onClose={() => setIvrModalVisible(false)}
        onCallInitiated={(type) => {
          if (type === 'emergency') {
            message.info('Initiating emergency protocol...');
          }
        }}
      />

      {/* Patient Details Modal */}
      <Modal
        title="Patient Details"
        visible={patientDetailsVisible}
        onCancel={() => setPatientDetailsVisible(false)}
        footer={[
          <Button key="back" onClick={() => setPatientDetailsVisible(false)}>
            Close
          </Button>,
          <Button
            key="prescription"
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddPrescription}
          >
            Add Prescription
          </Button>
        ]}
        width={800}
      >
        {selectedPatient && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <Card title="Personal Information" size="small" className="dashboard-card">
                  <p><strong>Name:</strong> {selectedPatient.name}</p>
                  <p><strong>Gender:</strong> {selectedPatient.gender}</p>
                  <p><strong>Date of Birth:</strong> {selectedPatient.dob ? moment(selectedPatient.dob).format('MMMM Do, YYYY') : 'N/A'}</p>
                  <p><strong>Age:</strong> {selectedPatient.dob ? moment().diff(moment(selectedPatient.dob), 'years') : 'N/A'}</p>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="Contact Information" size="small" className="dashboard-card">
                  <p><strong>Email:</strong> {selectedPatient.email}</p>
                  <p><strong>Phone:</strong> {selectedPatient.phone || 'N/A'}</p>
                  <p><strong>Address:</strong> {selectedPatient.address || 'N/A'}</p>
                </Card>
              </Col>
            </Row>

            <Divider />

            <Row gutter={16}>
              <Col span={12}>
                <Card title="Medical Information" size="small" className="dashboard-card">
                  <p><strong>Risk Score:</strong>
                    <Tag color={
                      !selectedPatient.riskScore ? 'default' :
                        selectedPatient.riskScore > 70 ? 'error' :
                          selectedPatient.riskScore > 40 ? 'warning' : 'success'
                    } style={{ marginLeft: '8px' }}>
                      {selectedPatient.riskScore || 'N/A'}
                    </Tag>
                  </p>
                  <p><strong>Status:</strong>
                    <Badge
                      status={
                        selectedPatient.status === 'Critical' ? 'error' :
                          selectedPatient.status === 'Warning' ? 'warning' : 'success'
                      }
                      text={selectedPatient.status}
                      style={{ marginLeft: '8px' }}
                    />
                  </p>
                  <p><strong>Last Checked:</strong> {selectedPatient.lastChecked || 'N/A'}</p>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="Actions Needed" size="small" className="dashboard-card">
                  <p><strong>Pending Actions:</strong>
                    <Tag color={selectedPatient.pendingActions > 0 ? 'gold' : 'default'} style={{ marginLeft: '8px' }}>
                      {selectedPatient.pendingActions} pending
                    </Tag>
                  </p>
                  <p><strong>Last Appointment:</strong> {selectedPatient.lastAppointment || 'N/A'}</p>
                  <p><strong>Next Appointment:</strong> {selectedPatient.nextAppointment || 'N/A'}</p>
                </Card>
              </Col>
            </Row>
            <Divider />
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card title="Current Medications" size="small" className="dashboard-card">
                  {patientMedications.length > 0 ? (
                    <List
                      dataSource={patientMedications}
                      renderItem={(med) => (
                        <List.Item>
                          <List.Item.Meta
                            title={med.Name}
                            description={
                              <>
                                <div>Dosage: {med.Dosage}</div>
                                <div>Frequency: {med.Frequency}</div>
                                <div>Status: <Tag color={med.Status === 'Taken' ? 'success' : 'processing'}>{med.Status}</Tag></div>
                                {med.Notes && <div>Notes: {med.Notes}</div>}
                              </>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Text type="secondary">No medications prescribed</Text>
                  )}
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* Prescription Form Modal */}
      <PrescriptionFormModal
        visible={prescriptionFormVisible}
        onCancel={() => setPrescriptionFormVisible(false)}
        onSubmit={handlePrescriptionSubmit}
        loading={loading}
        patient={selectedPatient}
      />
    </Layout>
  );
};

export default DoctorDashboard;