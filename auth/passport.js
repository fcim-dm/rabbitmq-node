const JwtStrategy = require("passport-jwt").Strategy;
const { ExtractJwt } = require("passport-jwt");
const User = require("../models/User");

const jwtOptions = {
  secretOrKey: process.env.JWT_SECRET,
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("Bearer"),
};

const jwt = async (payload, done) => {
  try {
    const user = await User.findById(payload._id);
    if (user) return done(null, user);
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
};

exports.jwt = new JwtStrategy(jwtOptions, jwt);
