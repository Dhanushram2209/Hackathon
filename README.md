
Hackathon Project

A full-stack web application for smart healthcare management, featuring patient dashboards, doctor and admin panels, medicine availability, video calling, and AI-powered health predictions.



## Project Structure

frontend/

&nbsp;   - Built with React.js

&nbsp;   - Contains all UI components, authentication, dashboards, video call features, and service integrations


backend/

&nbsp;   - Built with Node.js (Express)

&nbsp;   - Handles REST API endpoints, authentication, data management, and business logic

## Features

Patient, Doctor, Admin, and Medical Owner Dashboards

Medicine Availability and Purchase System

Secure Authentication (Login/Register)

Video Call Functionality for Remote Consultations

AI Health Assistant (Risk Prediction, Symptom Checker, Health Trends)

Rewards Program for Patients

Responsive UI for desktop and mobile




## Getting Started

1. Clone the repository to your local machine.

2. Install dependencies for both frontend and backend:

&nbsp;  Frontend:
&nbsp;  > cd frontend
&nbsp;  > npm install

&nbsp;  Backend:
&nbsp;  > cd backend
&nbsp;  > npm install

3. Configure environment variables:

&nbsp;  - Edit `.env` files in both `frontend` and `backend` folders as needed.

&nbsp;  - Example variables: API URLs, database credentials, third-party service keys.

4. Start the development servers:

&nbsp;  Frontend:
&nbsp;  > npm start


&nbsp;  Backend:
&nbsp;  > node server.js

5. Access the application:

&nbsp;  - Frontend: http://localhost:3000

&nbsp;  - Backend API: http://localhost:5000


## Usage

 Register as a patient, doctor, admin, or medical owner.

Log in to access your dashboard.

Patients can view health data, consult doctors via video call, check medicine availability, and use AI health tools.

Doctors can manage appointments, view patient details, and conduct video consultations.

Admins can manage users and system data.

Medical owners can update medicine stock and pricing.
## Tech Stack

Frontend: React.js, Ant Design, WebRTC (for video calls)

Backend: Node.js, Express

AI/ML: Python (optional, for advanced health predictions)

Database:  MySQL
## Contributing


1. Fork the repository.

2. Create a new branch for your feature or bugfix.

3. Commit your changes with clear messages.

4. Submit a pull request for review.
## Troubleshooting

If you encounter issues, check the terminal output for errors.

Ensure all dependencies are installed.

Verify environment variables in `.env` files.

For video calls, ensure required third-party services are configured.
## Contact

For questions or support, contact the team lead or open an issue in the repository.
