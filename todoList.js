const express = require("express");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.get("/", (request, response) => {
  response.send("Hello World");
});

//Creating and Initializing SQLite Database
let database = null;
const initializeDbAndServer = async () => {
  try {
    database = new sqlite3.Database("todo.db", (err) => {
      if (err) {
        console.log(`Database Error: ${err.message}`);
        process.exit(1);
      }
    });
    //Creating User Tables
    const createUserTableQuery = `
CREATE TABLE IF NOT EXISTS users(
    id INTEGER NOT NULL PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT)
    `;

    const createTodoTableQuery = `
CREATE TABLE IF NOT EXISTS todoList(
    id INTEGER NOT NULL PRIMARY KEY,
    user_id INTEGER ,
    description TEXT,
    status TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
`;

    await database.run(createUserTableQuery);
    await database.run(createTodoTableQuery);
    //starting the server
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`Error initializing database and server: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();
console.log("Database created");

//Creating Register User API
app.post("/register", async (request, response) => {
  try {
    const { username, password } = request.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const selectUserQuery = `SELECT * FROM users WHERE username='${username}';`;
    const databaseUser = await database.get(selectUserQuery, [username]);
    console.log(databaseUser.password);
    console.log(databaseUser.username === undefined);
    if (databaseUser) {
      response.status(400);
      response.send("User already exists");
    } else {
      const createUserQuery = `
        INSERT INTO users (username, password)
        VALUES('${username}', '${hashedPassword}');
        `;
      await database.run(createUserQuery, [username, hashedPassword]);
      response.send("User created successfully");
    }
  } catch (error) {
    console.log(`Error during registration: ${error.message}`);
    response.status(500);
    response.send(500);
  }
});

app.post("/login", async (request, response) => {
  try {
    const { username, password } = request.body;
    const selectUserQuery = `SELECT * FROM user WHERE username='${username}';`;
    const databaseUser = await database.get(selectUserQuery, [username]);
    if (!databaseUser) {
      response.status(400);
      response.send("Invalid User");
    } else {
      const checkingPasswordMatched = await bcrypt.compare(
        password,
        databaseUser.password
      );
      if (checkingPasswordMatched) {
        const payload = { username: username };
        const jwtToken = jwt.sign(payload, "MY-SECRET-TOKEN");
        response.send({ jwtToken });

        response.send("Login success");
      } else {
        response.status(400);
        response.send("Invalid password");
      }
    }
  } catch (error) {
    console.log(`Error during login: ${error.message}`);
    response.status(500);
    response.send("Server error");
  }
});

module.exports = app;
