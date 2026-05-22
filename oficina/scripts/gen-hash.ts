import bcrypt from "bcryptjs";

bcrypt.hash("password123", 10).then((hash) => {
  console.log("Hash:", hash);
});
