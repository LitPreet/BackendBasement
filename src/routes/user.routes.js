import { Router } from "express";
import {
  changeCurrentPassword,
  gerUserChannelProfile,
  getCurrentUser,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifJWT } from "../middlewares/auth.middleware.js";

const router = Router();

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

//secured routes
router.route("/logout").post(verifJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifJWT, changeCurrentPassword);
router.route("/current-user").get(verifJWT, getCurrentUser);
router.route("/update-account").patch(verifJWT, updateAccountDetails);

router
  .route("/avatar")
  .patch(verifJWT, upload.single("avatar"), updateUserAvatar);
router
  .route("/cover-image")
  .patch(verifJWT, upload.single("coverImage"), updateUserCoverImage);
router.route("/c/:username").get(verifJWT, gerUserChannelProfile);
router.route("/history").get(verifJWT, getWatchHistory);

export default router;
