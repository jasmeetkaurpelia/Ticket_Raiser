const express = require('express');
const fs = require('fs');
const hbs = require('hbs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const publicDirectoryPath = path.join(__dirname, '../public')
const viewsPath = path.join(__dirname, '../templates/views')
const partialsPath = path.join(__dirname, '../templates/partials')

hbs.registerHelper('isDivisibleBy', function (index, divider, options) {
  return (index % divider === 0) ? options.fn(this) : options.inverse(this);
});

hbs.registerHelper('isDivisibleByPlusOne', function (index, divider, options) {
  return ((index + 1) % divider === 0) ? options.fn(this) : options.inverse(this);
});

function loadData() {
  const filePath = path.join(__dirname, 'ticket_data.json');
  if (fs.existsSync(filePath)) {
    const fileData = fs.readFileSync(filePath);
    return JSON.parse(fileData);
  } else {
    return []; 
  }
}

function saveData(data) {
  const dataJSON = JSON.stringify(data);
  fs.writeFileSync('ticket_data.json', dataJSON);
}

function updateTicketStatus(regNo, category, newStatus, newRating) {
  let tickets = loadData();
  const filteredTickets = tickets.filter(ticket =>
      ticket.regNo === regNo && (category ? ticket.category === category : true)
  );
  let successMessage = '';
  let errorMessage = '';

  if (filteredTickets.length > 0) {
      filteredTickets.forEach(ticket => {
          ticket.status = newStatus;
          if (newRating) {
              ticket.rating = newRating;
          }
      });
      saveData(tickets);
      successMessage = `Success: Ticket status updated to ${newStatus}.`;
  } else {
      errorMessage = `Error: Ticket with registration number ${regNo} ${category ? `and category ${category}` : ''} not found.`;
  }
  return { successMessage, errorMessage };
}

app.set('view engine', 'hbs');
app.set('views', viewsPath);
hbs.registerPartials(partialsPath);
app.use(express.static(publicDirectoryPath));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/raise-ticket', (req, res) => {
  res.render('raise');
});

app.post('/raise-ticket', (req, res) => {
  const formData = req.body;
  if (!formData.rating) {
    formData.rating = null;
  }
  const filePath = path.join(__dirname, 'ticket_data.json');
  let jsonData = [];
  if (fs.existsSync(filePath)) {
    const fileData = fs.readFileSync(filePath);
    jsonData = JSON.parse(fileData);
  }

  jsonData.push(formData);
  fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
  res.render('success', { message: 'Form data saved successfully!' });
});

app.get('/tickets', (req, res) => {
  const priority = req.query.priority;
  const filePath = path.join(__dirname, 'ticket_data.json');
  let jsonData = [];
  if (fs.existsSync(filePath)) {
    const fileData = fs.readFileSync(filePath);
    jsonData = JSON.parse(fileData);
  }
  const filteredData = jsonData.filter(ticket => ticket.priority === priority);
  const priorityOrder = ['High', 'Medium', 'Low'];
  const sortedTickets = filteredData.sort((a, b) => {
    return priorityOrder.indexOf(b.priority) - priorityOrder.indexOf(a.priority);
  });

  if (sortedTickets.length === 0) {
    res.status(404).json({ message: `No tickets found for priority '${priority}'.` });
  } else {
    res.json(sortedTickets);
  }
});

app.get('/priority-order', (req, res) => {
  const filePath = path.join(__dirname, 'ticket_data.json');
  let jsonData = [];
  if (fs.existsSync(filePath)) {
    const fileData = fs.readFileSync(filePath);
    jsonData = JSON.parse(fileData);
  }

  const priorityOrder = ['High', 'Medium', 'Low'];
  const sortedTickets = jsonData.sort((a, b) => {
    return priorityOrder.indexOf(b.priority) - priorityOrder.indexOf(a.priority);
  });

  res.render('priority', { tickets: sortedTickets });
});

app.get('/update-status', (req, res) => {
  res.render('update_status');
});

app.post('/update-status', (req, res) => {
  const { regNo, category, newStatus, newRating} = req.body;
  updateTicketStatus(regNo, category, newStatus, newRating);
  res.render('success', {message: 'Ticket status and rating updated successfully!'});
});

app.get('/filter-tickets', (req, res) => {
  res.render('filter');
});

app.post('/filter-tickets', (req, res) => {
  const { priority, status, category } = req.body;
  const filters = {
    priority: priority || null,
    status: status || null,
    category: category || null
  };
  const filteredTickets = filterTicketsBy(filters);

  console.log(filteredTickets); // Log filtered tickets data

  if (filteredTickets.length === 0) {
    res.render('404', { title: 'No Tickets Found', errorMessage: 'No tickets match the specified filters.' });
  } else {
    res.render('filter', { filteredTickets });
  }
});

app.get('/raiser-detail', (req, res) => {
  res.render('raiser_detail');
});

app.get('/raiser-detail/:regNo', (req, res) => {
  const regNo = req.params.regNo;
  let tickets = loadData();

  const raiserTickets = tickets.filter(ticket => ticket.regNo === regNo);

  if (raiserTickets.length > 0) {
      res.json({ raiserTickets: raiserTickets.map(ticket => `Block: ${ticket.block}, Room No: ${ticket.roomNo}, Assigned To: ${ticket.assignedTo}, Status: ${ticket.status}`) });
  } else {
      res.json({ error: `Error: Raiser with registration number ${regNo} not found.` });
  }
});


app.get('/all-details', (req, res) => {
  const tickets = loadData();
  if (tickets.length > 0) {
      res.render('all_details', { allTickets: tickets });
  } else {
      res.render('404', { title: 'No Data', errorMessage: 'No tickets available.' });
  }
});

app.get('/worker-rating', (req, res) => {
  res.render('worker_rating');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

app.get('*', (req, res) => {
  res.render('404', {
      title: '404',
      errorMessage: 'Page not found.'
  })
})
