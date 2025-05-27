const axios = require('axios');
const cron = require('node-cron');

class RocketChatAutomation {
    constructor(serverUrl, username, password) {
        this.serverUrl = serverUrl.replace(/\/$/, '');
        this.username = username;
        this.password = password;
        this.authToken = null;
        this.userId = null;
        this.messageIndex = 0;

        this.safetyMessages = [
            "\ud83d\udea8 Safety Reminder: Always wear appropriate PPE when handling equipment",
            "\u26a0\ufe0f Check your surroundings before starting any task - stay aware!",
            "\ud83e\udeba Remember: Safety first, productivity second. Take your time!",
            "\ud83d\udd27 Inspect all tools before use. Report any damaged equipment immediately",
            "\ud83d\udeb6\u200d\u2642\ufe0f Walk, don't run. Keep pathways clear of obstacles",
            "\ud83d\udca1 If you're unsure about a procedure, ask for help. No question is too small!",
            "\ud83e\udde4 Proper lifting technique: bend your knees, keep your back straight",
            "\ud83d\udd25 Know the location of emergency exits and fire extinguishers",
            "\ud83d\udcf1 Emergency contacts are posted on the board. Keep them handy!",
            "\u23f0 Take regular breaks to stay alert and focused",
            "\ud83d\udd12 Always lock out/tag out equipment before maintenance",
            "\ud83d\udc40 Report near misses - they help prevent future accidents",
            "\ud83c\udf21\ufe0f Stay hydrated, especially during hot weather operations",
            "\ud83d\udccb Follow all established safety protocols - they're there for a reason",
            "\ud83e\udd1d Look out for your teammates - we're all in this together!"
        ];
    }

    listSafetyMessages() {
        console.log('\ud83d\udcdd Current Safety Messages:');
        this.safetyMessages.forEach((msg, index) => {
            console.log(`${index + 1}. ${msg}`);
        });
    }

    async authenticate() {
        try {
            const response = await axios.post(`${this.serverUrl}/api/v1/login`, {
                user: this.username,
                password: this.password
            });
            this.authToken = response.data.data.authToken;
            this.userId = response.data.data.userId;
            console.log('✅ Successfully authenticated with Rocket Chat');
            return true;
        } catch (error) {
            console.error('❌ Authentication failed:', error.response?.data?.message || error.message);
            return false;
        }
    }

    getCurrentRoomName(date = new Date()) {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const month = months[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();
        const suffix = this.getOrdinalSuffix(day);
        return `${month}-${day}${suffix}-${year}`;
    }

    getOrdinalSuffix(day) {
        if (day >= 11 && day <= 13) return 'th';
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    }

    async checkRoomExists(roomName) {
        try {
            const response = await axios.get(`${this.serverUrl}/api/v1/rooms.info?roomName=${encodeURIComponent(roomName)}`, {
                headers: {
                    'X-Auth-Token': this.authToken,
                    'X-User-Id': this.userId
                }
            });
            console.log(`✅ Found existing room: "${roomName}"`);
            return response.data.room._id;
        } catch (error) {
            if (error.response?.status === 400) {
                console.log(`⚠️ Room "${roomName}" does not exist yet`);
                return null;
            }
            console.error('❌ Error checking room existence:', error.response?.data?.message || error.message);
            return null;
        }
    }

    async createRoom(roomName, description = null) {
        try {
            const response = await axios.post(`${this.serverUrl}/api/v1/channels.create`, {
                name: roomName,
                description: description || `Daily operations room for ${roomName.replace(/-/g, ' ')}`,
                readOnly: false
            }, {
                headers: {
                    'X-Auth-Token': this.authToken,
                    'X-User-Id': this.userId
                }
            });
            console.log(`✅ Created new room: "${roomName}"`);
            return response.data.channel._id;
        } catch (error) {
            console.error('❌ Failed to create room:', error.response?.data?.message || error.message);
            return null;
        }
    }

    getNextSafetyMessage() {
        const message = this.safetyMessages[this.messageIndex];
        this.messageIndex = (this.messageIndex + 1) % this.safetyMessages.length;
        return message;
    }

    async sendMessage(roomId, message) {
        try {
            await axios.post(`${this.serverUrl}/api/v1/chat.postMessage`, {
                roomId: roomId,
                text: message
            }, {
                headers: {
                    'X-Auth-Token': this.authToken,
                    'X-User-Id': this.userId
                }
            });
            console.log(`📤 Message sent: "${message.substring(0, 50)}..."`);
            return true;
        } catch (error) {
            console.error('❌ Failed to send message:', error.response?.data?.message || error.message);
            return false;
        }
    }

    isBusinessHours(date = new Date()) {
        const hour = date.getHours();
        const minute = date.getMinutes();
        const currentTime = hour * 60 + minute;
        const startTime = 10 * 60;
        const endTime = 19 * 60 + 30;
        return currentTime >= startTime && currentTime <= endTime;
    }

    isRoomForToday(roomName) {
        return roomName === this.getCurrentRoomName();
    }

    async sendSafetyMessage() {
        if (!this.isBusinessHours()) {
            console.log('⏰ Outside business hours, skipping message');
            return;
        }

        console.log('🔄 Checking for today\'s room and sending safety message...');

        if (!this.authToken || !this.userId) {
            const authSuccess = await this.authenticate();
            if (!authSuccess) return;
        }

        const roomName = this.getCurrentRoomName();
        const roomId = await this.checkRoomExists(roomName);
        if (!roomId || !this.isRoomForToday(roomName)) return;

        const message = this.getNextSafetyMessage();
        const timeStamp = new Date().toLocaleTimeString();
        const fullMessage = `${message}\n\n*Automated Safety Reminder - ${timeStamp}*`;
        await this.sendMessage(roomId, fullMessage);
    }

    startAutomation() {
        console.log('🚀 Starting Safety Message Automation');
        this.authenticate().then(success => {
            if (success) {
                cron.schedule('0,30 * * * *', () => {
                    this.sendSafetyMessage();
                });
                console.log('⏰ Scheduler started - messages will be sent at :00 and :30 of each hour');
            }
        });
    }

    stopAutomation() {
        console.log('🛑 Stopping automation...');
        cron.getTasks().forEach(task => task.destroy());
    }

    async createTodaysRoom(description = null) {
        const roomName = this.getCurrentRoomName();
        const existingRoomId = await this.checkRoomExists(roomName);
        if (existingRoomId) return existingRoomId;
        return await this.createRoom(roomName, description);
    }

    async createRoomForDate(date, description = null) {
        const roomName = this.getCurrentRoomName(date);
        return await this.createRoom(roomName, description);
    }
}

module.exports = RocketChatAutomation;

