import { ConversationTopic, ConversationTopicState, Prompt, Validator } from 'promptly-bot';
import { Computer, Platform } from '../model';

export interface OrderComputerTopicState extends ConversationTopicState {
    computer: Computer;
}

export class OrderComputerTopic extends ConversationTopic<OrderComputerTopicState, Computer> {

    public constructor(state: OrderComputerTopicState = { computer: {} as Computer, activeTopic: undefined }) {
        super(state);

        this.subTopics
            .set("platformPrompt", () => new Prompt<string>()
                .onPrompt((context, lastTurnReason) => {

                    if (lastTurnReason && lastTurnReason === 'platformInvalid') {
                        context.reply(`Sorry, can't recognize this platfrom.`)
                            .reply(`Possible values are: Windows, Unix, MacOs.`);
                    }

                    return context.reply(`What is the platfrom of the computer you are ordering?`);
                })
                .validator(new PlatformValidator())
                .maxTurns(2)
                .onSuccess((context, value) => {
                    this.clearActiveTopic();

                    this.state.computer.platform = value as Platform;

                    return this.onReceive(context);
                })
                .onFailure((context, reason) => {
                    this.clearActiveTopic();

                    if (reason && reason === 'toomanyattempts') {
                        context.reply(`I'm sorry I'm having issues understanding you.`);
                    }

                    return this._onFailure ? this._onFailure(context, reason) : null;
                })
            )
            .set("osVersionPrompt", () => new Prompt<string>()
                .onPrompt((context, lastTurnReason) => {
                    return context.reply(`What is OS version of the computer you are ordering?`);
                })
                // .validator(new AlarmTimeValidator())
                .maxTurns(2)
                .onSuccess((context, value) => {
                    this.clearActiveTopic();

                    this.state.computer.osVersion = value;

                    return this.onReceive(context);
                })
                .onFailure((context, reason) => {
                    this.clearActiveTopic();

                    if (reason && reason === 'toomanyattempts') {
                        return context.reply(`I'm sorry I'm having issues understanding you.`);
                    }

                    return this._onFailure ? this._onFailure(context, reason) : null;
                })
            );
    };

    public onReceive(context: BotContext) {

        if (this.hasActiveTopic) {
            return this.activeTopic.onReceive(context);
        }

        if (!this.state.computer.platform) {
            return this.setActiveTopic("platfromPrompt")
                .onReceive(context);
        }

        if (!this.state.computer.osVersion) {
            return this.setActiveTopic("osVersionPrompt")
                .onReceive(context);
        }

        return this._onSuccess ? this._onSuccess(context, this.state.computer) : null;
    }
}

class PlatformValidator extends Validator<string> {
    public validate(context: BotContext) {
        if (context.request.text && Object.keys(Platform).find(key => context.request.text != undefined && key.toLowerCase() == context.request.text.toLowerCase())) {
            return { reason: 'platformInvalid' };
        } else {
            return { value: context.request.text };
        }
    }
}

// class AlarmTimeValidator extends Validator<string> {
//     public validate(context: BotContext) {
//         return { value: context.request.text };
//     }
// }