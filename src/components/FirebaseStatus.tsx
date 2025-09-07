import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

const FirebaseStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Test connection by listening to a test document
    const testDoc = doc(db, 'connection-test', 'status');
    
    const unsubscribe = onSnapshot(
      testDoc,
      () => {
        setIsConnected(true);
        setLastSync(new Date());
        setError(null);
      },
      (err) => {
        setIsConnected(false);
        setError(err.message);
        console.error('Firebase connection error:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 ${
          isConnected 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}
      >
        {isConnected ? (
          <>
            <CheckCircle className="w-4 h-4" />
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Connection Lost</span>
          </>
        )}
        
        {error && (
          <div className="ml-2 text-xs opacity-75">
            {error}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default FirebaseStatus;