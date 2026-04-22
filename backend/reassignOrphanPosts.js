require('dotenv').config();
const mongoose = require('mongoose');

const Post = require('./models/Post');
const User = require('./models/User');

const getArgValue = (key) => {
  const prefix = `${key}=`;
  const match = process.argv.find((a) => a.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
};

const hasFlag = (flag) => process.argv.includes(flag);
const isDryRun = !hasFlag('--apply');

const main = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI is not set');
    process.exit(1);
  }

  const email = getArgValue('--email');
  if (!email) {
    console.error('❌ Missing required argument: --email=<targetEmail>');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  const targetUser = await User.findOne({ email: email.toLowerCase().trim() }).select('_id username email').lean();
  if (!targetUser) {
    console.error(`❌ No user found with email: ${email}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const posts = await Post.find({})
    .select('title author')
    .lean();

  const authorIds = [...new Set(posts.map((p) => String(p.author)).filter(Boolean))];
  const existingUsers = await User.find({ _id: { $in: authorIds } }).select('_id').lean();
  const existingSet = new Set(existingUsers.map((u) => String(u._id)));

  const orphanPosts = posts.filter((p) => {
    const authorId = String(p.author || '');
    return authorId && !existingSet.has(authorId);
  });

  console.log(`Found ${orphanPosts.length} posts with missing author user.`);
  if (orphanPosts.length > 0) {
    console.log('Sample (up to 5):');
    orphanPosts.slice(0, 5).forEach((p) => console.log(`- ${p.title}`));
  }

  if (isDryRun) {
    console.log(`Dry run only. Re-run with --apply to assign these posts to ${targetUser.email} (${targetUser.username}).`);
    await mongoose.disconnect();
    return;
  }

  const orphanIds = orphanPosts.map((p) => p._id);
  const result = await Post.updateMany(
    { _id: { $in: orphanIds } },
    { $set: { author: targetUser._id } }
  );

  console.log(`✅ Reassigned ${result.modifiedCount || 0} posts to ${targetUser.email}.`);
  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error('❌ Reassign failed:', err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});

