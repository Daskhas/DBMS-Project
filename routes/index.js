const express = require("express");
var router = express.Router();
const passport = require("passport");
const User = require("../models/user");

// ROot
router.get("/", function (req, res) {
  res.redirect("/projects");
});

// Show Register Form
router.get("/register", function (req, res) {
  res.render("register");
});

// Handles Sign up i.e. Register
router.post("/register", function (req, res) {
  var newUser = new User({ username: req.body.username, user: req.body.user });
  User.register(newUser, req.body.password, function (err, user) {
    if (err) {
      console.log(err);
      res.render("register", { error: err.message });
    } else {
      passport.authenticate("local")(req, res, function () {
        req.flash("success", "Welcome " + user.user + "(" + user.username + ")" + "!!!");
        res.redirect("/projects");
      });
    }
  });
});



//changepassword
router.put("/changepassword", function (req, res) {
  User.findOne({ username: req.body.username }, (err, user) => {
    if (err) {
      console.log(err)
      res.redirect("/projects");
    } else {
      user.changePassword(req.body.oldpassword, req.body.newpassword, function (err, users) {
        if (err) {
          console.log(err)
          res.redirect("/projects");

        } else {

          User.updateOne({ _id: users._id }, { hash: users.hash, salt: users.salt }, (err, result) => {
            if (err) {
              console.log(err);
              res.redirect("/projects");
              
            } else {
              req.flash("success", "Password changed");
              res.redirect("/projects");
            }
          })
        }
      })
    }
  })
});

//forgotpassword
router.put("/forgotpassword", function (req, res) {
  User.findOne({ username: req.body.username }, (err, user) => {
    user.setPassword(req.body.password, function (err, users) {
      User.updateOne({ _id: users._id }, { hash: users.hash, salt: users.salt }, (err, result) => {
        if (err) {
          console.log(err);
        } else {
          req.flash("success", "Password changed");
          res.redirect("/projects");
        }
      })
    })
  })
});


// Show Login Form
router.get("/login", function (req, res) {
  res.render("login");
});

// Handle Login
router.post(
  "/login",
  passport.authenticate("local", {
    // successRedirect:'/projects',
    failureRedirect: "/projects",
    failureFlash: true,
    // successFlash:"Logged in succesfully"
  }),
  function (req, res) {
    req.flash("success", "Logged In");
    res.redirect("/projects");
  }
);

// Handle Logout
router.get("/logout", function (req, res) {
  req.flash("success", "Logged Out");
  req.logout();
  res.redirect("/projects");
});



module.exports = router;
