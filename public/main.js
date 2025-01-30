/******************************************************
 * main.js — Front-End Logic
 ******************************************************/
const tabs = document.querySelectorAll('nav li');
const sections = document.querySelectorAll('.tab-section');
const notifyButton = document.getElementById('notifyButton');
const notifyModal = document.getElementById('notifyModal');
const closeModal = document.getElementById('closeModal');
const sendNotificationBtn = document.getElementById('sendNotificationBtn');

const activitiesList = document.getElementById('activitiesList');
const createActivityBtn = document.getElementById('createActivityBtn');
const courseUserInput = document.getElementById('courseUser');
const courseListInput = document.getElementById('courseList');
const proposeCoursesBtn = document.getElementById('proposeCoursesBtn');
const coursesList = document.getElementById('coursesList');
const notificationsFeed = document.getElementById('notificationsFeed');

// =========== Tab Switching Logic ===========
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    // Remove active class from all tabs
    tabs.forEach(t => t.classList.remove('active'));
    // Hide all sections
    sections.forEach(s => s.classList.add('hidden'));

    // Add active to clicked tab
    tab.classList.add('active');
    // Show the corresponding section
    const targetId = tab.getAttribute('data-tab');
    document.getElementById(targetId).classList.remove('hidden');

    if (targetId === 'activities') {
      loadActivities();
    } else if (targetId === 'courses') {
      loadCourses();
    } else if (targetId === 'notifications') {
      loadNotifications();
    }
  });
});

// =========== Notify Button / Modal ===========
notifyButton.addEventListener('click', () => {
  notifyModal.classList.remove('hidden');
});

closeModal.addEventListener('click', () => {
  notifyModal.classList.add('hidden');
});

// Send notification
sendNotificationBtn.addEventListener('click', async () => {
  const user = document.getElementById('notifyUser').value.trim();
  const message = document.getElementById('notifyMessage').value.trim();
  if (!user || !message) return;

  await fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, message })
  });

  // Reset fields
  document.getElementById('notifyUser').value = '';
  document.getElementById('notifyMessage').value = '';
  notifyModal.classList.add('hidden');

  // If we’re on the notifications tab, refresh feed
  const activeTab = document.querySelector('nav li.active').getAttribute('data-tab');
  if (activeTab === 'notifications') {
    loadNotifications();
  }
});

// =========== Activities Logic ===========

// Create a new activity
createActivityBtn.addEventListener('click', async () => {
  const title = document.getElementById('activityTitle').value.trim();
  const dateTime = document.getElementById('activityDateTime').value;
  const description = document.getElementById('activityDescription').value.trim();
  const imageUrl = document.getElementById('activityImageUrl').value.trim();

  if (!title || !dateTime) {
    alert('Please provide at least a title and date/time.');
    return;
  }

  const res = await fetch('/api/activities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, dateTime, description, imageUrl })
  });
  const newActivity = await res.json();

  // Clear inputs
  document.getElementById('activityTitle').value = '';
  document.getElementById('activityDateTime').value = '';
  document.getElementById('activityDescription').value = '';
  document.getElementById('activityImageUrl').value = '';

  loadActivities(); // refresh list
});

// Load activities
async function loadActivities() {
  activitiesList.innerHTML = 'Loading...';

  const res = await fetch('/api/activities');
  const activities = await res.json();

  if (!activities.length) {
    activitiesList.innerHTML = '<p>No activities yet. Create one!</p>';
    return;
  }

  activitiesList.innerHTML = '';
  activities.forEach(activity => {
    const card = document.createElement('div');
    card.classList.add('activity-card');

    const rsvpYes = activity.rsvps.filter(r => r.status === 'yes').length;
    const rsvpMaybe = activity.rsvps.filter(r => r.status === 'maybe').length;
    const rsvpNo = activity.rsvps.filter(r => r.status === 'no').length;

    card.innerHTML = `
      <h3>${activity.title}</h3>
      <p><strong>Date/Time:</strong> ${activity.dateTime}</p>
      <p>${activity.description || ''}</p>
      ${
        activity.imageUrl
          ? `<img src="${activity.imageUrl}" alt="activity-image" style="max-width:200px; display:block; margin-top:0.5rem;" />`
          : ''
      }
      <p><strong>RSVP:</strong> Yes(${rsvpYes}), Maybe(${rsvpMaybe}), No(${rsvpNo})</p>
      <button class="rsvp-btn" data-id="${activity.id}" data-status="yes">I'm in</button>
      <button class="rsvp-btn" data-id="${activity.id}" data-status="maybe">Maybe</button>
      <button class="rsvp-btn" data-id="${activity.id}" data-status="no">Can't go</button>
      <button onclick="addToCalendar('${activity.title}', '${activity.dateTime}', '${activity.description}')">
        Add to Calendar
      </button>
    `;

    activitiesList.appendChild(card);
  });

  // Attach RSVP events
  document.querySelectorAll('.rsvp-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const activityId = e.target.getAttribute('data-id');
      const status = e.target.getAttribute('data-status');
      const user = prompt('Enter your name to RSVP:');
      if (!user) return;

      await fetch(`/api/activities/${activityId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, status })
      });
      loadActivities();
    });
  });
}

// Simple "Add to Calendar" (Generates ICS file on the fly)
function addToCalendar(title, dateTime, description) {
  // dateTime is in the format: YYYY-MM-DDTHH:MM (from <input type="datetime-local">)
  const start = new Date(dateTime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const endDate = new Date(new Date(dateTime).getTime() + 2 * 60 * 60 * 1000); // +2 hours
  const end = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const icsData = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${title}
DESCRIPTION:${description}
DTSTART:${start}
DTEND:${end}
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([icsData], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/\s+/g, '_')}.ics`;
  link.click();
}

// =========== Courses Logic ===========

// Propose new courses
proposeCoursesBtn.addEventListener('click', async () => {
  const user = courseUserInput.value.trim();
  const courseString = courseListInput.value.trim();

  if (!user || !courseString) {
    alert('Please fill out your name and at least one course.');
    return;
  }

  const courseList = courseString.split(',').map(c => c.trim());

  const res = await fetch('/api/courses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, courseList })
  });
  await res.json();

  courseUserInput.value = '';
  courseListInput.value = '';

  loadCourses();
});

// Load courses
async function loadCourses() {
  coursesList.innerHTML = 'Loading...';
  const res = await fetch('/api/courses');
  const courseProposals = await res.json();

  if (!courseProposals.length) {
    coursesList.innerHTML = '<p>No course proposals yet. Propose one!</p>';
    return;
  }

  coursesList.innerHTML = '';
  courseProposals.forEach(proposal => {
    const card = document.createElement('div');
    card.classList.add('course-card');
    card.innerHTML = `
      <p><strong>Proposed by:</strong> ${proposal.user}</p>
      <p><strong>Courses:</strong> ${proposal.courseList.join(', ')}</p>
      <p><strong>Members:</strong> ${proposal.members.join(', ')}</p>
      <button class="join-course-btn" data-id="${proposal.id}">Join</button>
    `;
    coursesList.appendChild(card);
  });

  document.querySelectorAll('.join-course-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const courseId = e.target.getAttribute('data-id');
      const user = prompt('Enter your name to join:');
      if (!user) return;

      await fetch(`/api/courses/${courseId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user })
      });
      loadCourses();
    });
  });
}

// =========== Notifications Logic ===========

// Load notifications
async function loadNotifications() {
  notificationsFeed.innerHTML = 'Loading...';
  const res = await fetch('/api/notifications');
  const notifs = await res.json();

  if (!notifs.length) {
    notificationsFeed.innerHTML = '<p>No notifications yet.</p>';
    return;
  }

  notificationsFeed.innerHTML = '';
  notifs.slice().reverse().forEach(n => {
    // Show most recent first by reversing array
    const div = document.createElement('div');
    div.classList.add('activity-card'); // Reuse styling
    div.innerHTML = `
      <p><strong>${n.user}</strong> says: ${n.message}</p>
      <small>${(new Date(n.createdAt)).toLocaleString()}</small>
    `;
    notificationsFeed.appendChild(div);
  });
}

// Load home tab data by default (optional)