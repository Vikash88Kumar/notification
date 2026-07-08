import React, { useState, useEffect } from 'react';
import { 
  Server, Database, Mail, Smartphone, Bell, Workflow, 
  Code, Layout, Zap, ArrowRight, CheckCircle2 
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

export default function App() {
  const [activeTab, setActiveTab] = useState('demo');


const firebaseConfig = {
  apiKey: "AIzaSyCXKGuwKX3zHQ9VslvrTNESCPAFON12lYA",
  authDomain: "notification-service-ed93d.firebaseapp.com",
  projectId: "notification-service-ed93d",
  storageBucket: "notification-service-ed93d.firebasestorage.app",
  messagingSenderId: "351765879932",
  appId: "1:351765879932:web:d474b0c86e13f855ccfdf9",
  measurementId: "G-2MPEQH3TTK"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Inside your main App component:
useEffect(() => {
const getDeviceToken = async () => {
    try {
      const token = await getToken(messaging, { 
        // PASTE YOUR PUBLIC KEY HERE
        vapidKey: 'BA6CZ5D9U-OB9PAlrc7RjIkdDQHjWrype-_sAZUhBZK32lau5GA8LW_uKsKew3YMFLZlFCb5wBxqtzGcwaIzymY' 
      });
      
      if (token) {
        console.log("Real Token:", token);
        await fetch('http://127.0.0.1:8080/users/1/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fcm_token: token })
        });
      }
    } catch (err) {
      console.error("Token error:", err);
    }
  };
  getDeviceToken();
}, []);

  return (
    <div className="min-h-screen font-sans text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Zap size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Notification Engine</h1>
          </div>
          
          {/* Navigation Tabs */}
          <nav className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
            {[
              { id: 'arch', icon: Workflow, label: 'Architecture' },
              { id: 'api', icon: Code, label: 'API Guide' },
              { id: 'demo', icon: Layout, label: 'Live Demo' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === 'arch' && <ArchitectureTab />}
        {activeTab === 'api' && <ApiGuideTab />}
        {activeTab === 'demo' && <LiveDemoTab />}
      </main>
    </div>
  );
}

// --- TAB COMPONENTS ---

function ArchitectureTab() {
  const nodes = [
    { name: 'Client App', icon: Smartphone, color: 'bg-blue-100 text-blue-700' },
    { name: 'FastAPI Gateway', icon: Server, color: 'bg-indigo-100 text-indigo-700' },
    { name: 'Kafka Queues', icon: Workflow, color: 'bg-purple-100 text-purple-700' },
    { name: 'Worker Nodes', icon: Zap, color: 'bg-orange-100 text-orange-700' },
    { name: 'Postgres / Redis', icon: Database, color: 'bg-emerald-100 text-emerald-700' }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold mb-8">System Architecture</h2>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {nodes.map((node, i) => (
            <React.Fragment key={node.name}>
              <div className="flex flex-col items-center gap-3 text-center w-32 group cursor-pointer">
                <div className={`p-4 rounded-2xl ${node.color} ring-4 ring-transparent group-hover:ring-slate-100 transition-all`}>
                  <node.icon size={32} />
                </div>
                <span className="font-semibold text-sm">{node.name}</span>
              </div>
              {i < nodes.length - 1 && (
                <ArrowRight className="text-slate-300 hidden md:block" size={24} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function ApiGuideTab() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid md:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Smartphone size={20}/> Frontend: Get FCM Token</h2>
        <p className="text-sm text-slate-600 mb-4">Run this in your client app (React/Next.js) to generate a device token from Google.</p>
        <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-sm overflow-x-auto font-mono">
          <pre>{`import { getMessaging, getToken } from "firebase/messaging";

const messaging = getMessaging();

getToken(messaging, { vapidKey: 'YOUR_KEY' })
  .then((token) => {
    // Send token to your FastAPI backend
    fetch('http://localhost:8080/users/1/token', {
      method: 'POST',
      body: JSON.stringify({ fcm_token: token })
    });
  });`}</pre>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Server size={20}/> Backend: Trigger Event</h2>
        <p className="text-sm text-slate-600 mb-4">Send an event to your FastAPI gateway. The orchestrator will handle the rest.</p>
        <div className="bg-slate-900 text-sky-400 p-4 rounded-xl text-sm overflow-x-auto font-mono">
          <pre>{`// POST /events?user_id=1&event_type=user.alert

fetch('http://192.168.29.91:8080/events?user_id=1', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    item: "Your order has shipped!"
  })
});`}</pre>
        </div>
      </div>
    </div>
  );
}

function LiveDemoTab() {
  const [channel, setChannel] = useState('push');
  const [payload, setPayload] = useState('Welcome to the system!');
  const [isSending, setIsSending] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

const handleFireEvent = async (e) => {
    e.preventDefault();
    setIsSending(true);
    setShowNotification(false);
    
    try {
      // 🚀 THE REAL PIPELINE: Hitting your FastAPI Gateway
      const response = await fetch(`http://127.0.0.1:8080/events?user_id=1&event_type=user.alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // We pass the typed message payload to the backend
        body: JSON.stringify({
          item: payload 
        })
      });

      if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    // 🚀 FIRE AN ACTUAL NATIVE DESKTOP/PHONE NOTIFICATION
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("🔔 Microservice Alert", {
        body: payload,
        icon: "/vite.svg", // Path to an icon if you have one
        tag: "microservice-demo", // Prevents duplicate spamming stacking
      });
    }

    // Keep your internal UI preview state active too
    setIsSending(false);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 5000); 

    } catch (error) {
      console.error("Pipeline Error:", error);
      alert("Failed to reach the backend! Is FastAPI running on port 8080?");
      setIsSending(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid md:grid-cols-2 gap-12">
      {/* Form Controls */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 h-fit">
        <h2 className="text-2xl font-bold mb-6">Trigger Notification</h2>
        <form onSubmit={handleFireEvent} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Message Payload</label>
            <input 
              type="text" 
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="Enter message..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Target Channel</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'push', icon: Smartphone, label: 'Push' },
                { id: 'email', icon: Mail, label: 'Email' },
                { id: 'inapp', icon: Bell, label: 'In-App' }
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChannel(c.id)}
                  className={`flex flex-col items-center gap-2 p-3 border rounded-lg transition-all ${
                    channel === c.id 
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600' 
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <c.icon size={20} />
                  <span className="text-xs font-semibold">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
          <button 
            type="submit"
            disabled={isSending}
            className="w-full bg-slate-900 text-white font-medium py-3 rounded-lg hover:bg-slate-800 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {isSending ? (
              <span className="animate-pulse">Processing via Kafka...</span>
            ) : (
              <>Fire Event <Zap size={18} /></>
            )}
          </button>
        </form>
      </div>

      {/* Visual Preview Area */}
      <div className="flex justify-center items-center bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 p-8">
        
        {/* Phone Mockup for Push & In-App */}
        {(channel === 'push' || channel === 'inapp') && (
          <div className="w-[300px] h-[600px] bg-slate-900 rounded-[3rem] p-4 shadow-2xl relative border-[8px] border-slate-800">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20"></div>
            
            {/* Screen */}
            <div className="w-full h-full bg-slate-50 rounded-[2rem] overflow-hidden relative">
              {/* Fake App UI */}
              <div className="bg-indigo-600 h-48 p-6 pt-12 text-white">
                <h3 className="text-xl font-bold">My App</h3>
                <p className="opacity-80 mt-2">Waiting for events...</p>
              </div>
              
              {/* The Notification Pop-up */}
              {showNotification && (
                <div className="absolute top-12 left-4 right-4 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-100 animate-in slide-in-from-top-8 fade-in duration-300 z-30">
                  <div className="flex gap-3">
                    <div className="bg-indigo-100 p-2 rounded-full h-fit text-indigo-600">
                      {channel === 'push' ? <Smartphone size={16}/> : <Bell size={16}/>}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        {channel === 'push' ? 'Push Notification' : 'In-App Alert'}
                      </p>
                      <p className="text-slate-900 font-medium text-sm leading-tight">{payload}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Email Mockup */}
        {channel === 'email' && (
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 border-b border-slate-200 p-3 flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
            <div className="p-6">
              <h3 className="font-bold text-lg mb-1">Inbox</h3>
              <p className="text-slate-500 text-sm mb-6 border-b pb-4">1 new message</p>
              
              {showNotification ? (
                <div className="animate-in fade-in zoom-in-95 duration-300 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-3 border-b pb-3 mb-3">
                    <div className="bg-indigo-600 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold">N</div>
                    <div>
                      <p className="font-bold text-sm">Notification Engine</p>
                      <p className="text-xs text-slate-500">to: u24cs145@coed.svnit.ac.in</p>
                    </div>
                  </div>
                  <p className="text-slate-800">{payload}</p>
                </div>
              ) : (
                <div className="text-center text-slate-400 py-12 flex flex-col items-center gap-2">
                  <Mail size={32} />
                  <p>Waiting for email events...</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}