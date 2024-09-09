import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema({
subscriber:{
    type:Schema.ObjectId.ObjectId,
    ref:"User"
},
channel:{
    type:Schema.ObjectId.ObjectId,
    ref:"User"
}
},{timestamps:true})

export const Subscription = mongoose.model('Subscription',subscriptionSchema)