const axios = require('axios');
const cron = require('node-cron');

class RocketChatAutomation {
    constructor(serverUrl, username, password) {
        this.serverUrl = serverUrl.replace(/\/$/, ''); // Remove trailing slash
        this.username = username;
        this.password = password;
        this.authToken = null;
        this.userId = null;
        
        // Safety messages pool
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
        
        this.messageIndex = 0;
        // List all current safety messages
    listSafetyMessages() {
        console.log('📝 Current Safety Messages:');
        this.safetyMessages.forEach((msg, index) => {
            console.log(`${index + 1}. ${msg}`);
        });
    }
}

    // Authenticate with Rocket Chat
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

    // Get current date in the format used for room names
    getCurrentRoomName() {
        const now = new Date();
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const month = months[now.getMonth()];
        const day = now.getDate();
        const year = now.getFullYear();
        
        // Format: May-26th-2025
        const suffix = this.getOrdinalSuffix(day);
        return `${month}-${day}${suffix}-${year}`;
    }

    // Get ordinal suffix for day (1st, 2nd, 3rd, etc.)
    getOrdinalSuffix(day) {
        if (day >= 11 && day <= 13) return 'th';
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    }

    // Check if room exists (does NOT create it automatically)
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

    // Optional: Create room manually (for when you're ready)
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

    // Get next safety message (rotates through the array)
    getNextSafetyMessage() {
        const message = this.safetyMessages[this.messageIndex];
        this.messageIndex = (this.messageIndex + 1) % this.safetyMessages.length;
        return message;
    }

    // Send message to room
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

    // Check if current time is within business hours (10am to 7:30pm)
    isBusinessHours() {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        
        // Convert to minutes since midnight for easier comparison
        const currentTime = hour * 60 + minute;
        const startTime = 10 * 60; // 10:00 AM
        const endTime = 19 * 60 + 30; // 7:30 PM
        
        return currentTime >= startTime && currentTime <= endTime;
    }

    // Check if today's date matches the room's intended date
    isRoomForToday(roomName) {
        const todayRoomName = this.getCurrentRoomName();
        return roomName === todayRoomName;
    }

    // Main function to send safety message
    async sendSafetyMessage() {
        if (!this.isBusinessHours()) {
            console.log('⏰ Outside business hours, skipping message');
            return;
        }

        console.log('🔄 Checking for today\'s room and sending safety message...');
        
        // Re-authenticate if needed (tokens can expire)
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
            console.log(`⏳ Room "${roomName}" not created yet - messages will start on ${roomName.replace(/-/g, ' ')} once you create the room`);
            return;
        }

        // Double-check that we're sending to the right day's room
        if (!this.isRoomForToday(roomName)) {
            console.log(`📅 Room "${roomName}" exists but it's not for today - waiting for the correct date`);
            return;
        }

        const message = this.getNextSafetyMessage();
        const currentTime = new Date().toLocaleTimeString();
        const fullMessage = `${message}\n\n*Automated Safety Reminder - ${currentTime}*`;
        
        await this.sendMessage(roomId, fullMessage);
    }

    // Start the automation
    startAutomation() {
        console.log('🚀 Starting Infinite Delivery OPS Safety Message Automation');
        console.log('📅 Messages will be sent every 30 minutes from 10:00 AM to 7:30 PM');
        
        // Send initial authentication
        this.authenticate().then(success => {
            if (success) {
                console.log('✅ Initial authentication successful');
                
                // Schedule messages every 30 minutes
                cron.schedule('0,30 * * * *', () => {
                    this.sendSafetyMessage();
                });
                
                console.log('⏰ Scheduler started - messages will be sent at :00 and :30 of each hour');
                
                // Optional: Send a test message immediately
                // this.sendSafetyMessage();
            }
        });
    }

    // Stop the automation (if needed)
    stopAutomation() {
        console.log('🛑 Stopping automation...');
        cron.getTasks().forEach(task => task.destroy());
    }

    // Manually create today's room (call this when you're ready)
    async createTodaysRoom(customDescription = null) {
        const roomName = this.getCurrentRoomName();
        
        // Check if room already exists first
        const existingRoomId = await this.checkRoomExists(roomName);
        if (existingRoomId) {
            console.log(`ℹ️ Room "${roomName}" already exists`);
            return existingRoomId;
        }
        
        return await this.createRoom(roomName, customDescription);
    }

    // Create room for a specific date (useful for planning ahead)
    async createRoomForDate(date, customDescription = null) {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const month = months[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();
        const suffix = this.getOrdinalSuffix(day);
        const roomName = `${month}-${day}${suffix}-${year}`;
        
        return await this.createRoom(roomName, customDescription);
    }

    // Add custom safety message
    addSafetyMessage(message) {
        this.safetyMessages.push(message);
        console.log(`✅ Added new safety message: "${message}"`);
    }
}

// Load configuration from environment variables (secure)
const automation = new RocketChatAutomation(
    process.env.ROCKETCHAT_URL || 'https://chat.infinitedeliveryops.com',
    process.env.BOT_USERNAME,  // Set this in your hosting platform
    process.env.BOT_PASSWORD   // Set this in your hosting platform
);

// Validate that required environment variables are set
if (!process.env.BOT_USERNAME || !process.env.BOT_PASSWORD) {
    console.error('❌ Missing required environment variables: BOT_USERNAME and/or BOT_PASSWORD');
    console.error('Please set these in your hosting platform or .env file');
    process.exit(1);
}

// Start the automation (will only send messages to rooms that already exist)
automation.startAutomation();

// TESTING: Run a complete test when the system starts
// This will test the system and send a test message to @danny
console.log('⏳ Running startup test in 5 seconds...');
setTimeout(() => {
    automation.runCompleteTest('danny');
}, 5000);

// MANUAL ROOM CREATION OPTIONS:
// automation.createTodaysRoom("Team: John, Sarah, Mike - Route: Downtown");
// const tomorrow = new Date();
// tomorrow.setDate(tomorrow.getDate() + 1);
// automation.createRoomForDate(tomorrow, "Team: Lisa, Bob, Carol - Route: Suburbs");

// Optional: Add custom safety messages
// automation.addSafetyMessage("🔋 Remember to check battery levels on all portable equipment");

// Export for use in other modules
module.exports = RocketChatAutomation;

/*
INSTALLATION INSTRUCTIONS:

1. Install required dependencies:
   npm install axios node-cron

2. Create a dedicated bot user in Rocket Chat:
   - Go to Administration > Users
   - Create a new user for the bot
   - Give it appropriate permissions to create channels and send messages

3. Update the configuration:
   - Replace server URL with your Rocket Chat instance
   - Replace username/password with your bot credentials

4. Run the script:
   node rocketchat-automation.js

FEATURES:
- Waits for you to manually create daily rooms with format "May-26th-2025"
- Only sends safety messages to rooms that already exist
- Sends safety messages every 30 minutes during business hours (10am-7:30pm)
- Rotates through 15 different safety messages
- Provides helper functions to create rooms when you're ready
- Handles authentication automatically
- Easy to customize messages and schedule

WORKFLOW:
1. The automation runs continuously, checking every 30 minutes
2. Each day, you manually create the room for that day's employees
3. Once the room exists, safety messages automatically start being sent
4. You can optionally use the helper functions to create rooms via code

ROOM CREATION OPTIONS:
- Keep doing it manually as you do now (recommended for your workflow)
- Use automation.createTodaysRoom() when you're ready each day
- Use automation.createRoomForDate() to create rooms in advance

CUSTOMIZATION OPTIONS:
- Modify business hours in isBusinessHours()
- Add/remove safety messages in the constructor
- Change message frequency by modifying the cron schedule
- Customize room naming format in getCurrentRoomName()
*/