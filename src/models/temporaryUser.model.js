import mongoose, { Schema } from "mongoose";

const temporaryUserSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, "password is required"],
    },
    // avatar: {
    //   type: String,
    //   required: true,
    // },
    // coverImage: {
    //   type: String,
    // },
    otp: { type: String, required: true }, // Store OTP for verification
    expiresAt: { type: Date, required: true }, // Add expiry for temporary data
  },
  { timestamps: true }
);

export const TemporaryUser = mongoose.model(
  "TemporaryUser",
  temporaryUserSchema
);
