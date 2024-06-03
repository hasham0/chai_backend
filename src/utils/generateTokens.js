import User from "../models/user.model.js";
import ApiError from "./apiError.js";

const generateAccessTokenAndRefershTokens = async (userId) => {
  try {
    const user = await User.findById({ _id: userId });
    const genAccessToken = user.generateAccessToken();
    const genRefershToken = user.generateRefershToken();
    user.refershToken = genRefershToken;
    await user.save({ validateBeforeSave: false });
    return { genAccessToken, genRefershToken };
  } catch (error) {
    throw new ApiError(500, "token not generated");
  }
};

export default generateAccessTokenAndRefershTokens;
