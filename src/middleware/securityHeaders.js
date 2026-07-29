function securityHeaders(req, res, next) {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.set("Permissions-Policy", "camera=(), geolocation=(), microphone=(), payment=(), usb=()");
  res.set("Content-Security-Policy", [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: https://gravatar.com",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
  ].join("; "));

  if (process.env.NODE_ENV === "production" && process.env.EMDIA_HTTPS_ENABLED === "1") {
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
}

module.exports = {
  securityHeaders,
};
