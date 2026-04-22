import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { postsAPI } from '../utils/api';
import { formatDistanceToNow } from 'date-fns';
import CoverImage from '../components/CoverImage';

const CATEGORIES = ['Technology', 'Design', 'Business', 'Lifestyle', 'Travel', 'Food', 'Health', 'Other'];

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page')) || 1;

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const params = { page, limit: 9, sort };
        if (search) params.search = search;
        if (category) params.category = category;
        const { data } = await postsAPI.getAll(params);
        setPosts(data.posts);
        setPagination(data.pagination);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [page, search, category, sort]);

  const updateParam = (key, value) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value); else p.delete(key);
    if (key !== 'page') p.delete('page');
    setSearchParams(p);
  };

  return (
    <div className="page">
      <div className="container">
        {!search && !category && page === 1 && (
          <div className="hero">
            <h1>Stories worth <em>reading</em></h1>
            <p>Discover ideas, perspectives, and expertise from writers on any topic.</p>
            <Link to="/register" className="btn btn-primary">Start Writing Today →</Link>
          </div>
        )}

        <div className="filter-bar">
          <input
            className="form-control search-input"
            placeholder="Search posts..."
            defaultValue={search}
            onKeyDown={(e) => e.key === 'Enter' && updateParam('search', e.target.value)}
          />
          <select className="form-control" style={{width:'auto'}} value={category} onChange={e => updateParam('category', e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="form-control" style={{width:'auto'}} value={sort} onChange={e => updateParam('sort', e.target.value)}>
            <option value="newest">Newest</option>
            <option value="popular">Most Viewed</option>
            <option value="liked">Most Liked</option>
          </select>
          {(search || category) && (
            <button className="btn btn-secondary btn-sm" onClick={() => setSearchParams({})}>Clear</button>
          )}
        </div>

        {loading ? (
          <div className="spinner"><div className="spinner-ring"></div></div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <h3>No posts found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="posts-grid">
              {posts.map(post => <PostCard key={post._id} post={post} />)}
            </div>
            {pagination && pagination.totalPages > 1 && (
              <div className="pagination">
                {pagination.hasPrev && <button className="page-btn" onClick={() => updateParam('page', page - 1)}>← Prev</button>}
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => updateParam('page', p)}>{p}</button>
                ))}
                {pagination.hasNext && <button className="page-btn" onClick={() => updateParam('page', page + 1)}>Next →</button>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PostCard({ post }) {
  const initials = post.author?.username?.charAt(0).toUpperCase() || '?';
  return (
    <div className="card post-card">
      <div className="post-card-img">
        <CoverImage src={post.coverImage} alt={post.title} fallback="✍️" />
      </div>
      <div className="post-card-body">
        <span className="post-category">{post.category}</span>
        <div className="post-card-title">
          <Link to={`/post/${post.slug || post._id}`}>{post.title}</Link>
        </div>
        {post.excerpt && <p className="post-excerpt">{post.excerpt}</p>}
        <div className="post-card-footer">
          <Link to={`/profile/${post.author?.username}`} className="author-mini">
            <div className="author-mini-avatar">{initials}</div>
            <span className="author-mini-name">{post.author?.username}</span>
          </Link>
          <div className="post-card-meta" aria-label="post meta">
            <span className="post-card-meta-item">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
            <span className="post-card-meta-item">{post.readTime}m read</span>
            <span className="post-card-meta-item post-card-meta-comments">
              💬 {post.commentCount || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
