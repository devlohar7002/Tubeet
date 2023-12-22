const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode;
  res.statusCode = statusCode;
  res.json({
    message: err.message,
    stack: err.stack,
  });
  // switch (statusCode) {
  //   case 400:
  //     res.json({
  //       message: err.message,
  //       stack: err.stack,
  //     });
  //     break;

  //   default:
  //     console.log("No error all Ok!");
  // }
  next();
};

export { errorHandler };
