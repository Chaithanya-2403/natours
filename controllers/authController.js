const crypto = require('crypto');
const { promisify } = require('util');
const User = require('./../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('./../utils/catchAsyn');
const jwt = require('jsonwebtoken');
const email = require('../utils/email');
const Email = require('../utils/email');
const mongoose = require('mongoose');
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id);
  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    // secure: true,
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);
  user.password = undefined; // will remove the password from response
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  //const newUser = await User.create(req.body);
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });
  // const url = 'http://127.0.0.1:3000/me';
  console.log(req.protocol);
  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();
  // const newUser = await User.create({
  //   name: req.body.name,
  //   email: req.body.email,
  //   password: req.body.password,
  //   passwordConfirm: req.body.passwordConfirm,
  //   passwordChangedAt: req.body.passwordChangedAt,
  //   role: req.body.role,
  // });
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  // 1. Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 404));
  }
  // 2. Check if user exists and password is correct
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email and password', 401));
  }
  //console.log(user);
  // 3. If everything is ok send token to client
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1. Getting token and check of it's there
  let token;
  console.log(req.cookies);
  //console.log(req.cookies.jwt);
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt && req.cookies.jwt !== 'loggedout') {
    token = req.cookies.jwt;
  }
  console.log(token);
  if (!token) {
    return next(new AppError('You are not logged in! please log in to get access..', 401));
  }

  // 2. Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //console.log(decoded);

  //3. Check if user still exist
  const userId = mongoose.Types.ObjectId(decoded.id);
  console.log('Login User id: ', userId);
  const freshUser = await User.findById(userId);
  if (!freshUser) {
    return next(new AppError('The user belonging to this token does no longer exist..', 401));
  }

  // 4. Check if user changed password after the token was issued
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('User recently changed password! please log in again..', 401));
  }

  // Grant Access to Protected Route
  req.user = freshUser;
  res.locals.user = freshUser;
  next();
});

// only for rendered pages, no errors..
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1. Verify Token
      const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);
      const userId = mongoose.Types.ObjectId(decoded.id);
      // 2. Check if user still exist
      const freshUser = await User.findById(userId);
      if (!freshUser) {
        return next();
      }
      // 3. Check if user changed password after the token was issued
      if (freshUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }
      // There is a logged in user
      res.locals.user = freshUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles['admin', 'lead-guide']
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

exports.forgotPassword = async (req, res, next) => {
  // 1. Get user based base on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with this email', 404));
  }

  // 2. Generate random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3. send it to user's email
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
  console.log(resetURL);
  // const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}\n
  // If you didn't forget your password, please ignore this email..`;
  try {
    // await sendEmail({
    //   email: user.email,
    //   subject: 'Your password reset token (valid in 10 min)',
    //   message,
    // });
    await new Email(user, resetURL).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError('There was an error sending email, Try again later'), 500);
  }
};

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1. Get user based on the token
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // 2. If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or expired', 400));
  }
  try {
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    try {
      await user.save();
    } catch (err) {
      console.log(err.message);
    }
    // 3. Update the changePasswordAt property for the user
    // 4. Log the user in, send JWT
    createSendToken(user, 200, res);
  } catch (err) {
    console.log(err.message);
  }
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1. get User from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2. Check if posted current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }

  // 3. If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // 4. Log user in, send jwt
  createSendToken(user, 201, res);
});
