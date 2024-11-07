const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const { generateToken } = require('../utils/tokenUtils');
const { z } = require('zod');
const passport = require('passport');
const crypto = require('crypto');
const logger = require('../utils/logger');

const signupSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters long"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
});

const signinSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

const signup = async (req, res) => {
    try {
        const validatedData = signupSchema.parse(req.body);
        const { name, email, password } = validatedData;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
        });

        const token = generateToken(user);
        res.cookie('token', token, { 
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });
        res.status(201).json({ user: { id: user._id, name: user.name, email: user.email } });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: error.errors });
        }
        res.status(500).json({ message: error.message });
    }
};

const signin = async (req, res) => {
    try {
        logger.info('Signin attempt:', req.body);  // Add this line for debugging
        const validatedData = signinSchema.parse(req.body);
        const { email, password } = validatedData;

        const user = await User.findOne({ email });
        if (!user) {
            logger.info('User not found:', email);
            return res.status(404).json({ message: 'User not found' });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            logger.info('Invalid password for user:', email);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(user);
        logger.info('Generated token:', token);
        res.cookie('token', token, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production', 
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });
        res.json({ user: { id: user._id, name: user.name, email: user.email } });
    } catch (error) {
        logger.error('Signin error:', error);  // Add this line for debugging
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: error.errors });
        }
        res.status(500).json({ message: error.message });
    }
};

const logout = (req, res) => {
    res.clearCookie('token');
    res.status(200).json({ message: 'Logged out successfully' });
};

const googleAuth = (req, res, next) => {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.oauthState = state;
    passport.authenticate('google', { 
        scope: ['profile', 'email'],
        state: state
    })(req, res, next);
};

const handleGoogleCallback = [
    (req, res, next) => {
        if (req.query.state !== req.session.oauthState) {
            return res.status(403).json({ message: 'Invalid state parameter' });
        }
        next();
    },
    passport.authenticate('google', { failureRedirect: '/signin' }),
    (req, res) => {
        try {
            logger.debug('Entering googleCallback');
            logger.debug('req.user:', req.user);

            if (!req.user) {
                throw new Error('Authentication failed: req.user is undefined');
            }
            
            const token = generateToken(req.user);
            const state = crypto.randomBytes(32).toString('hex');
            
            if (req.stateCache) {
                req.stateCache.set(state, true, 300); // Cache for 5 minutes
                logger.debug('Setting authState in cache:', state);
            } else {
                logger.error('req.stateCache is not available. Check your server setup.');
                throw new Error('Server configuration error');
            }

            res.cookie('token', token, { 
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production', 
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000 // 1 day
            });

            const redirectUrl = new URL('/auth-callback', process.env.FRONTEND_URL);
            redirectUrl.searchParams.append('state', state);

            logger.info('Redirecting to:', redirectUrl.toString());
            res.redirect(redirectUrl.toString());
        } catch (error) {
            logger.error('Error in Google callback:', error);
            res.redirect(`${process.env.FRONTEND_URL}/signin?error=${encodeURIComponent(error.message)}`);
        }
    }
];

const verifyState = (req, res) => {
    const { state } = req.body;
    
    if (!state) {
        return res.status(400).json({ message: 'State not provided' });
    }

    if (!req.stateCache) {
        logger.error('req.stateCache is not available. Check your server setup.');
        return res.status(500).json({ message: 'Server configuration error' });
    }

    const isValidState = req.stateCache.get(state);
    if (isValidState) {
        req.stateCache.del(state); // Remove the state from cache after verification
        res.status(200).json({ message: 'State verified' });
    } else {
        logger.warn('Invalid state. Received:', state);
        res.status(400).json({ message: 'Invalid state' });
    }
};

module.exports = {
    signup,
    signin,
    logout,
    googleAuth,
    handleGoogleCallback,
    verifyState
};