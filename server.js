
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const app = express();
const handlebars = require("express-handlebars");
const Sequelize = require('sequelize');
const multer = require("multer");
const { forEach } = require("lodash");
app.engine(".hbs", handlebars.engine({extname:'.hbs'}));
app.set('view engine', '.hbs')
const HTTP_PORT = process.env.PORT || 8080;
app.use(express.static('views'));
app.use(bodyParser.urlencoded({ extended: true}));
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "views/media");
    },
    filename: function (req, file, cb) {
      cb(
        null,
        file.fieldname + "-" + Date.now() + path.extname(file.originalname)
      );
    },
  });

const upload = multer({ 
    storage: storage,
  fileFilter: (req, file, cb) => {
      console.log(req.body);
    if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg" || file.mimetype == "image/gif") {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error('Only .png, .jpg, .jpeg and .gif format allowed!'));
    }
  }
});
// set up sequelize to point to our postgres database
var sequelize = new Sequelize('de7rvpp9llktsv', 'aomcxyvwxrmbll', '0933518d1943999ba86d67219a1a213cc0c6d62470bde22da93ebdf2830e0e5f', {
    host: "ec2-34-231-183-74.compute-1.amazonaws.com",
    dialect: 'postgres',
    port: 5432,
    dialectOptions: {
        ssl: { rejectUnauthorized: false }
    }
});

//database thingies:
const users = sequelize.define(
    "users",
    {
        id:{
            type: Sequelize.INTEGER,
            autoIncrement: true
        },
        email:{
            type:Sequelize.STRING,
            primaryKey: true,
            unique: true
        },
        fname: Sequelize.STRING,
        lname: Sequelize.STRING,
        phone: Sequelize.STRING,
        password: Sequelize.STRING,
        isAdmin: Sequelize.BOOLEAN
    },
    {
        timestamps: false
    }
)
const plans = sequelize.define('plans', {
    planName: 
    {
        type: Sequelize.STRING,
        unique: true
    },
    planPrice: Sequelize.DOUBLE,
    planDesc: Sequelize.TEXT,
    isPopular: Sequelize.BOOLEAN,
    planImgLoc: Sequelize.STRING,
    feature1: Sequelize.TEXT,
    feature2: Sequelize.TEXT,
    feature3: Sequelize.TEXT,
    feature4: Sequelize.TEXT
}, {timestamps: false});

//validations:
function containsSpecialChars(str) {
    const specialChars = /[`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;
    return specialChars.test(str);
}
function containsUpperCase(str){ 
    const upperCaseLetters = /[A-Z]/g;
    return upperCaseLetters.test(str);
}
function containsLowerCase(str){ 
    const upperLowerLetters = /[a-z]/g;
    return upperLowerLetters.test(str);
}
function containsNumbers(str){ 
    const numbers = /[0-9]/g;
    return numbers.test(str);
}
function correctLength(str){
    let isIt  = false;
    if(str.length >= 8 && str.length <= 16){  isIt = true;}
    return isIt;
}
function validateEmail(str) 
{
 const validEmail =  /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
 return validEmail.test(str);
}
function validatePhone(input_str) {
    const validPhone = /^\(?(\d{3})\)?[- ]?(\d{3})[- ]?(\d{4})$/;
    return validPhone.test(input_str);
  }
  saved_obj = {}; 
function saveDataBeforeChange(data){
    saved_obj = data;
}
function getDataForChange(){
    return saved_obj;
}
//server functions:
app.get("/", function(req,res){
    res.sendFile(path.join(__dirname,"/views/home.html"));

});
app.get("/home", function(req,res){
    res.sendFile(path.join(__dirname,"/views/home.html"));
});
app.get("/plans", function(req,res){
    resObj = [];
    plans.findAll().then((obj) =>{
        let data = obj.map((plans) => {return plans.dataValues});
        if(data.length > 0){
            res.render("plans", {data:data, layout:false})
        }
        else{
         console.log("No data!");
        }
        
    }
    );
    console.log(resObj);
});
app.get("/registration", function(req,res){
    res.render("registration", {resObj: "", layout: false});// render the registration.hbs
});
app.get("/signin", function(req,res){
    res.render("login", {resObj: "", layout: false});//render the login.hbs
});
app.get("/login", function(req,res){
    res.render("login", {resObj: "", layout: false});//render the login.hbs
});
app.get("/create_plans", function(req,res){
    res.render("create_plans", {resObj: "", layout: false});// render the create_plans.hbs
});

app.post("/plan_request", upload.single('planImage'), function(req, res){
    let looksGood = true;
    console.log(req.body);
    let resObj = {
        planName: req.body.planName,
        planPrice: req.body.planPrice,
        planDesc: req.body.planDesc,
        feature1: req.body.feature1,
        feature2: req.body.feature2,
        feature3: req.body.feature3,
        feature4: req.body.feature4,
        imgLocation: "",
        nameMsg: "",
        priceMsg: "",
        planMsg: "",
        featureMsg: "",
        imgMsg: "",
        isPopular: false
    };
    if(req.body.isPopular == 'yes'){
        resObj.isPopular = true;
    }
    if(req.file){
        resObj.imgLocation = '/media/' + req.file.filename;
    }else{
        resObj.imgLocation = null;
    }
    if (!resObj.feature1 && !resObj.feature2 && !resObj.feature3 && !resObj.feature4) {
        resObj.featureMsg = "At least one feature is required";
        looksGood = false;
    }
    if (!resObj.planName) { resObj.nameMsg = "Name is required"; looksGood = false; }
    if (!resObj.planPrice) { resObj.priceMsg = "Price is required"; looksGood = false; }
    if(isNaN(resObj.planPrice)){resObj.priceMsg = "Price needs to be a number"; looksGood = false;}
    if(!req.file){"You need to select an image"; looksGood = false;}
    if (looksGood) {
        // create a new row in the table
        if (resObj.isPopular) {
            plans.update({
                isPopular: false
            }, {
                where: { isPopular: false } // only update user with id == 2
            }).then(() => {
                console.log("successfully removed the plan from popularity");
            });
        }
        plans.create({
            planName: resObj.planName,
            planPrice: resObj.planPrice,
            planDesc: resObj.planDesc,
            isPopular: resObj.isPopular,
            planImgLoc: resObj.imgLocation,
            feature1 : resObj.feature1,
            feature2: resObj.feature2,
            feature3:resObj.feature3,
            feature4: resObj.feature4
        }).then((obj) => {
            res.sendFile(path.join(__dirname,"/views/home.html"));
        }).catch(() => {
            resObj.nameMsg = "Plan with this name already exists.";
        }
        );
    }else{
        res.render("create_plans", {resObj, layout: false});
    }
});
app.get("/edit_plans", (req, res) => {
    let resObj = [];
    plans.findAll().then((obj)=>{
        let data = obj.map((plans) => {return plans.dataValues});
        if(data.length > 0){
            data.forEach((plan)=>{
                resObj.push({name : plan.planName});
            });
            res.render("edit_plans", {resObj, layout : false})
        }
    });
});
app.post("/plan_edit_request",(req,res)=>{
    let resObj = {};
    if(req.body.actionOnPlans == "delete"){
        plans.destroy({
            where:{
                planName : req.body.planSelected
            }
        }).then(
            obj=>{
                console.log("A plan was removed");
                res.sendFile(path.join(__dirname,"/views/home.html"));
            }
        )
    }
    // find that plan in the database:
    else if( req.body.actionOnPlans =="update"){
    plans.findAll({where: {
        planName : req.body.planSelected
    }}).then((obj) =>{
        let data = obj.map((plans)=>{return plans.dataValues});
        if(data.length > 0){
            data.forEach((plan) => {
                resObj = plan;
                saveDataBeforeChange(resObj.planName);
            });
            console.log(resObj);
            resObj.planName;
            res.render("plan_edit_request", {resObj, layout: false});
        }
    }).catch(err =>{
        console.log(err);
    });
}
});
app.post("/plan_update",upload.single('planImage'),(req,res)=>{
    let looksGood = true;

    let resObj = {
        planName: req.body.planName,
        planPrice: req.body.planPrice,
        planDesc: req.body.planDesc,
        feature1: req.body.feature1,
        feature2: req.body.feature2,
        feature3: req.body.feature3,
        feature4: req.body.feature4,
        imgLocation: "",
        msg: "",
        isPopular: false
    };
    if(req.body.isPopular == 'yes'){
        resObj.isPopular = true;
    }
    if(req.file){
        resObj.imgLocation = "/media/" + req.file.filename;
    }else{
        resObj.imgLocation = null;
    }

    if (!resObj.feature1 && !resObj.feature2 && !resObj.feature3 && !resObj.feature4) {
        looksGood = false;
    }
    if (!resObj.planName)  looksGood = false; 
    if (!resObj.planPrice) looksGood = false;
    if(isNaN(resObj.planPrice)) looksGood = false;
    if(!req.file && looksGood){ // when the image is not being updated
        if(resObj.isPopular){
            plans.update(
                {isPopular : false},
                {where : {
                    isPopular : true
                }
            });
        }
        plans.update(
            {
                planName : resObj.planName,
                planPrice : resObj.planPrice,
                planDesc : resObj.planDesc,
                isPopular : resObj.isPopular,
                feature1 : resObj.feature1,
                feature2: resObj.feature2,
                feature3: resObj.feature3,
                feature4: resObj.feature4
            },{
                where: {
                    planName: getDataForChange()
                }
            }
        ).then(obj=>{
                    res.sendFile(path.join(__dirname,"/views/home.html"));
        }).catch(err =>{
            console.log("plan_update_error_no_img: " + err);
        });
    }
    if(req.file && looksGood){
        if(resObj.isPopular){
            plans.update(
                {isPopular : false},
                {where : {
                    isPopular : true
                }
            });
        }
        plans.update(
            {
                planName : resObj.planName,
                planPrice : resObj.planPrice,
                planDesc : resObj.planDesc,
                planImgLoc: resObj.imgLocation,
                isPopular : resObj.isPopular,
                feature1 : resObj.feature1,
                feature2: resObj.feature2,
                feature3:resObj.feature3,
                feature4: resObj.feature4
            },{
                where: {
                    planName: getDataForChange()
                }
            }
        ).then(obj=>{
            res.sendFile(path.join(__dirname,"/views/home.html"));
        }).catch(err =>{console.log("plan_update_error_with_img :" + err)});
    }
    if(!looksGood){ 
        resObj.msg = "Invailid data -- no changes were made";
        res.render("plan_edit_request", {resObj, layout : false});
    }
});

app.post("/login_request", function(req, res){
    let resObj= {msg:"",    // this is the message the willl be sent on an error
                userEmail:req.body.userUsername,    // so that we keep the value of the fields intact
                userPassword:req.body.userPassword,
                userFname : "",
                userLname: "",
                userPhone: "",
                isAdmin: ""
             }
    
    if(resObj.userEmail && resObj.userPassword){  // this will check if the username and the password are not null
    users.findAll({
        where: {
            email : resObj.userEmail,
            password : resObj.userPassword
        }
    }).then((obj) =>{
           let data = obj.map((users) => {return users.dataValues});
           if(data.length > 0){
               
                resObj.userFname = data[0].fname;
                resObj.userLname = data[0].lname;
                resObj.userPhone = data[0].phone;
                resObj.userPassword = "";
                resObj.isAdmin = data[0].isAdmin;
               console.log("This is the object: " + obj);
               console.log(data);
               if(resObj.isAdmin)
               res.render("dashboard_admin", {resObj: resObj, layout: false});
               else res.render("dashboard", {resObj: resObj, layout: false});
               
           }
           else{
            resObj.msg = "Email or password incorrect!";
            res.render("login", {resObj: resObj, layout: false});
           }
       }
       ).catch((err)=> {console.log(err);});
    }
    else{// show the alert if one of those is nulls
            resObj.msg = "Username or the password is missing!";
            res.render("login", {resObj: resObj, layout: false});
    }
});

app.post("/signup_request", function(req, res){
    let looksGood = true;   // assuming that the user is entering all the values correct
    let resObj = {
        userFname : req.body.userFName,
        userLname : req.body.userLName,
        userEmail : req.body.userEmail,
        userPhone : req.body.userPhone,
        userPassword : req.body.userPassword,
        userConfirmPass : req.body.userConfirmPassword,
        nameMsg : "",
        emailMsg : "",
        phoneMsg : "",
        passwordMsg : "",
        confirmPassMsg : "",
    };
        if(resObj.userFname && resObj.userLname){
        if(containsNumbers(resObj.userFname) || containsNumbers(resObj.userLname)){
            // show that the fname and the lname can not contain numbers
            resObj.nameMsg = "Name can not contain numbers!";
            looksGood = false;
        }
        else if(resObj.userFname.length < 2 || resObj.userLname.length < 2){
            // show that the fname and the lname need to be at least 2 characters long
            resObj.nameMsg = "Name needs to be at least 2 characters long!";
            looksGood = false;
        }
        else{
            resObj.nameMsg = "";
        }
    }else{resObj.nameMsg = "First name and Last name are required fields!"; looksGood = false;}

    if(resObj.userEmail){
        if(!validateEmail(resObj.userEmail)){
            // show that the email entered is not valid
            resObj.emailMsg = "Invalid email!";
            looksGood = false;
        }
        else{
            resObj.emailMsg = "";
        }
    }else{resObj.emailMsg = "Required Field";looksGood = false;}
if(resObj.userPhone){
        if(!validatePhone(resObj.userPhone)){
            // show that the phone number should only contain numbers
            resObj.phoneMsg = "Invalid phone number";
            looksGood = false;
        }
        else{
            resObj.phoneMsg = "";
        }
    }else{resObj.phoneMsg = "Required Field"; looksGood = false}
    
if(resObj.userPassword){
        if(containsLowerCase(resObj.userPassword)){
            // show that the password must contain lower case;
            resObj.passwordMsg = resObj.passwordMsg + "";
        }else {resObj.passwordMsg = "Password must contain lower case letters";
            looksGood = false;
    }
        if(containsUpperCase(resObj.userPassword)){
            // show that the password must contain upper case
            resObj.passwordMsg = resObj.passwordMsg + "";
        }else{
        resObj.passwordMsg = resObj.passwordMsg + "Password must contain upper case letters";
        looksGood = false;
        }
         if(containsNumbers(resObj.userPassword)){
            // show that the password must contain numbers
            resObj.passwordMsg = resObj.passwordMsg + "";

        }else{

        resObj.passwordMsg = resObj.passwordMsg + "Password must contain numbers";
        looksGood = false;
        }
        if(containsSpecialChars(resObj.userPassword)){
            // show that the password must contain at least one special char
            resObj.passwordMsg = resObj.passwordMsg + "";

        }else{
        resObj.passwordMsg = resObj.passwordMsg + "Password must contain special characters";
        looksGood = false;
        }
        if(correctLength(resObj.userPassword)){
            // show that the password must be between 8 to 16 characters long
            resObj.passwordMsg = resObj.passwordMsg + "";

        }else{
        resObj.passwordMsg = resObj.passwordMsg + "Password must be between 8 and 16 characters long";
        looksGood = false;
        }
    }else{resObj.passwordMsg = "Required Field"; looksGood = false;}
        if(resObj.userConfirmPass){
        if(resObj.userConfirmPass != resObj.userPassword){
            // show that they both must match
            resObj.confirmPassMsg = "Must match the password entered in the previous field";
            looksGood = false;
        }
        else{
            
        }

    }else{resObj.confirmPassMsg = "Required Field";}
    if(req.body.isAdmin == "yes"){
        resObj.isAdmin = true;
    }
    else if(req.body.isAdmin == "no"){
        resObj.isAdmin = false;
    }
    if(looksGood){
            users.create({
                fname: resObj.userFname,
                lname: resObj.userLname,
                email: resObj.userEmail,
                phone: resObj.userPhone,
                password: resObj.userPassword,
                isAdmin: resObj.isAdmin
            }).then((obj) => {
                console.log(obj);
                if(resObj.isAdmin) res.render("dashboard_admin", {resObj, layout: false});
                else res.render("dashboard", {resObj: resObj, layout: false});
            }).catch((err) =>{
                console.log(err);
                resObj.emailMsg = "Email already in use!"
                looksGood = false;
                res.render('registration', {resObj: resObj, layout: false});

            });

        }
        if(!looksGood){
            res.render('registration', {resObj: resObj, layout: false});
        }
});
app.use(function(req, res){
    res.status(404).sendFile(path.join(__dirname, 'views/pageNotFound.html'));
});

sequelize.sync().then(()=> {
    app.listen(HTTP_PORT);
    console.log("Listening on : " + HTTP_PORT);
})