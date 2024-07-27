const express = require('express');
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');
// const reviewController = require('./../controllers/reviewController');
const reviewRouter = require('./../routes/reviewRouter');

const router = express.Router();

router.use('/:tourId/reviews', reviewRouter);

//router.param('id', tourController.checkID);
router.route('/top-5-cheap').get(tourController.aliasTopTours, tourController.getAllTours);
router.route('/tour-stats').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan,
  );

router.route('/tours-within/:distance/center/:latlng/unit/:unit').get(tourController.getToursWithin);
// /tour-within?distance=233&center=-40,45&unit=mi
// /tour-within/233/center/-40,45/unit/mi

router.route('/distance/:latlng/unit/:unit').get(tourController.getDistances);

//router.route('/').get(tourController.getAllTours).post(tourController.checkBody, tourController.createTour);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(authController.protect, authController.restrictTo('admin', 'lead-guide'), tourController.createTour);

router
  .route('/:id')
  .get(tourController.getTourById)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour,
  )
  .delete(authController.protect, authController.restrictTo('admin', 'lead-guide'), tourController.deleteTour);
//router.route('/:id').get(tourController.getTourById).patch(tourController.updateTour).delete(tourController.deleteTour);

// POST: tour/23232/reviews
// GET: tour/23232/reviews
// GET: tour/23232/reviews/32323

// router
//   .route('/:tourId/reviews')
//   .post(authController.protect, authController.restrictTo('user'), reviewController.createReview);

module.exports = router;
