const sharp = require('sharp');
const multer = require('multer');
const Tour = require('./../models/tourModel');
const AppError = require('../utils/appError');
const catchAsync = require('./../utils/catchAsyn');
const factory = require('./../controllers/handlerFactory');

const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image. Please upload only images.', 400), false);
  }
};
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

// upload.single('image')
// upload.array('images', 5);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  //console.log(req.files);
  if (!req.files.imageCover || !req.files.images) return next();
  // 1. Processing Cover Image
  req.body.imageCover = `tour-${req.params.id}${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 1. Processing Images
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);
      req.body.images.push(filename);
    }),
  );
  next();
});

// Using MongoDB
exports.getAllTours = factory.getAll(Tour);
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);
exports.getTourById = factory.getOne(Tour, { path: 'reviews' });
// exports.createTour = catchAsync(async (req, res, next) => {
//   // const newTour = new Tour({});
//   // newTour.save();
//   //try {
//   const newTour = await Tour.create(req.body);
//   res.status(201).json({
//     status: 'success',
//     data: {
//       tour: newTour,
//     },
//   });
//   //} catch (err) {
//   //res.status(400).json({
//   //status: 'fail',
//   //message: err.message,
//   //});
//   //}
// });

exports.aliasTopTours = async (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingAverage,price';
  req.query.fields = 'name,price,ratingAverage,summary,difficulty';
  next();
};

// exports.getAllTours = catchAsync(async (req, res, next) => {
//   //try {
//   // 1a. Filtering

//   // // const tours_list = await Tour.find({
//   // //   duration: 5,
//   // //   difficulty: 'easy',
//   // // });

//   // // const tours_list = await Tour.find().where('duration').equals(5).where('difficulty').equals('easy');

//   // const queryObj = { ...req.query };
//   // const excludedFields = ['page', 'sort', 'limit', 'fields'];
//   // excludedFields.forEach((el) => delete queryObj[el]);
//   // console.log('Line no 39: ', req.query);

//   // 1b. Advanced Filtering

//   // let queryStr = JSON.stringify(queryObj);
//   // queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
//   // let query = Tour.find(JSON.parse(queryStr));

//   // 2. Sorting

//   // if (req.query.sort) {
//   //   const sortBy = req.query.sort.split(',').join(' ');
//   //   console.log(sortBy);
//   //   query = query.sort(sortBy);
//   // } else {
//   //   query = query.sort('-createdAt');
//   // }

//   // 3. Field Limiting

//   // if (req.query.fields) {
//   //   const fields = req.query.fields.split(',').join(' ');
//   //   query = query.select(fields);
//   // } else {
//   //   query = query.select('-__v');
//   // }

//   // 4. Pagination

//   // const page = req.query.page * 1 || 1;
//   // const _limit = req.query.limit * 1 || 100;
//   // const _skip = (page - 1) * _limit;
//   // // page=2&limit=10
//   // query = query.skip(_skip).limit(_limit);
//   // if (req.query.page) {
//   //   const numTours = await Tour.countDocuments();
//   //   if (skip >= numTours) throw new Error('This page does not exist');
//   // }

//   // Executes Query

//   const features = new APIFeatures(Tour.find(), req.query).filter().sort().limit().pagination();
//   const tours_list = await features.query;

//   // Send response
//   res.status(200).json({
//     status: 'Success',
//     requestedAt: req.requestTime,
//     results: tours_list.length,
//     data: {
//       tours: tours_list,
//     },
//   });
//   // } catch (err) {
//   //   // res.status(404).json({
//   //   //   status: 'fail',
//   //   //   message: err.message,
//   //   // });
//   //   //next(new AppError(err.message, 404));
//   // }
// });

exports.getTourStats = catchAsync(async (req, res, next) => {
  //try {
  const stats = await Tour.aggregate([
    {
      $match: { ratingAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
    // {
    //   $match: { _id: { $ne: 'EASY' } },
    // },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
  // } catch (err) {
  //   res.status(404).json({
  //     status: 'fail',
  //     message: err.message,
  //   });
  // }
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  //try {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: {
        _id: 0,
      },
    },
    {
      $sort: { numTourStarts: -1 },
    },
    // {
    //   $limit: 5,
    // },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
  // } catch (err) {
  //   res.status(404).json({
  //     status: 'fail',
  //     message: err.message,
  //   });
  // }
});

// /tours-within?distance=233&center=-40,45&unit=mi
// /tours-within/233/center/34.111745,-118.343432/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
  if (!lat || !lng) {
    next(new AppError('Please provide latitude and longitude in the format lat, lng', 400));
  }
  const tours = await Tour.find({ startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } } });
  console.log(distance, latlng, unit);
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: tours,
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  if (!lat || !lng) {
    next(new AppError('Please provide latitude and longitude in the format lat, lng', 400));
  }
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: distances,
  });
});

// exports.getTourById = catchAsync(async (req, res, next) => {
//   //try {
//   //console.log(req.params);
//   //const id = req.params.id * 1;
//   const tour = await Tour.findById(req.params.id).populate('reviews');
//   if (!tour) {
//     return next(new AppError('No tour found with that id', 404));
//   }
//   res.status(200).json({
//     status: 'Success',
//     data: {
//       tour,
//     },
//   });
//   // } catch (err) {
//   //   // res.status(404).json({
//   //   //   status: 'fail',
//   //   //   message: err.message,
//   //   // });
//   //   next(new AppError(err.message, 404));
//   // }
// });

// exports.updateTour = catchAsync(async (req, res, next) => {
//   //try {
//   const updatedTour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true,
//   });
//   if (!updatedTour) {
//     return next(new AppError('No tour found with that id', 404));
//   }
//   res.status(200).json({
//     status: 'success',
//     data: {
//       message: 'Tour Updated here..',
//       tour: updatedTour,
//     },
//   });
//   // } catch (err) {
//   //   res.status(404).json({
//   //     status: 'fail',
//   //     message: err.message,
//   //   });
//   // }
// });

// exports.deleteTour = catchAsync(async (req, res, next) => {
//   //try {
//   const tour = await Tour.findByIdAndDelete(req.params.id);
//   if (!tour) {
//     return next(new AppError('No tour found with that id', 404));
//   }
//   res.status(204).json({
//     status: 'success',
//     data: {
//       message: 'Tour deleted successfully..',
//     },
//   });
//   // } catch (err) {
//   //   res.status(404).json({
//   //     status: 'fail',
//   //     message: err.message,
//   //   });
//   // }
// });

// exports.getTourStats = async (req, res) => {
//   try {
//     const stats = await Tour.aggregate([
//       {
//         $match: { ratingAverage: { $gte: 4.5 } },
//       },
//       {
//         $group: {
//           _id: null,
//           numTours: { $sum: 1 },
//           numRatings: { $sum: '$ratingsQuantity' },
//           avgRating: { $avg: '$ratingAverage' },
//           avgPrice: { $avg: '$price' },
//           minPrice: { $min: '$price' },
//           maxPrice: { $max: '$price' },
//         },
//       },
//     ]);

//     res.status(200).json({
//       status: 'success',
//       data: {
//         stats,
//       },
//     });
//   } catch (err) {
//     res.status(404).json({
//       status: 'fail',
//       message: err,
//     });
//   }
// };

// Route handlers

// exports.checkID = (req, res, next, val) => {
//   console.log(`Tour id is ${val}`);
//   if (req.params.id * 1 > tours_list.length) {
//     return res.status(404).json({
//       status: 'fail',
//       message: 'Invalid Id',
//     });
//   }
//   next();
// };

// exports.checkBody = (req, res, next) => {
//   if (!req.body.name || !req.body.price) {
//     return res.status(400).json({
//       status: 'fail',
//       message: 'Missing name or price',
//     });
//   }
//   next();
// };

// const tours_list = JSON.parse(fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`));

// exports.getAllTours = async (req, res) => {
//   res.status(200).json({
//     status: 'Success',
//     requestedAt: req.requestTime,
//     results: tours_list.length,
//     data: {
//       tours: tours_list,
//     },
//   });
// };

// exports.getTourById = (req, res) => {
//   console.log(req.params);
//   const id = req.params.id * 1;
//   const tour = tours_list.find((el) => el.id === id);
//   res.status(200).json({
//     status: 'Success',
//     data: {
//       tour,
//     },
//   });
// };

// exports.createTour = (req, res) => {
//   //console.log(req.body);
//   const newId = tours_list[tours_list.length - 1].id + 1;
//   const newTour = Object.assign({ id: newId }, req.body);
//   tours_list.push(newTour);
//   fs.writeFile(`${__dirname}/../dev-data/data/tours-simple.json`, JSON.stringify(tours_list), (err) => {
//     res.status(201).json({
//       status: 'success',
//       data: {
//         tour: newTour,
//       },
//     });
//   });
//   //res.send('Done');
// };

// app.patch('/api/v1/tours/:id', (req, res) => {
//   const id = req.params.id * 1;
//   if (id > tours_list.length) {
//     res.status(404).json({
//       status: 'fail',
//       message: 'Invalid Id',
//     });
//   }
//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour: '<Updated tour here..>',
//     },
//   });
// });

// exports.updateTour = (req, res) => {
//   const id = req.params.id * 1;
//   const updates = req.body;
//   const tour = tours_list.find((el) => el.id === id);
//   console.log('Tour ID:', id);
//   console.log('Updates:', updates);
//   console.log(tour);
//   console.log(id);
//   tours_list[id] = { ...tours_list[id], ...updates };
//   console.log('Original Tour:', tours_list[id]);
//   fs.writeFileSync(`${__dirname}/dev-data/data/tours-simple.json`, JSON.stringify(tours_list, null, 2));
//   res.status(200).json({
//     status: 'success',
//     data: {
//       message: 'Tour Updated here..',
//       tour: tours_list[id],
//     },
//   });
// };

// exports.deleteTour = (req, res) => {
//   let tours_data = JSON.parse(fs.readFileSync(`${__dirname}/dev-data/data/tours-simple.json`));
//   const id = req.params.id * 1;
//   const tour = tours_data.find((el) => el.id !== id);
//   console.log('Tour ID:', id);
//   console.log(tour);
//   console.log(id);
//   tours_data = tours_data.filter((x) => x.id !== id);
//   console.log('Deleted Tour:', tours_data[id]);
//   fs.writeFileSync(`${__dirname}/dev-data/data/tours-simple.json`, JSON.stringify(tours_data, null, 2));
//   res.status(204).json({
//     status: 'success',
//     data: {
//       message: 'Tour deleted successfully..',
//     },
//   });
// };
