const mongoose = require('mongoose');
const userTemplate = new mongoose.Schema({
    email:{type:String},
    clicks:{type:String, default:"0"},
    username:{type:String},
    name:{type:String},
    bio:{type:String},
    themes:{type:String, default:"1"},
    links:[{
        id:{type:String},
        title:{type:String},
        type:{type:String},
        link:{type:String},
        icon:{type:String},
        visible:{type:Boolean},
        image:{type:String},
    }],
    buymeacoffee:{type:String},
    social: {
        instagram:{type:String,default:''},
        facebook:{type:String,default:''},
        youtube:{type:String,default:''},
        reddit:{type:String,default:''},
        linkedin:{type:String,default:''},
        twitter:{type:String,default:''},
        pinterest:{type:String,default:''},
        mail:{type:String,default:''},
        call:{type:String,default:''},
    },
    image:{type:String},
})

module.exports=mongoose.model('users', userTemplate);