import React, { useState } from 'react';
import { BLOG_POSTS } from '../../data/mockData';
import { Calendar, Clock, ArrowRight, X, BookOpen, Share2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BlogPage: React.FC = () => {
  const { showToast } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Tips' | 'Guides' | 'Updates'>('All');
  const [readingPost, setReadingPost] = useState<typeof BLOG_POSTS[0] | null>(null);

  const filteredPosts = selectedCategory === 'All'
    ? BLOG_POSTS
    : BLOG_POSTS.filter(p => p.category.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-widest text-[#FF1B6B]">Knowledge Hub</span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Our Latest Articles
        </h1>
        <p className="text-slate-400 text-sm sm:text-base">
          Tips, guides and updates about YouTube live streaming.
        </p>

        {/* Filter Tabs matching reference 7 */}
        <div className="flex items-center justify-center gap-2 pt-2">
          {(['All', 'Tips', 'Guides', 'Updates'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-[#FF1B6B] text-white shadow-lg shadow-rose-500/25'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Blog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {filteredPosts.map((post) => (
          <div
            key={post.id}
            className="rounded-2xl overflow-hidden bg-[#0F1626]/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="relative h-48 overflow-hidden">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur text-[11px] font-bold text-white uppercase border border-white/10">
                  {post.category}
                </div>
              </div>

              <div className="p-6 space-y-3">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{post.date}</span>
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{post.readTime}</span>
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-[#FF1B6B] transition-colors leading-snug">
                  {post.title}
                </h3>

                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                  {post.summary}
                </p>
              </div>
            </div>

            <div className="p-6 pt-0">
              <button
                onClick={() => setReadingPost(post)}
                className="text-xs font-bold text-[#FF1B6B] hover:text-white flex items-center gap-1.5 transition-colors group-hover:translate-x-1"
              >
                <span>Read More</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Full Article Reader Modal */}
      {readingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-[#0D131F] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#111827]">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <BookOpen className="w-4 h-4 text-[#FF1B6B]" />
                <span>Stream Join Knowledge Base</span>
              </div>
              <button
                onClick={() => setReadingPost(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <img
                src={readingPost.image}
                alt={readingPost.title}
                className="w-full h-56 object-cover rounded-xl"
              />

              <div className="space-y-2">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="text-[#FF1B6B] font-bold">{readingPost.category}</span>
                  <span>·</span>
                  <span>{readingPost.date}</span>
                  <span>·</span>
                  <span>{readingPost.readTime}</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">{readingPost.title}</h2>
              </div>

              <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line border-t border-slate-800 pt-4">
                {readingPost.content}
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    showToast('Article link copied to clipboard!', 'success');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 hover:text-white"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Article</span>
                </button>
                <button
                  onClick={() => setReadingPost(null)}
                  className="px-4 py-2 rounded-xl bg-[#FF1B6B] text-white font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
