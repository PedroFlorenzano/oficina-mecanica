import bcrypt from "bcryptjs";

const hash = "$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu5bO";
const password = "password123";

bcrypt.compare(password, hash).then((match) => {
  console.log("password123 matches:", match);
});
