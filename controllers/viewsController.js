const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsyn');
const AppError = require('../utils/appError');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');

exports.getOverView = catchAsync(async (req, res, next) => {
  // 1. get route data from collection
  const tours = await Tour.find();
  // 2. Build template

  //3. render that template using tour data from point 1
  res.status(200).render('overview', {
    title: 'All Tours',
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  //1. get the data, for the requested tour (including review & guides)
  //console.log('User Data: ', res.locals.user);
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });
  // const specificTourId = tour._id;
  // const specificUserId = res.locals.user._id;
  const specificTourId = '5c88fa8cf4afda39709c2951';
  const specificUserId = '66a35ac0a729cd2fec15c6f4';
  console.log(`Comparing Tour ID: ${specificTourId} with ${tour._id}`);
  console.log(`Comparing User ID: ${specificUserId} with ${res.locals.user._id}`);
  const tourUserIds = [];
  const bookedTour = await Booking.findOne({ tour: tour._id, user: res.locals.user._id });
  console.log('Tour Length: ', bookedTour);
  let is_booked = false;
  if (bookedTour != null) {
    is_booked = true;
  }
  console.log(is_booked);

  if (!tour) {
    return next(new AppError('There is not tour with that name', 404));
  }
  // 2. Build template

  // 3. Render template using data from point 1

  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour,
    is_booked,
  });
});

exports.signup = (req, res) => {
  res.status(200).render('signup', {
    title: 'Create account',
  });
};

exports.login = (req, res) => {
  res.status(200).render('login', {
    title: 'Login into your account',
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your Account',
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1. Find all bookings
  const bookings = await Booking.find({ user: req.user.id });

  // 2. Find tours with rendered id's
  const tourIds = bookings.map((el) => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIds } });

  res.status(200).render('overview', {
    title: 'My Tours',
    tours,
  });
});

exports.updateUserData = catchAsync(async (req, res, next) => {
  console.log('Updating User', req.body);
  const updateUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true,
      runValidators: true,
    },
  );
  res.status(200).render('account', {
    title: 'Your Account',
    user: updateUser,
  });
});
