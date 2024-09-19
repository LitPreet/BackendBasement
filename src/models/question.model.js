import mongoose, { Schema } from "mongoose";

const questionSchema = new Schema({
  questionType: {
    type: String,
    required: true,
  },
  questionTitle: {
    type: String,
    required: true,
  },
  Option: [String],
});

export const Question = mongoose.model("Question", questionSchema);
