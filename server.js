const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// In-memory data store
const store = require('./data/store.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
  // Serves files (index.html, styles.css, main.js) from /public

// ============== ROUTES ============== //

// ----- Activities ----- //

// GET all activities
app.get('/api/activities', (req, res) => {
  res.json(store.activities);
});

// POST a new activity
app.post('/api/activities', (req, res) => {
  const { title, dateTime, description, imageUrl } = req.body;
  const newActivity = {
    id: Date.now().toString(),
    title,
    dateTime,
    description,
    imageUrl,
    rsvps: [] // store { user: 'username', status: 'yes/no/maybe' } or something similar
  };
  store.activities.push(newActivity);
  res.status(201).json(newActivity);
});

// POST an RSVP to an activity
app.post('/api/activities/:activityId/rsvp', (req, res) => {
  const { activityId } = req.params;
  const { user, status } = req.body;

  const activity = store.activities.find(a => a.id === activityId);
  if (!activity) {
    return res.status(404).json({ error: 'Activity not found' });
  }

  // Remove any existing RSVP by the same user
  activity.rsvps = activity.rsvps.filter(r => r.user !== user);

  // Add the new RSVP
  activity.rsvps.push({ user, status });
  res.json(activity);
});

// ----- Courses ----- //

// GET all course proposals
app.get('/api/courses', (req, res) => {
  res.json(store.courses);
});

// POST a new course proposal
app.post('/api/courses', (req, res) => {
  const { user, courseList } = req.body;
  // e.g. courseList = ["CIS 101", "MATH 210"]
  const newCourseProposal = {
    id: Date.now().toString(),
    user,
    courseList,
    members: [user]  // The user who created the proposal is automatically joined
  };
  store.courses.push(newCourseProposal);
  res.status(201).json(newCourseProposal);
});

// POST join a course proposal
app.post('/api/courses/:courseId/join', (req, res) => {
  const { courseId } = req.params;
  const { user } = req.body;

  const courseProposal = store.courses.find(c => c.id === courseId);
  if (!courseProposal) {
    return res.status(404).json({ error: 'Course proposal not found' });
  }

  // Add user if not already in the list
  if (!courseProposal.members.includes(user)) {
    courseProposal.members.push(user);
  }

  res.json(courseProposal);
});

// ----- Notifications (quick "What are you doing?" posts) ----- //

// GET all notifications
app.get('/api/notifications', (req, res) => {
  res.json(store.notifications);
});

// POST a new notification
app.post('/api/notifications', (req, res) => {
  const { user, message } = req.body;
  const newNotification = {
    id: Date.now().toString(),
    user,
    message,
    createdAt: new Date().toISOString()
  };
  store.notifications.push(newNotification);
  res.status(201).json(newNotification);
});

// For any other routes, serve the index.html (client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});