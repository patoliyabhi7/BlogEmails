const mongoose = require("mongoose")
const dotenv = require("dotenv");

dotenv.config({ path: "./.env" });

const app = require("./app");

const DB = process.env.DATABASE;
mongoose.connect(DB).then(() => console.log("DB Connection Successfull!"));
app.get('/', (req,res)=>{
    res.status(200).send("Welcome!!")
})

const port = process.env.PORT || 8000;
app.listen(port, ()=>{
    console.log(`App is running on port ${port}`)
})