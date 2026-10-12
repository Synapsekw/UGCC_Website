/**
 * UGCC AI Chat Widget - Large Desktop Mode v6
 */

class GlassChatWidget {
    constructor(config) {
        this.webhookUrl = config.webhookUrl;
        this.chatTitle = config.chatTitle || "UGCC Support"; 
        this.logoUrl = config.logoUrl || null; 
        this.primaryColor = config.primaryColor || '#d31225'; 
        this.welcomeMessage = config.welcomeMessage || "Hello! How can I help you with our projects?";
        this.sessionId = this.getOrCreateSessionId();
        this.init();
    }

    getOrCreateSessionId() {
        let id = localStorage.getItem('chatWidgetSessionId');
        if (!id) {
            id = 'session-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('chatWidgetSessionId', id);
        }
        return id;
    }

    init() {
        const host = document.createElement('div');
        host.id = 'glass-ai-widget-host';
        document.body.appendChild(host);
        
        const shadow = host.attachShadow({ mode: 'open' });
        
        shadow.innerHTML = `
            <style>${this.getStyles()}</style>
            ${this.getHTML()}
        `;
        
        this.elements = {
            container: shadow.querySelector('.chat-container'),
            launcher: shadow.querySelector('.chat-launcher'),
            closeBtn: shadow.querySelector('.close-btn'),
            resetBtn: shadow.querySelector('.reset-btn'),
            messages: shadow.querySelector('.chat-messages'),
            input: shadow.querySelector('.chat-input input'),
            sendBtn: shadow.querySelector('.send-btn'),
            typing: shadow.querySelector('.typing-indicator')
        };

        this.elements.launcher.addEventListener('click', () => this.toggleChat());
        this.elements.closeBtn.addEventListener('click', () => this.toggleChat());
        this.elements.resetBtn.addEventListener('click', () => this.resetChat());
        // Links in answers open site pages. The conversation is saved, so it is
        // still there on the next page. On phones the chat covers the screen,
        // so close it first and let the visitor see the page they asked for.
        this.elements.messages.addEventListener('click', (e) => {
            const a = e.target.closest && e.target.closest('a');
            if (a && window.innerWidth <= 480) { this.state.open = false; this.save(); }
        });
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Restore this tab's conversation (sessionStorage: per tab, cleared when
        // the tab closes). Only the last few turns are ever sent to the server,
        // so a long saved conversation does not increase token usage.
        this.state = this.load();
        this.addMessage(this.welcomeMessage, 'bot', false);
        this.state.msgs.forEach((m) => this.addMessage(m.text, m.sender, false));
        if (this.state.open) this.setOpen(true, false);
    }

    load() {
        try {
            const raw = sessionStorage.getItem(GlassChatWidget.STORE_KEY);
            const st = raw ? JSON.parse(raw) : null;
            if (st && Array.isArray(st.msgs) && Array.isArray(st.history)) return st;
        } catch (e) { /* storage blocked: start fresh */ }
        return { msgs: [], history: [], open: false };
    }

    save() {
        try {
            this.state.msgs = this.state.msgs.slice(-40);
            this.state.history = this.state.history.slice(-12);
            sessionStorage.setItem(GlassChatWidget.STORE_KEY, JSON.stringify(this.state));
        } catch (e) { /* storage full or blocked: keep working without saving */ }
    }

    resetChat() {
        this.state = { msgs: [], history: [], open: true };
        this.save();
        this.elements.messages.innerHTML = '';
        this.addMessage(this.welcomeMessage, 'bot', false);
        this.elements.input.focus();
    }

    setOpen(open, focus = true) {
        this.elements.container.classList.toggle('open', open);
        this.elements.launcher.classList.toggle('hidden', open);
        if (open) {
            this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
            if (focus) setTimeout(() => this.elements.input.focus(), 100);
        }
    }

    toggleChat() {
        const open = !this.elements.container.classList.contains('open');
        this.setOpen(open);
        this.state.open = open;
        this.save();
    }

    async sendMessage() {
        const text = this.elements.input.value.trim();
        if (!text || this._sending) return;
        this._sending = true;

        this.addMessage(text, 'user');
        this.elements.input.value = '';
        this.showTyping();

        this.state.history.push({ role: 'user', content: text });
        this.save();

        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    sessionId: this.sessionId,
                    history: this.state.history.slice(-6)
                })
            });

            const data = await response.json();
            const botReply = data.output || data.error || "Sorry, something went wrong.";
            if (data.output && !data.limited) this.state.history.push({ role: 'assistant', content: botReply });

            this.hideTyping();
            this.addMessage(botReply, 'bot');

        } catch (error) {
            console.error('Widget Error:', error);
            this.hideTyping();
            this.addMessage("Connection error. Please try again.", 'bot', false);
        } finally {
            this._sending = false;
            this.save();
        }
    }

    // Safe formatting for answers: everything is HTML-escaped first, then only
    // these are turned into markup: links to pages of THIS site (or ugcc.com),
    // **bold**, "- " bullet lines and line breaks. Any other link stays as text.
    format(text) {
        let h = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        h = h.replace(/\[([^\]]+)\]\(\s*((?:\/(?!\/)|https:\/\/(?:www\.)?ugcc\.com\/?)[^\s)]*)\s*\)/g,
            (m, label, href) => {
                // Keep visitors on THIS site: a ugcc.com link becomes a relative path,
                // so it works on the preview today and on ugcc.com after go-live.
                const path = href.replace(/^https:\/\/(?:www\.)?ugcc\.com/, '') || '/';
                return `<a href="${path}">${label}</a>`;
            });
        h = h.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
        h = h.replace(/^\s*#{1,6}\s+(.+)$/gm, '<strong>$1</strong>');
        h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        h = h.replace(/^\s*[-*•]\s+/gm, '• ');
        return h.replace(/\n/g, '<br>');
    }

    addMessage(text, sender, persist = true) {
        const div = document.createElement('div');
        div.className = `message ${sender}`;
        div.innerHTML = `<div class="bubble">${this.format(text)}</div>`;
        if (persist) { this.state.msgs.push({ text, sender }); this.save(); }
        this.elements.messages.appendChild(div);
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    }

    showTyping() { 
        this.elements.typing.style.display = 'flex'; 
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight; 
    }
    
    hideTyping() { 
        this.elements.typing.style.display = 'none'; 
    }

    getStyles() {
        return `
            :host {
                --primary: ${this.primaryColor};
                --glass-bg: rgba(10, 10, 15, 0.95); 
                --glass-border: rgba(255, 255, 255, 0.15);
                font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                z-index: 2147483647; 
                position: fixed;
                bottom: 25px;
                right: 25px;
            }

            .chat-launcher {
                width: 60px; height: 60px;
                background: rgba(20, 20, 30, 0.6); 
                backdrop-filter: blur(8px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 50%; cursor: pointer;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                display: flex; align-items: center; justify-content: center;
                transition: transform 0.3s ease;
                overflow: hidden;
            }
            .chat-launcher:hover { transform: scale(1.05); }
            .chat-launcher.hidden { opacity: 0; pointer-events: none; transform: scale(0.5); }
            
            .launcher-img { width: 60%; height: 60%; object-fit: contain; pointer-events: none; }
            .launcher-icon { width: 30px; height: 30px; fill: white; }

            /* MAIN CHAT CONTAINER (DESKTOP) */
            .chat-container {
                /* --- INCREASED SIZE HERE --- */
                width: 450px;          /* Wider */
                height: 700px;         /* Taller */
                max-height: 85vh;      /* Safety limit for small laptops */
                /* -------------------------- */
                
                background-color: var(--glass-bg); 
                backdrop-filter: blur(15px);
                -webkit-backdrop-filter: blur(15px);
                border: 1px solid var(--glass-border);
                border-radius: 20px;
                overflow: hidden; 
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
                display: flex; flex-direction: column;
                position: absolute; bottom: 0; right: 0;
                transform-origin: bottom right;
                transform: scale(0.9) translateY(20px);
                opacity: 0; pointer-events: none;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .chat-container.open { transform: scale(1) translateY(0); opacity: 1; pointer-events: all; }

            .chat-header {
                padding: 18px 24px; 
                background: rgba(255, 255, 255, 0.05);
                border-bottom: 1px solid rgba(255,255,255,0.05);
                display: flex; justify-content: space-between; align-items: center;
                min-height: 30px;
                border-top-left-radius: 20px;
                border-top-right-radius: 20px;
            }
            .header-title { font-weight: 600; font-size: 16px; color: #ffffff !important; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
            .close-btn { background: none; border: none; cursor: pointer; color: #ffffff !important; opacity: 0.8; font-size: 28px; padding: 0 5px; }

            /* SCROLLBAR */
            .chat-messages { 
                flex: 1; 
                padding: 24px; 
                overflow-y: auto; 
                display: flex; 
                flex-direction: column; 
                gap: 16px;
                scrollbar-width: thin; 
                scrollbar-color: rgba(255,255,255,0.2) transparent; 
            }
            .chat-messages::-webkit-scrollbar { width: 6px; }
            .chat-messages::-webkit-scrollbar-track { background: transparent; } 
            .chat-messages::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }

            .message { display: flex; flex-direction: column; max-width: 85%; }
            .message.user { align-self: flex-end; align-items: flex-end; }
            .message.bot { align-self: flex-start; align-items: flex-start; }

            .bubble { padding: 14px 18px; border-radius: 18px; font-size: 14px; line-height: 1.5; color: white; }
            .message.user .bubble { background: linear-gradient(135deg, var(--primary), #a00f1c); border-bottom-right-radius: 4px; }
            .message.bot .bubble { background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255,255,255,0.05); border-bottom-left-radius: 4px; }
            .bubble a { color: #ffffff; text-decoration: underline; text-decoration-color: var(--primary); text-underline-offset: 3px; text-decoration-thickness: 2px; }
            .bubble a:hover { text-decoration-color: #ffffff; }
            .header-actions { display: flex; align-items: center; gap: 4px; }
            .reset-btn { background: none; border: none; cursor: pointer; color: #ffffff; opacity: 0.7; font-size: 13px; padding: 6px 8px; border-radius: 8px; }
            .reset-btn:hover { opacity: 1; background: rgba(255,255,255,0.08); }

            .typing-indicator { display: none; gap: 6px; padding: 12px 18px; background: rgba(255,255,255,0.05); border-radius: 20px; width: fit-content; margin-left: 24px; margin-bottom: 12px; }
            .dot { width: 6px; height: 6px; background: rgba(255,255,255,0.6); border-radius: 50%; animation: bounce 1.4s infinite; }
            .dot:nth-child(2) { animation-delay: 0.2s; } .dot:nth-child(3) { animation-delay: 0.4s; }
            @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }

            .chat-input { padding: 20px; background: rgba(0,0,0,0.3); border-top: 1px solid rgba(255,255,255,0.05); display: flex; gap: 12px; }
            .chat-input input { font-size: 16px; flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 12px 16px; border-radius: 12px; color: white; outline: none; }
            .send-btn { background: var(--primary); border: none; width: 44px; height: 44px; border-radius: 12px; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; }

            /* MOBILE OPTIMIZATION (This overrides the desktop size above) */
            @media (max-width: 480px) {
                .chat-container {
                    position: fixed; bottom: 0 !important; right: 0 !important; left: 0 !important; top: 0 !important;
                    width: 100vw !important; height: 100dvh !important; max-height: 100dvh !important;
                    border-radius: 0 !important; transform: none !important; margin: 0 !important;
                    background-color: rgba(10, 10, 15, 0.98);
                }
                .chat-container.open { opacity: 1; pointer-events: all; transform: none !important; }
                .chat-header { padding-top: 20px; border-radius: 0; }
            }
        `;
    }

    getHTML() {
        const iconHtml = this.logoUrl 
            ? `<img src="${this.logoUrl}" class="launcher-img" alt="Chat" />`
            : `<svg class="launcher-icon" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;

        return `
            <div class="chat-launcher">${iconHtml}</div>
            <div class="chat-container">
                <div class="chat-header">
                    <span class="header-title">${this.chatTitle}</span>
                    <div class="header-actions">
                        <button class="reset-btn" type="button" title="Start a new conversation">New chat</button>
                        <button class="close-btn" type="button" aria-label="Close chat">&times;</button>
                    </div>
                </div>
                <div class="chat-messages"></div>
                <div class="typing-indicator"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
                <div class="chat-input">
                    <input type="text" placeholder="Type a message..." />
                    <button class="send-btn" type="button" aria-label="Send message"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
                </div>
            </div>
        `;
    }
}

GlassChatWidget.STORE_KEY = 'ugccChat.v1';

/* Self-initialize once per page (replaces the old per-page init block). */
document.addEventListener('DOMContentLoaded', function () {
    if (window.__ugccChatLoaded) return;
    window.__ugccChatLoaded = true;
    new GlassChatWidget({
        webhookUrl: '/api/chat',
        chatTitle: 'UGCC Assistant',
        logoUrl: '/assets/img/v2/ugcc-chat-logo.png',
        primaryColor: '#d31225',
        welcomeMessage: 'Hello! Ask me anything about UGCC. / مرحباً! اسألني أي شيء عن الشركة.'
    });
});
