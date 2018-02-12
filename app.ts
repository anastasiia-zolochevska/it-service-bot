import { Bot, MessageStyler, CardStyler } from 'botbuilder';
import { BotFrameworkAdapter } from 'botbuilder-services';
import *  as restify from 'restify';

import { LuisRecognizer, QnAMaker, QnAMakerResult } from 'botbuilder-ai';

const appId = '992b6593-cf27-4486-925d-8d6a732eb57c';
const subscriptionKey = '833384c5334b48aa8b6843518fc32a46';
let model: LuisRecognizer = new LuisRecognizer(appId, subscriptionKey);


// Create server
let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log(`${server.name} listening to ${server.url}`);
});

// Create adapter and listen to servers '/api/messages' route.
const adapter: BotFrameworkAdapter = new BotFrameworkAdapter({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});


const qna = new QnAMaker({
    knowledgeBaseId: '0bda7583-c683-4b95-a8a5-d79166ad48c3',
    subscriptionKey: '640b8d79871a4b2382e99f71d25ef945',
    top: 4,
    scoreThreshold: 0.5
});


server.post('/api/messages', (adapter as any).listen());

let luisConfidenceLevel = 0.5

const bot = new Bot(adapter)
    .onReceive((context: BotContext) => {
        console.log('context', context);
        if (context.request.type === 'message') {
            let message = context.request.text || '';

            let greetingRegexp = /^(hi|Hi|HI|hI|hello|Hello|HELLO|greetings|Greetings|good morning|Good morning|Good Morning|good afternoon|Good afternoon|Good Afternoon|hi |Hi |HI |hI |hello |Hello |HELLO |greetings |Greetings |good morning |Good morning |Good Morning |good afternoon |Good afternoon |Good Afternoon )$/
            let agentRegexp = /^(Agent|agent|Connect to Agent)$/;
            let helpRegexp = /^(Help|help)$/;

            if (helpRegexp.test(message)) {
                context.reply(` 
    List of commands can be run anytime        
      - Show my open orders
      - Show my closed orders
      - I forgot my password
            `);
                return;
            }


            if (greetingRegexp.test(message)) {
                context.reply(`regexp: Hello! How can I help you?`);
                return;
            }


            if (agentRegexp.test(message)) {
                context.reply(`Agent service is not available yet `);
                return;
            }

            return model.recognize(context)
                .then((intents) => LuisRecognizer.findTopIntent(intents))

                .then((intent) => {
                    console.log(intent);
                    if (intent && intent.score > luisConfidenceLevel && intent.name != "None") {
                        switch (intent.name) {
                            case 'openOrders':
                                context.reply(processOpenOrderIntent());
                                break;
                            case 'closedOrders':
                                context.reply(processClosedOrderIntent());
                                break;
                            default:
                                context.reply(`Luis. Can't process intent: ${intent.name}`)
                        }
                    }
                    else {
                        const utterance = context.request.text || '';
                        return qna.getAnswers(utterance)
                            .then((results: QnAMakerResult[]) => {
                                console.log(results);
                                if (results && results.length > 0 && results[0].score > 0.5) {
                                    context.reply("QnA: " + results[0].answer);
                                } else {

                                    context.reply(MessageStyler.attachment(
                                        CardStyler.heroCard(
                                            'We could not find an answer for you',
                                            [],
                                            ['Connect to Agent']
                                        )
                                    ));
                                }
                            });
                    }

                });
        }
    });


interface Order {
    id: string;
    name: string;
    orderDate: string;
    dueDate?: string;
    closedDate?: string;
}

var openOrders: { [index: string]: Order } = {
    5107319: { "id": "5107319", "name": "Administration Account Request", "orderDate": "09/14/2017", "dueDate": "09/18/2017" },
    4972166: { "id": "4972166", "name": "Server Hosting - dmzServer (virtual) - New", "orderDate": "08/17/2017", "dueDate": "08/21/2017" }
};

var closedOrders: { [index: string]: Order } = {
    5112795: { "id": "5112795", "name": "Email Request", "orderDate": "09/16/2017", "closedDate": "09/18/2017" },
    4905025: { "id": "4905025", "name": "Mobile Device Management, Mobile PIM", "orderDate": "08/07/2017", "closedDate": "08/07/2017" },
    4453340: { "id": "4453340", "name": "Cloud Workplace - New", "orderDate": "03/23/2017", "closedDate": "03/24/2017" }
};

function processOpenOrderIntent() {
    var orders = getOpenOrderS();
    let response = '';
    for (let i in orders) {
        response += `Order #${orders[i].id}: 
              
        "${orders[i].name}" 
        Submited on ${orders[i].orderDate}  
        Due on ${orders[i].dueDate} \n`;
    }
    return response;
}


function processClosedOrderIntent() {
    var orders = getClosedOrders();
    let response = '';
    for (let i in orders) {
        response += `Order #${orders[i].id}: 
              
        "${orders[i].name}" 
        Submited on ${orders[i].orderDate}  
        Completed on ${orders[i].dueDate} \n`;
    }
    return response;
}


function getOpenOrderS() {
    var ordersArray = Object.keys(openOrders);
    var ordersToReturn = [];

    for (let k in ordersArray) {
        ordersToReturn.push(openOrders[ordersArray[k]])
    }
    return ordersToReturn;
}
function getOpenOrder(id: string) {
    return openOrders[id];
}

function getClosedOrders() {
    var ordersArray = Object.keys(closedOrders);
    var ordersToReturn = [];

    for (let k in ordersArray) {
        ordersToReturn.push(closedOrders[ordersArray[k]])
    }
    return ordersToReturn;
}
function getClosedOrder(id: string) {
    return closedOrders[id];
}

function checkMyOrder(id: string) {
    id = id.toString();
    if (Object.keys(openOrders).indexOf(id) > -1) {
        return { "status": "open", "r": getOpenOrder(id) };
    } else if (Object.keys(closedOrders).indexOf(id) > -1) {
        return { "status": "closed", "r": getClosedOrder(id) };
    } else {
        return { "status": "error", "r": "I can't find your Order!" }
    }
}