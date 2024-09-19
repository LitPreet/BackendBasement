import mongoose, { Schema } from "mongoose";

const formSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    question: [{
      type: Schema.Types.ObjectId,
      ref:"Question",
    }],
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    totalSubmissions: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const Form = mongoose.model("Form", formSchema);
