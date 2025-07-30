// auto_messages.js (part 1/2)

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

      `:leg: :eyes: Before you start walking to your destination, look at where you will be placing your feet. Don't jump in and out of the vans. Your legs are not designed to absorb incredible impact over and over. Use all of the steps available to you and try to maintain 3 points of contact. :raised_hand:
Rushing is when you make the most mistakes. Slow is smooth, smooth is fast. Find your groove and stick with it.`,

      `:exclamation:  :cloud_rain: On days where moisture is high, we are also at high risk for slips, trips and falls. Three points of contact when getting out of the vans and be highly familiar with your pathing today. Being safe on the road is something you are all extremely capable of doing, please do it!`,

      `:running_shirt_with_sash: Wearing a seatbelt is one of the safest things you can do to protect yourself when driving. Remember to always wear your seatbelt correctly — across your chest and waist. Never sit on your seatbelt when it is buckled.

If you feel your seatbelt is not working properly, post your concern in the #on_road_van_issues chat & let one of the members of Management know.

No vehicle should be on the road with a faulty seatbelt.

:point_right:  Remember to always wear your seatbelt when the vehicle is moving and only use your device when the vehicle is sitting still!  
:point_left: Watch your speeds and let's have a great day today!`,

      `:truck: :dash: :dash: *Speeding*
Speeding is one of the most common causes of accidents on the road.
If you are not sure of what the speed limit is, you should proceed with caution and operate at a speed that is typical for the road type and location (e.g., 25–30 mph in a neighborhood).
Be on the lookout for road signs indicating speed limit changes, as speeding violations are easy to avoid.

*Don't go off of what GPS tells you. Go off what the SIGNS say, because that is what the camera sees!*`
    ];

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

  saveState() {
    try {
      fs.writeFileSync(STATE_PATH, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (err) {
      console.error('❌ Failed to write state file:', err);
    }
  }

  // …next methods (authenticate, room helpers, getNextSafetyMessage, etc.) come in part 2/2…
// auto_messages.js (part 2/2)

// …continuing inside class RocketChatAutomation, right after this.loadOrInitState(); in the constructor…

  // Load existing state or initialize a new shuffle for today
  loadOrInitState() {
    const today = DateTime.now().setZone('America/Chicago').toISODate();
    let persisted = null;

    if (fs.existsSync(STATE_PATH)) {
      try {
        persisted = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
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

  // Authenticate with Rocket.Chat
  async authenticate() {
    const res = await axios.post(`${this.serverUrl}/api/v1/login`, {
      user: this.username,
      password: this.password
    });
    this.authToken = res.data.data.authToken;
    this.userId = res.data.data.userId;
  }

  // Build today's room name like "July-30th-2025"
  getCurrentRoomName() {
    const nowCT = DateTime.now().setZone('America/Chicago');
    const month = nowCT.monthLong;
    const day = nowCT.day;
    const suffix = this.getOrdinalSuffix(day);
    const year = nowCT.year;
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

  // Check if a room exists, return its ID or null
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
    } catch {
      return null;
    }
  }

  // Send a standard chat.postMessage
  async sendMessage(roomId, text) {
    await axios.post(
      `${this.serverUrl}/api/v1/chat.postMessage`,
      { roomId, text },
      {
        headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId }
      }
    );
  }

  // Pick the next safety message for today
  getNextSafetyMessage() {
    const today = DateTime.now().setZone('America/Chicago').toISODate();
    if (this.state.date !== today) this.loadOrInitState();

    const idx = this.dailyOrder[this.state.index];
    const msg = this.safetyMessages[idx];

    this.state.index++;
    this.saveState();
    return msg;
  }

  isBusinessHours() {
    const now = DateTime.now().setZone('America/Chicago');
    const minutes = now.hour * 60 + now.minute;
    return minutes >= 10 * 60 && minutes <= 19 * 60 + 30;
  }

  isRoomForToday(roomName) {
    return roomName === this.getCurrentRoomName();
  }

  // Core sender for safety messages
  async sendSafetyMessage() {
    if (!this.isBusinessHours()) return;
    if (!this.authToken) await this.authenticate();

    const roomName = this.getCurrentRoomName();
    const roomId = await this.checkRoomExists(roomName);
    if (!roomId || !this.isRoomForToday(roomName)) return;

    const message = this.getNextSafetyMessage();
    await this.sendMessage(roomId, message);
  }

  // Seasonal hydration reminders (May–September)
  async sendHydrationMessage() {
    const now = DateTime.now().setZone('America/Chicago');
    if (now.month < 5 || now.month > 9) return;
    if (!this.authToken) await this.authenticate();

    const roomName = this.getCurrentRoomName();
    const roomId = await this.checkRoomExists(roomName);
    if (!roomId || !this.isRoomForToday(roomName)) return;

    const msg = `🌊 HYDRATE HYDRATE HYDRATE 🌊
If you are reading this, drink water now! Stay ahead of the Texas heat.`;
    await this.sendMessage(roomId, msg);
  }

  // Daily heat-reminder
  async sendHeatReminderMessage() {
    const now = DateTime.now().setZone('America/Chicago');
    if (now.month < 5 || now.month > 9) return;
    if (!this.authToken) await this.authenticate();

    const roomName = this.getCurrentRoomName();
    const roomId = await this.checkRoomExists(roomName);
    if (!roomId || !this.isRoomForToday(roomName)) return;

    const msg = `@all ⚠️ Attention Titans! ⚠️

Peak summer heat is rough. Knock out half your route by 2 PM to give yourself a cooler second half. Start strong, stay smart, stay safe!`;
    await this.sendMessage(roomId, msg);
  }

  // Daily 9:25 AM clock-in reminder
  async sendClockInReminderMessage() {
    if (!this.authToken) await this.authenticate();

    const roomName = this.getCurrentRoomName();
    const roomId = await this.checkRoomExists(roomName);
    if (!roomId || !this.isRoomForToday(roomName)) return;

    const msg = `*Attention Titans*  
@all Please clock in now. If you can’t, email time@infi-dau7.com immediately. Thank you!`;
    await this.sendMessage(roomId, msg);
  }

  // Utility to DM Danny on deploy
  async getOrCreateDirectMessageRoom(username) {
    const res = await axios.post(
      `${this.serverUrl}/api/v1/im.create`,
      { username },
      { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
    );
    return res.data.room._id;
  }

  async sendImmediateMessageToDanny() {
    if (!this.authToken) await this.authenticate();
    const dmId = await this.getOrCreateDirectMessageRoom(this.dannyUsername);
    if (!dmId) return;
    await this.sendMessage(dmId, `✅ Safety Automation Deployed Successfully.\nThis is your immediate test message, Danny.`);
  }

  // Kick off all cron schedules
  startAutomation() {
    // Send a quick deploy DM
    this.sendImmediateMessageToDanny().catch(() => {});

    // Safety: every :00 and :30 between 10 AM–7:30 PM CT
    this.scheduledSafetyTask = cron.schedule(
      '0,30 10-19 * * *',
      () => this.sendSafetyMessage().catch(console.error),
      { timezone: 'America/Chicago' }
    );

    // Hydration: every hour on the hour 10 AM–6 PM CT, May–Sep
    this.scheduledHydrationTask = cron.schedule(
      '0 10-18 * 5-9 *',
      () => this.sendHydrationMessage().catch(console.error),
      { timezone: 'America/Chicago' }
    );

    // Heat reminder: 9 AM CT daily, May–Sep
    this.scheduledHeatReminderTask = cron.schedule(
      '0 9 * 5-9 *',
      () => this.sendHeatReminderMessage().catch(console.error),
      { timezone: 'America/Chicago' }
    );

    // Clock-in: 9:25 AM CT daily
    this.scheduledClockInTask = cron.schedule(
      '25 9 * * *',
      () => this.sendClockInReminderMessage().catch(console.error),
      { timezone: 'America/Chicago' }
    );
  }
}

// Bootstrap
(async () => {
  const bot = new RocketChatAutomation(
    process.env.ROCKET_CHAT_SERVER_URL,
    process.env.ROCKET_CHAT_USERNAME,
    process.env.ROCKET_CHAT_PASSWORD,
    process.env.DANNY_USERNAME
  );
  bot.startAutomation();
})();
