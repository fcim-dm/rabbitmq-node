const passport = require("passport");
const jwt = require("jsonwebtoken");
const { ExtractJwt } = require("passport-jwt");

const jwtOptions = {
  secretOrKey: process.env.JWT_SECRET,
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("Bearer"),
};

const handleJWT = (req, res, next) => async (err, user, info) => {
  const error = err || info;

  try {
    const logIn = req.logIn;
    if (error || !user) throw error;
    await logIn(user, {
      session: false,
    });
  } catch (e) {
    return next(e);
  }

  req.user = user;
  return next();
};

exports.authorize = () => (req, res, next) => {
  // check for token in query
  if (req.query.token) {
    req.headers.authorization = "Bearer " + req.query.token;
    req.headers["content-type"] = "application/json";
  }

  // auth passport
  passport.authenticate(
    "jwt",
    {
      session: false,
    },
    handleJWT(req, res, next)
  )(req, res, next);
};
