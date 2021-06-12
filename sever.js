const express=require('express');
const app=express();
const mongoose=require('mongoose');
const cors=require('cors');
const dotenv=require('dotenv');
const passport=require('passport');
const fetch=require('node-fetch');
const jwt=require("jsonwebtoken");
const {OAuth2Client}=require('google-auth-library');
const client=new OAuth2Client("769406402556-njlr65a4ujf3t6knd4dv7hj4jf0f6ihv.apps.googleusercontent.com");
const userTemplate=require('./userTemplate');

dotenv.config();

//Connecting mongodb 
mongoose.connect(process.env.Database_access, ()=>console.log("database connected"));

//middlewares
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

app.get("/", (req, res)=>{
    res.status(200).send("Hello world")
})

//random string generator for username
const characters ='abcdefghijklmnopqrstuvwxyz0123456789._$';
function randomString(length) {
    let result = '';
    const charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}

app.post("/googlelogin", (req, res)=>{
  const {tokenId}=req.body;
  client.verifyIdToken({idToken:tokenId, audience: "769406402556-njlr65a4ujf3t6knd4dv7hj4jf0f6ihv.apps.googleusercontent.com"} )
  .then(response=>{
    const {email_verified, name, email}=response.payload;
    if(email_verified){
        userTemplate.findOne({email}, (err, result)=>{
            if(result){
                const token=jwt.sign({email:result.email}, process.env.secret_key, {expiresIn:'50m'})
                res.status(200).send({token:token, user:result});
            }else{
                let username=name.replace(" ", "_")+randomString(6);
                let newUser=new userTemplate({email,username, name, bio:"", themes:"", link:[]});
                newUser.save((err, data)=>{
                    if(err){
                        console.log(err);
                        res.status(404).send("Something went wrong");
                    }else{
                        const token=jwt.sign({email:email}, process.env.secret_key, {expiresIn:'50m'})
                        res.status(200).send({token:token, user:{email, username, name, bio:'', themes:'', link:[]}});
                    }
                })
            }
        })
    }else{
        res.status(404).send("Error in google OAuth");
    }
})
})
app.post("/facebooklogin", (req, res)=>{
    const {userId, accessToken}=req.body;
    let urlGraphFacebook=`https://graph.facebook.com/v2.11/${userId}/?fields=id,name,email&access_token=${accessToken}`;
    fetch(urlGraphFacebook, {
        methond:'GET'
    })
    .then(response => response.json())
    .then(response =>{
        console.log(response);
        const {email, name}=response;
        userTemplate.findOne({email}, (err, result)=>{
            if(err){
                res.status(404).send("Something went wrong");
            }else{
                if(result){
                    const token=jwt.sign({_id:result._id}, process.env.secret_key, {expiresIn:'50m'})
                    res.status(200).send({token:token, user:result});
                }else{
                    let username=name.replace(" ", "_").toLowerCase()+randomString(6);
                    let bio="Add your bio here"
                    let newUser=new userTemplate({email,username, name, bio:"", themes:"", link:[]});
                    newUser.save((err, data)=>{
                        if(err){
                            res.status(404).send("Something went wrong");
                        }else{
                            const token=jwt.sign({email:email}, process.env.secret_key, {expiresIn:'50m'})
                            res.status(200).send({token:token, user:{email, username, name, bio:'', themes:'', link:[]}});
                        }
                    })
                }
            }
        });
    });
})

app.listen(process.env.PORT||5000, ()=>{
    console.log('Server started');
})