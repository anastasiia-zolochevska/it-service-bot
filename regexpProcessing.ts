import { MessageStyler, CardStyler } from "botbuilder";

export function processHelp(context: BotContext) {
    context.reply(` 
            List of commands can be run anytime        
            - Show my open orders
            - Show my closed orders
            - I forgot my password`);
}

export function processGreeting(context: BotContext) {
    context.reply(`regexp: Hello! How can I help you?`);
}


export function processAgentCall(context: BotContext) {
    context.reply(`Agent service is not available yet `);
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
