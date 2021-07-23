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
const newsletterSubscriber=require('./newsletterSubscribers');
const nodemailer = require("nodemailer");
const multer = require('multer');
var path = require('path');
const newsletterSubscribers = require('./newsletterSubscribers');

var router = express.Router();
router.use(express.static(__dirname+"./public"));
dotenv.config();

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'contact.sociocard@gmail.com',
      pass: 'sociocard#1234'
    }
});


var Storage = multer.diskStorage({
    destination: './public/uploads',
    filename:(req,file,cb)=>{
        cb(null,file.fieldname+'_'+Date.now()+path.extname(file.originalname));
    }
});

//multer middleware
var upload = multer({
    storage:Storage
}).single('file');


//Connecting mongodb 
mongoose.connect(process.env.Database_access, ()=>console.log("database connected"));

//middlewares
app.use(cors());
app.use(passport.initialize());
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));


app.get("/", (req, res)=>{
    res.status(200).send("welcome to sociocard's server")
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
    //console.log(req.body.Slno)
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
                res.status(200).json({message:'Username is not avaiable'});
            }
        }
    })
}

app.post("/admin/updateUsername", checkUsername, (req, res)=>{
    //console.log(req.body)
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
        image:req.body.image,
    }})
    .then(result=>{
        //console.log(result);
        res.status(200).send("Updated Successfully");
    })
    .catch(err=>{
        console.log(err)
        res.status(404).send("Error in update try again");
    })
})

app.post('/admin/deleteAccount', (req,res)=>{
    //console.log("account to be deleted: "+req.body.id);
    userTemplate.deleteOne({username:req.body.id})
    .then(response=>{
        //console.log(response)
        res.status(200).send("Account deleted");
    })
    .catch(err=>{
        console.log(err)
        res.status(404).send("Error in deleting account...Try Again");
    })
})

app.post("/googlelogin", (req, res)=>{
  const {tokenId}=req.body;
  //console.log(tokenId);
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
                let newUser=new userTemplate({email,username, name, bio:"", themes:"1", link:[]});
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
        //console.log(response);
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
                    let newUser=new userTemplate({email,username, name, bio:"", themes:"1", link:[]});
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

app.post('/updateUser', upload, (req, res)=>{
    const {user,id} = req.body;
    // console.log(id);
    //console.log(user);
    userTemplate.updateOne({username:id}, {$set:{
        email:user.email,
        username:user.username,
        name:user.name,
        bio:user.bio,
        themes:user.themes,
        buymeacoffee:user.buymeacoffee,
        links:user.links,
        social:user.social,
        image:user.image,
        videoLink:user.videoLink,
        videoTitle:user.videoTitle,
    }})
    .then(result=>{
        res.json(result);
        console.log("user details updated for "+id);
    })
    .catch(err=>{
        res.json(err);
        console.log('error');
    })
})


app.post("/userDetails", (req,res) => {
    //console.log(req.body);
    const {id} = req.body;
    //console.log(id);
    userTemplate.find({username:id}, (err,result) => {
        if(err){
            console.log(err)
        }
        else{
            //console.log(result)
            // let imgName = result[0].image;  
            // if(imgName!=undefined&&imgName!="")
            //     filepath = __dirname+'/public/uploads/'+imgName;
            res.send(result);
        }
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

app.post('/subscribeNewsletter',(req,res)=>{
    //console.log(req.body)
    let subscriber = new newsletterSubscriber({
        email:req.body.email,
    })
    subscriber.save(function (err, subscriber) {
        if (err) return console.error(err);
        console.log(subscriber.email + " saved to subscriber collection.");
    });
    var mailOptions = {
        from: 'contact.sociocard@gmail.com',
        to: subscriber.email,
        subject: 'Welcome!',
        html: "<b>Thanks for subscribing to out Newsletter. Checkout our features!</b>",
        text: 'Thanks for subscribing to out Newsletter. Checkout our features!'
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
    });
})


app.listen(process.env.PORT||6000, '0.0.0.0', ()=>{
    console.log('Server started');
})