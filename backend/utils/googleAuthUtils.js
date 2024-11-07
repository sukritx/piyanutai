const { generateToken } = require('./tokenUtils');

const googleCallback = (req, res) => {
    try {
        const token = generateToken(req.user);
        res.cookie('token', token, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production', 
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });
        res.redirect(`${process.env.FRONTEND_URL}/auth-callback`);
    } catch (error) {
        console.error('Error in Google callback:', error);
        res.redirect(`${process.env.FRONTEND_URL}/signin?error=${encodeURIComponent(error.message)}`);
    }
};

module.exports = { googleCallback };