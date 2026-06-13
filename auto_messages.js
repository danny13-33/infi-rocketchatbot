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

    // Persisted state: { date, order, index, usedImages, sentMessages }
    this.state = { date: null, order: [], index: 0, usedImages: {}, sentMessages: {} };
    this.dailyOrder = [];
    this.messageIndex = 0;

    // All safety messages preserved verbatim
    this.safetyMessages = [
      `🚗 *Following distance.* Netradyne measures your gap in *seconds*, not feet — it tightens the faster you go. Keep at least 2 seconds, 3 in rain or loaded. Hear the beep? Ease off and rebuild the gap within 10 seconds and it won't count.`,
      `🚛 *Speeding — nobody should be speeding, period.* The camera logs an event at just *5 mph over*, and the limit drops fast in neighborhoods. Way over = automatic severe event that can pause your route the same day. Stay at or under the limit and you never think about it.`,
      `🛑 *Stop signs.* A rolling stop counts the same as blowing it — the camera needs a *full stop, wheels stopped*, before you move. Blowing one at 15+ mph is severe and can pause your route. Count "one-one-thousand" at every sign, even when it looks empty.`,
      `🚦 *Red lights.* Running a red is one of the most serious things the system flags — a single one can pause your route, and it hits the scorecard 10x harder than a stop sign. Light turns yellow? Plan to stop. Don't beat it.`,
      `📵 *Distraction / phone.* The inward camera watches your eyes. Looking down above 15 mph, or talking on it above 5 mph, triggers a Distracted Driving alert in seconds. Phone in the mount, nav set before you roll, eyes up and forward.`,
      `🦺 *Seatbelt — on whenever the vehicle is moving, period.* Lap belt low on your hips, shoulder belt across your chest. Slipping it behind your back or over your head is flagged as *severe misuse* and pauses your route. Belt on, every leg, no exceptions.`,
      `↩️ *Backing / reversing.* Avoid it — pull through or park so you drive out forward. Before you reverse, *walk behind the van and look*; a person can hide in the blind spot 20–40 ft. Don't trust the backup camera alone, and never back toward a driveway you didn't walk first.`,
      `🔄 *Hard turns.* Taking a turn over 15 mph hard enough to trip the sensor logs a Hard Turn event and throws packages around the back. Slow into every turn — it protects the load AND your score.`,
      `📍 *Delivery location.* Always follow the customer's delivery instructions. No instructions? Deliver to a secure spot — out of traffic, not visible from the street, out of the weather. Can't find one? Call the customer before you drop it.`,
      `📦 *Don't group packages.* Several boxes at one address? Don't stack them all in one spot to save time — deliver per the customer's notes. Grouping is a *top* complaint driver.`,
      `📸 *Good photo-on-delivery.* POD is scored on whether the photo is *usable*: clear, well-lit, package visible, taken at the actual drop spot so the customer can find it. Blurry or box-not-in-frame = fail. The photo is your proof it happened — make it count.`,
      `🙅 *What NOT to photograph.* Never capture a person's face or the customer — Amazon rejects those for privacy. Shoot the *package at the door*, not the handoff.`,
      `✅ *Right reason code.* "Delivered to Household Member" is ONLY for when you actually hand it to someone. Don't use it to clear a stop you left at the door.`,
      `🎯 *Fix the pin before you scan.* If GPS drops you at the wrong house, correct the pin *before* you scan — the scan location is what gets scored, not where you stand. Ten seconds protects your CDF.`,
      `🪜 *Three points of contact.* In or out of the van: two hands + a foot, or two feet + a hand. Face the cab coming down, grip the handrail first, free hand empty — don't climb down holding packages.`,
      `🚷 *Never jump out of the van.* Climb down feet-first on the steps — never jump from the cab or the back. Jumping hits your knees, ankles, and back with up to *12x your body weight*, and you can't see the curb, ice, or debris below. That's what wrecks joints over a career.`,
      `🏋️ *Lift with your legs.* Box close to your body, don't twist — pivot your feet. Keep heavy items between knee and shoulder height. Heavy or awkward = team lift or cart, every time.`,
      `🐕 *Dog bites.* Stay alert at any address a dog might be, respect its territory. Dog comes at you? Don't run or turn your back — stand your ground and put something between you and it (bag, package). Never hand a package to a child or reach for a door with a loose dog nearby.`,
      `🚸 *Stay out of blind zones on foot.* Stay clear of the area behind any reversing vehicle, and make eye contact with the driver before crossing behind them. People tune out backup alarms — don't count on them.`,
      `👀 *Watch where you're going and where you're stepping.* Eyes up for traffic, dogs, and people — eyes down for curbs, cracks, ice, hoses, sprinklers, and uneven ground. Most slips, trips, and falls happen on a path you've walked a hundred times because you stopped looking. Look at every step, every stop.`,
      `🔧 *DVIC inspection.* Do the start-of-route AND end-of-route inspection fully and honestly every day. It documents pre-existing damage so it's not pinned on you, and a real defect is ours to fix before the van rolls. Some vans now need 6 photos (4 exterior, 2 interior).`,
      `🔎 *Scan discipline.* Scan at the right place and time — the scan IS the record. Fix a wrong GPS pin before you scan, never pre-scan a stop you haven't made, and don't mass-scan to save time.`,
      `📦 *Package handling.* Treat every box like it's breakable and like the customer is watching — with POD, they basically are. No throwing, no stacking heavy on light, fragile items face-up.`,
      `🚨 *If you're in an accident.* Stop, make sure everyone's safe, *reach out to dispatch immediately.* Don't admit fault or negotiate. Document with photos, get the other party's info — we'll handle it.`,
      `🛠️ *If the van breaks down.* Get safely off the road, hazards on, *reach out to dispatch immediately.* Don't try to fix it roadside.`,
      `⚠️ *Aggressive dog / unsafe address.* Don't force it. Aggressive dog → mark the stop, move on, tell me so we flag the address. Unsafe address → call the customer; still unsafe, mark it and move on. A package is *never* worth your safety.`,
      `💧 *Hydrate before you're thirsty.* Drink water often all shift — don't wait until you feel it. Routes 2+ hours in the heat: add an electrolyte drink, not just water. Take cool-down breaks in shade or the A/C cab.`,
      `🥵 *Heat exhaustion vs heat stroke.* Exhaustion = heavy sweating, dizziness, nausea, headache, weakness → cool spot, hydrate, rest. Heat STROKE = 911 emergency → confusion, slurred speech, passing out, seizures. Call 911, cool them with ice/cold water, never leave them alone.`,
      `🌧️ *Wet / icy conditions.* Slow down and double your following distance — a loaded van stops slower than a car. Three points of contact matter even more on wet steps and curbs. Walkway iced over? Find a safer approach or skip the drop — a package isn't worth a fall.`,
      `🛑 *How suspensions work — everyday events* (speeding, distraction, following distance, seatbelt, stop sign). @all Enough events = an occurrence. *1st occurrence = training* (you miss work that day). *2nd in 90 days = account suspended* + retrained. *3rd in 90 days = permanently banned* from delivering for Amazon. Done. The goal is ZERO.`,
      `🛑 *How suspensions work — severe events* (red light, way-over speeding, stop sign at 15+, seatbelt misuse). @all Amazon reviews the video and a single validated one *pauses your route on the spot* — you park, stop delivering, reach out to dispatch immediately. Repeats escalate to account shutoff and permanent ban. It's Amazon's automatic process, not mine — once your record hits those thresholds I can't undo it.`,
      `😏 *Real talk.* @all I don't send these messages out for my own health — my expectation is you *read these daily.* They're not just daily expectations… they may literally *save your life.* So do me a favor: actually read them. 📖`
    ];

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
    if (persisted && persisted.date === today && Array.isArray(persisted.order)) {
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
      this.state = { date: today, order: indices, index: 0, usedImages: {}, sentMessages: {} };
      this.saveState();
    }
  }

  saveState() {
    fs.writeFileSync(STATE_PATH, JSON.stringify(this.state, null, 2), 'utf8');
  }

  listSafetyMessages() {
    console.log('📝 Current Safety Messages:');
    this.safetyMessages.forEach((msg, i) => console.log(`${i + 1}. ${msg}`));
  }

  async authenticate() {
    try {
      const res = await axios.post(`${this.serverUrl}/api/auth/login`, {
        username: this.username,
        password: this.password
      });
      
      // New API format: { token, user: { id } }
      this.authToken = res.data.token;
      this.userId = res.data.user.id;
      
      if (!this.authToken || !this.userId) {
        console.error('❌ Could not find token or user.id in response');
        return false;
      }
      
      console.log('✅ Authentication successful');
      return true;
    } catch (err) {
      console.error('❌ Authentication failed:', err.message);
      console.error('Response:', err.response?.data);
      return false;
    }
  }

  async getUserIdByUsername(username, retried = false) {
    try {
      console.log(`🔍 Looking up user ID for username: "${username}"`);
      const res = await axios.get(
        `${this.serverUrl}/api/users/search?q=${encodeURIComponent(username)}`,
        { headers: { 'Authorization': `Bearer ${this.authToken}` } }
      );

      console.log(`📋 User search returned ${res.data?.length || 0} results`);

      // Find exact username match (case-insensitive)
      const user = res.data.find(u => u.username.toLowerCase() === username.toLowerCase());

      if (!user) {
        console.error(`❌ User '${username}' not found in search results`);
        return null;
      }

      console.log(`✅ Found user '${username}' with ID: ${user.id}`);
      return user.id;
    } catch (err) {
      if (!retried && err.response?.status === 403) {
        console.log('🔄 Token expired on getUserIdByUsername, re-authenticating...');
        this.authToken = null;
        this.userId = null;
        if (await this.authenticate()) {
          return this.getUserIdByUsername(username, true);
        }
      }
      console.error(`❌ getUserIdByUsername failed for '${username}':`, err.message);
      return null;
    }
  }

  getCurrentRoomName() {
    const now = DateTime.now().setZone('America/Chicago');
    const suffix = this.getOrdinalSuffix(now.day);
    return `${now.monthLong}-${now.day}${suffix}-${now.year}`;
  }

  getCurrentCycle0RoomName() {
    const now = DateTime.now().setZone('America/Chicago');
    const suffix = this.getOrdinalSuffix(now.day);
    return `Cycle0-${now.monthLong}-${now.day}${suffix}-${now.year}`;
  }

  isCycle0Active() {
    const now = DateTime.now().setZone('America/Chicago');
    // Production dates: Nov 17, 2025 - Jan 7, 2026
    const startDate = DateTime.fromISO('2025-11-17', { zone: 'America/Chicago' }).startOf('day');
    const endDate = DateTime.fromISO('2026-01-07', { zone: 'America/Chicago' }).endOf('day');
    return now >= startDate && now <= endDate;
  }

  isRoomForTodayCycle0(name) {
    return name === this.getCurrentCycle0RoomName();
  }

  getOrdinalSuffix(d) {
    if (d >= 11 && d <= 13) return 'th';
    switch (d % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  async checkRoomExists(roomName, retried = false) {
    try {
      console.log('🔗 Calling API:', `${this.serverUrl}/api/rooms/my-rooms`);
      console.log('🔑 Using token:', this.authToken ? 'Present' : 'Missing');

      const res = await axios.get(
        `${this.serverUrl}/api/rooms/my-rooms`,
        { headers: { 'Authorization': `Bearer ${this.authToken}` } }
      );

      console.log(`🔍 Searching for room: "${roomName}"`);

      // Try different possible response structures
      let rooms = res.data.rooms || res.data || [];
      if (Array.isArray(res.data)) {
        rooms = res.data;
      }

      console.log(`📋 Found ${rooms.length} rooms`);

      // Search through the rooms to find one with matching name
      const room = rooms.find(r =>
        r.name === roomName ||
        r.roomName === roomName ||
        r.displayName === roomName
      );

      if (room) {
        console.log(`✅ Found room "${roomName}" with ID:`, room.id || room.roomId || room._id);
        return room.id || room.roomId || room._id;
      } else {
        console.log(`❌ Room "${roomName}" not found in available rooms`);
        return null;
      }
    } catch (err) {
      // If token expired/invalid, re-authenticate and retry once
      if (!retried && err.response?.status === 403) {
        console.log('🔄 Token expired, re-authenticating...');
        this.authToken = null;
        this.userId = null;
        if (await this.authenticate()) {
          return this.checkRoomExists(roomName, true);
        }
      }
      console.error('❌ checkRoomExists failed:', err.message);
      return null;
    }
  }

  async sendMessage(roomId, text, retried = false) {
    try {
      await axios.post(
        `${this.serverUrl}/api/messages`,
        { roomId, content: text },
        { headers: { 'Authorization': `Bearer ${this.authToken}` } }
      );
    } catch (err) {
      if (!retried && err.response?.status === 403) {
        console.log('🔄 Token expired on sendMessage, re-authenticating...');
        this.authToken = null;
        this.userId = null;
        if (await this.authenticate()) {
          return this.sendMessage(roomId, text, true);
        }
      }
      console.error('❌ sendMessage failed:', err.message);
    }
  }

  isBusinessHours() {
    const now = DateTime.now().setZone('America/Chicago');
    const mins = now.hour * 60 + now.minute;
    return mins >= 600 && mins <= 1170; // 10:00 - 19:30
  }

  isRoomForToday(name) {
    return name === this.getCurrentRoomName();
  }
  // Safety message rotation that never stalls mid-day
  async sendSafetyMessage() {
    if (!this.isBusinessHours()) {
      console.log('⏰ Not business hours, skipping safety message');
      return;
    }
    if (!this.authToken && !(await this.authenticate())) {
      console.log('❌ Authentication failed, skipping safety message');
      return;
    }
    const room = this.getCurrentRoomName();
    console.log(`🔍 Looking for room: ${room}`);
    const roomId = await this.checkRoomExists(room);
    if (!roomId) {
      console.log(`❌ Room not found: ${room}`);
      return;
    }
    if (!this.isRoomForToday(room)) {
      console.log(`⚠️ Room is not for today: ${room}`);
      return;
    }
    console.log(`✅ Found room ID: ${roomId}`);

    // Ensure we always have an order to pull from
    if (!Array.isArray(this.dailyOrder) || this.dailyOrder.length === 0) {
      const count = this.safetyMessages.length;
      const indices = Array.from({ length: count }, (_, i) => i);
      for (let i = count - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      this.dailyOrder = indices;
      this.state.order = indices;
      this.messageIndex = 0;
      this.state.index = 0;
      this.saveState();
    }

    // If we have sent all messages today, reshuffle and continue
    if (this.messageIndex >= this.dailyOrder.length) {
      const count = this.safetyMessages.length;
      const indices = Array.from({ length: count }, (_, i) => i);
      for (let i = count - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      this.dailyOrder = indices;
      this.state.order = indices;
      this.messageIndex = 0;
      this.state.index = 0;
      this.saveState();
    }

    const idx = this.dailyOrder[this.messageIndex];
    const msg = this.safetyMessages[idx];
    this.messageIndex++;
    this.state.index = this.messageIndex;
    this.saveState();
    await this.sendMessage(roomId, msg);
    console.log('✅ Safety message sent successfully');
  }

  isCycle0BusinessHours() {
    const now = DateTime.now().setZone('America/Chicago');
    const mins = now.hour * 60 + now.minute;
    return mins >= 455 && mins <= 1115; // 7:35 - 18:35
  }

  async sendCycle0SafetyMessage() {
    if (!this.isCycle0Active()) return;
    if (!this.isCycle0BusinessHours()) {
      console.log('⏰ Not Cycle0 business hours, skipping safety message');
      return;
    }
    if (!this.authToken && !(await this.authenticate())) {
      console.log('❌ Authentication failed, skipping Cycle0 safety message');
      return;
    }
    const room = this.getCurrentCycle0RoomName();
    console.log(`🔍 Looking for Cycle0 room: ${room}`);
    const roomId = await this.checkRoomExists(room);
    if (!roomId) {
      console.log(`❌ Cycle0 Room not found: ${room}`);
      return;
    }
    if (!this.isRoomForTodayCycle0(room)) {
      console.log(`⚠️ Cycle0 Room is not for today: ${room}`);
      return;
    }
    console.log(`✅ Found Cycle0 room ID: ${roomId}`);

    // Ensure we always have an order to pull from
    if (!Array.isArray(this.dailyOrder) || this.dailyOrder.length === 0) {
      const count = this.safetyMessages.length;
      const indices = Array.from({ length: count }, (_, i) => i);
      for (let i = count - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      this.dailyOrder = indices;
      this.state.order = indices;
      this.messageIndex = 0;
      this.state.index = 0;
      this.saveState();
    }

    // If we have sent all messages today, reshuffle and continue
    if (this.messageIndex >= this.dailyOrder.length) {
      const count = this.safetyMessages.length;
      const indices = Array.from({ length: count }, (_, i) => i);
      for (let i = count - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      this.dailyOrder = indices;
      this.state.order = indices;
      this.messageIndex = 0;
      this.state.index = 0;
      this.saveState();
    }

    const idx = this.dailyOrder[this.messageIndex];
    const msg = this.safetyMessages[idx];
    this.messageIndex++;
    this.state.index = this.messageIndex;
    this.saveState();
    await this.sendMessage(roomId, msg);
    console.log('✅ Cycle0 Safety message sent successfully');
  }

  async sendHydrationMessage() {
    const now = DateTime.now().setZone('America/Chicago');
    if (now.month < 5 || now.month > 9) return;
    if (!this.authToken && !(await this.authenticate())) return;
    const room = this.getCurrentRoomName();
    const roomId = await this.checkRoomExists(room);
    if (!roomId || !this.isRoomForToday(room)) return;
    const text = `💧 *Reading this? Take a drink — right now.*
Thirst means you're already behind. Sip often, don't wait. Dehydration ends routes — don't let the heat take yours. 🌊`;
    await this.sendMessage(roomId, text);
  }

  async sendHeatReminderMessage() {
    const now = DateTime.now().setZone('America/Chicago');
    if (now.month < 5 || now.month > 9) return;
    if (!this.authToken && !(await this.authenticate())) return;
    const room = this.getCurrentRoomName();
    const roomId = await this.checkRoomExists(room);
    if (!roomId || !this.isRoomForToday(room)) return;
    const text = `🌡️ *Beat the Texas Heat — half your route done by 2 PM.* @all

The heat peaks in the afternoon. Knock out *more than half your stops before 2 PM*, while it's cooler and you're fresh — that's your buffer when it gets brutal.

Start strong, stay organized, manage your time. We've got your back — now go get ahead of it. 🔥`;
    await this.sendMessage(roomId, text);
  }

  async sendClockInReminderMessage() {
    if (!this.authToken && !(await this.authenticate())) return;
    const room = this.getCurrentRoomName();
    const roomId = await this.checkRoomExists(room);
    if (!roomId || !this.isRoomForToday(room)) return;
    const text = `*Attention Titans*
@all This is your daily reminder to clock-in. Please ensure you clock in and if you are unable to clock in make sure you edit your timecard in the ADP app. If you have an issue to see an onsite manager to help you. Thank you!`;
    await this.sendMessage(roomId, text);
  }

  // Daily "read the messages" nudge — pinned slot so the read-daily expectation lands
  // every morning, not just when the rotation happens to surface it.
  async sendReadTheMessagesReminder() {
    if (!this.authToken && !(await this.authenticate())) return;
    const room = this.getCurrentRoomName();
    const roomId = await this.checkRoomExists(room);
    if (!roomId || !this.isRoomForToday(room)) return;
    const text = `😏 *Real talk.* @all I don't send these messages out for my own health — my expectation is you *read these daily.* They're not just daily expectations… they may literally *save your life.* So do me a favor: actually read them. 📖`;
    await this.sendMessage(roomId, text);
  }

  // Daily morning ORCAS suspension notice — drivers must know the consequences BEFORE
  // they roll, to cut the mid-route suspensions. Source: Amazon ORCAS Program Resource
  // Guide (authoritative). Numbers are EXACT — do not alter.
  async sendOrcasSuspensionMessage() {
    if (!this.authToken && !(await this.authenticate())) return;
    const room = this.getCurrentRoomName();
    const roomId = await this.checkRoomExists(room);
    if (!roomId || !this.isRoomForToday(room)) return;
    const text = `🛑 *Know this BEFORE you roll — it protects your job.* @all

Amazon makes the suspension/deactivation call straight from your driving record + Netradyne video. INFI does *not* control that — which is why you have to protect yourself.

*Speeding, phone/distraction, following too close, seatbelt off* (Netradyne tracks it; ~5+ events in 10 trips = an occurrence):
• 1st: pulled for training — you miss work that day.
• 2nd in 90 days: account *suspended* + retrained.
• 3rd in 90 days: *permanently banned* from delivering for Amazon. Done.

*Serious events — hard braking at speed, near-collision, major distraction:*
• 1st: your *route is paused on the spot.* You park, stop delivering, reach out to dispatch immediately.
• 2nd: account shut off. • 3rd: permanent ban.

This is Amazon's ORCAS process. Once your record hits those thresholds I have very little room to undo it. The goal is *ZERO.* Seatbelt on, phone down + mounted, slow down, keep your distance. Handle that and none of this ever touches you. — Danny`;
    await this.sendMessage(roomId, text);
  }

  async sendCycle0ClockInReminderMessage() {
    if (!this.isCycle0Active()) return;
    if (!this.authToken && !(await this.authenticate())) return;
    const room = this.getCurrentCycle0RoomName();
    const roomId = await this.checkRoomExists(room);
    if (!roomId || !this.isRoomForTodayCycle0(room)) return;
    const text = `*Attention Titans*
@all This is your daily reminder to clock-in. Please ensure you clock in and if you are unable to clock in make sure you edit your timecard in the ADP app. If you have an issue to see an onsite manager to help you. Thank you!`;
    await this.sendMessage(roomId, text);
  }

  async sendFridayTimecardReminder() {
    if (!this.authToken && !(await this.authenticate())) return;
    const roomId = await this.checkRoomExists('general');
    if (!roomId) {
      console.error('❌ Could not find general room');
      return;
    }
    const msg = `@all *Attention Titans*
Here's your reminder for you to check and ensure your timecard is accurate. If it's not accurate or you missed a timecard punch you must edit your punch in the ADP app AND your lunch punch must match your timecard. Failure to properly edit your timecard and verify all punches are correct will affect your next paycheck and no fixes will be implemented until the next payroll is processed 2 weeks later. Take this Seriously!`;
    await this.sendMessage(roomId, msg);
  }

  async sendSaturdayTimecardReminder() {
    if (!this.authToken && !(await this.authenticate())) return;
    const roomId = await this.checkRoomExists('general');
    if (!roomId) {
      console.error('❌ Could not find general room');
      return;
    }
    const msg = `@all *Final Reminder*
Did you remember to check your timecard? If you haven't now's the time to do so. All timecard edits should be submitted no later than midnight tonight. Failure to properly edit your timecard and verify all punches are correct will affect your next paycheck and no fixes will be implemented until the next payroll is processed 2 weeks later. Take this Seriously!`;
    await this.sendMessage(roomId, msg);
  }

  async sendRtsReminderMessage() {
    if (!this.authToken && !(await this.authenticate())) return;
    const room = this.getCurrentRoomName();
    const roomId = await this.checkRoomExists(room);
    if (!roomId || !this.isRoomForToday(room)) return;
    const msg = `📌 *RTS Checklist — finish clean.* @all

🔎 *Van check:* any missorts or missing packages? Reattempt missing packages; deliver missorts within a 15-minute radius.

🧹 *Clean your van:* trash out, wiped down, swept. You may not have it tomorrow — don't leave your mess for someone else.

🎒 *Bag check:* work device 📱, gas card 💳, keys 🔑, and portable charger 🔋 all inside.

⏱️ *Post-trip:* wait the full 2 minutes (standard) / 3 minutes (step van).

✅ *Show the manager your ADP punches* before you leave — make sure they're recorded. This protects your paycheck.`;
    await this.sendMessage(roomId, msg);
  }

  async sendCycle0RtsReminderMessage() {
    if (!this.isCycle0Active()) return;
    if (!this.authToken && !(await this.authenticate())) return;
    const room = this.getCurrentCycle0RoomName();
    const roomId = await this.checkRoomExists(room);
    if (!roomId || !this.isRoomForTodayCycle0(room)) return;
    const msg = `📌 *RTS Checklist — finish clean.* @all

🔎 *Van check:* any missorts or missing packages? Reattempt missing packages; deliver missorts within a 15-minute radius.

🧹 *Clean your van:* trash out, wiped down, swept. You may not have it tomorrow — don't leave your mess for someone else.

🎒 *Bag check:* work device 📱, gas card 💳, keys 🔑, and portable charger 🔋 all inside.

⏱️ *Post-trip:* wait the full 2 minutes (standard) / 3 minutes (step van).

✅ *Show the manager your ADP punches* before you leave — make sure they're recorded. This protects your paycheck.`;
    await this.sendMessage(roomId, msg);
  }

  async sendLunchReminderMessage() {
    if (!this.authToken && !(await this.authenticate())) return;
    const room = this.getCurrentRoomName();
    const roomId = await this.checkRoomExists(room);
    if (!roomId || !this.isRoomForToday(room)) return;
    const msg = `@all 🍽️ Titans! It's Lunch Time! 🕒

Just a quick reminder — lunches are mandatory and must be exactly 30 minutes. ⏳
➡️ No more, no less.
❌ You cannot combine lunch with your breaks.
🚗 Travel time to and from your lunch spot counts as part of your 30-minute lunch.

🛑 You must stop delivering during your 30-minute lunch break — no exceptions.
📲 Use *both* the Flex App and ADP to properly record your lunch period.
🔄 Your timecard punches must match your break time in the app.

⚠️ *Failure to properly record your lunch punches will result in Disciplinary Action.*

Enjoy your lunch and recharge! 💪🥗🍔`;
    await this.sendMessage(roomId, msg);
  }

  async sendCycle0LunchReminderMessage() {
    if (!this.isCycle0Active()) return;
    if (!this.authToken && !(await this.authenticate())) return;
    const room = this.getCurrentCycle0RoomName();
    const roomId = await this.checkRoomExists(room);
    if (!roomId || !this.isRoomForTodayCycle0(room)) return;
    const msg = `@all 🍽️ Titans! It's Lunch Time! 🕒

Just a quick reminder — lunches are mandatory and must be exactly 30 minutes. ⏳
➡️ No more, no less.
❌ You cannot combine lunch with your breaks.
🚗 Travel time to and from your lunch spot counts as part of your 30-minute lunch.

🛑 You must stop delivering during your 30-minute lunch break — no exceptions.
📲 Use *both* the Flex App and ADP to properly record your lunch period.
🔄 Your timecard punches must match your break time in the app.

⚠️ *Failure to properly record your lunch punches will result in Disciplinary Action.*

Enjoy your lunch and recharge! 💪🥗🍔`;
    await this.sendMessage(roomId, msg);
  }

  async sendDeliveryCountdownReminder1130() {
    if (!this.authToken && !(await this.authenticate())) return;
    const room = this.getCurrentRoomName();
    const roomId = await this.checkRoomExists(room);
    if (!roomId || !this.isRoomForToday(room)) return;
    const msg = `@all *Attention Titans*

You have 7 hours and 0 minutes left in your delivery day. Ensure you are keeping a great pace and complete all deliveries before 6:30pm to avoid breaking our promise. You got this! 💪`;
    await this.sendMessage(roomId, msg);
  }

  async sendDeliveryCountdownReminder1330() {
    if (!this.authToken && !(await this.authenticate())) return;
    const room = this.getCurrentRoomName();
    const roomId = await this.checkRoomExists(room);
    if (!roomId || !this.isRoomForToday(room)) return;
    const msg = `@all *Attention Titans*

You have 5 hours and 0 minutes left in your delivery day. Keep up the pace! 💪`;
    await this.sendMessage(roomId, msg);
  }

  async sendDeliveryCountdownReminder1530() {
    if (!this.authToken && !(await this.authenticate())) return;
    const room = this.getCurrentRoomName();
    const roomId = await this.checkRoomExists(room);
    if (!roomId || !this.isRoomForToday(room)) return;
    const msg = `@all *Attention Titans*

You have 3 hours and 0 minutes left in your delivery day. Let’s finish strong! 💪`;
    await this.sendMessage(roomId, msg);
  }

  async sendDeliveryCountdownReminder1730() {
    if (!this.authToken && !(await this.authenticate())) return;
    const room = this.getCurrentRoomName();
    const roomId = await this.checkRoomExists(room);
    if (!roomId || !this.isRoomForToday(room)) return;
    const msg = `@all *Attention Titans!* Last hour remaining! 💥 Let's push through and complete the delivery day safely! 💪`;
    await this.sendMessage(roomId, msg);
  }

  async sendCycle0DeliveryCountdownReminder0905() {
    if (!this.isCycle0Active()) return;
    if (!this.authToken && !(await this.authenticate())) return;
    const room = this.getCurrentCycle0RoomName();
    const roomId = await this.checkRoomExists(room);
    if (!roomId || !this.isRoomForTodayCycle0(room)) return;
    const msg = `@all *Attention Titans*

You have 7 hours and 0 minutes left in your delivery day. Ensure you are keeping a great pace and complete all deliveries before 4:05pm to avoid breaking our promise. You got this! 💪`;
    await this.sendMessage(roomId, msg);
  }

  async sendCycle0DeliveryCountdownReminder1105() {
    if (!this.isCycle0Active()) return;
    if (!this.authToken && !(await this.authenticate())) return;
    const room = this.getCurrentCycle0RoomName();
    const roomId = await this.checkRoomExists(room);
    if (!roomId || !this.isRoomForTodayCycle0(room)) return;
    const msg = `@all *Attention Titans*

You have 5 hours and 0 minutes left in your delivery day. Keep up the pace! 💪`;
    await this.sendMessage(roomId, msg);
  }

  async sendCycle0DeliveryCountdownReminder1305() {
    if (!this.isCycle0Active()) return;
    if (!this.authToken && !(await this.authenticate())) return;
    const room = this.getCurrentCycle0RoomName();
    const roomId = await this.checkRoomExists(room);
    if (!roomId || !this.isRoomForTodayCycle0(room)) return;
    const msg = `@all *Attention Titans*

You have 3 hours and 0 minutes left in your delivery day. Let's finish strong! 💪`;
    await this.sendMessage(roomId, msg);
  }

  async sendCycle0DeliveryCountdownReminder1505() {
    if (!this.isCycle0Active()) return;
    if (!this.authToken && !(await this.authenticate())) return;
    const room = this.getCurrentCycle0RoomName();
    const roomId = await this.checkRoomExists(room);
    if (!roomId || !this.isRoomForTodayCycle0(room)) return;
    const msg = `@all *Attention Titans!* Last hour remaining! 💥 Let's push through and complete the delivery day safely! 💪`;
    await this.sendMessage(roomId, msg);
  }

  async sendImageReminder(imageName) {
    try {
      const room = this.getCurrentRoomName();
      const roomId = await this.checkRoomExists(room);
      if (!roomId || !this.isRoomForToday(room)) return;
      const imgPath = path.join(__dirname, 'images', imageName);
      const stats = fs.statSync(imgPath);
      const form = new FormData();
      form.append('file', fs.createReadStream(imgPath), {
        knownLength: stats.size,
        filename: imageName
      });
      form.append('roomId', roomId);
      await axios.post(
        `${this.serverUrl}/api/v1/rooms.upload`,
        form,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            ...form.getHeaders()
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );
    } catch (err) {
      console.error(`❌ sendImageReminder failed for ${imageName}:`, err.message);
    }
  }

  async sendRandomImageReminder() {
    try {
      if (!this.authToken && !(await this.authenticate())) return;
      const images = ['dogs.jpg', 'leadwithsafety.jpg', 'stopsigns.jpg'];
      const today = this.getToday();
      const used = this.state.usedImages[today] || [];
      const avail = images.filter(i => !used.includes(i));
      if (!avail.length) return;
      const choice = avail[Math.floor(Math.random() * avail.length)];
      await this.sendImageReminder(choice);
      this.state.usedImages[today] = this.state.usedImages[today] || [];
      this.state.usedImages[today].push(choice);
      this.saveState();
    } catch (err) {
      console.error('❌ sendRandomImageReminder failed:', err.message);
    }
  }
  getToday() {
    return DateTime.now().setZone('America/Chicago').toFormat('yyyy-MM-dd');
  }

  async sendPacingReminderMessage() {
    if (!this.authToken && !(await this.authenticate())) return;
    const room = this.getCurrentRoomName();
    const roomId = await this.checkRoomExists(room);
    if (!roomId || !this.isRoomForToday(room)) return;
    const msg = `⏱️ *Pace Check — keep each stop near 2 minutes.*

Stuck on one stop? *Skip it and keep moving.* One problem package is not worth falling behind on your whole route — that's how completion (DCR) slips.

You own your route. Protect your pace and finish strong. 💪`;
    await this.sendMessage(roomId, msg);
  }

  async sendCycle0PacingReminderMessage() {
    if (!this.isCycle0Active()) return;
    if (!this.authToken && !(await this.authenticate())) return;
    const room = this.getCurrentCycle0RoomName();
    const roomId = await this.checkRoomExists(room);
    if (!roomId || !this.isRoomForTodayCycle0(room)) return;
    const msg = `⏱️ *Pace Check — keep each stop near 2 minutes.*

Stuck on one stop? *Skip it and keep moving.* One problem package is not worth falling behind on your whole route — that's how completion (DCR) slips.

You own your route. Protect your pace and finish strong. 💪`;
    await this.sendMessage(roomId, msg);
  }

  async sendEarlyBreakReminderMessage() {
    if (!this.authToken && !(await this.authenticate())) return;
    const room = this.getCurrentRoomName();
    const roomId = await this.checkRoomExists(room);
    if (!roomId || !this.isRoomForToday(room)) return;
    const msg = `⏰ *Stop before your 1st delivery? That counts as your 1st break.*
Restroom, food, coffee — handle it *before* you leave the station. Every stop you make before your first delivery puts you behind and burns a break you'll want later.
Come prepared. Start strong. Stay ahead. 🚀`;
    await this.sendMessage(roomId, msg);
  }

  async sendCycle0EarlyBreakReminderMessage() {
    if (!this.isCycle0Active()) return;
    if (!this.authToken && !(await this.authenticate())) return;
    const room = this.getCurrentCycle0RoomName();
    const roomId = await this.checkRoomExists(room);
    if (!roomId || !this.isRoomForTodayCycle0(room)) return;
    const msg = `⏰ *Stop before your 1st delivery? That counts as your 1st break.*
Restroom, food, coffee — handle it *before* you leave the station. Every stop you make before your first delivery puts you behind and burns a break you'll want later.
Come prepared. Start strong. Stay ahead. 🚀`;
    await this.sendMessage(roomId, msg);
  }

  async sendImmediateMessageToDanny() {
    if (!this.authToken && !(await this.authenticate())) return;
    try {
      // Look up Danny's user ID by username
      const recipientId = await this.getUserIdByUsername(this.dannyUsername);
      if (!recipientId) {
        console.error('❌ Could not find user ID for:', this.dannyUsername);
        return;
      }
      
      const res = await axios.post(
        `${this.serverUrl}/api/direct-messages/start`,
        { recipientId: recipientId },
        { headers: { 'Authorization': `Bearer ${this.authToken}` } }
      );
      const roomId = res.data.room.id;
      const text = `🤖 Automation launched at ${DateTime.now().setZone('America/Chicago').toLocaleString()}`;
      await this.sendMessage(roomId, text);
      console.log('✅ Startup message sent to', this.dannyUsername);
    } catch (err) {
      console.error('❌ sendImmediateMessageToDanny failed:', err.message);
      console.error('Response:', err.response?.data);
    }
  }

  // Proper Van Issue Reporting message at 9:40 daily
  async sendVanIssueReportingMessage() {
    if (!this.authToken && !(await this.authenticate())) return;
    const room = this.getCurrentRoomName();
    const roomId = await this.checkRoomExists(room);
    if (!roomId || !this.isRoomForToday(room)) return;

    const msg = `🚚 *Van Issue? Report it the right way.*

1️⃣ Post the issue in *#on_road_van_issues* — tag *@Jessie* and *@Dylan* in the text (not on a photo upload).
2️⃣ You'll get a 👍 and a DM with next steps from Jessie or Dylan.

🛑 *Issue found while still at the station? DO NOT LEAVE* until a manager clears it.
Skipping this step = disciplinary action. This one protects you — follow it every time.`;

    await this.sendMessage(roomId, msg);
  }

  async sendCycle0VanIssueReportingMessage() {
    if (!this.isCycle0Active()) return;
    if (!this.authToken && !(await this.authenticate())) return;
    const room = this.getCurrentCycle0RoomName();
    const roomId = await this.checkRoomExists(room);
    if (!roomId || !this.isRoomForTodayCycle0(room)) return;

    const msg = `🚚 *Van Issue? Report it the right way.*

1️⃣ Post the issue in *#on_road_van_issues* — tag *@Jessie* and *@Dylan* in the text (not on a photo upload).
2️⃣ You'll get a 👍 and a DM with next steps from Jessie or Dylan.

🛑 *Issue found while still at the station? DO NOT LEAVE* until a manager clears it.
Skipping this step = disciplinary action. This one protects you — follow it every time.`;

    await this.sendMessage(roomId, msg);
  }

  startAutomation() {
    // Redeployed 2026-03-08 to fix DST cron scheduling issue
    console.log(`🚀 Starting Automation at ${DateTime.now().setZone('America/Chicago').toLocaleString()}`);
    // Try to send startup DM, but don't let it stop the bot if it fails
    this.sendImmediateMessageToDanny().catch(err => {
      console.error('⚠️ Startup DM failed, but continuing automation:', err.message);
    });

    // REGULAR DAILY ROOM SCHEDULES (unchanged)
    cron.schedule('0,30 10-19 * * *', () => this.sendSafetyMessage(), { timezone: 'America/Chicago' });
    cron.schedule('0 10-18 * 5-9 *', () => this.sendHydrationMessage(), { timezone: 'America/Chicago' });
    cron.schedule('0 9 * 5-9 *', () => this.sendHeatReminderMessage(), { timezone: 'America/Chicago' });
    cron.schedule('20 9 * * *', () => this.sendOrcasSuspensionMessage(), { timezone: 'America/Chicago' });
    cron.schedule('25 9 * * *', () => this.sendClockInReminderMessage(), { timezone: 'America/Chicago' });
    cron.schedule('30 9 * * *', () => this.sendReadTheMessagesReminder(), { timezone: 'America/Chicago' });
    cron.schedule('15 9 * * *', () => this.sendPacingReminderMessage(), { timezone: 'America/Chicago' });
    // 9:40 messages
    cron.schedule('40 9 * * *', () => this.sendEarlyBreakReminderMessage(), { timezone: 'America/Chicago' });
    cron.schedule('40 9 * * *', () => this.sendVanIssueReportingMessage(), { timezone: 'America/Chicago' });
    cron.schedule('15 13 * * *', () => this.sendPacingReminderMessage(), { timezone: 'America/Chicago' });
    cron.schedule('15 16 * * *', () => this.sendPacingReminderMessage(), { timezone: 'America/Chicago' });
    cron.schedule('0 8 * * 5', () => this.sendFridayTimecardReminder(), { timezone: 'America/Chicago' });
    cron.schedule('0 17 * * 6', () => this.sendSaturdayTimecardReminder(), { timezone: 'America/Chicago' });
    cron.schedule('0 18 * * *', () => this.sendRtsReminderMessage(), { timezone: 'America/Chicago' });
    // Lunch reminders: 2:00 PM and 2:30 PM
    cron.schedule('0 14 * * *', () => this.sendLunchReminderMessage(), { timezone: 'America/Chicago' });
    cron.schedule('30 14 * * *', () => this.sendLunchReminderMessage(), { timezone: 'America/Chicago' });
    // Delivery countdowns
    cron.schedule('30 11 * * *', () => this.sendDeliveryCountdownReminder1130(), { timezone: 'America/Chicago' });
    cron.schedule('30 13 * * *', () => this.sendDeliveryCountdownReminder1330(), { timezone: 'America/Chicago' });
    cron.schedule('30 15 * * *', () => this.sendDeliveryCountdownReminder1530(), { timezone: 'America/Chicago' });
    cron.schedule('30 17 * * *', () => this.sendDeliveryCountdownReminder1730(), { timezone: 'America/Chicago' });
    // Random images
    cron.schedule('15 10 * * *', () => this.sendRandomImageReminder(), { timezone: 'America/Chicago' });
    cron.schedule('15 12 * * *', () => this.sendRandomImageReminder(), { timezone: 'America/Chicago' });
    cron.schedule('15 15 * * *', () => this.sendRandomImageReminder(), { timezone: 'America/Chicago' });

    // CYCLE0 ROOM SCHEDULES (Nov 17, 2025 - Jan 7, 2026)
    // Safety messages: 7:35am - 4:35pm every 30 minutes
    cron.schedule('35,5 7-16 * * *', () => this.sendCycle0SafetyMessage(), { timezone: 'America/Chicago' });
    // Pacing reminder: 6:50am
    cron.schedule('50 6 * * *', () => this.sendCycle0PacingReminderMessage(), { timezone: 'America/Chicago' });
    // Clock-in reminder: 7:05am
    cron.schedule('5 7 * * *', () => this.sendCycle0ClockInReminderMessage(), { timezone: 'America/Chicago' });
    // Early break & van issue: 7:20am
    cron.schedule('20 7 * * *', () => this.sendCycle0EarlyBreakReminderMessage(), { timezone: 'America/Chicago' });
    cron.schedule('20 7 * * *', () => this.sendCycle0VanIssueReportingMessage(), { timezone: 'America/Chicago' });
    // Delivery countdowns: 9:05am, 11:05am, 1:05pm, 3:05pm
    cron.schedule('5 9 * * *', () => this.sendCycle0DeliveryCountdownReminder0905(), { timezone: 'America/Chicago' });
    cron.schedule('5 11 * * *', () => this.sendCycle0DeliveryCountdownReminder1105(), { timezone: 'America/Chicago' });
    cron.schedule('5 13 * * *', () => this.sendCycle0DeliveryCountdownReminder1305(), { timezone: 'America/Chicago' });
    cron.schedule('5 15 * * *', () => this.sendCycle0DeliveryCountdownReminder1505(), { timezone: 'America/Chicago' });
    // Lunch reminders: 11:35am and 12:05pm
    cron.schedule('35 11 * * *', () => this.sendCycle0LunchReminderMessage(), { timezone: 'America/Chicago' });
    cron.schedule('5 12 * * *', () => this.sendCycle0LunchReminderMessage(), { timezone: 'America/Chicago' });
    // RTS reminder: 3:35pm
    cron.schedule('35 15 * * *', () => this.sendCycle0RtsReminderMessage(), { timezone: 'America/Chicago' });
  }

  stopAutomation() {
    cron.getTasks().forEach(t => t.stop());
    console.log('⏹️ All automations stopped');
  }
}

// Launch the bot
(async () => {
  const bot = new RocketChatAutomation(
    process.env.ROCKET_CHAT_SERVER_URL,
    process.env.ROCKET_CHAT_USERNAME,
    process.env.ROCKET_CHAT_PASSWORD,
    process.env.DANNY_USERNAME
  );
  bot.startAutomation();
})();

// Optional: catch any unhandled promise rejections
process.on('unhandledRejection', err => {
  console.error('Unhandled rejection:', err);
});