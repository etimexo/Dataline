
import React, { useState, useEffect } from 'react';
import { DashboardIcon, MLIcon, ChatIcon, BoltIcon, BrainIcon, UploadIcon } from './ui/Icons';
import Button from './ui/Button';
import AuthModal from './AuthModal';

interface LandingPageProps {
    onGuestLogin: () => void;
}

// --- Visual Components for Illustrations ---

const MockChat = () => (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 w-full max-w-sm shadow-2xl transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
        <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="space-y-3">
            <div className="flex justify-end">
                <div className="bg-indigo-600 text-xs text-white p-2 rounded-lg rounded-br-none max-w-[80%]">
                    Predict sales for Q4 2026
                </div>
            </div>
            <div className="flex justify-start">
                <div className="bg-gray-800 border border-gray-700 text-xs text-gray-300 p-2 rounded-lg rounded-bl-none max-w-[90%] flex gap-2">
                    <div className="w-4 h-4 rounded-full bg-indigo-500 flex-shrink-0 animate-pulse"></div>
                    <div>
                        Based on current trends, Q4 sales are projected to grow by <span className="text-green-400 font-bold">18%</span>.
                    </div>
                </div>
            </div>
            <div className="flex justify-start">
                <div className="bg-gray-800 border border-gray-700 text-xs text-gray-300 p-2 rounded-lg rounded-bl-none max-w-[90%]">
                    <div className="h-16 w-full flex items-end gap-1 mt-1">
                         {[40, 60, 45, 70, 50, 80, 65].map((h, i) => (
                             <div key={i} className="flex-1 bg-indigo-500/50 rounded-t-sm hover:bg-indigo-500 transition-colors" style={{ height: `${h}%` }}></div>
                         ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const MockDashboard = () => (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 w-full max-w-sm shadow-2xl transform rotate-[2deg] hover:rotate-0 transition-transform duration-500 relative z-10">
         <div className="flex justify-between items-center mb-4">
             <div className="h-2 w-20 bg-gray-700 rounded"></div>
             <div className="flex gap-1">
                 <div className="h-2 w-2 bg-gray-700 rounded-full"></div>
                 <div className="h-2 w-2 bg-gray-700 rounded-full"></div>
             </div>
         </div>
         <div className="grid grid-cols-2 gap-3 mb-3">
             <div className="bg-gray-800 p-2 rounded-lg h-20 border border-gray-700 relative overflow-hidden group">
                 <div className="absolute bottom-0 left-0 w-full h-[60%] bg-gradient-to-t from-purple-500/20 to-transparent group-hover:h-[70%] transition-all"></div>
                 <div className="h-1.5 w-12 bg-gray-600 rounded mb-2"></div>
                 <div className="text-xl font-bold text-white">$2.4M</div>
             </div>
             <div className="bg-gray-800 p-2 rounded-lg h-20 border border-gray-700 relative overflow-hidden group">
                  <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full border-2 border-indigo-500 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></div>
                  </div>
                 <div className="h-1.5 w-12 bg-gray-600 rounded mb-2"></div>
                 <div className="text-xl font-bold text-white">98%</div>
             </div>
         </div>
         <div className="bg-gray-800 p-2 rounded-lg h-24 border border-gray-700 flex items-end justify-between px-2 pb-2 gap-1">
              {[30, 50, 40, 70, 60, 80, 50, 90, 75, 60].map((h, i) => (
                   <div key={i} className="w-full bg-gray-700 rounded-t-sm" style={{ height: `${h}%` }}></div>
              ))}
         </div>
    </div>
);

const MockML = () => (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 w-full max-w-sm shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                <BrainIcon className="w-5 h-5" />
            </div>
            <div>
                <div className="h-2 w-24 bg-gray-600 rounded mb-1"></div>
                <div className="h-1.5 w-16 bg-gray-700 rounded"></div>
            </div>
        </div>
        
        <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Training Progress</span>
                <span className="text-green-400">99.2%</span>
            </div>
            <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 w-[92%] animate-pulse"></div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-4">
                {[1,2,3].map(i => (
                    <div key={i} className="bg-gray-800 border border-gray-600/50 rounded p-2 text-center">
                        <div className="text-[10px] text-gray-500 uppercase">Epoch {i}</div>
                        <div className="text-indigo-300 font-mono text-xs">0.0{i*2}4</div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const LandingPage: React.FC<LandingPageProps> = ({ onGuestLogin }) => {
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const openAuth = (mode: 'login' | 'signup') => {
        setAuthMode(mode);
        setIsAuthOpen(true);
    };

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 font-sans overflow-x-hidden selection:bg-indigo-500/30 relative">
            
            {/* Global Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-1/4 w-[1000px] h-[500px] bg-indigo-600/10 rounded-[100%] blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-0 right-1/4 w-[800px] h-[600px] bg-purple-600/10 rounded-[100%] blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
            </div>

            {/* Navbar */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-gray-950/80 backdrop-blur-md border-b border-white/5 h-20' : 'bg-transparent h-24'}`}>
                <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                             <MLIcon className="w-6 h-6" />
                        </div>
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Dataline</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-300">
                            <button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">Features</button>
                            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors">How it Works</button>
                            <button onClick={() => openAuth('login')} className="hover:text-white transition-colors">Sign In</button>
                        </div>
                        <Button 
                            onClick={() => openAuth('signup')}
                            className="shadow-lg shadow-indigo-500/20"
                        >
                            Get Started
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative z-10 pt-40 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="text-left animate-fade-in-up">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-6">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            v2.0 Now Available
                        </div>
                        
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-tight">
                            Your Data, <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Conversational.</span>
                        </h1>
                        
                        <p className="text-xl text-gray-400 max-w-xl mb-8 leading-relaxed">
                            Stop wrestling with spreadsheets. Upload your data and let our AI analyst generate dashboards, insights, and predictive models instantly.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button onClick={() => openAuth('signup')} className="px-8 py-4 text-lg shadow-xl shadow-indigo-500/25 transition-transform hover:-translate-y-1">
                                Start Free Trial
                            </Button>
                            <button onClick={onGuestLogin} className="px-8 py-4 text-lg font-bold text-white bg-gray-800/50 border border-white/10 rounded-lg hover:bg-gray-800 transition-all hover:-translate-y-1 flex items-center justify-center gap-2 group">
                                <BoltIcon className="w-5 h-5 text-yellow-400 group-hover:scale-110 transition-transform" />
                                Try Demo
                            </button>
                        </div>
                        
                        <div className="mt-8 flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex -space-x-2">
                                {[1,2,3,4].map(i => (
                                    <div key={i} className={`w-8 h-8 rounded-full border-2 border-gray-950 bg-gray-800 flex items-center justify-center text-xs text-white z-${10-i}`}>
                                        {i === 4 ? '+' : ''}
                                    </div>
                                ))}
                            </div>
                            <p>Used by 10,000+ analysts</p>
                        </div>
                    </div>

                    {/* Hero Visual */}
                    <div className="relative animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 blur-[60px] rounded-full"></div>
                        <div className="relative z-10 grid grid-cols-2 gap-4 transform rotate-[-5deg] scale-90 md:scale-100 hover:rotate-0 transition-transform duration-700 ease-out">
                            <div className="col-span-2 flex justify-center">
                                <MockDashboard />
                            </div>
                            <div className="mt-8">
                                <MockChat />
                            </div>
                            <div className="-mt-8">
                                <MockML />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* How It Works */}
            <section id="how-it-works" className="relative z-10 py-32 bg-gray-950/50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">From CSV to ROI in minutes</h2>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto">Skip the complex setup. Dataline is designed to get you from raw data to actionable insights in three simple steps.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-indigo-500/0 via-indigo-500/50 to-indigo-500/0 border-t border-dashed border-gray-700 z-0"></div>

                        {[
                            { 
                                icon: <UploadIcon className="w-6 h-6" />, 
                                step: "01", 
                                title: "Upload Data", 
                                desc: "Drag & drop your CSV files. We automatically detect schemas and clean the data for you." 
                            },
                            { 
                                icon: <ChatIcon className="w-6 h-6" />, 
                                step: "02", 
                                title: "Ask Questions", 
                                desc: "Chat in plain English. 'Show me revenue by region' or 'Predict next month's churn'." 
                            },
                            { 
                                icon: <DashboardIcon className="w-6 h-6" />, 
                                step: "03", 
                                title: "Get Insights", 
                                desc: "Instantly generate interactive charts, reports, and machine learning models." 
                            }
                        ].map((item, i) => (
                            <div key={i} className="relative z-10 flex flex-col items-center text-center group">
                                <div className="w-24 h-24 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center mb-6 shadow-xl group-hover:border-indigo-500/50 group-hover:scale-110 transition-all duration-300 relative">
                                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-sm font-bold border-4 border-gray-950">
                                        {item.step}
                                    </div>
                                    <div className="text-indigo-400 group-hover:text-white transition-colors">
                                        {item.icon}
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Feature Deep Dive 1: Chat */}
            <section id="features" className="relative z-10 py-24 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="order-2 lg:order-1 relative">
                        <div className="absolute inset-0 bg-indigo-500/10 blur-[80px] rounded-full"></div>
                        <div className="relative transform hover:scale-105 transition-transform duration-500">
                             <MockChat />
                             <div className="absolute -bottom-10 -right-10 transform scale-75 opacity-70">
                                 <MockDashboard />
                             </div>
                        </div>
                    </div>
                    <div className="order-1 lg:order-2">
                        <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 mb-6">
                            <ChatIcon className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Talk to your data like a teammate</h2>
                        <p className="text-gray-400 text-lg mb-6">
                            No SQL required. Our advanced NLP engine translates your questions into complex queries and visualizations instantly.
                        </p>
                        <ul className="space-y-4 text-gray-300">
                            {[
                                "Natural Language Querying",
                                "Context-aware follow-up questions",
                                "Auto-generated summaries and explanations"
                            ].map((feat, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs">✓</div>
                                    {feat}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* Feature Deep Dive 2: Dashboards */}
            <section className="relative z-10 py-24 border-t border-white/5 bg-gray-900/30">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400 mb-6">
                            <DashboardIcon className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Beautiful dashboards, generated instantly</h2>
                        <p className="text-gray-400 text-lg mb-6">
                            Don't spend hours aligning pixels. Dataline intelligently selects the best visualization for your data and arranges it into a professional dashboard.
                        </p>
                        <Button variant="secondary" onClick={onGuestLogin} className="mt-2">
                            See Example Dashboard
                        </Button>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0 bg-purple-500/10 blur-[80px] rounded-full"></div>
                        <div className="relative transform hover:scale-105 transition-transform duration-500 flex justify-center">
                             <MockDashboard />
                        </div>
                    </div>
                </div>
            </section>

             {/* Feature Deep Dive 3: AutoML */}
             <section className="relative z-10 py-24 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="order-2 lg:order-1 relative">
                        <div className="absolute inset-0 bg-pink-500/10 blur-[80px] rounded-full"></div>
                        <div className="relative transform hover:scale-105 transition-transform duration-500 flex justify-center">
                             <MockML />
                        </div>
                    </div>
                    <div className="order-1 lg:order-2">
                        <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center text-pink-400 mb-6">
                            <BrainIcon className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Democratized Machine Learning</h2>
                        <p className="text-gray-400 text-lg mb-6">
                            Predict the future without a data science degree. Train, test, and deploy models to forecast trends, detect anomalies, and classify data.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                                <div className="text-2xl font-bold text-white mb-1">1-Click</div>
                                <div className="text-sm text-gray-500">Model Training</div>
                            </div>
                            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                                <div className="text-2xl font-bold text-white mb-1">Live</div>
                                <div className="text-sm text-gray-500">Training Visualization</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="relative z-10 py-24 px-6">
                <div className="max-w-5xl mx-auto bg-gradient-to-r from-indigo-900 to-purple-900 rounded-3xl p-12 md:p-20 text-center relative overflow-hidden border border-white/10 shadow-2xl">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-[80px]"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-black/20 rounded-full blur-[80px]"></div>
                    
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 relative z-10">Ready to unlock your data?</h2>
                    <p className="text-indigo-200 text-xl mb-10 max-w-2xl mx-auto relative z-10">
                        Join thousands of users who are making better decisions faster with Dataline AI.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                        <Button onClick={() => openAuth('signup')} className="px-10 py-4 text-lg bg-white text-indigo-900 hover:bg-gray-100 hover:text-indigo-950">
                            Get Started for Free
                        </Button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/5 bg-black/40 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                             <MLIcon className="w-6 h-6" />
                        </div>
                        <span className="text-xl font-bold text-gray-200">Dataline</span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-gray-500 text-sm">
                        <span>&copy; 2026 Dataline. Powered by <a href="https://doveaitech.netlify.app">DoveAI Technologies</a></span>
                    </div>
                </div>
            </footer>

            <AuthModal 
                isOpen={isAuthOpen} 
                onClose={() => setIsAuthOpen(false)} 
                defaultMode={authMode}
                onGuestLogin={() => {
                    setIsAuthOpen(false);
                    onGuestLogin();
                }}
            />
        </div>
    );
};

export default LandingPage;
