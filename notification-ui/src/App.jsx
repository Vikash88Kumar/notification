import React, { useState, useEffect, useRef } from 'react';
import { 
  Server, Database, Mail, Smartphone, Bell, Workflow, 
  Code, Layout, Zap, ArrowRight, CheckCircle2, Terminal, Shield, Activity,
  GitBranch, Wifi, WifiOff, MessageCircle, Check, X, RotateCcw, UserPlus, Heart, AtSign, AlertTriangle
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

const COL = {
  app: 70,
  api: 200,
  postgres: 330,
  redis: 460,
  kafka: 590,
  orchestrator: 720,
  workers: 850,
};
 
const ACTORS = [
  { id: 'app', label: "Friend's App" },
  { id: 'api', label: 'Notification API' },
  { id: 'postgres', label: 'Postgres DB' },
  { id: 'redis', label: 'Redis Cache' },
  { id: 'kafka', label: 'Kafka Events' },
  { id: 'orchestrator', label: 'Orchestrator' },
  { id: 'workers', label: 'Workers' },
];
 
const DIAGRAM_BOTTOM = 940;
 
// ---- colors, matched to the screenshot's dark theme ----
const C = {
  bg: '#181818',
  headerFill: '#262626',
  headerStroke: '#52525b',
  headerText: '#e4e4e7',
  lifeline: '#52525b',
  msgLine: '#71717a',
  dot: '#38bdf8',
  msgText: '#a1a1aa',
  phaseFill: '#262626',
  phaseStroke: '#52525b',
  altStroke: '#52525b',
  altTagFill: '#262626',
  condText: '#9ca3af',
};

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

  const [userEmail, setUserEmail] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);

  const registerDevice = async () => {
    if (!userEmail || !userEmail.includes('@')) {
      return alert("Please enter a valid email address!");
    }
    try {
      const token = await getToken(messaging, { 
        vapidKey: 'BA6CZ5D9U-OB9PAlrc7RjIkdDQHjWrype-_sAZUhBZK32lau5GA8LW_uKsKew3YMFLZlFCb5wBxqtzGcwaIzymY' 
      });
      
      if (token) {
        console.log("Real Token:", token);
        const baseUrl = import.meta.env.VITE_API_URL || 'https://notification-olgf.onrender.com';
        await fetch(`${baseUrl}/users/1/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            fcm_token: token,
            email: userEmail
          })
        });
        setIsRegistered(true);
        alert("Device & Email Registered Successfully!");
      }
    } catch (err) {
      console.error("Token error:", err);
      alert("Failed to get device token. Please allow notification permissions in your browser.");
    }
  };

  // Set up WebSocket for User Presence (Online Status)
  useEffect(() => {
    // Convert HTTP URL to WS URL
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws/1';
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('🟢 WebSocket Connected: User is now ONLINE');
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, 30000);
      
      ws.onclose = () => clearInterval(pingInterval);
    };

    ws.onmessage = (event) => {
      console.log("WebSocket Message:", event.data);
    };

    ws.onerror = (error) => {
      console.error('🔴 WebSocket Error:', error);
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="min-h-screen font-sans bg-[#000000] text-slate-300 selection:bg-indigo-500/30">
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600/20 text-indigo-400 p-2 rounded-lg border border-indigo-500/20">
              <Zap size={20} className="drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Notification<span className="text-indigo-400">Engine</span></span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#demo" className="hover:text-white transition-colors">Live Demo</a>
            <a href="#docs" className="hover:text-white transition-colors">API Docs</a>
            <a href="https://github.com/Vikash88Kumar/notification" target="_blank" className="bg-white text-black px-4 py-2 rounded-full hover:bg-slate-200 transition-colors">
              View on GitHub
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-32 pb-20 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium mb-8">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            v2.0 Stateless API is now live
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight max-w-4xl leading-tight mb-8">
            The notification infrastructure for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">modern SaaS</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
            Instantly route events to Email, Push, and In-App channels. Completely stateless, presence-aware, and built on Kafka for massive scale.
          </p>
          <div className="flex gap-4">
            <button onClick={() => {
              document.getElementById('demo').scrollIntoView({ behavior: 'smooth' });
              setActiveTab('demo');
            }} className="bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-slate-200 transition-all flex items-center gap-2">
              Try Interactive Demo <ArrowRight size={18} />
            </button>
            <button onClick={() => {
              document.getElementById('demo').scrollIntoView({ behavior: 'smooth' });
              setActiveTab('api');
            }} className="bg-white/5 border border-white/10 text-white px-6 py-3 rounded-lg font-medium hover:bg-white/10 transition-all flex items-center gap-2">
              <Code size={18} /> View API Docs
            </button>
          </div>
        </div>
      </main>

      {/* Device Registration Banner */}
      <section className="max-w-4xl mx-auto px-6 mb-24 relative z-10">
        <div className="bg-white/5 border border-white/10 p-1 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-sm">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Mail size={20} className="text-indigo-400" /> Device Registration
            </h3>
            <p className="text-sm text-slate-400 mt-1">Register your email and allow permissions to receive offline push notifications to your inbox and device.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <input 
              type="email" 
              placeholder="Enter your email address" 
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              disabled={isRegistered}
              className="px-4 py-2 rounded-lg bg-black/50 border border-white/10 w-full md:w-64 focus:outline-none focus:border-indigo-500 disabled:opacity-50 text-white"
            />
            <button 
              onClick={registerDevice}
              disabled={isRegistered}
              className={`px-4 py-2 rounded-lg font-medium text-white transition-all whitespace-nowrap disabled:opacity-90 ${isRegistered ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 cursor-default' : 'bg-indigo-600 hover:bg-indigo-500 active:scale-95'}`}
            >
              {isRegistered ? 'Registered ✓' : 'Register'}
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/[0.07] transition-all">
            <div className="bg-indigo-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-6 border border-indigo-500/30">
              <Database className="text-indigo-400" size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Stateless Payloads</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              No need to sync your database with ours. Pass the user's email or FCM token directly in the API payload and we'll deliver it instantly.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/[0.07] transition-all">
            <div className="bg-cyan-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-6 border border-cyan-500/30">
              <Activity className="text-cyan-400" size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Smart Presence</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              We detect if your user is online via WebSockets or our Presence API. If they are active in your app, we automatically suppress noisy emails to prevent spam.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/[0.07] transition-all">
            <div className="bg-pink-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-6 border border-pink-500/30">
              <Shield className="text-pink-400" size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Force Delivery</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              For critical alerts like password resets or payment receipts, pass <code>force_delivery: true</code> to bypass presence checks and guarantee delivery.
            </p>
          </div>
        </div>
      </section>

      {/* Tabs Section */}
      <section id="demo" className="max-w-7xl mx-auto px-6 py-12">
        
        <div className="flex justify-center mb-12">
          <nav className="flex space-x-2 bg-white/5 border border-white/10 p-1.5 rounded-xl backdrop-blur-md">
            {[
              { id: 'demo', icon: Layout, label: 'Interactive Demo' },
              { id: 'api', icon: Terminal, label: 'API Playground' },
              { id: 'arch', icon: Workflow, label: 'Exact Architecture Diagram' },
              { id: 'sim', icon: Activity, label: 'Flow Simulator' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-white/10 text-white shadow-sm border border-white/10' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="min-h-[600px]">
          {activeTab === 'arch' && <SequenceDiagramExact />}
          {activeTab === 'sim' && <NotificationSimulator />}
          {activeTab === 'api' && <ApiGuideTab />}
          {activeTab === 'demo' && <LiveDemoTab />}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 text-center text-slate-500 text-sm">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Zap size={16} className="text-indigo-500" />
          <span className="font-semibold text-slate-300">Notification Engine SaaS</span>
        </div>
        <p>Built for modern developers.</p>
      </footer>
    </div>
  );
}

// --- TAB COMPONENTS ---

function Arrow({ from, to, y, label }) {
  const x1 = COL[from];
  const x2 = COL[to];
  const mid = (x1 + x2) / 2;
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={C.msgLine} strokeWidth="1" />
      <circle cx={x1} cy={y} r="3" fill={C.dot} />
      <circle cx={x2} cy={y} r="3" fill={C.dot} />
      <text x={mid} y={y - 8} textAnchor="middle" fontSize="10.5" fill={C.msgText}>
        {label}
      </text>
    </g>
  );
}
 
function SelfLoop({ id, y, label }) {
  const x = COL[id];
  return (
    <g>
      <path d={`M ${x} ${y} h 34 v 18 h -34`} fill="none" stroke={C.msgLine} strokeWidth="1" />
      <circle cx={x} cy={y} r="3" fill={C.dot} />
      <text x={x + 42} y={y + 13} fontSize="10.5" fill={C.msgText}>
        {label}
      </text>
    </g>
  );
}
 
function PhaseBadge({ y, label }) {
  const w = Math.max(160, label.length * 6.2 + 24);
  const x = 460 - w / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height="24" rx="4" fill={C.phaseFill} stroke={C.phaseStroke} strokeWidth="1" />
      <text x={x + w / 2} y={y + 16} textAnchor="middle" fontSize="10.5" fontWeight="500" fill={C.headerText}>
        {label}
      </text>
    </g>
  );
}
 
 function SequenceDiagramExact() {
  return (
    <div className="rounded-2xl border border-zinc-700 p-6" style={{ background: C.bg }}>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 1150 ${DIAGRAM_BOTTOM}`} style={{ minWidth: 1150 }} width="100%">
          {/* lifelines */}
          {ACTORS.map((a) => (
            <line
              key={a.id}
              x1={COL[a.id]}
              y1="50"
              x2={COL[a.id]}
              y2={DIAGRAM_BOTTOM - 10}
              stroke={C.lifeline}
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          ))}
 
          {/* actor header boxes */}
          {ACTORS.map((a) => (
            <g key={a.id}>
              <rect
                x={COL[a.id] - 58}
                y="14"
                width="116"
                height="32"
                rx="6"
                fill={C.headerFill}
                stroke={C.headerStroke}
                strokeWidth="1"
              />
              <text
                x={COL[a.id]}
                y="34"
                textAnchor="middle"
                fontSize="11"
                fontWeight="500"
                fill={C.headerText}
              >
                {a.label}
              </text>
            </g>
          ))}
 
          {/* setup */}
          <SelfLoop id="app" y="90" label="App requests notification permissions" />
          <Arrow from="app" to="api" y="150" label="POST /users/token (Saves Email & FCM Token)" />
          <Arrow from="api" to="postgres" y="195" label="Updates User Record" />
          <Arrow from="app" to="api" y="240" label="Connects via WebSocket" />
          <Arrow from="api" to="redis" y="285" label="Marks user as 'Online'" />
 
          <PhaseBadge y="320" label="Phase 2: Event Trigger (e.g., Friend Request)" />
          <Arrow from="api" to="kafka" y="375" label="Publishes to 'notification.events' topic" />
 
          <PhaseBadge y="410" label="Phase 3: Orchestration & Routing" />
          <Arrow from="kafka" to="orchestrator" y="465" label="Consumes new event" />
          <Arrow from="orchestrator" to="postgres" y="510" label="Checks user preferences (if enabled)" />
          <Arrow from="orchestrator" to="kafka" y="555" label="Routes to 'push.queue' & 'email.queue'" />
 
          <PhaseBadge y="590" label="Phase 4: Smart Delivery" />
          <Arrow from="kafka" to="workers" y="645" label="Email/Push Workers consume event" />
          <Arrow from="workers" to="redis" y="690" label="Checks if user is currently online" />
 
          {/* alt fragment */}
          <rect
            x="20"
            y="715"
            width="1110"
            height="205"
            fill="none"
            stroke={C.altStroke}
            strokeWidth="1"
          />
          <path d="M 20 800 h 1110" stroke={C.altStroke} strokeDasharray="4 3" strokeWidth="1" />
          <rect x="20" y="715" width="52" height="20" fill={C.altTagFill} stroke={C.altStroke} strokeWidth="1" />
          <text x="46" y="729" textAnchor="middle" fontSize="10" fontWeight="600" fill={C.headerText}>
            alt
          </text>
          <text x="82" y="729" fontSize="10.5" fontStyle="italic" fill={C.condText}>
            [User is Online]
          </text>
          <SelfLoop id="workers" y="755" label="Skips notification (Avoids spamming active user)" />
 
          <text x="30" y="816" fontSize="10.5" fontStyle="italic" fill={C.condText}>
            [User is Offline]
          </text>
          <Arrow from="workers" to="postgres" y="850" label="Fetches FCM Token / Email" />
          <SelfLoop id="workers" y="875" label="Formats predefined 'Friend Request' template" />
          <Arrow from="workers" to="app" y="905" label="Delivers via Firebase/Resend!" />
        </svg>
      </div>
    </div>
  );
}

function ApiGuideTab() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid md:grid-cols-2 gap-6">
      <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Server size={20} className="text-indigo-400"/> POST /events</h2>
        <p className="text-sm text-slate-400 mb-6">Fire an event to the API. We handle the multi-channel routing.</p>
        <div className="bg-[#0a0a0a] border border-white/10 p-5 rounded-2xl text-sm overflow-x-auto font-mono text-slate-300">
          <pre>{`fetch('https://api.yourdomain.com/events', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_secure_api_key'
  },
  body: JSON.stringify({
    user_id: "customer_992",
    event_type: "payment.success",
    force_delivery: true, // Bypass presence
    contact_info: {
      email: "user@example.com",
      fcm_token: "fGhz7..."
    },
    payload: {
      item: "Payment of $49.00 received!"
    }
  })
});`}</pre>
        </div>
      </div>

      <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Activity size={20} className="text-cyan-400"/> Presence API</h2>
        <p className="text-sm text-slate-400 mb-6">Manually tell the engine your user is online to suppress spam.</p>
        <div className="bg-[#0a0a0a] border border-white/10 p-5 rounded-2xl text-sm overflow-x-auto font-mono text-slate-300 h-full">
          <pre>{`// Mark User Online (expires in 5m)
fetch('https://api.yourdomain.com/users/1/presence', {
  method: 'POST'
});

// Mark User Offline instantly
fetch('https://api.yourdomain.com/users/1/presence', {
  method: 'DELETE'
});`}</pre>
        </div>
      </div>
    </div>
  );
}

function LiveDemoTab() {
  const [channel, setChannel] = useState('push');
  const [payload, setPayload] = useState('Welcome to the system!');
  const [eventType, setEventType] = useState('user.alert');
  const [forceDelivery, setForceDelivery] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  const handleFireEvent = async (e) => {
    e.preventDefault();
    setIsSending(true);
    setShowNotification(false);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'default-dev-key'
        },
        body: JSON.stringify({
          user_id: "1",
          event_type: eventType,
          force_delivery: forceDelivery,
          channels: [channel],
          payload: {
            item: payload
          }
        })
      });

      if (!response.ok) throw new Error('API Error');

      setIsSending(false);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000); 

    } catch (error) {
      alert(`Failed to reach backend!`);
      setIsSending(false);
    }
  };

  const getPreviewText = () => {
    if (eventType === 'friend_request') return "Someone wants to connect with you.";
    if (eventType === 'friend_accepted') return "A user is now your friend.";
    if (eventType === 'friend_message') return `A friend: ${payload}`;
    return payload;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid md:grid-cols-2 gap-12 items-center">
      
      {/* Form Controls */}
      <div className="bg-white/5 p-8 rounded-3xl border border-white/10 h-fit">
        <h2 className="text-2xl font-bold text-white mb-6">Test the Pipeline</h2>
        <form onSubmit={handleFireEvent} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Event Type (Format)</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white"
            >
              <option value="user.alert">Default Format</option>
              <option value="friend_request">Friend Request</option>
              <option value="friend_accepted">Friend Accepted</option>
              <option value="friend_message">Friend Message</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Message Payload</label>
            <input 
              type="text" 
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white"
              placeholder="Enter message..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Target Channel</label>
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
                  className={`flex flex-col items-center gap-2 p-4 border rounded-xl transition-all ${
                    channel === c.id 
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                      : 'border-white/10 text-slate-500 hover:bg-white/5'
                  }`}
                >
                  <c.icon size={20} />
                  <span className="text-xs font-semibold">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5">
            <input 
              type="checkbox" 
              id="force" 
              checked={forceDelivery}
              onChange={(e) => setForceDelivery(e.target.checked)}
              className="w-5 h-5 rounded border-slate-600 text-indigo-600 focus:ring-indigo-600 bg-transparent"
            />
            <label htmlFor="force" className="text-sm text-slate-300 cursor-pointer">
              <span className="font-bold text-white block">Force Delivery</span>
              <span className="text-xs text-slate-500">Bypass presence checks (simulates password reset)</span>
            </label>
          </div>

          <button 
            type="submit"
            disabled={isSending}
            className="w-full bg-white text-black font-semibold py-4 rounded-xl hover:bg-slate-200 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
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
      <div className="flex justify-center items-center relative h-full min-h-[500px]">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />
        
        {/* Phone Mockup for Push & In-App */}
        {(channel === 'push' || channel === 'inapp') && (
          <div className="w-[300px] h-[600px] bg-black rounded-[3rem] p-3 shadow-2xl relative border-[4px] border-slate-800 z-10">
            {/* Screen */}
            <div className="w-full h-full bg-[#0a0a0a] rounded-[2.5rem] overflow-hidden relative border border-white/5">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-20"></div>
              
              {/* Fake App UI */}
              <div className="bg-indigo-600/10 border-b border-indigo-500/20 h-48 p-6 pt-12 text-white">
                <h3 className="text-xl font-bold text-indigo-400">Demo App</h3>
                <p className="text-sm text-slate-500 mt-2">Listening for events...</p>
              </div>
              
              {/* The Notification Pop-up */}
              {showNotification && (
                <div className="absolute top-12 left-4 right-4 bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white/10 animate-in slide-in-from-top-8 fade-in duration-300 z-30">
                  <div className="flex gap-3">
                    <div className="bg-indigo-500/20 p-2 rounded-xl h-fit text-indigo-400 border border-indigo-500/20">
                      {channel === 'push' ? <Smartphone size={16}/> : <Bell size={16}/>}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        {channel === 'push' ? 'Push Notification' : 'In-App Alert'}
                      </p>
                      <p className="text-slate-200 font-medium text-sm leading-tight">{getPreviewText()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Email Mockup */}
        {channel === 'email' && (
          <div className="w-full max-w-md bg-[#0a0a0a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden z-10 relative">
            <div className="bg-black border-b border-white/10 p-4 flex items-center justify-between">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                <div className="w-3 h-3 rounded-full bg-slate-700"></div>
              </div>
              <div className="text-xs text-slate-500 font-medium bg-white/5 px-3 py-1 rounded-full">Mail.app</div>
            </div>
            <div className="p-6 h-[400px]">
              <h3 className="font-bold text-xl mb-1 text-white">Inbox</h3>
              <p className="text-slate-500 text-sm mb-6 border-b border-white/10 pb-4">1 new message</p>
              
              {showNotification ? (
                <div className="animate-in fade-in zoom-in-95 duration-300 bg-white/5 p-5 rounded-xl border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
                    <div className="bg-indigo-500 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-[0_0_10px_rgba(99,102,241,0.5)]">N</div>
                    <div>
                      <p className="font-bold text-sm text-slate-200">Notification Engine</p>
                      <p className="text-xs text-slate-500">to: user@example.com</p>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">{getPreviewText()}</p>
                  <div className="mt-6 pt-4 border-t border-white/5 flex gap-2">
                     <div className="h-8 w-24 bg-white/10 rounded-md"></div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-600 py-20 flex flex-col items-center gap-3">
                  <Mail size={48} className="opacity-20" />
                  <p className="text-sm font-medium">Waiting for email events...</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CAT = {
  entry: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', ring: 'ring-blue-400/50' },
  pipeline: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', ring: 'ring-purple-400/50' },
  delivery: { text: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/30', ring: 'ring-teal-400/50' },
};

const MAIN_STEPS = [
  { id: 'client', label: 'Client app', desc: 'Event triggered', icon: Smartphone, cat: 'entry' },
  { id: 'gateway', label: 'API gateway', desc: 'Publishes event', icon: Server, cat: 'entry' },
  { id: 'kafka', label: 'Kafka', desc: "'notification.events'", icon: Workflow, cat: 'pipeline' },
  {
    id: 'pref',
    label: 'Check preference',
    desc: 'Postgres lookup',
    icon: GitBranch,
    cat: 'pipeline',
    decision: true,
    passIf: (s) => s.preference === 'enabled',
    skipMsg: 'Stopped — notification preference is off',
  },
  {
    id: 'presence',
    label: 'Check presence',
    desc: 'Redis lookup',
    icon: Wifi,
    cat: 'pipeline',
    decision: true,
    passIf: (s) => s.presence === 'offline',
    skipMsg: 'Stopped — user is online, skip to avoid spamming',
  },
];

const BRANCHES = [
  {
    id: 'email',
    queue: { id: 'email_queue', label: 'Email queue', desc: 'Kafka topic', icon: Mail, cat: 'pipeline' },
    deliver: { id: 'email_deliver', label: 'Resend', desc: 'Email delivery', icon: Mail, cat: 'delivery' },
  },
  {
    id: 'push',
    queue: { id: 'push_queue', label: 'Push queue', desc: 'Kafka topic', icon: Bell, cat: 'pipeline' },
    deliver: { id: 'push_deliver', label: 'Firebase FCM', desc: 'Push delivery', icon: Bell, cat: 'delivery' },
  },
  {
    id: 'inapp',
    queue: { id: 'inapp_queue', label: 'In-app queue', desc: 'Kafka topic', icon: MessageCircle, cat: 'pipeline' },
    deliver: { id: 'inapp_deliver', label: 'WebSocket', desc: 'In-app delivery', icon: MessageCircle, cat: 'delivery' },
  },
];

const EVENTS = [
  { id: 'friend_request', label: 'Friend request', icon: UserPlus },
  { id: 'post_like', label: 'Post like', icon: Heart },
  { id: 'comment', label: 'New comment', icon: MessageCircle },
  { id: 'mention', label: 'Mention', icon: AtSign },
];

function NodeCard({ step, status }) {
  const c = CAT[step.cat];
  const Icon = step.icon;
  const isSkipped = status === 'skipped';
  const isActive = status === 'active';
  const isDone = status === 'done';

  return (
    <div className="flex flex-col items-center gap-2 w-28 shrink-0">
      <div
        className={`relative p-4 rounded-2xl border transition-all duration-300 ${c.bg} ${
          isSkipped ? 'border-red-500/30 opacity-40 grayscale' : c.border
        } ${isActive ? `ring-4 ${c.ring} scale-110` : ''}`}
      >
        <Icon size={24} className={isSkipped ? 'text-red-400' : c.text} />
        {isDone && (
          <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 rounded-full p-0.5">
            <Check size={10} className="text-white" />
          </span>
        )}
        {isSkipped && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5">
            <X size={10} className="text-white" />
          </span>
        )}
      </div>
      <div className="text-center">
        <div className="text-xs font-medium text-slate-300">{step.label}</div>
        <div className="text-[10px] text-slate-500">{step.desc}</div>
      </div>
    </div>
  );
}

function NotificationSimulator() {
  const [presence, setPresence] = useState('offline');
  const [preference, setPreference] = useState('enabled');
  const [simulateError, setSimulateError] = useState(false);
  const [activeEvent, setActiveEvent] = useState(null);
  const [statuses, setStatuses] = useState({});
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);
  const [reachedFanout, setReachedFanout] = useState(false);
  const runId = useRef(0);

  const reset = () => {
    setStatuses({});
    setLog([]);
    setActiveEvent(null);
    setReachedFanout(false);
  };

  const runEvent = async (event) => {
    if (running) return;
    setStatuses({});
    setLog([]);
    setReachedFanout(false);
    setActiveEvent(event.id);
    setRunning(true);
    const myRun = ++runId.current;
    const state = { presence, preference };

    for (const step of MAIN_STEPS) {
      if (runId.current !== myRun) return;
      setStatuses((s) => ({ ...s, [step.id]: 'active' }));
      await sleep(600);
      if (runId.current !== myRun) return;

      if (step.decision && !step.passIf(state)) {
        setStatuses((s) => ({ ...s, [step.id]: 'skipped' }));
        setLog((l) => [...l, { ok: false, text: step.skipMsg }]);
        setRunning(false);
        return;
      }
      setStatuses((s) => ({ ...s, [step.id]: 'done' }));
      setLog((l) => [...l, { ok: true, text: `${step.label} — ${step.desc}` }]);
    }

    if (runId.current !== myRun) return;
    setReachedFanout(true);
    setStatuses((s) => {
      const next = { ...s };
      BRANCHES.forEach((b) => (next[b.queue.id] = 'active'));
      return next;
    });
    await sleep(600);
    if (runId.current !== myRun) return;
    setStatuses((s) => {
      const next = { ...s };
      BRANCHES.forEach((b) => (next[b.queue.id] = 'done'));
      return next;
    });
    setLog((l) => [...l, ...BRANCHES.map((b) => ({ ok: true, text: `${b.queue.label} — routed` }))]);

    await sleep(300);
    if (runId.current !== myRun) return;
    setStatuses((s) => {
      const next = { ...s };
      BRANCHES.forEach((b) => (next[b.deliver.id] = 'active'));
      return next;
    });
    await sleep(600);
    if (runId.current !== myRun) return;
    
    if (simulateError) {
      setStatuses((s) => {
        const next = { ...s };
        BRANCHES.forEach((b) => (next[b.deliver.id] = 'skipped'));
        return next;
      });
      setLog((l) => [...l, { ok: false, text: `Delivery failed (simulated error). Routing to retry queue.` }]);

      await sleep(600);
      if (runId.current !== myRun) return;
      setStatuses((s) => ({ ...s, retry_queue: 'active' }));
      
      await sleep(600);
      if (runId.current !== myRun) return;
      setStatuses((s) => ({ ...s, retry_queue: 'done', retry_worker: 'active' }));
      setLog((l) => [...l, { ok: true, text: `Retry queue — routed` }]);

      await sleep(600);
      if (runId.current !== myRun) return;
      setStatuses((s) => ({ ...s, retry_worker: 'skipped' }));
      setLog((l) => [...l, { ok: false, text: `Retry worker — failed again (max retries exceeded)` }]);

      await sleep(600);
      if (runId.current !== myRun) return;
      setStatuses((s) => ({ ...s, dlq: 'active' }));
      
      await sleep(600);
      if (runId.current !== myRun) return;
      setStatuses((s) => ({ ...s, dlq: 'done' }));
      setLog((l) => [...l, { ok: false, text: `DLQ — message dead-lettered for manual review` }]);
      
    } else {
      setStatuses((s) => {
        const next = { ...s };
        BRANCHES.forEach((b) => (next[b.deliver.id] = 'done'));
        return next;
      });
      setLog((l) => [...l, ...BRANCHES.map((b) => ({ ok: true, text: `${b.deliver.label} — ${b.deliver.desc}` }))]);
    }
    
    setRunning(false);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white/5 p-8 md:p-10 rounded-3xl border border-white/10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Notification flow simulator</h2>
          <p className="text-sm text-slate-500">Set the user's state, then pick an event to run it through</p>
        </div>

        <div className="max-w-2xl mx-auto mb-8">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2 text-center">
            1. User state
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex rounded-lg border border-white/10 overflow-hidden">
              {['enabled', 'disabled'].map((v) => (
                <button
                  key={v}
                  disabled={running}
                  onClick={() => setPreference(v)}
                  className={`px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                    preference === v ? 'bg-purple-500/10 text-purple-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Preference: {v}
                </button>
              ))}
            </div>

            <div className="flex rounded-lg border border-white/10 overflow-hidden">
              <button
                disabled={running}
                onClick={() => setPresence('online')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                  presence === 'online' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Wifi size={14} /> Online
              </button>
              <button
                disabled={running}
                onClick={() => setPresence('offline')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                  presence === 'offline' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <WifiOff size={14} /> Offline
              </button>
            </div>
            
            <div className="flex rounded-lg border border-white/10 overflow-hidden ml-4">
              <button
                disabled={running}
                onClick={() => setSimulateError(true)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                  simulateError ? 'bg-red-500/10 text-red-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                 Error: ON
              </button>
              <button
                disabled={running}
                onClick={() => setSimulateError(false)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                  !simulateError ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                 Error: OFF
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto mb-10">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2 text-center">
            2. Trigger an event
          </div>
          <div className="grid grid-cols-2 gap-2">
            {EVENTS.map((ev) => {
              const Icon = ev.icon;
              const isActive = activeEvent === ev.id;
              return (
                <button
                  key={ev.id}
                  disabled={running}
                  onClick={() => runEvent(ev)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 ${
                    isActive
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                      : 'border-white/10 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <Icon size={15} />
                  {ev.label}
                </button>
              );
            })}
          </div>
          {(log.length > 0 || running) && (
            <button
              onClick={reset}
              disabled={running}
              className="flex items-center gap-1.5 mx-auto mt-3 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>

        <div className="flex items-start justify-center gap-3 overflow-x-auto pb-2">
          {MAIN_STEPS.map((step, i) => (
            <React.Fragment key={step.id}>
              <NodeCard step={step} status={statuses[step.id] || 'idle'} />
              {i < MAIN_STEPS.length - 1 && <div className="w-6 h-px bg-white/10 mt-7 shrink-0" />}
            </React.Fragment>
          ))}
        </div>

        {reachedFanout && (
          <div className="flex flex-col items-center mt-2 mb-2">
            <div className="w-px h-6 bg-white/10" />
          </div>
        )}
        {reachedFanout && (
          <div className="flex flex-wrap items-start justify-center gap-8 mb-8">
            {BRANCHES.map((b) => (
              <div key={b.id} className="flex items-center gap-3">
                <NodeCard step={b.queue} status={statuses[b.queue.id] || 'idle'} />
                <div className="w-6 h-px bg-white/10 mt-[-24px]" />
                <NodeCard step={b.deliver} status={statuses[b.deliver.id] || 'idle'} />
              </div>
            ))}
          </div>
        )}
        
        {reachedFanout && (statuses['retry_queue'] || simulateError) && (
           <div className="flex flex-col items-center mt-2 mb-8 opacity-0 animate-in fade-in fill-mode-forwards delay-300">
              <div className="text-xs font-medium uppercase tracking-wide text-red-400 mb-4">Error Recovery Pipeline</div>
              <div className="flex items-center gap-3">
                 <NodeCard step={{ id: 'retry_queue', label: 'Retry queue', desc: 'Kafka topic', icon: RotateCcw, cat: 'pipeline' }} status={statuses['retry_queue'] || 'idle'} />
                 <div className="w-6 h-px bg-white/10 mt-[-24px]" />
                 <NodeCard step={{ id: 'retry_worker', label: 'Retry worker', desc: 'Attempt again', icon: Server, cat: 'pipeline' }} status={statuses['retry_worker'] || 'idle'} />
                 <div className="w-6 h-px bg-white/10 mt-[-24px]" />
                 <NodeCard step={{ id: 'dlq', label: 'DLQ', desc: 'Dead Letter Queue', icon: AlertTriangle, cat: 'entry' }} status={statuses['dlq'] || 'idle'} />
              </div>
           </div>
        )}

        <div className="max-w-md mx-auto space-y-1.5 min-h-[40px]">
          {log.map((l, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {l.ok ? <Check size={14} className="text-emerald-500 shrink-0" /> : <X size={14} className="text-red-500 shrink-0" />}
              <span className={l.ok ? 'text-slate-400' : 'text-red-400 font-medium'}>{l.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
