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

    // --- FULL LIST OF SAFETY MESSAGES ---
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

      `Keep an eye out for stop signs! You must come to a complete stop at all stop signs, this means pressing the brake completely until the van is no longer moving. Any motion before continuing will cause an alert!`
    ];

    //--- STATE TRACKING FOR SAFETY QUEUE & IMAGES ---
    this.state = { date: null, order: [], index: 0, usedImages: {} };
    this.dailyOrder = [];
    this.loadOrInitState();
  }

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
    } else {
      // shuffle
      const n = this.safetyMessages.length;
      const arr = Array.from({ length: n }, (_, i) => i);
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      this.dailyOrder = arr;
      this.state = { date: today, order: arr, index: 0, usedImages: {} };
      fs.writeFileSync(STATE_PATH, JSON.stringify(this.state, null, 2));
    }
  }

  // ... Part 2 continues with getNextSafetyMessage(), sendSafetyMessage(), etc.
  saveState() {
    try {
      fs.writeFileSync(STATE_PATH, JSON.stringify(this.state, null, 2));
    } catch (err) {
      console.error('❌ Failed to write state file:', err);
    }
  }

  getNextSafetyMessage() {
    const today = DateTime.now().setZone('America/Chicago').toISODate();
    if (this.state.date !== today) {
      this.loadOrInitState();
    }
    const idx = this.dailyOrder[this.state.index];
    const msg = this.safetyMessages[idx];
    this.state.index = (this.state.index + 1) % this.dailyOrder.length;
    this.saveState();
    return msg;
  }

  async authenticate() {
    if (this.authToken && this.userId) return true;
    try {
      const res = await axios.post(
        `${this.serverUrl}/api/v1/login`,
        { user: this.username, password: this.password }
      );
      this.authToken = res.data.data.authToken;
      this.userId    = res.data.data.userId;
      console.log('✅ Authenticated');
      return true;
    } catch (e) {
      console.error('❌ Auth failed:', e.response?.data || e.message);
      return false;
    }
  }

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

  async createRoom(roomName) {
    try {
      const res = await axios.post(
        `${this.serverUrl}/api/v1/channels.create`,
        { name: roomName, readOnly: false },
        { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
      );
      return res.data.channel._id;
    } catch (e) {
      console.error('❌ Room create failed:', e.response?.data || e.message);
      return null;
    }
  }

  isBusinessHours() {
    const now = DateTime.now().setZone('America/Chicago');
    const mins = now.hour * 60 + now.minute;
    return mins >= 10 * 60 && mins <= 19 * 60 + 30;
  }

  getCurrentRoomName() {
    const now = DateTime.now().setZone('America/Chicago');
    const suffix = d => (d>=11&&d<=13?'th':{1:'st',2:'nd',3:'rd'}[d%10]||'th');
    return `${now.monthLong}-${now.day}${suffix(now.day)}-${now.year}`;
  }

  async sendSafetyMessage() {
    if (!this.isBusinessHours()) return;
    if (!(await this.authenticate())) return;
    const roomName = this.getCurrentRoomName();
    let roomId = await this.checkRoomExists(roomName);
    if (!roomId) roomId = await this.createRoom(roomName);
    if (!roomId) return;
    const text = this.getNextSafetyMessage();
    await axios.post(
      `${this.serverUrl}/api/v1/chat.postMessage`,
      { roomId, text },
      { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
    );
    console.log('🚒 Safety msg sent');
  }

  async sendHydrationMessage() {
    const m = DateTime.now().setZone('America/Chicago').month;
    if (m < 5 || m > 9) return;
    if (!(await this.authenticate())) return;
    const roomName = this.getCurrentRoomName();
    const roomId   = await this.checkRoomExists(roomName);
    if (!roomId) return;
    await axios.post(
      `${this.serverUrl}/api/v1/chat.postMessage`,
      {
        roomId,
        text: `🌊 HYDRATE 🌊\nIf you see this, drink water now! Stay ahead of the Texas heat.`
      },
      { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
    );
    console.log('💧 Hydration msg sent');
  }

  async sendHeatReminderMessage() {
    const m = DateTime.now().setZone('America/Chicago').month;
    if (m < 5 || m > 9) return;
    if (!(await this.authenticate())) return;
    const roomName = this.getCurrentRoomName();
    const roomId   = await this.checkRoomExists(roomName);
    if (!roomId) return;
    const text = [
      `@all ⚠️ Attention Titans! ⚠️`,
      `Knock out half your route by 2 PM to beat the worst heat.`,
      `Stay safe out there! 💪🔥`
    ].join('\n\n');
    await axios.post(
      `${this.serverUrl}/api/v1/chat.postMessage`,
      { roomId, text },
      { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
    );
    console.log('🔥 Heat reminder sent');
  }

  async sendClockInReminderMessage() {
    if (!(await this.authenticate())) return;
    const roomName = this.getCurrentRoomName();
    let roomId = await this.checkRoomExists(roomName);
    if (!roomId) roomId = await this.createRoom(roomName);
    if (!roomId) return;
    const text = `*Attention Titans*\n@all Remember to clock‑in now or email time@infi‑dau7.com if you can’t.`;
    await axios.post(
      `${this.serverUrl}/api/v1/chat.postMessage`,
      { roomId, text },
      { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
    );
    console.log('⏰ Clock‑in reminder sent');
  }

  // Friday 8 AM timecard check
  async sendFridayTimecardReminder() {
    if (!(await this.authenticate())) return;
    const res = await axios.get(
      `${this.serverUrl}/api/v1/rooms.info?roomName=general`,
      { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
    );
    const roomId = res.data.room._id;
    const text = `@all *Attention Titans*\nCheck your timecard now. If incorrect, email time@infi‑dau7.com with Date/Clock‑in/Lunch out/in/Clock‑out.`;
    await axios.post(
      `${this.serverUrl}/api/v1/chat.postMessage`,
      { roomId, text },
      { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
    );
    console.log('📆 Friday timecard reminder sent');
  }

  // Saturday 5 PM final timecard reminder
  async sendSaturdayTimecardReminder() {
    if (!(await this.authenticate())) return;
    const res = await axios.get(
      `${this.serverUrl}/api/v1/rooms.info?roomName=general`,
      { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
    );
    const roomId = res.data.room._id;
    const text = `@all *Final Reminder*\nCheck/correct your timecard before midnight. Email time@infi‑dau7.com with Date/Clock‑in/Lunch out/in/Clock‑out.`;
    await axios.post(
      `${this.serverUrl}/api/v1/chat.postMessage`,
      { roomId, text },
      { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
    );
    console.log('📆 Saturday timecard reminder sent');
  }

  // Lunch at 2 PM
  async sendLunchReminderMessage() {
    if (!(await this.authenticate())) return;
    const roomName = this.getCurrentRoomName();
    const roomId   = await this.checkRoomExists(roomName);
    if (!roomId) return;
    const text = `@all 🍽️ Lunch Time! 🕒\nMandatory 30 min lunch. Hit Break in the Flex app before you eat. Enjoy! 💪🥗`;
    await axios.post(
      `${this.serverUrl}/api/v1/chat.postMessage`,
      { roomId, text },
      { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
    );
    console.log('🍔 Lunch reminder sent');
  }

  // Delivery countdowns
  async sendDeliveryCountdownReminder(hoursLeft) {
    if (!(await this.authenticate())) return;
    const roomName = this.getCurrentRoomName();
    const roomId   = await this.checkRoomExists(roomName);
    if (!roomId) return;
    let text;
    if (hoursLeft > 1) {
      text = `@all *Attention Titans!*\n\nYou have ${hoursLeft} hours remaining. Keep pace to finish before 6:30 PM. You’ve got this! 💪`;
    } else {
      text = `@all *Last Hour!* 💥\nPush through and finish safely! 💪`;
    }
    await axios.post(
      `${this.serverUrl}/api/v1/chat.postMessage`,
      { roomId, text },
      { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
    );
    console.log(`⏳ ${hoursLeft}-hour countdown sent`);
  }

  // Random image uploads
  async sendRandomImageReminder() {
    if (!(await this.authenticate())) return;
    const roomName = this.getCurrentRoomName();
    const roomId   = await this.checkRoomExists(roomName);
    if (!roomId) return;
    const images = ['dogs.jpg','leadwithsafety.jpg','stopsigns.jpg'];
    const today = this.state.date;
    const used = this.state.usedImages[today] || [];
    const remaining = images.filter(i => !used.includes(i));
    if (remaining.length === 0) return;
    const chosen = remaining[Math.floor(Math.random()*remaining.length)];
    const form = new FormData();
    form.append('file', fs.createReadStream(path.join(__dirname,'images',chosen)));
    form.append('roomId', roomId);
    await axios.post(
      `${this.serverUrl}/api/v1/rooms.upload`,
      form,
      { headers: { 
          'X-Auth-Token': this.authToken,
          'X-User-Id': this.userId,
          ...form.getHeaders()
        }
      }
    );
    this.state.usedImages[today] = [...used, chosen];
    this.saveState();
    console.log(`📸 Uploaded image ${chosen}`);
  }

  startAutomation() {
    console.log('🚀 Starting Bot...');
    // Safety every 30m 10:00–19:30 CT
    cron.schedule('0,30 10-19 * * *', () => this.sendSafetyMessage(), { timezone: 'America/Chicago' });
    // Hydration hourly 10–18 CT May–Sep
    cron.schedule('0 10-18 * 5-9 *', () => this.sendHydrationMessage(), { timezone: 'America/Chicago' });
    // Heat at 9 AM CT May–Sep
    cron.schedule('0 9 * 5-9 *', () => this.sendHeatReminderMessage(), { timezone: 'America/Chicago' });
    // Clock‑in at 9:25 AM CT daily
    cron.schedule('25 9 * * *', () => this.sendClockInReminderMessage(), { timezone: 'America/Chicago' });
    // Friday 8 AM timecard
    cron.schedule('0 8 * * 5', () => this.sendFridayTimecardReminder(), { timezone: 'America/Chicago' });
    // Saturday 5 PM final timecard
    cron.schedule('0 17 * * 6', () => this.sendSaturdayTimecardReminder(), { timezone: 'America/Chicago' });
    // Lunch at 2 PM daily
    cron.schedule('0 14 * * *', () => this.sendLunchReminderMessage(), { timezone: 'America/Chicago' });
    // Delivery countdowns
    cron.schedule('30 11 * * *', () => this.sendDeliveryCountdownReminder(7),  { timezone: 'America/Chicago' });
    cron.schedule('30 13 * * *', () => this.sendDeliveryCountdownReminder(5),  { timezone: 'America/Chicago' });
    cron.schedule('30 15 * * *', () => this.sendDeliveryCountdownReminder(3),  { timezone: 'America/Chicago' });
    cron.schedule('30 17 * * *', () => this.sendDeliveryCountdownReminder(1),  { timezone: 'America/Chicago' });
    // Random images at 10:15, 12:15, 15:15 CT
    cron.schedule('15 10 * * *', () => this.sendRandomImageReminder(), { timezone: 'America/Chicago' });
    cron.schedule('15 12 * * *', () => this.sendRandomImageReminder(), { timezone: 'America/Chicago' });
    cron.schedule('15 15 * * *', () => this.sendRandomImageReminder(), { timezone: 'America/Chicago' });
  }

  stopAutomation() {
    // Cron handles lifetime; you can call cron.jobs to stop if needed
    console.log('⏹️ Stopped Bot');
  }
}

(async () => {
  const bot = new RocketChatAutomation(
    process.env.ROCKET_CHAT_SERVER_URL,
    process.env.ROCKET_CHAT_USERNAME,
    process.env.ROCKET_CHAT_PASSWORD,
    process.env.DANNY_USERNAME
  );
  bot.startAutomation();
})();
