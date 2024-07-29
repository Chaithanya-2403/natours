const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('./../models/tourModel');
const Booking = require('./../models/bookingModel');
const AppError = require('../utils/appError');
const catchAsync = require('./../utils/catchAsyn');
const factory = require('./../controllers/handlerFactory');

exports.getCheckoutSession = async (req, res, next) => {
  // 1. Get currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  // 2. Create Checkout Session
  //try {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      // {
      //   // name: `${tour.name} Tour`,
      //   // description: tour.summary,
      //   // images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
      //   // amount: tour.price * 100,
      //   // currency: 'usd',
      //   price: tour.price * 100,
      //   quantity: 1,
      // },
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
          },
          unit_amount: tour.price * 100,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
  });
  //   } catch (err) {
  //     console.log(err.message);
  //   }

  // 3. Create session as response
  res.status(200).json({
    status: 'success',
    session,
  });
};

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  // This is only TEMPORARY, because it's UNSECURE: everyone can make bookings without payment
  const { tour, user, price } = req.query;
  if (!tour || !user || !price) return next();
  await Booking.create({ tour, user, price });
  res.redirect(req.originalUrl.split('?')[0]);
});

exports.createBooking = factory.createOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
exports.getBooking = factory.getOne(Booking);

exports.checkIsBooked = catchAsync(async (req, res, next) => {
  console.log(res.user);
  console.log(res.tour);
});
