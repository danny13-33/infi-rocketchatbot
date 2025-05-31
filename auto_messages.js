require('dotenv').config();
const axios = require('axios');
const cron = require('node-cron');

class RocketChatAutomation {
    constructor(serverUrl, username, password, dannyUsername) {
        this.serverUrl = serverUrl.replace(/\/$/, ''); // Remove trailing slash
        this.username = username;
        this.password = password;
        this.dannyUsername = dannyUsername; // Danny's username, not room ID anymore
        this.authToken = null;
        this.userId = null;
        this.messageIndex = 0;
        this.scheduledTask = null;

        this.safetyMessages = [
            `Distracted Driving
            :eyes: Keep your eyes on the road, check your mirrors, and glance at your GPS.  
            :exclamation: It is a Netradyne alert if you are looking down or in one direction too long.  
            Keep your hands on the steering wheel. You shouldn't be holding a phone in one hand while driving!  
            :exclamation: It is a distraction if you reach down or away from the wheel multiple times.  
            :parking: The vehicle must be in park or the camera will count as a distraction. It does not matter if you are at a light with the brake pressed down.  

            NOTE:  
            *If you connect your device that has EMentor via Bluetooth, you are likely to get "phone manipulations" on EMentor. This means answering calls, pausing music, skipping songs, or any action via Bluetooth. These will all count as distractions even though you are connected to Bluetooth.*  

            Distracted driving is one of the top causes of on-road accidents and puts you, other drivers, and community members at risk. Common distractions like using your phone or looking away from the road for more than a couple seconds are some of the riskiest distractions. Stay alert and focused to make every trip a safe one for you and the community.  

            *DO NOT HOLD YOUR PHONE WHILE DRIVING*`
        ];
    }

    listSafetyMessages() {
        console.log('📝 Current Safety Messages:');
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

    getCurrentRoomName() {
        const now = new Date();
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const month = months[now.getMonth()];
        const day = now.getDate();
        const year = now.getFullYear();
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
            const getRoomResponse = await axios.get(
                `${this.serverUrl}/api/v1/rooms.info?roomName=${encodeURIComponent(roomName)}`,
                {
                    headers: {
                        'X-Auth-Token': this.authToken,
                        'X-User-Id': this.userId
                    }
                }
            );

            console.log(`✅ Found existing room: "${roomName}"`);
            return getRoomResponse.data.room._id;
        } catch (error) {
            if (error.response?.status === 400) {
                console.log(`⚠️ Room "${roomName}" does not exist yet - waiting for manual creation`);
                return null;
            } else {
                console.error('❌ Error checking room existence:', error.response?.data?.message || error.message);
                return null;
            }
        }
    }

    async createRoom(roomName, description = null) {
        try {
            const createRoomResponse = await axios.post(
                `${this.serverUrl}/api/v1/channels.create`,
                {
                    name: roomName,
                    description: description || `Daily operations room for ${roomName.replace(/-/g, ' ')}`,
                    readOnly: false
                },
                {
                    headers: {
                        'X-Auth-Token': this.authToken,
                        'X-User-Id': this.userId
                    }
                }
            );

            console.log(`✅ Created new room: "${roomName}"`);
            return createRoomResponse.data.channel._id;
        } catch (createError) {
            console.error('❌ Failed to create room:', createError.response?.data?.message || createError.message);
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
            await axios.post(
                `${this.serverUrl}/api/v1/chat.postMessage`,
                {
                    roomId: roomId,
                    text: message
                },
                {
                    headers: {
                        'X-Auth-Token': this.authToken,
                        'X-User-Id': this.userId
                    }
                }
            );

            console.log(`📤 Message sent: "${message.substring(0, 50)}..."`);
            return true;
        } catch (error) {
            console.error('❌ Failed to send message:', error.response?.data?.message || error.message);
            return false;
        }
    }

    isBusinessHours() {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();

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

        if (!this.authToken || !this.userId) {
            const authSuccess = await this.authenticate();
            if (!authSuccess) {
                console.error('❌ Failed to authenticate, skipping this cycle');
                return;
            }
        }

        const roomName = this.getCurrentRoomName();
        const roomId = await this.checkRoomExists(roomName);

        if (!roomId) {
            console.log(`⏳ Room "${roomName}" not created yet - messages will start once the room is created`);
            return;
        }

        if (!this.isRoomForToday(roomName)) {
            console.log(`📅 Room "${roomName}" exists but it's not for today - skipping`);
            return;
        }

        const message = this.getNextSafetyMessage();
        const currentTime = new Date().toLocaleTimeString();
        const fullMessage = `${message}\n\n*Automated Safety Reminder - ${currentTime}*`;

        await this.sendMessage(roomId, fullMessage);
    }

    async getOrCreateDirectMessageRoom(username) {
        try {
            const response = await axios.post(
                `${this.serverUrl}/api/v1/im.create`,
                { username },
                {
                    headers: {
                        'X-Auth-Token': this.authToken,
                        'X-User-Id': this.userId
                    }
                }
            );
            return response.data.room._id;
        } catch (error) {
            console.error(`❌ Failed to get/create DM room with ${username}:`, error.response?.data?.message || error.message);
            return null;
        }
    }

    async sendImmediateMessageToDanny() {
        if (!this.authToken || !this.userId) {
            const authSuccess = await this.authenticate();
            if (!authSuccess) {
                console.error('❌ Failed to authenticate for immediate message to Danny');
                return;
            }
        }

        // Dynamically get or create DM room with Danny
        const dannyRoomId = await this.getOrCreateDirectMessageRoom(this.dannyUsername);

        if (!dannyRoomId) {
            console.warn('⚠️ Could not get or create DM room with Danny');
            return;
        }

        const immediateMessage = `✅ Safety Automation Deployed Successfully.\nThis is your immediate test message, Danny.`;

        try {
            await this.sendMessage(dannyRoomId, immediateMessage);
            console.log('✅ Immediate message sent to Danny');
        } catch (error) {
            console.error('❌ Failed to send immediate message to Danny:', error.message || error);
        }
    }

    startAutomation() {
        console.log('🚀 Starting Infinite Delivery OPS Safety Message Automation');
        console.log('📅 Messages will be sent every 30 minutes from 10:00 AM to 7:30 PM');

        // Schedule the job to run every 30 minutes from 10am to 7:30pm
        this.scheduledTask = cron.schedule('0,30 10-19 * * *', async () => {
            await this.sendSafetyMessage();
        }, {
            timezone: 'America/Chicago'
        });

        // Also send the immediate test message to Danny on startup
        this.sendImmediateMessageToDanny();
    }

    stopAutomation() {
        if (this.scheduledTask) {
            this.scheduledTask.stop();
            console.log('🛑 Stopped the automation scheduler');
        }
    }
}


// Usage example (make sure your .env has the needed values):
// const automation = new RocketChatAutomation(
//     process.env.ROCKET_CHAT_SERVER_URL,
//     process.env.ROCKET_CHAT_USERNAME,
//     process.env.ROCKET_CHAT_PASSWORD,
//     process.env.DANNY_USERNAME // e.g. 'danny'
// );
// automation.startAutomation();

module.exports = RocketChatAutomation;
