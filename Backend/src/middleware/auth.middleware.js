import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
    try {
        const token = req.cookies.jwt || req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: "No token, authorization denied" });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // req.user = await User.findById(decoded.id).select('-password');
        if(!decoded) {
            return res.status(401).json({ message: "Token is not valid" });
        }

        const user = await User.findById(decoded.userID).select('-password +isDisabled');
        if(!user || user.isDisabled) {
            return res.status(401).json({ message: "User not found" });
        }
        req.user = user;
        next();


    } catch (error) {
        res.status(401).json({ message: "Authentication required" });
    }
}
