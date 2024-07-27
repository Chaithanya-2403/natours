const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });
const app = require('./app');

process.on('uncaughtException', (err) => {
  console.log(err);
  console.log('Uncaught Exception..! Shutting down...');
  server.close(() => {
    process.exit(1);
  });
});

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
mongoose
  //.connect(process.env.DATABASE_LOCAL, {
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => {
    //console.log(con.connections);
    console.log('DB Connection Successful..!');
  });

//.catch((err) => console.log('ERROR'))

// const testTour = new Tour({
//   name: 'The Park Camper',
//   price: 789,
// });

// testTour
//   .save()
//   .then((doc) => {
//     console.log(doc);
//   })
//   .catch((err) => {
//     console.log('Error: ', err);
//   });

//console.log(process.env);
//console.log('NODE_ENV:', process.env.NODE_ENV);
// Start Server
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on Port ${port}`);
});

process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('Unhandled Rejection..! Shutting down...');
  server.close(() => {
    process.exit(1);
  });
});
