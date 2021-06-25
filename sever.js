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


// json web token verification
const verifyJwt=(req, res, next)=>{
    const token=req.headers['x-access-token'];
    if(!token){
        res.status(404).send("token invalid");
    }else{
        jwt.verify(token, process.env.secret_key, (err, decoded)=>{
            if(err){
                res.status(404).send("Invalid request");
            }else{
                next();
            }
        })
    }
}
app.get("/verify", verifyJwt, (req, res)=>{
    res.send("You have access");
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
app.post("/mySocioCard", (req, res)=>{
    console.log(req.body.Slno)
    userTemplate.find({username: req.body.username}, (err, result)=>{
        if(err){
            res.status(404).send(err)
        }else{
            // console.log("Found material: "+result.length)
            // console.log(result)
            if(result.length!=0)
                res.status(200).send(result);
            else{
                res.status(404).send("Theme not found");
            }
        }
    })
})

const checkUsername=(req, res, next)=>{
    // console.log(req.body)
    userTemplate.find({username: req.body.newUsername}, (err, result)=>{
        if(err){
            res.status(404).send(err)
        }else{
            if(result.length===0){
                next();
            }
            else{
                res.status(404).json({message:'Username is not avaiable'});
            }
        }
    })
}

app.post("/admin/updateUsername", checkUsername, (req, res)=>{
    console.log(req.body)
    const prevUsername=req.body.prevUsername;
    const newUsername=req.body.newUsername;
    userTemplate.updateOne({username:prevUsername}, {$set :{username:newUsername}})
    .then(response=>{
        res.status(200).send("Updated Successfully");
    })
    .catch(err=>{
        res.status(404).send("Error in update try again");
    })
})
app.post("/updateProfile",(req,res)=>{
        // console.log(req.body)
    userTemplate.updateOne({username: req.body.username}, {$set:{
        name:req.body.name,
        bio:req.body.bio,
    }})
    .then(result=>{
        console.log(result);
        res.status(200).send("Updated Successfully");
    })
    .catch(err=>{
        console.log(err)
        res.status(404).send("Error in update try again");
    })
})

app.post('/fetchDetails',(req,res)=>{
    userTemplate.find({username: req.body.username}, (err, result)=>{
        if(err){
            res.status(404).send(err)
        }else{
            if(result.length!==0){
                res.status(200).send(result)
            }
            else{
                res.status(404).send("User not found!!!")
            }
        }
    })
})
app.post("/googlelogin", (req, res)=>{
  const {tokenId}=req.body;
//   console.log(tokenId);
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