import React, { useState, useEffect } from 'react';
import { 
  Server, Database, Mail, Smartphone, Bell, Workflow, 
  Code, Layout, Zap, ArrowRight, CheckCircle2, Terminal, Shield, Activity
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
            <a href="https://github.com" target="_blank" className="bg-white text-black px-4 py-2 rounded-full hover:bg-slate-200 transition-colors">
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
              { id: 'arch', icon: Workflow, label: 'Architecture' }
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
          {activeTab === 'arch' && <ArchitectureTab />}
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

function ArchitectureTab() {
  const nodes = [
    { name: 'Client App', icon: Smartphone, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    { name: 'FastAPI Gateway', icon: Server, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
    { name: 'Kafka Queues', icon: Workflow, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    { name: 'Worker Nodes', icon: Zap, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
    { name: 'Neon / Upstash', icon: Database, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white/5 p-12 rounded-3xl border border-white/10 text-center">
        <h2 className="text-3xl font-bold text-white mb-12">Event-Driven Architecture</h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
          {nodes.map((node, i) => (
            <React.Fragment key={node.name}>
              <div className="flex flex-col items-center gap-4 text-center w-32 group cursor-pointer">
                <div className={`p-6 rounded-2xl border ${node.color} group-hover:bg-white/10 transition-all shadow-[0_0_15px_rgba(0,0,0,0.2)]`}>
                  <node.icon size={36} />
                </div>
                <span className="font-medium text-sm text-slate-300">{node.name}</span>
              </div>
              {i < nodes.length - 1 && (
                <ArrowRight className="text-slate-600 hidden md:block" size={24} />
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
          event_type: "user.alert",
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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid md:grid-cols-2 gap-12 items-center">
      
      {/* Form Controls */}
      <div className="bg-white/5 p-8 rounded-3xl border border-white/10 h-fit">
        <h2 className="text-2xl font-bold text-white mb-6">Test the Pipeline</h2>
        <form onSubmit={handleFireEvent} className="space-y-6">
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
                      <p className="text-slate-200 font-medium text-sm leading-tight">{payload}</p>
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
                  <p className="text-slate-300 text-sm leading-relaxed">{payload}</p>
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
}