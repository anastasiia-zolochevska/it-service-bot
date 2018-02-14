import { ConversationTopic, ConversationTopicState, Prompt, Validator } from 'promptly-bot';
import { Computer, Platform } from '../model';
import { MessageStyler, CardStyler } from 'botbuilder';

export interface OrderComputerTopicState extends ConversationTopicState {
    computer: Computer;
    confirmed:  boolean
}

export class OrderComputerTopic extends ConversationTopic<OrderComputerTopicState, Computer> {

    public constructor(state: OrderComputerTopicState = { computer: {} as Computer, activeTopic: undefined, confirmed: false }) {
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
                    this.basicOnFailure(context, reason);
                })
            )
            .set("deviceClassPrompt", () => new Prompt<string>()
                .onPrompt((context, lastTurnReason) => {
                    return context.reply(`What is the deviceClass of the computer you are ordering?`);
                })
                .validator(new DoNothingValidator())
                .maxTurns(2)
                .onSuccess((context, value) => {
                    this.clearActiveTopic();

                    this.state.computer.deviceClass = value;

                    return this.onReceive(context);
                })
                .onFailure((context, reason) => {
                    this.basicOnFailure(context, reason);
                })
            )
            .set("osVersionPrompt", () => new Prompt<string>()
                .onPrompt((context, lastTurnReason) => {
                    return context.reply(`What is OS version of the computer you are ordering?`);
                })
                .validator(new DoNothingValidator())
                .maxTurns(2)
                .onSuccess((context, value) => {
                    this.clearActiveTopic();

                    this.state.computer.osVersion = value;

                    return this.onReceive(context);
                })
                .onFailure((context, reason) => {
                    this.basicOnFailure(context, reason);
                })
            )
            .set("confirmPrompt", () => new Prompt<string>()
                .onPrompt((context, lastTurnReason) => {
                    context.reply(`Got it. Platform: ${this.state.computer.platform}. Device class: ${this.state.computer.deviceClass}.  OS Version: ${this.state.computer.osVersion}.`);
                    context.reply(MessageStyler.attachment(
                        CardStyler.heroCard(
                            'Do you confirm ordering it?',
                            [],
                            ['Yes', 'No']
                        )
                    ));
                })
                .validator(new DoNothingValidator())
                .maxTurns(2)
                .onSuccess((context, value) => {
                    this.clearActiveTopic();

                    if(context.request.text && context.request.text.toLowerCase()=='no'){
                        return this._onFailure ? this._onFailure(context, 'userCancelled') : null;
                    }
                    else{
                        this.state.confirmed=true;
                    }

                    return this.onReceive(context);
                })
                .onFailure((context, reason) => {
                    this.basicOnFailure(context, reason);
                })
            )


    };

    public basicOnFailure(context: BotContext, reason: string) {
        this.clearActiveTopic();

        if (reason && reason === 'toomanyattempts') {
            context.reply(`I'm sorry I'm having issues understanding you.`);
        }

        return this._onFailure ? this._onFailure(context, reason) : null;
    }

    public onReceive(context: BotContext) {

        if (this.hasActiveTopic) {
            return this.activeTopic.onReceive(context);
        }

        if (!this.state.computer.platform) {
            return this.setActiveTopic("platformPrompt")
                .onReceive(context);
        }

        if (!this.state.computer.osVersion) {
            return this.setActiveTopic("osVersionPrompt")
                .onReceive(context);
        }


        if (!this.state.computer.deviceClass) {
            return this.setActiveTopic("deviceClassPrompt")
                .onReceive(context);
        }

        if (!this.state.confirmed) {
            return this.setActiveTopic("confirmPrompt")
                .onReceive(context);
        }

        return this._onSuccess ? this._onSuccess(context, this.state.computer) : null;
    }
}

class PlatformValidator extends Validator<string> {
    public validate(context: BotContext) {
        if (context.request.text && Object.keys(Platform).find(key => context.request.text != undefined && key.toLowerCase() == context.request.text.toLowerCase())) {
            return { value: context.request.text };
        } else {
            return { reason: 'platformInvalid' };
        }
    }
}

class DoNothingValidator extends Validator<string> {
    public validate(context: BotContext) {
        return { value: context.request.text };
    }
}