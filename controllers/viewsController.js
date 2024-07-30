const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsyn');
const AppError = require('../utils/appError');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const Review = require('../models/reviewModel');

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
  const specificTourId = tour._id;
  const specificUserId = res.locals.user._id;
  // Checking login user booked this tour or not
  const bookedTour = await Booking.findOne({ tour: tour._id, user: res.locals.user._id });
  //console.log('Tour Data: ', bookedTour);
  let is_booked = false;
  if (bookedTour != null) {
    is_booked = true;
  }
  console.log('Is booked: ', is_booked);

  // Checking login user given review or not for this tour

  const review = await Review.findOne({ tour: tour._id, user: res.locals.user._id });
  console.log('Review Data: ', review);
  let is_reviewed = false;
  if (review != null) {
    is_reviewed = true;
  }
  console.log('Is reviewed: ', is_reviewed);

  if (!tour) {
    return next(new AppError('There is not tour with that name', 404));
  }
  // 2. Build template

  // 3. Render template using data from point 1

  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour,
    is_booked,
    is_reviewed,
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
