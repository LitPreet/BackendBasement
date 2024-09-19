import mongoose, { Schema } from "mongoose";

const formSubmissionSchema = new Schema({
form:{
    type:Schema.ObjectId.ObjectId,
    ref:"form",
    required:true
},
responses:[{
    question:{
        type:Schema.Types.ObjectId,
        ref:'Question',
        required:true
    },
    answer:{
        type:Schema.Types.Mixed,
        required:true
    }
}]
},{timestamps:true})

export const FormSubmission = mongoose.model('FormSubmission',formSubmissionSchema)