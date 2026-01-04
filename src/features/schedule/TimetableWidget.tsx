"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, Video, MoreHorizontal } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';

const SCHEDULE = [
  { time: "09:00 AM", subject: "Adv. Mathematics", type: "Lecture", room: "Room 302", status: "Live" },
  { time: "10:30 AM", subject: "Quantum Physics", type: "Lab", room: "Lab B", status: "Upcoming" },
  { time: "01:00 PM", subject: "World History", type: "Seminar", room: "Online", status: "Upcoming" },
];

export const TimetableWidget = () => {
  return (
    <section id="schedule" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <Reveal width="100%">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-primary to-indigo-900 shadow-2xl">
          {/* Background Patterns */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 p-8 md:p-16 grid lg:grid-cols-5 gap-12">
            
            {/* Left Info */}
            <div className="lg:col-span-2 flex flex-col justify-center">
              <h2 className="text-4xl font-bold text-white mb-6">Your Day at a Glance</h2>
              <p className="text-blue-100 text-lg mb-8 opacity-90">
                Sana-AI organizes your day automatically. Join virtual classes with one click or find your physical classroom instantly.
              </p>
              
              <div className="flex gap-4">
                 <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex-1 text-center">
                    <span className="block text-3xl font-bold text-white mb-1">3</span>
                    <span className="text-xs text-blue-200 uppercase tracking-wider">Classes</span>
                 </div>
                 <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex-1 text-center">
                    <span className="block text-3xl font-bold text-brand-glow">1</span>
                    <span className="text-xs text-blue-200 uppercase tracking-wider">Assignments</span>
                 </div>
              </div>
            </div>

            {/* Right List */}
            <div className="lg:col-span-3 space-y-4">
              {SCHEDULE.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.15 }}
                  className="group bg-slate-900/40 backdrop-blur-xl border border-white/5 hover:border-white/20 p-5 rounded-2xl transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-5 w-full">
                    <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white border border-white/10 shadow-lg ${item.status === 'Live' ? 'bg-brand-primary' : 'bg-slate-800'}`}>
                      <span className="text-xs opacity-70">{item.time.split(' ')[1]}</span>
                      <span className="font-bold text-lg">{item.time.split(' ')[0]}</span>
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg flex items-center gap-2">
                        {item.subject}
                        {item.status === 'Live' && (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                        )}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-slate-300 mt-1">
                        <span className="flex items-center gap-1.5"><Clock size={14} /> {item.type}</span>
                        <span className="flex items-center gap-1.5">
                           {item.room === 'Online' ? <Video size={14} /> : <MapPin size={14} />} 
                           {item.room}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    {item.status === 'Live' ? (
                       <button className="px-5 py-2 rounded-full bg-white text-brand-primary font-bold text-sm shadow hover:bg-slate-100 transition-colors whitespace-nowrap">
                         Join Class
                       </button>
                    ) : (
                       <button className="p-2 rounded-full hover:bg-white/10 text-slate-400 transition-colors">
                         <MoreHorizontal size={20} />
                       </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

          </div>
        </div>
      </Reveal>
    </section>
  );
};