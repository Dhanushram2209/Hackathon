import React, { useState, useEffect } from 'react';
import {
  Layout, Menu, Typography, Card, Row, Col, Statistic, Progress, Alert,
  Table, Button, Modal, Form, Input, Select, DatePicker, Badge, message,
  Spin, Tabs, Avatar, List, Tag, Divider, Collapse, Space, Popconfirm, Tooltip,
  InputNumber, Switch, Radio, FloatButton, Upload, Image,
} from 'antd';
import {
  UserOutlined, MedicineBoxOutlined, BellOutlined,
  DashboardOutlined, PlusOutlined, LineChartOutlined,
  CheckOutlined, CloseOutlined,
  CalendarOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
  FileTextOutlined, SyncOutlined, CheckCircleOutlined, TeamOutlined,
  ArrowUpOutlined, ArrowDownOutlined, InfoCircleOutlined, ShopOutlined,
  BarChartOutlined, QuestionCircleOutlined, WarningOutlined, MessageOutlined,
  UploadOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined
} from '@ant-design/icons';
import Header from '../../../components/Header';
import './MedicalOwnerDashboard.css';
import api from '../../../services/api';
import moment from 'moment';

const { Header: AntHeader, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { Panel } = Collapse;
const { RangePicker } = DatePicker;

const MedicalOwnerDashboard = () => {
  const [medicines, setMedicines] = useState([]);
  const [medicalStores, setMedicalStores] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAddMedicineModalVisible, setIsAddMedicineModalVisible] = useState(false);
  const [isUpdateStockModalVisible, setIsUpdateStockModalVisible] = useState(false);
  const [isAddStoreModalVisible, setIsAddStoreModalVisible] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filterStore, setFilterStore] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [form] = Form.useForm();
  const [stockForm] = Form.useForm();
  const [storeForm] = Form.useForm();
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    
    if (userData?.role !== 'medical_owner') {
      // Redirect if not medical owner
      window.location.href = '/login';
      return;
    }
    
    fetchMedicalOwnerData();
  }, []);


  useEffect(() => {
    fetchMedicalOwnerData();
  }, []);

  const fetchMedicalOwnerData = async () => {
    try {
      setLoading(true);
      
      const [
        medicinesResponse, 
        storesResponse, 
        inventoryResponse, 
        alertsResponse
      ] = await Promise.all([
        api.get('/medical-owner/medicines'),
        api.get('/medical-owner/stores'),
        api.get('/medical-owner/inventory'),
        api.get('/medical-owner/alerts')
      ]);

      setMedicines(medicinesResponse.data || []);
      setMedicalStores(storesResponse.data || []);
      setInventory(inventoryResponse.data || []);
      setAlerts(alertsResponse.data || []);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching medical owner data:', error);
      setLoading(false);
    }
  };

  const handleAddMedicine = async (values) => {
    try {
      await api.post('/medical-owner/medicines', values);
      message.success('Medicine added successfully');
      setIsAddMedicineModalVisible(false);
      form.resetFields();
      fetchMedicalOwnerData();
    } catch (error) {
      console.error('Error adding medicine:', error);
      message.error('Failed to add medicine');
    }
  };

  const handleUpdateStock = async (values) => {
    try {
      await api.post('/medical-owner/inventory', {
        medicineId: selectedMedicine.MedicineID,
        storeId: values.storeId,
        quantity: values.quantity,
        price: values.price
      });
      message.success('Stock updated successfully');
      setIsUpdateStockModalVisible(false);
      stockForm.resetFields();
      setSelectedMedicine(null);
      fetchMedicalOwnerData();
    } catch (error) {
      console.error('Error updating stock:', error);
      message.error('Failed to update stock');
    }
  };

  const handleAddStore = async (values) => {
    try {
      await api.post('/medical-owner/stores', values);
      message.success('Medical store added successfully');
      setIsAddStoreModalVisible(false);
      storeForm.resetFields();
      fetchMedicalOwnerData();
    } catch (error) {
      console.error('Error adding store:', error);
      message.error('Failed to add medical store');
    }
  };

  const handleDeleteMedicine = async (medicineId) => {
    try {
      await api.delete(`/medical-owner/medicines/${medicineId}`);
      message.success('Medicine deleted successfully');
      fetchMedicalOwnerData();
    } catch (error) {
      console.error('Error deleting medicine:', error);
      message.error('Failed to delete medicine');
    }
  };

  const handleDeleteStore = async (storeId) => {
    try {
      await api.delete(`/medical-owner/stores/${storeId}`);
      message.success('Medical store deleted successfully');
      fetchMedicalOwnerData();
    } catch (error) {
      console.error('Error deleting store:', error);
      message.error('Failed to delete medical store');
    }
  };

  const getMedicineStock = (medicineId, storeId = null) => {
    if (storeId) {
      const stock = inventory.find(item => 
        item.MedicineID === medicineId && item.StoreID === storeId
      );
      return stock ? stock.Quantity : 0;
    }
    
    // Get total stock across all stores
    return inventory
      .filter(item => item.MedicineID === medicineId)
      .reduce((sum, item) => sum + item.Quantity, 0);
  };

  const getLowStockMedicines = () => {
    return medicines.filter(medicine => {
      const totalStock = getMedicineStock(medicine.MedicineID);
      return totalStock <= lowStockThreshold;
    });
  };

  const getOutOfStockMedicines = () => {
    return medicines.filter(medicine => {
      const totalStock = getMedicineStock(medicine.MedicineID);
      return totalStock === 0;
    });
  };

  const filteredMedicines = medicines.filter(medicine => {
    const matchesSearch = medicine.Name.toLowerCase().includes(searchText.toLowerCase()) ||
                         medicine.Category.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesStore = filterStore === 'all' || 
      inventory.some(item => 
        item.MedicineID === medicine.MedicineID && 
        item.StoreID === filterStore && 
        item.Quantity > 0
      );
    
    const matchesCategory = filterCategory === 'all' || medicine.Category === filterCategory;
    
    return matchesSearch && matchesStore && matchesCategory;
  });

  const medicineColumns = [
    {
      title: 'Medicine',
      dataIndex: 'Name',
      key: 'name',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.Category} • {record.Manufacturer}
          </div>
        </div>
      )
    },
    {
      title: 'Description',
      dataIndex: 'Description',
      key: 'description',
      render: (text) => text || '--'
    },
    {
      title: 'Total Stock',
      key: 'totalStock',
      render: (_, record) => {
        const totalStock = getMedicineStock(record.MedicineID);
        return (
          <Tag color={totalStock === 0 ? 'error' : totalStock <= lowStockThreshold ? 'warning' : 'success'}>
            {totalStock} units
          </Tag>
        );
      }
    },
    {
      title: 'Stock by Store',
      key: 'storeStock',
      render: (_, record) => (
        <div>
          {medicalStores.map(store => {
            const stock = getMedicineStock(record.MedicineID, store.StoreID);
            return (
              <div key={store.StoreID} style={{ marginBottom: '4px' }}>
                <Text type="secondary">{store.Name}: </Text>
                <Tag color={stock === 0 ? 'error' : stock <= lowStockThreshold ? 'warning' : 'success'} size="small">
                  {stock}
                </Tag>
              </div>
            );
          })}
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedMedicine(record);
              setIsUpdateStockModalVisible(true);
            }}
          >
            Update Stock
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this medicine?"
            onConfirm={() => handleDeleteMedicine(record.MedicineID)}
            okText="Yes"
            cancelText="No"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const storeColumns = [
    {
      title: 'Store Name',
      dataIndex: 'Name',
      key: 'name',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.Address}
          </div>
        </div>
      )
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <div>
          <div>{record.Phone}</div>
          <div>{record.Email}</div>
        </div>
      )
    },
    {
      title: 'Inventory Count',
      key: 'inventoryCount',
      render: (_, record) => {
        const storeInventory = inventory.filter(item => item.StoreID === record.StoreID);
        const totalItems = storeInventory.length;
        const lowStockItems = storeInventory.filter(item => item.Quantity <= lowStockThreshold).length;
        const outOfStockItems = storeInventory.filter(item => item.Quantity === 0).length;
        
        return (
          <div>
            <div>Total: {totalItems} medicines</div>
            <div>
              <Text type="warning">Low: {lowStockItems}</Text>
              {' • '}
              <Text type="danger">Out: {outOfStockItems}</Text>
            </div>
          </div>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
        
          <Popconfirm
            title="Are you sure you want to delete this store?"
            onConfirm={() => handleDeleteStore(record.StoreID)}
            okText="Yes"
            cancelText="No"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const alertColumns = [
    {
      title: 'Time',
      dataIndex: 'Timestamp',
      key: 'timestamp',
      render: (text) => text ? new Date(text).toLocaleString() : '--',
      sorter: (a, b) => new Date(a.Timestamp) - new Date(b.Timestamp)
    },
    {
      title: 'Message',
      dataIndex: 'Message',
      key: 'message',
      render: (text, record) => (
        <div>
          <div>{text || '--'}</div>
          {record.Severity && (
            <Tag color={
              record.Severity === 'High' ? 'error' : 
              record.Severity === 'Medium' ? 'warning' : 'processing'
            }>
              {record.Severity}
            </Tag>
          )}
        </div>
      )
    },
    {
      title: 'Store',
      dataIndex: 'StoreName',
      key: 'storeName',
      render: (text) => text || 'All Stores'
    }
  ];

  const renderDashboard = () => (
    <>
      <Row gutter={[16, 16]} className="dashboard-stats">
        <Col xs={24} sm={12} md={8}>
          <Card className="dashboard-card" hoverable>
            <Statistic 
              title="Total Medicines" 
              value={medicines.length} 
              prefix={<MedicineBoxOutlined />}
            />
            <Text type="secondary">Across all medical stores</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="dashboard-card" hoverable>
            <Statistic 
              title="Medical Stores" 
              value={medicalStores.length}
              prefix={<ShopOutlined />}
            />
            <Text type="secondary">In your network</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="dashboard-card" hoverable>
            <Statistic 
              title="Low Stock Alerts" 
              value={getLowStockMedicines().length}
              prefix={<BellOutlined />}
            />
            <Text type="secondary">
              {getOutOfStockMedicines().length} out of stock
            </Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="dashboard-sections">
        <Col xs={24} lg={12}>
          <Card 
            title="Low Stock Medicines" 
            className="dashboard-section-card" 
            hoverable
            extra={
              <Button 
                type="link" 
                onClick={() => setActiveTab('medicines')}
              >
                View All
              </Button>
            }
          >
            {getLowStockMedicines().length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={getLowStockMedicines().slice(0, 5)}
                renderItem={medicine => (
                  <List.Item>
                    <List.Item.Meta
                      title={medicine.Name}
                      description={
                        <div>
                          <Text>{medicine.Category}</Text>
                          <div>
                            Total stock: {getMedicineStock(medicine.MedicineID)} units
                          </div>
                        </div>
                      }
                    />
                    <Button 
                      size="small" 
                      type="primary"
                      onClick={() => {
                        setSelectedMedicine(medicine);
                        setIsUpdateStockModalVisible(true);
                      }}
                    >
                      Restock
                    </Button>
                  </List.Item>
                )}
              />
            ) : (
              <Alert
                message="No low stock medicines"
                description="All medicines have sufficient stock"
                type="success"
                showIcon
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title="Recent Alerts" 
            className="dashboard-section-card" 
            hoverable
            extra={
              <Button 
                type="link" 
                onClick={() => setActiveTab('alerts')}
              >
                View All
              </Button>
            }
          >
            {alerts.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={alerts.slice(0, 5)}
                renderItem={alert => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <div>
                          {alert.Message}
                          {alert.Severity === 'High' && (
                            <Tag color="error" style={{ marginLeft: '8px' }}>High</Tag>
                          )}
                        </div>
                      }
                      description={
                        <div>
                          {alert.StoreName && `Store: ${alert.StoreName}`}
                          <div>{new Date(alert.Timestamp).toLocaleString()}</div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Alert
                message="No recent alerts"
                description="Everything is running smoothly"
                type="info"
                showIcon
              />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="dashboard-sections">
        <Col span={24}>
          <Card 
            title="Medical Store Overview" 
            className="dashboard-section-card" 
            hoverable
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => setIsAddStoreModalVisible(true)}
              >
                Add New Store
              </Button>
            }
          >
            {medicalStores.length > 0 ? (
              <Row gutter={[16, 16]}>
                {medicalStores.map(store => {
                  const storeInventory = inventory.filter(item => item.StoreID === store.StoreID);
                  const totalValue = storeInventory.reduce((sum, item) => sum + (item.Quantity * item.Price), 0);
                  const lowStockItems = storeInventory.filter(item => item.Quantity <= lowStockThreshold).length;
                  const outOfStockItems = storeInventory.filter(item => item.Quantity === 0).length;
                  
                  return (
                    <Col xs={24} sm={12} md={8} key={store.StoreID}>
                      <Card size="small" hoverable>
                        <div style={{ textAlign: 'center' }}>
                          <Avatar size={64} icon={<ShopOutlined />} />
                          <Title level={4} style={{ marginTop: '8px' }}>{store.Name}</Title>
                          <Text type="secondary">{store.Address}</Text>
                          
                          <Divider style={{ margin: '12px 0' }} />
                          
                          <Statistic title="Total Medicines" value={storeInventory.length} />
                          
                          <div style={{ margin: '8px 0' }}>
                            <Progress 
                              percent={Math.round(((storeInventory.length - outOfStockItems) / storeInventory.length) * 100)} 
                              size="small" 
                              status={
                                outOfStockItems > 0 ? 'exception' : 
                                lowStockItems > 0 ? 'normal' : 'success'
                              }
                            />
                            <div style={{ fontSize: '12px', marginTop: '4px' }}>
                              <Text type="danger">{outOfStockItems} out of stock</Text>
                              {' • '}
                              <Text type="warning">{lowStockItems} low stock</Text>
                            </div>
                          </div>
                          
                          <Statistic 
                            title="Inventory Value" 
                            value={totalValue} 
                            precision={2} 
                            prefix="$" 
                          />
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            ) : (
              <Alert
                message="No medical stores added"
                description="Add your first medical store to start managing inventory"
                type="info"
                showIcon
                action={
                  <Button 
                    type="primary" 
                    size="small"
                    onClick={() => setIsAddStoreModalVisible(true)}
                  >
                    Add Store
                  </Button>
                }
              />
            )}
          </Card>
        </Col>
      </Row>
    </>
  );

  const renderMedicines = () => (
    <Card 
      title="Medicine Inventory" 
      className="dashboard-section-card" 
      extra={
        <Space>
          <Input 
            placeholder="Search medicines..." 
            prefix={<SearchOutlined />} 
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
          />
          <Select 
            placeholder="Filter by store" 
            value={filterStore}
            onChange={setFilterStore}
            style={{ width: 150 }}
          >
            <Option value="all">All Stores</Option>
            {medicalStores.map(store => (
              <Option key={store.StoreID} value={store.StoreID}>{store.Name}</Option>
            ))}
          </Select>
          <Select 
            placeholder="Filter by category" 
            value={filterCategory}
            onChange={setFilterCategory}
            style={{ width: 150 }}
          >
            <Option value="all">All Categories</Option>
            {[...new Set(medicines.map(m => m.Category))].map(category => (
              <Option key={category} value={category}>{category}</Option>
            ))}
          </Select>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => setIsAddMedicineModalVisible(true)}
          >
            Add Medicine
          </Button>
        </Space>
      }
    >
      <Table 
        columns={medicineColumns} 
        dataSource={filteredMedicines} 
        rowKey="MedicineID"
        pagination={{ pageSize: 10 }}
        loading={loading}
      />
    </Card>
  );

  const renderStores = () => (
    <Card 
      title="Medical Stores" 
      className="dashboard-section-card" 
      extra={
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => setIsAddStoreModalVisible(true)}
        >
          Add Store
        </Button>
      }
    >
      <Table 
        columns={storeColumns} 
        dataSource={medicalStores} 
        rowKey="StoreID"
        pagination={{ pageSize: 10 }}
        loading={loading}
      />
    </Card>
  );

  const renderAlerts = () => (
    <Card 
      title="Alerts & Notifications" 
      className="dashboard-section-card"
      extra={
        <Button 
          icon={<BellOutlined />}
          onClick={() => setLowStockThreshold(lowStockThreshold)}
        >
          Configure Alerts
        </Button>
      }
    >
      <Table 
        columns={alertColumns} 
        dataSource={alerts} 
        rowKey="AlertID"
        pagination={{ pageSize: 10 }}
        loading={loading}
      />
    </Card>
  );

  return (
    <Layout className="medical-owner-dashboard">
      <Header title="Medical Owner Dashboard" />
      
      <Layout>
        <Sider width={250} className="dashboard-sider">
          <Menu
            mode="inline"
            selectedKeys={[activeTab]}
            onSelect={({ key }) => setActiveTab(key)}
            className="dashboard-menu"
          >
            <Menu.Item key="dashboard" icon={<DashboardOutlined />}>
              Dashboard
            </Menu.Item>
            <Menu.Item key="medicines" icon={<MedicineBoxOutlined />}>
              Medicine Inventory
            </Menu.Item>
            <Menu.Item key="stores" icon={<ShopOutlined />}>
              Medical Stores
            </Menu.Item>
            <Menu.Item key="alerts" icon={<BellOutlined />}>
              Alerts & Notifications
            </Menu.Item>
            <Menu.Item key="reports" icon={<BarChartOutlined />}>
              Reports & Analytics
            </Menu.Item>
          </Menu>
          
          <div className="sider-footer">
            <Divider />
            <div className="low-stock-config">
              <Text>Low Stock Threshold</Text>
              <InputNumber 
                min={1} 
                max={100} 
                value={lowStockThreshold} 
                onChange={setLowStockThreshold}
                addonAfter="units"
              />
            </div>
          </div>
        </Sider>
        
        <Layout className="dashboard-content-layout">
          <Content className="dashboard-content">
            {loading ? (
              <div className="loading-container">
                <Spin size="large" />
                <Text>Loading medical owner dashboard...</Text>
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'medicines' && renderMedicines()}
                {activeTab === 'stores' && renderStores()}
                {activeTab === 'alerts' && renderAlerts()}
                
{activeTab === 'reports' && (
  <Card title="Reports & Analytics" className="dashboard-section-card">
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card title="Inventory Value by Store" className="analytics-card">
          {medicalStores.length > 0 ? (
            <div>
              {medicalStores.map(store => {
                const storeInventory = inventory.filter(item => item.StoreID === store.StoreID);
                const totalValue = storeInventory.reduce((sum, item) => sum + (item.Quantity * item.Price), 0);
                
                return (
                  <div key={store.StoreID} style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <Text>{store.Name}</Text>
                      <Text strong>${totalValue.toFixed(2)}</Text>
                    </div>
                    <Progress 
                      percent={Math.round((totalValue / 
                        medicalStores.reduce((max, s) => {
                          const sInventory = inventory.filter(item => item.StoreID === s.StoreID);
                          const sValue = sInventory.reduce((sum, item) => sum + (item.Quantity * item.Price), 0);
                          return Math.max(max, sValue);
                        }, 0)) * 100)} 
                      size="small" 
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <Alert
              message="No data available"
              description="Add medical stores and inventory to see analytics"
              type="info"
              showIcon
            />
          )}
        </Card>
      </Col>
      
      <Col xs={24} lg={12}>
        <Card title="Stock Status Overview" className="analytics-card">
          {inventory.length > 0 ? (
            <div>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="Total Items"
                    value={inventory.length}
                    prefix={<MedicineBoxOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Out of Stock"
                    value={inventory.filter(item => item.Quantity === 0).length}
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Low Stock"
                    value={inventory.filter(item => item.Quantity > 0 && item.Quantity <= lowStockThreshold).length}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
              </Row>
              <Divider />
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="dashboard"
                  percent={Math.round(
                    (inventory.filter(item => item.Quantity > lowStockThreshold).length / inventory.length) * 100
                  )}
                  format={percent => `${percent}% Healthy`}
                />
                <Text type="secondary">Inventory Health Score</Text>
              </div>
            </div>
          ) : (
            <Alert
              message="No inventory data"
              description="Add medicines and update stock to see analytics"
              type="info"
              showIcon
            />
          )}
        </Card>
      </Col>
    </Row>

    <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
      <Col xs={24} lg={12}>
        <Card title="Medicine Categories Distribution" className="analytics-card">
          {medicines.length > 0 ? (
            <div>
              {Object.entries(
                medicines.reduce((acc, medicine) => {
                  acc[medicine.Category] = (acc[medicine.Category] || 0) + 1;
                  return acc;
                }, {})
              )
              .sort((a, b) => b[1] - a[1])
              .map(([category, count]) => (
                <div key={category} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <Text>{category}</Text>
                    <Text strong>{count} medicines</Text>
                  </div>
                  <Progress 
                    percent={Math.round((count / medicines.length) * 100)} 
                    size="small" 
                  />
                </div>
              ))}
            </div>
          ) : (
            <Alert
              message="No medicines data"
              description="Add medicines to see category distribution"
              type="info"
              showIcon
            />
          )}
        </Card>
      </Col>
      
      <Col xs={24} lg={12}>
        <Card title="Alert Statistics" className="analytics-card">
          {alerts.length > 0 ? (
            <div>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="Total Alerts"
                    value={alerts.length}
                    prefix={<BellOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="High Priority"
                    value={alerts.filter(alert => alert.Severity === 'High').length}
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Unread Alerts"
                    value={alerts.filter(alert => !alert.IsRead).length}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
              </Row>
              <Divider />
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  percent={Math.round(
                    (alerts.filter(alert => alert.IsRead).length / alerts.length) * 100
                  )}
                  format={percent => `${percent}% Read`}
                />
                <div style={{ marginTop: '8px' }}>
                  <Text type="secondary">Alert Read Rate</Text>
                </div>
              </div>
            </div>
          ) : (
            <Alert
              message="No alerts data"
              description="Alerts will appear here when inventory issues occur"
              type="info"
              showIcon
            />
          )}
        </Card>
      </Col>
    </Row>

    <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
      <Col span={24}>
        <Card title="Monthly Inventory Value Trend" className="analytics-card">
          {inventory.length > 0 ? (
            <div style={{ height: '300px', textAlign: 'center', padding: '40px' }}>
              <Text strong>Inventory Value Trend Chart</Text>
              <div style={{ marginTop: '20px' }}>
                <Alert
                  message="Chart Visualization"
                  description="This would display a line chart showing inventory value trends over time. In a production environment, this would integrate with a charting library like Chart.js or Recharts."
                  type="info"
                  showIcon
                />
              </div>
              <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
                <Text>Sample data would show: </Text>
                <ul style={{ textAlign: 'left', display: 'inline-block' }}>
                  <li>Monthly inventory value changes</li>
                  <li>Comparison between stores</li>
                  <li>Trends in medication categories</li>
                </ul>
              </div>
            </div>
          ) : (
            <Alert
              message="No inventory data"
              description="Add inventory to see trend analysis"
              type="info"
              showIcon
            />
          )}
        </Card>
      </Col>
    </Row>

    <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
      <Col xs={24} lg={12}>
        <Card title="Top 5 Medicines by Value" className="analytics-card">
          {inventory.length > 0 ? (
            <List
              dataSource={[...inventory]
                .map(item => {
                  const medicine = medicines.find(m => m.MedicineID === item.MedicineID);
                  return {
                    ...item,
                    medicineName: medicine ? medicine.Name : 'Unknown Medicine',
                    totalValue: item.Quantity * item.Price
                  };
                })
                .sort((a, b) => b.totalValue - a.totalValue)
                .slice(0, 5)
              }
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={item.medicineName}
                    description={
                      <div>
                        <Text>Value: ${item.totalValue.toFixed(2)}</Text>
                        <br />
                        <Text type="secondary">Stock: {item.Quantity} units</Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Alert
              message="No inventory data"
              description="Add inventory to see top medicines"
              type="info"
              showIcon
            />
          )}
        </Card>
      </Col>
      
      <Col xs={24} lg={12}>
        <Card title="Export Reports" className="analytics-card">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>Generate and download reports for your medical business:</Text>
            <Button type="primary" icon={<FileTextOutlined />} block>
              Export Inventory Report (PDF)
            </Button>
            <Button icon={<FileTextOutlined />} block>
              Export Stock Alert Report (CSV)
            </Button>
            <Button icon={<FileTextOutlined />} block>
              Export Financial Summary (Excel)
            </Button>
            <Divider />
            <Text strong>Custom Report Period</Text>
            <RangePicker style={{ width: '100%' }} />
            <Button type="dashed" icon={<LineChartOutlined />} block>
              Generate Custom Report
            </Button>
          </Space>
        </Card>
      </Col>
    </Row>
  </Card>
)}
              </>
            )}
          </Content>
        </Layout>
      </Layout>

      {/* Add Medicine Modal */}
      <Modal
        title="Add New Medicine"
        open={isAddMedicineModalVisible}
        onCancel={() => {
          setIsAddMedicineModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddMedicine}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="Name"
                label="Medicine Name"
                rules={[{ required: true, message: 'Please enter medicine name' }]}
              >
                <Input placeholder="Enter medicine name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="Category"
                label="Category"
                rules={[{ required: true, message: 'Please select category' }]}
              >
                <Select placeholder="Select category">
                  <Option value="Pain Relief">Pain Relief</Option>
                  <Option value="Antibiotics">Antibiotics</Option>
                  <Option value="Vitamins">Vitamins</Option>
                  <Option value="Cardiac">Cardiac</Option>
                  <Option value="Diabetes">Diabetes</Option>
                  <Option value="Respiratory">Respiratory</Option>
                  <Option value="Other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="Description"
            label="Description"
          >
            <Input.TextArea rows={3} placeholder="Enter medicine description" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="Manufacturer"
                label="Manufacturer"
              >
                <Input placeholder="Enter manufacturer name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="Dosage"
                label="Dosage Form"
              >
                <Select placeholder="Select dosage form">
                  <Option value="Tablet">Tablet</Option>
                  <Option value="Capsule">Capsule</Option>
                  <Option value="Syrup">Syrup</Option>
                  <Option value="Injection">Injection</Option>
                  <Option value="Cream">Cream</Option>
                  <Option value="Other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Add Medicine
            </Button>
            <Button 
              style={{ marginLeft: '8px' }}
              onClick={() => {
                setIsAddMedicineModalVisible(false);
                form.resetFields();
              }}
            >
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Update Stock Modal */}
      <Modal
        title={`Update Stock for ${selectedMedicine?.Name || 'Medicine'}`}
        open={isUpdateStockModalVisible}
        onCancel={() => {
          setIsUpdateStockModalVisible(false);
          stockForm.resetFields();
          setSelectedMedicine(null);
        }}
        footer={null}
        width={500}
      >
        <Form
          form={stockForm}
          layout="vertical"
          onFinish={handleUpdateStock}
        >
          <Form.Item
            name="storeId"
            label="Medical Store"
            rules={[{ required: true, message: 'Please select a store' }]}
          >
            <Select placeholder="Select medical store">
              {medicalStores.map(store => (
                <Option key={store.StoreID} value={store.StoreID}>
                  {store.Name} ({store.Address})
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="quantity"
            label="Quantity"
            rules={[{ required: true, message: 'Please enter quantity' }]}
          >
            <InputNumber 
              min={0} 
              style={{ width: '100%' }} 
              placeholder="Enter quantity" 
            />
          </Form.Item>
          
          <Form.Item
            name="price"
            label="Price per unit"
            rules={[{ required: true, message: 'Please enter price' }]}
          >
            <InputNumber 
              min={0} 
              step={0.01} 
              style={{ width: '100%' }} 
              placeholder="Enter price" 
              prefix="$"
            />
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Update Stock
            </Button>
            <Button 
              style={{ marginLeft: '8px' }}
              onClick={() => {
                setIsUpdateStockModalVisible(false);
                stockForm.resetFields();
                setSelectedMedicine(null);
              }}
            >
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Store Modal */}
      <Modal
        title="Add New Medical Store"
        open={isAddStoreModalVisible}
        onCancel={() => {
          setIsAddStoreModalVisible(false);
          storeForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={storeForm}
          layout="vertical"
          onFinish={handleAddStore}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="Name"
                label="Store Name"
                rules={[{ required: true, message: 'Please enter store name' }]}
              >
                <Input placeholder="Enter store name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="Phone"
                label="Phone Number"
                rules={[{ required: true, message: 'Please enter phone number' }]}
              >
                <Input placeholder="Enter phone number" />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="Address"
            label="Address"
            rules={[{ required: true, message: 'Please enter address' }]}
          >
            <Input.TextArea rows={2} placeholder="Enter full address" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="Email"
                label="Email"
                rules={[{ type: 'email', message: 'Please enter a valid email' }]}
              >
                <Input placeholder="Enter email address" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="Manager"
                label="Store Manager"
              >
                <Input placeholder="Enter manager name" />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Add Store
            </Button>
            <Button 
              style={{ marginLeft: '8px' }}
              onClick={() => {
                setIsAddStoreModalVisible(false);
                storeForm.resetFields();
              }}
            >
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <FloatButton 
        icon={<SyncOutlined />} 
        tooltip="Refresh Data"
        onClick={fetchMedicalOwnerData}
      />
    </Layout>
  );
};

export default MedicalOwnerDashboard;