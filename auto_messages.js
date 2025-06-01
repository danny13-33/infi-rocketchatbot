require('dotenv').config();
const axios = require('axios');
const cron = require('node-cron');
const { DateTime } = require('luxon');

class RocketChatAutomation {
    constructor(serverUrl, username, password, dannyUsername) {
        this.serverUrl = serverUrl.replace(/\/$/, '');
        this.username = username;
        this.password = password;
        this.dannyUsername = dannyUsername;
        this.authToken = null;
        this.userId = null;
        this.messageIndex = 0;
        this.scheduledTask = null;

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

            `Amazon is not playing with Safety any longer. Any Severe Infractions will suspend your account immediately while on route. If that occurs there’s nothing we can do other than send you back to station and take immediate disciplinary action including termination. Ensure you are adhering to all Safety measures and if you see a yellow light be prepared to STOP.`,

            `:truck: *Watch your FOLLOWING DISTANCE Titans!*  
            You should be AT LEAST 3 van lengths behind the vehicle in front of you.  
            This can increase depending on road conditions, your speed, and the weather.  
            :construction: :motorway: :cloud_rain:  
            Even if you are cut off, then you must take defensive action by slowing down. Let off the accelerator and apply the brake if needed to create distance.  
            *PAY ATTENTION When you are changing lanes and merging. Following distance still applies!*  

            Please remember to leave plenty of space in between you and the vehicle in front of you. Increasing the distance between you and the car ahead can give you the time you need to recognize a hazard, should one enter your path, and respond safely.  
            Keep at least an 8-second (3 car) distance between you and the vehicle in front of you. Slow down to give space when drivers merge. If another driver cuts you off, slow down to create distance.`,

            `:no_entry_sign: *NO PET ENGAGEMENT*  
            There is a strict no pet engagement policy. It doesn't matter the size or breed of the animal, PLEASE leave them alone. If there is an animal present & the customer has not already restrained them, conduct Contact Compliance.`,

            `If you see a dog or signs of a dog at a delivery location, you can request that the paw print icon be added by navigating to the ‘Help’ page in the Delivery App and selecting ‘Report a dog on your route.’`,

            `To avoid dog bites: If you see a dog present, mark it as unable to deliver due to the dog and then follow contact compliance (CC). Never get out of the van if you see a dog loose.`,

            `Before you start walking to your destination, look at where you will be placing your feet. Don't jump in and out of the vans. Your legs are not designed to absorb incredible impact over and over. Use all of the steps available to you and try to maintain 3 points of contact.  
            Rushing is when you make the most mistakes. Slow is smooth, smooth is fast. Find your groove and stick with it.`,

            `On days where moisture is high, we are also at high risk for slips, trips and falls. Three points of contact when getting out of the vans and be highly familiar with your pathing today. Being safe on the road is something you are all extremely capable of doing, please do it!`,

            `Wearing a seatbelt is one of the best things you can do to protect yourself when driving. Remember to always wear your seatbelt correctly — across your chest and waist. Never sit on your seatbelt when it is buckled.  
            If you feel your seatbelt is not working properly, post your concern in the van issues chat & let one of the members of Management know.  
            No vehicle should be on the road with a faulty seatbelt.  

            Remember to always wear your seatbelt when the vehicle is moving and only use your device when the vehicle is sitting still! Watch your speeds and let's have a great day today!`,

            `:truck: :dash: :dash: *Speeding*  
            Speeding is one of the most common causes of accidents on the road.  
            If you are not sure of what the speed limit is, you should proceed with caution and operate at a speed that is typical for the road type and location (e.g., 25–30 mph in a neighborhood).  
            Be on the lookout for road signs indicating speed limit changes, as speeding violations are easy to avoid.  
            *Don't go off of what GPS tells you. Go off what the SIGNS say, because that is what the camera sees!*`,

            `Make sure you keep an eye on your speed while delivering today! If you're in doubt about what the speed limit is, drive slower than you think it is. Always follow signs over what the GPS says the limit is. Let's keep today safe and finish strong.`,

            `Water is very important to your body's health. Hydration should be a top priority every time you know that you are scheduled to come in. Come to work hydrated with plenty of supplies so you can avoid suffering from dehydration while you are out on your route.`,

            `Please ensure that you are arriving to work hydrated with adequate water supply. There may be some water out on the pads, but understand that bringing water to work is your responsibility.  
            Amazon does run out of water from time to time. If you don't arrive hydrated along with bringing adequate water supplies, you have essentially set yourself up to be a victim of dehydration.  
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

            `TITANS, at no point throughout your route should you be delivering with ANY door (driver side, sliding, or back door) open.  
            This is one of the most unsafe practices you can do while delivering. Someone can hop inside or take packages from your vehicle. Also, packages can fall out without you noticing.`,

            `Being vigilant is one of many important skills you can utilize while you are on route.  
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

            `Friendly reminder to be absolutely critical with your ability to make decisions while on the road, especially when navigating through blind spots.  
            If you are merging then look at the side view mirrors and lean forward to get a different perspective.  
            If you are putting the van in reverse then use the mirrors, the camera, AND Get Out And Look.`
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

    async getRoomIdByName(roomName) {
        try {
            const response = await axios.get(`${this.serverUrl}/api/v1/rooms.get`, {
                headers: {
                    'X-Auth-Token': this.authToken,
                    'X-User-Id': this.userId
                }
            });

            const room = response.data.update.find(r => r.name === roomName);
            return room ? room._id : null;
        } catch (error) {
            console.error('❌ Failed to fetch rooms:', error.response?.data?.message || error.message);
            return null;
        }
    }

    async sendMessage(roomId, message) {
        try {
            await axios.post(`${this.serverUrl}/api/v1/chat.postMessage`, {
                roomId,
                text: message
            }, {
                headers: {
                    'X-Auth-Token': this.authToken,
                    'X-User-Id': this.userId
                }
            });

            console.log(`✅ Message sent to room ID ${roomId}`);
        } catch (error) {
            console.error('❌ Failed to send message:', error.response?.data?.message || error.message);
        }
    }

    async sendNextSafetyMessage() {
        const roomName = this.getCurrentRoomName();
        const roomId = await this.getRoomIdByName(roomName);
        if (!roomId) {
            console.error(`❌ Could not find room "${roomName}"`);
            return;
        }

        const message = this.safetyMessages[this.messageIndex];
        await this.sendMessage(roomId, message);

        this.messageIndex = (this.messageIndex + 1) % this.safetyMessages.length;
    }

    async startDailyMessageScheduler(time = '08:00') {
        const authenticated = await this.authenticate();
        if (!authenticated) return;

        if (this.scheduledTask) {
            this.scheduledTask.stop();
        }

        this.scheduledTask = cron.schedule(`0 ${time.split(':')[1]} ${time.split(':')[0]} * * *`, async () => {
            console.log('🕗 Sending daily safety message...');
            await this.sendNextSafetyMessage();
        }, {
            scheduled: true,
            timezone: "America/Chicago"
        });

        console.log(`🗓️ Daily message scheduler started at ${time} CST`);
    }
}

// Example usage:
const automation = new RocketChatAutomation(
    process.env.ROCKETCHAT_URL,
    process.env.ROCKETCHAT_USERNAME,
    process.env.ROCKETCHAT_PASSWORD,
    process.env.DANNY_USERNAME
);

automation.startDailyMessageScheduler('08:00'); // Sends at 8:00 AM CST
