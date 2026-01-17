import React from 'react';
import { Card, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';



const Dashboard = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');

  const modules = [
    ...(role === 'admin' ? [{ title: 'Manage Users', path: '/manage-users', color: 'dark' }] : []),
    { title: 'Patients', path: '/patients', color: 'primary' },
    { title: 'Pending Studies', path: '/pending', color: 'warning' },
    { title: 'Reporting', path: '/reporting', color: 'info' },
    { title: 'Inventory', path: '/inventory', color: 'success' },
    { title: 'Billing', path: '/billing', color: 'danger' },
  ];

  return (
    <div className="container mt-4">
      <h3 className="mb-4">Welcome to RIS Dashboard</h3>
      <Row>
        {modules.map((mod, idx) => (
          <Col md={4} key={idx} className="mb-3">
            <Card
              bg={mod.color}
              text="white"
              className="shadow-sm"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(mod.path)}
            >
              <Card.Body>
                <Card.Title>{mod.title}</Card.Title>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default Dashboard;
