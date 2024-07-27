const path = require('path');
const exp = require('constants');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const tourRouter = require('./routes/tourRouter');
const userRouter = require('./routes/userRouter');
const reviewRouter = require('./routes/reviewRouter');
const viewRouter = require('./routes/viewRouter');
const bookingRouter = require('./routes/bookingRoutes');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const app = express();

// app.set('view engin', 'pug');
// app.set('views', path.join(__dirname, 'views'));

// Set the view engine to pug
app.set('view engine', 'pug');

// Set the views directory (optional if default is used)
app.set('views', './views');

// Global Middlewares
app.use(express.static(`${__dirname}/public`)); // Serving static files
//app.use(express.static(path.join(__dirname, 'public'))); // Serving static files
//app.use(helmet()); // Set Security HTTP headers

app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' })); //#1. Fix for the mapbox to work without throwing security error..

console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === 'development') {
  // Development Logging
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  max: 100,
  windowMS: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in one hour',
});
app.use('/api', limiter); // Limit request from same API
app.use(express.json({ limit: '10kb' })); // Body parser, reading data from body into req.body
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: ['duration', 'ratingAverage', 'ratingQuantity', 'difficulty', 'price', 'maxGroupSize'],
  }),
);

// app.use((req, res, next) => {
//   console.log('Hello from the middleware..');
//   next();
// });

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log(req.cookies);
  // console.log(req.headers);
  next();
});

// app.get('/', (req, res) => {
//   res.status(500).json({ message: 'Hello from server side', app: 'Natours' });
// });

// app.post('/', (req, res) => {
//   res.send('You can post to this endpoint...');
// });

// app.get('/api/v1/tours', getAllTours);
// app.get('/api/v1/tours/:id', getTourById);
// app.post('/api/v1/tours', createTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);

// Routes
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Can't find ${req.originalUrl} on this server..!`,
  // });
  // const err = new Error(`Can't find ${req.originalUrl} on this server..!`);
  // err.status = 'fail';
  // err.statusCode = 404;
  console.log(req.originalUrl);
  next(new AppError(`Can't find ${req.originalUrl} on this server..!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
