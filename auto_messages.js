require('dotenv').config();
const axios = require('axios');
const cron = require('node-cron');
const FormData = require('form-data');
const { DateTime } = require('luxon');
const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(__dirname, 'state.json');

class RocketChatAutomation {
  constructor(serverUrl, username, password, dannyUsername) {
    this.serverUrl      = serverUrl.replace(/\/$/, '');
    this.username       = username;
    this.password       = password;
    this.dannyUsername  = dannyUsername;
    this.authToken      = null;
    this.userId         = null;
    this.state          = { date: null, order: [], index: 0 };
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

    // Load or initialize state for today’s shuffle
    this.loadOrInitState();
  }

  // Read or create the shuffle + index for today
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
    } else {
      const count = this.safetyMessages.length;
      const order = Array.from({ length: count }, (_, i) => i);
      for (let i = count - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      this.state = { date: today, order, index: 0 };
      fs.writeFileSync(STATE_PATH, JSON.stringify(this.state, null, 2));
    }
  }

  // Persist current shuffle state
  saveState() {
    fs.writeFileSync(STATE_PATH, JSON.stringify(this.state, null, 2));
  }

  // Authenticate with Rocket.Chat REST API
  async authenticate() {
    const res = await axios.post(`${this.serverUrl}/api/v1/login`, {
      user: this.username,
      password: this.password
    });
    this.authToken = res.data.data.authToken;
    this.userId    = res.data.data.userId;
  }

  // Helper: post a message to a room ID
  async sendMessage(roomId, text) {
    await axios.post(
      `${this.serverUrl}/api/v1/chat.postMessage`,
      { roomId, text },
      { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
    );
  }
  // Returns the room name for today, e.g. "July-30th-2025"
  getCurrentRoomName() {
    const now = DateTime.now().setZone('America/Chicago');
    const month = now.monthLong;
    const day   = now.day;
    const year  = now.year;
    return `${month}-${day}${this.getOrdinalSuffix(day)}-${year}`;
  }

  // 1st, 2nd, 3rd, etc.
  getOrdinalSuffix(day) {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  // See if today's room exists; returns roomId or null
  async checkRoomExists(roomName) {
    try {
      const res = await axios.get(
        `${this.serverUrl}/api/v1/rooms.info?roomName=${encodeURIComponent(roomName)}`,
        { headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId } }
      );
      return res.data.room._id;
    } catch (err) {
      if (err.response?.status === 400) return null;
      throw err;
    }
  }

  // Pick next safety message from shuffled list
  getNextSafetyMessage() {
    const today = DateTime.now().setZone('America/Chicago').toISODate();
    if (this.state.date !== today) {
      this.loadOrInitState();
    }
    const idx = this.state.order[this.state.index];
    const msg = this.safetyMessages[idx];
    this.state.index++;
    this.saveState();
    return msg;
  }

  // Send one safety message every 30m during business hours
  async sendSafetyMessage() {
    const now = DateTime.now().setZone('America/Chicago');
    if (now.hour < 10 || now.hour > 19) return;
    if (!this.authToken) await this.authenticate();

    const roomName = this.getCurrentRoomName();
    const roomId   = await this.checkRoomExists(roomName);
    if (!roomId) return;

    const text = this.getNextSafetyMessage();
    await this.sendMessage(roomId, text);
  }

  // Hydration message hourly, May–Sep
  async sendHydrationMessage() {
    const m = DateTime.now().setZone('America/Chicago').month;
    if (m < 5 || m > 9) return;
    if (!this.authToken) await this.authenticate();

    const roomName = this.getCurrentRoomName();
    const roomId   = await this.checkRoomExists(roomName);
    if (!roomId) return;

    const text =
      `🌊HYDRATE HYDRATE HYDRATE🌊\n` +
      `If you are reading this drink water now!\n` +
      `Do Not be a victim to Heat. Stay Hydrated`;
    await this.sendMessage(roomId, text);
  }

  // Single daily heat reminder at 9am, May–Sep
  async sendHeatReminderMessage() {
    const m = DateTime.now().setZone('America/Chicago').month;
    if (m < 5 || m > 9) return;
    if (!this.authToken) await this.authenticate();

    const roomName = this.getCurrentRoomName();
    const roomId   = await this.checkRoomExists(roomName);
    if (!roomId) return;

    const text =
      `@all ⚠️ Attention Titans! ⚠️\n\n` +
      `As always, we're reminding you that the Texas heat is no joke, especially during the peak summer months. That’s why we strongly encourage you to knock out more than half of your route by 2 PM. It’s absolutely achievable if you start strong and stay focused.\n\n` +
      `By hustling early, you’ll give yourself the chance to slow down and cool off when the heat is at its worst. The secret to success out here? Keep moving, stay organized, and manage your time wisely.\n\n` +
      `We believe in every single one of you, but more importantly, you’ve got to believe in yourself. Let’s stay safe, stay smart, and crush it out there.\n\n` +
      `You’ve got this Titans! 💪🔥`;
    await this.sendMessage(roomId, text);
  }

  // Daily clock-in reminder at 9:25am
  async sendClockInReminderMessage() {
    if (!this.authToken) await this.authenticate();

    const roomName = this.getCurrentRoomName();
    const roomId   = await this.checkRoomExists(roomName);
    if (!roomId) return;

    const text =
      `*Attention Titans*\n` +
      `@all This is your daily reminder to clock-in. Please ensure you clock in and if you are unable to clock in send an email to time@infi-dau7.com immediately.  Thank you!`;
    await this.sendMessage(roomId, text);
  }

  // Friday 8am: timecard accuracy reminder in #general
  async sendFridayTimecardReminder() {
    if (!this.authToken) await this.authenticate();

    const res    = await axios.get(`${this.serverUrl}/api/v1/rooms.info?roomName=general`, {
      headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId }
    });
    const roomId = res.data.room._id;
    const text =
      `@all *Attention Titans*\n` +
      `Here's your reminder for you to check and ensure your timecard is accurate.  ` +
      `If it's not accurate or you missed a timecard punch please send an email to time@infi-dau7.com and follow this format when sending the email:\n\n` +
      `Date:\nClock in:\nLunch out:\nLunch in:\nClock out:\n\n` +
      `*DO NOT USE ADP TO CORRECT YOUR TIMECARD THAT FEATURE DOES NOT WORK*`;
    await this.sendMessage(roomId, text);
  }

  // Saturday 5pm: final timecard reminder in #general
  async sendSaturdayTimecardReminder() {
    if (!this.authToken) await this.authenticate();

    const res    = await axios.get(`${this.serverUrl}/api/v1/rooms.info?roomName=general`, {
      headers: { 'X-Auth-Token': this.authToken, 'X-User-Id': this.userId }
    });
    const roomId = res.data.room._id;
    const text =
      `@all *Final Reminder*\n` +
      `Did you remember to check your timecard?  If you haven't now's the time to do so.  ` +
      `All timecard corrections should be sent in no later than midnight tonight.  ` +
      `If you need corrections please send an email to time@infi-dau7.com in this format:\n\n` +
      `Date:\nClock in:\nLunch out:\nLunch in:\nClock out:\n\n` +
      `*DO NOT USE ADP TO CORRECT YOUR TIMECARD THAT FEATURE DOES NOT WORK*`;
    await this.sendMessage(roomId, text);
  }

  // Lunch reminder at 2pm daily
  async sendLunchReminderMessage() {
    if (!this.authToken) await this.authenticate();

    const roomName = this.getCurrentRoomName();
    const roomId   = await this.checkRoomExists(roomName);
    if (!roomId) return;

    const text =
      `@all 🍽️ Titans! It's Lunch Time! 🕒\n\n` +
      `Just a quick reminder — lunches are mandatory and must be exactly 30 minutes. ⏳\n` +
      `➡️ No more, no less.\n` +
      `❌ You cannot combine lunch with your breaks.\n` +
      `🚗 Travel time to and from your lunch spot counts as part of your 30-minute lunch.\n\n` +
      `Don’t forget to hit that Break button in the Flex app before you dig in! ✅\n` +
      `Enjoy your lunch and recharge! 💪🥗🍔`;
    await this.sendMessage(roomId, text);
  }

  // RTS reminder at 6pm daily
  async sendRTSReminderMessage() {
    if (!this.authToken) await this.authenticate();

    const roomName = this.getCurrentRoomName();
    const roomId   = await this.checkRoomExists(roomName);
    if (!roomId) return;

    const text =
      `:pushpin: RTS Reminders  :pushpin:\n\n` +
      `*Before you RTS*  :arrow_down:\n` +
      `🔎 Check your van for any missorts or missing packages 📦 before you RTS. Missing packages must be reattempted, and missorts must be delivered if they are within a 15-minute radius.\n\n` +
      `*Parking at Station*  :blue_car:\n` +
      `Clean out your van! Take your trash🗑, wipe it down  :sponge: , and sweep it out. 🧹 You may not be in the same van tomorrow. Do not leave your mess for someone else.  :do_not_litter:\n\n` +
      `*Equipment turn in*  :bulb:\n` +
      `When you turn in your bag at the end of the night, be sure to check it thoroughly. Make sure the work device 📱, the gas card 💳, the keys 🔑, and the portable charger 🔋 are inside. Also, please remember to wait the full 2 minutes for your post trip on standard vehicles and 3 minutes on step vans. And be certain you've clocked out before leaving.  :clock8:`;
    await this.sendMessage(roomId, text);
  }

  // Start all cron tasks
  startAutomation() {
    console.log('🚀 Starting Infinite Delivery OPS Automation');
    this.authenticate().then(() => {
      // Safety every 30m 10:00–19:30 CT
      cron.schedule('0,30 10-19 * * *', () => this.sendSafetyMessage(), { timezone: 'America/Chicago' });
      // Hydration every hour 10–18 CT, May–Sep
      cron.schedule('0 10-18 * 5-9 *', () => this.sendHydrationMessage(), { timezone: 'America/Chicago' });
      // Heat daily 09:00 CT, May–Sep
      cron.schedule('0 9 * 5-9 *', () => this.sendHeatReminderMessage(), { timezone: 'America/Chicago' });
      // Clock-in 09:25 CT daily
      cron.schedule('25 9 * * *', () => this.sendClockInReminderMessage(), { timezone: 'America/Chicago' });
      // Friday 08:00
      cron.schedule('0 8 * * 5', () => this.sendFridayTimecardReminder(), { timezone: 'America/Chicago' });
      // Saturday 17:00
      cron.schedule('0 17 * * 6', () => this.sendSaturdayTimecardReminder(), { timezone: 'America/Chicago' });
      // Lunch 14:00 daily
      cron.schedule('0 14 * * *', () => this.sendLunchReminderMessage(), { timezone: 'America/Chicago' });
      // RTS 18:00 daily
      cron.schedule('0 18 * * *', () => this.sendRTSReminderMessage(), { timezone: 'America/Chicago' });
    });
  }
}

// Entry point
(async () => {
  try {
    const bot = new RocketChatAutomation(
      process.env.ROCKET_CHAT_SERVER_URL,
      process.env.ROCKET_CHAT_USERNAME,
      process.env.ROCKET_CHAT_PASSWORD,
      process.env.DANNY_USERNAME
    );
    bot.startAutomation();
  } catch (err) {
    console.error('🔥 Failed to start automation:', err);
  }
})();
