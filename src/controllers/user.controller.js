import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { parseDuration } from "../utils/parseTokenExpiry.js";
import { TemporaryUser } from "../models/temporaryUser.model.js";
import { generateOTP } from "../utils/generateOtp.js";
import { sendMail } from "../utils/sendMail.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Hash the refresh token before storing
    await user.hashRefreshToken(refreshToken);
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { email, fullName, username, password } = req.body;
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with this email and username already exists");
  }

  // const avatarLocalPath = req.files?.avatar[0]?.path;
  // let coverImageLocalPath;
  // if (
  //   req.files &&
  //   Array.isArray(req.files.coverImage) &&
  //   req.files.coverImage.length > 0
  // ) {
  //   coverImageLocalPath = req.files.coverImage[0].path;
  // }

  // if (!avatarLocalPath) {
  //   throw new ApiError(400, "Avatar file not found");
  // }

  const otp = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000; // OTP expires in 2 minutes
  const tempUser = await TemporaryUser.create({
    email,
    fullName,
    username,
    password,
    // avatar: avatarLocalPath,
    // coverImage: coverImageLocalPath,
    otp,
    expiresAt,
  });

  await tempUser.save();
console.log(email,'inside contr')
  await sendMail({ 
    email, 
    subject: "Your OTP Code", 
    text: `Your OTP Code is ${otp}` 
  });
  res
    .status(200)
    .json(
      new ApiResponse(
        201,
        {email},
        "OTP sent to your email. Please verify to complete registration."
      )
    );
  // const avatar = await uploadOnCloudinary(avatarLocalPath);
  // const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // if (!avatar) {
  //   throw new ApiError(400, "Avatar file is required");
  // }

  // const user = await User.create({
  //   fullName,
  //   avatar: avatar.url,
  //   coverImage: coverImage?.url || "",
  //   email,
  //   username: username.toLowerCase(),
  //   password,
  // });

  // const createdUser = await User.findById(user._id).select(
  //   "-password -refreshToken"
  // );

  // if (!createdUser) {
  //   throw new ApiError(500, "Something went wrong while registering the user");
  // }

  // return res
  //   .status(201)
  //   .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!(email || otp)) {
    throw new ApiError(400, "email and otp required");
  }
  const tempUser = await TemporaryUser.findOne({ email, otp });
  if (!tempUser || tempUser.expiresAt < Date.now()) {
    throw new ApiError(400, "Invalid or expired otp");
  }
  // const avatar = await uploadOnCloudinary(tempUser.avatar);
  // const coverImage = await uploadOnCloudinary(tempUser.coverImage);

  // if (!avatar) {
  //   throw new ApiError(400, "Avatar file is required");
  // }
  const user = await User.create({
    fullName: tempUser.fullName,
    email: tempUser.email,
    username: tempUser.username,
    password: tempUser.password,
  });

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // Clean up the temporary user record and OTP
  await TemporaryUser.deleteOne({ email, otp });

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }
  const accessTokenExpiry =
    parseDuration(process.env.ACCESS_TOKEN_EXPIRY) || 15 * 60 * 1000; // Default to 15 minutes
  const refreshTokenExpiry =
    parseDuration(process.env.REFRESH_TOKEN_EXPIRY) || 7 * 24 * 60 * 60 * 1000; // Default to 7 days

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, {
      ...options,
      maxAge: accessTokenExpiry,
    })
    .cookie("refreshToken", refreshToken, {
      ...options,
      maxAge: refreshTokenExpiry,
    })
    .json(new ApiResponse(200, {user:createdUser,accessToken}, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //req body
  //username or email
  // find the user
  //validate password
  // access and refresh token
  // send cookie

  const { email, username, password } = req.body;
  if (!(username || email)) {
    throw new ApiError(400, "username or email required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const logedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const accessTokenExpiry =
    parseDuration(process.env.ACCESS_TOKEN_EXPIRY) || 15 * 60 * 1000; // Default to 15 minutes
  const refreshTokenExpiry =
    parseDuration(process.env.REFRESH_TOKEN_EXPIRY) || 7 * 24 * 60 * 60 * 1000; // Default to 7 days

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, {
      ...options,
      maxAge: accessTokenExpiry,
    })
    .cookie("refreshToken", refreshToken, {
      ...options,
      maxAge: refreshTokenExpiry,
    })
    .json(
      new ApiResponse(
        200,
        {
          user: logedInUser,
          accessToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $set: {
      refreshToken: undefined,
    },
  });
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user || !(await user.isRefreshTokenCorrect(incomingRefreshToken))) {
      throw new ApiError(401, "Invalid refresh token or user not found.");
    }

    const accessToken = user.generateAccessToken();

    // Optionally generate a new refresh token if you want to rotate it
    const newRefreshToken = user.generateRefreshToken();
    await user.hashRefreshToken(newRefreshToken);
    await user.save({ validateBeforeSave: false });

    const accessTokenExpiry =
      parseDuration(process.env.ACCESS_TOKEN_EXPIRY) || 15 * 60 * 1000; // Default to 15 minutes
    const refreshTokenExpiry =
      parseDuration(process.env.REFRESH_TOKEN_EXPIRY) ||
      7 * 24 * 60 * 60 * 1000; // Default to 7 days

    const options = {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
    };

    // const accessToken = await generateAccessAndRefreshToken(user._id);
    // const newrefreshToken = await generateAccessAndRefreshToken(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, {
        ...options,
        maxAge: accessTokenExpiry,
      })
      .cookie("refreshToken", newRefreshToken, {
        ...options,
        maxAge: refreshTokenExpiry,
      })
      .json(new ApiResponse(200, {}, "Access Token refreshed successfully"));
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, `Invalid password`);
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User fethched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const userCoverImageLocalPath = req.file?.path;

  if (!userCoverImageLocalPath) {
    throw new ApiError(400, "CoverImage file is missing");
  }

  const coverImage = await uploadOnCloudinary(userCoverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "cover Image updated successfully"));
});

const gerUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "susbcribers",
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
          $condition: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
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

  if (!channel?.length) {
    throw new ApiError(404, "channel does not exist");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);
  return res.status(200).json(new ApiResponse(200, user[0].watchHistory));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  changeCurrentPassword,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  gerUserChannelProfile,
  getWatchHistory,
  verifyOTP
};
