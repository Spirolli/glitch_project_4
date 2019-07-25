const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true})

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//CREATE DATABASE HERE
var Schema = mongoose.Schema;

var exerciserSchema = new Schema({
  username: String,
  exercise: [{description: String,
             duration: Number,
             date: Date}]
});

var exerciser = mongoose.model('exerciser', exerciserSchema);

//MIDDLEWARE that handles the capture of new users, one at a time.
//Returns object with username and _id given by database.
app.post('/api/exercise/new-user', function (req, res) {
  console.log("User has been posted to server.  Attempt will be made to save user to database.");
  var username = req.body.username;
  console.log("Username: " + username);
  if (!username) {
    // No username provided
    res.json({"Error": "Invalid username"});
  } else {
    var newExerciser = exerciser({"username": username, exercise: []});
    newExerciser.save( function (err) {
      console.log("New Exerciser has been saved");
      if (err) console.log(err);
    });
    res.json({"username": newExerciser.username, "_id": newExerciser.id});
  }
});

//MIDDLEWARE that prints to the usernames and their respective ids
app.get('/api/exercise/users', function (req,res) {
  console.log("User list is being requested.");
  exerciser.find({}, function (err, data) {
    if (err) console.log(err);
    else {
      res.send(data);
    }
  });
});

//MIDDLEWARE that returns the exercise information of a SPECIFIC USER
// GIVEN BY THE userId parameter.
app.get('/api/exercise/log/:userId/:from?/:to?/:limit?', function (req,res) {
  var userId = req.params.userId;
  var from = (req.params.from == '-' || req.params.from == undefined) ? undefined : new Date(req.params.from);
  var to = (req.params.to == '-' || req.params.to == undefined) ? undefined : new Date(req.params.to);
  var limit = (req.params.limit == undefined) ? undefined : parseInt(req.params.limit);
  if (!userId) {
    res.json({"Error": "No such userId exists"});
  } else {
    //Part of the code used here is adapted from a solution used on freeCodeCamp forums that worked by manipulating the data
    //itself rather than filtering using mongooses own query filters (which didn't seem to work).
    exerciser.findById(userId, function (err, result) {
      if (err) {
        res.send("User not found");
      } else {
        var exercises = result.exercise;
        if (from && to) {
          exercises = exercises.filter( (exercise) => {
            return (exercise.date >= from && exercise.date <= to);
          });
        } else if (from) {
          exercises = exercises.filter( (exercise) => {
            return (exercise.date >= from);
          });
          console.log('After: ' + exercises);
        } else if (to) {
          exercises = exercises.filter( (exercise) => {
            return (exercise.date <= to);
          });
        }
        if (limit && limit < exercises.length) {
          exercises = exercises.slice(0, limit);
        }
        
        console.log("\tUser found successfully!");
        res.json({"User": userId, "Exercises": exercises, "count": exercises.length});
      }
    });
  }
});

//MIDDLEWARE that adds exercise information for a user.  Returns the
//user accompanied by the exercise data that has been added.
app.post('/api/exercise/add', function (req, res) {
  console.log("New exercise information for user has been posted.");
  var userId = req.body.userId;
  var description = req.body.description;
  var duration = req.body.duration;
  var date = req.body.date;
  if (!userId && !description && !duration) {
    res.json({"Error": "Invalid exercise entry: missing required(*) paramaters"});
  }
  if (!date) {
    date = new Date();
  } else { date = new Date(date)};
  var exerciseObject = {"description": description,
                       "duration": duration,
                       "date": date};
  exerciser.findById(userId, function (err, data) {
    data.exercise.push(exerciseObject);
    data.save(function (err) {
      if (err) console.log(err);
      console.log("New exercise has been successfully saved")
    });
  });
  res.json({"user_id": userId, "Exercise": exerciseObject});
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
