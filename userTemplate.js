const mongoose = require('mongoose');
const userTemplate = new mongoose.Schema({
    email:{type:String},
    username:{type:String},
    name:{type:String},
    bio:{type:String},
    themes:{type:String},
    links:[{
        title:{type:String},
        link:{type:String},
        icon:{type:String},
        visible:{type:Boolean},
    }],
    avatar:{type:String},

})

module.exports=mongoose.model('users', userTemplate);