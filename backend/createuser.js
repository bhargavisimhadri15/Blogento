require('dotenv').config();
const mongoose = require('mongoose');

if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI is not set');
  process.exit(1);
}

console.log('MONGO_URI: (set)');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected!');
  const User = require('./models/User');
  await User.deleteMany({ $or: [{ email: 'admin@gmail.com' }, { username: 'admin' }] });
  const user = await User.create({
    username: 'admin',
    email: 'admin@gmail.com',
    password: 'admin123',
    bio: 'Admin user',
    role: 'admin'
  });
  console.log('✅ User created:', user.email);
  process.exit(0);
}).catch(e => {
  console.log('❌ Error:', e.message);
  process.exit(1);
});
