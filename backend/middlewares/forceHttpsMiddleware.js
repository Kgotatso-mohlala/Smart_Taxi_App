const forceHttpsMiddleware = (req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
  };
  
  module.exports = forceHttpsMiddleware;
  