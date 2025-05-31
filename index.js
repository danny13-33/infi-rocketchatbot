const RocketChatAutomation = require('./rocketChatAutomation');

const automation = new RocketChatAutomation(
    process.env.ROCKET_CHAT_SERVER_URL,
    process.env.ROCKET_CHAT_USERNAME,
    process.env.ROCKET_CHAT_PASSWORD,
    process.env.DANNY_USERNAME
);

automation.startAutomation();
