require('dotenv').config();
const mongoose = require('mongoose');

console.log('MONGO_URI:', process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected!');
  const User = require('./models/User');
  await User.deleteMany({ email: 'admin@gmail.com' });
  const user = await User.create({
    username: 'admin',
    email: 'admin@gmail.com',
    password: 'admin123',
    bio: 'Admin user'
  });
  console.log('✅ User created:', user.email);
  process.exit(0);
}).catch(e => {
  console.log('❌ Error:', e.message);
  process.exit(1);
});