const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};
const handleDuplicateErrorDB = (err) => {
  let nameValue;
  const regex = /name:\s*\"([^\"]+)\"/;
  const value = err.errmsg.match(regex);
  if (value) {
    nameValue = value[1];
    console.log(nameValue); // Outputs: The Snow Adventurer
  }
  console.log(value);
  const message = `Duplicate field value ${nameValue}. please use another value`;
  console.log(message);
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = (err) => new AppError('Invalid token. Please log in again..!', 401);
const handleJWTExpireError = (err) => new AppError('Your token got expired. Please log in again..!', 401);

const sendErrorDev = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
  // Rendered Website
  console.log('Error', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong',
    msg: err.message,
  });
};
const sendErrorProd = (err, req, res) => {
  // A) API
  //console.log('Production 4');
  if (req.originalUrl.startsWith('/api')) {
    // A) Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // B) Programming or other unknown error: don't leak error details
    // 1. Log the error
    console.log('Error', err);
    // 2. Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong..!',
    });
  }
  //console.log('Production 5');
  // B) Rendered Website
  // A) Operational, trusted error: send message to client
  if (err.isOperational) {
    //console.log('Production 6', err.statusCode, err);
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong',
      msg: err.message,
    });
  }
  // B) Programming or other unknown error: don't leak error details
  // 1. Log the error
  console.log('Error', err);
  // 2. Send generic message
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong',
    msg: 'Please try again later',
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    //let error = { ...err };
    //console.log('Production 1');
    let error = Object.create(err);
    //console.log('Production 2');
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateErrorDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError(error);
    if (error.name === 'TokenExpiredError') error = handleJWTExpireError(error);
    console.log('Production 3, Error: ', error.message, error.name);
    sendErrorProd(error, req, res);
  }
};
