// Custom middleware exports
// Add your custom middleware here as the application grows

export const requestLogger = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
};
