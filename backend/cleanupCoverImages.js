require('dotenv').config();
const mongoose = require('mongoose');

const Post = require('./models/Post');

const hasFlag = (flag) => process.argv.includes(flag);
const isDryRun = !hasFlag('--apply');

const isLocalhostCoverImage = (value) => {
  if (!value || typeof value !== 'string') return false;
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?\/uploads\//i.test(value);
};

const main = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  const allWithCover = await Post.find({ coverImage: { $exists: true, $ne: '' } })
    .select('title coverImage')
    .lean();

  const candidates = allWithCover.filter((p) => isLocalhostCoverImage(p.coverImage));

  console.log(`Found ${candidates.length} posts with localhost coverImage URLs.`);
  if (candidates.length > 0) {
    console.log('Sample (up to 5):');
    candidates.slice(0, 5).forEach((p) => {
      console.log(`- ${p.title}`);
    });
  }

  if (isDryRun) {
    console.log('Dry run only. Re-run with --apply to clear these coverImage values.');
    await mongoose.disconnect();
    return;
  }

  const ids = candidates.map((p) => p._id);
  const result = await Post.updateMany(
    { _id: { $in: ids } },
    { $set: { coverImage: '' } }
  );

  console.log(`✅ Cleared coverImage for ${result.modifiedCount || 0} posts.`);
  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error('❌ Cleanup failed:', err.message);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});

