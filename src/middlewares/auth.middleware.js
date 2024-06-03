import jwt from "jsonwebtoken";
import { ACCESS_TOKEN } from "../constant.js";
import asyncHandler from "../helpers/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import User from "../models/user.model.js";

const verifyJWT = asyncHandler(async (request, _, next) => {
  const token =
    request.cookies?.[ACCESS_TOKEN] ||
    request.header("Authrization")?.replace("Bearer ", "");
  if (!token) {
    throw new ApiError(401, "unauthorize token");
  }
  const verifyToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  const user = await User.findById({ _id: verifyToken._id });
  if (!user) {
    throw new ApiError(401, "invalid access token");
  }
  request.user = user;
  next();
});

//! export middleware
export { verifyJWT };
