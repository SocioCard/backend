const mongoose = require('mongoose');
const userTemplate = new mongoose.Schema({
    email:{type:String},
    username:{type:String},
    name:{type:String},
    bio:{type:String},
    themes:{type:String, default:"1"},
    links:[{
        title:{type:String},
        link:{type:String},
        icon:{type:String},
        visible:{type:Boolean},
        image:{type:String},
    }],
    buymeacoffee:{type:String},
    social: {
        instagram:{type:String},
        facebook:{type:String},
        youtube:{type:String},
        reddit:{type:String},
        linkedin:{type:String},
        twitter:{type:String},
        pinterest:{type:String},
        mail:{type:String},
        call:{type:String},
    },
    image:{type:String},
})

module.exports=mongoose.model('users', userTemplate);