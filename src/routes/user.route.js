import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  changeCurrentPassword,
  refershAcessToken,
  getCurrentUser,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannedlProfile,
  getWatchHistory,
  updateAccountDetails,
} from "../controllers/user.controller.js";
import upload from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

//note:receive avatar and cover image file_
router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refershToken").post(refershAcessToken);
router.route("/changePassword").patch(verifyJWT, changeCurrentPassword);
router.route("/userProfile").get(verifyJWT, getCurrentUser);
router.route("/updateProfile").patch(verifyJWT, updateAccountDetails);
router
  .route("/userChannelProfile/:username")
  .get(verifyJWT, getUserChannedlProfile);

router.route("/userWatchHistory").get(verifyJWT, getWatchHistory);

//note:receive only single avatar file_
router
  .route("/updateAvatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);

//note:receive only single cover image file_
router
  .route("/updateCoverImage")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);
export default router;
