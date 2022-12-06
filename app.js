var createError = require('http-errors');
var express = require('express');
var bcrypt = require('bcrypt');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var request = require('request')
const session = require('express-session');
require('dotenv').config();
const sessionStore = require('connect-mongo');
var cors = require('cors');
var app = express();
const userModel = require('./models/users.js')
const brain = require('brain.js')
const data = require('./public/model/data.json');    
const fs = require("fs");


app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 60000 * 60
  },
  store: sessionStore.create({
      mongoUrl: process.env.CONNECT_DB,
      ttl: 14 * 24 * 60 * 60,
      autoRemove: 'native'
  })
}));



app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


const network = new brain.recurrent.LSTM();






if(fs.existsSync("network_state.json")){
// Save network state to JSON file.
const networkState = JSON.parse(fs.readFileSync("network_state.json", "utf-8"));
network.fromJSON(networkState);
console.log("model exists, using model..")
}

else{
  const trainingData = data;
  network.train(trainingData, {
    log: (error) => console.log(error),
    iterations: 1000
  });
  const networkState = network.toJSON();
  fs.writeFileSync("network_state.json",  JSON.stringify(networkState), "utf-8");
  console.log("model created")
}

mongoose.connect(process.env.CONNECT_DB)
.then((data) => console.log("connection to mongosuccess"),
  err => console.log("connection to mongodb error")
)

let isAuth = (req,res,next) => {
  if(req.session.auth)
  {next();}
  else
  res.redirect('/login');
}

let isLogged = (req,res,next) =>
{
  if(req.session.auth){
    res.redirect('/ide')
  }
  else{
    next();
  }



}


app.get('/', (req,res) => {res.redirect('/index')})
app.get('/index', (req, res) => {res.redirect('https://francissoft.onrender.com')})
app.get('/ide', isAuth, (req,res) => {res.sendFile(__dirname + '/views/ide.html')})
app.post('/ide', (req,res) => {
  let output;
  let input = {
  "clientId":"1ee0502792a5b3315f688ca84becf0de",
  "clientSecret":"62c66381fc739ba62537a9ea2c7771c14daf53077832177b3fd94e01df9bb7f3",
  "script":req.body.script,
  "language":req.body.language,
  "versionIndex":"0"
};
  console.log(input)
  
  

  request({
    url: 'https://api.jdoodle.com/v1/execute',
    method: "POST",
    json: input
},
function (error, response, body) {
  
    res.send(body.output)
    console.log(body.output)
})



}
)
app.get('/login', isLogged,(req,res) => {res.sendFile(__dirname + '/views/login.html')})
app.get('/register',isLogged, (req,res) => {res.sendFile(__dirname + '/views/register.html')})
app.post('/register', async (req,res) => {

  let user = await userModel.findOne({email: req.body.email})

  if (user){
    res.send(false);
    console.log("user exists"); 
  }

  else {
    req.body.password = await bcrypt.hash(req.body.password, 15);
    user = new userModel(req.body);
    user.save().then((data) => {console.log('success register')
    res.send(true)
  },
    err => {
      res.send(err),
      console.log(err)}
    )
  }
  
  })



app.post('/login', async (req,res) => {

  let user = await userModel.findOne({email: req.body.email})

  if (user){
      bcrypt.compare(req.body.password, user.password, (err, data) => {
        if(data){
        req.session.auth = true;
        req.session.save((err, data)=> {
          if (err){
            console.log(err)
          res.send(err) 
         }
          else{
            console.log(req.session)
           res.send(req.session)
          }
      
      });
      }

      else{
       console.log(req.session)
       res.send(false)
      }


    }
    
    
    )
}

  else 
  { 
    console.log("DNE")
    res.send({DNE: true})
  }

        
}
      

)


app.get('/logout', (req, res) => {req.session.destroy()

  res.redirect("/index");

})

app.post('/helpbot', (req, res) => {

  
  const output = network.run(`${req.body.input}`);
  console.log("Input: " + req.body.input);
  console.log("Output: " + output);
  res.send(output);
  

})

app.use((req,res)=>{res.send('404 not found hehe')});



// catch 404 and forward to error handler

module.exports = app;
