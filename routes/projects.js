const express = require('express');
var router = express.Router();
const middleware = require('../middleware/index1');
const User = require("../models/user");
const { isNull } = require('url/util');
const mysql = require('mysql');
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '12345678',
  database:'projectdatabase'
 });

 //connect mysql
db.connect((error)=>{
  if(error){
    throw error
  }
  else{
    let sql = 'CREATE DATABASE IF NOT EXISTS projectdatabase';
    db.query(sql,(err,result)=>{
    if(err) throw err;
    console.log(result)
    console.log("Database created")
    let project_sql = `
    CREATE TABLE IF NOT EXISTS projects (
      id int NOT NULL AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      year VARCHAR(4) NOT NULL,
      link VARCHAR(255),
      reviewStatus BOOLEAN,
      abstract TEXT,
      supervisor VARCHAR(255),
      PRIMARY KEY (id)
    );
  
  `;
    db.query(project_sql,(err,result)=>{
      if(err) throw err;
      console.log(result)
      console.log("Project table created")
    })
  
    let authors_sql = `CREATE TABLE IF NOT EXISTS project_authors (
      id int NOT NULL AUTO_INCREMENT,
      project_id INT NOT NULL,
      username VARCHAR(255),
      user VARCHAR(255),
      PRIMARY KEY (id),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )`;
    db.query(authors_sql,(err,result)=>{
      if(err) throw err;
      console.log(result)
      console.log("Author table created")
    })
  })
    console.log("Mysql connected")

  }
})


router.get('/', function (req, res) {
  db.query(`SELECT t1.id,t1.title, t1.year, t1.link,t1.reviewStatus,t1.abstract,t1.supervisor,t2.username,t2.user  
    FROM projects t1 
    JOIN project_authors t2 ON t1.id = t2.project_id`,(error,result)=>{
    if(error){
      console.log(error)
    }
    else{
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
    res.render('projects/index', { projects: data })
    console.log(data);
    // console.log(data[0].author)
    }
  });
})

router.get('/new', middleware.isLoggedIn, function (req, res) {
  res.render('projects/new')
})

//Add project
router.post('/', middleware.isLoggedIn, function (req, res) {
  var title = req.body.title
  var year = req.body.year
  var description = req.body.description
  var link = req.body.link
  var image = req.body.image
  var supervisor = req.body.supervisor
  // var authors = req.body.authors
  var namearray = [];
  var pending = req.body.member.length;
  console.log("----------Here ---------",req.body.member)
  req.body.member.forEach(Username => {
    User.findOne({ username: Username }, function (err, foundUser) {
      if (err || !foundUser) {
        // console.log("cant find user with username/rollno:", Username)
        namearray.push("")
        pending--;
      } else {
        namearray.push(foundUser.user);
        // console.log("added user to project contributor: ", foundUser.user)
        // console.log("\n User object: ", foundUser)
        pending--;
      }
      if (pending == 0) {
        // console.log("array of name", namearray)
        var author = {
          id: req.user._id,
          username: req.body.member,
          user: namearray
        }
        console.log(author)
        // console.log("the pushed data ", author)
        var reviewStatus = false
        var abstract = req.body.abstract

        var newProject = { title: title, year: year, link: link, supervisor: supervisor, reviewStatus: reviewStatus, abstract: abstract }

        const projectInsertQuery = 'INSERT INTO projects SET ?';
        db.query(projectInsertQuery, newProject, (error, result) => {
          if (error) throw error;
          console.log('Project added to database!');
          const projectId = result.insertId;
          const authorInsertQuery = 'INSERT INTO project_authors (project_id, username, user) VALUES ?';
          const authorValues = author.username.map((username, index) => [
            projectId,
            username ? username : "", // Check if username is empty, if yes, use 'Unknown'
            author.user[index] ? author.user[index] : ""// Check if user[index] is empty, if yes, use 'Unknown'
          ])
        db.query(authorInsertQuery, [authorValues], (error, result) => {
          if (error) throw error;
          console.log('Authors added to database!');
          console.log('Project and authors added to database successfully!');
          req.flash("success","Project added to database")
          res.redirect('/projects')
        });
  });

  }})
  });


})



// //search sql
router.get('/search', (req, res) => {
  console.log(req.query.dsearch)
  db.query(`SELECT t1.id,t1.title, t1.year, t1.link,t1.reviewStatus,t1.abstract,t1.supervisor,t2.username,t2.user  
    FROM projects t1 
    JOIN project_authors t2 ON t1.id = t2.project_id
    WHERE t1.title LIKE '%${req.query.dsearch}%' OR t1.supervisor LIKE '%${req.query.dsearch}%'`,(error,result)=>{
    const data = [];
    if(error){
      console.log(error)
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
    console.log(data)
    res.render('projects/index', { projects: data })
    }
  
    
  });
});




router.get('/:id', function (req, res) {
  db.query(`SELECT t1.id,t1.title, t1.year, t1.link,t1.reviewStatus,t1.abstract,t1.supervisor,t2.username,t2.user  
    FROM projects t1 
    JOIN project_authors t2 ON t1.id = t2.project_id
    WHERE t1.id = ${req.params.id}`,(error,result)=>{
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
    res.render('projects/show', { project: data[0] })
    console.log(data);
    console.log(data[0].author)
  });
})

// edit route
router.get('/:id/edit', middleware.checkProjectOwnership, function (req, res) {
  // Project.findById(req.params.id, function (err, foundProject) {
  //   res.render("projects/edit", { project: foundProject })
  // })
  db.query(`SELECT t1.id,t1.title, t1.year, t1.link,t1.reviewStatus,t1.abstract,t1.supervisor,t2.username,t2.user  
    FROM projects t1 
    JOIN project_authors t2 ON t1.id = t2.project_id
    WHERE t1.id = ${req.params.id}`,(error,result)=>{
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
    res.render("projects/edit", { project: data[0] })
    console.log(data);
    console.log(data[0].author)
  });
})

// Update Route
router.put("/:id", middleware.checkProjectOwnership, function (req, res) {
  console.log("\n")
  console.log("front to back data:", req.body.project.author);
  var namearray=[];
  pending = req.body.project.author.username.length
  req.body.project.author.username.forEach(Username => {
    User.findOne({ username: Username }, function (err, foundUser) {
      if (err || !foundUser) {
        // console.log("cant find user with username/rollno:", Username)
        namearray.push("")
        pending--;
      } else {
        namearray.push(foundUser.user);
        // console.log("added user to project contributor: ", foundUser.user)
        // console.log("\n User object: ", foundUser)
        pending--;
      }
      if (pending == 0) {
        req.body.project.author.user = namearray;
        console.log("Updated author data:", req.body.project.author);
        console.log(req.body.project)

        var updatedProject = { title: req.body.project.title, year: req.body.project.year, link: req.body.project.link, supervisor: req.body.project.supervisor, reviewStatus: req.body.project.reviewStatus, abstract: req.body.project.abstract }

        const projectUpdateQuery = `UPDATE projects SET ? WHERE id = ${req.params.id}`;
        db.query(projectUpdateQuery, updatedProject, (error, result) => {
          if (error) throw error;
          console.log('Project updated to database!');
          const projectId = req.params.id;
          const authorIdQuery = `SELECT id 
                                FROM project_authors
                                WHERE  project_id = ${req.params.id}`
          const authorValues = req.body.project.author.username.map((username, index) => [
            projectId,
            username ? username : "", // Check if username is empty, if yes, use 'Unknown'
            req.body.project.author.user[index] ? req.body.project.author.user[index] : "" // Check if user[index] is empty, if yes, use 'Unknown'
          ])
          console.log(authorValues)
          db.query(authorIdQuery,(error,result)=>{
            for(let i = 0;i<4;i++){
              const authorUpdateQuery = `UPDATE project_authors SET ? WHERE id = ${result[i].id}`;
              updatedAuthor = {project_id:authorValues[i][0],username:authorValues[i][1],user:authorValues[i][2]}
              console.log(updatedAuthor)
              db.query(authorUpdateQuery, updatedAuthor, (error, result) => {
                if (error) throw error;
                console.log('Authors updated to database!');
              })
            }
          })
          console.log('Project and authors updated to database successfully!');
          req.flash("success","Project updated to database")
          res.redirect('/projects')
      })

        
      }
    })
  })
  


})


// DESTROY PROJECT ROUTE
router.delete('/:id', middleware.checkProjectOwnership, function (req, res) {
  // Project.findByIdAndDelete(req.params.id, function (err) {
  //   if (err) {
  //     res.redirect('/projects/' + req.params.id)
  //   }
  //   req.flash("success", "Project Deleted");
  //   console.log("deleted")
  //   res.redirect('/projects')
  // })
  db.query(`DELETE FROM project_authors WHERE project_id = ${req.params.id}`, (error, results, fields) => {
    if (error) {
      console.error(' deleting authors from project_authors table', error);
    } else {
      // Delete authors from project_authors table
    db.query(`DELETE FROM projects WHERE id = ${req.params.id}`, (error, results, fields) => {
      if (error) {
        console.error('Error deleting project from projects tableError', error);
      } else {
        req.flash("success", "Project Deleted");
        res.redirect('/projects')
    }
  });
    }
  });
  
  
})




module.exports = router