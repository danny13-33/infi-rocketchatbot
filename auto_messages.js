#!/usr/bin/env node
// ─── SELF‑CLEANING BOOTSTRAP ────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

// Only run the cleaner on the original file, not on the cleaned one:
if (!__filename.endsWith('.clean.js')) {
  const src = fs.readFileSync(__filename, 'utf8').split('\n');
  const cleaned = src
    // strip any stray contentReference markers:
    .filter(line => !/^\s*::contentReference/.test(line))
    // strip any stray citation injections like oaicite:
    .filter(line => !/oaicite:\d+/.test(line))
    .join('\n');
  const cleanPath = path.join(__dirname, 'auto_messages.clean.js');
  fs.writeFileSync(cleanPath, cleaned, 'utf8');
  // Hand off execution to the cleaned file:
  return require(cleanPath);
}
// ─────────────────────────────────────────────────────────────────────────────

// From here on you're in auto_messages.clean.js — your full bot code
// (first half below)...
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

    // ─── ALL SAFETY MESSAGES ────────────────────────────────────────────────
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

      // …and so on for every single message…
    ];
    // ──────────────────────────────────────────────────────────────────────────────

    // your persisted state, etc.
    this.state = { date: null, order: [], index: 0 };
    this.dailyOrder = [];
    this.messageIndex = 0;
    this.loadOrInitState();
  }

  // … next methods: loadOrInitState, saveState, authenticate, etc. …
  // ─── State Initialization ─────────────────────────────────────────────────
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

  // ─── Persist State ─────────────────────────────────────────────────────────
  saveState() {
    try {
      fs.writeFileSync(STATE_PATH, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (err) {
      console.error('❌ Failed to write state file:', err);
    }
  }

  // ─── Rocket.Chat Authentication ─────────────────────────────────────────────
  async authenticate() {
    try {
      const response = await axios.post(`${this.serverUrl}/api/v1/login`, {
        user: this.username,
        password: this.password
      });
      this.authToken = response.data.data.authToken;
      this.userId = response.data.data.userId;
      console.log('✅ Successfully authenticated with Rocket.Chat');
      return true;
    } catch (error) {
      console.error('❌ Authentication failed:', error.response?.data?.message || error.message);
      return false;
    }
  }

  // ─── Helpers for Room Naming ────────────────────────────────────────────────
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

  // ─── Room Existence & Creation ──────────────────────────────────────────────
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
      return res.data.room._id;
    } catch (error) {
      if (error.response?.status === 400) {
        return null;
      }
      console.error('❌ Error checking room existence:', error.response?.data?.message || error.message);
      return null;
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
      return res.data.channel._id;
    } catch (error) {
      console.error('❌ Failed to create room:', error.response?.data?.message || error.message);
      return null;
    }
  }

  // ─── Safety Message Selection ───────────────────────────────────────────────
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

  // ─── Core Sending Function ─────────────────────────────────────────────────
  async sendMessage(roomId, text) {
    try {
      await axios.post(
        `${this.serverUrl}/api/v1/chat.postMessage`,
        { roomId, text },
        {
          headers: {
            'X-Auth-Token': this.authToken,
            'X-User-Id': this.userId
          }
        }
      );
    } catch (error) {
      console.error('❌ Failed to send message:', error.response?.data?.message || error.message);
    }
  }

  // ─── Business Hours & Room Check ────────────────────────────────────────────
  isBusinessHours() {
    const now = DateTime.now().setZone('America/Chicago');
    const minutes = now.hour * 60 + now.minute;
    return minutes >= 10 * 60 && minutes <= 19 * 60 + 30;
  }

  isRoomForToday(roomName) {
    return roomName === this.getCurrentRoomName();
  }

  // ─── Scheduled Message Senders ──────────────────────────────────────────────
  async sendSafetyMessage() {
    if (!this.isBusinessHours()) return;
    if (!this.authToken || !this.userId) {
      if (!(await this.authenticate())) return;
    }
    const roomName = this.getCurrentRoomName();
    let roomId = await this.checkRoomExists(roomName);
    if (!roomId) return;
    const msg = this.getNextSafetyMessage();
    await this.sendMessage(roomId, msg);
  }

  async sendHydrationMessage() {
    const nowCT = DateTime.now().setZone('America/Chicago');
    if (nowCT.month < 5 || nowCT.month > 9) return;
    if (!this.authToken || !this.userId) {
      if (!(await this.authenticate())) return;
    }
    const roomName = this.getCurrentRoomName();
    const roomId = await this.checkRoomExists(roomName);
    if (!roomId) return;
    const hydrationMessage = [
      '🌊HYDRATE HYDRATE HYDRATE🌊',
      'If you are reading this drink water now!',
      'Do not be a victim to heat. Stay hydrated.'
    ].join('\n');
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
    if (!roomId) return;
    const heatReminderMessage = [
      '@all ⚠️ Attention Titans! ⚠️',
      '',
      "As always, we're reminding you that the Texas heat is no joke, especially during the peak summer months. Knock out more than half your route by 2 PM to stay ahead of the worst of it.",
      '',
      'You’ve got this Titans! 💪🔥'
    ].join('\n');
    await this.sendMessage(roomId, heatReminderMessage);
  }

  async sendClockInReminderMessage() {
    if (!this.authToken || !this.userId) {
      if (!(await this.authenticate())) return;
    }
    const roomName = this.getCurrentRoomName();
    const roomId = await this.checkRoomExists(roomName);
    if (!roomId) return;
    const clockInMessage = [
      '*Attention Titans*',
      '@all This is your daily reminder to clock-in. If you can’t, email time@infi-dau7.com immediately.'
    ].join('\n');
    await this.sendMessage(roomId, clockInMessage);
  }

  async sendFridayTimecardReminder() {
    if (!this.authToken || !this.userId) {
      if (!(await this.authenticate())) return;
    }
    const res = await axios.get(
      `${this.serverUrl}/api/v1/rooms.info?roomName=general`,
      {
        headers: {
          'X-Auth-Token': this.authToken,
          'X-User-Id': this.userId
        }
      }
    );
    const roomId = res.data.room._id;
    const message = [
      '@all *Attention Titans*',
      "Here's your reminder to check and ensure your timecard is accurate. If it's not, email time@infi-dau7.com with:",
      'Date:',
      'Clock in:',
      'Lunch out:',
      'Lunch in:',
      'Clock out:',
      '',
      '*DO NOT USE ADP TO CORRECT YOUR TIMECARD*'
    ].join('\n');
    await this.sendMessage(roomId, message);
  }

  async sendSaturdayTimecardReminder() {
    if (!this.authToken || !this.userId) {
      if (!(await this.authenticate())) return;
    }
    const res = await axios.get(
      `${this.serverUrl}/api/v1/rooms.info?roomName=general`,
      {
        headers: {
          'X-Auth-Token': this.authToken,
          'X-User-Id': this.userId
        }
      }
    );
    const roomId = res.data.room._id;
    const message = [
      '@all *Final Reminder*',
      "Did you remember to check your timecard? If not, send corrections by midnight to time@infi-dau7.com:"
    ].join('\n');
    await this.sendMessage(roomId, message);
  }

  async sendLunchReminderMessage() {
    if (!this.authToken || !this.userId) {
      if (!(await this.authenticate())) return;
    }
    const roomName = this.getCurrentRoomName();
    const roomId = await this.checkRoomExists(roomName);
    if (!roomId) return;
    const lunchReminderMessage = [
      '@all 🍽️ Titans! It’s Lunch Time! 🕒',
      'Lunch is mandatory and must be exactly 30 minutes. ⏳',
      'Travel time counts as part of lunch.',
      'Hit Break in the Flex app before you eat! ✅'
    ].join('\n');
    await this.sendMessage(roomId, lunchReminderMessage);
  }

  // ─── Delivery Countdown Reminders ────────────────────────────────────────
  async sendDeliveryCountdownReminder1130() {
    const roomId = await this.checkRoomExists(this.getCurrentRoomName());
    if (!roomId) return;
    const message = '@all *Attention Titans!* You have 7 hours left in your delivery day—keep the pace! 💪';
    await this.sendMessage(roomId, message);
  }
  async sendDeliveryCountdownReminder1330() {
    const roomId = await this.checkRoomExists(this.getCurrentRoomName());
    if (!roomId) return;
    const message = '@all *Attention Titans!* 5 hours to go—stay focused! 💪';
    await this.sendMessage(roomId, message);
  }
  async sendDeliveryCountdownReminder1530() {
    const roomId = await this.checkRoomExists(this.getCurrentRoomName());
    if (!roomId) return;
    const message = '@all *Attention Titans!* 3 hours remaining—crush it safely! 💪';
    await this.sendMessage(roomId, message);
  }
  async sendDeliveryCountdownReminder1730() {
    const roomId = await this.checkRoomExists(this.getCurrentRoomName());
    if (!roomId) return;
    const message = '@all *Attention Titans!* Last hour! Let’s finish strong and safe! 💥';
    await this.sendMessage(roomId, message);
  }

  // ─── Random Image Uploads ─────────────────────────────────────────────────
  async sendImageReminder(imageName) {
    const roomId = await this.checkRoomExists(this.getCurrentRoomName());
    if (!roomId) return;
    const imagePath = path.join(__dirname, 'images', imageName);
    const stream = fs.createReadStream(imagePath);
    const stats = fs.statSync(imagePath);
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', stream, { knownLength: stats.size, filename: imageName });
    form.append('roomId', roomId);
    await axios.post(`${this.serverUrl}/api/v1/rooms.upload`, form, {
      headers: {
        'X-Auth-Token': this.authToken,
        'X-User-Id': this.userId,
        ...form.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
  }

  async sendRandomImageReminder() {
    const images = ['dogs.jpg', 'leadwithsafety.jpg', 'stopsigns.jpg'];
    const today = DateTime.now().toFormat('yyyy-LL-dd');
    this.state.usedImages = this.state.usedImages || {};
    const used = this.state.usedImages[today] || [];
    const remaining = images.filter(i => !used.includes(i));
    if (remaining.length === 0) return;
    const chosen = remaining[Math.floor(Math.random() * remaining.length)];
    await this.sendImageReminder(chosen);
    this.state.usedImages[today] = [...used, chosen];
    this.saveState();
  }

  // ─── Scheduler Setup ───────────────────────────────────────────────────────
  startAutomation() {
    console.log(`🚀 Deployment Time (America/Chicago): ${DateTime.now().toLocaleString(DateTime.DATETIME_FULL)}`);

    // Immediate test DM to Danny
    this.sendImmediateMessageToDanny();

    // Safety every 30m, 10–19:30 CT
    cron.schedule('0,30 10-19 * * *', () => this.sendSafetyMessage(), { timezone: 'America/Chicago' });

    // Hydration hourly 10–18 CT, May–Sep
    cron.schedule('0 10-18 * 5-9 *', () => this.sendHydrationMessage(), { timezone: 'America/Chicago' });

    // Heat reminder 9:00 CT daily, May–Sep
    cron.schedule('0 9 * 5-9 *', () => this.sendHeatReminderMessage(), { timezone: 'America/Chicago' });

    // Clock‑in 9:25 CT daily
    cron.schedule('25 9 * * *', () => this.sendClockInReminderMessage(), { timezone: 'America/Chicago' });

    // Friday 8:00 CT timecard reminder
    cron.schedule('0 8 * * 5', () => this.sendFridayTimecardReminder(), { timezone: 'America/Chicago' });

    // Saturday 17:00 CT final timecard reminder
    cron.schedule('0 17 * * 6', () => this.sendSaturdayTimecardReminder(), { timezone: 'America/Chicago' });

    // Lunch reminder 14:00 CT
    cron.schedule('0 14 * * *', () => this.sendLunchReminderMessage(), { timezone: 'America/Chicago' });

    // Delivery countdowns
    cron.schedule('30 11 * * *', () => this.sendDeliveryCountdownReminder1130(), { timezone: 'America/Chicago' });
    cron.schedule('30 13 * * *', () => this.sendDeliveryCountdownReminder1330(), { timezone: 'America/Chicago' });
    cron.schedule('30 15 * * *', () => this.sendDeliveryCountdownReminder1530(), { timezone: 'America/Chicago' });
    cron.schedule('30 17 * * *', () => this.sendDeliveryCountdownReminder1730(), { timezone: 'America/Chicago' });

    // Random images
    cron.schedule('15 10 * * *', () => this.sendRandomImageReminder(), { timezone: 'America/Chicago' });
    cron.schedule('15 12 * * *', () => this.sendRandomImageReminder(), { timezone: 'America/Chicago' });
    cron.schedule('15 15 * * *', () => this.sendRandomImageReminder(), { timezone: 'America/Chicago' });
  }

  stopAutomation() {
    // implement stops if needed
  }
}

// ─── Bootstrap & Launch ───────────────────────────────────────────────────────
console.log('🔧 Loading environment variables...');
console.log({
  ROCKET_CHAT_SERVER_URL: process.env.ROCKET_CHAT_SERVER_URL,
  ROCKET_CHAT_USERNAME: process.env.ROCKET_CHAT_USERNAME,
  ROCKET_CHAT_PASSWORD: process.env.ROCKET_CHAT_PASSWORD ? '****' : undefined,
  DANNY_USERNAME: process.env.DANNY_USERNAME
});

(async () => {
  const bot = new RocketChatAutomation(
    process.env.ROCKET_CHAT_SERVER_URL,
    process.env.ROCKET_CHAT_USERNAME,
    process.env.ROCKET_CHAT_PASSWORD,
    process.env.DANNY_USERNAME
  );
  bot.startAutomation();
})();
