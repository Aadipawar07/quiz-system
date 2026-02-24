// Health check controller

export const getHealth = (req, res) => {
  res.status(200).json({
    status: 'Server running',
    timestamp: new Date().toISOString()
  });
};
