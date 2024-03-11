import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
import env from "dotenv";

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

app.use(
    session({
      secret: "TOPSECRETWORD",
      resave: false,
      saveUninitialized: true,
    })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "health-web",
    password: "1234qwer",
    port: 5432,
}); 
db.connect();

app.get("/", (req, res) => {
    if(req.isAuthenticated()){
        res.render("home.ejs",{nameto: req.user.name});
    } else {
        res.render("home.ejs");
    }
});

app.get("/login", (req, res) => {
    res.render("login.ejs");
});
  
app.get("/register", (req, res) => {
    res.render("register.ejs");
});

app.get("/healthchk", (req, res) => {
    if(req.isAuthenticated()){
        res.render("healthchk.ejs",{nameto: req.user.name});
    }
    else{
        res.render("healthchk.ejs");
    }
});

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.post("/register", async (req, res) => {
    const email = req.body.username;
    const password = req.body.password;
    const name = req.body.nameofuser;
    try {
      const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
  
      if (checkResult.rows.length > 0) {
        res.send("Email already exists. Try logging in.");
      } else {
        //hashing the password and saving it in the database
        bcrypt.hash(password, saltRounds, async (err, hash) => {
          if (err) {
            console.error("Error hashing password:", err);
          } else {
            console.log("Hashed Password:", hash);
            await db.query(
              "INSERT INTO users (name,email, password) VALUES ($1, $2, $3)",
              [name, email, hash]
            );
            // res.render("home.ejs",{nameto: name});
            res.redirect("/login",{alter: ""});
          }
        });
      }
    } catch (err) {
      console.log(err);
    }
});


// app.post("/login", async (req, res) => {
//     const email = req.body.username;
//     const loginPassword = req.body.password;

//     try {
//         const result = await db.query("SELECT * FROM users WHERE email = $1", [
//         email,
//         ]);
//         if (result.rows.length > 0) {
//         const user = result.rows[0];
//         const storedHashedPassword = user.password;
//         //verifying the password
//         bcrypt.compare(loginPassword, storedHashedPassword, (err, result) => {
//             if (err) {
//             console.error("Error comparing passwords:", err);
//             } else {
//             if (result) {
//                 res.render("home.ejs",{nameto: user.name});
//             } else {
//                 res.send("Incorrect Password");
//             }
//             }
//         });
//         } else {
//         res.send("User not found");
//         }
//     } catch (err) {
//         console.log(err);
//     }
// })
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
);


passport.use(
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            //Error with password check
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              //Passed password check
              return cb(null, user);
            } else {
              //Did not pass password check
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("User not found");
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});