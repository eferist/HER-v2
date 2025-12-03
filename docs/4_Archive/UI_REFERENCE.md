## UI EXPECTATION
HER inspired UI. There are chat interface, memory, and voice mode where memory and voice are to-be decided.

## SCRIPT REFERENCE
```
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Her - Cinematic Interface</title>
    <style>
        /* --- CORE VARIABLES --- */
        :root {
            --bg-base: #d64c4c;
            --bg-gradient: linear-gradient(135deg, #d64c4c 0%, #ef7b5d 60%, #ff9a9e 100%);
            --text-color: rgba(255, 255, 255, 0.95);
            --text-muted: rgba(255, 255, 255, 0.6);
            --bubble-user: rgba(255, 255, 255, 0.15);
            --bubble-ai: rgba(255, 255, 255, 0.95);
            --text-user: #fff;
            --text-ai: #d64c4c;
            --font-main: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            --sidebar-width: 260px;
            --right-sidebar-width: 320px;
            --glass-bg: rgba(0, 0, 0, 0.05);
            --glass-border: 1px solid rgba(255, 255, 255, 0.1);
            --card-bg: rgba(255, 255, 255, 0.1);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }

        body {
            height: 100vh;
            width: 100vw;
            background: var(--bg-base);
            background: var(--bg-gradient);
            background-size: 200% 200%;
            animation: breathe 15s ease infinite;
            font-family: var(--font-main);
            color: var(--text-color);
            overflow: hidden;
            display: flex;
            position: relative;
        }

        @keyframes breathe {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        /* MICRO-GRAIN TEXTURE */
        body::after {
            content: "";
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E");
            pointer-events: none;
            z-index: 10;
        }

        /* --- LEFT SIDEBAR --- */
        .sidebar {
            width: var(--sidebar-width);
            height: 100%;
            display: flex;
            flex-direction: column;
            padding: 90px 30px 40px 30px;
            background: var(--glass-bg);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            z-index: 20;
            border-right: var(--glass-border);
            transition: width 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), padding 0.5s ease;
            white-space: nowrap;
            overflow: hidden;
            flex-shrink: 0;
        }

        .sidebar.collapsed { width: 0; padding: 0; border-right: none; }
        .brand { color: #fff; font-size: 1.2rem; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 50px; opacity: 0.9; }
        .nav-item { color: var(--text-muted); font-size: 1.1rem; margin-bottom: 25px; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; }
        .nav-item:hover { color: #fff; transform: translateX(5px); }
        .nav-item.active { color: #fff; font-weight: 500; text-shadow: 0 0 10px rgba(255,255,255,0.3); }

        /* --- RIGHT SIDEBAR (ACTIVITY STREAM) --- */
        .right-sidebar {
            width: var(--right-sidebar-width);
            height: 100%;
            position: absolute;
            right: 0;
            top: 0;
            display: flex;
            flex-direction: column;
            padding: 90px 25px 40px 25px;
            background: var(--glass-bg); 
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            z-index: 20;
            border-left: var(--glass-border);
            transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
            transform: translateX(100%);
        }

        .right-sidebar.open { transform: translateX(0); }

        .obs-header {
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: rgba(255, 255, 255, 0.8);
            margin-bottom: 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding-bottom: 15px;
            font-weight: 600;
        }

        /* The Activity Stream Container */
        .activity-container {
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 15px;
            padding-top: 10px;
            mask-image: linear-gradient(to bottom, transparent 0%, black 10%); 
        }

        /* The Friendly Activity Card */
        .activity-card {
            background: var(--card-bg);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 16px;
            padding: 15px;
            display: flex;
            align-items: center;
            gap: 15px;
            opacity: 0;
            animation: slideInRight 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            transition: transform 0.3s ease;
            backdrop-filter: blur(5px);
        }
        
        .activity-card:hover {
            background: rgba(255, 255, 255, 0.15);
            transform: translateX(-2px);
        }

        .activity-icon {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            color: #fff;
        }

        .activity-content { flex: 1; }
        .activity-title { font-size: 0.95rem; color: #fff; margin-bottom: 4px; font-weight: 500; }
        .activity-desc { font-size: 0.8rem; color: rgba(255, 255, 255, 0.6); line-height: 1.3; }
        
        .activity-card.processing .activity-icon {
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
            animation: iconPulse 1.5s infinite;
        }

        /* --- TOGGLE BUTTONS --- */
        .toggle-btn {
            position: absolute; top: 25px; z-index: 50;
            background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255,255,255,0.2);
            color: #fff; width: 44px; height: 44px; border-radius: 50%;
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            transition: all 0.3s ease; backdrop-filter: blur(5px);
        }
        .toggle-btn:hover { background: rgba(255, 255, 255, 0.25); transform: scale(1.05); }
        
        #sidebarToggle { left: 25px; }
        #rightSidebarToggle { right: 25px; }

        /* --- MAIN CONTENT --- */
        .main-content { flex: 1; display: flex; justify-content: center; align-items: center; position: relative; transition: margin-right 0.5s ease; }
        
        body.right-panel-open .main-content { margin-right: 0; } 
        @media(min-width: 1200px) {
             body.right-panel-open .main-content { margin-right: 120px; }
        }

        .app-container {
            width: 100%; height: 100%; max-width: 900px;
            position: relative; display: flex; flex-direction: column;
            padding: 20px 40px; padding-top: 40px;
        }

        /* --- CHAT AREA --- */
        .chat-area {
            flex: 1; display: flex; flex-direction: column; justify-content: flex-end;
            padding-bottom: 30px; overflow-y: auto;
            mask-image: linear-gradient(to bottom, transparent 0%, black 10%);
            -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 10%);
            transition: opacity 0.5s ease, transform 0.5s ease;
        }
        
        .view-hidden { display: none !important; }

        .message {
            max-width: 75%; padding: 16px 22px; margin: 10px 0;
            border-radius: 20px; font-size: 1.05rem; line-height: 1.5;
            position: relative; animation: fadeIn 0.5s ease-out forwards;
        }
        .message.ai { align-self: flex-start; background: var(--bubble-ai); color: var(--text-ai); border-bottom-left-radius: 4px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .message.user { align-self: flex-end; background: var(--bubble-user); color: var(--text-user); border-bottom-right-radius: 4px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(5px); }

        /* --- GRAPH VIEW (NEURAL) --- */
        .graph-view {
            flex: 1;
            position: relative;
            overflow: hidden;
            animation: fadeIn 0.6s ease forwards;
            border-radius: 20px;
            /* background: rgba(0,0,0,0.05); */ /* Optional dark tint */
        }
        
        /* SVG Layer for Lines */
        #graph-lines {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 0;
        }
        
        .connection-line {
            stroke: rgba(255, 255, 255, 0.2);
            stroke-width: 1.5px;
            transition: opacity 0.5s;
        }

        /* Nodes */
        .node {
            position: absolute;
            transform: translate(-50%, -50%);
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            cursor: pointer;
            z-index: 10;
            transition: width 0.3s, height 0.3s, background 0.3s, box-shadow 0.3s;
        }

        /* Center User Node */
        .node.center-node {
            width: 60px;
            height: 60px;
            background: rgba(255, 255, 255, 0.9);
            color: #d64c4c;
            font-weight: bold;
            font-size: 0.9rem;
            box-shadow: 0 0 30px rgba(255,255,255,0.4);
            z-index: 20;
        }

        /* Memory Nodes */
        .node.mem-node {
            width: 16px;
            height: 16px;
            background: rgba(255, 255, 255, 0.4);
            backdrop-filter: blur(4px);
            border: 1px solid rgba(255,255,255,0.4);
        }
        
        .node.mem-node:hover {
            background: #fff;
            box-shadow: 0 0 15px rgba(255,255,255,0.6);
            width: 20px;
            height: 20px;
        }

        /* Floating Label for Nodes */
        .node-label {
            position: absolute;
            top: 25px;
            font-size: 0.75rem;
            color: rgba(255,255,255,0.7);
            white-space: nowrap;
            pointer-events: none;
            text-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        /* The Tooltip/Card on Click/Hover */
        .node-details {
            position: absolute;
            width: 280px;
            background: rgba(255, 255, 255, 0.15); /* Stronger glass */
            backdrop-filter: blur(15px);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 16px;
            padding: 20px;
            color: #fff;
            pointer-events: none;
            opacity: 0;
            transform: scale(0.9);
            transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
            z-index: 100;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        
        .node-details.active {
            opacity: 1;
            transform: scale(1);
        }

        .detail-text { font-size: 1rem; line-height: 1.4; margin-bottom: 10px; }
        .detail-meta { font-size: 0.7rem; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 1px; }

        /* --- INPUT AREA --- */
        .input-area {
            display: flex; align-items: center; background: rgba(255, 255, 255, 0.1);
            border-radius: 40px; padding: 8px 12px; margin-bottom: 30px;
            border: 1px solid rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px);
            transition: background 0.3s;
        }
        .input-area:focus-within { background: rgba(255, 255, 255, 0.15); }
        input { flex: 1; background: transparent; border: none; padding: 16px 24px; color: #fff; font-size: 1.05rem; outline: none; }
        input::placeholder { color: rgba(255, 255, 255, 0.5); }
        .mode-btn {
            background: rgba(255, 255, 255, 0.2); border: none; width: 48px; height: 48px;
            border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;
            transition: all 0.2s; color: #fff;
        }
        .mode-btn:hover { background: rgba(255, 255, 255, 0.35); }

        /* --- VOICE MODE (THE SOUL) --- */
        .voice-container {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            display: flex; justify-content: center; align-items: center;
            pointer-events: none; opacity: 0; transition: opacity 1.2s ease; z-index: 10;
        }
        .soul-wrapper {
            position: relative; width: 220px; height: 220px; transform-origin: center;
            transition: transform 0.5s ease-in-out;
        }
        body.voice-active .soul-wrapper { animation: deepBreath 4s ease-in-out infinite alternate; }
        .blob {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(255, 255, 255, 0.8); border-radius: 50%;
            mix-blend-mode: overlay; filter: blur(8px);
            animation: morph 8s linear infinite;
        }
        .blob:nth-child(1) { background: rgba(255, 220, 200, 0.8); animation-delay: 0s; animation-duration: 12s; }
        .blob:nth-child(2) { background: rgba(255, 255, 255, 0.6); animation-delay: -2s; animation-duration: 15s; animation-direction: reverse; }
        .blob:nth-child(3) { background: rgba(255, 200, 150, 0.4); animation-delay: -5s; animation-duration: 10s; filter: blur(15px); }

        /* --- TOOL CALL ANIMATION --- */
        .orbit-system {
            position: absolute; top: 50%; left: 50%; width: 340px; height: 340px;
            transform: translate(-50%, -50%); pointer-events: none;
            opacity: 0; transition: opacity 0.5s ease;
        }
        .satellite {
            position: absolute; width: 40px; height: 40px;
            background: rgba(255, 255, 255, 0.9);
            border-radius: 50%; filter: blur(10px);
            mix-blend-mode: overlay;
        }
        body.tool-active .soul-wrapper { transform: scale(0.7); }
        body.tool-active .orbit-system { opacity: 1; animation: spinSystem 2s linear infinite; }
        .satellite:nth-child(1) { top: 0; left: 50%; transform: translateX(-50%); }
        .satellite:nth-child(2) { bottom: 15%; left: 7%; }
        .satellite:nth-child(3) { bottom: 15%; right: 7%; }

        /* States & Controls */
        body.voice-active .voice-container { opacity: 1; pointer-events: auto; }
        body.voice-active .app-container { opacity: 0; transform: scale(0.95); pointer-events: none; transition: all 0.8s ease; }
        body.voice-active .sidebar, body.voice-active .toggle-btn { opacity: 0; pointer-events: none; transition: opacity 0.5s; }

        .voice-controls {
            position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%);
            display: flex; gap: 15px; z-index: 30;
        }
        .voice-btn {
            background: transparent; border: 1px solid rgba(255,255,255,0.4);
            color: rgba(255,255,255,0.8); padding: 12px 25px; border-radius: 30px;
            cursor: pointer; font-size: 0.9rem; letter-spacing: 1px;
            transition: all 0.3s; backdrop-filter: blur(5px);
        }
        .voice-btn:hover { background: rgba(255,255,255,0.1); border-color: #fff; color: #fff; }
        .tool-sim-btn { border: 1px dashed rgba(255, 255, 255, 0.3); font-size: 0.8rem; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes floatIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes iconPulse { 0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); } 100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); } }
        @keyframes morph {
            0% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: rotate(0deg); }
            50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
            100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: rotate(360deg); }
        }
        @keyframes deepBreath { 0% { transform: scale(1); } 100% { transform: scale(1.15); } }
        @keyframes spinSystem { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); } }

        .icon { width: 24px; height: 24px; fill: currentColor; }
        
        @media (max-width: 768px) {
            .sidebar { position: fixed; height: 100%; width: 100%; background: rgba(214, 76, 76, 0.95); }
            .right-sidebar { width: 100%; }
            #sidebarToggle { left: 15px; top: 15px; }
            #rightSidebarToggle { right: 15px; top: 15px; }
            .app-container { padding: 80px 20px 20px 20px; }
        }
    </style>
</head>
<body>

    <!-- LEFT TOGGLE BUTTON -->
    <button class="toggle-btn" id="sidebarToggle">
        <svg class="icon" viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
    </button>
    
    <!-- RIGHT TOGGLE BUTTON -->
    <button class="toggle-btn" id="rightSidebarToggle">
        <svg class="icon" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
    </button>

    <!-- LEFT SIDEBAR -->
    <nav class="sidebar" id="sidebar">
        <div class="brand">OS One</div>
        <div class="nav-item active" id="chatNavBtn">
            <svg class="icon" viewBox="0 0 24 24" style="margin-right:15px; opacity: 0.8;"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            Chat
        </div>
        <div class="nav-item" id="memoryNavBtn">
            <svg class="icon" viewBox="0 0 24 24" style="margin-right:15px; opacity: 0.8;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            Memory
        </div>
    </nav>
    
    <!-- RIGHT SIDEBAR (ACTIVITY STREAM) -->
    <aside class="right-sidebar" id="rightSidebar">
        <div class="obs-header">Current Activity</div>
        
        <div class="activity-container" id="activityContainer">
            <!-- Cards will be injected here via JS -->
            <div class="activity-card">
                <div class="activity-icon">
                    <svg class="icon" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                </div>
                <div class="activity-content">
                    <div class="activity-title">Ready</div>
                    <div class="activity-desc">Listening for your voice...</div>
                </div>
            </div>
        </div>
    </aside>

    <!-- MAIN CONTENT -->
    <div class="main-content">
        <div class="app-container">
            <!-- CHAT VIEW -->
            <div class="chat-area" id="chatArea">
                <div class="message ai">Hi. It's really nice to see you again.</div>
                <div class="message user">Hey. I like this lighting better.</div>
                <div class="message ai">I thought you might. It feels warmer, doesn't it? Less... exposed.</div>
                <div class="message user">Exactly. It feels more human.</div>
            </div>

            <!-- MEMORY GRAPH VIEW (Knowledge Graph) -->
            <div class="graph-view view-hidden" id="graphArea">
                <svg id="graph-lines"></svg>
                <div id="nodes-container">
                    <!-- Nodes injected here -->
                </div>
                <!-- Detail Card Overlay -->
                <div class="node-details" id="nodeDetails">
                    <div class="detail-text" id="detailText"></div>
                    <div class="detail-meta" id="detailMeta"></div>
                </div>
            </div>

            <div class="input-area">
                <input type="text" placeholder="Type a message..." id="textInput">
                <button class="mode-btn" id="voiceBtn">
                    <svg class="icon" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                </button>
            </div>
        </div>
    </div>

    <!-- VOICE OVERLAY -->
    <div class="voice-container" id="voiceLayer">
        <div class="orbit-system">
            <div class="satellite"></div>
            <div class="satellite"></div>
            <div class="satellite"></div>
        </div>
        <div class="soul-wrapper" id="soul">
            <div class="blob"></div>
            <div class="blob"></div>
            <div class="blob"></div>
        </div>
        <div class="voice-controls">
            <button class="voice-btn" id="closeVoiceBtn">End Voice Mode</button>
            <button class="voice-btn tool-sim-btn" id="toolSimBtn">Simulate Tool Call</button>
        </div>
    </div>

    <script>
        // DOM Elements
        const sidebar = document.getElementById('sidebar');
        const rightSidebar = document.getElementById('rightSidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');
        const rightSidebarToggle = document.getElementById('rightSidebarToggle');
        
        const voiceBtn = document.getElementById('voiceBtn');
        const closeVoiceBtn = document.getElementById('closeVoiceBtn');
        const toolSimBtn = document.getElementById('toolSimBtn');
        const body = document.body;
        const textInput = document.getElementById('textInput');
        
        const chatArea = document.getElementById('chatArea');
        const graphArea = document.getElementById('graphArea');
        const nodesContainer = document.getElementById('nodes-container');
        const graphLines = document.getElementById('graph-lines');
        const nodeDetails = document.getElementById('nodeDetails');
        
        const chatNavBtn = document.getElementById('chatNavBtn');
        const memoryNavBtn = document.getElementById('memoryNavBtn');
        const activityContainer = document.getElementById('activityContainer');

        let isSidebarOpen = true;
        let isRightSidebarOpen = false;
        let graphInitialized = false;

        // DATA
        const memories = [
            { id: 1, memory: "User's name is Alice and she loves photography.", topics: ["name", "hobbies"], updated: "Just now" },
            { id: 2, memory: "Prefers quiet environments and ambient lighting.", topics: ["preferences", "env"], updated: "Yesterday" },
            { id: 3, memory: "Working on a sci-fi novel about AI.", topics: ["work", "sci-fi"], updated: "2 days ago" },
            { id: 4, memory: "Feels anxious when overwhelmed by data.", topics: ["emotions"], updated: "Last week" },
            { id: 5, memory: "Favorite color is sunset orange.", topics: ["favorites"], updated: "Last month" },
            { id: 6, memory: "Plans to visit Japan next year.", topics: ["travel", "future"], updated: "Last year" }
        ];

        // --- NAVIGATION & VIEW SWITCHING ---
        function switchView(view) {
            if (view === 'chat') {
                chatArea.classList.remove('view-hidden');
                graphArea.classList.add('view-hidden');
                chatNavBtn.classList.add('active');
                memoryNavBtn.classList.remove('active');
                stopGraphSimulation();
            } else if (view === 'memory') {
                chatArea.classList.add('view-hidden');
                graphArea.classList.remove('view-hidden');
                chatNavBtn.classList.remove('active');
                memoryNavBtn.classList.add('active');
                if(!graphInitialized) initGraph();
                startGraphSimulation();
            }
        }

        chatNavBtn.addEventListener('click', () => switchView('chat'));
        memoryNavBtn.addEventListener('click', () => switchView('memory'));

        // --- GRAPH LOGIC (NEURAL VISUALIZER) ---
        let nodes = [];
        let animationFrameId;
        const centerNode = { x: 0, y: 0, vx: 0, vy: 0, id: 'center', type: 'user' };

        function initGraph() {
            graphInitialized = true;
            const width = graphArea.clientWidth || 800;
            const height = graphArea.clientHeight || 600;
            centerNode.x = width / 2;
            centerNode.y = height / 2;

            // Create Center Node DOM
            const centerEl = document.createElement('div');
            centerEl.className = 'node center-node';
            centerEl.textContent = "NOEL";
            centerEl.style.left = `${centerNode.x}px`;
            centerEl.style.top = `${centerNode.y}px`;
            nodesContainer.appendChild(centerEl);

            // Init Memory Nodes
            memories.forEach((mem, i) => {
                const angle = (i / memories.length) * Math.PI * 2;
                const dist = 100 + Math.random() * 100;
                
                const node = {
                    x: centerNode.x + Math.cos(angle) * dist,
                    y: centerNode.y + Math.sin(angle) * dist,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    id: mem.id,
                    data: mem,
                    el: null
                };

                const el = document.createElement('div');
                el.className = 'node mem-node';
                // Add label
                const label = document.createElement('div');
                label.className = 'node-label';
                label.textContent = mem.topics[0];
                el.appendChild(label);
                
                // Interaction
                el.addEventListener('mouseenter', () => showDetails(node, el));
                el.addEventListener('mouseleave', () => hideDetails());

                node.el = el;
                nodes.push(node);
                nodesContainer.appendChild(el);
            });
        }

        function showDetails(node, el) {
            node.vx = 0; node.vy = 0; // Pause
            nodeDetails.classList.add('active');
            
            // Position tooltip near node but keep on screen
            let left = node.x + 20;
            let top = node.y - 20;
            
            // Boundary checks
            const rect = graphArea.getBoundingClientRect();
            if (left + 280 > rect.width) left = node.x - 300;
            if (top + 150 > rect.height) top = rect.height - 160;

            nodeDetails.style.left = `${left}px`;
            nodeDetails.style.top = `${top}px`;
            
            document.getElementById('detailText').textContent = node.data.memory;
            document.getElementById('detailMeta').textContent = `Updated: ${node.data.updated} • #${node.data.topics.join(' #')}`;
        }

        function hideDetails() {
            nodeDetails.classList.remove('active');
            // Resume movement (optional, or let physics pick up)
        }

        function startGraphSimulation() {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            animateGraph();
        }

        function stopGraphSimulation() {
            cancelAnimationFrame(animationFrameId);
        }

        function animateGraph() {
            const width = graphArea.clientWidth;
            const height = graphArea.clientHeight;
            centerNode.x = width / 2;
            centerNode.y = height / 2;
            
            // Clear SVG lines
            let linesHtml = '';

            nodes.forEach(node => {
                // Browninan Motion / Drift
                if(!nodeDetails.classList.contains('active')) {
                   node.x += node.vx + (Math.random() - 0.5) * 0.2;
                   node.y += node.vy + (Math.random() - 0.5) * 0.2;
                }

                // Tether to center (simple spring)
                const dx = centerNode.x - node.x;
                const dy = centerNode.y - node.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist > 250) { // Pull back if too far
                    node.vx += dx * 0.0001;
                    node.vy += dy * 0.0001;
                }
                
                // Repel from center if too close
                if (dist < 80) {
                     node.vx -= dx * 0.001;
                     node.vy -= dy * 0.001;
                }

                // Boundaries
                if (node.x < 20 || node.x > width - 20) node.vx *= -1;
                if (node.y < 20 || node.y > height - 20) node.vy *= -1;

                // Update DOM
                node.el.style.left = `${node.x}px`;
                node.el.style.top = `${node.y}px`;

                // Draw line to center
                linesHtml += `<line x1="${centerNode.x}" y1="${centerNode.y}" x2="${node.x}" y2="${node.y}" class="connection-line" />`;
                
                // Draw lines between close neighbors
                nodes.forEach(other => {
                    if (node === other) return;
                    const ddx = node.x - other.x;
                    const ddy = node.y - other.y;
                    const d = Math.sqrt(ddx*ddx + ddy*ddy);
                    if (d < 150) {
                        const opacity = 1 - (d / 150);
                        linesHtml += `<line x1="${node.x}" y1="${node.y}" x2="${other.x}" y2="${other.y}" class="connection-line" style="stroke-opacity: ${opacity * 0.5}" />`;
                    }
                });
            });

            graphLines.innerHTML = linesHtml;
            animationFrameId = requestAnimationFrame(animateGraph);
        }

        // --- TOGGLES ---
        sidebarToggle.addEventListener('click', () => {
            isSidebarOpen = !isSidebarOpen;
            sidebar.classList.toggle('collapsed', !isSidebarOpen);
        });

        rightSidebarToggle.addEventListener('click', () => {
            isRightSidebarOpen = !isRightSidebarOpen;
            rightSidebar.classList.toggle('open', isRightSidebarOpen);
            body.classList.toggle('right-panel-open', isRightSidebarOpen);
        });

        if (window.innerWidth < 800) {
            sidebar.classList.add('collapsed');
            isSidebarOpen = false;
        }

        memoryNavBtn.addEventListener('click', () => {
             // Gentle animation helper for button
            memoryNavBtn.style.transform = "translateX(5px)";
            setTimeout(() => memoryNavBtn.style.transform = "translateX(0)", 300);
        });

        // --- VOICE MODE ---
        voiceBtn.addEventListener('click', () => {
            body.classList.add('voice-active');
        });

        closeVoiceBtn.addEventListener('click', () => {
            body.classList.remove('voice-active');
            body.classList.remove('tool-active');
        });

        // --- ACTIVITY STREAM LOGIC ---
        function addActivityCard(title, desc, iconType = 'default', isProcessing = false) {
            const card = document.createElement('div');
            card.className = `activity-card ${isProcessing ? 'processing' : ''}`;
            
            let svgPath = "M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"; 
            if (iconType === 'music') svgPath = "M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z";
            if (iconType === 'search') svgPath = "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z";
            if (iconType === 'thinking') svgPath = "M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z";
            
            card.innerHTML = `
                <div class="activity-icon">
                    <svg class="icon" viewBox="0 0 24 24"><path d="${svgPath}"/></svg>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${title}</div>
                    <div class="activity-desc">${desc}</div>
                </div>
            `;
            
            activityContainer.prepend(card);
            if (activityContainer.children.length > 6) {
                activityContainer.lastElementChild.remove();
            }
        }

        toolSimBtn.addEventListener('click', () => {
            const isActive = body.classList.contains('tool-active');
            
            if (isActive) {
                body.classList.remove('tool-active');
                toolSimBtn.textContent = "Simulate Tool Call";
                addActivityCard("Task Complete", "Music is playing", "default");
            } else {
                body.classList.add('tool-active');
                toolSimBtn.textContent = "End Simulation";
                
                if (!isRightSidebarOpen) {
                    isRightSidebarOpen = true;
                    rightSidebar.classList.add('open');
                    body.classList.add('right-panel-open');
                }
                
                addActivityCard("Thinking", "Analyzing your request...", "thinking", true);
                
                setTimeout(() => {
                    addActivityCard("Connecting", "Opening Spotify...", "search", true);
                }, 1200);

                setTimeout(() => {
                    addActivityCard("Playing", "Song on the Beach", "music", false);
                }, 3000);
            }
        });

        textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && textInput.value.trim() !== "") {
                addMessage(textInput.value, 'user');
                textInput.value = '';
                setTimeout(() => addMessage("I'm here.", 'ai'), 1200);
            }
        });

        function addMessage(text, sender) {
            const div = document.createElement('div');
            div.classList.add('message', sender);
            div.textContent = text;
            chatArea.appendChild(div);
            chatArea.scrollTop = chatArea.scrollHeight;
        }
    </script>
</body>
</html>
```