import uploadOnCloudinary from "../utils/cloudinary.js";
import asyncHandler from "../helpers/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponce.js";
import User from "../models/user.model.js";
import generateAccessTokenAndRefershTokens from "../utils/generateTokens.js";
import jwt from "jsonwebtoken";
import { ACCESS_TOKEN, REFRESH_TOKEN, cookieOptions } from "../constant.js";
import mongoose from "mongoose";

const registerUser = asyncHandler(async (request, response) => {
  const { fullname, email, username, password } = request.body;
  const checkFields = [fullname, email, username, password].some(
    (field) => field?.trim() === ""
  );
  if (checkFields) {
    throw new ApiError(400, "all fields are required");
  }
  const isUserExisted = await User.findOne({ $or: [{ email }, { username }] });
  if (isUserExisted) {
    throw new ApiError(409, "user with email or username is already exist");
  }
  const avatarLocalPath = request.files?.avatar[0]?.path;
  const coverImageLocalPath = request.files?.coverImage[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar file is required");
  }
  const avatarUrl = await uploadOnCloudinary(avatarLocalPath);
  let coverUrl = "";
  if (coverImageLocalPath) {
    coverUrl = await uploadOnCloudinary(coverImageLocalPath);
  }
  if (!avatarUrl) {
    throw new ApiError(400, "avatar file is required");
  }
  const createdUser = await User.create({
    username,
    email,
    fullname,
    password,
    avatar: avatarUrl.url,
    coverImage: coverUrl.url,
  });
  if (!createdUser) {
    throw new ApiError(500, "user created issue");
  }
  return response
    .status(200)
    .json(new ApiResponse(200, createdUser, "user register successfully"));
});

const loginUser = asyncHandler(async (request, response) => {
  const { email, password } = request.body;
  const checkFields = [email, password].some((field) => field?.trim() === "");
  if (checkFields) {
    throw new ApiError(400, "all fields are required");
  }
  const isUserExisted = await User.findOne({
    email: email,
  }).select({ password: true });
  if (!isUserExisted) {
    throw new ApiError(404, "user not found");
  }
  const isPasswordValid = await isUserExisted.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "password incorrect");
  }
  const { genAccessToken, genRefershToken } =
    await generateAccessTokenAndRefershTokens(isUserExisted._id);

  const loggedInUser = await User.findById({ _id: isUserExisted._id });

  return response
    .status(200)
    .cookie(ACCESS_TOKEN, genAccessToken, cookieOptions)
    .cookie(REFRESH_TOKEN, genRefershToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          genAccessToken,
          genRefershToken,
        },
        "user logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (request, response) => {
  await User.findByIdAndUpdate(
    { _id: request.user._id },
    {
      $unset: {
        refershToken: 1,
      },
    },
    { new: true }
  );
  const cookieOptions = {
    httpOnly: true,
    secure: true,
  };
  return response
    .status(200)
    .clearCookie(ACCESS_TOKEN, cookieOptions)
    .clearCookie(REFRESH_TOKEN, cookieOptions)
    .json(new ApiResponse(200, {}, "user logged out"));
});

const refershAcessToken = asyncHandler(async (request, response) => {
  const incomingRefershToken =
    request.cookies?.[REFRESH_TOKEN] || request.body[REFRESH_TOKEN];
  if (!incomingRefershToken) {
    throw new ApiError(401, "unauthorize request");
  }
  const decodedRefershToken = jwt.verify(
    incomingRefershToken,
    process.env.REFERSH_TOKEN_SECRET
  );
  const user = await User.findById({ _id: decodedRefershToken._id }).select({
    refershToken: true,
  });
  if (!user) {
    throw new ApiError(401, "invalid refersh token");
  }
  if (user.refershToken !== incomingRefershToken) {
    throw new ApiError(401, "refersh token is not matched or used");
  }
  const { genAccessToken, genRefershToken } =
    await generateAccessTokenAndRefershTokens(user._id);

  return response
    .status(200)
    .cookie(ACCESS_TOKEN, genAccessToken, cookieOptions)
    .cookie(REFRESH_TOKEN, genRefershToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          genAccessToken,
          genRefershToken,
        },
        "token refersh successfully"
      )
    );
});

const changeCurrentPassword = asyncHandler(async (request, response) => {
  const { oldPassword, newPassword } = request.body;

  const checkFields = [oldPassword, newPassword].some(
    (field) => field?.trim() === ""
  );
  if (checkFields) {
    throw new ApiError(400, "all fields are required");
  }

  const user = await User.findById({ _id: request.user?._id }).select({
    password: 1,
  });
  const isPasswordMatched = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordMatched) {
    throw new ApiError(400, "password not matched");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: true });
  return response
    .status(200)
    .json(new ApiResponse(200, {}, "password changed successfuly"));
});

const getCurrentUser = asyncHandler(async (request, response) => {
  const user = request.user;
  const isUserExisted = await User.findById({ _id: user._id });
  if (!isUserExisted) {
    throw new ApiError(409, "user with email or username is not exist");
  }
  return response
    .status(200)
    .json(new ApiResponse(200, isUserExisted, "user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (request, response) => {
  const { fullname, username } = request.body;
  const checkFields = [fullname, username].some(
    (field) => field?.trim() === ""
  );
  if (checkFields) {
    throw new ApiError(400, "all fields are required");
  }
  const user = await User.findByIdAndUpdate(
    { _id: request.user?._id },
    {
      $set: {
        fullname,
        username,
      },
    },
    { new: true }
  );
  await user.save({ validateBeforeSave: false });
  return response
    .status(200)
    .json(new ApiResponse(200, user, "details changed successfuly"));
});

const updateUserAvatar = asyncHandler(async (request, response) => {
  const avatarLocalPath = request.file.path; //note:receive only single avatar file_
  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar is missing");
  }
  const updatedAvatar = await uploadOnCloudinary(avatarLocalPath);
  if (!updatedAvatar.url) {
    throw new ApiError(400, "error while updating avatar");
  }
  const user = await User.findByIdAndUpdate(
    { _id: request.user?._id },
    {
      $set: {
        avatar: updatedAvatar.url,
      },
    },
    { new: true }
  );
  await user.save({ validateBeforeSave: false });

  return response
    .status(200)
    .json(new ApiResponse(200, user, "avatar update successfuly"));
});

const updateUserCoverImage = asyncHandler(async (request, response) => {
  const coverImageLocalPath = request.file.path; //note:receive only single cover image file_
  if (!coverImageLocalPath) {
    throw new ApiError(400, "cover image is missing");
  }
  const updatedCoverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!updatedCoverImage.url) {
    throw new ApiError(400, "error while updating cover image");
  }
  const user = await User.findByIdAndUpdate(
    { _id: request.user?._id },
    {
      $set: {
        coverImage: updatedCoverImage.url,
      },
    },
    { new: true }
  );
  await user.save({ validateBeforeSave: false });

  return response
    .status(200)
    .json(new ApiResponse(200, user, "cover image update successfuly"));
});

const getUserChannedlProfile = asyncHandler(async (request, response) => {
  const { username } = request.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing");
  }

  const channelData = await User.aggregate([
    {
      $match: {
        username: username.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [
                new mongoose.Types.ObjectId(request.user?._id),
                "$subscribers.subscriber",
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channelData.length) {
    throw new ApiError(404, "Channel does not exist");
  }

  return response
    .status(200)
    .json(
      new ApiResponse(200, channelData[0], "User channel fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (request, response) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(request.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistoryData",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "ownerData",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    fullname: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              ownerData: {
                $first: "$ownerData",
              },
            },
          },
        ],
      },
    },
    {
      $project: {
        watchHistoryData: 1,
      },
    },
  ]);
  if (!user || user.length === 0) {
    throw new ApiError(404, "user not exist");
  }

  return response
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistoryData,
        "watch history fetched successfully"
      )
    );
});

//! export controllers_
export {
  registerUser,
  loginUser,
  logoutUser,
  refershAcessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannedlProfile,
  getWatchHistory,
};
