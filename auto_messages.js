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
        this.scheduledSafetyTask = null;
        this.scheduledHydrationTask = null;
        this.scheduledHeatReminderTask = null;
        this.scheduledClockInTask = null;

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

            `:exclamation: Amazon is not playing with Safety any longer. Any Severe Infractions will suspend your account immediately while on route. If that occurs there’s nothing we can do other than send you back to station and take immediate disciplinary action including termination. Ensure you are adhering to all Safety measures and if you see a yellow light be prepared to STOP.`,
            
            `:truck: *Watch your FOLLOWING DISTANCE Titans!*  
             You should be AT LEAST 3 van lengths behind the vehicle in front of you. This can increase depending on road conditions, your speed, and the weather. 

             :construction: :motorway: :cloud_rain:  
             Even if you are cut off, then you must take defensive action by slowing down. Let off the accelerator and apply the brake if needed to create distance.  
             
             *PAY ATTENTION When you are changing lanes and merging. Following distance still applies!*  

             Please remember to leave plenty of space in between you and the vehicle in front of you. Increasing the distance between you and the car ahead can give you the time you need to recognize a hazard, should one enter your path, and respond safely.  
             Keep at least an 8-second (3 car) distance between you and the vehicle in front of you. Slow down to give space when drivers merge. If another driver cuts you off, slow down to create distance.`,
            
            `:no_entry_sign: *NO PET ENGAGEMENT*  
             There is a strict no pet engagement policy. It doesn't matter the size or breed of the animal, PLEASE leave them alone. If there is an animal present & the customer has not already restrained them, conduct Contact Compliance.`,
             
            `If you see a dog or signs of a dog at a delivery location, you can request that the paw print icon be added by navigating to the ‘Help’ page in the Delivery App and selecting ‘Report a dog on your route.’`,
             
            `To avoid dog bites: If you see a dog present, mark it as unable to deliver due to the dog and then follow contact compliance (CC). Never get out of the van if you see a dog loose.`,

            `:leg: :eyes: Before you start walking to your destination, look at where you will be
             placing your feet. Don't jump in and out of the vans. Your legs are not designed to
             absorb incredible impact over and over. Use all of the steps available to you and
             try to maintain 3 points of contact. :raised_hand: 
             Rushing is when you make the most mistakes. Slow is smooth, smooth is
             fast. Find your groove and stick with it.`,

            `:exclamation:  :cloud_rain: On days where moisture is high, we are also at high risk for slips, trips and
             falls. Three points of contact when getting out of the vans and be highly familiar
             with your pathing today. Being safe on the road is something you are all extremely
             capable of doing, please do it!`,

            `:running_shirt_with_sash: Wearing a seatbelt is one of the safest things you can do to protect yourself
             when driving. Remember to always wear your seatbelt correctly — across your
             chest and waist. Never sit on your seatbelt when it is buckled.

             If you feel your seatbelt is not working properly, post your concern in the
             #on_road_van_issues chat & let one of the members of Management know.

             No vehicle should be on the road with a faulty seatbelt.

             :point_right:  Remember to always wear your seatbelt when the vehicle is moving and
             only use your device when the vehicle is sitting still!  
             :point_left: Watch your speeds and let's have a great day today!`,

            `:truck: :dash: :dash: *Speeding*  
             Speeding is one of the most common causes of accidents on the road.  
             If you are not sure of what the speed limit is, you should proceed with caution and operate at a speed that is typical for the road type and location (e.g., 25–30 mph in a neighborhood).  
             Be on the lookout for road signs indicating speed limit changes, as speeding violations are easy to avoid.  
             
             *Don't go off of what GPS tells you. Go off what the SIGNS say, because that is what the camera sees!*`,

            `:truck:  :dash:  :eyes: *Make sure you keep an eye on your speed while delivering today!* 
             If you're in doubt about what the speed limit is, drive slower than you think it is. Always
             follow signs over what the GPS says the limit is. Let's keep today safe and finish Strong.`,

            `Water is very important to your body's health. Hydration should be a top
             priority every time you know that you are scheduled to come in. Come to work
             hydrated with plenty of supplies so you can avoid suffering from dehydration while
             you are out on your route.`,

            `:droplet: Please ensure that you are arriving to work hydrated with adequate water
             supply. There may be some water out on the pads, but understand that bringing
             water to work is your responsibility.
             
             Amazon does run out of water from time to time. If you don't arrive
             hydrated along with bringing adequate water supplies, you have essentially set
             yourself up to be a victim of dehydration.
             
             *If there is water on the pad, please be considerate of others.*`,

            `:stop_sign: *Stop Signs* :stop_sign:  
             Come to a complete stop at all stop signs. Stop signs are placed at intersections to protect both you & others from avoidable crashes.  
             Can't see if any oncoming traffic is coming from where the sign is placed?  
             A good practice is to make a complete stop where the sign is placed & creep forward until you can see whether any oncoming traffic is approaching. Stay Safe Titans!  
             *Stop the front of your vehicle BEHIND the stop sign for at least 2 full seconds.*`,
            
            `Keep an eye out for stop signs! You must come to a complete stop at all stop signs, this means pressing the brake completely until the van is no longer moving. Any motion before continuing will cause an alert!`,
            
            `:traffic_light: *Traffic Lights* :traffic_light:  
             Someone runs a red light on average every 20 minutes at urban intersections.  
             Traffic Lights are placed at intersections to help maintain a safe flow of traffic & maintain the safety of yourself & others while on the road.  
             Approaching a light & it's turning yellow? Safely come to a stop before entering the intersection.  
             *COME TO A STOP when the light turns yellow. DON'T TRY TO BEAT THE LIGHT!*`,
            
            `:exclamation: TITANS, at no point throughout your route should you be delivering with ANY door (driver side, sliding, or back door) open.
             
             This is one of the most unsafe practices you can do while delivering.
             
             Someone can hop inside or take packages from your vehicle. Also, packages can fall out without you noticing.`,
            
            `Being vigilant is one of many important skills you can utilize while you are on route.
             
             :woman_walking: :children_crossing: :man_walking: 
             Pedestrians are usually present at intersections, however they may decide to enter the road at any point with or without a crosswalk or signal present.
             
             This is especially important at times like when school zones begin or end or near holidays.

             *Keep an eye out for an increase in traffic during the busy hours or days.*`,
            
            `:hot_face: *Hot Weather Tips* :hot_face:  
             You are responsible for your own health and showing up to work prepared.  

             :droplet: _Hydration_ – Aim for a gallon of water per day; more if you sweat heavily.  
             :coffee: :no_entry_sign: _Caffeine_ – Avoid caffeine as it dehydrates you. Choose natural energy sources like fruits and vegetables.  
             :apple: _Diet_ – Eat light snacks during the day. Heavy breakfasts may weigh you down.  
             :sleeping: _Rest_ – Get enough sleep before work. Avoid dozing off behind the wheel.  
             :point_up: _Recovery_ – Don’t rely solely on meds like Ibuprofen. Recover with hydration, good food, and rest.  

             Practice these the day of and the night before coming into work to prevent heat-related illness.`,
            
            `:exclamation:  :world_map:  :eyes: 
             Friendly reminder to be absolutely critical with your ability to make decisions while on the road, especially when navigating through blind spots.
             
             If you are merging then look at the side view mirrors and lean forward to get a different perspective.

             If you are putting the van in reverse then use the mirrors, the camera, AND Get Out And Look.`,

            `📌 Reminder: Try to avoid reversing whenever possible. If you must reverse, do not exceed 5 MPH — this triggers Netradyne alerts and, more importantly, helps keep you and others safe. 🚸

             Also, avoid parking on driveways. If you can see the front door from the street, there’s no need to pull into someone’s property. 🏠
             
             Let’s stay safe and smart out there!`,

            '@all *READ THE DELIVERY NOTES*\n' +
             'Your customer feedback score is affected by this.\n' +
             'If the notes say to leave in a specific spot, then do so.\n' +
             'Complete contact compliance, mark the package appropriately, and move on if you cannot follow the notes for any reason.\n' +
             '📦 📋 👀',

            '📸 *Take Quality Photos* 📸\n' +
             'All of your photos are screened and are either rejected or accepted by Amazon. Take your time to make sure you are taking clear photos of the package. Get with your management team with any questions on how to improve your POD (Picture on Delivery) metric.\n\n' +
             '• Do not take pictures of delivery drop-off boxes; take a clear picture of the packages instead.\n' +
             '• Do not take a picture of a package behind a fence.\n' +
             '• If you can’t get a clear picture, move the package(s) to somewhere you can, then complete the delivery to the requested area.\n\n' +
             'It is important that you swipe to finish the delivery at the location of the POD. Try to include anything recognizable (door number, unit number, doormat, etc.) in the picture to help combat negative customer feedback.',

            `🚨 *Reminder Titans!* 🚨

             Amazon is now treating rolling stops the same as running red lights. That means:

             🛑 Rolling through a stop sign = 🚦 Running a red light  
             ➡️ Route paused  
             ➡️ Driver account suspended

             Each violation requires us to take disciplinary action, and having a driver account suspended mid-route creates extra stress for the whole team.

             Keep it safe and simple — always make a complete stop at every stop sign. Let’s look out for each other and stay compliant. 💪`,

            `🚚 ➡ 👀
             *Reversing*
             Try and put yourself in situations where you have to reverse as little as possible. ❗ It is the most dangerous maneuver on the road. ❗
             Always get out and look (GOAL) to see what is behind you.
             Keep your speed under 5 MPH while backing up. Anything more than 5 MPH could get your account suspended.
             Use both mirrors and your back-up camera. Never rely on just one of them.
             Be aware of your van and its surroundings!
             🌳 🚚 📫`,

            `@all 🚨 Accident or Incident? Report It Immediately! 📲\n\n` +
             `If you're involved in any kind of incident or accident — no matter how minor — you must report it immediately through the proper channels. 📍 Do NOT leave the scene until you've been instructed to do so by management.\n\n` +
             `Your safety and proper reporting are top priorities. Stay put, stay calm, and communicate.`,
        ];

    }

    // Load existing state or initialize a new shuffle for today
    loadOrInitState() {
        const today = DateTime.now().setZone('America/Chicago').toISODate();

        let persisted = null;
        if (fs.existsSync(STATE_PATH)) {
            try {
                const raw = fs.readFileSync(STATE_PATH, 'utf8');
                persisted = JSON.parse(raw);
            } catch {
                persisted = null;
            }
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

    // Persist current state to disk
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
            const res = await axios.get(
                `${this.serverUrl}/api/v1/rooms.info?roomName=${encodeURIComponent(roomName)}`,
                {
                    headers: {
                        'X-Auth-Token': this.authToken,
                        'X-User-Id': this.userId
                    }
                }
            );
            console.log(`✅ Found existing room: "${roomName}"`);
            return res.data.room._id;
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
            const res = await axios.post(
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
            return res.data.channel._id;
        } catch (error) {
            console.error('❌ Failed to create room:', error.response?.data?.message || error.message);
            return null;
        }
    }

    getNextSafetyMessage() {
        const today = DateTime.now().setZone('America/Chicago').toISODate();
        if (this.state.date !== today) {
            this.loadOrInitState();
        }

        const idx = this.dailyOrder[this.messageIndex];
        const msg = this.safetyMessages[idx];

        this.messageIndex++;
        this.state.index = this.messageIndex;
        this.saveState();

        return msg;
    }

    async sendMessage(roomId, message) {
        try {
            await axios.post(
                `${this.serverUrl}/api/v1/chat.postMessage`,
                { roomId, text: message },
                { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
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
        const minutes = now.hour * 60 + now.minute;
        return minutes >= 10 * 60 && minutes <= 19 * 60 + 30;
    }

    isRoomForToday(roomName) {
        return roomName === this.getCurrentRoomName();
    }

    async sendSafetyMessage() {
        if (!this.isBusinessHours()) return;

        if (!this.authToken || !this.userId) {
            if (!(await this.authenticate())) return;
        }

        const roomName = this.getCurrentRoomName();
        const roomId = await this.checkRoomExists(roomName);
        if (!roomId || !this.isRoomForToday(roomName)) return;

        const message = this.getNextSafetyMessage();
        await this.sendMessage(roomId, message);
    }

    async sendHydrationMessage() {
        const nowCT = DateTime.now().setZone('America/Chicago');
        if (nowCT.month < 5 || nowCT.month > 9) return;

        if (!this.authToken || !this.userId) {
            if (!(await this.authenticate())) return;
        }

        const roomName = this.getCurrentRoomName();
        const roomId = await this.checkRoomExists(roomName);
        if (!roomId || !this.isRoomForToday(roomName)) return;

        const hydrationMessage =
            `🌊HYDRATE HYDRATE HYDRATE🌊\n` +
            `If you are reading this drink water now!\n` +
            `Do Not be a victim to Heat. Stay Hydrated`;

        await this.sendMessage(roomId, hydrationMessage);
    }

    async sendHeatReminderMessage() {
        const nowCT = DateTime.now().setZone('America/Chicago');
        if (nowCT.month < 5 || nowCT.month > 9) return;

        if (!this.authToken || !this.userId) {
            if (!(await this.authenticate())) return;
        }

        const roomName = this.getCurrentRoomName();
        const roomId = await this.checkRoomExists(roomName);
        if (!roomId || !this.isRoomForToday(roomName)) return;

        const heatReminderMessage =
            `@all ⚠️ Attention Titans! ⚠️\n\n` +
            `As always, we're reminding you that the Texas heat is no joke, especially during the peak summer months. That’s why we strongly encourage you to knock out more than half of your route by 2 PM. It’s absolutely achievable if you start strong and stay focused.\n\n` +
            `By hustling early, you’ll give yourself the chance to slow down and cool off when the heat is at its worst. The secret to success out here? Keep moving, stay organized, and manage your time wisely.\n\n` +
            `We believe in every single one of you, but more importantly, you’ve got to believe in yourself. Let’s stay safe, stay smart, and crush it out there.\n\n` +
            `You’ve got this Titans! 💪🔥`;

        await this.sendMessage(roomId, heatReminderMessage);
    }

    async sendClockInReminderMessage() {
        if (!this.authToken || !this.userId) {
            if (!(await this.authenticate())) return;
        }

        const roomName = this.getCurrentRoomName();
        const roomId = await this.checkRoomExists(roomName);
        if (!roomId || !this.isRoomForToday(roomName)) return;

        const clockInMessage =
            `*Attention Titans*\n` +
            `@all This is your daily reminder to clock-in. Please ensure you clock in and if you are unable to clock in send an email to time@infi-dau7.com immediately.  Thank you!`;

        await this.sendMessage(roomId, clockInMessage);
    }

    // <-- First half ends here; second half (all remaining methods, startAutomation, invocation) follows. -->
    async getOrCreateDirectMessageRoom(username) {
        try {
            const res = await axios.post(
                `${this.serverUrl}/api/v1/im.create`,
                { username },
                {
                    headers: {
                        'X-Auth-Token': this.authToken,
                        'X-User-Id': this.userId
                    }
                }
            );
            return res.data.room._id;
        } catch (error) {
            console.error(`❌ Failed to get/create DM room with ${username}:`, error.response?.data?.message || error.message);
            return null;
        }
    }

    async sendImmediateMessageToDanny() {
        if (!this.authToken || !this.userId) {
            if (!(await this.authenticate())) return;
        }
        const dannyRoomId = await this.getOrCreateDirectMessageRoom(this.dannyUsername);
        if (!dannyRoomId) return;
        const immediateMessage =
            `✅ Safety Automation Deployed Successfully.\n` +
            `This is your immediate test message, Danny.`;
        await this.sendMessage(dannyRoomId, immediateMessage);
    }

    async sendFridayTimecardReminder() {
        if (!this.authToken || !this.userId) {
            if (!(await this.authenticate())) return;
        }
        const res = await axios.get(
            `${this.serverUrl}/api/v1/rooms.info?roomName=general`,
            { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
        );
        const roomId = res.data.room._id;
        const message =
          `@all *Attention Titans*\n` +
          `Here's your reminder for you to check and ensure your timecard is accurate.  ` +
          `If it's not accurate or you missed a timecard punch please send an email to time@infi-dau7.com and follow this format when sending the email:\n\n` +
          `Date:\nClock in:\nLunch out:\nLunch in:\nClock out:\n\n` +
          `*DO NOT USE ADP TO CORRECT YOUR TIMECARD THAT FEATURE DOES NOT WORK*`;
        await this.sendMessage(roomId, message);
    }

    async sendSaturdayTimecardReminder() {
        if (!this.authToken || !this.userId) {
            if (!(await this.authenticate())) return;
        }
        const res = await axios.get(
            `${this.serverUrl}/api/v1/rooms.info?roomName=general`,
            { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
        );
        const roomId = res.data.room._id;
        const message =
          `@all *Final Reminder*\n` +
          `Did you remember to check your timecard? If you haven't now's the time to do so.  ` +
          `All timecard corrections should be sent in no later than midnight tonight.  ` +
          `If you need corrections please send an email to time@infi-dau7.com in this format:\n\n` +
          `Date:\nClock in:\nLunch out:\nLunch in:\nClock out:\n\n` +
          `*DO NOT USE ADP TO CORRECT YOUR TIMECARD THAT FEATURE DOES NOT WORK*`;
        await this.sendMessage(roomId, message);
    }

    async sendLunchReminderMessage() {
        if (!this.authToken || !this.userId) {
            if (!(await this.authenticate())) return;
        }
        const roomName = this.getCurrentRoomName();
        const roomId = await this.checkRoomExists(roomName);
        if (!roomId || !this.isRoomForToday(roomName)) return;
        const lunchReminderMessage =
            `@all 🍽️ Titans! It's Lunch Time! 🕒\n\n` +
            `Just a quick reminder — lunches are mandatory and must be exactly 30 minutes. ⏳\n` +
            `➡️ No more, no less.\n` +
            `❌ You cannot combine lunch with your breaks.\n` +
            `🚗 Travel time to and from your lunch spot counts as part of your 30-minute lunch.\n\n` +
            `Don’t forget to hit that Break button in the Flex app before you dig in! ✅\n` +
            `Enjoy your lunch and recharge! 💪🥗🍔`;
        await this.sendMessage(roomId, lunchReminderMessage);
    }

    async sendDeliveryCountdownReminder1130() {
        const roomName = this.getCurrentRoomName();
        const roomId = await this.checkRoomExists(roomName);
        if (!roomId || !this.isRoomForToday(roomName)) return;
        const message = `@all *Attention Titans!*\n\nYou have 7 hours and 0 minutes left in your delivery day. Ensure you are keeping a great pace and complete all deliveries before 6:30pm to avoid breaking our promise. You got this! 💪`;
        await this.sendMessage(roomId, message);
    }

    async sendDeliveryCountdownReminder1330() {
        const roomName = this.getCurrentRoomName();
        const roomId = await this.checkRoomExists(roomName);
        if (!roomId || !this.isRoomForToday(roomName)) return;
        const message = `@all *Attention Titans!*\n\nYou have 5 hours and 0 minutes left in your delivery day. Keep up the pace! 💪`;
        await this.sendMessage(roomId, message);
    }

    async sendDeliveryCountdownReminder1530() {
        const roomName = this.getCurrentRoomName();
        const roomId = await this.checkRoomExists(roomName);
        if (!roomId || !this.isRoomForToday(roomName)) return;
        const message = `@all *Attention Titans!*\n\nYou have 3 hours and 0 minutes left in your delivery day. Let’s finish strong! 💪`;
        await this.sendMessage(roomId, message);
    }

    async sendDeliveryCountdownReminder1730() {
        const roomName = this.getCurrentRoomName();
        const roomId = await this.checkRoomExists(roomName);
        if (!roomId || !this.isRoomForToday(roomName)) return;
        const message = `@all *Attention Titans!* Last hour remaining! 💥 Let’s push through and complete the delivery day safely! 💪`;
        await this.sendMessage(roomId, message);
    }

    async sendImageReminder(imageName) {
        const roomName = this.getCurrentRoomName();
        const roomId = await this.checkRoomExists(roomName);
        if (!roomId || !this.isRoomForToday(roomName)) return;
        const imagePath = path.join(__dirname, 'images', imageName);
        const imageStream = fs.createReadStream(imagePath);
        const imageStats = fs.statSync(imagePath);
        const form = new (require('form-data'))();
        form.append('file', imageStream, {
            knownLength: imageStats.size,
            filename: imageName,
        });
        form.append('roomId', roomId);
        await axios.post(
            `${this.serverUrl}/api/v1/rooms.upload`,
            form,
            {
                headers: {
                    'X-Auth-Token': this.authToken,
                    'X-User-Id': this.userId,
                    ...form.getHeaders(),
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            }
        );
    }

    async sendRandomImageReminder() {
        const images = ['dogs.jpg', 'leadwithsafety.jpg', 'stopsigns.jpg'];
        const usedToday = this.state.usedImages?.[this.getToday()] || [];
        const remaining = images.filter(img => !usedToday.includes(img));
        if (!remaining.length) return;
        const chosen = remaining[Math.floor(Math.random() * remaining.length)];
        await this.sendImageReminder(chosen);
        this.state.usedImages = this.state.usedImages || {};
        this.state.usedImages[this.getToday()] = this.state.usedImages[this.getToday()] || [];
        this.state.usedImages[this.getToday()].push(chosen);
        this.saveState();
    }

    getToday() {
        return DateTime.now().setZone('America/Chicago').toFormat('yyyy-MM-dd');
    }

    // New RTS reminder at 6pm
    async sendRtsReminderMessage() {
        if (!this.authToken || !this.userId) {
            if (!(await this.authenticate())) return;
        }
        const roomName = this.getCurrentRoomName();
        const roomId = await this.checkRoomExists(roomName);
        if (!roomId || !this.isRoomForToday(roomName)) return;
        const message =
            `:pushpin: RTS Reminders  :pushpin: @all\n\n` +
            `*Before you RTS*  :arrow_down:\n` +
            `🔎 Check your van for any missorts or missing packages 📦 before you RTS. Missing packages must be reattempted, and missorts must be delivered if they are within a 15-minute radius.\n\n` +
            `*Parking at Station*  :blue_car:\n` +
            `Clean out your van! Take your trash🗑, wipe it down  :sponge:, and sweep it out. 🧹 You may not be in the same van tomorrow. Do not leave your mess for someone else.  :do_not_litter:\n\n` +
            `*Equipment turn in*  :bulb:\n` +
            `When you turn in your bag at the end of the night, check it thoroughly. Ensure the work device 📱, gas card 💳, keys 🔑, and portable charger 🔋 are inside. Remember to wait the full 2 minutes for your post trip on standard vehicles and 3 minutes on step vans, and be certain you've clocked out before leaving.  :clock8:`;
        await this.sendMessage(roomId, message);
    }

    startAutomation() {
        console.log('🚀 Starting Infinite Delivery OPS Automation');
        // Safety: every 30 min 10am–7:30pm CT
        cron.schedule('0,30 10-19 * * *', () => this.sendSafetyMessage(), { timezone: 'America/Chicago' });
        // Hydration: hourly 10am–6pm CT May–Sep
        cron.schedule('0 10-18 * 5-9 *', () => this.sendHydrationMessage(), { timezone: 'America/Chicago' });
        // Heat: daily 9am CT May–Sep
        cron.schedule('0 9 * 5-9 *', () => this.sendHeatReminderMessage(), { timezone: 'America/Chicago' });
        // Clock-in: daily 9:25am CT
        cron.schedule('25 9 * * *', () => this.sendClockInReminderMessage(), { timezone: 'America/Chicago' });
        // Friday timecard: Fri 8am CT
        cron.schedule('0 8 * * 5', () => this.sendFridayTimecardReminder(), { timezone: 'America/Chicago' });
        // Saturday timecard: Sat 5pm CT
        cron.schedule('0 17 * * 6', () => this.sendSaturdayTimecardReminder(), { timezone: 'America/Chicago' });
        // Lunch: daily 2pm CT
        cron.schedule('0 14 * * *', () => this.sendLunchReminderMessage(), { timezone: 'America/Chicago' });
        // Delivery countdowns
        cron.schedule('30 11 * * *', () => this.sendDeliveryCountdownReminder1130(), { timezone: 'America/Chicago' });
        cron.schedule('30 13 * * *', () => this.sendDeliveryCountdownReminder1330(), { timezone: 'America/Chicago' });
        cron.schedule('30 15 * * *', () => this.sendDeliveryCountdownReminder1530(), { timezone: 'America/Chicago' });
        cron.schedule('30 17 * * *', () => this.sendDeliveryCountdownReminder1730(), { timezone: 'America/Chicago' });
        // Random images: 10:15, 12:15, 3:15 CT
        cron.schedule('15 10 * * *', () => this.sendRandomImageReminder(), { timezone: 'America/Chicago' });
        cron.schedule('15 12 * * *', () => this.sendRandomImageReminder(), { timezone: 'America/Chicago' });
        cron.schedule('15 15 * * *', () => this.sendRandomImageReminder(), { timezone: 'America/Chicago' });
        // RTS reminder: daily 6pm CT
        cron.schedule('0 18 * * *', () => this.sendRtsReminderMessage(), { timezone: 'America/Chicago' });

        // Immediate test
        this.sendImmediateMessageToDanny();
    }

    stopAutomation() {
        cron.getTasks().forEach(task => task.stop());
        console.log('⏹️ All scheduled tasks stopped');
    }
}

(async () => {
    const automation = new RocketChatAutomation(
        process.env.ROCKET_CHAT_SERVER_URL,
        process.env.ROCKET_CHAT_USERNAME,
        process.env.ROCKET_CHAT_PASSWORD,
        process.env.DANNY_USERNAME
    );
    automation.startAutomation();
})();
