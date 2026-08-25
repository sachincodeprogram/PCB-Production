const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      name: user.name,
      role: user.role,
      assignedStage: user.assignedStage,
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
};

module.exports = generateToken;
