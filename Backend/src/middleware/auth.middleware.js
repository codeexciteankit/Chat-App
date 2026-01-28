import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
    try {
        const token = req.cookies.jwt || req.header('Authorization')?.replace('Bearer ', '');
        console.log("protectRoute - Cookies:", req.cookies);
        console.log("protectRoute - Token:", token ? "Found" : "NOT FOUND");
        
        if (!token) {
            return res.status(401).json({ message: "No token, authorization denied" });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // req.user = await User.findById(decoded.id).select('-password');
        if(!decoded) {
            return res.status(401).json({ message: "Token is not valid" });
        }

        const user = await User.findById(decoded.userID).select('-password');
        if(!user) {
            return res.status(401).json({ message: "User not found" });
        }
        req.user = user;
        next();


    } catch (error) {
        console.log("Error in protectRoute middleware:", error.message);
        res.status(500).json({ message: "Internal Error" });
    }
}
