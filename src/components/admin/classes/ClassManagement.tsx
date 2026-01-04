"use client";

import React, { useState } from "react";
import { ClassList } from "./ClassList";
import { StudentList } from "./StudentList";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const ClassManagement = () => {
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [selectedClassName, setSelectedClassName] = useState<string | null>(null);

    return (
        <div className="space-y-6">
            <AnimatePresence mode="wait">
                {!selectedClassId ? (
                    <motion.div
                        key="classList"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        <ClassList
                            onSelectClass={(id, name) => {
                                setSelectedClassId(id);
                                setSelectedClassName(name);
                            }}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="studentList"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSelectedClassId(null);
                                    setSelectedClassName(null);
                                }}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Classes
                            </Button>
                            <h2 className="text-2xl font-bold text-white">
                                {selectedClassName} <span className="text-slate-500 font-normal">Students</span>
                            </h2>
                        </div>

                        <StudentList classId={selectedClassId} className={selectedClassName || ""} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
