/**
 * Request timeout middleware
 * Prevents long-running requests from hanging indefinitely
 */
export const requestTimeout = (seconds = 30) => {
  return (req, res, next) => {
    // Set timeout
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: 'Request timeout',
          message: `Request took longer than ${seconds} seconds to complete`
        });
      }
    }, seconds * 1000);

    // Clear timeout when response is sent
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    res.on('close', () => {
      clearTimeout(timeout);
    });

    next();
  };
};
