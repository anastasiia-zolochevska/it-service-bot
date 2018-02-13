import { MessageStyler, CardStyler } from "botbuilder";


export function processHelp(context: BotContext) {
    let helpRegexp = /^(Help|help)$/;
    let message = context.request.text || '';
    if (helpRegexp.test(message)) {
        context.reply(` 
            List of commands can be run anytime        
            - Show my open orders
            - Show my closed orders
            - I forgot my password
    `);
        return true;
    }
    return false;
}
export function processGreeting(context: BotContext) {
    let greetingRegexp = /^(hi|Hi|HI|hI|hello|Hello|HELLO|greetings|Greetings|good morning|Good morning|Good Morning|good afternoon|Good afternoon|Good Afternoon|hi |Hi |HI |hI |hello |Hello |HELLO |greetings |Greetings |good morning |Good morning |Good Morning |good afternoon |Good afternoon |Good Afternoon )$/
    let message = context.request.text || '';
    if (greetingRegexp.test(message)) {
        context.reply(`regexp: Hello! How can I help you?`);
        return true;
    }
    return false;
}


export function processAgentCall(context: BotContext) {
    let agentRegexp = /^(Agent|agent|Connect to Agent)$/;
    let message = context.request.text || '';
    if (agentRegexp.test(message)) {
        context.reply(`Agent service is not available yet `);
        return true;
    }
    return false;
}

export function processCancel(context: BotContext) {
    let agentRegexp = /^(never mind|cancel|Never mind|Cancel)$/;
    let message = context.request.text || '';
    if (agentRegexp.test(message) && context.state.conversation) {
        context.state.conversation.prompt = undefined;
        // context.reply(`Ok. I see you are not interested in continuing pervious conversation. Do you want to call an agent?`);
        return true;
    }
    return false;
}
