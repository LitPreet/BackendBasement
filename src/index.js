import dotenv from 'dotenv'
import connectDB from "./db/index.js";
import { app } from './app.js';

dotenv.config({
    path:'./env'
})

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000,() => {
        console.log(`app listening on ${process.env.PORT}`)
    })
})
.catch((err) => {
    console.log("MOONGO db connection failed",err)
})

//first approach to connect to database

// import express from "express";

// const app = express();

// (async () => {
//   try {
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//     app.on("error",(error) => {
//         console.log("Error",error)
//         throw error
//     })
//     app.listen(process.env.PORT,() => {
//         console.log(`app listening on ${process.env.PORT}`)
//     })
//   } catch (e) {
//     console.log("Error", e);
//     throw e;
//   }
// })();
