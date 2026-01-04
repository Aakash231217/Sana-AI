"use client";
import React from 'react';
import { Book, Star, ArrowRight } from 'lucide-react';
import Link from 'next/link'; // Import Link
import { Reveal } from '@/components/ui/Reveal';
import { TiltCard } from '@/components/ui/TiltCard';
import { api } from '@/trpc/react';

const BOOKS = [
  { id: 1, title: "Cosmos", author: "Carl Sagan", color: "from-purple-600 to-blue-600", rating: 4.9 },
  { id: 2, title: "The Code", author: "Charles Petzold", color: "from-blue-600 to-cyan-600", rating: 4.8 },
  { id: 3, title: "Sapiens", author: "Yuval Noah", color: "from-amber-600 to-orange-600", rating: 4.9 },
  { id: 4, title: "Atomic Habits", author: "James Clear", color: "from-emerald-600 to-green-600", rating: 4.7 },
];

export const LibrarySection = () => {
  const { data: files } = api.file.getUserFiles.useQuery({});

  return (
    <section id="library" className="py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <Reveal width="100%">
            <div className="max-w-2xl">
              <h2 className="text-4xl font-bold text-white mb-2">Digital Library</h2>
              <p className="text-slate-400">Curated resources powered by Sana-AI recommendations.</p>
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            {/* Added Link to Maintenance Page here as well */}
            <Link href="/resources" className="flex items-center gap-2 text-brand-primary font-medium hover:text-brand-glow transition-colors">
              View Full Catalog <ArrowRight size={16} />
            </Link>
          </Reveal>
        </div>

        {/* FIX: Added width="100%" to Reveal component so cards don't collapse */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {files?.map((file, index) => (
            <Reveal key={file.id} delay={index * 0.1} width="100%">
              <TiltCard className="h-[400px] w-full rounded-2xl relative group cursor-pointer">
                {/* Book Cover Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl opacity-80 group-hover:opacity-100 transition-opacity duration-500 shadow-2xl`} />

                {/* Glass Overlay */}
                <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px] rounded-2xl border border-white/10 group-hover:border-white/30 transition-colors p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                      <Book className="text-white w-6 h-6" />
                    </div>
                    <div className="bg-black/30 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1">
                      <Star size={12} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-xs text-white font-bold">New</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-white mb-1 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">{file.name}</h3>
                    <p className="text-white/80 text-sm mb-4 translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-75">PDF Resource</p>

                    <div className="opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-100">
                      {/* Converted Button to Link */}
                      <Link
                        href={`/book/${file.id}`}
                        className="w-full py-3 bg-white text-brand-dark font-bold rounded-lg shadow-lg hover:bg-slate-100 block text-center transition-colors"
                      >
                        Start Learning
                      </Link>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </Reveal>
          ))}

          {(!files || files.length === 0) && (
            <div className="col-span-4 text-center text-slate-400 py-12">
              No books uploaded yet. Go to your dashboard to upload subject books.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};