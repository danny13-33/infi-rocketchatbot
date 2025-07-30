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

    // Scheduled tasks
    this.scheduledSafetyTask = null;
    this.scheduledHydrationTask = null;
    this.scheduledHeatReminderTask = null;
    this.scheduledFridayTask = null;
    this.scheduledSaturdayTask = null;
    this.scheduledClockInTask = null;
    this.scheduledLunchReminderTask = null;
    this.scheduledDeliveryCountdown1130 = null;
    this.scheduledDeliveryCountdown1330 = null;
    this.scheduledDeliveryCountdown1530 = null;
    this.scheduledDeliveryCountdown1730 = null;
    this.scheduledImageUpload1 = null;
    this.scheduledImageUpload2 = null;
    this.scheduledImageUpload3 = null;

    // All safety messages in full
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

      `:leg: :eyes: Before you start walking to your destination, look at where you will be placing your feet. Don't jump in and out of the vans. Your legs are not designed to absorb incredible impact over and over. Use all of the steps available to you and try to maintain 3 points of contact. :raised_hand:  
Rushing is when you make the most mistakes. Slow is smooth, smooth is fast. Find your groove and stick with it.`,

      `:exclamation:  :cloud_rain: On days where moisture is high, we are also at high risk for slips, trips and falls. Three points of contact when getting out of the vans and be highly familiar with your pathing today. Being safe on the road is something you are all extremely capable of doing, please do it!`,

      `:running_shirt_with_sash: Wearing a seatbelt is one of the safest things you can do to protect yourself when driving. Remember to always wear your seatbelt correctly — across your chest and waist. Never sit on your seatbelt when it is buckled.

If you feel your seatbelt is not working properly, post your concern in the #on_road_van_issues chat & let one of the members of Management know.

No vehicle should be on the road with a faulty seatbelt.

:point_right: Remember to always wear your seatbelt when the vehicle is moving and only use your device when the vehicle is sitting still!  
:point_left: Watch your speeds and let's have a great day today!`,

      `:truck: :dash: :dash: *Speeding*  
Speeding is one of the most common causes of accidents on the road.  
If you are not sure of what the speed limit is, you should proceed with caution and operate at a speed that is typical for the road type and location (e.g., 25–30 mph in a neighborhood).  
Be on the lookout for road signs indicating speed limit changes, as speeding violations are easy to avoid.  
             
*Don't go off of what GPS tells you. Go off what the SIGNS say, because that is what the camera sees!*`,

      `:truck: :dash: :eyes: *Make sure you keep an eye on your speed while delivering today!*  
If you're in doubt about what the speed limit is, drive slower than you think it is. Always follow signs over what the GPS says the limit is. Let's keep today safe and finish Strong.`,

      `Water is very important to your body's health. Hydration should be a top priority every time you know that you are scheduled to come in. Come to work hydrated with plenty of supplies so you can avoid suffering from dehydration while you are out on your route.`,

      `:droplet: Please ensure that you are arriving to work hydrated with adequate water supply. There may be some water out on the pads, but understand that bringing water to work is your responsibility.

Amazon does run out of water from time to time. If you don't arrive hydrated along with bringing adequate water supplies, you have essentially set yourself up to be a victim of dehydration.

*If there is water on the pad, please be considerate of others.*`,

      `:stop_sign: *Stop Signs* :stop_sign:  
Come to a complete stop at all stop signs. Stop signs are placed at intersections to protect both you & others from avoidable crashes. Can't see if any oncoming traffic is coming from where the sign is placed?  
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
☕️❌ _Caffeine_ – Avoid caffeine as it dehydrates you. Choose natural energy sources like fruits and vegetables.  
🍎 _Diet_ – Eat light snacks during the day. Heavy breakfasts may weigh you down.  
😴 _Rest_ – Get enough sleep before work. Avoid dozing off behind the wheel.  
☝️ _Recovery_ – Don’t rely solely on meds like Ibuprofen. Recover with hydration, good food, and rest.

Practice these the day of and the night before coming into work to prevent heat-related illness.`,

      `:exclamation: :world_map: :eyes:  
Friendly reminder to be absolutely critical with your ability to make decisions while on the road, especially when navigating through blind spots.

If you are merging then look at the side view mirrors and lean forward to get a different perspective.

If you are putting the van in reverse then use the mirrors, the camera, AND Get Out And Look.`,

      `📌 Reminder: Try to avoid reversing whenever possible. If you must reverse, do not exceed 5 MPH — this triggers Netradyne alerts and, more importantly, helps keep you and others safe. 🚸

Also, avoid parking on driveways. If you can see the front door from the street, there’s no need to pull into someone’s property. 🏠

Let’s stay safe and smart out there!`
    ];

    // State for shuffle
    this.state = { date: null, order: [], index: 0 };
    this.dailyOrder = [];
    this.messageIndex = 0;
    this.loadOrInitState();
  }

  loadOrInitState() {
    const today = DateTime.now().setZone('America/Chicago').toISODate();
    let persisted = null;
    if (fs.existsSync(STATE_PATH)) {
      try {
        persisted = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
      } catch {}
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
      this.dailyOrder = Array.from({ length: count }, (_, i) => i)
        .sort(() => Math.random() - 0.5);
      this.messageIndex = 0;
      this.state = { date: today, order: this.dailyOrder, index: 0 };
      this.saveState();
    }
  }

  saveState() {
    try {
      fs.writeFileSync(STATE_PATH, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (err) {
      console.error('❌ Failed to write state file:', err);
    }
  }

  async authenticate() {
    try {
      const res = await axios.post(`${this.serverUrl}/api/v1/login`, {
        user: this.username,
        password: this.password
      });
      this.authToken = res.data.data.authToken;
      this.userId = res.data.data.userId;
      console.log('✅ Authenticated');
      return true;
    } catch (err) {
      console.error('❌ Auth failed:', err.response?.data?.message || err.message);
      return false;
    }
  }

  getCurrentRoomName() {
    const date = DateTime.now().setZone('America/Chicago').toISODate();
    return `daily-${date}`;
  }

  async checkRoomExists(roomName) {
    console.log(`🔍 Checking room "${roomName}"`);
    try {
      const res = await axios.get(
        `${this.serverUrl}/api/v1/rooms.info?roomName=${encodeURIComponent(roomName)}`,
        { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
      );
      console.log('✅ Room exists:', res.data.room._id);
      return res.data.room._id;
    } catch (err) {
      if (err.response?.status === 400) {
        console.warn('⚠️ Room not found');
        return null;
      }
      console.error('❌ Error fetching room:', err);
      throw err;
    }
  }

  async createRoom(roomName) {
    console.log(`✳️ Creating room "${roomName}"`);
    const res = await axios.post(
      `${this.serverUrl}/api/v1/channels.create`,
      { name: roomName, readOnly: false },
      { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
    );
    return res.data.channel._id;
  }

  getNextSafetyMessage() {
    const idx = this.dailyOrder[this.messageIndex++];
    this.state.index = this.messageIndex;
    this.saveState();
    return this.safetyMessages[idx];
  }

  async sendMessage(roomId, text) {
    try {
      await axios.post(
        `${this.serverUrl}/api/v1/chat.postMessage`,
        { roomId, text },
        { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
      );
      console.log('📤 Sent message:', text.slice(0, 40));
    } catch (err) {
      console.error('❌ Send failed:', err.response?.data?.message || err.message);
    }
  }

  async sendSafetyMessage() {
    if (!await this.ensureAuth()) return;
    const roomName = this.getCurrentRoomName();
    let roomId = await this.checkRoomExists(roomName);
    if (!roomId) roomId = await this.createRoom(roomName);
    const msg = this.getNextSafetyMessage();
    await this.sendMessage(roomId, msg);
  }

  async sendHydrationMessage() {
    if (!await this.ensureAuth()) return;
    const month = DateTime.now().setZone('America/Chicago').month;
    if (month < 5 || month > 9) return;
    const roomName = this.getCurrentRoomName();
    let roomId = await this.checkRoomExists(roomName);
    if (!roomId) return;
    await this.sendMessage(
      roomId,
      `🌊 HYDRATE HYDRATE HYDRATE 🌊\nDrink water now! Stay ahead of the Texas heat.`
    );
  }

  async sendHeatReminderMessage() {
    if (!await this.ensureAuth()) return;
    const month = DateTime.now().setZone('America/Chicago').month;
    if (month < 5 || month > 9) return;
    const roomName = this.getCurrentRoomName();
    let roomId = await this.checkRoomExists(roomName);
    if (!roomId) return;
    await this.sendMessage(
      roomId,
      `@all ⚠️ Titans! Knock out half your route by 2 PM to beat the heat. Stay safe! 💪🔥`
    );
  }

  async sendClockInReminderMessage() {
    if (!await this.ensureAuth()) return;
    const roomName = this.getCurrentRoomName();
    let roomId = await this.checkRoomExists(roomName);
    if (!roomId) return;
    await this.sendMessage(
      roomId,
      `@all *Reminder:* Please clock-in now or email time@infi-dau7.com if you cannot.`
    );
  }

  async sendFridayTimecardReminder() {
    if (!await this.ensureAuth()) return;
    const res = await axios.get(
      `${this.serverUrl}/api/v1/rooms.info?roomName=general`,
      { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
    );
    await this.sendMessage(
      res.data.room._id,
      `@all *Friday Reminder:* Verify your timecard. If corrections needed, email time@infi-dau7.com with Date, Clock in/out, Lunch times.`
    );
  }

  async sendSaturdayTimecardReminder() {
    if (!await this.ensureAuth()) return;
    const res = await axios.get(
      `${this.serverUrl}/api/v1/rooms.info?roomName=general`,
      { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
    );
    await this.sendMessage(
      res.data.room._id,
      `@all *Final Reminder:* Last call to correct your timecard by midnight tonight. Email time@infi-dau7.com.`
    );
  }

  async sendLunchReminderMessage() {
    if (!await this.ensureAuth()) return;
    const roomName = this.getCurrentRoomName();
    let roomId = await this.checkRoomExists(roomName);
    if (!roomId) return;
    await this.sendMessage(
      roomId,
      `@all 🍽️ It's Lunch Time! Must be exactly 30 minutes. Hit Break in Flex app. Enjoy! 💪🥗🍔`
    );
  }

  async sendDeliveryCountdownReminder1130() {
    if (!await this.ensureAuth()) return;
    const roomName = this.getCurrentRoomName();
    let roomId = await this.checkRoomExists(roomName);
    if (!roomId) return;
    await this.sendMessage(
      roomId,
      `@all *7h remaining!* Keep up the pace to finish before 6:30 PM. You got this! 💪`
    );
  }

  async sendDeliveryCountdownReminder1330() {
    if (!await this.ensureAuth()) return;
    const roomName = this.getCurrentRoomName();
    let roomId = await this.checkRoomExists(roomName);
    if (!roomId) return;
    await this.sendMessage(
      roomId,
      `@all *5h remaining!* Keep pushing to complete before 6:30 PM. 💪`
    );
  }

  async sendDeliveryCountdownReminder1530() {
    if (!await this.ensureAuth()) return;
    const roomName = this.getCurrentRoomName();
    let roomId = await this.checkRoomExists(roomName);
    if (!roomId) return;
    await this.sendMessage(
      roomId,
      `@all *3h remaining!* Maintain your pace and finish strong! 💪`
    );
  }

  async sendDeliveryCountdownReminder1730() {
    if (!await this.ensureAuth()) return;
    const roomName = this.getCurrentRoomName();
    let roomId = await this.checkRoomExists(roomName);
    if (!roomId) return;
    await this.sendMessage(
      roomId,
      `@all *1h remaining!* Last push—complete safely! 💥💪`
    );
  }

  async sendRandomImageReminder() {
    if (!await this.ensureAuth()) return;
    const images = ['dogs.jpg','leadwithsafety.jpg','stopsigns.jpg'];
    const today = DateTime.now().setZone('America/Chicago').toISODate();
    this.state.usedImages = this.state.usedImages||{};
    this.state.usedImages[today] = this.state.usedImages[today]||[];
    const remaining = images.filter(i=>!this.state.usedImages[today].includes(i));
    if (!remaining.length) return;
    const chosen = remaining[Math.floor(Math.random()*remaining.length)];
    await this.uploadImageToDailyRoom(chosen);
    this.state.usedImages[today].push(chosen);
    this.saveState();
  }

  async uploadImageToDailyRoom(imageName) {
    const roomName = this.getCurrentRoomName();
    let roomId = await this.checkRoomExists(roomName);
    if (!roomId) return;
    const imagePath = path.join(__dirname,'images',imageName);
    const form = new FormData();
    form.append('file', fs.createReadStream(imagePath));
    form.append('roomId', roomId);
    await axios.post(`${this.serverUrl}/api/v1/rooms.upload`, form, {
      headers: {
        ...form.getHeaders(),
        'X-Auth-Token': this.authToken,
        'X-User-Id': this.userId
      }
    });
    console.log(`📸 Uploaded ${imageName}`);
  }

  async ensureAuth() {
    if (!this.authToken || !this.userId) {
      return await this.authenticate();
    }
    return true;
  }

  startAutomation() {
    // Immediate DM to Danny
    this.authenticate().then(() => {
      this.getOrCreateDirectMessageRoom(this.dannyUsername).then(dmId => {
        if (dmId) this.sendMessage(dmId, '✅ Safety Automation Deployed Successfully. Test message.');
      });
    });

    // Safety every 30m 10–19
    this.scheduledSafetyTask = cron.schedule('0,30 10-19 * * *', ()=>this.sendSafetyMessage(),{timezone:'America/Chicago'});
    // Hydration hourly 10–18 May–Sep
    this.scheduledHydrationTask = cron.schedule('0 10-18 * 5-9 *', ()=>this.sendHydrationMessage(),{timezone:'America/Chicago'});
    // Heat daily 9am May–Sep
    this.scheduledHeatReminderTask = cron.schedule('0 9 * 5-9 *', ()=>this.sendHeatReminderMessage(),{timezone:'America/Chicago'});
    // Clock-in 9:25 daily
    this.scheduledClockInTask = cron.schedule('25 9 * * *', ()=>this.sendClockInReminderMessage(),{timezone:'America/Chicago'});
    // Friday 8am timecard
    this.scheduledFridayTask = cron.schedule('0 8 * * 5', ()=>this.sendFridayTimecardReminder(),{timezone:'America/Chicago'});
    // Saturday 5pm final timecard
    this.scheduledSaturdayTask = cron.schedule('0 17 * * 6', ()=>this.sendSaturdayTimecardReminder(),{timezone:'America/Chicago'});
    // Lunch 2pm
    this.scheduledLunchReminderTask = cron.schedule('0 14 * * *', ()=>this.sendLunchReminderMessage(),{timezone:'America/Chicago'});
    // Delivery countdowns
    this.scheduledDeliveryCountdown1130 = cron.schedule('30 11 * * *', ()=>this.sendDeliveryCountdownReminder1130(),{timezone:'America/Chicago'});
    this.scheduledDeliveryCountdown1330 = cron.schedule('30 13 * * *', ()=>this.sendDeliveryCountdownReminder1330(),{timezone:'America/Chicago'});
    this.scheduledDeliveryCountdown1530 = cron.schedule('30 15 * * *', ()=>this.sendDeliveryCountdownReminder1530(),{timezone:'America/Chicago'});
    this.scheduledDeliveryCountdown1730 = cron.schedule('30 17 * * *', ()=>this.sendDeliveryCountdownReminder1730(),{timezone:'America/Chicago'});
    // Image uploads
    this.scheduledImageUpload1 = cron.schedule('15 10 * * *', ()=>this.sendRandomImageReminder(),{timezone:'America/Chicago'});
    this.scheduledImageUpload2 = cron.schedule('15 12 * * *', ()=>this.sendRandomImageReminder(),{timezone:'America/Chicago'});
    this.scheduledImageUpload3 = cron.schedule('15 15 * * *', ()=>this.sendRandomImageReminder(),{timezone:'America/Chicago'});
  }
}

(async()=>{
  const bot = new RocketChatAutomation(
    process.env.ROCKET_CHAT_SERVER_URL,
    process.env.ROCKET_CHAT_USERNAME,
    process.env.ROCKET_CHAT_PASSWORD,
    process.env.DANNY_USERNAME
  );
  bot.startAutomation();
})();
