const mysql = require('mysql');
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '12345678',
  database:'projectdatabase'
 });


// const Comment = require('../models/comment');
const User = require('../models/user');
var middlewareObj = {}

middlewareObj.checkProjectOwnership = function (req, res, next) {
  console.log(req.user)
  if (req.isAuthenticated()) {
    // Project.findById(req.params.id, function (err, foundProject) {
    //   if (err) {
    //     req.flash("error", "Could not find the Project.")
    //     console.log(err)
    //   }
    //   else {
    //     //if(foundProject.author.id.equals(req.user._id)){
    //     if (foundProject.author[0].username.filter(e => (e == (req.user.username))).length > 0) {

    //       return next()
    //     }

    //     else {
    //       req.flash("error", "You are not Authorized to do that!")
    //       res.redirect('back')
    //     }
    //   }
    // })
    db.query(`SELECT t1.id,t1.title, t1.year, t1.link,t1.reviewStatus,t1.abstract,t1.supervisor,t2.username,t2.user  
    FROM projects t1 
    JOIN project_authors t2 ON t1.id = t2.project_id
    WHERE t1.id = ${req.params.id}`,(err,result)=>{
    const data = [];
    if (err) {
    req.flash("error", "Could not find the Project.")
    console.log(err)
    }
    else{
  
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
    if (data[0].author.username.filter(e => (e == (req.user.username))).length > 0) {
    return next()
    }
    else {
      req.flash("error", "You are not Authorized to do that!")
      res.redirect('back')
    }
  }
  });
  }
  else {
    req.flash("error", "You need to be Logged in to do that.")
    res.redirect('back')
  }
}

middlewareObj.isAdmin = function (req, res, next) {
  if (req.isAuthenticated()) {
    User.findById(req.user._id, function (err, user) {
      if (user.username != "admin") {

        res.redirect('back')
      } else {

        return next()
      }
    })
  } else {
    req.flash("error", "You need to be Logged in to do that.")
    res.redirect('back')
  }
}

middlewareObj.checkCommentOwnership = function (req, res, next) {
  if (req.isAuthenticated()) {
    Comment.findById(req.params.comment_id, function (err, foundComment) {
      if (err) {
        console.log(err);
        req.flash("error", "Could not find Comment.")
        res.redirect('back')
      }
      else {
        if (foundComment.author.id.equals(req.user._id)) {
          return next()
        }
        else {
          req.flash("error", "You are not authorised to do that.")
          res.redirect('back')
        }
      }
    })
  }
  else {
    req.flash("error", "You need to be Logged in to do that.")
    res.redirect('/projects')
  }
}

middlewareObj.isLoggedIn = function (req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  req.flash("error", "You need to be Logged in to do that.")
  res.redirect('/projects')
}

module.exports = middlewareObj