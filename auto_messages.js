require('dotenv').config();
const axios = require('axios');
const cron = require('node-cron');
const { DateTime } = require('luxon');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const STATE_PATH = path.join(__dirname, 'state.json');

class RocketChatAutomation {
    constructor(serverUrl, username, password, dannyUsername) {
        this.serverUrl = serverUrl.replace(/\/$/, '');
        this.username = username;
        this.password = password;
        this.dannyUsername = dannyUsername;
        this.authToken = null;
        this.userId = null;

        // Tasks
        this.scheduledSafetyTask = null;
        this.scheduledHydrationTask = null;
        this.scheduledHeatReminderTask = null;
        this.scheduledClockInTask = null;
        this.scheduledFirstBreakReminderTask = null;
        this.scheduledLunch230ReminderTask = null;
        this.scheduledRtsReminderTask = null;

        // Core safety messages
        this.safetyMessages = [
            `:eyes: *Distracted Driving*  
             Keep your eyes on the road, check your mirrors, and glance at your GPS.  
             :exclamation: It is a Netradyne alert if you are looking down or in one direction too long.  
             Keep your hands on the steering wheel. You shouldn't be holding a phone in one hand while driving!  
             :exclamation: It is a distraction if you reach down or away from the wheel multiple times.  
             :parking: The vehicle must be in park or the camera will count as a distraction. It does not matter if you are at a light with the brake pressed down.  

             *NOTE:*  
             If you connect your device that has eMentor via Bluetooth, you are likely to get "phone manipulations" on eMentor. This means answering calls, pausing music, skipping songs, or any action via Bluetooth. These will all count as distractions even though you are connected to Bluetooth.  

             Distracted driving is one of the top causes of on-road accidents and puts you, other drivers, and community members at risk. Common distractions like using your phone or looking away from the road for more than a couple seconds are some of the riskiest distractions. Stay alert and focused to make every trip a safe one for you and the community.  

             *DO NOT HOLD YOUR PHONE WHILE DRIVING*`,
            // …other messages…
        ];

        // State for daily shuffle
        this.state = { date: null, order: [], index: 0 };
        this.dailyOrder = [];
        this.messageIndex = 0;

        this.loadOrInitState();
    }

    // Initialize or reload today's shuffle state
    loadOrInitState() {
        const today = DateTime.now().setZone('America/Chicago').toISODate();
        let persisted = null;
        if (fs.existsSync(STATE_PATH)) {
            try {
                persisted = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
            } catch { /* ignore */ }
        }

        if (
            persisted &&
            persisted.date === today &&
            Array.isArray(persisted.order) &&
            typeof persisted.index === 'number'
        ) {
            this.state = persisted;
            this.dailyOrder = persisted.order;
            this.messageIndex = persisted.index;
        } else {
            const count = this.safetyMessages.length;
            const indices = Array.from({ length: count }, (_, i) => i);
            for (let i = count - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
            this.dailyOrder = indices;
            this.messageIndex = 0;
            this.state = { date: today, order: indices, index: 0 };
            this.saveState();
        }
    }

    // Persist state
    saveState() {
        try {
            fs.writeFileSync(STATE_PATH, JSON.stringify(this.state, null, 2), 'utf8');
        } catch (err) {
            console.error('❌ Failed to write state file:', err);
        }
    }

    // Authenticate to Rocket.Chat
    async authenticate() {
        try {
            const res = await axios.post(`${this.serverUrl}/api/v1/login`, {
                user: this.username,
                password: this.password
            });
            this.authToken = res.data.data.authToken;
            this.userId = res.data.data.userId;
            return true;
        } catch (err) {
            console.error('❌ Authentication failed:', err);
            return false;
        }
    }

    // Compute today's room name
    getCurrentRoomName() {
        const now = DateTime.now().setZone('America/Chicago');
        const suffix = (d => (d>=11&&d<=13?'th':{1:'st',2:'nd',3:'rd'}[d%10]||'th'))(now.day);
        return `${now.monthLong}-${now.day}${suffix}-${now.year}`;
    }

    // Check room existence
    async checkRoomExists(roomName) {
        try {
            const res = await axios.get(
                `${this.serverUrl}/api/v1/rooms.info?roomName=${encodeURIComponent(roomName)}`,
                { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
            );
            return res.data.room._id;
        } catch {
            return null;
        }
    }

    // Create room if needed
    async createRoom(roomName, description) {
        const res = await axios.post(
            `${this.serverUrl}/api/v1/channels.create`,
            { name: roomName, description: description || roomName, readOnly: false },
            { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
        );
        return res.data.channel._id;
    }

    // Post a message to a room
    async sendMessage(roomId, text) {
        await axios.post(
            `${this.serverUrl}/api/v1/chat.postMessage`,
            { roomId, text },
            { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
        );
    }

    // Get next shuffled safety message
    getNextSafetyMessage() {
        const idx = this.dailyOrder[this.messageIndex++];
        this.state.index = this.messageIndex;
        this.saveState();
        return this.safetyMessages[idx];
    }

    /**
     * 1) RTS reminder, daily at 6 PM
     */
    async sendRtsReminderMessage() {
        if (!this.authToken && !(await this.authenticate())) return;
        const roomName = this.getCurrentRoomName();
        const roomId = (await this.checkRoomExists(roomName)) || await this.createRoom(roomName);
        const msg = `
:pushpin: *RTS Reminders* :pushpin:

*Before you RTS*  :arrow_down:
🔎 Check your van for any missorts or missing packages 📦 before you RTS. Missing packages must be reattempted, and missorts must be delivered if they are within a 15-minute radius.

*Parking at Station*  :blue_car:
Clean out your van! Take your trash🗑, wipe it down :sponge:, and sweep it out. 🧹 You may not be in the same van tomorrow. Do not leave your mess for someone else. :do_not_litter:

*Equipment turn in*  :bulb:
When you turn in your bag at the end of the night, be sure to check it thoroughly. Make sure the work device 📱, the gas card 💳, the keys 🔑, and the portable charger 🔋 are inside. Also, please remember to wait the full 2 minutes for your post trip on standard vehicles and 3 minutes on step vans. And be certain you've clocked out before leaving. :clock8:
`;
        await this.sendMessage(roomId, msg);
    }

    /**
     * 2) Standard safety/hydration/heat/clock‐in methods...
     */
    async sendSafetyMessage() {
        if (!this.authToken && !(await this.authenticate())) return;
        const roomName = this.getCurrentRoomName();
        const roomId = await this.checkRoomExists(roomName);
        if (!roomId) return;
        await this.sendMessage(roomId, this.getNextSafetyMessage());
    }

    async sendHydrationMessage() {
        if (!this.authToken && !(await this.authenticate())) return;
        const now = DateTime.now().setZone('America/Chicago');
        if (now.month < 5 || now.month > 9) return;
        const roomName = this.getCurrentRoomName();
        const roomId = await this.checkRoomExists(roomName);
        if (!roomId) return;
        const msg = `🌊HYDRATE HYDRATE HYDRATE🌊\nIf you are reading this drink water now!\nStay ahead of dehydration.`;
        await this.sendMessage(roomId, msg);
    }

    async sendHeatReminderMessage() {
        if (!this.authToken && !(await this.authenticate())) return;
        const now = DateTime.now().setZone('America/Chicago');
        if (now.month < 5 || now.month > 9) return;
        const roomName = this.getCurrentRoomName();
        const roomId = await this.checkRoomExists(roomName);
        if (!roomId) return;
        const msg = `@all ⚠️ Texas heat is no joke—knock out half your route by 2 PM to beat the worst of it. Stay safe! 💪🔥`;
        await this.sendMessage(roomId, msg);
    }

    async sendClockInReminderMessage() {
        if (!this.authToken && !(await this.authenticate())) return;
        const roomName = this.getCurrentRoomName();
        const roomId = await this.checkRoomExists(roomName);
        if (!roomId) return;
        const msg = `*Attention Titans*\n@all Please clock in now or email time@infi-dau7.com if you’re unable to.`;
        await this.sendMessage(roomId, msg);
    }

    async sendFirstBreakReminderMessage() {
        if (!this.authToken && !(await this.authenticate())) return;
        const roomName = this.getCurrentRoomName();
        const roomId = await this.checkRoomExists(roomName);
        if (!roomId) return;
        const msg = `@all *If you stop before your first delivery then you are using your first break!* This means stopping for the restroom, food, or drinks. Come prepared. You are expected to be at your first delivery by a certain time. You are already putting yourself behind if you stop before then. ⏰ ❗`;
        await this.sendMessage(roomId, msg);
    }
    /**
     * 3) Wire up all cron schedules and start/stop helpers
     */
    startAutomation() {
        const nowCT = DateTime.now().setZone('America/Chicago').toLocaleString(DateTime.DATETIME_FULL);
        console.log(`🚀 Deployment Time (America/Chicago): ${nowCT}`);
        console.log('🚀 Starting Infinite Delivery OPS Automation');

        // Immediate test to Danny
        this.sendImmediateMessageToDanny = async () => {
            if (!this.authToken && !(await this.authenticate())) return;
            const dm = await this.getOrCreateDirectMessageRoom(this.dannyUsername);
            if (!dm) return;
            await this.sendMessage(dm, '✅ Automation deployed successfully.');
        };
        this.sendImmediateMessageToDanny();

        // 1) RTS reminder at 6:00 PM CT every day
        this.scheduledRtsReminderTask = cron.schedule(
            '0 18 * * *',
            () => this.sendRtsReminderMessage(),
            { timezone: 'America/Chicago' }
        );

        // 2) First‑stop (first‑break) reminder at 10:15 AM CT
        this.scheduledFirstBreakReminderTask = cron.schedule(
            '15 10 * * *',
            () => this.sendFirstBreakReminderMessage(),
            { timezone: 'America/Chicago' }
        );

        // 3) Lunch follow‑up at 2:30 PM CT
        this.scheduledLunch230ReminderTask = cron.schedule(
            '30 14 * * *',
            () => this.sendLunch230ReminderMessage(),
            { timezone: 'America/Chicago' }
        );

        // 4) Standard safety messages every 30 min from 10:00–19:30
        this.scheduledSafetyTask = cron.schedule(
            '0,30 10-19 * * *',
            () => this.sendSafetyMessage(),
            { timezone: 'America/Chicago' }
        );

        // 5) Hydration every hour on the hour 10:00–18:00, May–Sept
        this.scheduledHydrationTask = cron.schedule(
            '0 10-18 * 5-9 *',
            () => this.sendHydrationMessage(),
            { timezone: 'America/Chicago' }
        );

        // 6) Heat reminder at 9:00 AM CT, May–Sept
        this.scheduledHeatReminderTask = cron.schedule(
            '0 9 * 5-9 *',
            () => this.sendHeatReminderMessage(),
            { timezone: 'America/Chicago' }
        );

        // 7) Clock‑in reminder at 9:25 AM CT daily
        this.scheduledClockInTask = cron.schedule(
            '25 9 * * *',
            () => this.sendClockInReminderMessage(),
            { timezone: 'America/Chicago' }
        );

        // 8) Timecard reminders: Friday 8 AM and Saturday 5 PM to #general
        this.scheduledFridayTask = cron.schedule(
            '0 8 * * 5',
            () => this.sendFridayTimecardReminder(),
            { timezone: 'America/Chicago' }
        );
        this.scheduledSaturdayTask = cron.schedule(
            '0 17 * * 6',
            () => this.sendSaturdayTimecardReminder(),
            { timezone: 'America/Chicago' }
        );

        // 9) Delivery countdowns at 11:30, 13:30, 15:30, 17:30 CT
        this.scheduledDeliveryCountdown1130 = cron.schedule(
            '30 11 * * *',
            () => this.sendDeliveryCountdownReminder1130(),
            { timezone: 'America/Chicago' }
        );
        this.scheduledDeliveryCountdown1330 = cron.schedule(
            '30 13 * * *',
            () => this.sendDeliveryCountdownReminder1330(),
            { timezone: 'America/Chicago' }
        );
        this.scheduledDeliveryCountdown1530 = cron.schedule(
            '30 15 * * *',
            () => this.sendDeliveryCountdownReminder1530(),
            { timezone: 'America/Chicago' }
        );
        this.scheduledDeliveryCountdown1730 = cron.schedule(
            '30 17 * * *',
            () => this.sendDeliveryCountdownReminder1730(),
            { timezone: 'America/Chicago' }
        );

        // 10) Random safety‑image uploads at 10:15, 12:15, 15:15 CT
        this.scheduledImageUpload1 = cron.schedule(
            '15 10 * * *',
            () => this.sendRandomImageReminder(),
            { timezone: 'America/Chicago' }
        );
        this.scheduledImageUpload2 = cron.schedule(
            '15 12 * * *',
            () => this.sendRandomImageReminder(),
            { timezone: 'America/Chicago' }
        );
        this.scheduledImageUpload3 = cron.schedule(
            '15 15 * * *',
            () => this.sendRandomImageReminder(),
            { timezone: 'America/Chicago' }
        );
    }

    stopAutomation() {
        [
            this.scheduledRtsReminderTask,
            this.scheduledFirstBreakReminderTask,
            this.scheduledLunch230ReminderTask,
            this.scheduledSafetyTask,
            this.scheduledHydrationTask,
            this.scheduledHeatReminderTask,
            this.scheduledClockInTask,
            this.scheduledFridayTask,
            this.scheduledSaturdayTask,
            this.scheduledDeliveryCountdown1130,
            this.scheduledDeliveryCountdown1330,
            this.scheduledDeliveryCountdown1530,
            this.scheduledDeliveryCountdown1730,
            this.scheduledImageUpload1,
            this.scheduledImageUpload2,
            this.scheduledImageUpload3
        ].forEach(task => task && task.stop());
        console.log('⏹️ All automations stopped');
    }
}

// Bootstrap
console.log('🔧 Loading environment variables...');
console.log({
    ROCKET_CHAT_SERVER_URL: process.env.ROCKET_CHAT_SERVER_URL,
    ROCKET_CHAT_USERNAME: process.env.ROCKET_CHAT_USERNAME,
    ROCKET_CHAT_PASSWORD: process.env.ROCKET_CHAT_PASSWORD ? '****' : undefined,
    DANNY_USERNAME: process.env.DANNY_USERNAME
});

(async () => {
    try {
        const automation = new RocketChatAutomation(
            process.env.ROCKET_CHAT_SERVER_URL,
            process.env.ROCKET_CHAT_USERNAME,
            process.env.ROCKET_CHAT_PASSWORD,
            process.env.DANNY_USERNAME
        );
        automation.startAutomation();
    } catch (err) {
        console.error('🔥 Failed to start automation:', err);
    }
})();
