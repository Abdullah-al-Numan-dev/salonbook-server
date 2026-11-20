export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  console.error(err);

  let status = err.status || 500;
  let message = err.message;

  if (err.name === "MulterError") {
    status = 400;
    message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Image must be 5MB or smaller"
        : "Invalid file upload";
  }

  res.status(status).json({
    success: false,
    message: status === 500 ? "Internal server error" : message,
  });
}