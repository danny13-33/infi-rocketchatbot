require('dotenv').config();
const axios = require('axios');
const cron = require('node-cron');
const { DateTime } = require('luxon');
const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(__dirname, 'state.json');

class RocketChatAutomation {
    constructor(serverUrl, username, password, dannyUsername) {
        this.serverUrl = serverUrl.replace(/\/$/, '');
        this.username = username;
        this.password = password;
        this.dannyUsername = dannyUsername;
        this.authToken = null;
        this.userId = null;
<<<<<<< HEAD
        this.scheduledSafetyTask = null;
        this.scheduledHydrationTask = null;
=======
        this.scheduledTask = null;
>>>>>>> ef278d1e8b5a1147446d15a0c87a9a464d0447b0

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
<<<<<<< HEAD
            `Amazon is not playing with Safety any longer. Any Severe Infractions will suspend your account immediately while on route. If that occurs there’s nothing we can do other than send you back to station and take immediate disciplinary action including termination. Ensure you are adhering to all Safety measures and if you see a yellow light be prepared to STOP.`,
=======

            `Amazon is not playing with Safety any longer. Any Severe Infractions will suspend your account immediately while on route. If that occurs there’s nothing we can do other than send you back to station and take immediate disciplinary action including termination. Ensure you are adhering to all Safety measures and if you see a yellow light be prepared to STOP.`,

>>>>>>> ef278d1e8b5a1147446d15a0c87a9a464d0447b0
            `:truck: *Watch your FOLLOWING DISTANCE Titans!*  
                You should be AT LEAST 3 van lengths behind the vehicle in front of you.  
                This can increase depending on road conditions, your speed, and the weather.  
                :construction: :motorway: :cloud_rain:  
                Even if you are cut off, then you must take defensive action by slowing down. Let off the accelerator and apply the brake if needed to create distance.  
                *PAY ATTENTION When you are changing lanes and merging. Following distance still applies!*  

                Please remember to leave plenty of space in between you and the vehicle in front of you. Increasing the distance between you and the car ahead can give you the time you need to recognize a hazard, should one enter your path, and respond safely.  
                Keep at least an 8-second (3 car) distance between you and the vehicle in front of you. Slow down to give space when drivers merge. If another driver cuts you off, slow down to create distance.`,
<<<<<<< HEAD
            `:no_entry_sign: *NO PET ENGAGEMENT*  
                There is a strict no pet engagement policy. It doesn't matter the size or breed of the animal, PLEASE leave them alone. If there is an animal present & the customer has not already restrained them, conduct Contact Compliance.`,
            `If you see a dog or signs of a dog at a delivery location, you can request that the paw print icon be added by navigating to the ‘Help’ page in the Delivery App and selecting ‘Report a dog on your route.’`,
            `To avoid dog bites: If you see a dog present, mark it as unable to deliver due to the dog and then follow contact compliance (CC). Never get out of the van if you see a dog loose.`,
            `Before you start walking to your destination, look at where you will be placing your feet. Don't jump in and out of the vans. Your legs are not designed to absorb incredible impact over and over. Use all of the steps available to you and try to maintain 3 points of contact.  
                Rushing is when you make the most mistakes. Slow is smooth, smooth is fast. Find your groove and stick with it.`,
            `On days where moisture is high, we are also at high risk for slips, trips and falls. Three points of contact when getting out of the vans and be highly familiar with your pathing today. Being safe on the road is something you are all extremely capable of doing, please do it!`,
=======

            `:no_entry_sign: *NO PET ENGAGEMENT*  
                There is a strict no pet engagement policy. It doesn't matter the size or breed of the animal, PLEASE leave them alone. If there is an animal present & the customer has not already restrained them, conduct Contact Compliance.`,

            `If you see a dog or signs of a dog at a delivery location, you can request that the paw print icon be added by navigating to the ‘Help’ page in the Delivery App and selecting ‘Report a dog on your route.’`,

            `To avoid dog bites: If you see a dog present, mark it as unable to deliver due to the dog and then follow contact compliance (CC). Never get out of the van if you see a dog loose.`,

            `Before you start walking to your destination, look at where you will be placing your feet. Don't jump in and out of the vans. Your legs are not designed to absorb incredible impact over and over. Use all of the steps available to you and try to maintain 3 points of contact.  
                Rushing is when you make the most mistakes. Slow is smooth, smooth is fast. Find your groove and stick with it.`,

            `On days where moisture is high, we are also at high risk for slips, trips and falls. Three points of contact when getting out of the vans and be highly familiar with your pathing today. Being safe on the road is something you are all extremely capable of doing, please do it!`,

>>>>>>> ef278d1e8b5a1147446d15a0c87a9a464d0447b0
            `Wearing a seatbelt is one of the best things you can do to protect yourself when driving. Remember to always wear your seatbelt correctly — across your chest and waist. Never sit on your seatbelt when it is buckled.  
                If you feel your seatbelt is not working properly, post your concern in the van issues chat & let one of the members of Management know.  
                No vehicle should be on the road with a faulty seatbelt.  

                Remember to always wear your seatbelt when the vehicle is moving and only use your device when the vehicle is sitting still! Watch your speeds and let's have a great day today!`,
<<<<<<< HEAD
=======

>>>>>>> ef278d1e8b5a1147446d15a0c87a9a464d0447b0
            `:truck: :dash: :dash: *Speeding*  
                Speeding is one of the most common causes of accidents on the road.  
                If you are not sure of what the speed limit is, you should proceed with caution and operate at a speed that is typical for the road type and location (e.g., 25–30 mph in a neighborhood).  
                Be on the lookout for road signs indicating speed limit changes, as speeding violations are easy to avoid.  
                *Don't go off of what GPS tells you. Go off what the SIGNS say, because that is what the camera sees!*`,
<<<<<<< HEAD
            `Make sure you keep an eye on your speed while delivering today! If you're in doubt about what the speed limit is, drive slower than you think it is. Always follow signs over what the GPS says the limit is. Let's keep today safe and finish strong.`,
            `Water is very important to your body's health. Hydration should be a top priority every time you know that you are scheduled to come in. Come to work hydrated with plenty of supplies so you can avoid suffering from dehydration while you are out on your route.`,
            `Please ensure that you are arriving to work hydrated with adequate water supply. There may be some water out on the pads, but understand that bringing water to work is your responsibility.  
                Amazon does run out of water from time to time. If you don't arrive hydrated along with bringing adequate water supplies, you have essentially set yourself up to be a victim of dehydration.  
                *If there is water on the pad, please be considerate of others.*`,
=======

            `Make sure you keep an eye on your speed while delivering today! If you're in doubt about what the speed limit is, drive slower than you think it is. Always follow signs over what the GPS says the limit is. Let's keep today safe and finish strong.`,

            `Water is very important to your body's health. Hydration should be a top priority every time you know that you are scheduled to come in. Come to work hydrated with plenty of supplies so you can avoid suffering from dehydration while you are out on your route.`,

            `Please ensure that you are arriving to work hydrated with adequate water supply. There may be some water out on the pads, but understand that bringing water to work is your responsibility.  
                Amazon does run out of water from time to time. If you don't arrive hydrated along with bringing adequate water supplies, you have essentially set yourself up to be a victim of dehydration.  
                *If there is water on the pad, please be considerate of others.*`,

>>>>>>> ef278d1e8b5a1147446d15a0c87a9a464d0447b0
            `:stop_sign: *Stop Signs* :stop_sign:  
                Come to a complete stop at all stop signs. Stop signs are placed at intersections to protect both you & others from avoidable crashes.  
                Can't see if any oncoming traffic is coming from where the sign is placed?  
                A good practice is to make a complete stop where the sign is placed & creep forward until you can see whether any oncoming traffic is approaching. Stay Safe Titans!  
                *Stop the front of your vehicle BEHIND the stop sign for at least 2 full seconds.*`,
<<<<<<< HEAD
            `Keep an eye out for stop signs! You must come to a complete stop at all stop signs, this means pressing the brake completely until the van is no longer moving. Any motion before continuing will cause an alert!`,
=======

            `Keep an eye out for stop signs! You must come to a complete stop at all stop signs, this means pressing the brake completely until the van is no longer moving. Any motion before continuing will cause an alert!`,

>>>>>>> ef278d1e8b5a1147446d15a0c87a9a464d0447b0
            `:traffic_light: *Traffic Lights* :traffic_light:  
                Someone runs a red light on average every 20 minutes at urban intersections.  
                Traffic Lights are placed at intersections to help maintain a safe flow of traffic & maintain the safety of yourself & others while on the road.  
                Approaching a light & it's turning yellow? Safely come to a stop before entering the intersection.  
                *COME TO A STOP when the light turns yellow. DON'T TRY TO BEAT THE LIGHT!*`,
<<<<<<< HEAD
            `TITANS, at no point throughout your route should you be delivering with ANY door (driver side, sliding, or back door) open.  
                This is one of the most unsafe practices you can do while delivering. Someone can hop inside or take packages from your vehicle. Also, packages can fall out without you noticing.`,
=======

            `TITANS, at no point throughout your route should you be delivering with ANY door (driver side, sliding, or back door) open.  
                This is one of the most unsafe practices you can do while delivering. Someone can hop inside or take packages from your vehicle. Also, packages can fall out without you noticing.`,

>>>>>>> ef278d1e8b5a1147446d15a0c87a9a464d0447b0
            `Being vigilant is one of many important skills you can utilize while you are on route.  
                Pedestrians are usually present at intersections, however they may decide to enter the road at any point with or without a crosswalk or signal present.  
                This is especially important at times like when school zones begin or end or near holidays.  
                *Keep an eye out for an increase in traffic during the busy hours or days.*`,
<<<<<<< HEAD
=======

>>>>>>> ef278d1e8b5a1147446d15a0c87a9a464d0447b0
            `:hot_face: *Hot Weather Tips* :hot_face:  
                You are responsible for your own health and showing up to work prepared.  

                :droplet: _Hydration_ – Aim for a gallon of water per day; more if you sweat heavily.  
                :coffee: :no_entry_sign: _Caffeine_ – Avoid caffeine as it dehydrates you. Choose natural energy sources like fruits and vegetables.  
                :apple: _Diet_ – Eat light snacks during the day. Heavy breakfasts may weigh you down.  
                :sleeping: _Rest_ – Get enough sleep before work. Avoid dozing off behind the wheel.  
                :point_up: _Recovery_ – Don’t rely solely on meds like Ibuprofen. Recover with hydration, good food, and rest.  

                Practice these the day of and the night before coming into work to prevent heat-related illness.`,
<<<<<<< HEAD
=======

>>>>>>> ef278d1e8b5a1147446d15a0c87a9a464d0447b0
            `Friendly reminder to be absolutely critical with your ability to make decisions while on the road, especially when navigating through blind spots.  
                If you are merging then look at the side view mirrors and lean forward to get a different perspective.  
                If you are putting the van in reverse then use the mirrors, the camera, AND Get Out And Look.`
        ];

<<<<<<< HEAD
        // Persisted state: { date: "YYYY-MM-DD", order: [shuffled indices], index: integer }
=======
        // State object: holds today's date (YYYY-MM-DD), shuffled order, and current index
>>>>>>> ef278d1e8b5a1147446d15a0c87a9a464d0447b0
        this.state = { date: null, order: [], index: 0 };
        this.dailyOrder = [];
        this.messageIndex = 0;

        this.loadOrInitState();
    }

<<<<<<< HEAD
    // Load existing state or initialize a new shuffle for today
=======
    // Load existing state from disk or initialize a new order for today
>>>>>>> ef278d1e8b5a1147446d15a0c87a9a464d0447b0
    loadOrInitState() {
        const today = DateTime.now().setZone('America/Chicago').toISODate(); // "YYYY-MM-DD"

        let persisted = null;
        if (fs.existsSync(STATE_PATH)) {
            try {
                const raw = fs.readFileSync(STATE_PATH, 'utf8');
                persisted = JSON.parse(raw);
            } catch {
                persisted = null;
            }
        }

<<<<<<< HEAD
        if (
            persisted &&
            persisted.date === today &&
            Array.isArray(persisted.order) &&
            typeof persisted.index === 'number'
        ) {
            // Use the persisted shuffle + index
=======
        if (persisted && persisted.date === today && Array.isArray(persisted.order) && typeof persisted.index === 'number') {
            // Use the persisted shuffle and index
>>>>>>> ef278d1e8b5a1147446d15a0c87a9a464d0447b0
            this.state = persisted;
            this.dailyOrder = persisted.order;
            this.messageIndex = persisted.index;
        } else {
<<<<<<< HEAD
            // New day or no valid persisted state → shuffle indices
            const count = this.safetyMessages.length;
            const indices = Array.from({ length: count }, (_, i) => i);
            // Fisher–Yates shuffle
=======
            // Either no state, or it's from a previous day → create new shuffle
            const count = this.safetyMessages.length;
            const indices = Array.from({ length: count }, (_, i) => i);
            // Fisher-Yates shuffle
>>>>>>> ef278d1e8b5a1147446d15a0c87a9a464d0447b0
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

<<<<<<< HEAD
    // Persist current state to disk
=======
    // Write current state to disk
>>>>>>> ef278d1e8b5a1147446d15a0c87a9a464d0447b0
    saveState() {
        try {
            fs.writeFileSync(STATE_PATH, JSON.stringify(this.state, null, 2), 'utf8');
        } catch (err) {
            console.error('❌ Failed to write state file:', err);
        }
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
        // Use America/Chicago timezone to determine the correct "today"
        const nowCT = DateTime.now().setZone('America/Chicago');
        const month = nowCT.monthLong;
        const day = nowCT.day;
        const year = nowCT.year;
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
                console.log(`⚠️ Room "${roomName}" does not exist yet`);
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
<<<<<<< HEAD
        // If the date has rolled over since last load, reinitialize
=======
        // Ensure if day changed, reload or reinitialize
>>>>>>> ef278d1e8b5a1147446d15a0c87a9a464d0447b0
        const today = DateTime.now().setZone('America/Chicago').toISODate();
        if (this.state.date !== today) {
            this.loadOrInitState();
        }

<<<<<<< HEAD
        const idx = this.dailyOrder[this.messageIndex];
        const message = this.safetyMessages[idx];

        // Advance index and save state
=======
        // Pick the next index from the shuffled dailyOrder
        const idx = this.dailyOrder[this.messageIndex];
        const message = this.safetyMessages[idx];

        // Advance index and persist
>>>>>>> ef278d1e8b5a1147446d15a0c87a9a464d0447b0
        this.messageIndex++;
        this.state.index = this.messageIndex;
        this.saveState();

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
        const now = DateTime.now().setZone('America/Chicago');
        const hour = now.hour;
        const minute = now.minute;
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
            console.log('⏰ Outside business hours, skipping safety message');
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
            console.log(`⏳ Room "${roomName}" not created yet - skipping safety message`);
            return;
        }

        if (!this.isRoomForToday(roomName)) {
            console.log(`📅 Room "${roomName}" exists but is not today’s room - skipping`);
            return;
        }

        const message = this.getNextSafetyMessage();
        await this.sendMessage(roomId, message);
<<<<<<< HEAD
    }

    async sendHydrationMessage() {
        // Only run from May 1st to September 30th (month 5–9 inclusive)
        const nowCT = DateTime.now().setZone('America/Chicago');
        const month = nowCT.month;
        if (month < 5 || month > 9) {
            return;
        }

        if (!this.authToken || !this.userId) {
            const authSuccess = await this.authenticate();
            if (!authSuccess) {
                console.error('❌ Failed to authenticate for hydration message');
                return;
            }
        }

        const roomName = this.getCurrentRoomName();
        const roomId = await this.checkRoomExists(roomName);

        if (!roomId) {
            console.log(`⏳ Room "${roomName}" not created yet - skipping hydration message`);
            return;
        }

        if (!this.isRoomForToday(roomName)) {
            console.log(`📅 Room "${roomName}" exists but is not today’s room - skipping hydration message`);
            return;
        }

        const hydrationMessage =
            `🌊HYDRATE HYDRATE HYDRATE🌊\n` +
            `If you are reading this drink water now!\n` +
            `Do Not be a victim to Heat. Stay Hydrated\n
            @all`;

        await this.sendMessage(roomId, hydrationMessage);
=======
>>>>>>> ef278d1e8b5a1147446d15a0c87a9a464d0447b0
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

        const dannyRoomId = await this.getOrCreateDirectMessageRoom(this.dannyUsername);
        if (!dannyRoomId) {
            console.warn('⚠️ Could not get or create DM room with Danny');
            return;
        }

        const immediateMessage =
            `✅ Safety Automation Deployed Successfully.\n` +
            `This is your immediate test message, Danny.`;

        try {
            await this.sendMessage(dannyRoomId, immediateMessage);
            console.log('✅ Immediate message sent to Danny');
        } catch (error) {
            console.error('❌ Failed to send immediate message to Danny:', error.message || error);
        }
    }

    startAutomation() {
        // Print deployment date/time in Central Time
        const nowCT = DateTime.now().setZone('America/Chicago').toLocaleString(DateTime.DATETIME_FULL);
        console.log(`🚀 Deployment Time (America/Chicago): ${nowCT}`);

<<<<<<< HEAD
        console.log('🚀 Starting Infinite Delivery OPS Automation');
        console.log('📅 Safety messages: every 30 minutes from 10:00 AM to 7:30 PM CT daily');
        console.log('📅 Hydration messages: every hour on the hour from 10:00 AM to 6:00 PM CT, May 1 – September 30');

        this.sendImmediateMessageToDanny();

        // Safety reminders: every 30 minutes 10:00–19:30 CT, every day
        this.scheduledSafetyTask = cron.schedule(
            '0,30 10-19 * * *',
            async () => {
                try {
                    await this.sendSafetyMessage();
                } catch (error) {
                    console.error('🔥 Error during scheduled safety message:', error.message || error);
                }
            },
            { timezone: 'America/Chicago' }
        );

        // Hydration reminder: at minute 0, hours 10–18, months 5–9, every day
        this.scheduledHydrationTask = cron.schedule(
            '0 10-18 * 5-9 *',
            async () => {
                try {
                    await this.sendHydrationMessage();
                } catch (error) {
                    console.error('🔥 Error during scheduled hydration message:', error.message || error);
                }
            },
            { timezone: 'America/Chicago' }
        );
=======
        console.log('🚀 Starting Infinite Delivery OPS Safety Message Automation');
        console.log('📅 Messages will be sent every 30 minutes from 10:00 AM to 7:30 PM America/Chicago timezone, every day of the week');

        this.sendImmediateMessageToDanny();

        this.scheduledTask = cron.schedule('0,30 10-19 * * *', async () => {
            try {
                await this.sendSafetyMessage();
            } catch (error) {
                console.error('🔥 Error during scheduled safety message:', error.message || error);
            }
        }, {
            timezone: 'America/Chicago'
        });
>>>>>>> ef278d1e8b5a1147446d15a0c87a9a464d0447b0
    }

    stopAutomation() {
        if (this.scheduledSafetyTask) {
            this.scheduledSafetyTask.stop();
            console.log('⏹️ Stopped safety automation');
        }
        if (this.scheduledHydrationTask) {
            this.scheduledHydrationTask.stop();
            console.log('⏹️ Stopped hydration automation');
        }
    }
}

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
