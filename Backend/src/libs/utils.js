import jwt from "jsonwebtoken";

export const generateToken = (userID, res) => {
  const token = jwt.sign({ userID }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
  
  const cookieOptions = {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true, //prevent xss attacks cross site scripting
    sameSite: "lax", //csrf protection cross site request forgery
    secure: process.env.NODE_ENV !== "development", /// only send cookie over https in production
    path: "/", // Explicitly set cookie path
  };
  
  res.cookie("jwt", token, cookieOptions);
  console.log("Cookie set for user:", userID, "with options:", cookieOptions);
  
  return token;
};
