const jwt = require('jsonwebtoken');

const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );
};

module.exports = { generateToken };