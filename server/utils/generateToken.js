const jwt = require('jsonwebtoken');

const generateToken = (user, deviceId) => {
  return jwt.sign(
    {
      id: user._id,
      name: user.name,
      role: user.role,
      assignedStage: user.assignedStage,
      // Mongo _id of the approved device this session is bound to.
      did: deviceId,
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
};

module.exports = generateToken;
