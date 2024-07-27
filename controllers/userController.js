const sharp = require('sharp');
const multer = require('multer');
const fs = require('fs');
const User = require('../models/userModel');
const catchAsyn = require('../utils/catchAsyn');
const AppError = require('../utils/appError');
const factory = require('./../controllers/handlerFactory');

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     // cb means callback
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   },
// });
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

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsyn(async (req, res, next) => {
  if (!req.file) return next();
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);
  next();
});

//const users_list = JSON.parse(fs.readFileSync(`${__dirname}/dev-data/data/users.json`));

exports.getAllUsers = factory.getAll(User);
exports.getUserById = factory.getOne(User);
// Do not update passwords
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsyn(async (req, res, next) => {
  // 1. Create error if user post password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError('This route is not for password updates, please use /updateMyPassword', 400));
  }

  // 2. Update user document
  const filteredBody = filterObj(req.body, 'name', 'email');
  // console.log(req);
  if (req.file) filteredBody.photo = req.file.filename;
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, { new: true, runValidators: true });
  //user.name = req.user.name;
  //await user.save();
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsyn(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// exports.getAllUsers = async (req, res) => {
//   const users = await User.find();
//   // Send response
//   res.status(200).json({
//     status: 'Success',
//     results: users.length,
//     data: {
//       users: users,
//     },
//   });
// };

// exports.getUserById = (req, res) => {
//   res.status(500).json({
//     status: 'Error',
//     message: 'This route is not yet defined..',
//   });
// };

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'Error',
    message: 'This route is not defined. Please use signup instead..',
  });
};
