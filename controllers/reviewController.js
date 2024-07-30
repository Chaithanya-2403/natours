const Review = require('./../models/reviewModel');
const AppError = require('../utils/appError');
const catchAsync = require('./../utils/catchAsyn');
const factory = require('./../controllers/handlerFactory');
const Booking = require('../models/bookingModel');

exports.setCreateUserIds = (req, res, next) => {
  // Allow nested routes
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  // console.log('User Id: ', req.body.user);
  // console.log('Tour Id: ', req.body.tour);
  next();
};
exports.getAllReviews = factory.getAll(Review);
exports.createReview = factory.createOne(Review);
exports.getReviewById = factory.getOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);

exports.checkIfBooked = catchAsync(async (req, res, next) => {
  const userData = req.user.id;
  const tourData = req.body.tour;
  // console.log('User Id: ', userData);
  // console.log('Tour Id: ', tourData);
  const booking = await Booking.find({ tour: tourData, user: userData });

  if (booking.length === 0) {
    next(new AppError('You did not book this tour to add a review..!', 401));
  } else {
    next();
  }
});
// exports.createReview = catchAsync(async (req, res, next) => {
//   const newReview = await Review.create(req.body);
//   res.status(201).json({
//     status: 'success',
//     data: {
//       review: newReview,
//     },
//   });
// });

// exports.getAllReviews = catchAsync(async (req, res) => {
//   // let filter = {};
//   // if (req.params.tourId) filter = { tour: req.params.tourId };
//   const reviews = await Review.find(filter);
//   res.status(200).json({
//     status: 'Success',
//     results: reviews.length,
//     data: {
//       reviews,
//     },
//   });
// });
