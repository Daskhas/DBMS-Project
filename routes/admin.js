const express = require("express");
var router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const multer = require('multer')
const csv = require('fast-csv');
const cors = require("cors");
const fs = require('fs');
const middleware = require('../middleware/index1');
const { isAdmin } = require("../middleware/index1");
const mysql = require('mysql');
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database:'projectdatabase'
   });


const fileStorageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log("erore hereer")
        cb(null, "./csvfiles"); //important this is a direct path fron our current file to storage location
    },
    filename: (req, file, cb) => {
        cb(null, "test.csv");
    }
});

const upload = multer({ storage: fileStorageEngine });

router.get('/',isAdmin, function (req, res) {
    db.query(`SELECT t1.id,t1.title, t1.year, t1.link,t1.reviewStatus,t1.abstract,t1.supervisor,t2.username,t2.user  
  FROM projects t1 
  JOIN project_authors t2 ON t1.id = t2.project_id`,(error,result)=>{
  const data = [];


  result.forEach(row => {
    // check if title already exists in data array
    const index = data.findIndex(obj => obj.title === row.title);
  
    // if title doesn't exist, create a new object and push it to the array
    if (index === -1) {
      data.push({_id:row.id,title: row.title, year: row.year, link: row.link, reviewStatus: row.reviewStatus, abstract: row.abstract, supervisor: row.supervisor, author: [{ user: [row.user], username: [row.username] }] });
    } 
    // if title exists, push data to the existing object
    else {
      const authorIndex = data[index].author.findIndex(author => JSON.stringify(author.user) === JSON.stringify([row.user]));
      if (authorIndex === -1) {
        data[index].author.push({ user: [row.user], username: [row.username] });
      } else {
        data[index].author[authorIndex].username.push(row.username);
      }
    }
  });

  // create a new array with authors and usernames flattened
  const flattenedAuthors = data.map(project => {
    const users = project.author.reduce((acc, curr) => {
      acc.push(curr.user[0]);
      return acc;
    }, []);

    const usernames = project.author.reduce((acc, curr) => {
      acc.push(curr.username[0]);
      return acc;
    }, []);

    return { user: users, username: usernames };
  });

  // replace author array with flattenedAuthors array in each project object
  data.forEach((project, index) => {
    project.author = flattenedAuthors[index];
  });
  res.render('admin/admin', { projects: data })
});

});

router.post('/upload-csv',isAdmin, upload.single('file'), function (req, res) {

    var newCount = 0;
    var errorCount = 0;
    var pending = 0;
    const fileRows = [];
    csv.parseFile(req.file.path)
        .on("data", function (data) {
            fileRows.push(data); // push each row
        })
        .on("end", function () {
            console.log(fileRows) //contains array of arrays. Each inner array represents row of the csv file, with each element of it a column
            pending = fileRows.length; //check no of rows being processed
            fileRows.forEach(row => {
                if (row[0].toLowerCase() == "username") {
                    pending = pending -1;
                    return;
                } else {
                    var UserName = row[0];
                    var PassWord = row[1];
                    var aUser = row[2];
                    console.log(UserName, " ", PassWord, " ", aUser)
                    var newUser = new User({ username: UserName,user:aUser });
                    User.register(newUser, PassWord, function (err, user) {
                        if (err) {
                            errorCount++;
                            console.log(err);
                            console.log("error no:", errorCount)
                        } else {
                            newCount = newCount + 1;
                            console.log("\n new user created:", UserName)
                        }
                        if (pending == 1) { //check if last row is being handled, if yes render result
                            if (newCount > 0)
                                req.flash("success", "Succesfully added " + newCount + " new accounts")
                            if (errorCount > 0)
                                req.flash("error", "Unable to add ", errorCount, " accounts. Check for pre-exsiting accounts")
                            res.redirect('/admin');
                        }
                        pending--;//decrease pending rows
                    });
                    //process "fileRows" and respond
                }
            })
                    //the whole pending thing was done because User.register works asynchronously and allows other code to run before it finishes running, (multi threading)
            // fs.unlinkSync(req.file.path); // remove file after finish process
        })
});


router.post("/register",isAdmin, function (req, res) {
    var newUser = new User({ username: req.body.username, user: req.body.user});
    User.register(newUser, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.render("register", { error: err.message }); x
        } else {
            passport.authenticate("local")(req, res, function () {
                req.flash("success", "Welcome " + user.username + "!!!");
                res.redirect("/projects");
            });
        }
    });
});

router.put("/:id",isAdmin, function (req, res) {
    db.query(`UPDATE projects SET reviewStatus = 1 WHERE id = ${req.params.id}`, (error, result) => {
        if (error) {
          console.error('Error updating reviewStatus', error);
        } else {
            res.redirect("/admin")
        }
      });
  });


module.exports = router;