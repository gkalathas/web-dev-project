

const mysql = require("mysql");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { promisify } = require('util');
const { decode } = require("punycode");

const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE
});

//login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if( !email || !password ) {
      return res.status(400).render('login', {
        message: 'Please provide an email and password'
      })
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
      console.log(results);
      
      if( !results || !(await bcrypt.compare(password, results[0].password)) ) {
        res.status(401).render('login', {
          message: 'Email or Password is incorrect'
        })
      } else {
        const id = results[0].id;

        const token = jwt.sign({ id }, process.env.JWT_SECRET, {
          expiresIn: process.env.JWT_EXPIRES_IN
        });

        console.log("The token is: " + token);

        const cookieOptions = {
          expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
          ),
          httpOnly: true
        }

        res.cookie('jwt', token, cookieOptions );
        res.status(200).redirect("profile");
      }

    })

  } catch (error) {
    console.log(error);
  }
}

//register
exports.register = (req, res) => {
  console.log(req.body);

  const { username, email, password, cpassword} = req.body;

  db.query('SELECT email FROM users WHERE email = ?', [email], async (error, results) => {
    if(error) {
      console.log(error);
    }

    if( results.length > 0 ) {
      return res.render('register', {
        message: 'That email is already in use'
      })
    } else if( password !== cpassword ) {
      return res.render('register', {
        message: 'Passwords do not match'
      });
    }

    let hashedPassword = await bcrypt.hash(password, 8);
    console.log(hashedPassword);

    db.query('INSERT INTO users SET ?', {username: username, email: email, password: hashedPassword}, (error, results) => {
      if(error) {
        console.log(error);
      } else {
        console.log(results);
        return res.render('register', {
          message: 'User registered'
        });
      }
    })
  });
}


exports.isLoggedIn = async (req, res, next) => {
  // console.log(req.cookies);
  if( req.cookies.jwt) {
    try {
      //1) verify the token
      const decoded = await promisify(jwt.verify)(req.cookies.jwt,
      process.env.JWT_SECRET
      );

      console.log(decoded);

      //2) Check if the user still exists
      db.query('SELECT * FROM users WHERE id = ?', [decoded.id], (error, result) => {
        console.log(result);

        if(!result) {
          return next();
        }

        req.user = result[0];
        console.log("user is");
        console.log(req.user);
        return next();

      });
    } catch (error) {
      console.log(error);
      return next();
    }
  } else {
    next();
  }
}

//logout
exports.logout = async (req, res) => {
  res.cookie('jwt', 'logout', {
    expires: new Date(Date.now() + 2*1000),
    httpOnly: true
  });

  res.status(200).redirect('/');
}


exports.editprofile = async (req,res) => {
  const {fullname, userdesc, skills, country, age, gender} = req.body;
   if( req.cookies.jwt) {
    try {
      const decoded = await promisify(jwt.verify)(req.cookies.jwt,
      process.env.JWT_SECRET
      );
      console.log(decoded);
      if(!decoded===null){
      db.query('INSERT INTO users WHERE id= ?',[decoded.id], {fullname: fullname, userdesc: userdesc, skills: skills,country: country, age: age, gender: gender}, (error, results) => {
        if(error) {
          console.log(error);
        } else {
          console.log(results);
          return res.render('profile', {
            message: 'Profile Updated'
          }); 
        }
      });  
    }} catch (error) {
      console.log(error);
      }
    }
  }

// Delete user account
exports.delete = async (req, res) => {
  if( req.cookies.jwt) {
      const decoded = await promisify(jwt.verify)(req.cookies.jwt,
      process.env.JWT_SECRET);
      console.log(decoded.id);
      };
      
  if (decode.id) {
    db.query(
      'DELETE FROM users WHERE users.id = SET?',[decode.id],
       (err, result)=> {
        if (err) {
          console.log('error');
          res.redirect('/profile')
        } else {
          console.log(result)
          res.redirect('/')
        }
      }
    )
  } else {
    res.redirect('/profile'); 
  }
}


