const bcrypt = require('bcrypt');
const { writeFileSync, readFileSync } = require('fs');
const saltRounds = 10;
const myPlaintextPassword = 's0/\/\P4$$w0rDçÀ°';

bcrypt.genSalt(15, function(err, salt) {
    bcrypt.hash(myPlaintextPassword, salt, function(err, hash) {
        writeFileSync(".pwd", hash)
    });
});

// Load hash from your password DB.
console.log(myPlaintextPassword , " myPlaintextPassword");
bcrypt.compare(myPlaintextPassword, readFileSync(".pwd").toString(), function(err, result) {
    console.log(result);
});